import * as schemaTenants from '@db/schema/tenants'
import * as schemaTenantDetails from '@db/schema/tenantDetails'
import { db } from '@src/db'
import { eq } from 'drizzle-orm'
import redisService from '../services/redis.service'

export type TenantWithDetails = {
  tenants: { id: string; owner_id: string };
  tenantDetails: { id: string; name: string; tenant_id: string };
}

export const getTenantById = async (tenant_id: string) => {

    const cacheKey = `tenant:${tenant_id}`;

    try {
        const cachedTenant= await redisService.get<TenantWithDetails>(cacheKey);
        if (cachedTenant) {
            console.log(`Cache hit for tenant: ${tenant_id}`);
            return cachedTenant;
        }
        console.log(`Cache miss for tenant: ${tenant_id}, fetching from database`);
    } catch (error) {
        console.error(`Redis error when fetching tenant: ${tenant_id}`, error);
    }


    const result = await db
                    .select()
                    .from(schemaTenants.tenants)
                    .innerJoin(schemaTenantDetails.tenantDetails, eq(schemaTenants.tenants.id, schemaTenantDetails.tenantDetails.tenant_id))
                    .where(eq(schemaTenants.tenants.id, tenant_id))
    const tenant = result[0];

    if (tenant) {
        try {
            await redisService.set(cacheKey, tenant, 3600);
        } catch (error) {
            console.error(`Redis error when setting user: ${tenant}`, error);
        }
    }

    return tenant

}
