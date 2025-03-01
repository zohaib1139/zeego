import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, findNodeHandle, PermissionsAndroid, Platform } from 'react-native';
import ZegoExpressEngine, { ZegoRoomConfig, ZegoTextureView } from 'zego-express-engine-reactnative';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';

export default function App() {
  const localViewRef = useRef(null);
  const remoteViewRef = useRef(null);
  const engineRef = useRef(null);

  const streamID = "streamID";
  const roomID = "room1";
  const userID = "user_" + Math.floor(Math.random() * 10000);

  // Android Permission Request Function
  const requestAndroidPermissions = async () => {
    try {
      if (Platform.OS === 'android') {
        const permissions = [
          PermissionsAndroid.PERMISSIONS.CAMERA,
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        ];

        const granted = await PermissionsAndroid.requestMultiple(permissions);
        
        return Object.values(granted).every(
          status => status === PermissionsAndroid.RESULTS.GRANTED
        );
      }
      return true;
    } catch (err) {
      console.log('Permission error:', err);
      return false;
    }
  };

  // iOS Permission Request Function
  const requestIOSPermissions = async () => {
    if (Platform.OS === 'ios') {
      const camera = await request(PERMISSIONS.IOS.CAMERA);
      const mic = await request(PERMISSIONS.IOS.MICROPHONE);
      return camera === RESULTS.GRANTED && mic === RESULTS.GRANTED;
    }
    return true;
  };

  useEffect(() => {
    const initializeEngine = async () => {
      try {
        // 1. Request permissions
        const hasPermissions = await requestAndroidPermissions() || await requestIOSPermissions();
        if (!hasPermissions) {
          console.log("❌ Permissions denied");
          return;
        }

        // 2. Initialize ZegoExpressEngine
        const profile = {
          appID: 290833566,
          appSign: '98eec7c53826bb2719130e350c8b99072a07f0a8d428e98fdfebf1a68fd6c1e3',
          scenario: 0,
        };

        const engine = await ZegoExpressEngine.createEngineWithProfile(profile);
        engineRef.current = engine;

        // 3. Setup event listeners
        setupEventListeners(engine);
        
        // 4. Login to room
        const roomConfig = new ZegoRoomConfig();
        roomConfig.isUserStatusNotify = true;
        await engine.loginRoom(roomID, { userID, userName: userID }, roomConfig);

        // 5. Start local preview **before publishing**
        setTimeout(async () => {
          const localHandle = findNodeHandle(localViewRef.current);
          if (!localHandle) {
            console.error("❌ Local handle not found!");
            return;
          }

          console.log("✅ Local handle:", localHandle);
          await engine.startPreview({
            reactTag: localHandle,
            viewMode: 0,
            backgroundColor: 0,
          });

          // 6. Now start publishing stream
          await engine.startPublishingStream(streamID);
          console.log("✅ Started publishing stream:", streamID);
        }, 1000);

        // 7. Start playing remote stream
        setTimeout(async () => {
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
        }, 2000);

      } catch (error) {
        console.error("❌ Initialization error:", error);
      }
    };

    initializeEngine();

    // Cleanup function
    return () => {
      if (engineRef.current) {
        engineRef.current.stopPreview();
        engineRef.current.stopPlayingStream(streamID);
        engineRef.current.stopPublishingStream(streamID);
        engineRef.current.logoutRoom(roomID);
        ZegoExpressEngine.destroyEngine();
      }
    };
  }, []);

  // Event Listeners
  const setupEventListeners = (engine) => {
    engine.on('roomStateUpdate', (roomID, state, errorCode, extendedData) => {
      console.log("ℹ️ Room state updated:", state);
    });

    engine.on('roomUserUpdate', (roomID, updateType, userList) => {
      console.log("👥 User update:", updateType, userList);
    });

    engine.on('roomStreamUpdate', (roomID, updateType, streamList) => {
      console.log("📡 Stream update:", updateType, streamList);
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Live Video Preview</Text>
      
      {/* Local Preview */}
      <View style={styles.videoContainer}>
        <ZegoTextureView ref={localViewRef} style={styles.video} />
        <Text style={styles.label}>Local Preview</Text>
      </View>

      {/* Remote Video */}
      <View style={styles.videoContainer}>
        <ZegoTextureView ref={remoteViewRef} style={styles.video} />
        <Text style={styles.label}>Remote Video</Text>
      </View>
    </View>
  );
}

// Styles remain the same...
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },
  title: {
    fontSize: 20,
    color: "#fff",
    marginBottom: 20,
  },
  videoContainer: {
    width: 300,
    height: 400,
    backgroundColor: "#222",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  video: {
    width: 300,
    height: 400,
  },
  label: {
    color: "#fff",
    marginTop: 5,
  },
});
