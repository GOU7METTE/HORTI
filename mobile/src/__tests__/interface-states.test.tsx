import { fireEvent, render, screen } from '@testing-library/react-native';
import { UploadStatus } from '../upload-status';
import { UncertainPrediction } from '../uncertain-prediction';
import type { UploadFeedback } from '../uploads';

test('loading has a busy progress indicator and replaces old failure feedback', () => {
  const view = render(<UploadStatus loading={false} feedback={{ kind: 'network', message: 'Previous failure' }} />);
  expect(screen.getByRole('header', { name: 'Upload failed' })).toBeTruthy();
  view.rerender(<UploadStatus loading feedback={{ kind: 'network', message: 'Previous failure' }} />);
  expect(screen.getByRole('progressbar', { name: 'Uploading leaf photo' }).props.accessibilityState).toEqual({ busy: true });
  expect(screen.queryByText('Previous failure')).toBeNull();
});

test.each([
  ['unavailable', 'Model unavailable'], ['invalid-image', 'Choose another image'],
  ['network', 'Upload failed'], ['timeout', 'Upload timed out'],
  ['cancelled', 'Upload cancelled'], ['unexpected', 'Unexpected service response'], ['service', 'Request failed'],
] as const)('%s has a distinct accessible heading, safe message and readable request ID', (kind, title) => {
  const feedback: UploadFeedback = { kind, message: 'Synthetic safe feedback', requestId: '43089f0b-3aad-4bab-9962-0fe15b446186' };
  render(<UploadStatus loading={false} feedback={feedback} />);
  expect(screen.getByRole('header', { name: title })).toBeTruthy();
  expect(screen.getByRole('alert')).toHaveTextContent(/Synthetic safe feedback/);
  expect(screen.getByText(/Request ID:/).props.selectable).toBe(true);
  if (kind === 'invalid-image') expect(screen.getByText(/Replace the photo with a JPEG or PNG/)).toBeTruthy();
  expect(screen.queryByText('Result is uncertain')).toBeNull();
});

test('idle renders no stale status or progress', () => {
  render(<UploadStatus loading={false} feedback={null} />);
  expect(screen.queryByRole('alert')).toBeNull();
  expect(screen.queryByRole('progressbar')).toBeNull();
});

test('uncertainty fixture explains limitations and offers another photo without invented scores or diagnosis', () => {
  const choose = jest.fn();
  const view = render(<UncertainPrediction uncertain onChooseAnother={choose} />);
  expect(screen.getByRole('header', { name: 'Result is uncertain' })).toBeTruthy();
  expect(screen.getByRole('alert')).toHaveTextContent(/not treat it as a confirmed diagnosis/);
  expect(screen.getByText(/scores may be uncalibrated/)).toBeTruthy();
  expect(screen.queryByText(/%/)).toBeNull();
  fireEvent.press(screen.getByRole('button', { name: 'Choose another photo' }));
  expect(choose).toHaveBeenCalledTimes(1);
  view.rerender(<UncertainPrediction uncertain={false} onChooseAnother={choose} />);
  expect(screen.queryByText('Result is uncertain')).toBeNull();
});
