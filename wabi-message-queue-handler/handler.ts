import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import dayjs from 'dayjs';
import { asc, eq, lt, sql } from 'drizzle-orm';
import {
    customers,
    messageQueue,
    messages,
    templates,
} from '../drizzle/schema';
import { db } from '../shared/db';
import { manualDelay } from '../shared/manual-delay';
import { buildResponseBody, ReturnResponseBody } from '../shared/response';
import { sendTemplateMessage, WaMessageResponse } from '../shared/wabi-api';

const apiAccessToken = process.env.SERVICE_ACCESS_TOKEN || '';

const dailyConversationLimit = Number(
    process.env.WABI_DAILY_CONVERSATION_LIMIT || 0
);

const rescheduleThreshold = 3;

const handlerName = 'wabi-message-queue-handler';

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

        const [{ count: totalQueuedMessages }] = await db
            .select({ count: sql<number>`count(*)` })
            .from(messageQueue)
            .where(lt(messageQueue.date, dayjs().add(1, 'days').unix()));

        if (totalQueuedMessages === 0) {
            responseBody.message = 'No messages in queue';
            return {
                statusCode: 200,
                body: buildResponseBody(responseBody),
            };
        }

        const queueMeta: {
            queueProcessed: boolean;
            totalSentMessages: number;
            totalQueuedMessages: number;
            messageErrors: Record<string, unknown>[];
        } = {
            queueProcessed: false,
            totalSentMessages: 0,
            totalQueuedMessages,
            messageErrors: [],
        };

        while (
            queueMeta.queueProcessed === false &&
            queueMeta.totalSentMessages <= dailyConversationLimit
        ) {
            const queue = await db
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
                .where(lt(messageQueue.date, dayjs().add(1, 'days').unix()))
                .orderBy(asc(messageQueue.date), asc(messageQueue.priority))
                .limit(1);

            if (queue.length === 0) {
                queueMeta.queueProcessed = true;
            }

            const [queueItem] = queue;

            try {
                const response = await sendTemplateMessage({
                    templateName: queueItem.waTemplateId as string,
                    templateLanguageCode:
                        queueItem.waTemplateLanguageCode as string,
                    mobileNumber: queueItem.mobileNumber as string,
                });

                if (response.status !== 200) {
                    await db.transaction(async (tx) => {
                        if (queueItem.rescheduleCount === rescheduleThreshold) {
                            await tx
                                .update(messages)
                                .set({
                                    status: 'failed',
                                    metadata: JSON.stringify({
                                        failReason: `Failed to send message after ${rescheduleThreshold} retries.`,
                                        failReasonCode:
                                            'reschedule_threshold_reached',
                                        failReasonDetails: { queueItem },
                                    }),
                                })
                                .where(
                                    eq(
                                        messages.id,
                                        queueItem.messageId as number
                                    )
                                );

                            await tx
                                .delete(messageQueue)
                                .where(eq(messageQueue.id, queueItem.id));
                        } else {
                            await tx
                                .update(messageQueue)
                                .set({
                                    date: dayjs().add(1, 'days').unix(),
                                    rescheduleCount:
                                        queueItem.rescheduleCount + 1,
                                })
                                .where(eq(messageQueue.id, queueItem.id));

                            await tx
                                .update(messages)
                                .set({ status: 'rescheduled' })
                                .where(eq(messages.id, queueItem.id));
                        }
                    });

                    throw new Error(
                        'Failed to send template request to WhatsApp.'
                    );
                }

                const waResponseData = response.data as WaMessageResponse;

                await db.transaction(async (tx) => {
                    await tx
                        .update(messages)
                        .set({
                            waMessageId: waResponseData.messages[0].id,
                            status: waResponseData.messages[0].message_status,
                            metadata: JSON.stringify(waResponseData),
                        })
                        .where(eq(messages.id, queueItem.messageId as number));

                    await tx
                        .delete(messageQueue)
                        .where(eq(messageQueue.id, queueItem.id));
                });

                queueMeta.totalSentMessages += 1;

                if (queueMeta.totalQueuedMessages > 1) {
                    await manualDelay(100);
                }
            } catch (error) {
                queueMeta.messageErrors.push({
                    queueItem,
                    message: (error as Error).message,
                });
            }
        }

        responseBody.data = queueMeta;

        return {
            statusCode: 200,
            body: buildResponseBody(responseBody),
        };
    } catch (error) {
        responseBody.success = false;
        responseBody.message = (error as Error).message;
        responseBody.data = {
            'event.headers': event.headers,
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
