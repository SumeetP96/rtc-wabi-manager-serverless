import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import dayjs from 'dayjs';
import { and, asc, eq, isNotNull, isNull, lt, sql } from 'drizzle-orm';
import {
    customers,
    messageQueue,
    messages,
    templates,
} from '../drizzle/schema';
import { db, DbTransaction, Message, MessageQueue } from '../shared/db';
import { manualDelay } from '../shared/manual-delay';
import { buildResponseBody, ReturnResponseBody } from '../shared/response';
import { sendTemplateMessage, WaMessageResponse } from '../shared/wabi-api';
import { QueueItem, QueueMeta, QueueTarget } from './types';

const apiAccessToken = process.env.SERVICE_ACCESS_TOKEN || '';

const dailyConversationLimit = Number(
    process.env.WABI_DAILY_CONVERSATION_LIMIT || 0
);

const rescheduleThreshold = 3;

const handlerName = 'wabi-message-queue-handler';

const updateMessageById = async (
    tx: DbTransaction,
    id: number,
    data: Partial<Message>
) => {
    await tx.update(messages).set(data).where(eq(messages.id, id));
};

const updateMessageQueueById = async (
    tx: DbTransaction,
    id: number,
    data: Partial<MessageQueue>
) => {
    await tx.update(messageQueue).set(data).where(eq(messageQueue.id, id));
};

const removeMessageQueueById = async (tx: DbTransaction, id: number) => {
    await tx.delete(messageQueue).where(eq(messageQueue.id, id));
};

const updateMessageAndRemoveQueueItem = async (
    queueItem: QueueItem,
    waResponseData: WaMessageResponse
) => {
    await db.transaction(async (tx) => {
        await updateMessageById(tx, queueItem.messageId as number, {
            waMessageId: waResponseData.messages[0].id,
            status: waResponseData.messages[0].message_status,
            metadata: JSON.stringify(waResponseData),
        });

        await removeMessageQueueById(tx, queueItem.id);
    });
};

const failMessageAndClearQueueItem = async (
    tx: DbTransaction,
    queueItem: QueueItem
) => {
    await updateMessageById(tx, queueItem.messageId as number, {
        status: 'failed',
        metadata: JSON.stringify({
            failReason: `Failed to send message after ${rescheduleThreshold} retries.`,
            failReasonCode: 'reschedule_threshold_reached',
            failReasonDetails: { queueItem },
        }),
    });

    await removeMessageQueueById(tx, queueItem.id);
};

const updateMessageAndRescheduleQueueItem = async (
    tx: DbTransaction,
    queueItem: QueueItem
) => {
    await updateMessageQueueById(tx, queueItem.id, {
        date: dayjs().add(1, 'days').unix(),
        rescheduleCount: queueItem.rescheduleCount + 1,
    });

    await updateMessageById(tx, queueItem.messageId as number, {
        status: 'rescheduled',
    });
};

const processWaMessageError = async (queueItem: QueueItem) => {
    await db.transaction(async (tx) => {
        if (queueItem.rescheduleCount === rescheduleThreshold) {
            await failMessageAndClearQueueItem(tx, queueItem);
        } else {
            await updateMessageAndRescheduleQueueItem(tx, queueItem);
        }
    });
};

const pushMessageToWa = async (queueItem: QueueItem) => {
    const response = await sendTemplateMessage({
        templateName: queueItem.waTemplateId as string,
        templateLanguageCode: queueItem.waTemplateLanguageCode as string,
        mobileNumber: queueItem.mobileNumber as string,
    });

    // On error
    if (response.status !== 200) {
        await processWaMessageError(queueItem);

        throw new Error('Failed to send template request to WhatsApp.');
    }

    return response.data as WaMessageResponse;
};

const sendQueueMessage = async (queueItem: QueueItem) => {
    try {
        const waResponseData = await pushMessageToWa(queueItem);

        await updateMessageAndRemoveQueueItem(queueItem, waResponseData);
    } catch (error) {
        return {
            success: false,
            error: (error as Error).message,
        };
    }

    return { success: true, error: null };
};

const generateQueryConditions = (target?: QueueTarget) => {
    const conditions = [lt(messageQueue.date, dayjs().add(1, 'days').unix())];

    if (target === 'group') {
        isNotNull(messageQueue.groupId);
    } else if (target === 'bulk') {
        and(
            isNull(messageQueue.groupId),
            isNull(messageQueue.campaignId),
            eq(messageQueue.priority, 1)
        );
    }

    return conditions;
};

const getQueueItem = async (target?: QueueTarget) => {
    const conditions = generateQueryConditions(target);

    const [queue] = await db
        .select({
            id: messageQueue.id,
            customerId: messageQueue.customerId,
            templateId: messageQueue.templateId,
            messageId: messageQueue.messageId,
            date: messageQueue.date,
            priority: messageQueue.priority,
            rescheduleCount: messageQueue.rescheduleCount,
            waTemplateId: templates.waTemplateId,
            waTemplateLanguageCode: templates.waTemplateLanguageCode,
            mobileNumber: customers.mobileNumber,
        })
        .from(messageQueue)
        .leftJoin(templates, eq(messageQueue.templateId, templates.id))
        .leftJoin(customers, eq(messageQueue.customerId, customers.id))
        .where(and(...conditions))
        .orderBy(asc(messageQueue.date), asc(messageQueue.priority))
        .limit(1);

    return queue;
};

const processQueue = async (queueSize: number, target?: QueueTarget) => {
    const queueMeta: QueueMeta = {
        queueProcessed: false,
        totalSentMessages: 0,
        totalQueuedMessages: queueSize,
        messageErrors: [],
    };

    while (
        queueMeta.queueProcessed === false &&
        queueMeta.totalSentMessages <= dailyConversationLimit
    ) {
        const queueItem = await getQueueItem(target);

        if (!queueItem) {
            queueMeta.queueProcessed = true;
            break;
        }

        const { success, error } = await sendQueueMessage(queueItem);

        if (success === false) {
            queueMeta.messageErrors.push({
                queueItem,
                message: error,
            });
            continue;
        }

        queueMeta.totalSentMessages += 1;

        if (queueMeta.totalQueuedMessages > 1) {
            await manualDelay(200);
        }
    }

    return queueMeta;
};

const getQueueSize = async (target?: QueueTarget) => {
    const conditions = generateQueryConditions(target);

    const [{ count: totalQueuedMessages }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(messageQueue)
        .where(and(...conditions));

    return totalQueuedMessages;
};

export const handler = async (
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
    const responseBody: ReturnResponseBody = {
        success: true,
        message:
            'Message queue processed. Please check the delivery reports for message status.',
    };

    try {
        // Authorization
        const headerAccessKey = event.headers['authorization'];

        if (
            !headerAccessKey ||
            headerAccessKey !== `Bearer ${apiAccessToken}`
        ) {
            responseBody.success = false;
            responseBody.message = 'Unauthorized';

            console.error(`[${handlerName}]`, responseBody);

            return {
                statusCode: 401,
                body: buildResponseBody(responseBody),
            };
        }

        const body = JSON.parse(event.body || '{}') as { target?: QueueTarget };

        // Verify queue size
        const totalQueuedMessages = await getQueueSize(body.target);

        if (totalQueuedMessages === 0) {
            responseBody.message = 'No messages in queue';

            return {
                statusCode: 200,
                body: buildResponseBody(responseBody),
            };
        }

        responseBody.data = await processQueue(
            totalQueuedMessages,
            body.target
        );

        return {
            statusCode: 200,
            body: buildResponseBody(responseBody),
        };
    } catch (error) {
        responseBody.success = false;

        responseBody.message = (error as Error).message;

        responseBody.data = {
            'event.headers': event.headers,
            'event.body': event.body,
        };

        console.error(
            `[${handlerName}] error: ${(error as Error).message}`,
            error
        );

        return {
            statusCode: 400,
            body: buildResponseBody(responseBody),
        };
    }
};
