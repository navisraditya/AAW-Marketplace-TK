import { db } from "@src/db";
import { eq, and } from "drizzle-orm";
import * as schema from '@db/schema/wishlistDetail';
import { WishlistDetail } from "@db/schema/wishlistDetail";
import redisService from "../services/redis.service";

export const getWishlistDetailByWishlistId = async (
    wishlist_id: string,
) => {

    const cacheKey = `detail_wishlist:${wishlist_id}`;

    try {
        const cachedWishlist = await redisService.get<WishlistDetail>(cacheKey);
        if (cachedWishlist) {
            console.log(`Cache hit for wishlist_detail: ${wishlist_id}`);
            return cachedWishlist;
        }
        console.log(`Cache miss for wishlist_detail: ${wishlist_id}, fetching from database`);
    } catch (error) {
        console.error(`Redis error when fetching wishlist: ${wishlist_id}`, error);
    }

    const result = await db
                    .select()
                    .from(schema.wishlistDetail)
                    .where(and(
                        eq(schema.wishlistDetail.wishlist_id, wishlist_id)
                    ))
    const wishlistDetail = result?.[0];

    if (wishlistDetail) {
        try {
            await redisService.set(cacheKey, wishlistDetail, 3600);
        } catch (error) {
            console.error(`Redis error when setting order: ${wishlistDetail}`, error);
        }

    }

    return wishlistDetail

}
