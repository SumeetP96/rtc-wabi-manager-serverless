import axios from 'axios';

const wabiPhoneNumberId = process.env.WABI_PHONE_NUMBER_ID;

const wabiApiAccessToken = process.env.WABI_API_ACCESS_TOKEN;

const wabiApi = axios.create({
    baseURL: `https://graph.facebook.com/v21.0/${wabiPhoneNumberId}`,
    headers: {
        Authorization: `Bearer ${wabiApiAccessToken}`,
    },
});

export const sendMessage = async ({
    to,
    text,
    messageId,
}: {
    to: string;
    text: string;
    messageId?: string;
}) => {
    try {
        return await wabiApi.post('/messages', {
            messaging_product: 'whatsapp',
            to,
            text: { body: text },
            context: { message_id: messageId },
        });
    } catch (error) {
        console.error(
            `[wabi-api] [${sendMessage.name}] error: ${
                (error as Error).message
            }`
        );
        throw error;
    }
};

export const sendReplyMessage = async ({
    to,
    text,
    messageId,
}: {
    to: string;
    text: string;
    messageId: string;
}) => {
    try {
        return await sendMessage({ to, text, messageId });
    } catch (error) {
        console.error(
            `[wabi-api] [${sendReplyMessage.name}] error: ${
                (error as Error).message
            }`
        );
        throw error;
    }
};

