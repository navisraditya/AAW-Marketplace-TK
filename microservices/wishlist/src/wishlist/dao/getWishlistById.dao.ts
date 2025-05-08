import { db } from "@src/db";
import { eq, and } from "drizzle-orm";
import * as schema from '@db/schema/wishlist';
import { Wishlist } from "@db/schema/wishlist";
import redisService from "../services/redis.service";

export const getWishlistById = async (
    tenant_id: string,
    id: string,
) => {    
    const cacheKey = `wishlist:tenant:${id}:${tenant_id}`;

    try {
        const cachedWishlist = await redisService.get<Wishlist>(cacheKey);
        if (cachedWishlist) {
            console.log(`Cache hit for wishlist: ${id}`);
            return cachedWishlist;
        }
        console.log(`Cache miss for wishlist: ${id}, fetching from database`);
    } catch (error) {
        console.error(`Redis error when fetching wishlist: ${id}`, error);
    }

    const result = await db
                    .select()
                    .from(schema.wishlist)
                    .where(and(
                        eq(schema.wishlist.tenant_id, tenant_id),
                        eq(schema.wishlist.id, id)
                    ))
    const wishlist = result?.[0];

    if (wishlist) {
        try {
            await redisService.set(cacheKey, wishlist, 3600);
        } catch (error) {
            console.error(`Redis error when setting order: ${wishlist}`, error);
        }

    }

    return wishlist
}
