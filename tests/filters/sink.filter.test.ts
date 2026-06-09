import { SinkFilter, isSink } from '../../src/filters/sink.filter';
import { GraphNode, NodeKind, Route } from '../../src/graph/graph.types';

function node(name: string, kind: NodeKind): GraphNode {
  return { name, kind };
}

const nodeMap = new Map<string, GraphNode>();
const filter = new SinkFilter();

describe('isSink', () => {
  it('returns true for rds', () => expect(isSink(node('db', NodeKind.Rds))).toBe(true));
  it('returns true for sqs', () => expect(isSink(node('q', NodeKind.Sqs))).toBe(true));
  it('returns false for service', () => expect(isSink(node('svc', NodeKind.Service))).toBe(false));
});

describe('SinkFilter', () => {
  it('keeps routes ending at a sink node', () => {
    const routes: Route[] = [[node('a', NodeKind.Service), node('db', NodeKind.Rds)]];
    expect(filter.apply(routes, nodeMap)).toHaveLength(1);
  });

  it('removes routes ending at a service node', () => {
    const routes: Route[] = [[node('a', NodeKind.Service), node('b', NodeKind.Service)]];
    expect(filter.apply(routes, nodeMap)).toHaveLength(0);
  });

  it('handles empty route list', () => {
    expect(filter.apply([], nodeMap)).toHaveLength(0);
  });

  it('keeps only sink routes from mixed input', () => {
    const routes: Route[] = [
      [node('a', NodeKind.Service), node('db', NodeKind.Rds)],
      [node('a', NodeKind.Service), node('b', NodeKind.Service)],
    ];
    expect(filter.apply(routes, nodeMap)).toHaveLength(1);
  });
});
