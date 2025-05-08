import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import axios from "axios";
import axiosRetry from "axios-retry";
import CircuitBreaker from "opossum";

// Configure Axios with timeout and retry mechanism
const httpClient = axios.create({
  timeout: 5000, // 5 seconds timeout
});

axiosRetry(httpClient, {
  retries: 3, // Retry up to 3 times
  retryDelay: axiosRetry.exponentialDelay, // Exponential backoff
});

// Circuit breaker options
const circuitBreakerOptions = {
  timeout: 10000, // 10 seconds timeout for the circuit breaker
  errorThresholdPercentage: 50, // Open the circuit if 50% of requests fail
  resetTimeout: 30000, // Close the circuit after 30 seconds
};

const verifyTokenBreaker = new CircuitBreaker(async (token: string) => {
  const response = await httpClient.post("/verify-token", { token });
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

    const { id, tenant_id } = payload;
    const SERVER_TENANT_ID = process.env.TENANT_ID;
    if (!SERVER_TENANT_ID) {
      return res.status(500).send({ message: "Server tenant ID is missing" });
    }
    if (tenant_id !== process.env.TENANT_ID) {
      return res.status(401).send({ message: "Invalid token" });
    }

    req.body.user = payload;
    next();
  } catch (error) {
    if (error instanceof Error && error.message === "Breaker is open") {
      return res.status(503).send({ message: "Service unavailable" });
    }
    return res.status(401).send({ message: "Invalid token" });
  }
};