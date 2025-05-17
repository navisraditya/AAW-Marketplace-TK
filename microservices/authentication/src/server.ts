import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import express_prom_bundle from "express-prom-bundle";

import userRoutes from './user/user.routes';
import redisService from "./user/services/redis.service";
import { pool } from "./db";

const initServices = async () => {
  try {
    await redisService.connect();
    console.log('✅ Connected to Redis server');
  } catch (error) {
    console.error('❌ Failed to connect to Redis server:', error);
    console.log('⚠️ Application will continue, but caching will be disabled');
  }
};

const metricsMiddleware = express_prom_bundle({
  includeMethod: true,
  includePath: true,
  includeStatusCode: true,
  includeUp: true
})

const app = express();
app.use(metricsMiddleware);
app.use(cors());
app.use(express.json());

app.get("/health/redis", async (req, res) => {
  try {
    await redisService.set('health-check', 'ok', 5);
    const value = await redisService.get('health-check');
    
    if (value === 'ok') {
      return res.status(200).json({ status: 'healthy', message: 'Redis connection is working' });
    } else {
      return res.status(500).json({ status: 'unhealthy', message: 'Redis test failed' });
    }
  } catch (error) {
    return res.status(500).json({ 
      status: 'unhealthy', 
      message: 'Redis connection error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.use("/user", userRoutes);

app.get("/", (req, res) => {
  return res.status(200).send("Authentication Microservice is running!");
});

const PORT = process.env.PORT || 8000;

const startApp = async () => {
  await initServices();
  
  app.listen(PORT, () => {
    console.log(`🚀 Authentication Microservice has started on port ${PORT}`);
  });
  
  // Handle graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully');
    
    // Close Redis connection
    await redisService.disconnect();
    
    process.exit(0);
  });
};

startApp().catch(error => {
  console.error('Failed to start the application:', error);
  process.exit(1);
});