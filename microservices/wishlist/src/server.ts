import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import express_prom_bundle from "express-prom-bundle";

import redisService from "./wishlist/services/redis.service";
import wishlistRoutes from "./wishlist/wishlist.routes";
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
  includeUp: true,
});

const app = express();
app.use(metricsMiddleware);
app.use(cors());
app.use(express.json());

app.get("/health", async (req, res) => {
  try {
    // Check database connection
    const dbClient = await pool.connect();
    try {
      await dbClient.query('SELECT 1');
      dbClient.release();
      
      // Check Redis (optional)
      try {
        await redisService.set('health-check', 'ok', 5);
        const value = await redisService.get('health-check');
        if (value === 'ok') {
          return res.status(200).json({ 
            status: 'ok', 
            database: 'connected',
            redis: 'connected' 
          });
        }
      } catch (redisError) {
        console.warn('⚠️ Redis health check failed, but service can continue:', redisError);
        return res.status(200).json({ 
          status: 'ok', 
          database: 'connected',
          redis: 'disconnected',
          message: 'Service operational but Redis is unavailable'
        });
      }
      
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

app.use('/wishlist', wishlistRoutes);

app.get("/", (req, res) => {
  return res.status(200).send("Wishlist Microservice is running!");
});

// Start the server
const PORT = process.env.PORT || 8004;

const server = app.listen(PORT, async () => {
  await initServices();
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  console.log(`\n${signal} received, shutting down gracefully...`);

  // Setting a timeout to force shutdown if graceful shutdown fails
  const forceExit = setTimeout(() => {
    console.error('⌛ Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);

  try {
    // Close server to stop accepting new connections
    server.close(() => {
      console.log('✅ HTTP server closed');
    });

    // Close database connections
    console.log('🔍 Closing database connections');
    await pool.end();
    console.log('✅ Database connections closed');

    // Close Redis connections if any
    console.log('🔍 Closing Redis connections');
    await redisService.disconnect();
    console.log('✅ Redis connections closed');

    clearTimeout(forceExit);
    console.log('👋 Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
};

// Graceful shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default server;



