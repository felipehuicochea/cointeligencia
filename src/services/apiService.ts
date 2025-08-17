import * as SecureStore from 'expo-secure-store';

// Use environment variables or fallback to development values
// For React Native, we need to use a different approach for environment variables
const API_BASE_URL = 'https://backend.cointeligencia.com/api';
const DEFAULT_API_SECRET = 'rzBHWKvWNeFinffP96YaiKVB'; // Fallback for development

interface ApiConfig {
  baseURL: string;
  headers: Record<string, string>;
}

class ApiService {
  private config: ApiConfig = {
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  private async getHeaders(): Promise<Record<string, string>> {
    return {
      ...this.config.headers,
    };
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  async get<T>(endpoint: string): Promise<T> {
    const headers = await this.getHeaders();
    const response = await fetch(`${this.config.baseURL}${endpoint}`, {
      method: 'GET',
      headers,
    });
    return this.handleResponse<T>(response);
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    const headers = await this.getHeaders();
    const response = await fetch(`${this.config.baseURL}${endpoint}`, {
      method: 'POST',
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });
    return this.handleResponse<T>(response);
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    const headers = await this.getHeaders();
    const response = await fetch(`${this.config.baseURL}${endpoint}`, {
      method: 'PUT',
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });
    return this.handleResponse<T>(response);
  }

  async delete<T>(endpoint: string): Promise<T> {
    const headers = await this.getHeaders();
    const response = await fetch(`${this.config.baseURL}${endpoint}`, {
      method: 'DELETE',
      headers,
    });
    return this.handleResponse<T>(response);
  }

  // Auth methods - working with current backend spec
  async login(credentials: { email: string; deviceId: string }) {
    // Get API secret from secure storage or use default
    const apiSecret = await SecureStore.getItemAsync('api_secret') || DEFAULT_API_SECRET;
    
    const headers = {
      ...this.config.headers,
      'Authorization': `Bearer ${apiSecret}`
    };
    
    const response = await fetch(`${this.config.baseURL}/users/register_device`, {
      method: 'POST',
      headers,
      body: JSON.stringify(credentials),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    
    // Since the backend only returns success message, we need to create a mock user
    // In a real implementation, you might want to add a separate endpoint to get user data
    const mockUser = {
      _id: '123456789',
      email: credentials.email,
      telegramAlias: 'user',
      telegramId: '123456789',
      expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      licenseType: '02m',
      deviceId: credentials.deviceId,
      isAppUser: true,
      isAdmin: false
    };
    
    return {
      status: result.status,
      data: mockUser,
      message: result.message
    };
  }

  async logout() {
    // Clear stored credentials
    await SecureStore.deleteItemAsync('api_secret');
    return Promise.resolve();
  }

  async refreshToken() {
    // Not needed for this simplified auth flow
    return Promise.resolve({ token: '' });
  }

  // Secure storage methods for credentials
  async storeApiSecret(secret: string): Promise<void> {
    await SecureStore.setItemAsync('api_secret', secret);
  }

  async getApiSecret(): Promise<string | null> {
    return await SecureStore.getItemAsync('api_secret');
  }

  async clearApiSecret(): Promise<void> {
    await SecureStore.deleteItemAsync('api_secret');
  }
}

export const apiService = new ApiService();
