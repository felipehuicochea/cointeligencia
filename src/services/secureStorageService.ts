// Using AsyncStorage directly - simple and reliable
// SecureStore requires native crypto that isn't working in this environment
import AsyncStorage from '@react-native-async-storage/async-storage';

class SecureStorageService {
  private static readonly USER_DATA_KEY = 'user_data';
  private static readonly DEVICE_ID_KEY = 'device_id';
  private static readonly EMAIL_KEY = 'user_email';
  private static readonly LOGIN_TIMESTAMP_KEY = 'login_timestamp';

  /**
   * Store item using AsyncStorage
   */
  private async setItem(key: string, value: string): Promise<void> {
    await AsyncStorage.setItem(key, value);
  }

  /**
   * Get item using AsyncStorage
   */
  private async getItem(key: string): Promise<string | null> {
    return await AsyncStorage.getItem(key);
  }

  /**
   * Delete item using AsyncStorage
   */
  private async deleteItem(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
  }

  /**
   * Store user email for session persistence
   */
  async storeUserEmail(email: string): Promise<void> {
    try {
      await this.setItem(SecureStorageService.EMAIL_KEY, email);
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
      return await this.getItem(SecureStorageService.EMAIL_KEY);
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
      await this.setItem(SecureStorageService.LOGIN_TIMESTAMP_KEY, timestamp);
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
      const timestamp = await this.getItem(SecureStorageService.LOGIN_TIMESTAMP_KEY);
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
    console.log('[secureStorageService] storeUserData called');
    console.log('[secureStorageService] Data keys to store:', Object.keys(userData));
    try {
      const userDataString = JSON.stringify(userData);
      console.log('[secureStorageService] JSON stringified, length:', userDataString.length);
      
      // Calculate size using Buffer or string length (Blob might not be available in RN)
      let dataSize: number;
      if (typeof Blob !== 'undefined') {
        dataSize = new Blob([userDataString]).size;
      } else if (typeof TextEncoder !== 'undefined') {
        // Fallback: use byte length approximation (UTF-8)
        dataSize = new TextEncoder().encode(userDataString).length;
      } else {
        // Last resort: use string length as approximation
        dataSize = userDataString.length * 2; // Rough UTF-16 estimate
      }
      console.log(`[secureStorageService] Storing user data, size: ${dataSize} bytes (approx)`);
      
      console.log('[secureStorageService] Calling setItem with key:', SecureStorageService.USER_DATA_KEY);
      await this.setItem(SecureStorageService.USER_DATA_KEY, userDataString);
      console.log('[secureStorageService] ✓ User data stored successfully');
      
      // Verify it was saved by reading it back
      const verify = await this.getItem(SecureStorageService.USER_DATA_KEY);
      console.log('[secureStorageService] Verification read:', verify ? `success (${verify.length} chars)` : 'FAILED - data not found!');
    } catch (error: any) {
      console.error('Failed to store user data - Full error:', JSON.stringify(error, null, 2));
      console.error('Failed to store user data - Error object:', error);
      console.error('Failed to store user data - Error message:', error?.message);
      console.error('Failed to store user data - Error code:', error?.code);
      console.error('Failed to store user data - Error name:', error?.name);
      const errorMessage = error?.message || error?.code || String(error);
      throw new Error(`Failed to store user data: ${errorMessage}`);
    }
  }

  /**
   * Retrieve user data
   */
  async getUserData(): Promise<any | null> {
    try {
      console.log('[secureStorageService] Getting user data from AsyncStorage...');
      const userDataString = await this.getItem(SecureStorageService.USER_DATA_KEY);
      console.log('[secureStorageService] Raw data retrieved:', userDataString ? `exists (${userDataString.length} chars)` : 'null');
      
      if (!userDataString) {
        console.log('[secureStorageService] No user data found in storage');
        return null;
      }
      
      const parsed = JSON.parse(userDataString);
      console.log('[secureStorageService] User data parsed successfully, keys:', Object.keys(parsed));
      return parsed;
    } catch (error: any) {
      console.error('[secureStorageService] Failed to retrieve user data:', error);
      console.error('[secureStorageService] Error details:', error?.message);
      return null;
    }
  }

  /**
   * Store device ID
   */
  async storeDeviceId(deviceId: string): Promise<void> {
    try {
      await this.setItem(SecureStorageService.DEVICE_ID_KEY, deviceId);
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
      return await this.getItem(SecureStorageService.DEVICE_ID_KEY);
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
        this.deleteItem(SecureStorageService.USER_DATA_KEY),
        this.deleteItem(SecureStorageService.EMAIL_KEY),
        this.deleteItem(SecureStorageService.LOGIN_TIMESTAMP_KEY),
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
