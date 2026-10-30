import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import { Modal } from 'react-native';
import App from '../../App';
import { PhotoSelection as ControlledPhotoSelection } from '../photo-selection';
import { useState } from 'react';
import type { SelectedPhoto } from '../selected-photo';
import { checkSelection, MAX_PHOTO_BYTES, metadataHint } from '../selected-photo';
import type { UploadPhoto } from '../uploads';

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(), launchCameraAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn(), requestCameraPermissionsAsync: jest.fn(), getCameraPermissionsAsync: jest.fn(),
  UIImagePickerPreferredAssetRepresentationMode: { Current: 'current' },
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaProvider: View, SafeAreaView: View };
});
const picker = jest.mocked(ImagePicker.launchImageLibraryAsync);
const asset: ImagePicker.ImagePickerAsset = {
  uri: 'file:///synthetic/leaf.png', width: 10, height: 10,
  mimeType: 'image/png', fileName: 'leaf.png', fileSize: 100, type: 'image',
};
const picked = (value = asset): ImagePicker.ImagePickerResult => ({ canceled: false, assets: [value] });
function PhotoSelection() {
  const [photo, setPhoto] = useState<SelectedPhoto | null>(null);
  return <ControlledPhotoSelection photo={photo} onPhotoChange={setPhoto} />;
}
beforeEach(() => {
  jest.clearAllMocks(); picker.mockReset();
  jest.mocked(ImagePicker.launchCameraAsync).mockReset();
  jest.mocked(ImagePicker.getCameraPermissionsAsync).mockReset();
  jest.mocked(ImagePicker.requestCameraPermissionsAsync).mockReset();
});

test('HORTI mounts choose action, hints and no-upload explanation; upload starts disabled', () => {
  render(<App />);
  expect(screen.getByRole('button', { name: 'Choose leaf photo' })).toBeEnabled();
  expect(screen.getByText(/one JPEG or PNG, no larger than 5 MiB/)).toBeTruthy();
  expect(screen.getByText(/Selecting a photo does not upload anything/)).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Upload leaf photo' })).toBeDisabled();
  expect(picker).not.toHaveBeenCalled();
});
test('selects one image with least-privilege options and local preview, no permission calls or upload', async () => {
  const fetch = jest.spyOn(global, 'fetch');
  picker.mockResolvedValue(picked());
  render(<PhotoSelection />);
  fireEvent.press(screen.getByRole('button', { name: 'Choose leaf photo' }));
  await screen.findByLabelText('Selected leaf photo preview');
  expect(screen.getByLabelText('Selected leaf photo preview').props.source).toEqual({ uri: asset.uri });
  expect(picker).toHaveBeenCalledWith({
    mediaTypes: ['images'], allowsMultipleSelection: false, allowsEditing: false,
    exif: false, base64: false, quality: 1, preferredAssetRepresentationMode: 'current', legacy: false,
  });
  expect(ImagePicker.requestMediaLibraryPermissionsAsync).not.toHaveBeenCalled();
  expect(ImagePicker.requestCameraPermissionsAsync).not.toHaveBeenCalled();
  expect(ImagePicker.launchCameraAsync).not.toHaveBeenCalled();
  expect(fetch).not.toHaveBeenCalled(); fetch.mockRestore();
  expect(screen.getByRole('alert')).toHaveTextContent(/Upload requires a separate button press/);
  expect(screen.getByText(/reported format and size fit/)).toHaveTextContent(/does not verify/);
});
test('replace updates preview; cancel preserves it; removal clears state without deleting original', async () => {
  picker.mockResolvedValueOnce(picked()).mockResolvedValueOnce({ canceled: true, assets: null })
    .mockResolvedValueOnce(picked({ ...asset, uri: 'file:///synthetic/replacement.jpeg', fileName: 'new.jpeg', mimeType: 'image/jpeg' }));
  render(<PhotoSelection />);
  fireEvent.press(screen.getByRole('button', { name: 'Choose leaf photo' }));
  await screen.findByLabelText('Selected leaf photo preview');
  fireEvent.press(screen.getByRole('button', { name: 'Replace leaf photo' }));
  await screen.findByText(/Your previous photo is still selected/);
  expect(screen.getByLabelText('Selected leaf photo preview').props.source.uri).toBe(asset.uri);
  fireEvent.press(screen.getByRole('button', { name: 'Replace leaf photo' }));
  await waitFor(() => expect(screen.getByLabelText('Selected leaf photo preview').props.source.uri).toBe('file:///synthetic/replacement.jpeg'));
  fireEvent.press(screen.getByRole('button', { name: 'Remove leaf photo' }));
  expect(screen.queryByLabelText('Selected leaf photo preview')).toBeNull();
  expect(screen.getByRole('alert')).toHaveTextContent(/original photo has not been deleted/);
  expect(screen.getByRole('button', { name: 'Choose leaf photo' })).toBeEnabled();
});
test('cancellation without selection leaves screen empty', async () => {
  picker.mockResolvedValue({ canceled: true, assets: null });
  render(<PhotoSelection />);
  fireEvent.press(screen.getByRole('button', { name: 'Choose leaf photo' }));
  await screen.findByText('Selection cancelled. No photo is selected.');
  expect(screen.queryByLabelText('Selected leaf photo preview')).toBeNull();
});
test('picker errors are safe, preserve previous selection, and allow retry', async () => {
  picker.mockResolvedValueOnce(picked()).mockRejectedValueOnce(new Error('secret file:///private/owner.heic'))
    .mockResolvedValueOnce(picked());
  render(<PhotoSelection />);
  fireEvent.press(screen.getByRole('button', { name: 'Choose leaf photo' }));
  await screen.findByLabelText('Selected leaf photo preview');
  fireEvent.press(screen.getByRole('button', { name: 'Replace leaf photo' }));
  await screen.findByText(/Could not open or read the photo picker/);
  expect(screen.getByRole('alert')).not.toHaveTextContent(/secret|private|owner/);
  expect(screen.getByLabelText('Selected leaf photo preview').props.source.uri).toBe(asset.uri);
  fireEvent.press(screen.getByRole('button', { name: 'Replace leaf photo' }));
  await screen.findByText('Photo selected locally. Upload requires a separate button press.');
});
test('rapid taps open only one picker and disable controls until it settles', async () => {
  let finish!: (value: ImagePicker.ImagePickerResult) => void;
  picker.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  render(<PhotoSelection />);
  const button = screen.getByRole('button', { name: 'Choose leaf photo' });
  act(() => { fireEvent.press(button); fireEvent.press(button); });
  expect(picker).toHaveBeenCalledTimes(1);
  expect(button).toBeDisabled();
  await act(async () => finish(picked()));
  expect(screen.getByRole('button', { name: 'Replace leaf photo' })).toBeEnabled();
});
test('unsupported replacement and oversized input keep previous preview with clear feedback', async () => {
  picker.mockResolvedValueOnce(picked())
    .mockResolvedValueOnce(picked({ ...asset, fileName: 'photo.HEIC', mimeType: 'image/heic' }))
    .mockResolvedValueOnce(picked({ ...asset, fileSize: MAX_PHOTO_BYTES + 1 }));
  render(<PhotoSelection />);
  fireEvent.press(screen.getByRole('button', { name: 'Choose leaf photo' }));
  await screen.findByLabelText('Selected leaf photo preview');
  fireEvent.press(screen.getByRole('button', { name: 'Replace leaf photo' }));
  await screen.findByText(/HEIC\/HEIF photos are not supported/);
  expect(screen.getByLabelText('Selected leaf photo preview').props.source.uri).toBe(asset.uri);
  fireEvent.press(screen.getByRole('button', { name: 'Replace leaf photo' }));
  await screen.findByText(/exceeds 5 MiB/);
  expect(screen.getByLabelText('Selected leaf photo preview').props.source.uri).toBe(asset.uri);
});
test('unknown metadata previews with explicit uncertainty, never claims valid', async () => {
  picker.mockResolvedValue(picked({ uri: asset.uri, width: 0, height: 0 }));
  render(<PhotoSelection />);
  fireEvent.press(screen.getByRole('button', { name: 'Choose leaf photo' }));
  await screen.findByLabelText('Selected leaf photo preview');
  expect(screen.getByText(/Format or size metadata is unavailable/)).toHaveTextContent(/does not prove/);
});

test('validation error popup dismisses without clearing the previous photo and can reopen', async () => {
  picker.mockResolvedValueOnce(picked()).mockResolvedValue(picked({ ...asset, mimeType: 'image/heic' }));
  render(<PhotoSelection />);
  fireEvent.press(screen.getByRole('button', { name: 'Choose leaf photo' }));
  await screen.findByLabelText('Selected leaf photo preview');
  for (let attempt = 0; attempt < 2; attempt++) {
    fireEvent.press(screen.getByRole('button', { name: 'Replace leaf photo' }));
    await screen.findByRole('header', { name: 'Photo selection error' });
    expect(screen.getByRole('alert')).toHaveTextContent(/HEIC\/HEIF photos are not supported/);
    expect(screen.queryByText('Photo selected locally. Upload requires a separate button press.')).toBeNull();
    fireEvent.press(screen.getByRole('button', { name: 'Dismiss photo error' }));
    expect(screen.queryByRole('header', { name: 'Photo selection error' })).toBeNull();
    expect(screen.getByLabelText('Selected leaf photo preview').props.source.uri).toBe(asset.uri);
    expect(screen.getByRole('button', { name: 'Replace leaf photo' })).toBeEnabled();
  }
});

test('system back and accessibility escape dismiss the popup without changing selection', async () => {
  picker.mockResolvedValue(picked({ ...asset, fileSize: MAX_PHOTO_BYTES + 1 }));
  render(<PhotoSelection />);
  fireEvent.press(screen.getByRole('button', { name: 'Choose leaf photo' }));
  await screen.findByText(/exceeds 5 MiB/);
  fireEvent(screen.UNSAFE_getByType(Modal), 'requestClose');
  expect(screen.queryByRole('button', { name: 'Dismiss photo error' })).toBeNull();
  fireEvent.press(screen.getByRole('button', { name: 'Choose leaf photo' }));
  await screen.findByText(/exceeds 5 MiB/);
  fireEvent(screen.getByRole('header', { name: 'Photo selection error' }).parent, 'accessibilityEscape');
  expect(screen.queryByRole('button', { name: 'Dismiss photo error' })).toBeNull();
  expect(screen.queryByLabelText('Selected leaf photo preview')).toBeNull();
});
test('empty or multiple assets and preview failures yield safe feedback', async () => {
  picker.mockResolvedValueOnce({ canceled: false, assets: [] })
    .mockResolvedValueOnce({ canceled: false, assets: [asset, asset] }).mockResolvedValueOnce(picked());
  render(<PhotoSelection />);
  for (let i = 0; i < 2; i++) {
    fireEvent.press(screen.getByRole('button', { name: 'Choose leaf photo' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Choose leaf photo' })).toBeEnabled());
    expect(screen.getByRole('alert')).toHaveTextContent(/Could not select a single photo/);
  }
  fireEvent.press(screen.getByRole('button', { name: 'Choose leaf photo' }));
  const preview = await screen.findByLabelText('Selected leaf photo preview');
  fireEvent(preview, 'error', { nativeEvent: { error: 'file:///private/secret' } });
  expect(screen.getByRole('alert')).toHaveTextContent(/preview could not be displayed/);
  expect(screen.getByRole('alert')).not.toHaveTextContent(/private/);
});
test('pending picker result after unmount has no effect and remount starts empty', async () => {
  let finish!: (value: ImagePicker.ImagePickerResult) => void;
  picker.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const view = render(<PhotoSelection />);
  fireEvent.press(screen.getByRole('button', { name: 'Choose leaf photo' }));
  view.unmount();
  await act(async () => finish(picked()));
  render(<PhotoSelection />);
  expect(screen.queryByLabelText('Selected leaf photo preview')).toBeNull();
});

const camera = jest.mocked(ImagePicker.launchCameraAsync);
const cameraPermission = jest.mocked(ImagePicker.getCameraPermissionsAsync);
const requestCameraPermission = jest.mocked(ImagePicker.requestCameraPermissionsAsync);
const permission = (granted: boolean, canAskAgain = true) => ({
  granted, canAskAgain, expires: 'never', status: granted ? 'granted' : 'denied',
}) as ImagePicker.CameraPermissionResponse;

test('camera capture is explicit, requests no library access, previews locally and never uploads', async () => {
  cameraPermission.mockResolvedValue(permission(true));
  camera.mockResolvedValue(picked());
  const network = jest.spyOn(global, 'fetch');
  render(<PhotoSelection />);
  expect(cameraPermission).not.toHaveBeenCalled();
  expect(camera).not.toHaveBeenCalled();
  fireEvent.press(screen.getByRole('button', { name: 'Take leaf photo' }));
  await screen.findByLabelText('Selected leaf photo preview');
  expect(camera).toHaveBeenCalledWith({ mediaTypes: ['images'], allowsEditing: false, exif: false, base64: false, quality: 1 });
  expect(requestCameraPermission).not.toHaveBeenCalled();
  expect(ImagePicker.requestMediaLibraryPermissionsAsync).not.toHaveBeenCalled();
  expect(picker).not.toHaveBeenCalled();
  expect(network).not.toHaveBeenCalled();
  network.mockRestore();
});

test.each([true, false])('camera denial (canAskAgain=%s) preserves the photo and gallery remains available', async canAskAgain => {
  picker.mockResolvedValue(picked());
  cameraPermission.mockResolvedValue(permission(false, canAskAgain));
  requestCameraPermission.mockResolvedValue(permission(false));
  render(<PhotoSelection />);
  fireEvent.press(screen.getByRole('button', { name: 'Choose leaf photo' }));
  await screen.findByLabelText('Selected leaf photo preview');
  fireEvent.press(screen.getByRole('button', { name: 'Take leaf photo' }));
  await screen.findByText(canAskAgain ? /Camera access was not granted/ : /Camera access is disabled/);
  expect(requestCameraPermission).toHaveBeenCalledTimes(canAskAgain ? 1 : 0);
  expect(camera).not.toHaveBeenCalled();
  fireEvent.press(screen.getByRole('button', { name: 'Dismiss photo error' }));
  expect(screen.getByLabelText('Selected leaf photo preview').props.source.uri).toBe(asset.uri);
  expect(screen.getByRole('button', { name: 'Replace leaf photo' })).toBeEnabled();
});

test('granted permission opens camera; cancelling preserves the previous selection', async () => {
  picker.mockResolvedValue(picked());
  cameraPermission.mockResolvedValue(permission(false));
  requestCameraPermission.mockResolvedValue(permission(true));
  camera.mockResolvedValue({ canceled: true, assets: null });
  render(<PhotoSelection />);
  fireEvent.press(screen.getByRole('button', { name: 'Choose leaf photo' }));
  await screen.findByLabelText('Selected leaf photo preview');
  fireEvent.press(screen.getByRole('button', { name: 'Take leaf photo' }));
  await screen.findByText(/Your previous photo is still selected/);
  expect(requestCameraPermission).toHaveBeenCalledTimes(1);
  expect(camera).toHaveBeenCalledTimes(1);
  expect(screen.getByLabelText('Selected leaf photo preview').props.source.uri).toBe(asset.uri);
});

test('one guard covers camera and library, including a pending permission prompt', async () => {
  let finish!: (value: ImagePicker.CameraPermissionResponse) => void;
  cameraPermission.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  camera.mockResolvedValue(picked());
  render(<PhotoSelection />);
  const take = screen.getByRole('button', { name: 'Take leaf photo' });
  const choose = screen.getByRole('button', { name: 'Choose leaf photo' });
  act(() => { fireEvent.press(take); fireEvent.press(choose); fireEvent.press(take); });
  expect(cameraPermission).toHaveBeenCalledTimes(1);
  expect(picker).not.toHaveBeenCalled();
  expect(take).toBeDisabled(); expect(choose).toBeDisabled();
  await act(async () => finish(permission(true)));
  expect(camera).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: 'Take leaf photo' })).toBeEnabled();
});

test.each(['native failure', 'HEIC', 'oversized'])('camera %s uses safe error popup without replacing the photo', async mode => {
  picker.mockResolvedValue(picked()); cameraPermission.mockResolvedValue(permission(true));
  if (mode === 'native failure') camera.mockRejectedValue(new Error('file:///private/photo token=secret'));
  else camera.mockResolvedValue(picked(mode === 'HEIC' ? { ...asset, mimeType: 'image/heic' } : { ...asset, fileSize: MAX_PHOTO_BYTES + 1 }));
  render(<PhotoSelection />);
  fireEvent.press(screen.getByRole('button', { name: 'Choose leaf photo' }));
  await screen.findByLabelText('Selected leaf photo preview');
  fireEvent.press(screen.getByRole('button', { name: 'Take leaf photo' }));
  await screen.findByRole('button', { name: 'Dismiss photo error' });
  expect(screen.getByRole('alert')).not.toHaveTextContent(/private|secret/);
  fireEvent.press(screen.getByRole('button', { name: 'Dismiss photo error' }));
  expect(screen.getByLabelText('Selected leaf photo preview').props.source.uri).toBe(asset.uri);
});

test('unmount during camera permission check prevents a late camera launch', async () => {
  let finish!: (value: ImagePicker.CameraPermissionResponse) => void;
  cameraPermission.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const view = render(<PhotoSelection />);
  fireEvent.press(screen.getByRole('button', { name: 'Take leaf photo' }));
  view.unmount();
  await act(async () => finish(permission(true)));
  expect(camera).not.toHaveBeenCalled();
});

test.each(['image/jpeg', 'image/png'])('exact size is allowed as a hint for %s, over-limit rejected', mimeType => {
  const result = checkSelection({ ...asset, mimeType, fileSize: MAX_PHOTO_BYTES });
  expect(result.error).toBeUndefined();
  if (result.photo) {
    const compatible: UploadPhoto = result.photo;
    expect(compatible.uri).toBe(asset.uri);
    expect(metadataHint(result.photo)).toContain('server validation');
    expect(result.photo).not.toHaveProperty('fileName');
  }
  expect(checkSelection({ ...asset, mimeType, fileSize: MAX_PHOTO_BYTES + 1 }).error).toContain('exceeds 5 MiB');
});
test.each([
  { mimeType: 'image/heic' }, { mimeType: 'image/heif' }, { fileName: 'leaf.HEIC' },
  { mimeType: 'image/gif' }, { fileName: 'leaf.webp' }, { type: 'video' as const },
  { mimeType: 'image/jpeg', fileName: 'leaf.avif' },
])('rejects known unsupported metadata %p without renaming/relabeling', override => {
  expect(checkSelection({ ...asset, ...override }).error).toContain('not supported');
});
test.each([undefined, NaN, -1, Infinity])('missing/invalid size %p stays unknown', fileSize => {
  const result = checkSelection({ ...asset, fileSize });
  expect(result.error).toBeUndefined();
  expect(result.photo?.fileSize).toBeUndefined();
  if (result.photo) expect(metadataHint(result.photo)).toContain('metadata is unavailable');
});

test.each([{ fileSize: 0 }, { uri: '' }, { uri: 'https://example.invalid/photo.png' }])('rejects unusable/remote input %p without fetching', override => {
  expect(checkSelection({ ...asset, ...override }).error).toContain('could not be selected');
});
