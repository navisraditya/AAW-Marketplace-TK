import { sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@src/db/index';
import { cart, NewCart } from '@db/schema/cart';
import { order as orderTable, NewOrder } from '@db/schema/order';

const TENANT_ID           = '47dd6b24-0b23-46b0-a662-776158d089ba';
const USER_ID             = 'fa50dd45-c9be-4991-90da-0bef80ff7cd3';
const SPECIAL_PRODUCT_ID  = 'fa6f5f96-327a-435b-85a0-3f72804f426b';
const CART_COUNT          = 32;
const ORDER_COUNT         = 256;
const SHIPPING_PROVIDERS  = ['JNE','TIKI','SICEPAT','GOSEND','GRAB_EXPRESS'] as const;

export async function seedAll() {
  // 1) clear both tables
  await db.execute(sql`
    TRUNCATE TABLE "cart", "order"
    RESTART IDENTITY CASCADE;
  `);

  // 2) seed cart items
  const carts: NewCart[] = Array.from({ length: CART_COUNT }, () => ({
    id:          uuidv4(),
    tenant_id:   TENANT_ID,
    user_id:     USER_ID,
    product_id:  SPECIAL_PRODUCT_ID,
    quantity:    Math.floor(Math.random() * 5) + 1,
  }));
  await db.insert(cart).values(carts).execute();
  console.log(`✅ Seeded ${CART_COUNT} cart items`);

  // 3) seed orders
  const orders: NewOrder[] = Array.from({ length: ORDER_COUNT }, () => ({
    id:                uuidv4(),
    tenant_id:         TENANT_ID,
    user_id:           USER_ID,
    total_amount:      Math.floor(Math.random() * 100_000) + 1_000,                             // random amount
    shipping_provider: SHIPPING_PROVIDERS[Math.floor(Math.random() * SHIPPING_PROVIDERS.length)], 
  }));
  await db.insert(orderTable).values(orders).execute();
  console.log(`✅ Seeded ${ORDER_COUNT} orders`);
}
