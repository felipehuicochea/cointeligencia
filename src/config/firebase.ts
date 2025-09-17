import { initializeApp } from '@react-native-firebase/app';

const firebaseConfig = {
  apiKey: "AIzaSyA4lWbucxTKN4PWNc_daFZuITiGU0Sr_ro",
  projectId: "cointeligenciamobileapp", // Keep original project ID
  storageBucket: "cointeligenciamobileapp.firebasestorage.app",
  messagingSenderId: "586498681231",
  appId: "1:586498681231:android:75d0e4175eed01e1de83fa"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export default app;
