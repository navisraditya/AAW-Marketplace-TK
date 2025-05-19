import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import express_prom_bundle from "express-prom-bundle";

import redisService from "./product/services/redis.service";
import productRoutes from './product/product.routes'
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

// Add main health check endpoint for Kubernetes probes
app.get("/health", async (req, res) => {
  try {
    // Check database connection
    const dbClient = await pool.connect();
    try {
      await dbClient.query('SELECT 1');
      dbClient.release();
      return res.status(200).json({ status: 'ok', database: 'connected' });
    } catch (dbError) {
      dbClient.release();
      console.error('❌ Database health check failed:', dbError);
      return res.status(503).json({ status: 'error', database: 'disconnected' });
    }
  } catch (error) {
    console.error('❌ Health check failed:', error);
    return res.status(503).json({ status: 'error' });
  }
});

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

app.use("/product", productRoutes)

app.get("/", (req, res) => {
  return res.status(200).send("Products Microservice is running!");
});

const PORT = process.env.PORT || 8002;

const startApp = async () => {
  await initServices();
  
  app.listen(PORT, () => {
    console.log(`🚀 Products Microservice has started on port ${PORT}`);
  });
  
  // Handle graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully');
    
    try {
      // Close Redis connection
      await redisService.disconnect();
      console.log('Redis connection closed');
      
      // Close database pool
      await pool.end();
      console.log('Database connections closed');
    } catch (error) {
      console.error('Error during graceful shutdown:', error);
    }
    
    process.exit(0);
  });
  
  // Also handle SIGINT (Ctrl+C)
  process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down gracefully');
    
    try {
      // Close Redis connection
      await redisService.disconnect();
      console.log('Redis connection closed');
      
      // Close database pool
      await pool.end();
      console.log('Database connections closed');
    } catch (error) {
      console.error('Error during graceful shutdown:', error);
    }
    
    process.exit(0);
  });
};

startApp().catch(error => {
  console.error('Failed to start the application:', error);
  process.exit(1);
});



