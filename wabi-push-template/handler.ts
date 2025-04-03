import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { and, eq, inArray } from 'drizzle-orm';
import { db, schema } from '../shared/db';
import { manualDelay } from '../shared/manual-delay';
import { buildResponseBody, ReturnResponseBody } from '../shared/response';
import { sendTemplateMessage, WaMessageResponse } from '../shared/wabi-api';

const apiAccessToken = process.env.SERVICE_ACCESS_TOKEN || '';

const handlerName = 'wabi-push-template';

interface PushTemplateBody {
    templateId: string;
    customerIds: string[];
}

export const handler = async (
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
    const responseBody: ReturnResponseBody = {
        success: true,
        message:
            'Request pushed to WhatsApp. Please check the delivery reports for message status.',
    };

    try {
        console.log('---- event', event);

        // Authorization;
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

        const body = JSON.parse(event.body || '{}') as PushTemplateBody;

        // Validate template
        const [template] = await db
            .select()
            .from(schema.templates)
            .where(eq(schema.templates.id, parseInt(body.templateId)));

        if (!template) {
            responseBody.success = false;
            responseBody.message = 'No template found for given templateId.';
            responseBody.data = { templateId: body.templateId };

            console.error(`[${handlerName}]`, responseBody);

            return {
                statusCode: 400,
                body: buildResponseBody(responseBody),
            };
        }

        // Validate Customers
        const customers = await db
            .select()
            .from(schema.customers)
            .where(
                and(
                    inArray(
                        schema.customers.id,
                        body.customerIds.map((id) => parseInt(id))
                    ),
                    eq(schema.customers.isSubscribed, 1),
                    eq(schema.customers.isWhatsappAccount, 1)
                )
            );

        if (customers.length === 0) {
            responseBody.success = false;
            responseBody.message = 'No valid recipients';
            responseBody.data = { customerIds: body.customerIds };

            console.error(`[${handlerName}]`, responseBody);

            return {
                statusCode: 400,
                body: buildResponseBody(responseBody),
            };
        } else if (customers.length !== body.customerIds.length) {
            const validRecipients = customers.map((customer) => customer.id);

            responseBody.success = false;
            responseBody.message = 'Some recipients are invalid';
            responseBody.data = {
                customerIds: body.customerIds,
                invaildRecipients: body.customerIds.filter(
                    (id) => !validRecipients.includes(parseInt(id))
                ),
            };

            console.error(`[${handlerName}]`, responseBody);

            return {
                statusCode: 400,
                body: buildResponseBody(responseBody),
            };
        }

        // Send messages
        const messageErrors = [];

        for (const customer of customers) {
            try {
                const response = await sendTemplateMessage({
                    templateName: template.waTemplateId as string,
                    templateLanguageCode:
                        template.waTemplateLanguageCode as string,
                    mobileNumber: customer.mobileNumber,
                });

                if (response.status !== 200) {
                    throw new Error(
                        'Failed to send template request to WhatsApp.'
                    );
                }

                const data = response.data as WaMessageResponse;

                const result = await db
                    .insert(schema.messages)
                    .values({
                        customerId: customer.id,
                        templateId: template.id,
                        waMessageId: data.messages[0].id,
                        status: data.messages[0].message_status,
                    })
                    .returning();

                console.log('result', result);

                await manualDelay(1000);
            } catch (error) {
                messageErrors.push({
                    templateId: template.id,
                    customerId: customer.id,
                    message: (error as Error).message,
                });
            }
        }

        if (messageErrors.length) {
            responseBody.success = false;
            responseBody.message = `Failed to send messages to ${messageErrors.length} recipients.`;
            responseBody.data = messageErrors;

            console.error(`[${handlerName}]`, responseBody);

            return {
                statusCode: 400,
                body: buildResponseBody(responseBody),
            };
        }

        return {
            statusCode: 200,
            body: buildResponseBody(responseBody),
        };
    } catch (error) {
        responseBody.success = false;
        responseBody.message = (error as Error).message;
        responseBody.data = {
            'event.body': event.body,
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
