export const GraphRouteErrorMessages = {
  invalidBoolean: (key: string, value: string) =>
    `'${key}' must be 'true' or 'false', got '${value}'`,

  unknownQueryParam: (unknownKeys: string[]) =>
    `Unknown query parameter(s): ${unknownKeys.map((k) => `'${k}'`).join(', ')}`,

  mustBeSimpleString: (key: string) =>
    `'${key}' must be a simple string value`,
} as const;
