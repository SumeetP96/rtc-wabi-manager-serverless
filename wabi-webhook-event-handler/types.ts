export interface Contact {
    profile: {
        name: string;
    };
    wa_id: string;
}

export interface Message {
    from: string;
    id: string;
    timestamp: string;
    text: {
        body: string;
    };
    type: string;
    button: {
        payload: string;
        title: string;
    };
}

export interface Metadata {
    display_phone_number: string;
    phone_number_id: string;
}

export interface Status {
    id: string;
    status: 'sent' | 'delivered' | 'read' | 'failed' | 'deleted'; // Add other possible statuses
    timestamp: string; // Unix timestamp as string
    recipient_id: string;
    conversation: Conversation;
    pricing: Pricing;
}

export interface Conversation {
    id: string;
    expiration_timestamp?: string; // Optional as it might not always be present
    origin: {
        type: 'utility' | 'marketing' | 'authentication' | 'service'; // Add other possible types
    };
}

export interface Pricing {
    billable: boolean;
    pricing_model: 'CBP' | 'NBP' | string; // CBP = Conversation-Based Pricing
    category: 'utility' | 'marketing' | 'authentication' | 'service' | string;
}

export interface ChangeValue {
    messaging_product: string;
    metadata: Metadata;
    contacts: Contact[];
    messages: Message[];
    statuses: Status[];
}

export interface Change {
    value: ChangeValue;
    field: string;
}

export interface Entry {
    id: string;
    changes: Change[];
}

export interface WaWebhookPayload {
    object: string;
    entry: Entry[];
}
