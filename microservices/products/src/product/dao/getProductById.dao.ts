import { db } from "@src/db";
import { eq, and } from "drizzle-orm";
import * as schema from '@db/schema/products'
import redisService from "../services/redis.service";
import { Product } from "@db/schema/products";

export const getProductById = async (tenantId: string, id: string) => {

    const cacheKey = `tenant:id:${tenantId}:${id}`;

    try {
        const cachedTenant= await redisService.get<Product>(cacheKey);
        if (cachedTenant) {
            console.log(`Cache hit for product: ${tenantId}`);
            return cachedTenant;
        }
        console.log(`Cache miss for product: ${tenantId}, fetching from database`);
    } catch (error) {
        console.error(`Redis error when fetching product: ${tenantId}`, error);
    }

    
    const result = await db
                    .select()
                    .from(schema.products)
                    .where(
                        and(
                            eq(schema.products.tenant_id, tenantId),
                            eq(schema.products.id, id)
                        )
                    )
    const product = result?.[0];

    if (product) {
        try {
            await redisService.set(cacheKey, product, 3600);
        } catch (error) {
            console.error(`Redis error when setting product: ${id}`, error);
        }
    }

    return product

}
