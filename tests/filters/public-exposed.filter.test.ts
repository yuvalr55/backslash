import { PublicExposedFilter } from '../../src/filters/public-exposed.filter';
import { GraphNode, NodeKind, Route } from '../../src/graph/graph.types';

function node(name: string, publicExposed?: boolean): GraphNode {
  return { name, kind: NodeKind.Service, publicExposed };
}

const nodeMap = new Map<string, GraphNode>();
const filter = new PublicExposedFilter();

describe('PublicExposedFilter', () => {
  it('keeps routes starting with a publicExposed node', () => {
    const routes: Route[] = [[node('a', true), node('b')]];
    expect(filter.apply(routes, nodeMap)).toHaveLength(1);
  });

  it('removes routes starting with a non-public node', () => {
    const routes: Route[] = [[node('a', false), node('b')]];
    expect(filter.apply(routes, nodeMap)).toHaveLength(0);
  });

  it('removes routes starting with a node where publicExposed is undefined', () => {
    const routes: Route[] = [[node('a'), node('b')]];
    expect(filter.apply(routes, nodeMap)).toHaveLength(0);
  });

  it('handles empty route list', () => {
    expect(filter.apply([], nodeMap)).toHaveLength(0);
  });

  it('keeps only public routes from mixed input', () => {
    const routes: Route[] = [
      [node('pub', true), node('b')],
      [node('priv', false), node('c')],
    ];
    const result = filter.apply(routes, nodeMap);
    expect(result).toHaveLength(1);
    expect(result[0][0].name).toBe('pub');
  });
});
