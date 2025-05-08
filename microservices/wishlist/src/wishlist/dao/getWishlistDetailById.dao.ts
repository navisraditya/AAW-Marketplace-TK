import { db } from "@src/db";
import { eq, and } from "drizzle-orm";
import * as schema from '@db/schema/wishlistDetail';
import { WishlistDetail } from "@db/schema/wishlistDetail";
import redisService from "../services/redis.service";

export const getWishlistDetailById = async (
    id: string,
) => {

    const cacheKey = `wishlist_detail:${id}`;

    try {
        const cachedWishlistDetail = await redisService.get<WishlistDetail>(cacheKey);
        if (cachedWishlistDetail) {
            console.log(`Cache hit for wishlist_detail: ${id}`);
            return cachedWishlistDetail;
        }
        console.log(`Cache miss for wishlist_detail: ${id}, fetching from database`);
    } catch (error) {
        console.error(`Redis error when fetching wishlist_detail: ${id}`, error);
    }

    const result = await db
                    .select()
                    .from(schema.wishlistDetail)
                    .where(and(
                        eq(schema.wishlistDetail.id, id)
                    ))
    const wishlistDetail = result?.[0];

    if (wishlistDetail) {
        try {
            await redisService.set(cacheKey, wishlistDetail, 3600);
        } catch (error) {
            console.error(`Redis error when setting wishlsitDetail: ${wishlistDetail}`, error);
        }

    }

    return wishlistDetail;

}
