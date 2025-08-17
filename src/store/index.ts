import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import tradingReducer from './slices/tradingSlice';
import notificationsReducer from './slices/notificationsSlice';
import languageReducer from './slices/languageSlice';

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
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
