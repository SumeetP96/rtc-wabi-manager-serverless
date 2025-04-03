export interface ReturnResponseBody {
    success: boolean;
    data?: any;
    message?: string;
    errors?: string;
}

export function buildResponseBody(body: ReturnResponseBody) {
    return JSON.stringify(body);
}

export function generateErrorResponseBody({
    log = true,
    message,
    messagePrefix = '',
    data,
}: {
    log?: boolean;
    message?: string;
    messagePrefix?: string;
    data?: any;
}): ReturnResponseBody {
    if (log) {
        console.log(
            messagePrefix
                ? `[${messagePrefix}] error: ${message}`
                : `[Error]: ${message}`,
            data
        );
    }

    return {
        success: false,
        message,
        data,
    };
}
