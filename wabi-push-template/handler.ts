import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { messagingTemplates } from '../shared/templates';
import { sendTemplateMessage } from '../shared/wabi-api';

const apiAccessToken = process.env.SERVICE_ACCESS_TOKEN || '';

interface PushTemplateBody {
    templateId: string;
    recipients: string[];
}

export const handler = async (
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
    // console.log('---- event', event);

    // Check authorization header
    const headerAccessKey = event.headers['authorization'];

    if (!headerAccessKey || headerAccessKey !== `Bearer ${apiAccessToken}`) {
        return {
            statusCode: 401,
            body: JSON.stringify({ message: 'Unauthorized' }),
        };
    }

    const body = JSON.parse(event.body || '{}') as PushTemplateBody;

    // Validate template ID
    const template = Object.values(messagingTemplates).find(
        (template) => template.name === body.templateId
    );

    if (!template) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: 'Invalid template ID' }),
        };
    }

    // Validate recipients
    const recipients = body.recipients.filter((recipient) => {
        // Should be a valid Indian phone number with country code '91'
        return recipient.length === 12 && recipient.substring(0, 2) === '91';
    });

    if (recipients.length === 0) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: 'No valid recipients' }),
        };
    }

    // Send the template to the recipients
    const response = await sendTemplateMessage({
        template,
        to: recipients[0],
    });

    return {
        statusCode: 200,
        body: 'Sent successfully. Please check delivery reports for status.',
    };
};
