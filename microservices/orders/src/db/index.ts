import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const DB_HOST = process.env.DB_HOST ?? "localhost";
const DB_PORT = (process.env.DB_PORT as number | undefined) ?? 5432;
const DB_USER = process.env.DB_USER ?? "postgres"
const DB_PASSWORD = process.env.DB_PASSWORD ?? "postgres"
const DB_NAME = process.env.DB_NAME ?? "postgres"

console.log(`📊 Connecting to database at ${DB_HOST}:${DB_PORT}/${DB_NAME}`);

export const pool = new Pool({
  connectionString: `postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 10000, // How long to wait for a connection
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
});

// Add error handling to the pool
pool.on('error', (err) => {
  console.error('🔴 Unexpected error on idle database client', err);
});

// Handle connection events
pool.on('connect', () => {
  console.log('✅ New database connection established');
});

pool.on('remove', () => {
  console.log('⏏️ Database connection removed from pool');
});

export const db = drizzle(pool);
