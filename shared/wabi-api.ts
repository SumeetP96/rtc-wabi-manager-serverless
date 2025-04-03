import axios from 'axios';

export interface WaMessageResponse {
    messaging_product: string;
    contacts: {
        input: string;
        wa_id: string;
    }[];
    messages: {
        id: string;
        message_status: string;
    }[];
}

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

export const sendTemplateMessage = async ({
    templateName,
    templateLanguageCode,
    mobileNumber,
}: {
    templateName: string;
    templateLanguageCode: string;
    mobileNumber: string;
}) => {
    try {
        return await wabiApi.post('/messages', {
            messaging_product: 'whatsapp',
            to: mobileNumber,
            type: 'template',
            template: {
                name: templateName,
                language: {
                    code: templateLanguageCode,
                },
            },
        });
    } catch (error) {
        console.error(
            `[wabi-api] [${sendTemplateMessage.name}] error: ${
                (error as Error).message
            }`
        );
        throw error;
    }
};
