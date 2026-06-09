import fs from 'fs';
import { GraphData, GraphEdge, NodeKind, RawNode } from './graph.types';
import { GraphErrorMessages } from './graph-errors';
import { isBoolean, isNonEmptyString, isObject, isString } from '../utils/type-guards';

export class GraphLoadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GraphLoadError';
  }
}

function normaliseEdge(raw: { from: unknown; to: unknown }, index: number): GraphEdge {
  if (!isNonEmptyString(raw.from)) {
    throw new GraphLoadError(GraphErrorMessages.invalidEdgeFrom(index, raw.from));
  }
  const toArray = Array.isArray(raw.to) ? raw.to : [raw.to];
  const to: string[] = toArray.map((item: unknown, i: number) => {
    if (!isNonEmptyString(item)) {
      throw new GraphLoadError(GraphErrorMessages.invalidEdgeToItem(index, i, item));
    }
    return item;
  });
  return { from: raw.from, to };
}

export function loadGraph(filePath: string): GraphData {
  let raw: string;
  try {
    raw = fs.readFileSync(filePath, 'utf-8');
  } catch {
    throw new GraphLoadError(GraphErrorMessages.cannotReadGraph(filePath));
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new GraphLoadError(GraphErrorMessages.invalidJson(filePath));
  }

  if (!isObject(parsed)) {
    throw new GraphLoadError(GraphErrorMessages.MustContainJsonObject);
  }

  const obj = parsed;

  if (!Array.isArray(obj['nodes'])) {
    throw new GraphLoadError(GraphErrorMessages.NodesArrayRequired);
  }
  if (!Array.isArray(obj['edges'])) {
    throw new GraphLoadError(GraphErrorMessages.EdgesArrayRequired);
  }

  const validKinds = new Set<string>(Object.values(NodeKind));
  const rawNodes = obj['nodes'] as RawNode[];
  for (const [i, node] of rawNodes.entries()) {
    const { name, kind, publicExposed, vulnerabilities } = node;

    if (!isNonEmptyString(name)) {
      throw new GraphLoadError(GraphErrorMessages.missingNodeName(i));
    }
    if (!isString(kind) || !validKinds.has(kind)) {
      throw new GraphLoadError(
        GraphErrorMessages.invalidNodeKind(name, kind, [...validKinds]),
      );
    }
    if (publicExposed !== undefined && !isBoolean(publicExposed)) {
      throw new GraphLoadError(
        GraphErrorMessages.invalidPublicExposed(name, publicExposed),
      );
    }
    if (vulnerabilities !== undefined && !Array.isArray(vulnerabilities)) {
      throw new GraphLoadError(
        GraphErrorMessages.invalidVulnerabilities(name),
      );
    }
  }

  const edges = (obj['edges'] as Array<{ from: unknown; to: unknown }>).map(
    (raw, i) => normaliseEdge(raw, i),
  );

  return {
    nodes: rawNodes as unknown as GraphData['nodes'],
    edges,
  };
}
