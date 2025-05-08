import { db } from "@src/db";
import { eq, and } from "drizzle-orm";
import * as schema from "@db/schema/order";
import redisService from "@src/commons/services/redis.service";
import { Order } from "@db/schema/order";

export const getOrderById = async (
    tenant_id: string,
    user_id: string,
    order_id: string,
) => {
    const cacheKey = `order:tenant:${order_id}:${tenant_id}`;

    try {
        const cachedOrder = await redisService.get<Order>(cacheKey);
        if (cachedOrder) {
            console.log(`Cache hit for order: ${order_id}`);
            return cachedOrder;
        }
        console.log(`Cache miss for tenant: ${tenant_id}, fetching from database`);
    } catch (error) {
        console.error(`Redis error when fetching tenant: ${tenant_id}`, error);
    }

    const result = await db
                    .select()
                    .from(schema.order)
                    .where(and(
                        eq(schema.order.tenant_id, tenant_id),
                        eq(schema.order.user_id, user_id),
                        eq(schema.order.id, order_id),
                    ))
    const order = result[0];

    if (order) {
        try {
            await redisService.set(cacheKey, order, 3600);
        } catch (error) {
            console.error(`Redis error when setting order: ${order}`, error);
        }
    }

    return order
}
