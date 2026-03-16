import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

export interface EnvConfig {
  BASE_URL: string;
  API_BASE_URL: string;
  ADMIN_EMAIL: string;
  ADMIN_PASSWORD: string;
  USER_EMAIL: string;
  USER_PASSWORD: string;
  CI: boolean;
}

export function getEnv(): EnvConfig {
  return {
    BASE_URL: process.env.BASE_URL || 'http://localhost:3000',
    API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:8000',
    ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@example.com',
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'Admin123!',
    USER_EMAIL: process.env.USER_EMAIL || 'user@example.com',
    USER_PASSWORD: process.env.USER_PASSWORD || 'User123!',
    CI: process.env.CI === 'true',
  };
}
