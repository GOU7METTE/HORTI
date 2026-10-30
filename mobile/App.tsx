import { StatusBar } from "expo-status-bar";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { PhotoSelection } from "./src/photo-selection";
import { useState } from "react";
import { UploadPanel } from "./src/UploadPanel";
import type { SelectedPhoto } from "./src/selected-photo";

export default function App() {
  const [selection, setSelection] = useState<{ photo: SelectedPhoto | null; revision: number }>({ photo: null, revision: 0 });

  function changePhoto(photo: SelectedPhoto | null) {
    setSelection(previous => ({ photo, revision: previous.revision + 1 }));
  }
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.page}>
            <Text accessibilityRole="header" style={styles.title}>
              HORTI
            </Text>
            <Text style={styles.subtitle}>Plant health, one step at a time.</Text>
            <View style={styles.notice}>
              <Text accessibilityRole="header" style={styles.heading}>
                Predictions are not yet available
              </Text>
              <Text style={styles.body}>
                HORTI is in development. You can preview
                a photo from your library or take one with the camera, then upload it.
                The model is not available yet, so uploads cannot produce a prediction.
              </Text>
            </View>
            <PhotoSelection photo={selection.photo} onPhotoChange={changePhoto} />
            <UploadPanel key={selection.revision} photo={selection.photo} />
            <Text style={styles.body}>
              Future predictions will be model estimates, not confirmed
              diagnoses. Model scores may be uncalibrated.
            </Text>
            <Text style={styles.body}>
              Pressing Upload sends the selected image to the FastAPI service.
              The service does not retain uploaded photos. Selecting alone sends nothing.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f8faf8" },
  content: { flexGrow: 1, padding: 24 },
  page: { width: "100%", maxWidth: 560, alignSelf: "center", gap: 24 },
  title: { color: "#14532d", fontSize: 36, fontWeight: "700" },
  subtitle: { color: "#334155", fontSize: 20 },
  notice: { backgroundColor: "#e7f2e8", borderRadius: 16, padding: 20, gap: 16 },
  heading: { color: "#14532d", fontSize: 24, fontWeight: "600" },
  body: { color: "#1e293b", fontSize: 18 },
});
