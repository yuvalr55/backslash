export interface Vulnerability {
  file: string;
  severity: string;
  message: string;
  metadata?: Record<string, string>;
}

export enum NodeKind {
  Service = 'service',
  Rds = 'rds',
  Sqs = 'sqs',
}

export interface GraphNode {
  name: string;
  kind: NodeKind;
  language?: string;
  path?: string;
  publicExposed?: boolean;
  vulnerabilities?: Vulnerability[];
  metadata?: Record<string, unknown>;
}

export interface RawNode {
  name?: string;
  kind?: string;
  publicExposed?: boolean;
  vulnerabilities?: unknown[];
}

export interface GraphEdge {
  from: string;
  to: string[];
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/** An ordered list of nodes representing a directed path through the graph. */
export type Route = GraphNode[];

export interface GraphResponse {
  nodes: GraphNode[];
  edges: Array<{ from: string; to: string }>;
  meta: {
    appliedFilters: string[];
    routeCount: number;
    nodeCount: number;
    edgeCount: number;
  };
}
