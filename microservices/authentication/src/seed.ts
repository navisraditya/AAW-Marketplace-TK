import bcrypt from 'bcrypt';
import { db } from '@src/db/index';
import { sql } from 'drizzle-orm';
import { users, NewUser } from '@db/schema/users';

async function seedWithFixedIds() {
  const TENANT_ID = '47dd6b24-0b23-46b0-a662-776158d089ba';
  const USER_ID   = 'fa50dd45-c9be-4991-90da-0bef80ff7cd3';

  await db.execute(sql`TRUNCATE TABLE users RESTART IDENTITY CASCADE;`);

  const hashed = await bcrypt.hash('P@ssw0rd123', 10);
  const user: NewUser = {
    id:          USER_ID,      
    tenant_id:   TENANT_ID,    
    username:    'seed_user',
    email:       'user@example.com',
    password:    hashed,
    full_name:   'Seed User',
    address:     '123 Drizzle Lane',
    phone_number:'+62-810-0000-0000',
  };

  await db
    .insert(users)
    .values(user)
    .onConflictDoNothing()
    .execute();

  console.log(`✅ Seeded user ${USER_ID} on tenant ${TENANT_ID}`);

}

seedWithFixedIds()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); });

