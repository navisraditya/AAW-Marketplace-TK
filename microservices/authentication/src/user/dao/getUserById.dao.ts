import * as schema from '@db/schema/users'
import { db } from "@src/db";
import { eq, and } from "drizzle-orm";
import redisService from '../services/redis.service';
import { User } from '@db/schema/users';

export const getUserById = async (user_id: string, tenant_id: string) => {

    const cacheKey = `user:username:${tenant_id}:${user_id}`;

    try {
        const cachedUser = await redisService.get<User>(cacheKey);
        if (cachedUser) {
            console.log(`Cache hit for user: ${user_id}`);
            return cachedUser;
        }
        console.log(`Cache miss for user: ${user_id}, fetching from database`);
    } catch (error) {
        console.error(`Redis error when fetching user: ${user_id}`, error);
    }

    const result = await db
                    .select({
                        id: schema.users.id,
                        username: schema.users.username,
                        email: schema.users.email,
                        full_name: schema.users.full_name,
                        address: schema.users.address,
                        phone_number: schema.users.phone_number
                    })
                    .from(schema.users)
                    .where(
                        and(
                            eq(schema.users.id, user_id),
                            eq(schema.users.tenant_id, tenant_id)
                        )
                    )
    const user = result[0];

    if (user) {
        try {
            await redisService.set(cacheKey, user, 3600);
        } catch (error) {
            console.error(`Redis error when setting user: ${user.username}`, error);
        }
    }

    return user

}
