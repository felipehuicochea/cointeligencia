import { configureStore, Middleware } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import tradingReducer from './slices/tradingSlice';
import notificationsReducer from './slices/notificationsSlice';
import languageReducer from './slices/languageSlice';
import { tradingService } from '../services/tradingService';

// Middleware to persist trading config changes
const persistTradingConfigMiddleware: Middleware = (store) => (next) => (action: any) => {
  const result = next(action);
  
  // List of actions that modify trading config
  const configActions = [
    'trading/setTradingMode',
    'trading/setTestMode',
    'trading/setOrderSizeType',
    'trading/setOrderSizeValue',
    'trading/setMaxPositionSize',
    'trading/setStopLossPercentage',
    'trading/setTakeProfitPercentage',
    'trading/setMultientryBaseAmount',
    'trading/toggleStrategy',
    'trading/setEnabledStrategies',
  ];
  
  // Persist config if a config-modifying action was dispatched
  if (configActions.includes(action.type)) {
    const state = store.getState();
    const config = state.trading.config;
    
    // Persist config asynchronously (don't block the action)
    tradingService.updateConfig(config).catch(err => {
      console.error('Failed to persist trading config:', err);
    });
  }
  
  return result;
};

export const store = configureStore({
  reducer: {
    auth: authReducer,
    trading: tradingReducer,
    notifications: notificationsReducer,
    language: languageReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }).concat(persistTradingConfigMiddleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
