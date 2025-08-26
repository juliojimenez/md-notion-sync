// Test setup file - properly mock console to prevent hanging
const originalConsole = global.console;

// Mock console methods to prevent hanging issues
global.console = {
  ...originalConsole,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
};