import fs from 'fs';
import path from 'path';
import { parse } from 'yaml';
import { config } from './config/env';
import { logger } from './logger/logger';
import { LogEvent } from './logger/log-events';
import { loadGraph } from './graph/graph-loader';
import { initGraphService } from './graph/graph-service';
import { createApp } from './app';

async function start() {
  let graphData;
  try {
    graphData = loadGraph(config.graphDataPath);
    logger.info({ event: LogEvent.GraphLoaded, path: config.graphDataPath, nodes: graphData.nodes.length }, 'Graph loaded successfully');
  } catch (err) {
    logger.error({ event: LogEvent.GraphLoadFailed, err, path: config.graphDataPath }, 'Failed to load graph — exiting');
    process.exit(1);
  }

  initGraphService(graphData);

  const openapiPath = path.resolve(process.cwd(), 'openapi.yaml');
  const swaggerDocument = fs.existsSync(openapiPath)
    ? parse(fs.readFileSync(openapiPath, 'utf-8'))
    : undefined;

  const app = createApp(swaggerDocument);
  const server = app.listen(config.port, () => {
    logger.info({ event: LogEvent.ServerStarted, port: config.port, env: config.nodeEnv }, 'Server started');
  });

  function shutdown() {
    logger.info({ event: LogEvent.ServerShutdownSignal }, 'Shutdown signal received');
    server.closeAllConnections();
    server.close(() => {
      logger.info({ event: LogEvent.ServerClosed }, 'HTTP server closed');
      process.exit(0);
    });
  }

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

start();
