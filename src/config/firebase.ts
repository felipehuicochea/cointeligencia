import { initializeApp } from '@react-native-firebase/app';
import messaging from '@react-native-firebase/messaging';

const firebaseConfig = {
  apiKey: "AIzaSyA4lWbucxTKN4PWNc_daFZuITiGU0Sr_ro",
  projectId: "cointeligenciamobileapp", // Keep original project ID
  storageBucket: "cointeligenciamobileapp.firebasestorage.app",
  messagingSenderId: "586498681231",
  appId: "1:586498681231:android:75d0e4175eed01e1de83fa"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Register background message handler for Android
// This is required for receiving notifications when app is in background/quit state
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('[Firebase] Background message received:', JSON.stringify(remoteMessage, null, 2));
  console.log('[Firebase] Background message data:', remoteMessage.data);
  console.log('[Firebase] Background message notification:', remoteMessage.notification);
  console.log('[Firebase] Background message type:', remoteMessage.data?.type);
  // The actual processing will happen in App.tsx when the notification is opened
  // But we can also process it here if needed
});

export default app;
