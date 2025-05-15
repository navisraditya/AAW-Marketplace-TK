import { sql } from 'drizzle-orm';
import { db } from '@src/db/index';
import { categories, NewCategory } from '@db/schema/categories';
import { products, NewProduct } from '@db/schema/products';

async function seedCategoryAndProducts() {
  const TENANT_ID   = '47dd6b24-0b23-46b0-a662-776158d089ba';
  const CATEGORY_ID = '3de4fe08-f501-49e3-9a29-72ab6170f09d';
  const SPECIAL_ID  = 'fa6f5f96-327a-435b-85a0-3f72804f426b';

  await db.execute(sql`
    TRUNCATE TABLE "products", "categories"
    RESTART IDENTITY CASCADE;
  `);

  const category: NewCategory = {
    id:        CATEGORY_ID,
    tenant_id: TENANT_ID,
    name:      'Default Category',
  };

  await db.insert(categories).values(category).execute();
  console.log(`✅ Seeded category ${CATEGORY_ID}`);

    const special: NewProduct = {
    id:                  SPECIAL_ID,
    tenant_id:           TENANT_ID,
    name:                'Special Product',
    description:         null,                
    price:               500,
    quantity_available:  142,
    category_id:         CATEGORY_ID,
  };
  await db
    .insert(products)
    .values(special)
    .onConflictDoNothing() 
    .execute();
  console.log(`→ Inserted special product ${SPECIAL_ID}`);

  const TOTAL = 8192;
  const BATCH = 1000;
  for (let offset = 0; offset < TOTAL; offset += BATCH) {
    const batch: NewProduct[] = [];
    for (let i = offset; i < Math.min(offset + BATCH, TOTAL); i++) {
      batch.push({
        tenant_id:          TENANT_ID,
        name:               `Product ${i + 1}`,
        price:              Math.floor(Math.random() * 1000) + 1,
        quantity_available: Math.floor(Math.random() * 100)  + 1,
        category_id:        CATEGORY_ID,
      });
    }
    await db.insert(products).values(batch).execute();
    console.log(`🌱 Seeded products ${offset + 1}–${Math.min(offset + BATCH, TOTAL)}`);
  }

  console.log('🎉 All products seeded!');
}

seedCategoryAndProducts()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('❌ Seeder failed', e);
    process.exit(1);
  });

