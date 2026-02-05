// Crypto polyfills no longer needed - using AsyncStorage instead of SecureStore

import { registerRootComponent } from 'expo';
import messaging from '@react-native-firebase/messaging';
import { processBackgroundNotification } from './src/utils/backgroundNotificationProcessor';

// Background message handler - processes notifications immediately when app is in background/quit state
// This is critical for AUTO trading mode - trades must execute even when app is not in foreground
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('[BackgroundHandler] Message received in background, processing immediately...');
  
  try {
    // Process notification immediately - stores alert and executes trade if AUTO mode
    await processBackgroundNotification(remoteMessage);
    console.log('[BackgroundHandler] Background notification processed successfully');
  } catch (error) {
    console.error('[BackgroundHandler] Error processing background notification:', error);
  }
});

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
