import { Request, Response, NextFunction } from "express";
import axios from 'axios';
import axiosRetry from 'axios-retry';
import CircuitBreaker from "opossum";

const httpClient = axios.create({
  timeout: 5000, 
});

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

    const payload = await verifyTokenBreaker.fire(token);

    req.body.user = payload.user;
    next();
  } catch (error) {
    if (error instanceof Error && error.message === "Breaker is open") {
      return res.status(503).send({ message: "Service unavailable" });
    }
    return res.status(401).send({ message: "Invalid token" });
  }
};
