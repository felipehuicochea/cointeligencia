import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { TradingConfig, ExchangeCredentials, TradeAlert, TradeHistory, TradingMode } from '../../types';
import { tradingService, ExchangeOrderResponse } from '../../services/tradingService';
import { credentialValidationService, ValidationResult } from '../../services/credentialValidationService';

const initialState = {
  config: {
    mode: 'MANUAL' as TradingMode,
    defaultExchange: null,
    riskLevel: 'medium' as const,
    maxPositionSize: 1000,
    stopLossPercentage: 5,
    orderSizeType: 'percentage' as const,
    orderSizeValue: 100, // 100% of balance by default
  } as TradingConfig,
  credentials: [] as ExchangeCredentials[],
  history: {
    alerts: [] as TradeAlert[],
    isLoading: false,
    error: null,
  } as TradeHistory,
  validation: {
    isLoading: false,
    error: null,
    result: null as ValidationResult | null,
  },
};

// Async thunks
export const validateCredentials = createAsyncThunk(
  'trading/validateCredentials',
  async (credentials: Omit<ExchangeCredentials, 'id' | 'createdAt'>, { rejectWithValue }) => {
    try {
      const result = await credentialValidationService.validateCredentials(credentials);
      return result;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to validate credentials');
    }
  }
);

export const saveCredentials = createAsyncThunk(
  'trading/saveCredentials',
  async (credentials: Omit<ExchangeCredentials, 'id' | 'createdAt'>, { rejectWithValue }) => {
    try {
      const response = await tradingService.saveCredentials(credentials);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to save credentials');
    }
  }
);

export const updateTradingConfig = createAsyncThunk(
  'trading/updateConfig',
  async (config: Partial<TradingConfig>, { rejectWithValue }) => {
    try {
      const response = await tradingService.updateConfig(config);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update config');
    }
  }
);

export const executeTrade = createAsyncThunk(
  'trading/executeTrade',
  async (alert: TradeAlert, { rejectWithValue }) => {
    try {
      const response = await tradingService.executeTrade(alert);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Trade execution failed');
    }
  }
);

export const fetchTradeHistory = createAsyncThunk(
  'trading/fetchHistory',
  async (_, { rejectWithValue }) => {
    try {
      const response = await tradingService.getTradeHistory();
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch history');
    }
  }
);

export const ignoreTrade = createAsyncThunk(
  'trading/ignoreTrade',
  async (alertId: string, { rejectWithValue }) => {
    try {
      const response = await tradingService.ignoreTrade(alertId);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to ignore trade');
    }
  }
);

export const processTradeAlert = createAsyncThunk(
  'trading/processAlert',
  async (
    { alert, config, credentials }: { 
      alert: TradeAlert; 
      config: TradingConfig; 
      credentials: ExchangeCredentials[] 
    }, 
    { rejectWithValue }
  ) => {
    try {
      const response = await tradingService.processTradeAlert(alert, config, credentials);
      return { alert, response };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to process trade alert');
    }
  }
);

const tradingSlice = createSlice({
  name: 'trading',
  initialState,
  reducers: {
    addTradeAlert: (state, action: PayloadAction<TradeAlert>) => {
      state.history.alerts.unshift(action.payload);
    },
    updateTradeStatus: (state, action: PayloadAction<{ id: string; status: TradeAlert['status']; executedPrice?: number; error?: string }>) => {
      const alert = state.history.alerts.find(a => a.id === action.payload.id);
      if (alert) {
        alert.status = action.payload.status;
        if (action.payload.executedPrice) {
          alert.executedPrice = action.payload.executedPrice;
          alert.executedAt = new Date().toISOString();
        }
        if (action.payload.error) {
          alert.error = action.payload.error;
        }
      }
    },
    clearTradeHistory: (state) => {
      state.history.alerts = [];
    },
    setTradingMode: (state, action: PayloadAction<TradingMode>) => {
      state.config.mode = action.payload;
    },
    setOrderSizeType: (state, action: PayloadAction<'percentage' | 'fixed'>) => {
      state.config.orderSizeType = action.payload;
    },
    setOrderSizeValue: (state, action: PayloadAction<number>) => {
      state.config.orderSizeValue = action.payload;
    },
    removeCredentials: (state, action: PayloadAction<string>) => {
      state.credentials = state.credentials.filter(c => c.id !== action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      // Validate Credentials
      .addCase(validateCredentials.pending, (state) => {
        state.validation.isLoading = true;
        state.validation.error = null;
        state.validation.result = null;
      })
      .addCase(validateCredentials.fulfilled, (state, action: PayloadAction<ValidationResult>) => {
        state.validation.isLoading = false;
        state.validation.result = action.payload;
      })
      .addCase(validateCredentials.rejected, (state, action) => {
        state.validation.isLoading = false;
        state.validation.error = action.payload as string;
      })
      // Save Credentials
      .addCase(saveCredentials.fulfilled, (state, action: PayloadAction<ExchangeCredentials>) => {
        const existingIndex = state.credentials.findIndex(c => c.id === action.payload.id);
        if (existingIndex >= 0) {
          state.credentials[existingIndex] = action.payload;
        } else {
          state.credentials.push(action.payload);
        }
      })
      // Update Config
      .addCase(updateTradingConfig.fulfilled, (state, action: PayloadAction<TradingConfig>) => {
        state.config = { ...state.config, ...action.payload };
      })
      // Execute Trade
      .addCase(executeTrade.fulfilled, (state, action: PayloadAction<TradeAlert>) => {
        const alert = state.history.alerts.find(a => a.id === action.payload.id);
        if (alert) {
          alert.status = action.payload.status;
          alert.executedPrice = action.payload.executedPrice;
          alert.executedAt = action.payload.executedAt;
        }
      })
      .addCase(executeTrade.rejected, (state, action) => {
        // Handle trade execution failure
        const alertId = action.meta.arg.id;
        const alert = state.history.alerts.find(a => a.id === alertId);
        if (alert) {
          alert.status = 'failed';
          alert.error = action.payload as string;
        }
      })
      // Fetch History
      .addCase(fetchTradeHistory.pending, (state) => {
        state.history.isLoading = true;
        state.history.error = null;
      })
      .addCase(fetchTradeHistory.fulfilled, (state, action: PayloadAction<TradeAlert[]>) => {
        state.history.isLoading = false;
        state.history.alerts = action.payload;
      })
      .addCase(fetchTradeHistory.rejected, (state, action) => {
        state.history.isLoading = false;
        state.history.error = action.payload as string;
      })
      // Ignore Trade
      .addCase(ignoreTrade.fulfilled, (state, action: PayloadAction<TradeAlert>) => {
        const alert = state.history.alerts.find(a => a.id === action.payload.id);
        if (alert) {
          alert.status = 'ignored';
        }
      })
      // Process Trade Alert
      .addCase(processTradeAlert.pending, (state, action) => {
        const alert = state.history.alerts.find(a => a.id === action.meta.arg.alert.id);
        if (alert) {
          alert.status = 'pending';
        }
      })
      .addCase(processTradeAlert.fulfilled, (state, action: PayloadAction<{ alert: TradeAlert; response: ExchangeOrderResponse }>) => {
        const alert = state.history.alerts.find(a => a.id === action.payload.alert.id);
        if (alert) {
          alert.status = action.payload.response.status === 'filled' ? 'executed' : 'failed';
          alert.executedPrice = action.payload.response.executedPrice;
          alert.executedAt = action.payload.response.timestamp;
          if (action.payload.response.error) {
            alert.error = action.payload.response.error;
          }
        }
      })
      .addCase(processTradeAlert.rejected, (state, action) => {
        const alertId = action.meta.arg.alert.id;
        const alert = state.history.alerts.find(a => a.id === alertId);
        if (alert) {
          alert.status = 'failed';
          alert.error = action.payload as string;
        }
      });
  },
});

export const { 
  addTradeAlert, 
  updateTradeStatus, 
  clearTradeHistory, 
  setTradingMode, 
  setOrderSizeType, 
  setOrderSizeValue, 
  removeCredentials 
} = tradingSlice.actions;

export default tradingSlice.reducer;
