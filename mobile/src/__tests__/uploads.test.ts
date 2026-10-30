import { checkServiceConnection, predictionUrl, readFeedback, uploadPhoto } from '../uploads';
import { File } from 'expo-file-system';

const id = '0f48b750-a9d4-4c3c-8026-b32698e314f0';
const photo = { uri: 'file:///synthetic/photo.png', mimeType: 'image/png' };
function response(status = 503, code = 'inference_unavailable', overrides = {}) {
  return { ok: status < 400, status, headers: { get: () => id }, text: async () => JSON.stringify({ error: {
    code, message: 'secret credentials /private/image.png', request_id: id, details: [], ...overrides,
  } }) } as unknown as Response;
}
afterEach(() => { jest.restoreAllMocks(); jest.useRealTimers(); });

test('installed SDK 58 multipart serializer rejects legacy descriptors and accepts the actual upload File without file operations', async () => {
  const { installFormDataPatch } = jest.requireActual('../../node_modules/expo/src/winter/FormData');
  const { convertFormDataAsync } = jest.requireActual('../../node_modules/expo/src/winter/fetch/convertFormData');
  const OriginalFormData = global.FormData;
  const RNFormData = jest.requireActual('react-native/Libraries/Network/FormData').default;
  class SDKFormData extends RNFormData {}
  global.FormData = installFormDataPatch(SDKFormData);
  try {
    const legacy = new FormData();
    legacy.append('image', { uri: photo.uri, name: 'leaf-photo', type: 'image/png' } as unknown as Blob);
    await expect(convertFormDataAsync(legacy)).rejects.toThrow('Unsupported FormDataPart implementation');
    let wire = '';
    let submitted: File | undefined;
    jest.spyOn(global, 'fetch').mockImplementation(async (_url, options) => {
      const form = options?.body as FormData;
      submitted = form.get('image') as unknown as File;
      const encoded = await convertFormDataAsync(form, 'horti-synthetic-boundary');
      wire = new TextDecoder().decode(encoded.body);
      return response();
    });
    const feedback = await uploadPhoto(photo, 'http://test', new AbortController().signal);
    expect(feedback.message).toContain('model is unavailable');
    expect(feedback.requestId).toBe(id);
    expect(wire.match(/name="image"/g)).toHaveLength(1);
    expect(wire).toContain('filename="synthetic.png"');
    expect(wire).not.toContain(photo.uri);
    expect(submitted?.bytes).toHaveBeenCalledTimes(1);
    for (const operation of [submitted?.create, submitted?.copy, submitted?.move, submitted?.delete]) {
      expect(operation).not.toHaveBeenCalled();
    }
  } finally { global.FormData = OriginalFormData; }
});

test('public URL configuration rejects missing, credentials, query strings and non-HTTP URLs', () => {
  for (const value of [undefined, '', 'garbage', 'file:///private', 'https://user:password@host', 'https://host/?token=x', 'https://host/#x', 'http\\://10.0.0.157:8000', 'http://bad host']) {
    expect(predictionUrl(value)).toBeNull();
  }
  expect(predictionUrl('http://192.168.1.2:8000/')).toBe('http://192.168.1.2:8000/api/v1/predictions');
});

test('native health diagnostic sends no photo, credentials or automatic upload', async () => {
  const network = jest.spyOn(global, 'fetch').mockResolvedValue({ status: 200, text: async () => '{"status":"ok"}' } as Response);
  expect(await checkServiceConnection('http://test:8000', new AbortController().signal)).toContain('reachable from this app');
  expect(network).toHaveBeenCalledWith('http://test:8000/health', expect.objectContaining({ method: 'GET', credentials: 'omit' }));
  expect(network.mock.calls[0]?.[1]?.body).toBeUndefined();
});

test('health diagnostics reject bad config and sanitize native errors', async () => {
  const network = jest.spyOn(global, 'fetch').mockRejectedValue(new Error('file:///private token=secret'));
  expect(await checkServiceConnection('http\\://bad', new AbortController().signal)).toContain('address is invalid');
  expect(network).not.toHaveBeenCalled();
  const message = await checkServiceConnection('http://test', new AbortController().signal);
  expect(message).toContain('Local Network permission');
  expect(message).not.toMatch(/private|secret/);
});

test('health diagnostic detects a wrong service and times out even if fetch ignores abort', async () => {
  const network = jest.spyOn(global, 'fetch').mockResolvedValue({ status: 404 } as Response);
  expect(await checkServiceConnection('http://test', new AbortController().signal)).toContain('did not pass');
  jest.useFakeTimers();
  network.mockImplementation(() => new Promise(() => {}));
  const pending = checkServiceConnection('http://test', new AbortController().signal, 30);
  await jest.advanceTimersByTimeAsync(30);
  expect(await pending).toContain('timed out');
  expect(network.mock.calls.at(-1)?.[1]?.signal?.aborted).toBe(true);
});
test('one native multipart image, generated boundary, no client request ID or credentials', async () => {
  const append = jest.spyOn(FormData.prototype, 'append');
  const fetch = jest.spyOn(global, 'fetch').mockResolvedValue(response());
  const result = await uploadPhoto(photo, 'http://test/api/v1/predictions', new AbortController().signal);
  expect(append).toHaveBeenCalledTimes(1);
  expect(append).toHaveBeenCalledWith('image', expect.any(File));
  expect((append.mock.calls[0]?.[1] as unknown as File).uri).toBe(photo.uri);
  expect(fetch).toHaveBeenCalledWith('http://test/api/v1/predictions', expect.objectContaining({ method: 'POST', credentials: 'omit', body: expect.any(FormData) }));
  expect(fetch.mock.calls[0]?.[1]?.headers).toBeUndefined();
  expect(result).toEqual({ kind: 'unavailable', message: expect.stringContaining('model is unavailable'), requestId: id });
  expect(JSON.stringify(result)).not.toMatch(/secret|private|credentials/);
});
test.each([400, 413, 415, 422, 429, 500])('safe accessible feedback for rejection %i', async status => {
  const result = await readFeedback(response(status));
  expect(result.requestId).toBe(id);
  expect(result.message).not.toMatch(/secret|private|credentials/);
});
test.each([
  { request_id: 'not-a-uuid' }, { message: null }, { details: null }, { code: 123 },
])('rejects malformed envelope %p', async overrides => {
  expect(await readFeedback(response(503, 'inference_unavailable', overrides))).toEqual({ kind: 'unexpected', message: expect.stringContaining('unexpected response') });
});
test('invalid JSON, oversized body, success and mismatched IDs never become predictions', async () => {
  for (const text of ['not JSON', 'x'.repeat(16385)]) {
    const res = response(); res.text = async () => text;
    expect((await readFeedback(res)).requestId).toBeUndefined();
  }
  expect((await readFeedback(response(200))).message).toContain('unexpected response');
  const res = response(); res.headers.get = () => '6b701065-5fc3-4b90-8041-a89894f0236a';
  expect((await readFeedback(res)).requestId).toBeUndefined();
});
test('network exceptions never disclose native error text or URIs', async () => {
  jest.spyOn(global, 'fetch').mockRejectedValue(new Error('file:///private/image.png token=secret'));
  expect(await uploadPhoto(photo, 'http://test', new AbortController().signal)).toEqual({ kind: 'network', message: 'Could not reach the service. Check your connection and retry.' });
});
test('timeout settles even if transport ignores abort', async () => {
  jest.useFakeTimers();
  const fetch = jest.spyOn(global, 'fetch').mockImplementation(() => new Promise(() => {}));
  const pending = uploadPhoto(photo, 'http://test', new AbortController().signal, 30);
  await jest.advanceTimersByTimeAsync(30);
  expect((await pending).message).toContain('timed out');
  expect(fetch.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
});
test('cancellation settles, aborts transport, and pre-cancelled requests send nothing', async () => {
  const fetch = jest.spyOn(global, 'fetch').mockImplementation(() => new Promise(() => {}));
  const controller = new AbortController();
  const pending = uploadPhoto(photo, 'http://test', controller.signal);
  controller.abort();
  expect((await pending).message).toBe('Upload cancelled.');
  expect(fetch.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
  await uploadPhoto(photo, 'http://test', controller.signal);
  expect(fetch).toHaveBeenCalledTimes(1);
});
