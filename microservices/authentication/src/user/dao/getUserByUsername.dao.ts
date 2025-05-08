import * as schema from '@db/schema/users'
import { db } from "@src/db";
import { eq, and } from "drizzle-orm";
import redisService from '../services/redis.service';
import { User } from '@db/schema/users';

export const getUserByUsername = async (username: string, tenant_id: string) => {
    const cacheKey = `user:username:${tenant_id}:${username}`;

    try {
        const cachedUser = await redisService.get<User>(cacheKey);
        if (cachedUser) {
            console.log(`Cache hit for user: ${username}`);
            return cachedUser;
        }
        console.log(`Cache miss for user: ${username}, fetching from database`);
    } catch (error) {
        console.error(`Redis error when fetching user: ${username}`, error);
    }

    const result = await db
                    .select()
                    .from(schema.users)
                    .where(
                        and(
                            eq(schema.users.username, username),
                            eq(schema.users.tenant_id, tenant_id)
                        )
                    )
    const user = result[0];

    if (user) {
        try {
            await redisService.set(cacheKey, user, 3600);
        } catch (error) {
            console.error(`Redis error when setting user: ${username}`, error);
        }
    }

    return user
}

