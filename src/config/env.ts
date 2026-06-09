import dotenv from 'dotenv';
import path from 'path';
import { EnvError, EnvErrorMessages } from './env-errors';

dotenv.config();

function requireEnv(key: string): string {
  const value = process.env[key];
  if (value === undefined || value.trim() === '') {
    throw new EnvError(EnvErrorMessages.missingEnv(key));
  }
  return value.trim();
}

function optionalEnv(key: string, defaultValue: string): string {
  const value = process.env[key];
  return value !== undefined && value.trim() !== '' ? value.trim() : defaultValue;
}

function optionalIntEnv(key: string, defaultValue: number, min?: number): number {
  const value = process.env[key];
  if (value === undefined || value.trim() === '') return defaultValue;
  const n = Number(value.trim());
  if (!Number.isInteger(n)) {
    throw new EnvError(EnvErrorMessages.mustBeInteger(key, value.trim()));
  }
  if (min !== undefined && n < min) {
    throw new EnvError(EnvErrorMessages.mustBeAtLeast(key, min, n));
  }
  return n;
}

function optionalBoolEnv(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  if (value === undefined || value.trim() === '') return defaultValue;
  const raw = value.trim();
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  throw new EnvError(EnvErrorMessages.mustBeBoolean(key, raw));
}

export const config = {
  port: optionalIntEnv('PORT', 3000),
  nodeEnv: optionalEnv('NODE_ENV', 'development'),
  graphDataPath: path.resolve(process.cwd(), requireEnv('GRAPH_DATA_PATH')),
  logLevel: optionalEnv('LOG_LEVEL', 'info'),
  requestLoggingEnabled: optionalBoolEnv('REQUEST_LOGGING_ENABLED', true),
  maxGraphDepth: optionalIntEnv('MAX_GRAPH_DEPTH', 50, 1),
} as const;
