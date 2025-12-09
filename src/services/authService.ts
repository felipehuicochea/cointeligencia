import { apiService } from './apiService';
import { User, LoginResponse, RegisterDeviceResponse } from '../types';

class AuthService {
  async login(credentials: { email: string; deviceId: string; fcmToken?: string }): Promise<LoginResponse> {
    return apiService.login(credentials);
  }

  async registerDevice(deviceToken: string): Promise<RegisterDeviceResponse> {
    // This is now handled in the login method since the backend combines both operations
    return Promise.resolve({
      status: 'OK',
      message: 'Device already registered during login',
      deviceId: deviceToken
    });
  }

  async checkSubscription(): Promise<User> {
    // For now, return a mock user since the backend doesn't have this endpoint
    return Promise.resolve({
      _id: '123456789',
      email: 'user@example.com',
      telegramAlias: 'user',
      telegramId: '123456789',
      expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      licenseType: '02m',
      deviceId: 'device-123',
      isAppUser: true,
      isAdmin: false
    });
  }

  async logout(): Promise<void> {
    return apiService.logout();
  }

  async refreshToken(): Promise<{ token: string }> {
    return apiService.refreshToken();
  }

  async validateSession(): Promise<User> {
    return this.checkSubscription();
  }

  async updateDeviceToken(deviceToken: string): Promise<void> {
    return apiService.updateDeviceToken({
      email: '', // Will be filled from auth state
      deviceId: '', // Will be filled from auth state
      fcmToken: deviceToken
    });
  }
}

export const authService = new AuthService();
