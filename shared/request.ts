import { APIGatewayProxyEvent } from 'aws-lambda';

export function requestBody<TBody>(event: APIGatewayProxyEvent): TBody {
    return JSON.parse(event.body || '{}') as TBody;
}
