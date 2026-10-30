import { useLayoutEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { checkServiceConnection, predictionUrl, uploadPhoto, type UploadFeedback, type UploadPhoto } from './uploads';
import { UploadStatus } from './upload-status';

export function UploadPanel({ photo, apiBaseUrl = process.env.EXPO_PUBLIC_API_URL }: {
  photo: UploadPhoto | null; apiBaseUrl?: string;
}) {
  return <View style={styles.panel}>
    <UploadAttempt key={`${photo?.uri ?? ''}|${apiBaseUrl ?? ''}`} photo={photo} apiBaseUrl={apiBaseUrl} />
    {__DEV__ && <ServiceConnection key={apiBaseUrl ?? ''} apiBaseUrl={apiBaseUrl} />}
  </View>;
}

function ServiceConnection({ apiBaseUrl }: { apiBaseUrl: string | undefined }) {
  const [message, setMessage] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const current = useRef<AbortController | null>(null);
  useLayoutEffect(() => () => { current.current?.abort(); current.current = null; }, []);
  const endpoint = predictionUrl(apiBaseUrl);
  async function check() {
    if (current.current) return;
    const controller = new AbortController();
    current.current = controller;
    setChecking(true); setMessage(null);
    const result = await checkServiceConnection(apiBaseUrl, controller.signal);
    if (current.current !== controller) return;
    current.current = null;
    setChecking(false); setMessage(result);
  }
  return <View style={styles.diagnostic}>
    <Text accessibilityRole="header" style={styles.text}>Development connection check</Text>
    <Text selectable style={styles.text}>{endpoint ? `Service: ${endpoint.replace(/\/api\/v1\/predictions$/, '')}` : 'Service address missing or invalid.'}</Text>
    <Pressable accessibilityRole="button" disabled={checking}
      accessibilityState={{ disabled: checking, busy: checking }} onPress={check} style={styles.button}>
      <Text style={styles.buttonText}>{checking ? 'Checking connection…' : 'Check service connection'}</Text>
    </Pressable>
    {message && <Text accessibilityLiveRegion="polite" style={styles.text}>{message}</Text>}
  </View>;
}

function UploadAttempt({ photo, apiBaseUrl }: { photo: UploadPhoto | null; apiBaseUrl?: string }) {
  const [feedback, setFeedback] = useState<UploadFeedback | null>(null);
  const [loading, setLoading] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const current = useRef<AbortController | null>(null);
  const url = predictionUrl(apiBaseUrl);
  // Layout cleanup invalidates the previous attempt before asynchronous completions.
  useLayoutEffect(() => () => { current.current?.abort(); current.current = null; }, []);

  async function submit() {
    if (!photo || !url || current.current) return;
    const controller = new AbortController();
    current.current = controller;
    setLoading(true); setFeedback(null); setAttempted(true);
    const result = await uploadPhoto(photo, url, controller.signal);
    if (current.current !== controller) return;
    current.current = null;
    setFeedback(result); setLoading(false);
  }
  function cancel() {
    current.current?.abort(); current.current = null;
    setLoading(false);
    setFeedback({ kind: 'cancelled', message: 'Upload cancelled. The request may already have reached the service.' });
  }
  return <View style={styles.panel}>
    <Text accessibilityRole="header" style={styles.heading}>Send to HORTI</Text>
    <Text style={styles.text}>Selecting a photo does not upload it. Only the upload button sends it to the FastAPI service. Predictions are not available yet.</Text>
    {!photo && <Text style={styles.text}>Choose a leaf photo before uploading.</Text>}
    {!url && <Text style={styles.text}>Uploads are unavailable because the service address is not configured correctly.</Text>}
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: !photo || !url || loading, busy: loading }}
      disabled={!photo || !url || loading} onPress={submit} style={[styles.button, (!photo || !url || loading) && styles.disabled]}>
      <Text style={styles.buttonText}>{loading ? 'Uploading photo…' : attempted ? 'Retry upload' : 'Upload leaf photo'}</Text>
    </Pressable>
    {loading && <Pressable accessibilityRole="button" onPress={cancel} style={styles.button}><Text style={styles.buttonText}>Cancel upload</Text></Pressable>}
    <UploadStatus loading={loading} feedback={feedback} />
  </View>;
}
const styles = StyleSheet.create({
  panel: { gap: 16 }, heading: { fontSize: 24, fontWeight: '600', color: '#14532d' },
  text: { fontSize: 18, color: '#1e293b' },
  button: { minHeight: 48, padding: 16, backgroundColor: '#14532d', borderRadius: 8 },
  buttonText: { color: '#fff', fontSize: 18 },
  disabled: { opacity: 0.6 },
  diagnostic: { gap: 12, padding: 16, borderWidth: 1, borderColor: '#64748b', borderRadius: 8 },
});
