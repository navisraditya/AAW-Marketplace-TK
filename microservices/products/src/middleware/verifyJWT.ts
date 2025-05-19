import { Request, Response, NextFunction } from "express";
import axios from 'axios';
import axiosRetry from 'axios-retry';
import CircuitBreaker from "opossum";

const httpClient = axios.create({
  timeout: 5000, 
});

const SERVER_TENANT_ID = process.env.TENANT_ID;

axiosRetry(httpClient, {
  retries: 3,
  retryDelay: (retryCount) => {
    const baseDelay = Math.pow(2, retryCount) * 300; 
    const jitter = Math.random() * 100; 
    return baseDelay + jitter;
  },
  retryCondition: (error) => {
    return Boolean(
      axiosRetry.isNetworkOrIdempotentRequestError(error) || 
      error.code === 'ETIMEDOUT' || 
      (error.response && error.response.status >= 500)
    );
  }
});

const circuitBreakerOptions = {
  timeout: 10000, 
  errorThresholdPercentage: 50, 
  resetTimeout: 10000, 
  errorFilter: (error: any) => {
    const serviceErrors = ['ECONNABORTED', 'ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN'];
    if (serviceErrors.includes(error.code)) {
      return false;
    }
    if (error.response && error.response.status === 500) {
      return false;
    }
    return true;
  },
};

const verifyTokenBreaker = new CircuitBreaker(async (token: string) => {
  const response = await httpClient.post(`${process.env.AUTH_MS_URL}/user/verify-admin-token`, { token });
  if (response.status !== 200) {
    throw new Error("Invalid token");
  }
  return response.data;
}, circuitBreakerOptions);

verifyTokenBreaker.on('open', () => {
  console.warn('Circuit breaker to auth service is now OPEN');
});

verifyTokenBreaker.on('halfOpen', () => {
  console.log('Circuit breaker to auth service is now HALF-OPEN');
});

verifyTokenBreaker.on('close', () => {
  console.log('Circuit breaker to auth service is now CLOSED');
});

const verifyTenantBreaker = new CircuitBreaker(async (params: { token: string, tenantId: string }) => {
  const response = await httpClient.get(`${process.env.TENANT_MS_URL}/tenant/${params.tenantId}`, {
    headers: {
      Authorization: `Bearer ${params.token}`,
    },
  });
  
  if (response.status !== 200) {
    throw new Error("Tenant not found");
  }
  
  return response.data;
}, circuitBreakerOptions);

verifyTenantBreaker.on('open', () => {
  console.warn('Circuit breaker to tenant service is now OPEN');
});

verifyTenantBreaker.on('halfOpen', () => {
  console.log('Circuit breaker to tenant service is now HALF-OPEN');
});

verifyTenantBreaker.on('close', () => {
  console.log('Circuit breaker to tenant service is now CLOSED');
});

export const verifyJWT = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.split("Bearer ")[1];
    if (!token) {
      return res.status(401).send({ message: "Invalid token" });
    }

    if (!SERVER_TENANT_ID) {
      return res.status(500).send({ message: "Server Tenant ID not found" });
    }

    let authPayload;
    try {
      authPayload = await verifyTokenBreaker.fire(token);
    } catch (error) {
      if (error instanceof Error && error.message === "Breaker is open") {
        return res.status(503).send({ message: "Auth service unavailable" });
      }
      return res.status(401).send({ message: "Invalid token" });
    }

    let tenantPayload;
    try {
      tenantPayload = await verifyTenantBreaker.fire({ 
        token, 
        tenantId: SERVER_TENANT_ID 
      });
    } catch (error) {
      if (error instanceof Error && error.message === "Breaker is open") {
        return res.status(503).send({ message: "Tenant service unavailable" });
      }
      return res.status(500).send({ message: "Server Tenant not found" });
    }

    if (authPayload.user.id !== tenantPayload.tenants.owner_id) {
      return res.status(401).send({ message: "Unauthorized: Not tenant owner" });
    }

    req.body.user = authPayload.user;
    next();

  } catch (error) {
    const errorDetails = {
      message: error instanceof Error ? error.message : 'Unknown error',
      name: error instanceof Error ? error.name : 'Error',
    };
    
    console.error('JWT verification error:', errorDetails);
    return res.status(401).send({ message: "Invalid token" });
  }
};
