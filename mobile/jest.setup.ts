jest.mock('expo-file-system');
// Native fetch boundary; individual tests supply controlled responses/abort behavior.
jest.mock('expo/fetch', () => ({
  fetch: (...args: Parameters<typeof fetch>) => global.fetch(...args),
}));
