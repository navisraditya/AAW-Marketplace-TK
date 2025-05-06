import { InternalServerErrorResponse } from "@src/commons/patterns";
import { getAllProductsByTenantId } from "../dao/getAllProductsByTenantId.dao";

export const getAllProductsService = async (page: number, limit: number) => {
    try {
        const SERVER_TENANT_ID = process.env.TENANT_ID;
        if (!SERVER_TENANT_ID) {
            return new InternalServerErrorResponse('Server Tenant ID not found').generate();
        }

        const offset = (page - 1) * limit;
        const products = await getAllProductsByTenantId(SERVER_TENANT_ID, limit, offset);

        return {
            data: {
                products,
                pagination: {
                    page,
                    limit,
                },
            },
            status: 200,
        };
    } catch (err: any) {
        return new InternalServerErrorResponse(err).generate();
    }
};