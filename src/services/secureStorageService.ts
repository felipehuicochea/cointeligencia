import * as SecureStore from 'expo-secure-store';

class SecureStorageService {
  private static readonly USER_DATA_KEY = 'user_data';
  private static readonly DEVICE_ID_KEY = 'device_id';
  private static readonly EMAIL_KEY = 'user_email';
  private static readonly LOGIN_TIMESTAMP_KEY = 'login_timestamp';

  /**
   * Store user email for session persistence
   */
  async storeUserEmail(email: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(SecureStorageService.EMAIL_KEY, email);
    } catch (error) {
      console.error('Failed to store user email:', error);
      throw new Error('Failed to store user email');
    }
  }

  /**
   * Retrieve user email
   */
  async getUserEmail(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(SecureStorageService.EMAIL_KEY);
    } catch (error) {
      console.error('Failed to retrieve user email:', error);
      return null;
    }
  }

  /**
   * Store login timestamp
   */
  async storeLoginTimestamp(): Promise<void> {
    try {
      const timestamp = Date.now().toString();
      await SecureStore.setItemAsync(SecureStorageService.LOGIN_TIMESTAMP_KEY, timestamp);
    } catch (error) {
      console.error('Failed to store login timestamp:', error);
      throw new Error('Failed to store login timestamp');
    }
  }

  /**
   * Retrieve login timestamp
   */
  async getLoginTimestamp(): Promise<number | null> {
    try {
      const timestamp = await SecureStore.getItemAsync(SecureStorageService.LOGIN_TIMESTAMP_KEY);
      return timestamp ? parseInt(timestamp, 10) : null;
    } catch (error) {
      console.error('Failed to retrieve login timestamp:', error);
      return null;
    }
  }

  /**
   * Store user data securely
   */
  async storeUserData(userData: any): Promise<void> {
    try {
      const userDataString = JSON.stringify(userData);
      await SecureStore.setItemAsync(SecureStorageService.USER_DATA_KEY, userDataString);
    } catch (error) {
      console.error('Failed to store user data:', error);
      throw new Error('Failed to store user data');
    }
  }

  /**
   * Retrieve user data
   */
  async getUserData(): Promise<any | null> {
    try {
      const userDataString = await SecureStore.getItemAsync(SecureStorageService.USER_DATA_KEY);
      return userDataString ? JSON.parse(userDataString) : null;
    } catch (error) {
      console.error('Failed to retrieve user data:', error);
      return null;
    }
  }

  /**
   * Store device ID
   */
  async storeDeviceId(deviceId: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(SecureStorageService.DEVICE_ID_KEY, deviceId);
    } catch (error) {
      console.error('Failed to store device ID:', error);
      throw new Error('Failed to store device ID');
    }
  }

  /**
   * Retrieve device ID
   */
  async getDeviceId(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(SecureStorageService.DEVICE_ID_KEY);
    } catch (error) {
      console.error('Failed to retrieve device ID:', error);
      return null;
    }
  }

  /**
   * Clear all stored authentication data
   */
  async clearAuthData(): Promise<void> {
    try {
      await Promise.all([
        SecureStore.deleteItemAsync(SecureStorageService.USER_DATA_KEY),
        SecureStore.deleteItemAsync(SecureStorageService.EMAIL_KEY),
        SecureStore.deleteItemAsync(SecureStorageService.LOGIN_TIMESTAMP_KEY),
        // Keep device ID as it's not sensitive and useful for re-login
      ]);
    } catch (error) {
      console.error('Failed to clear auth data:', error);
      throw new Error('Failed to clear authentication data');
    }
  }

  /**
   * Check if user has stored session data
   */
  async hasStoredSession(): Promise<boolean> {
    try {
      const email = await this.getUserEmail();
      const userData = await this.getUserData();
      const loginTimestamp = await this.getLoginTimestamp();
      
      // Check if session is not too old (e.g., 30 days)
      const maxSessionAge = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
      const isSessionValid = loginTimestamp && (Date.now() - loginTimestamp) < maxSessionAge;
      
      return !!(email && userData && isSessionValid);
    } catch (error) {
      console.error('Failed to check stored session:', error);
      return false;
    }
  }
}

export const secureStorageService = new SecureStorageService();
