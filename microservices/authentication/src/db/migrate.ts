import dotenv from 'dotenv';
dotenv.config();

import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db, pool } from './index';

const MAX_RETRIES = 10;
const RETRY_DELAY = 5000; // 5 seconds

const main = async (retries = 0): Promise<void> => {
    try {
        console.log(`Attempting database migration (attempt ${retries + 1}/${MAX_RETRIES})`);
        // This will run migrations on the database, skipping the ones already applied
        await migrate(db, { migrationsFolder: './drizzle' });
        console.log('✅ Database migration completed successfully');
        
        // Don't forget to close the connection, otherwise the script will hang
        await pool.end();
    } catch (error) {
        console.error(`❌ Migration failed:`, error);
        
        if (retries < MAX_RETRIES - 1) {
            console.log(`⏱ Retrying in ${RETRY_DELAY/1000} seconds...`);
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
            return main(retries + 1);
        } else {
            console.error(`❌ Maximum retries (${MAX_RETRIES}) reached. Migration failed.`);
            await pool.end();
            process.exit(1);
        }
    }
}

main().catch(error => {
    console.error('Unhandled error in migration process:', error);
    process.exit(1);
});
