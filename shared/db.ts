import { createClient, ResultSet } from '@libsql/client';
import { ExtractTablesWithRelations, InferSelectModel } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import { SQLiteTransaction } from 'drizzle-orm/sqlite-core';
import * as drizzleSchema from '../drizzle/schema';

export const schema = drizzleSchema;

const turso = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
});

export const db = drizzle(turso, { schema });

export type DbTransaction = SQLiteTransaction<
    'async',
    ResultSet,
    typeof schema,
    ExtractTablesWithRelations<typeof schema>
>;

export type Message = InferSelectModel<typeof schema.messages>;

export type MessageQueue = InferSelectModel<typeof schema.messageQueue>;
