import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import type { UploadFeedback } from './uploads';

const titles = {
  unavailable: 'Model unavailable', 'invalid-image': 'Choose another image',
  network: 'Upload failed', timeout: 'Upload timed out', cancelled: 'Upload cancelled',
  unexpected: 'Unexpected service response', service: 'Request failed',
};

export function UploadStatus({ loading, feedback }: { loading: boolean; feedback: UploadFeedback | null }) {
  if (loading) return <View style={[styles.card, styles.neutral]} accessibilityLiveRegion="polite">
    <View accessible accessibilityRole="progressbar" accessibilityLabel="Uploading leaf photo" accessibilityState={{ busy: true }}>
      <ActivityIndicator color="#14532d" accessible={false} />
    </View>
    <Text accessibilityRole="header" style={styles.heading}>Uploading photo</Text>
    <Text style={styles.text}>Sending your selected image to HORTI. You can cancel while this request is in progress.</Text>
  </View>;
  if (!feedback) return null;
  const kind = feedback.kind ?? 'service';
  return <View style={[styles.card, kind === 'unavailable' ? styles.warning : kind === 'cancelled' ? styles.neutral : styles.error]}
    accessibilityLiveRegion="polite">
    <Text accessibilityRole="header" style={styles.heading}>{titles[kind]}</Text>
    <Text accessible accessibilityRole="alert" style={styles.text}>{feedback.message}</Text>
    {kind === 'invalid-image' && <Text style={styles.text}>Replace the photo with a JPEG or PNG no larger than 5 MiB. The server checks the file contents.</Text>}
    {feedback.requestId && <Text selectable style={styles.text}>Request ID: {feedback.requestId}</Text>}
  </View>;
}

const styles = StyleSheet.create({
  card: { padding: 16, gap: 12, borderRadius: 12, borderWidth: 1 },
  warning: { backgroundColor: '#fffbeb', borderColor: '#92400e' },
  error: { backgroundColor: '#fff1f2', borderColor: '#991b1b' },
  neutral: { backgroundColor: '#f1f5f9', borderColor: '#64748b' },
  heading: { fontSize: 22, fontWeight: '600', color: '#1e293b' },
  text: { fontSize: 18, color: '#1e293b' },
});
