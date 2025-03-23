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

export interface ChangeValue {
    messaging_product: string;
    metadata: Metadata;
    contacts: Contact[];
    messages: Message[];
}

export interface Change {
    value: ChangeValue;
    field: string;
}

export interface Entry {
    id: string;
    changes: Change[];
}

export interface WebhookPayload {
    object: string;
    entry: Entry[];
}
