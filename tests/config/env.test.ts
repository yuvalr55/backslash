// env.ts reads process.env at import time — isolateModules re-imports it fresh per test.

describe('env config', () => {
  const BASE_ENV = { GRAPH_DATA_PATH: './data/graph.json' };

  function loadConfig(overrides: Record<string, string>) {
    let config: Record<string, unknown> | undefined;
    jest.isolateModules(() => {
      Object.assign(process.env, BASE_ENV, overrides);
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      config = require('../../src/config/env').config;
    });
    return config!;
  }

  function expectThrows(overrides: Record<string, string>, msgSubstring: string) {
    expect(() => {
      jest.isolateModules(() => {
        Object.assign(process.env, BASE_ENV, overrides);
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('../../src/config/env');
      });
    }).toThrow(msgSubstring);
  }

  afterEach(() => {
    delete process.env.PORT;
    delete process.env.MAX_GRAPH_DEPTH;
    delete process.env.REQUEST_LOGGING_ENABLED;
  });

  it('MAX_GRAPH_DEPTH below minimum (1) throws', () => {
    expectThrows({ MAX_GRAPH_DEPTH: '0' }, 'must be at least 1');
  });

  it('MAX_GRAPH_DEPTH non-integer throws', () => {
    expectThrows({ MAX_GRAPH_DEPTH: '1.5' }, 'must be an integer');
  });

  it('REQUEST_LOGGING_ENABLED non-boolean throws', () => {
    expectThrows({ REQUEST_LOGGING_ENABLED: 'yes' }, "must be 'true' or 'false'");
  });

  it('REQUEST_LOGGING_ENABLED=false parses correctly', () => {
    const cfg = loadConfig({ REQUEST_LOGGING_ENABLED: 'false' });
    expect(cfg.requestLoggingEnabled).toBe(false);
  });

  it('PORT=0 uses 0, not the default', () => {
    const cfg = loadConfig({ PORT: '0' });
    expect(cfg.port).toBe(0);
  });
});
