export class GraphServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GraphServiceError';
  }
}

export const GraphErrorMessages = {
  // Static messages
  MustContainJsonObject: 'Graph file must contain a JSON object',
  NodesArrayRequired: 'Graph file must have a "nodes" array',
  EdgesArrayRequired: 'Graph file must have an "edges" array',
  ServiceNotInitialised: 'GraphService not initialised',

  // Dynamic message formatters
  invalidEdgeFrom: (index: number, val: unknown) =>
    `Edge at index ${index} has an invalid "from" field: expected a non-empty string, got ${JSON.stringify(val)}`,

  invalidEdgeToItem: (index: number, position: number, val: unknown) =>
    `Edge at index ${index} has an invalid "to" item at position ${position}: expected a non-empty string, got ${JSON.stringify(val)}`,

  cannotReadGraph: (filePath: string) =>
    `Cannot read graph file at: ${filePath}`,

  invalidJson: (filePath: string) =>
    `Graph file is not valid JSON: ${filePath}`,

  missingNodeName: (index: number) =>
    `Node at index ${index} is missing a valid "name" field`,

  invalidNodeKind: (name: string, kind: unknown, validKinds: string[]) =>
    `Node '${name}' has invalid kind '${kind}'; must be one of: ${validKinds.join(', ')}`,

  invalidPublicExposed: (name: string, val: unknown) =>
    `Node '${name}' has invalid publicExposed '${val}'; must be a boolean`,

  invalidVulnerabilities: (name: string) =>
    `Node '${name}' has invalid vulnerabilities field; must be an array`,
} as const;
