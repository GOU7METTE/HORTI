import { useEffect, useRef, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { AccessibilityInfo, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { checkSelection, metadataHint, PHOTO_HINT, type SelectedPhoto } from './selected-photo';

export function PhotoSelection({ photo, onPhotoChange }: {
  photo: SelectedPhoto | null;
  onPhotoChange: (photo: SelectedPhoto | null) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const picking = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  async function choose(source: 'library' | 'camera' = 'library') {
    if (picking.current) return;
    picking.current = true;
    setBusy(true);
    setError(null);
    setFeedback(null);
    try {
      let result: ImagePicker.ImagePickerResult;
      if (source === 'camera') {
        let permission = await ImagePicker.getCameraPermissionsAsync();
        if (!mounted.current) return;
        if (!permission.granted && permission.canAskAgain) {
          permission = await ImagePicker.requestCameraPermissionsAsync();
        }
        if (!mounted.current) return;
        if (!permission.granted) {
          setError(permission.canAskAgain
            ? 'Camera access was not granted. You can try again or choose a photo from your library.'
            : 'Camera access is disabled. Enable camera access in device Settings, or choose a photo from your library.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'], allowsEditing: false, exif: false, base64: false, quality: 1,
        });
      } else {
        // System photo picker: no broad-library permission request or cropper.
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'], allowsMultipleSelection: false, allowsEditing: false,
          exif: false, base64: false, quality: 1,
          preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Current,
          legacy: false,
        });
      }
      if (!mounted.current) return;
      if (result.canceled) {
        setFeedback(photo ? 'Selection cancelled. Your previous photo is still selected.' : 'Selection cancelled. No photo is selected.');
        return;
      }
      if (result.assets?.length !== 1 || !result.assets[0]) {
        setError('Could not select a single photo. Please try again.');
        return;
      }
      const checked = checkSelection(result.assets[0]);
      if (checked.error !== undefined) {
        setError(checked.error);
        return;
      }
      onPhotoChange(checked.photo);
      setFeedback('Photo selected locally. Upload requires a separate button press.');
    } catch {
      if (mounted.current) setError(source === 'camera'
        ? 'Could not open or read the camera. Please try again or choose a photo. Your previous selection has not changed.'
        : 'Could not open or read the photo picker. Please try again. Your previous selection has not changed.');
    } finally {
      picking.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  return <View style={styles.section}>
    <Text accessibilityRole="header" style={styles.heading}>Choose a leaf photo</Text>
    <Text style={styles.text}>{PHOTO_HINT}</Text>
    <Text style={styles.text}>Selecting a photo does not upload anything. This screen keeps the selection only until the app restarts. Press Upload leaf photo separately to send it to the service.</Text>
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy, busy }}
      disabled={busy} onPress={() => choose('library')} style={[styles.button, busy && styles.disabled]}>
      <Text style={styles.buttonText}>{photo ? 'Replace leaf photo' : 'Choose leaf photo'}</Text>
    </Pressable>
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy, busy }}
      disabled={busy} onPress={() => choose('camera')} style={[styles.button, busy && styles.disabled]}>
      <Text style={styles.buttonText}>Take leaf photo</Text>
    </Pressable>
    {busy && <Text accessibilityLiveRegion="polite" style={styles.text}>Opening photo source...</Text>}
    {photo && <>
      <Image key={photo.uri} source={{ uri: photo.uri }} accessibilityLabel="Selected leaf photo preview"
        accessible resizeMode="contain" style={styles.preview}
        onError={() => { setFeedback(null); setError('The photo preview could not be displayed. Try another JPEG or PNG.'); }} />
      <Text style={styles.text}>{metadataHint(photo)}</Text>
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy }} disabled={busy}
        onPress={() => { onPhotoChange(null); setFeedback('Selection removed. Your original photo has not been deleted.'); }}
        style={[styles.button, busy && styles.disabled]}>
        <Text style={styles.buttonText}>Remove leaf photo</Text>
      </Pressable>
    </>}
    {feedback && <Text accessible accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.text}>{feedback}</Text>}
    <Modal visible={error !== null} transparent animationType="fade"
      supportedOrientations={['portrait', 'landscape']}
      onRequestClose={() => setError(null)}
      onShow={() => { if (error) AccessibilityInfo.announceForAccessibility(`Photo selection error. ${error}`); }}>
      <SafeAreaView style={styles.backdrop}>
        <View accessibilityViewIsModal onAccessibilityEscape={() => setError(null)} style={styles.errorCard}>
          <ScrollView contentContainerStyle={styles.errorContent} bounces={false}>
            <Text accessibilityRole="header" style={styles.errorTitle}>Photo selection error</Text>
            <Text accessible accessibilityRole="alert" accessibilityLiveRegion="assertive" style={styles.errorMessage}>{error}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Dismiss photo error"
              onPress={() => setError(null)} style={styles.dismissButton}>
              <Text style={styles.dismissText}>Dismiss</Text>
            </Pressable>
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  </View>;
}

const styles = StyleSheet.create({
  section: { gap: 16 }, heading: { color: '#14532d', fontSize: 24, fontWeight: '600' },
  text: { color: '#1e293b', fontSize: 18 },
  button: { minHeight: 48, backgroundColor: '#14532d', borderRadius: 8, padding: 16 },
  buttonText: { color: '#fff', fontSize: 18 }, disabled: { opacity: 0.6 },
  preview: { width: '100%', height: 240, backgroundColor: '#e7f2e8', borderRadius: 8 },
  backdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: 'rgba(15, 23, 42, 0.28)' },
  errorCard: { width: '100%', maxWidth: 420, maxHeight: '90%', borderRadius: 16, borderWidth: 1, borderColor: '#b91c1c', backgroundColor: '#fff1f2', overflow: 'hidden' },
  errorContent: { padding: 20, gap: 16 },
  errorTitle: { color: '#991b1b', fontSize: 20, fontWeight: '700' },
  errorMessage: { color: '#7f1d1d', fontSize: 17 },
  dismissButton: { minHeight: 48, padding: 12, borderRadius: 10, backgroundColor: '#991b1b', alignItems: 'center', justifyContent: 'center' },
  dismissText: { color: '#fff', fontSize: 17, fontWeight: '600' },
});
