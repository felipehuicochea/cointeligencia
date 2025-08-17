import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { notificationService } from '../../services/notificationService';

interface NotificationsState {
  token: string | null;
  isRegistered: boolean;
  isLoading: boolean;
  error: string | null;
  lastTokenRefresh: number | null;
}

const initialState: NotificationsState = {
  token: null,
  isRegistered: false,
  isLoading: false,
  error: null,
  lastTokenRefresh: null,
};

// Async thunks
export const registerForPushNotifications = createAsyncThunk(
  'notifications/register',
  async (_, { rejectWithValue }) => {
    try {
      const token = await notificationService.registerForPushNotifications();
      return token;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to register for notifications');
    }
  }
);

export const testToken = createAsyncThunk(
  'notifications/testToken',
  async (_, { rejectWithValue, getState }) => {
    try {
      const state = getState() as any;
      const token = state.notifications.token;
      if (!token) {
        throw new Error('No notification token available');
      }
      
      const result = await notificationService.testTokenWithExpo(token);
      return result;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to test token');
    }
  }
);

export const refreshPushToken = createAsyncThunk(
  'notifications/refreshToken',
  async (_, { rejectWithValue }) => {
    try {
      const token = await notificationService.refreshPushToken();
      return token;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to refresh push token');
    }
  }
);

export const sendTestNotification = createAsyncThunk(
  'notifications/sendTest',
  async (_, { rejectWithValue, getState }) => {
    try {
      const state = getState() as any;
      const token = state.notifications.token;
      if (!token) {
        throw new Error('No notification token available');
      }
      
      // Validate token before sending
      const isValid = await notificationService.validateToken(token);
      if (!isValid) {
        throw new Error('Invalid notification token. Please refresh the token.');
      }
      
      await notificationService.sendTestNotification(token);
      return true;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to send test notification');
    }
  }
);

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    setToken: (state, action: PayloadAction<string>) => {
      state.token = action.payload;
      state.lastTokenRefresh = Date.now();
    },
    setRegistrationStatus: (state, action: PayloadAction<boolean>) => {
      state.isRegistered = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    clearToken: (state) => {
      state.token = null;
      state.isRegistered = false;
      state.lastTokenRefresh = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Register for notifications
      .addCase(registerForPushNotifications.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(registerForPushNotifications.fulfilled, (state, action: PayloadAction<string>) => {
        state.isLoading = false;
        state.token = action.payload;
        state.isRegistered = true;
        state.lastTokenRefresh = Date.now();
      })
      .addCase(registerForPushNotifications.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.isRegistered = false;
      })
      // Refresh token
      .addCase(refreshPushToken.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(refreshPushToken.fulfilled, (state, action: PayloadAction<string>) => {
        state.isLoading = false;
        state.token = action.payload;
        state.isRegistered = true;
        state.lastTokenRefresh = Date.now();
      })
      .addCase(refreshPushToken.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.isRegistered = false;
      })
      // Send test notification
      .addCase(sendTestNotification.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(sendTestNotification.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(sendTestNotification.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Test token
      .addCase(testToken.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(testToken.fulfilled, (state, action) => {
        state.isLoading = false;
        if (!action.payload.valid) {
          state.error = `Token validation failed: ${action.payload.error}`;
        }
      })
      .addCase(testToken.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setToken, setRegistrationStatus, clearError, clearToken } = notificationsSlice.actions;
export default notificationsSlice.reducer;
