import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, findNodeHandle, PermissionsAndroid, Platform, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import ZegoExpressEngine, { ZegoRoomConfig, ZegoTextureView } from 'zego-express-engine-reactnative';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';

export default function App() {
  const localViewRef = useRef(null);
  const remoteViewRef = useRef(null);
  const engineRef = useRef(null);
  const [isFrontCamera, setIsFrontCamera] = useState(true);

  const streamID = "streamID_" + Math.floor(Math.random() * 10000); // Unique streamID
  console.log("+++++++++++++", streamID)
  const roomID = "room1";
  const userID = "user_" + Math.floor(Math.random() * 10000);

  const toggleCamera = async () => {
    if (!engineRef.current) return;
    
    try {
      const newCameraState = !isFrontCamera;
      await engineRef.current.useFrontCamera(newCameraState);
      setIsFrontCamera(newCameraState);

      // Restart preview after camera switch
      const localHandle = findNodeHandle(localViewRef.current);
      if (localHandle) {
        await engineRef.current.startPreview({
          reactTag: localHandle,
          viewMode: 0,
          backgroundColor: 0
        });
      }
    } catch (error) {
      console.error("Camera toggle failed:", error);
    }
  };

  // Android Permissions
  const requestAndroidPermissions = async () => {
    try {
      const permissions = [
        PermissionsAndroid.PERMISSIONS.CAMERA,
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      ];
      const granted = await PermissionsAndroid.requestMultiple(permissions);
      return Object.values(granted).every(
        status => status === PermissionsAndroid.RESULTS.GRANTED
      );
    } catch (err) {
      console.warn('Permission error:', err);
      return false;
    }
  };

  // iOS Permissions
  const requestIOSPermissions = async () => {
    const cameraStatus = await request(PERMISSIONS.IOS.CAMERA);
    const micStatus = await request(PERMISSIONS.IOS.MICROPHONE);
    return cameraStatus === RESULTS.GRANTED && micStatus === RESULTS.GRANTED;
  };

  useEffect(() => {
    const initializeEngine = async () => {
      try {
        // 1. Request permissions
        let hasPermissions;
        if (Platform.OS === 'android') {
          hasPermissions = await requestAndroidPermissions();
        } else if (Platform.OS === 'ios') {
          hasPermissions = await requestIOSPermissions();
        }
        if (!hasPermissions) {
          console.log("❌ Permissions denied");
          return;
        }

        // 2. Initialize Engine
        const profile = {
          appID: 290833566,
          appSign: '98eec7c53826bb2719130e350c8b99072a07f0a8d428e98fdfebf1a68fd6c1e3',
          scenario: 0,
        };
        const engine = await ZegoExpressEngine.createEngineWithProfile(profile);
        engineRef.current = engine;

        // 4. Login to Room
        const roomConfig = new ZegoRoomConfig();
        roomConfig.isUserStatusNotify = true;
        await engine.loginRoom(roomID, { userID, userName: userID }, roomConfig);

        // 5. Start Preview & Publish
        const localHandle = findNodeHandle(localViewRef.current);
        if (localHandle) {
          await engine.startPreview({
            reactTag: localHandle,
            viewMode: 0,
            backgroundColor: 0,
          });
          await engine.startPublishingStream(streamID);
        }

        const remoteHandle = findNodeHandle(remoteViewRef.current);
        if (!remoteHandle) {
          console.error("❌ Remote handle not found!");
          return;
        }

        console.log("✅ Remote handle:", remoteHandle);
        engine.startPlayingStream(streamID, {
          reactTag: remoteHandle,
          viewMode: 0,
          backgroundColor: 0,
        }); 

      } catch (error) {
        console.error("❌ Initialization error:", error);
      }
    };

    initializeEngine();

    return () => {
      if (engineRef.current) {
        engineRef.current.stopPreview();
        engineRef.current.stopPublishingStream(streamID);
        engineRef.current.logoutRoom(roomID);
        ZegoExpressEngine.destroyEngine();
      }
    };
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
    <ScrollView 
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Live Video Streaming</Text>
      
      {/* Local Video Container */}
      <View style={styles.videoWrapper}>
        <ZegoTextureView ref={localViewRef} style={styles.video} />
        <Text style={styles.videoLabel}>Your Camera</Text>
      </View>

      {/* Remote Video Container */}
      <View style={styles.videoWrapper}>
        <ZegoTextureView ref={remoteViewRef} style={styles.video} />
        <Text style={styles.videoLabel}>Remote Stream</Text>
      </View>

      {/* Additional Content Area */}
      <View style={styles.infoBox}>
        <Text style={styles.infoText}>Room ID: {roomID}</Text>
        <Text style={styles.infoText}>User ID: {userID}</Text>
      </View>
    </ScrollView>

    {/* Fixed Footer with Controls */}
    <View style={styles.controlsContainer}>
      <TouchableOpacity 
        style={[styles.button, styles.flipButton]}
        onPress={toggleCamera}
      >
        <Text style={styles.buttonText}>Flip Camera</Text>
      </TouchableOpacity>
    </View>
  </SafeAreaView>
);
}

const styles = StyleSheet.create({
safeArea: {
  flex: 1,
  backgroundColor: '#1A1A1A',
},
scrollContent: {
  flexGrow: 1,
  padding: 16,
  paddingBottom: 80, // Space for fixed controls
},
title: {
  fontSize: 24,
  color: '#FFF',
  fontWeight: '600',
  marginBottom: 24,
  textAlign: 'center',
},
videoWrapper: {
  backgroundColor: '#2D2D2D',
  borderRadius: 12,
  marginBottom: 20,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.25,
  shadowRadius: 4,
  elevation: 5,
},
video: {
  width: '100%',
  aspectRatio: 16/9, // Maintain video aspect ratio
  borderRadius: 12,
},
videoLabel: {
  color: '#FFF',
  padding: 8,
  fontSize: 14,
  textAlign: 'center',
  backgroundColor: 'rgba(0,0,0,0.5)',
  borderBottomLeftRadius: 12,
  borderBottomRightRadius: 12,
},
infoBox: {
  backgroundColor: '#2D2D2D',
  borderRadius: 12,
  padding: 16,
  marginTop: 12,
},
infoText: {
  color: '#FFF',
  fontSize: 14,
  marginBottom: 8,
},
controlsContainer: {
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  backgroundColor: 'rgba(45,45,45,0.9)',
  padding: 16,
  borderTopLeftRadius: 16,
  borderTopRightRadius: 16,
},
button: {
  paddingVertical: 12,
  borderRadius: 8,
  alignItems: 'center',
  marginBottom: 8,
},
flipButton: {
  backgroundColor: '#007AFF',
},
buttonText: {
  color: '#FFF',
  fontWeight: '500',
},
});