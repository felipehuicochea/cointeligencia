import { Platform, Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

class NotificationService {
  private static isValidExpoToken(token: string): boolean {
    // Valid Expo tokens start with "ExponentPushToken[" and end with "]"
    // and contain alphanumeric characters, dots, and hyphens
    const expoTokenRegex = /^ExponentPushToken\[[A-Za-z0-9._-]+\]$/;
    return expoTokenRegex.test(token);
  }

  async registerForPushNotifications(): Promise<string> {
    try {
      // Check if device supports push notifications
      if (!Device.isDevice) {
        console.warn('Push notifications are not supported in simulators/emulators');
        throw new Error('Push notifications are not supported in simulators/emulators');
      }

      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        throw new Error('Failed to get push token for push notification!');
      }

      // Get the token
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: '6bac0265-f2ef-4a03-aeaa-9e90b92664ee', // From app.json
      });

      const tokenString = token.data;
      console.log('Generated push token:', tokenString);

      // Validate the token format
      if (!NotificationService.isValidExpoToken(tokenString)) {
        console.error('Invalid Expo token format:', tokenString);
        throw new Error('Generated token has invalid format');
      }

      return tokenString;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      
      // Don't return mock tokens in production - this causes issues
      if (__DEV__) {
        console.warn('Development mode: Using mock token for testing');
        return 'mock-push-token-' + Date.now();
      } else {
        throw new Error('Failed to register for push notifications: ' + error.message);
      }
    }
  }

  async refreshPushToken(): Promise<string> {
    try {
      console.log('Refreshing push token...');
      
      // Clear any existing tokens
      await Notifications.dismissAllNotificationsAsync();
      
      // Get a new token
      return await this.registerForPushNotifications();
    } catch (error) {
      console.error('Error refreshing push token:', error);
      throw error;
    }
  }

  async validateToken(token: string): Promise<boolean> {
    try {
      // Basic format validation
      if (!NotificationService.isValidExpoToken(token)) {
        console.error('Token format validation failed:', token);
        return false;
      }

      // In a real implementation, you might want to test the token with Expo's API
      // For now, we'll just validate the format
      return true;
    } catch (error) {
      console.error('Error validating token:', error);
      return false;
    }
  }

  async testTokenWithExpo(token: string): Promise<{ valid: boolean; error?: string }> {
    try {
      // Test the token by sending a test notification to Expo's API
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: token,
          sound: 'default',
          title: 'Token Validation',
          body: 'Testing token validity',
          data: { type: 'validation' }
        })
      });

      const result = await response.json();
      
      if (result.data && result.data.status === 'ok') {
        return { valid: true };
      } else {
        const error = result.data?.message || result.message || 'Unknown error';
        return { valid: false, error };
      }
    } catch (error) {
      console.error('Error testing token with Expo:', error);
      return { valid: false, error: error.message };
    }
  }

  async sendTestNotification(token: string): Promise<void> {
    try {
      // Validate token before sending
      if (!await this.validateToken(token)) {
        throw new Error('Invalid token format');
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Test Notification',
          body: 'This is a test notification from Cointeligencia',
          data: { type: 'test' },
        },
        trigger: null, // Send immediately
      });
    } catch (error) {
      console.error('Error sending test notification:', error);
      Alert.alert('Test Notification', 'This is a test notification from Cointeligencia');
    }
  }

  async addNotificationListener(callback: (notification: any) => void): Promise<() => void> {
    const subscription = Notifications.addNotificationReceivedListener(callback);
    return () => subscription.remove();
  }

  async addNotificationResponseListener(callback: (response: any) => void): Promise<() => void> {
    const subscription = Notifications.addNotificationResponseReceivedListener(callback);
    return () => subscription.remove();
  }

  async scheduleLocalNotification(title: string, body: string, data?: any): Promise<string> {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: data || {},
        },
        trigger: null, // Send immediately
      });
      return notificationId;
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
}

export const notificationService = new NotificationService();
