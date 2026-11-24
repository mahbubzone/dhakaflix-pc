/**
 * Test Setup
 * 
 * Global setup for Jest tests.
 */

// Mock Electron modules for testing
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn((name: string) => {
      switch (name) {
        case 'userData':
          return '/tmp/dhakaflix-test';
        case 'logs':
          return '/tmp/dhakaflix-test/logs';
        default:
          return '/tmp';
      }
    }),
    getVersion: jest.fn(() => '0.1.0'),
  },
  ipcMain: {
    handle: jest.fn(),
    on: jest.fn(),
  },
  ipcRenderer: {
    invoke: jest.fn(),
    on: jest.fn(),
    removeListener: jest.fn(),
  },
  BrowserWindow: jest.fn(),
  shell: {
    openExternal: jest.fn(),
  },
}));

// Increase timeout for integration tests
jest.setTimeout(10000);

// Clean up after tests
afterAll(() => {
  jest.clearAllMocks();
});
