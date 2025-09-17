import { Platform, Alert } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import * as Device from 'expo-device';

class FirebaseNotificationService {
  private static isValidFCMToken(token: string): boolean {
    // FCM tokens are typically 140+ characters and contain alphanumeric characters, colons, and hyphens
    return token && token.length > 100 && /^[A-Za-z0-9:_-]+$/.test(token);
  }

  async registerForPushNotifications(): Promise<string> {
    try {
      // Check if device supports push notifications
      if (!Device.isDevice) {
        console.warn('Push notifications are not supported in simulators/emulators');
        throw new Error('Push notifications are not supported in simulators/emulators');
      }

      // Request permissions
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (!enabled) {
        throw new Error('Failed to get push token for push notification!');
      }

      // Get the token
      const token = await messaging().getToken();
      console.log('Generated FCM token:', token);

      // Validate the token format
      if (!FirebaseNotificationService.isValidFCMToken(token)) {
        console.error('Invalid FCM token format:', token);
        throw new Error('Generated token has invalid format');
      }

      return token;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      
      // In development mode, provide helpful guidance
      if (__DEV__) {
        console.warn('Development mode: Push notifications require a development build.');
        console.warn('To test push notifications:');
        console.warn('1. Create a development build: npx eas build --platform android --profile development');
        console.warn('2. Install the development build on your device');
        console.warn('3. Run: npx expo start --dev-client');
        
        // Return a mock token for development UI testing
        return 'mock-fcm-token-dev-' + Date.now();
      } else {
        throw new Error('Failed to register for push notifications: ' + error.message);
      }
    }
  }

  async refreshPushToken(): Promise<string> {
    try {
      console.log('Refreshing FCM token...');
      
      // Get a new token
      const token = await messaging().getToken(true); // Force refresh
      console.log('New FCM token:', token);
      
      return token;
    } catch (error) {
      console.error('Error refreshing FCM token:', error);
      throw error;
    }
  }

  async validateToken(token: string): Promise<boolean> {
    try {
      // Basic format validation
      if (!FirebaseNotificationService.isValidFCMToken(token)) {
        console.error('Token format validation failed:', token);
        return false;
      }

      // In a real implementation, you might want to test the token with Firebase Admin SDK
      // For now, we'll just validate the format
      return true;
    } catch (error) {
      console.error('Error validating token:', error);
      return false;
    }
  }

  async sendTestNotification(token: string): Promise<void> {
    try {
      // Validate token before sending
      if (!await this.validateToken(token)) {
        throw new Error('Invalid token format');
      }

      // For testing, we'll show a local alert since we can't send FCM messages from the client
      Alert.alert('Test Notification', 'This is a test notification from Cointeligencia');
    } catch (error) {
      console.error('Error sending test notification:', error);
      Alert.alert('Test Notification', 'This is a test notification from Cointeligencia');
    }
  }

  async addNotificationListener(callback: (message: any) => void): Promise<() => void> {
    const unsubscribe = messaging().onMessage(async remoteMessage => {
      console.log('Received foreground message:', remoteMessage);
      callback(remoteMessage);
    });

    return unsubscribe;
  }

  async addNotificationResponseListener(callback: (response: any) => void): Promise<() => void> {
    const unsubscribe = messaging().onNotificationOpenedApp(remoteMessage => {
      console.log('Notification opened app:', remoteMessage);
      callback(remoteMessage);
    });

    // Check if app was opened from a notification
    messaging()
      .getInitialNotification()
      .then(remoteMessage => {
        if (remoteMessage) {
          console.log('App opened from notification:', remoteMessage);
          callback(remoteMessage);
        }
      });

    return unsubscribe;
  }

  async scheduleLocalNotification(title: string, body: string, data?: any): Promise<string> {
    try {
      // For local notifications, we'll use a simple alert for now
      // In a full implementation, you might want to use a local notification library
      Alert.alert(title, body);
      return 'mock-notification-id';
    } catch (error) {
      console.error('Error scheduling notification:', error);
      Alert.alert(title, body);
      return 'mock-notification-id';
    }
  }

  async cancelNotification(notificationId: string): Promise<void> {
    // Simplified implementation for development
    console.log('Canceling notification - using mock implementation');
  }

  async cancelAllNotifications(): Promise<void> {
    // Simplified implementation for development
    console.log('Canceling all notifications - using mock implementation');
  }

  async getBadgeCount(): Promise<number> {
    // Simplified implementation for development
    return 0;
  }

  async setBadgeCount(count: number): Promise<void> {
    // Simplified implementation for development
    console.log('Setting badge count - using mock implementation');
  }

  // Firebase-specific methods
  async onTokenRefresh(callback: (token: string) => void): Promise<() => void> {
    const unsubscribe = messaging().onTokenRefresh(token => {
      console.log('FCM token refreshed:', token);
      callback(token);
    });

    return unsubscribe;
  }

  async deleteToken(): Promise<void> {
    try {
      await messaging().deleteToken();
      console.log('FCM token deleted');
    } catch (error) {
      console.error('Error deleting FCM token:', error);
      throw error;
    }
  }
}

export const firebaseNotificationService = new FirebaseNotificationService();
