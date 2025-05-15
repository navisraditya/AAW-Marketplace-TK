import { Request, Response, NextFunction } from "express";
import axios from 'axios';
import CircuitBreaker from "opossum";

// Circuit breaker options
const circuitBreakerOptions = {
  timeout: 10000, // 10 seconds timeout for the circuit breaker
  errorThresholdPercentage: 50, // Open the circuit if 50% of requests fail
  resetTimeout: 30000, // Close the circuit after 30 seconds
  errorFilter: (error: any) => {

    const serviceErrors = ['ECONNABORTED', 'ECONNREFUSED', 'ENOTFOUND'];
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
  const response = await axios.post(`${process.env.AUTH_MS_URL}/user/verify-token`, { token });
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