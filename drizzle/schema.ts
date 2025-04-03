import { sql } from 'drizzle-orm';
import {
    index,
    integer,
    sqliteTable,
    text,
    uniqueIndex,
} from 'drizzle-orm/sqlite-core';

export const campaigns = sqliteTable(
    'campaigns',
    {
        id: integer().primaryKey({ autoIncrement: true }).notNull(),
        name: text().notNull(),
        status: text().default('active').notNull(),
        templateId: integer('template_id')
            .notNull()
            .references(() => templates.id),
        groupId: integer('group_id')
            .notNull()
            .references(() => groups.id),
        startDate: integer('start_date').notNull(),
        endDate: integer('end_date').notNull(),
        dailyLimit: integer('daily_limit').default(0).notNull(),
        createdAt: integer('created_at')
            .default(sql`(CURRENT_TIMESTAMP)`)
            .notNull(),
        updatedAt: integer('updated_at')
            .default(sql`(CURRENT_TIMESTAMP)`)
            .notNull(),
        deletedAt: integer('deleted_at').default(sql`(NULL)`),
    },
    (table) => [uniqueIndex('campaigns_name_unique').on(table.name)]
);

export const customerGroups = sqliteTable(
    'customer_groups',
    {
        id: integer().primaryKey({ autoIncrement: true }).notNull(),
        customerId: integer('customer_id')
            .notNull()
            .references(() => customers.id),
        groupId: integer('group_id')
            .notNull()
            .references(() => groups.id),
        createdAt: integer('created_at')
            .default(sql`(CURRENT_TIMESTAMP)`)
            .notNull(),
        updatedAt: integer('updated_at')
            .default(sql`(CURRENT_TIMESTAMP)`)
            .notNull(),
        deletedAt: integer('deleted_at').default(sql`(NULL)`),
    },
    (table) => [
        uniqueIndex('customer_group_unique_idx').on(
            table.customerId,
            table.groupId
        ),
    ]
);

export const customers = sqliteTable(
    'customers',
    {
        id: integer().primaryKey({ autoIncrement: true }).notNull(),
        name: text(),
        mobileNumber: text('mobile_number').notNull(),
        isSubscribed: integer('is_subscribed').default(1).notNull(),
        isWhatsappAccount: integer('is_whatsapp_account').default(1).notNull(),
        createdAt: integer('created_at')
            .default(sql`(CURRENT_TIMESTAMP)`)
            .notNull(),
        updatedAt: integer('updated_at')
            .default(sql`(CURRENT_TIMESTAMP)`)
            .notNull(),
        deletedAt: integer('deleted_at').default(sql`(NULL)`),
    },
    (table) => [
        index('subscribed_whatsapp_idx').on(
            table.isSubscribed,
            table.isWhatsappAccount
        ),
        uniqueIndex('customers_mobile_number_unique').on(table.mobileNumber),
    ]
);

export const groups = sqliteTable(
    'groups',
    {
        id: integer().primaryKey({ autoIncrement: true }).notNull(),
        name: text().notNull(),
        createdAt: integer('created_at')
            .default(sql`(CURRENT_TIMESTAMP)`)
            .notNull(),
        updatedAt: integer('updated_at')
            .default(sql`(CURRENT_TIMESTAMP)`)
            .notNull(),
        deletedAt: integer('deleted_at').default(sql`(NULL)`),
    },
    (table) => [uniqueIndex('groups_name_unique').on(table.name)]
);

export const messageQueue = sqliteTable('message_queue', {
    id: integer().primaryKey({ autoIncrement: true }).notNull(),
    customerId: integer('customer_id')
        .notNull()
        .references(() => customers.id),
    templateId: integer('template_id')
        .notNull()
        .references(() => templates.id),
    campaignId: integer('campaign_id').references(() => campaigns.id),
    groupId: integer('group_id').references(() => groups.id),
    priority: integer().default(1).notNull(),
    createdAt: integer('created_at')
        .default(sql`(CURRENT_TIMESTAMP)`)
        .notNull(),
    updatedAt: integer('updated_at')
        .default(sql`(CURRENT_TIMESTAMP)`)
        .notNull(),
    deletedAt: integer('deleted_at').default(sql`(NULL)`),
});

export const messages = sqliteTable(
    'messages',
    {
        id: integer().primaryKey({ autoIncrement: true }).notNull(),
        customerId: integer('customer_id')
            .notNull()
            .references(() => customers.id),
        templateId: integer('template_id')
            .notNull()
            .references(() => templates.id),
        waMessageId: text('wa_message_id').notNull(),
        status: text().notNull(),
        createdAt: integer('created_at')
            .default(sql`(CURRENT_TIMESTAMP)`)
            .notNull(),
        updatedAt: integer('updated_at')
            .default(sql`(CURRENT_TIMESTAMP)`)
            .notNull(),
        deletedAt: integer('deleted_at').default(sql`(NULL)`),
    },
    (table) => [
        index('status_idx').on(table.status),
        index('template_idx').on(table.templateId),
    ]
);

export const templates = sqliteTable('templates', {
    id: integer().primaryKey({ autoIncrement: true }).notNull(),
    name: text().notNull(),
    type: text().notNull(),
    waTemplateId: text('wa_template_id').default('sql`(NULL)`'),
    waTemplateLanguageCode: text('wa_template_language_code').default(
        'sql`(NULL)`'
    ),
    text: text().default('sql`(NULL)`'),
    isActive: integer('is_active').default(1).notNull(),
    createdAt: integer('created_at')
        .default(sql`(CURRENT_TIMESTAMP)`)
        .notNull(),
    updatedAt: integer('updated_at')
        .default(sql`(CURRENT_TIMESTAMP)`)
        .notNull(),
    deletedAt: integer('deleted_at').default(sql`(NULL)`),
});
