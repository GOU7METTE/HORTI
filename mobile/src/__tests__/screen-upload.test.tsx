import { act, fireEvent, render, screen } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import App from '../../App';
import { File } from 'expo-file-system';

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(), getCameraPermissionsAsync: jest.fn(), requestCameraPermissionsAsync: jest.fn(),
  UIImagePickerPreferredAssetRepresentationMode: { Current: 'current' },
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaProvider: View, SafeAreaView: View };
});

const picker = jest.mocked(ImagePicker.launchImageLibraryAsync);
const asset: ImagePicker.ImagePickerAsset = {
  uri: 'file:///synthetic/leaf.png', mimeType: 'image/png', fileName: 'leaf.png',
  fileSize: 100, width: 10, height: 10, type: 'image',
};
const id = '0f48b750-a9d4-4c3c-8026-b32698e314f0';
const lateId = '6b701065-5fc3-4b90-8041-a89894f0236a';
const originalUrl = process.env.EXPO_PUBLIC_API_URL;
let network: jest.SpiedFunction<typeof fetch>;

function response(requestId = id, status = 503, code = 'inference_unavailable'): Response {
  return { ok: status < 400, status, headers: { get: () => requestId }, text: async () => JSON.stringify({
    error: { code, message: 'unsafe file:///private/secret token=credential', details: [], request_id: requestId },
  }) } as unknown as Response;
}
function deferred() {
  let resolve!: (result: Response) => void;
  const promise = new Promise<Response>(done => { resolve = done; });
  return { promise, resolve };
}
async function choose(next = asset, label = 'Choose leaf photo') {
  picker.mockResolvedValueOnce({ canceled: false, assets: [next] });
  fireEvent.press(screen.getByRole('button', { name: label }));
  await screen.findByText('Photo selected locally. Upload requires a separate button press.');
}
function submit() { fireEvent.press(screen.getByRole('button', { name: 'Upload leaf photo' })); }

beforeEach(() => {
  process.env.EXPO_PUBLIC_API_URL = 'https://api.example.invalid';
  picker.mockReset();
  network = jest.spyOn(global, 'fetch').mockReset().mockResolvedValue(response());
});
afterEach(() => {
  jest.restoreAllMocks(); jest.useRealTimers();
  if (originalUrl === undefined) delete process.env.EXPO_PUBLIC_API_URL;
  else process.env.EXPO_PUBLIC_API_URL = originalUrl;
});

test('development connection check is explicit and shows native health separately from upload', async () => {
  network.mockResolvedValueOnce({ status: 200, text: async () => '{"status":"ok"}' } as Response);
  render(<App />);
  expect(network).not.toHaveBeenCalled();
  expect(screen.getByText('Service: https://api.example.invalid')).toBeTruthy();
  fireEvent.press(screen.getByRole('button', { name: 'Check service connection' }));
  await screen.findByText(/HORTI is reachable from this app/);
  expect(network).toHaveBeenCalledTimes(1);
  expect(network.mock.calls[0]?.[0]).toBe('https://api.example.invalid/health');
  expect(screen.getByRole('button', { name: 'Upload leaf photo' })).toBeDisabled();
});

test('camera capture shares selection revision, aborts old upload and requires explicit resubmission', async () => {
  const old = deferred(); network.mockReturnValueOnce(old.promise);
  jest.mocked(ImagePicker.getCameraPermissionsAsync).mockResolvedValue({ granted: true } as ImagePicker.CameraPermissionResponse);
  jest.mocked(ImagePicker.launchCameraAsync).mockResolvedValue({ canceled: false, assets: [{ ...asset }] });
  render(<App />); await choose(); submit();
  fireEvent.press(screen.getByRole('button', { name: 'Take leaf photo' }));
  await screen.findByText('Photo selected locally. Upload requires a separate button press.');
  expect(network.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
  expect(network).toHaveBeenCalledTimes(1);
  await act(async () => old.resolve(response(lateId)));
  expect(screen.queryByText(`Request ID: ${lateId}`)).toBeNull();
  submit(); await screen.findByText(`Request ID: ${id}`);
  expect(network).toHaveBeenCalledTimes(2);
});

test('selection sends nothing; explicit upload uses exactly one image field and shows safe 503/UUID', async () => {
  const append = jest.spyOn(FormData.prototype, 'append');
  render(<App />);
  expect(screen.getByRole('button', { name: 'Upload leaf photo' })).toBeDisabled();
  await choose();
  expect(network).not.toHaveBeenCalled();
  expect(screen.getByLabelText('Selected leaf photo preview').props.source.uri).toBe(asset.uri);
  submit();
  await screen.findByText(/The model is unavailable/);
  expect(network).toHaveBeenCalledTimes(1);
  expect(network).toHaveBeenCalledWith('https://api.example.invalid/api/v1/predictions', expect.objectContaining({
    method: 'POST', body: expect.any(FormData), credentials: 'omit',
  }));
  expect(network.mock.calls[0]?.[1]?.headers).toBeUndefined();
  expect(append).toHaveBeenCalledTimes(1);
  expect(append).toHaveBeenCalledWith('image', expect.any(File));
  expect((append.mock.calls[0]?.[1] as unknown as File).uri).toBe(asset.uri);
  expect(screen.getByText(`Request ID: ${id}`)).toBeTruthy();
  expect(screen.queryByText(/unsafe|private|credential/)).toBeNull();
  expect(screen.getByRole('button', { name: 'Retry upload' })).toBeEnabled();
  expect(screen.getByRole('header', { name: 'Model unavailable' })).toBeTruthy();
  expect(screen.queryByText('Result is uncertain')).toBeNull();
});

test.each([undefined, '', 'not an address', 'https://user:secret@api.example.invalid'])('missing/invalid public address %p disables upload even after selection', async value => {
  if (value === undefined) delete process.env.EXPO_PUBLIC_API_URL;
  else process.env.EXPO_PUBLIC_API_URL = value;
  render(<App />);
  await choose();
  expect(screen.getByRole('button', { name: 'Upload leaf photo' })).toBeDisabled();
  expect(screen.getByText(/service address is not configured correctly/)).toBeTruthy();
  expect(screen.queryByText(/EXPO_PUBLIC|user:secret/)).toBeNull();
  submit();
  expect(network).not.toHaveBeenCalled();
});

test('duplicate taps, cancel/retry and ignored late response through the real upload client', async () => {
  const first = deferred();
  network.mockReturnValueOnce(first.promise);
  render(<App />); await choose();
  const button = screen.getByRole('button', { name: 'Upload leaf photo' });
  act(() => { fireEvent.press(button); fireEvent.press(button); });
  expect(network).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: 'Uploading photo…' })).toBeDisabled();
  fireEvent.press(screen.getByRole('button', { name: 'Cancel upload' }));
  expect(network.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
  fireEvent.press(screen.getByRole('button', { name: 'Retry upload' }));
  await screen.findByText(`Request ID: ${id}`);
  await act(async () => first.resolve(response(lateId)));
  expect(screen.queryByText(`Request ID: ${lateId}`)).toBeNull();
  expect(screen.getByText(`Request ID: ${id}`)).toBeTruthy();
  expect(network).toHaveBeenCalledTimes(2);
});

test.each(['replace', 'same URI', 'remove'])('%s during upload aborts and ignores the old response; new selection never auto-submits', async mode => {
  const old = deferred(); network.mockReturnValueOnce(old.promise);
  render(<App />); await choose(); submit();
  if (mode === 'remove') fireEvent.press(screen.getByRole('button', { name: 'Remove leaf photo' }));
  else await choose(mode === 'same URI' ? { ...asset } : { ...asset, uri: 'file:///synthetic/new.png' }, 'Replace leaf photo');
  expect(network.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
  expect(screen.queryByRole('button', { name: 'Cancel upload' })).toBeNull();
  expect(network).toHaveBeenCalledTimes(1);
  await act(async () => old.resolve(response(lateId)));
  expect(screen.queryByText(`Request ID: ${lateId}`)).toBeNull();
  expect(screen.queryByText(/The model is unavailable/)).toBeNull();
  if (mode === 'remove') {
    expect(screen.queryByLabelText('Selected leaf photo preview')).toBeNull();
    expect(screen.getByRole('button', { name: 'Upload leaf photo' })).toBeDisabled();
  } else {
    submit(); await screen.findByText(`Request ID: ${id}`);
    expect(network).toHaveBeenCalledTimes(2);
  }
});

test.each(['cancel', 'reject'])('picker %s preserves the selection and pending request, including red popup dismissal', async mode => {
  const pending = deferred(); network.mockReturnValueOnce(pending.promise);
  render(<App />); await choose(); submit();
  picker.mockResolvedValueOnce(mode === 'cancel' ? { canceled: true, assets: null } : {
    canceled: false, assets: [{ ...asset, mimeType: 'image/heic', fileName: 'synthetic.heic' }],
  });
  fireEvent.press(screen.getByRole('button', { name: 'Replace leaf photo' }));
  if (mode === 'cancel') await screen.findByText(/Your previous photo is still selected/);
  else {
    await screen.findByRole('header', { name: 'Photo selection error' });
    expect(screen.getByRole('header', { name: 'Photo selection error' })).toHaveStyle({ color: '#991b1b' });
    expect(screen.getByText(/HEIC\/HEIF photos are not supported/)).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Dismiss photo error' }));
    expect(screen.queryByRole('header', { name: 'Photo selection error' })).toBeNull();
  }
  expect(network.mock.calls[0]?.[1]?.signal?.aborted).toBe(false);
  expect(screen.getByLabelText('Selected leaf photo preview').props.source.uri).toBe(asset.uri);
  expect(network).toHaveBeenCalledTimes(1);
  await act(async () => pending.resolve(response()));
  await screen.findByText(`Request ID: ${id}`);
});

test('same-URI selection clears prior feedback and requires a fresh upload press', async () => {
  render(<App />); await choose(); submit(); await screen.findByText(`Request ID: ${id}`);
  await choose({ ...asset }, 'Replace leaf photo');
  expect(screen.queryByText(`Request ID: ${id}`)).toBeNull();
  expect(screen.getByRole('button', { name: 'Upload leaf photo' })).toBeEnabled();
  expect(network).toHaveBeenCalledTimes(1);
});

test('screen reports timeout, then explicit retry can recover', async () => {
  jest.useFakeTimers(); network.mockImplementationOnce(() => new Promise(() => {}));
  render(<App />); await choose(); submit();
  await act(async () => { await jest.advanceTimersByTimeAsync(30000); });
  expect(screen.getByText(/upload timed out/)).toBeTruthy();
  expect(network.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
  fireEvent.press(screen.getByRole('button', { name: 'Retry upload' }));
  await screen.findByText(`Request ID: ${id}`);
});

test('network failure is safe and malformed or unexpected success responses never show predictions', async () => {
  network.mockRejectedValueOnce(new Error('file:///private/secret'))
    .mockResolvedValueOnce({ ...response(), text: async () => 'not json' } as Response)
    .mockResolvedValueOnce(response(id, 200));
  render(<App />); await choose(); submit();
  await screen.findByText(/Could not reach the service/);
  for (let i = 0; i < 2; i++) {
    fireEvent.press(screen.getByRole('button', { name: 'Retry upload' }));
    await screen.findByText(/unexpected response/);
    expect(network).toHaveBeenCalledTimes(i + 2);
  }
  expect(screen.queryByText(/private|secret/)).toBeNull();
  expect(screen.queryByText(/Request ID:/)).toBeNull();
  expect(screen.queryByText('Result is uncertain')).toBeNull();
});

test.each([400, 413, 415, 422])('server image rejection %i displays recovery guidance without replacing the preview', async status => {
  network.mockResolvedValue(response(id, status, 'invalid_image'));
  render(<App />); await choose(); submit();
  await screen.findByRole('header', { name: 'Choose another image' });
  expect(screen.getByText(/Replace the photo with a JPEG or PNG/)).toBeTruthy();
  expect(screen.getByLabelText('Selected leaf photo preview').props.source.uri).toBe(asset.uri);
  expect(screen.getByRole('button', { name: 'Replace leaf photo' })).toBeEnabled();
  expect(screen.getByRole('button', { name: 'Retry upload' })).toBeEnabled();
  expect(screen.queryByText(/unsafe|private|credential/)).toBeNull();
});
