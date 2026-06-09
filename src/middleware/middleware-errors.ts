export const MiddlewareErrorMessages = {
  routeNotFound: (method: string, path: string) =>
    `Route ${method} ${path} not found`,

  unexpectedError: 'An unexpected error occurred',
} as const;
