import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface AppConfig {
  port: number;
  nodeEnv: string;
  database: {
    type: 'sqlite';
    path: string;
  };
  jwtSecret: string;
  passwordPolicy: {
    minLength: number;
    requireUppercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
  };
  security: {
    tokenExpiresIn: string;
    refreshTokenExpiresIn: string;
    maxLoginAttempts: number;
    lockoutDuration: number;
  };
}

function validateConfig(): AppConfig {
  const config = {
    port: process.env.PORT ? parseInt(process.env.PORT) : undefined,
    nodeEnv: process.env.NODE_ENV,
    database: {
      type: 'sqlite' as const,
      path: process.env.SQLITE_PATH || 'test.sqlite'
    },
    jwtSecret: process.env.JWT_SECRET,
    passwordPolicy: {
      minLength: 8,
      requireUppercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
    },
    security: {
      tokenExpiresIn: '15m', // 15 minutes
      refreshTokenExpiresIn: '7d', // 7 days
      maxLoginAttempts: 5,
      lockoutDuration: 15 * 60 * 1000, // 15 minutes in milliseconds
    }
  };
  // Validate required environment variables
  const missingVars = [];
  if (!config.jwtSecret) missingVars.push('JWT_SECRET');
  if (!config.nodeEnv) missingVars.push('NODE_ENV');

  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  if (config.port === undefined) {
    config.port = 5000; // Default port
  }

  return config as AppConfig;
}

export const appConfig = validateConfig();

// Export types for use in other files
export type { AppConfig };
