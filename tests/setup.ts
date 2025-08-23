// Test setup file - keep it minimal
// Don't mock console in CI to avoid hanging
if (process.env.NODE_ENV !== 'test') {
  global.console = {
    ...console,
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  };
}