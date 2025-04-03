import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as drizzleSchema from '../drizzle/schema';

export const schema = drizzleSchema;

const turso = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
});

export const db = drizzle(turso, { schema });
