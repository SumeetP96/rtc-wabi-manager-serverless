import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { eq } from 'drizzle-orm';
import { customers, messages, templates } from '../drizzle/schema';
import { dj } from '../shared/dayjs';
import { db } from '../shared/db';
import { requestBody } from '../shared/request';
import { generateErrorResponseBody } from '../shared/response';
import { sendMessage } from '../shared/wabi-api';
import { Message, Status, WaWebhookPayload } from './types';

type TextMessageType = 'text_start' | 'text_stop' | 'text_echo' | 'text_other';

type ButtonMessageType = 'button_stop' | 'button_other';

type MessageType = TextMessageType | ButtonMessageType;

type TemplateType = 'start' | 'stop' | 'other' | 'echo';

type MessageStatus = 'accepted' | 'sent' | 'delivered' | 'read' | 'failed';

const handlerName = 'wabi-event-handler';

const defaultResponse = {
    statusCode: 200,
    body: 'Event processed successfully.',
};

const templateTypeMap: Record<MessageType, TemplateType> = {
    text_start: 'start',
    text_stop: 'stop',
    text_other: 'other',
    text_echo: 'echo',
    button_other: 'other',
    button_stop: 'stop',
};

const messageStatusLevelMap: Record<MessageStatus, number> = {
    accepted: 1,
    sent: 2,
    delivered: 3,
    read: 4,
    failed: 5,
};

const updateCustomerPreferece = async (
    message: Message,
    templateType: TemplateType
) => {
    const [dbMessage] = await db
        .select({
            customerId: customers.id,
        })
        .from(messages)
        .where(eq(messages.waMessageId, message.id))
        .leftJoin(customers, eq(messages.customerId, customers.id));

    if (!dbMessage?.customerId) {
        console.error(
            `----- [${updateCustomerPreferece.name}]: customerId not found`
        );
    }

    if (templateType === 'stop') {
        await db
            .update(customers)
            .set({ isSubscribed: 0, updatedAt: dj().utc().unix() })
            .where(eq(customers.id, dbMessage.customerId as number));
    }

    if (templateType === 'start') {
        await db
            .update(customers)
            .set({ isSubscribed: 1, updatedAt: dj().utc().unix() })
            .where(eq(customers.id, dbMessage.customerId as number));
    }
};

const buildMessageForTemplate = async (message: Message) => {
    const messageType = evaluateMessageType(message);

    const templateType = templateTypeMap[messageType];

    if (!messageType || !templateType) {
        return null;
    }

    await updateCustomerPreferece(message, templateType);

    const [template] = await db
        .select()
        .from(templates)
        .where(eq(templates.type, templateType));

    if (!template.text) {
        return null;
    }

    return {
        template,
        payload: {
            to: message.from,
            text: template.text,
            messageId: message.id,
        },
    };
};

const evaluateMessageType = (message: Message): MessageType => {
    if (message.type === 'button') {
        switch (true) {
            case message.button.payload.toLowerCase() === 'stop promotions':
                return 'button_stop';
            default:
                return 'button_other';
        }
    }

    if (message.type === 'text') {
        switch (true) {
            case message.text.body.toLowerCase() === 'start':
                return 'text_start';
            case message.text.body.toLowerCase() === 'stop':
                return 'text_stop';
            case message.text.body.toLowerCase() === 'echo':
                return 'text_echo';
            default:
                return 'text_other';
        }
    }

    return 'text_other';
};

const extractMessage = (payload: WaWebhookPayload): Message | null => {
    const [change] = payload?.entry?.[0]?.changes;

    const messageObj = change?.value?.messages?.[0];

    return messageObj;
};

const extractStatus = (payload: WaWebhookPayload): Status | null => {
    const [change] = payload?.entry?.[0]?.changes;

    const statusObj = change?.value?.statuses?.[0];

    return statusObj;
};

const processWebhookEvent = (
    event: APIGatewayProxyEvent
): {
    type: 'message' | 'status' | null;
    payload: Message | Status | null;
} => {
    const body = requestBody<WaWebhookPayload>(event);

    const message = extractMessage(body);

    const status = extractStatus(body);

    if (status) {
        return { type: 'status', payload: status };
    }

    if (message) {
        return { type: 'message', payload: message };
    }

    return { type: null, payload: null };
};

const errorResponse = (
    message: string,
    event: APIGatewayProxyEvent,
    data: Record<string, any> = {}
): APIGatewayProxyResult => {
    generateErrorResponseBody({
        message,
        messagePrefix: handlerName,
        data: {
            'event.body': requestBody(event),
            ...data,
        },
    });

    return defaultResponse;
};

export const handler = async (
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
    try {
        // console.log('----- event', event);

        // Process and validate event type
        const { type, payload } = processWebhookEvent(event);

        console.log('\n------ payload', payload);
        console.log('\n------ type', type);

        if (type === null || payload === null) {
            return errorResponse('Unknown event type.', event);
        }

        /**
         * Handle 'message' event
         */
        if (type === 'message') {
            const message = payload as Message;

            const messageBody = await buildMessageForTemplate(message);

            if (messageBody === null) {
                return errorResponse('Failed to build messageBody', event);
            }

            const response = await sendMessage(messageBody.payload);

            if (response.status !== 200) {
                return errorResponse(
                    'Error sending messageBody to WhatsApp.',
                    event
                );
            } else {
                await db.insert(messages).values({
                    customerId: 1,
                    templateId: messageBody.template.id,
                    waMessageId: messageBody.payload.messageId,
                    status: 'reply',
                    metadata: JSON.stringify(response.data),
                });
            }
        }

        /**
         * Handle 'status' update event
         */
        if (type === 'status') {
            const { id: messageId, status } = payload as Status;

            // Validate status
            if (!Object.keys(messageStatusLevelMap).includes(status)) {
                return errorResponse('Unknown status', event);
            }

            // Existing message
            const [dbMessage] = await db
                .select()
                .from(messages)
                .where(eq(messages.waMessageId, messageId));

            if (!dbMessage) {
                return errorResponse('Message not found.', event);
            }

            // Validate status level
            if (
                messageStatusLevelMap[status as MessageStatus] <=
                messageStatusLevelMap[dbMessage.status as MessageStatus]
            ) {
                return errorResponse(
                    'Status update skipped. Current status is higher then incoming.',
                    event
                );
            }

            // Update message status in DB
            await db
                .update(messages)
                .set({ status, updatedAt: dj().utc().unix() })
                .where(eq(messages.id, dbMessage.id));
        }

        return defaultResponse;
    } catch (error) {
        return errorResponse(
            'Status update skipped. Current status is higher then incoming.',
            event,
            { error }
        );
    }
};
