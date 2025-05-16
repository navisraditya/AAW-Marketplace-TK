import { Request, Response, NextFunction } from "express";
import axios from 'axios';
import axiosRetry from "axios-retry";
import CircuitBreaker from "opossum";

// Configure Axios with timeout and retry mechanism
const httpClient = axios.create({
  timeout: 15000, // 15 seconds timeout
});

axiosRetry(httpClient, {
  retries: 3, // Retry up to 3 times
  retryDelay: axiosRetry.exponentialDelay, // Exponential backoff
  retryCondition: (error) => {
    // Retry on network errors, timeouts or 5xx server errors
    return axiosRetry.isNetworkOrIdempotentRequestError(error) || 
           error.code === 'ETIMEDOUT' || 
           (error.response && error.response.status >= 500);
  }
});

// Circuit breaker options
const circuitBreakerOptions = {
  timeout: 20000, // 20 seconds timeout for the circuit breaker (increased from 10s)
  errorThresholdPercentage: 50, // Open the circuit if 50% of requests fail
  resetTimeout: 30000, // Close the circuit after 30 seconds
  errorFilter: (error: any) => {
    // Open the circuit for timeout, service-related errors, or HTTP 500 errors
    const serviceErrors = ['ECONNABORTED', 'ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT'];
    if (serviceErrors.includes(error.code)) {
      console.log(`Network error detected: ${error.code}`);
      return false;
    }
    if (error.response && error.response.status >= 500) {
      console.log(`Server error detected: ${error.response.status}`);
      return false;
    }
    return true;
  },
};

const verifyTokenBreaker = new CircuitBreaker(async (token: string) => {
  console.log(`Verifying token with auth service at: ${process.env.AUTH_MS_URL}/user/verify-token`);
  const response = await httpClient.post(`${process.env.AUTH_MS_URL}/user/verify-token`, { token });
  if (response.status !== 200) {
    throw new Error("Invalid token");
  }
  return response.data;
}, circuitBreakerOptions);

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
    console.log(error)
    return res.status(401).send({ message: "Invalid token" });
  }
};