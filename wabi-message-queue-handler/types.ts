export type QueueTarget = 'group' | 'bulk';

export interface QueueMeta {
    queueProcessed: boolean;
    totalSentMessages: number;
    totalQueuedMessages: number;
    messageErrors: Record<string, unknown>[];
}

export interface QueueItem {
    id: number;
    customerId: number;
    templateId: number;
    messageId: number | null;
    date: number;
    priority: number;
    rescheduleCount: number;
    waTemplateId: string | null;
    waTemplateLanguageCode: string | null;
    mobileNumber: string | null;
}
