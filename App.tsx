import React, { useEffect, useRef } from 'react';
import { View, Text, findNodeHandle } from 'react-native';
import ZegoExpressEngine, { ZegoRoomConfig, ZegoTextureView } from 'zego-express-engine-reactnative';

export default function App() {
  const zegoPlayViewRef = useRef(null);
  const engineRef = useRef(null);
  const localViewRef = useRef(null);
  const streamID = "streamID";
  const roomID = "room1";

  useEffect(() => {
    const initializeEngine = async () => {
      try {
        // Initialize engine
        const profile = {
          appID: 290833566,
          appSign: '98eec7c53826bb2719130e350c8b99072a07f0a8d428e98fdfebf1a68fd6c1e3',
          scenario: 0,
        };
        
        const engine = await ZegoExpressEngine.createEngineWithProfile(profile);
        engineRef.current = engine;

        // Setup event listeners
        setupEventListeners(engine);
        
        // Login to room after engine initialization
        const roomConfig = new ZegoRoomConfig();
        roomConfig.isUserStatusNotify = true;
        
        await engine.loginRoom(roomID, { 
          userID: 'id1', 
          userName: 'user1' 
        }, roomConfig);

        // Start publishing stream
        engine.startPublishingStream(streamID);

        // Start playing stream after view reference is available
        const remoteViewRef = findNodeHandle(zegoPlayViewRef.current);
        console.log(">>>>>>>>>>>>>,startStream")
        engine.startPlayingStream(streamID, {
          reactTag: remoteViewRef,
          viewMode: 0,
          backgroundColor: 0
        });
        console.log(">>>>>>>>>>>>>,afterStream")
        // Start the local preview.
      engine.startPreview({
        'reactTag': localViewRef,
        'viewMode': 0,
        'backgroundColor': 0
      });


      } catch (error) {
        console.error('Initialization error:', error);
      }
    };

    initializeEngine();

    // Cleanup function
    return () => {
      if (engineRef.current) {
        engineRef.current.stopPlayingStream(streamID);
        engineRef.current.stopPublishingStream(streamID);
        engineRef.current.logoutRoom(roomID);
        ZegoExpressEngine.destroyEngine();
      }
    };
  }, []);

  const setupEventListeners = (engine) => {
    engine.on('roomStateUpdate', (roomID, state, errorCode, extendedData) => {
      console.log('Room state updated:', state);
    });

    engine.on('roomUserUpdate', (roomID, updateType, userList) => {
      console.log('User update:', updateType, userList);
    });

    engine.on('roomStreamUpdate', (roomID, updateType, streamList) => {
      console.log('Stream update:', updateType, streamList);
    });
  };

  return (
    <View style={{ padding: 100 }}>
      <Text>Zohaib</Text>
      <ZegoTextureView ref={zegoPlayViewRef} />
    </View>
  );
}