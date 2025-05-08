import { db } from "@src/db";
import { and, eq } from "drizzle-orm";
import * as schema from "@db/schema/orderDetail";
import redisService from "@src/commons/services/redis.service";
import { OrderDetail } from "@db/schema/orderDetail";

export const getOrderDetail = async (
    tenant_id: string,
    order_id: string,
) => {

    const cacheKey = `order_detail:tenant:${order_id}:${tenant_id}`;

    try {
        const cachedOrderDetail= await redisService.get<OrderDetail>(cacheKey);
        if (cachedOrderDetail) {
            console.log(`Cache hit for order: ${order_id}'s detail`);
            return cachedOrderDetail;
        }
        console.log(`Cache miss for order: ${order_id}'s detail, fetching from database`);
    } catch (error) {
        console.error(`Redis error when fetching order: ${order_id}'s detail`, error);
    }

    const result = await db
                    .select()
                    .from(schema.orderDetail)
                    .where(and(
                        eq(schema.orderDetail.tenant_id, tenant_id),
                        eq(schema.orderDetail.order_id, order_id),
                    ))
    const order_detail = result[0];

    if (order_detail) {
        try {
            await redisService.set(cacheKey, order_detail, 3600);
        } catch (error) {
            console.error(`Redis error when setting order: ${order_id}'s detail`, error);
        }
    }

    return order_detail
}
