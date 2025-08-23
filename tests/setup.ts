// Test setup file
// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
};

// Force cleanup after all tests
afterAll(() => {
  // Give Jest a moment to clean up, then force exit
  setTimeout(() => {
    process.exit(0);
  }, 100);
});