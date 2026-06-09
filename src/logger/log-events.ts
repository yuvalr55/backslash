export enum LogEvent {
  // Server lifecycle
  ServerStarted = 'server.started',
  ServerShutdownSignal = 'server.shutdown_signal',
  ServerClosed = 'server.closed',

  // Graph loading
  GraphLoaded = 'graph.loaded',
  GraphLoadFailed = 'graph.load_failed',

  // Graph service
  GraphServiceInitialized = 'graph.service_initialized',
  GraphRoutesCached = 'graph.routes_cached',
  GraphIndexBuilt = 'graph.index_built',
  GraphEdgeUnknownSource = 'graph.edge_unknown_source',
  GraphEdgeUnknownTarget = 'graph.edge_unknown_target',

  // HTTP
  HttpRequest = 'http.request',
  GraphQuery = 'graph.query',

  // Errors
  UnexpectedError = 'error.unexpected',
}
