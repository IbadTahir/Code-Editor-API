import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { connectDB, db } from './config/db';
import { appConfig } from './config/appConfig';
import { errorHandler } from './middleware/errorHandler';
// import { apiLimiter } from './middleware/rateLimiter'; // Disabled for easier testing
import { ErrorRequestHandler } from 'express';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';

// Validate configuration
if (!appConfig) {
  console.error('Invalid configuration. Please check your environment variables.');
  process.exit(1);
}

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.ALLOWED_ORIGINS?.split(',').filter(Boolean) 
    : '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10kb' })); // Limit body size
// app.use(apiLimiter); // Rate limiting disabled for easier testing

// Initialize application
async function initializeApp() {
  try {
    // Connect to database
    await connectDB();

    // Routes
    app.use('/api/auth', authRoutes);
    app.use('/api/users', userRoutes);

    // Health check endpoint
    app.get('/health', (req, res) => {
      res.status(200).json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        environment: appConfig.nodeEnv,
        dbConnection: db.getConnection()?.isInitialized ? 'Connected' : 'Disconnected'
      });
    });    // Error handling
    app.use(errorHandler as ErrorRequestHandler);

    // Handle unmatched routes
    app.use((req, res) => {
      res.status(404).json({ error: 'Not Found', code: 'ROUTE_NOT_FOUND' });
    });

    const PORT = appConfig.port || 5000;

    const server = app.listen(PORT, () => {
      console.log(`Server is running in ${appConfig.nodeEnv} mode on port ${PORT}`);
    });

    // Handle graceful shutdown
    const shutdown = async () => {
      console.log('\nShutdown signal received...');
      
      // Close HTTP server first
      await new Promise<void>((resolve) => {
        server.close(() => {
          console.log('HTTP server closed');
          resolve();
        });
      });
      
      // Then close database connection
      await db.disconnect();
      
      console.log('Graceful shutdown completed');
      process.exit(0);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

  } catch (error) {
    console.error('Failed to initialize application:', error);
    process.exit(1);
  }
}

// Start the application
initializeApp();
