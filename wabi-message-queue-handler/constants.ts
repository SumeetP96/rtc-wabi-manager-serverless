export const apiAccessToken = process.env.SERVICE_ACCESS_TOKEN || '';

export const dailyConversationLimit = Number(
    process.env.WABI_DAILY_CONVERSATION_LIMIT || 0
);

export const rescheduleThreshold = 3;

export const handlerName = 'wabi-message-queue-handler';
