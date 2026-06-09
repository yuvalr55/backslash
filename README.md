# Backslash — Microservice Graph Query API

A production-quality Node.js + TypeScript REST API that loads a microservice dependency graph and exposes a generic, composable filtering API over it.

---

## Setup

### Local

```bash
git clone <repo>
cd backslash
npm install
cp .env.example .env
npm run dev
```

### Docker

```bash
docker-compose up --build
```

The server starts on `http://localhost:3000`. To update the graph without rebuilding the image, edit `data/graph.json` and restart the container (`docker-compose restart`).

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | HTTP port |
| `NODE_ENV` | `development` | Environment (`development` / `production`) |
| `GRAPH_DATA_PATH` | `./data/graph.json` | Path to the graph JSON file |
| `LOG_LEVEL` | `info` | Pino log level (`trace` / `debug` / `info` / `warn` / `error` / `silent`) |
| `REQUEST_LOGGING_ENABLED` | `true` | Toggle per-request logging |
| `MAX_GRAPH_DEPTH` | `50` | Maximum DFS path length; paths that reach the cap are emitted truncated |

---

## API Reference

### `GET /health`
Liveness check. Always returns 200 if the process is up.

```json
{ "status": "ok" }
```

### `GET /ready`
Readiness check. Returns 200 only if the graph is loaded, 503 otherwise.

```json
{ "status": "ready" }
```

### `GET /graph`
Returns a renderable subgraph. Without filters, returns the full graph.

**Response shape:**
```json
{
  "nodes": [
    {
      "name": "frontend",
      "kind": "service",
      "language": "java",
      "path": "train-ticket/frontend",
      "publicExposed": true
    }
  ],
  "edges": [
    { "from": "frontend", "to": "admin-basic-info-service" }
  ],
  "meta": {
    "appliedFilters": [],
    "routeCount": 42,
    "nodeCount": 38,
    "edgeCount": 51
  }
}
```

**Query Parameters:**

| Parameter | Values | Effect |
|---|---|---|
| `publicExposed` | `true` / `false` | `true` → only routes starting at a `publicExposed` node |
| `sink` | `true` / `false` | `true` → only routes ending at a sink (any node where `kind !== 'service'`) |
| `vulnerability` | `true` / `false` | `true` → only routes containing a node with a vulnerability |

Filters are **composable** — any combination can be used:

```bash
# All routes from public entry points that reach a database
curl "http://localhost:3000/graph?publicExposed=true&sink=true"

# Routes that pass through a vulnerable service
curl "http://localhost:3000/graph?vulnerability=true"

# High-severity paths: public entry → vulnerable node → database sink
curl "http://localhost:3000/graph?publicExposed=true&sink=true&vulnerability=true"
```

**Error responses:**

| Scenario | Status | Code |
|---|---|---|
| Unknown query parameter | 400 | `INVALID_QUERY_PARAM` |
| Non-boolean parameter value | 400 | `INVALID_BOOLEAN` |
| Route not found | 404 | `NOT_FOUND` |
| Unexpected server error | 500 | `INTERNAL_ERROR` |

```bash
curl "http://localhost:3000/graph?foo=bar"
# 400 { "error": { "code": "INVALID_QUERY_PARAM", "message": "Unknown query parameter(s): 'foo'" } }

curl "http://localhost:3000/graph?sink=yes"
# 400 { "error": { "code": "INVALID_BOOLEAN", "message": "'sink' must be 'true' or 'false', got 'yes'" } }
```

---

## Architecture

```
src/
├── app.ts                    Express app factory (middleware + routing)
├── server.ts                 HTTP server startup + graceful shutdown
├── config/env.ts             Typed, validated environment configuration
├── logger/logger.ts          Pino logger instance
├── graph/
│   ├── graph.types.ts        TypeScript interfaces (GraphNode, Route, etc.)
│   ├── graph-loader.ts       JSON file loading + shape validation
│   ├── graph-service.ts      nodeMap + adjacency list + route cache + inverted index (singleton)
│   ├── graph-traversal.ts    DFS with cycle detection + depth limiting
│   └── graph-response-builder.ts  Route[] → { nodes, edges, meta }
├── filters/
│   ├── route-filter.interface.ts  RouteFilter interface
│   ├── filter-registry.ts         Registry + composition engine
│   ├── public-exposed.filter.ts
│   ├── sink.filter.ts
│   └── vulnerability.filter.ts
├── routes/graph.routes.ts    GET /graph controller
├── middleware/
│   ├── request-logger.ts     Per-request structured logging
│   ├── error-handler.ts      Centralised error → { error: { code, message } }
│   └── not-found.ts          404 fallback
└── health/health.routes.ts   GET /health, GET /ready
```

### Data Model

- **Route**: An ordered list of `GraphNode` objects forming a directed path from a root to a leaf.
- **Root node**: A node with no incoming edges (from known source nodes).
- **Leaf node**: A node with no outgoing edges, or one whose depth cap is reached.
- **Sink**: Any node where `kind !== 'service'` (e.g. `rds`, `sqs`).
- Routes are enumerated once at first request via DFS and cached. At the same time an **inverted index** (`Map<FilterKey, Set<number>>`) is built — mapping each filter key to the set of route indices it matches. Multi-filter requests become a set intersection starting from the smallest set: O(min matching set size) instead of a full scan.

---

## How to Add a New Filter

1. Create `src/filters/my-new.filter.ts`:

```typescript
import { RouteFilter } from './route-filter.interface';
import { GraphNode, Route } from '../graph/graph.types';

export class MyNewFilter implements RouteFilter {
  apply(routes: Route[], _nodeMap: Map<string, GraphNode>): Route[] {
    return routes.filter((route) => /* your predicate */ true);
  }
}
```

2. Add the key to the `FilterKey` enum in `src/filters/filter.types.ts`:

```typescript
export enum FilterKey {
  PublicExposed = 'publicExposed',
  Sink = 'sink',
  Vulnerability = 'vulnerability',
  MyNew = 'myNew',   // ← add this
}
```

3. Register it in `src/filters/filter-registry.ts`:

```typescript
[FilterKey.MyNew, new MyNewFilter()],
```

The controller, validation, and composition all update automatically.

---

## Scalability Notes

| Concern | Approach |
|---|---|
| Node lookup | `Map<string, GraphNode>` — O(1) |
| Neighbour lookup | Adjacency list `Map<string, string[]>` — O(degree) |
| Cycle prevention | Per-path `visited: Set<string>` in DFS |
| Depth limiting | `MAX_GRAPH_DEPTH` env var (default 50); truncated paths are emitted, not silently dropped |
| Route caching | Routes computed once and cached — O(1) on subsequent requests |
| Filter complexity | Inverted index built at cache time — each request is a set intersection O(min matching set size), not a full scan |
| Unknown target nodes | Logged as warning, skipped — remaining targets in the same edge are kept |
| Unknown source nodes | Entire edge skipped with a warning — prevents phantom incoming-edge counts on targets |
| Duplicate source keys | Targets merged across all edges sharing the same `from` — no data loss |

---

## Design Decisions

### Route-first model

Filters operate on **routes** (complete source-to-sink paths) rather than on individual nodes or edges. This maps naturally to the security use-cases in the spec — "routes that start at a public entry point and end at a database" is a path-level predicate, not a node-level one. A node-level model would require reconstructing paths after filtering to answer those questions anyway.

### DFS over BFS

DFS enumerates complete paths incrementally and integrates naturally with the per-path `visited` set needed for cycle detection. BFS would require tracking the full frontier of partial paths, consuming more memory for wide graphs while offering no advantage for complete-path enumeration.

### Singleton GraphService + eager route cache

The graph is static (loaded once at startup) and queries are read-only. Enumerating routes is O(V + E) but route count can be exponential in branching factor, so the result is cached on first access. The singleton means a hot request path is pure map lookups and array filters with no I/O or re-traversal.

### `filter=false` is a no-op, not an inversion

The spec asks to *include* routes matching a criterion — there is no "exclude" semantic. Treating `false` as an inversion (`?sink=false` → routes that do *not* end at a sink) would make the API more complex and is not what the spec describes. A no-op keeps the surface area small and avoids surprising interactions when combining filters.

### Generic filter registry

Each filter is an object implementing a single `apply(routes, nodeMap)` method. The registry is a `Map<FilterKey, RouteFilter>` — adding a filter is two lines (one enum value, one Map entry) with no changes to the controller, validation, or composition logic. This keeps the extension path obvious without requiring a plugin system.

---

## Assumptions

1. **Sink definition**: Any node where `kind !== 'service'` is a sink — covers `rds`, `sqs`, and any future infrastructure kinds.
2. **`filter=false` is a no-op**: `?sink=false` is equivalent to omitting the parameter; it does not invert the filter.
3. **Route definition**: A route is a directed path from a root to a leaf. Disconnected nodes (no edges) produce single-node routes.
4. **`assurance-service`**: Referenced as a target in edges but absent from the nodes array in the source JSON. Logged as a warning; the remaining targets in those edges are kept.
5. **`consign-service` edge**: The `to` field is a string scalar in the source JSON, not an array. The loader normalises it to `string[]` transparently.
6. **Edge `from` validation**: Every edge must have a non-empty string `from` field. A missing or non-string value raises a `GraphLoadError` at startup.
7. **Graph is static**: Loaded once at startup; no hot-reload. Restart the server (or container) to pick up a new graph file.

---

## Scripts

```bash
npm run dev            # Start with live reload (ts-node-dev)
npm run build          # Compile to dist/
npm start              # Run compiled output
npm test               # Run all Jest tests
npm run test:coverage  # Run tests with coverage report
npm run lint           # ESLint
npm run format         # Prettier
```

## OpenAPI / Swagger UI

The full API contract is in [`openapi.yaml`](openapi.yaml) (OpenAPI 3.1).

When the server is running, interactive Swagger UI is available at:

```
http://localhost:3000/docs/
```

You can also import `openapi.yaml` directly into Postman, Insomnia, or any OpenAPI-compatible tool.

## Postman

Import `backslash-api.postman_collection.json` into Postman. The collection uses a single `baseUrl` variable (default `http://localhost:3000`) — no separate environment file is needed. Each request includes test assertions.
