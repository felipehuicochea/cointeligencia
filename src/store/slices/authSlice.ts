import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { AuthState, User, LoginResponse, RegisterDeviceResponse } from '../../types';
import { authService } from '../../services/authService';

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

// Async thunks
export const loginUser = createAsyncThunk(
  'auth/login',
  async (credentials: { email: string; deviceId: string }, { rejectWithValue }) => {
    try {
      const response = await authService.login(credentials);
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
      return true;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Logout failed');
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
      });
  },
});

export const { clearError, setUser } = authSlice.actions;
export default authSlice.reducer;
