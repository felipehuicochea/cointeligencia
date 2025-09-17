import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { AuthState, User, LoginResponse, RegisterDeviceResponse } from '../../types';
import { authService } from '../../services/authService';
import { secureStorageService } from '../../services/secureStorageService';

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

// Async thunks
export const loginUser = createAsyncThunk(
  'auth/login',
  async (credentials: { email: string; deviceId: string; fcmToken?: string }, { rejectWithValue }) => {
    try {
      const response = await authService.login(credentials);
      
      // Store session data securely
      if (response.data) {
        await secureStorageService.storeUserData(response.data);
      }
      if (credentials.email) {
        await secureStorageService.storeUserEmail(credentials.email);
      }
      if (credentials.deviceId) {
        await secureStorageService.storeDeviceId(credentials.deviceId);
      }
      
      // Store login timestamp
      await secureStorageService.storeLoginTimestamp();
      
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Login failed');
    }
  }
);

export const registerDevice = createAsyncThunk(
  'auth/registerDevice',
  async (deviceToken: string, { rejectWithValue }) => {
    try {
      const response = await authService.registerDevice(deviceToken);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Device registration failed');
    }
  }
);

export const checkSubscription = createAsyncThunk(
  'auth/checkSubscription',
  async (_, { rejectWithValue }) => {
    try {
      const response = await authService.checkSubscription();
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Subscription check failed');
    }
  }
);

export const logoutUser = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await authService.logout();
      
      // Clear stored session data
      await secureStorageService.clearAuthData();
      
      return true;
    } catch (error: any) {
      // Even if logout fails on server, clear local data
      try {
        await secureStorageService.clearAuthData();
      } catch (clearError) {
        console.error('Failed to clear local auth data:', clearError);
      }
      return rejectWithValue(error.message || 'Logout failed');
    }
  }
);

export const restoreSession = createAsyncThunk(
  'auth/restoreSession',
  async (_, { rejectWithValue }) => {
    try {
      // Check if we have stored session data
      const hasStoredSession = await secureStorageService.hasStoredSession();
      if (!hasStoredSession) {
        return { user: null, isAuthenticated: false };
      }

      // Get stored user data
      const userData = await secureStorageService.getUserData();
      const email = await secureStorageService.getUserEmail();
      const deviceId = await secureStorageService.getDeviceId();
      
      if (!userData || !email || !deviceId) {
        // Clear invalid session data
        await secureStorageService.clearAuthData();
        return { user: null, isAuthenticated: false };
      }

      // For now, we'll trust the stored session data since the backend doesn't have
      // a proper session validation endpoint. In a production app, you'd want to
      // validate with the backend.
      return { user: userData, isAuthenticated: true };
    } catch (error: any) {
      // Clear any corrupted session data
      try {
        await secureStorageService.clearAuthData();
      } catch (clearError) {
        console.error('Failed to clear corrupted session data:', clearError);
      }
      return rejectWithValue(error.message || 'Session restoration failed');
    }
  }
);

export const validateSession = createAsyncThunk(
  'auth/validateSession',
  async (_, { rejectWithValue }) => {
    try {
      const user = await authService.validateSession();
      return user;
    } catch (error: any) {
      // If validation fails, clear stored session data
      try {
        await secureStorageService.clearAuthData();
      } catch (clearError) {
        console.error('Failed to clear invalid session data:', clearError);
      }
      return rejectWithValue(error.message || 'Session validation failed');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action: PayloadAction<LoginResponse>) => {
        state.isLoading = false;
        state.user = action.payload.data;
        state.isAuthenticated = true;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Device Registration
      .addCase(registerDevice.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(registerDevice.fulfilled, (state, action: PayloadAction<RegisterDeviceResponse>) => {
        state.isLoading = false;
        if (state.user && action.payload.deviceId) {
          state.user.deviceId = action.payload.deviceId;
        }
      })
      .addCase(registerDevice.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Subscription Check
      .addCase(checkSubscription.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(checkSubscription.fulfilled, (state, action: PayloadAction<User>) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(checkSubscription.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.isAuthenticated = false;
        state.user = null;
      })
      // Logout
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.isAuthenticated = false;
        state.error = null;
      })
      // Session Restoration
      .addCase(restoreSession.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(restoreSession.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.isAuthenticated = action.payload.isAuthenticated;
        state.error = null;
      })
      .addCase(restoreSession.rejected, (state, action) => {
        state.isLoading = false;
        state.user = null;
        state.isAuthenticated = false;
        state.error = action.payload as string;
      })
      // Session Validation
      .addCase(validateSession.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(validateSession.fulfilled, (state, action: PayloadAction<User>) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(validateSession.rejected, (state, action) => {
        state.isLoading = false;
        state.user = null;
        state.isAuthenticated = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, setUser } = authSlice.actions;
export default authSlice.reducer;
