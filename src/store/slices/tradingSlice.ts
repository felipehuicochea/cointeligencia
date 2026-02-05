import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { TradingConfig, ExchangeCredentials, TradeAlert, TradeHistory, TradingMode, TradingStrategy } from '../../types';
import { tradingService, ExchangeOrderResponse } from '../../services/tradingService';
import { credentialValidationService, ValidationResult } from '../../services/credentialValidationService';

const initialState = {
  config: {
    mode: 'MANUAL' as TradingMode,
    defaultExchange: null,
    riskLevel: 'medium' as const,
    maxPositionSize: 1000,
    stopLossPercentage: 5.3,
    takeProfitPercentage: 77,
    orderSizeType: 'percentage' as const,
    orderSizeValue: 100, // 100% of balance by default
    testMode: false, // Default to live mode
    enabledStrategies: ['intraday'] as TradingStrategy[], // Default to Intraday strategy enabled
    multientryBaseAmount: 100, // Default base amount (x) for Multientry strategy in USD
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
      console.log('Redux thunk: Starting saveCredentials for exchange:', credentials.exchange);
      const response = await tradingService.saveCredentials(credentials);
      console.log('Redux thunk: saveCredentials successful');
      return response;
    } catch (error: any) {
      console.error('Redux thunk: saveCredentials error:', error);
      console.error('Redux thunk: Error message:', error?.message);
      console.error('Redux thunk: Error code:', error?.code);
      console.error('Redux thunk: Full error:', JSON.stringify(error, null, 2));
      const errorMessage = error?.message || error?.code || String(error) || 'Failed to save credentials';
      return rejectWithValue(errorMessage);
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

export const loadCredentials = createAsyncThunk(
  'trading/loadCredentials',
  async (_, { rejectWithValue }) => {
    try {
      console.log('[Redux] loadCredentials thunk called');
      const credentials = await tradingService.getCredentials();
      console.log('[Redux] loadCredentials completed, count:', credentials.length);
      return credentials;
    } catch (error: any) {
      console.error('[Redux] loadCredentials failed:', error);
      return rejectWithValue(error.message || 'Failed to load credentials');
    }
  }
);

export const loadTradingConfig = createAsyncThunk(
  'trading/loadConfig',
  async (_, { rejectWithValue }) => {
    try {
      console.log('[Redux] loadTradingConfig thunk called');
      const config = await tradingService.getConfig();
      console.log('[Redux] loadTradingConfig completed');
      return config;
    } catch (error: any) {
      console.error('[Redux] loadTradingConfig failed:', error);
      return rejectWithValue(error.message || 'Failed to load config');
    }
  }
);

export const removeCredentials = createAsyncThunk(
  'trading/removeCredentials',
  async (credentialId: string, { rejectWithValue }) => {
    try {
      await tradingService.deleteCredentials(credentialId);
      return credentialId;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to remove credentials');
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
    updateTradeStatus: (state, action: PayloadAction<{ id: string; status: TradeAlert['status']; executedPrice?: number; error?: string; apiResponse?: string }>) => {
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
        if (action.payload.apiResponse !== undefined) {
          alert.apiResponse = action.payload.apiResponse;
        }
      }
    },
    clearTradeHistory: (state) => {
      state.history.alerts = [];
    },
    clearIgnoredAlerts: (state) => {
      // Remove only alerts with status 'ignored', keep executed, pending, and failed
      state.history.alerts = state.history.alerts.filter(alert => alert.status !== 'ignored');
    },
    setTradingMode: (state, action: PayloadAction<TradingMode>) => {
      state.config.mode = action.payload;
    },
    setTestMode: (state, action: PayloadAction<boolean>) => {
      state.config.testMode = action.payload;
    },
    setOrderSizeType: (state, action: PayloadAction<'percentage' | 'fixed'>) => {
      state.config.orderSizeType = action.payload;
    },
    setOrderSizeValue: (state, action: PayloadAction<number>) => {
      state.config.orderSizeValue = action.payload;
    },
    setMaxPositionSize: (state, action: PayloadAction<number>) => {
      state.config.maxPositionSize = action.payload;
    },
    setStopLossPercentage: (state, action: PayloadAction<number>) => {
      state.config.stopLossPercentage = action.payload;
    },
    setTakeProfitPercentage: (state, action: PayloadAction<number>) => {
      state.config.takeProfitPercentage = action.payload;
    },
    setMultientryBaseAmount: (state, action: PayloadAction<number>) => {
      state.config.multientryBaseAmount = action.payload;
    },
    toggleStrategy: (state, action: PayloadAction<TradingStrategy>) => {
      const strategy = action.payload;
      const index = state.config.enabledStrategies.indexOf(strategy);
      if (index >= 0) {
        // Disable strategy (but keep at least one enabled)
        if (state.config.enabledStrategies.length > 1) {
          state.config.enabledStrategies.splice(index, 1);
        }
      } else {
        // Enable strategy
        state.config.enabledStrategies.push(strategy);
      }
    },
    setEnabledStrategies: (state, action: PayloadAction<TradingStrategy[]>) => {
      // Ensure at least one strategy is enabled
      if (action.payload.length > 0) {
        state.config.enabledStrategies = action.payload;
      }
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
      // Load Credentials
      .addCase(loadCredentials.fulfilled, (state, action: PayloadAction<ExchangeCredentials[]>) => {
        state.credentials = action.payload;
      })
      // Update Config
      .addCase(updateTradingConfig.fulfilled, (state, action: PayloadAction<TradingConfig>) => {
        state.config = { ...state.config, ...action.payload };
      })
      // Load Config
      .addCase(loadTradingConfig.fulfilled, (state, action: PayloadAction<TradingConfig>) => {
        state.config = action.payload;
      })
      // Remove Credentials
      .addCase(removeCredentials.fulfilled, (state, action: PayloadAction<string>) => {
        state.credentials = state.credentials.filter(c => c.id !== action.payload);
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
        // Merge alerts from storage with existing Redux state to avoid losing newly added alerts
        // Create a map of existing alerts by ID for quick lookup
        const existingAlertsMap = new Map(state.history.alerts.map(alert => [alert.id, alert]));
        
        // Add or update alerts from storage
        action.payload.forEach(alert => {
          existingAlertsMap.set(alert.id, alert);
        });
        
        // Convert back to array and sort by timestamp (newest first)
        state.history.alerts = Array.from(existingAlertsMap.values()).sort((a, b) => {
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        });
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
      .addCase(ignoreTrade.rejected, (state, action) => {
        // Handle ignore trade failure
        console.error('Failed to ignore trade:', action.payload);
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
          if (action.payload.response.rawApiResponse) {
            alert.apiResponse = action.payload.response.rawApiResponse;
          }
        }
      })
      .addCase(processTradeAlert.rejected, (state, action) => {
        const alertId = action.meta.arg.alert.id;
        const alert = state.history.alerts.find(a => a.id === alertId);
        if (alert) {
          alert.status = 'failed';
          alert.error = action.payload as string;
          // Try to extract API response from error if available
          try {
            const errorMessage = action.payload as string;
            if (errorMessage.includes('rawResponse')) {
              // Error might contain raw response info - could be parsed if needed
            }
          } catch {
            // Ignore parsing errors
          }
        }
      });
  },
});

export const { 
  addTradeAlert, 
  updateTradeStatus, 
  clearTradeHistory, 
  clearIgnoredAlerts,
  setTradingMode,
  setTestMode, 
  setOrderSizeType, 
  setOrderSizeValue, 
  setMaxPositionSize,
  setStopLossPercentage,
  setTakeProfitPercentage,
  setMultientryBaseAmount,
  toggleStrategy,
  setEnabledStrategies
} = tradingSlice.actions;

export default tradingSlice.reducer;
