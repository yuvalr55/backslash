export class EnvError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EnvError';
  }
}

export const EnvErrorMessages = {
  missingEnv: (key: string) =>
    `Missing required environment variable: ${key}`,

  mustBeInteger: (key: string, raw: string) =>
    `Environment variable ${key} must be an integer, got '${raw}'`,

  mustBeAtLeast: (key: string, min: number, val: number) =>
    `Environment variable ${key} must be at least ${min}, got ${val}`,

  mustBeBoolean: (key: string, raw: string) =>
    `Environment variable ${key} must be 'true' or 'false', got '${raw}'`,
} as const;
