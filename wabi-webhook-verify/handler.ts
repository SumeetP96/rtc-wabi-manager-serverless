import {
    APIGatewayProxyEvent,
    APIGatewayProxyEventQueryStringParameters,
    APIGatewayProxyResult,
} from 'aws-lambda';

interface WebhookVerifyQueryParams
    extends APIGatewayProxyEventQueryStringParameters {
    'hub.mode': string;
    'hub.verify_token': string;
    'hub.challenge': string;
}

export const handler = async (
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
    try {
        console.log('event', event);

        const queryParams =
            event.queryStringParameters as WebhookVerifyQueryParams;

        const mode = queryParams['hub.mode'];

        const verifyToken = queryParams['hub.verify_token'];

        const challenge = queryParams['hub.challenge'];

        const wabiWebhookVerifyToken = process.env.WABI_WEBHOOK_VERIFY_TOKEN;

        if (mode === 'subscribe' && verifyToken === wabiWebhookVerifyToken) {
            console.log('Webhook verified successfully!');

            return { statusCode: 200, body: challenge };
        }

        console.log('Webhook verification failed!');

        return { statusCode: 403, body: 'Failed to verify webhook.' };
    } catch (error) {
        console.error('[wabi-webhook-verify] error:', error);

        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal server error' }),
        };
    }
};
