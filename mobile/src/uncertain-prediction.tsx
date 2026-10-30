import { Pressable, StyleSheet, Text, View } from 'react-native';

// Prepared for a validated real response's uncertain flag. Not mounted in the 503 flow.
export function UncertainPrediction({ uncertain, onChooseAnother }: {
  uncertain: boolean; onChooseAnother: () => void;
}) {
  if (!uncertain) return null;
  return <View style={styles.card} accessibilityLiveRegion="polite">
    <Text accessibilityRole="header" style={styles.heading}>Result is uncertain</Text>
    <Text accessibilityRole="alert" style={styles.text}>The model marked this result as uncertain. Do not treat it as a confirmed diagnosis.</Text>
    <Text style={styles.text}>Try a clear photo of one leaf in good light. Model scores may be uncalibrated; a higher score does not guarantee a correct result.</Text>
    <Pressable accessibilityRole="button" onPress={onChooseAnother} style={styles.button}>
      <Text style={styles.buttonText}>Choose another photo</Text>
    </Pressable>
  </View>;
}
const styles = StyleSheet.create({
  card: { padding: 16, gap: 12, borderRadius: 12, borderWidth: 1, borderColor: '#92400e', backgroundColor: '#fffbeb' },
  heading: { fontSize: 22, fontWeight: '600', color: '#1e293b' },
  text: { fontSize: 18, color: '#1e293b' },
  button: { padding: 16, minHeight: 48, borderRadius: 8, backgroundColor: '#14532d' },
  buttonText: { color: '#fff', fontSize: 18 },
});
