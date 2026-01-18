import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';

interface PhotoCaptureProps {
  onPhotoCapture: (base64: string) => void;
  onPhotoClear: () => void;
  capturedPhoto: string | null;
  required?: boolean;
}

export function PhotoCapture({
  onPhotoCapture,
  onPhotoClear,
  capturedPhoto,
  required = false,
}: PhotoCaptureProps) {
  const [showCamera, setShowCamera] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const openCamera = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert(
          'Camera Permission',
          'Camera access is required to take a photo for clock-in verification.'
        );
        return;
      }
    }
    setShowCamera(true);
  };

  const takePhoto = async () => {
    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.5,
        base64: false,
      });

      if (!photo?.uri) {
        Alert.alert('Error', 'Failed to capture photo');
        return;
      }

      // Resize and compress the image
      const manipulated = await ImageManipulator.manipulateAsync(
        photo.uri,
        [{ resize: { width: 400 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );

      if (manipulated.base64) {
        onPhotoCapture(manipulated.base64);
      }
      setShowCamera(false);
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to capture photo');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="camera-outline" size={18} color="#94A3B8" />
        <Text style={styles.headerText}>
          Photo {required ? '(Required)' : '(Optional)'}
        </Text>
      </View>

      {capturedPhoto ? (
        <View style={styles.photoContainer}>
          <Image
            source={{ uri: `data:image/jpeg;base64,${capturedPhoto}` }}
            style={styles.photo}
          />
          <TouchableOpacity
            style={styles.removeButton}
            onPress={onPhotoClear}
          >
            <Ionicons name="close-circle" size={24} color="#ef4444" />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.captureButton}
          onPress={openCamera}
          activeOpacity={0.8}
        >
          <Ionicons name="camera" size={24} color="#818cf8" />
          <Text style={styles.captureText}>Take Photo</Text>
        </TouchableOpacity>
      )}

      {/* Camera Modal */}
      <Modal visible={showCamera} animationType="slide">
        <View style={styles.cameraContainer}>
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing="front"
          >
            <View style={styles.cameraOverlay}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowCamera(false)}
              >
                <Ionicons name="close" size={28} color="#ffffff" />
              </TouchableOpacity>

              <View style={styles.captureButtonContainer}>
                <TouchableOpacity
                  style={styles.shutterButton}
                  onPress={takePhoto}
                >
                  <View style={styles.shutterInner} />
                </TouchableOpacity>
              </View>
            </View>
          </CameraView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#94A3B8',
    marginLeft: 8,
  },
  photoContainer: {
    position: 'relative',
    alignItems: 'center',
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#1e293b',
  },
  removeButton: {
    position: 'absolute',
    top: 0,
    right: '30%',
    backgroundColor: '#0F172A',
    borderRadius: 12,
  },
  captureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    borderStyle: 'dashed',
  },
  captureText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#818cf8',
    marginLeft: 8,
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'space-between',
    padding: 20,
  },
  closeButton: {
    alignSelf: 'flex-start',
    padding: 8,
  },
  captureButtonContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  shutterButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutterInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#ffffff',
  },
});
