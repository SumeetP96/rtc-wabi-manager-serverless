import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { sendMessage, sendReplyMessage } from '../shared/wabi-api';
import { WebhookPayload } from './types';

export const handler = async (
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
    try {
        console.log('---- event', event);

        const body = JSON.parse(event.body || '{}') as WebhookPayload;

        const messageObj = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

        if (!messageObj) {
            throw new Error('Invalid message object');
        }

        if (messageObj.type === 'text') {
            /**
             * send a reply message as per the docs
             * @see https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages
             */
            console.log('[text message] received:', messageObj.type);

            if (messageObj.text.body.toLowerCase() === 'echo') {
                // Echo message
                const response = await sendReplyMessage({
                    to: messageObj.from,
                    text: 'Echo: ' + messageObj.text.body,
                    messageId: messageObj.id,
                });

                console.log('[echo] response.data:', response.data);
            } else if (messageObj.text.body.toLowerCase() === 'start') {
                // Start promotions again
                const response = await sendReplyMessage({
                    to: messageObj.from,
                    text: 'You have been subscribed to promotions. Send "stop" to unsubscribe.',
                    messageId: messageObj.id,
                });

                console.log('[start promotions] response.data:', response.data);
            } else {
                // Any other text
                const response = await sendReplyMessage({
                    to: messageObj.from,
                    text: 'Thank you for contacting us. This is an automated business chat. If you have any questions, please reach out to us via WhatsApp or phone call at +91-9898278584',
                    messageId: messageObj.id,
                });

                console.log('[any text] response.data:', response.data);
            }
        }

        // Button Actions
        if (messageObj.type === 'button') {
            console.log('[button message] received:', messageObj);

            // Stop promotions
            if (messageObj.button.payload.toLowerCase() === 'stop promotions') {
                const response = await sendMessage({
                    to: messageObj.from,
                    text: 'You have been unsubscribed from promotions. Send "start" to subscribe again.',
                    messageId: messageObj.id,
                });

                console.log('[stop promotions] response.data:', response.data);
            }
        }

        return { statusCode: 200, body: 'event handled' };
    } catch (error) {
        console.error('[wabi-webhook-event-handler] error:', error);

        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal server error' }),
        };
    }
};
