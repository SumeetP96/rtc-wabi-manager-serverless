export interface MessageTemplate {
    name: string;
    language: {
        code: string;
    };
}

export const messagingTemplates: Record<string, MessageTemplate> = {
    helloWorld: {
        name: 'hello_world',
        language: { code: 'en_US' },
    },

    newCropWheat2025: {
        name: '2025_new_crop_wheat_english',
        language: { code: 'en' },
    },
};
