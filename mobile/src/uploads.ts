import { File } from 'expo-file-system';
import { fetch as expoFetch } from 'expo/fetch';

/** Ephemeral native URI; never persisted or logged by this module. */
export type UploadPhoto = { uri: string; mimeType?: string | null };
export type UploadFeedback = {
  message: string;
  requestId?: string;
  kind?: 'unavailable' | 'invalid-image' | 'network' | 'timeout' | 'cancelled' | 'unexpected' | 'service';
};

export function predictionUrl(base: string | undefined): string | null {
  try {
    if (!base?.trim() || /[\\\s]/.test(base.trim())) return null;
    const url = new URL(base.trim());
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) return null;
    return `${url.toString().replace(/\/$/, '')}/api/v1/predictions`;
  } catch { return null; }
}

/** Development diagnostic: no image or user data is sent. */
export async function checkServiceConnection(
  base: string | undefined, signal: AbortSignal, timeoutMs = 5000,
): Promise<string> {
  const endpoint = predictionUrl(base);
  if (!endpoint) return 'The service address is invalid. Set EXPO_PUBLIC_API_URL and reload the app.';
  if (signal.aborted) return 'Connection check cancelled.';
  const controller = new AbortController();
  let timedOut = false;
  let cancel: () => void = () => {};
  const cancelled = new Promise<never>((_, reject) => {
    cancel = () => { controller.abort(); reject(new Error('cancelled')); };
    signal.addEventListener('abort', cancel, { once: true });
    if (signal.aborted) cancel();
  });
  const timer = setTimeout(() => { timedOut = true; cancel(); }, timeoutMs);
  try {
    return await Promise.race([
      fetch(endpoint.replace(/\/api\/v1\/predictions$/, '/health'), {
        method: 'GET', credentials: 'omit', signal: controller.signal,
      }).then(async response => {
        if (response.status !== 200) return 'The service responded, but its health check did not pass.';
        const body = await response.text();
        if (body.length > 1024) return 'The address responded, but it did not return the HORTI health response.';
        let value: unknown;
        try { value = JSON.parse(body); }
        catch { return 'The address responded, but it did not return the HORTI health response.'; }
        return typeof value === 'object' && value !== null && 'status' in value && value.status === 'ok'
          ? 'HORTI is reachable from this app. If upload still fails, check the selected photo and the API upload log.'
          : 'The address responded, but it did not return the HORTI health response.';
      }),
      cancelled,
    ]);
  } catch {
    return timedOut ? 'The connection check timed out. Check the API address and network access.'
      : signal.aborted ? 'Connection check cancelled.'
      : 'This app could not reach HORTI. Check the configured address and Expo Go Local Network permission.';
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', cancel);
  }
}

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export async function readFeedback(response: Response): Promise<UploadFeedback> {
  const malformed: UploadFeedback = { kind: 'unexpected', message: 'The service returned an unexpected response. Please try again later.' };
  if (response.ok) return malformed; // Success/results are deliberately not implemented.
  let value: unknown;
  try {
    const text = await response.text();
    if (text.length > 16384) return malformed;
    value = JSON.parse(text);
  } catch { return malformed; }
  if (!record(value) || !record(value.error)) return malformed;
  const error = value.error;
  if (typeof error.code !== 'string' || typeof error.message !== 'string' ||
      typeof error.request_id !== 'string' || !uuid.test(error.request_id) || !Array.isArray(error.details)) return malformed;
  const headerId = response.headers.get('X-Request-ID');
  if (headerId && headerId.toLowerCase() !== error.request_id.toLowerCase()) return malformed;
  let message = 'The service could not process this photo. Please try again later.';
  let kind: UploadFeedback['kind'] = 'service';
  if (response.status === 503 && error.code === 'inference_unavailable') {
    kind = 'unavailable';
    message = 'The model is unavailable. No prediction was made. Please try again later.';
  } else if (response.status === 413) {
    kind = 'invalid-image';
    message = 'The photo is too large. Choose a JPEG or PNG no larger than 5 MiB.';
  } else if (response.status === 415) {
    kind = 'invalid-image';
    message = 'This photo format is unsupported. Choose a JPEG or PNG.';
  } else if (response.status === 400 || response.status === 422) {
    kind = 'invalid-image';
    message = 'The photo was rejected. Choose another valid JPEG or PNG.';
  } else if (response.status === 429) {
    message = 'Too many requests. Please wait before trying again.';
  }
  // Never display server messages/details: they may contain sensitive or hostile text.
  return { kind, message, requestId: error.request_id };
}

export async function uploadPhoto(
  photo: UploadPhoto,
  url: string,
  signal: AbortSignal,
  timeoutMs = 30000,
): Promise<UploadFeedback> {
  if (signal.aborted) return { kind: 'cancelled', message: 'Upload cancelled.' };
  const controller = new AbortController();
  let timedOut = false;
  let abortListener: () => void = () => {};
  const cancelled = new Promise<never>((_, reject) => {
    abortListener = () => { controller.abort(); reject(new Error('cancelled')); };
    signal.addEventListener('abort', abortListener, { once: true });
    if (signal.aborted) abortListener();
  });
  const timer = setTimeout(() => { timedOut = true; abortListener(); }, timeoutMs);
  try {
    const form = new FormData();
    // SDK 58's Expo fetch requires a File/Blob, not RN's older URI descriptor.
    // Constructing a File references the existing picker file; it does not copy it.
    form.append('image', new File(photo.uri));
    return await Promise.race([
      expoFetch(url, { method: 'POST', body: form, signal: controller.signal, credentials: 'omit' }).then(readFeedback),
      cancelled,
    ]);
  } catch {
    return { kind: timedOut ? 'timeout' : signal.aborted ? 'cancelled' : 'network',
      message: timedOut ? 'The upload timed out. Check your connection and retry.' :
      signal.aborted ? 'Upload cancelled.' : 'Could not reach the service. Check your connection and retry.' };
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', abortListener);
  }
}
