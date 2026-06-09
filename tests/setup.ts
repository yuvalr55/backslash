// Silence pino output in all test suites.
// Must run before any module import so config.logLevel picks it up.
process.env['LOG_LEVEL'] = 'silent';
