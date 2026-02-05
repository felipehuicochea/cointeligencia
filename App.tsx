import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import './src/config/firebase'; // Initialize Firebase
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Provider } from 'react-redux';
import { store } from './src/store';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from './src/store';
import { StatusBar } from 'expo-status-bar';
import { PaperProvider, MD3LightTheme } from 'react-native-paper';
import { colors } from './src/theme/colors';
import { initializeLanguage } from './src/store/slices/languageSlice';
import { firebaseNotificationService } from './src/services/firebaseNotificationService';
import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import { addTradeAlert, processTradeAlert, loadCredentials, loadTradingConfig } from './src/store/slices/tradingSlice';
import { restoreSession, updateDeviceToken } from './src/store/slices/authSlice';
import { setToken } from './src/store/slices/notificationsSlice';
import { TradeAlert } from './src/types';
import { tradingService } from './src/services/tradingService';
import { AppState, Alert, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { versionCheckService } from './src/services/versionCheckService';
import { i18n } from './src/i18n';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import AlertsLogScreen from './src/screens/AlertsLogScreen';
import TestApiConfigScreen from './src/screens/TestApiConfigScreen';

// Icons
import { MaterialIcons } from '@expo/vector-icons';
import { View, StyleSheet } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Loading Screen Component
const LoadingScreen = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color={colors.primary} />
    <Text style={styles.loadingText}>Loading...</Text>
  </View>
);

// Settings Stack Navigator (nested)
const SettingsStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.textPrimary,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen 
        name="SettingsMain" 
        component={SettingsScreen}
        options={{ title: 'Settings', headerShown: false }}
      />
      <Stack.Screen 
        name="TestApiConfig" 
        component={TestApiConfigScreen}
        options={{ title: 'Test API Configuration' }}
      />
    </Stack.Navigator>
  );
};

// Main Tab Navigator
const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof MaterialIcons.glyphMap;

          if (route.name === 'Dashboard') {
            iconName = 'dashboard';
          } else if (route.name === 'Alerts') {
            iconName = 'notifications';
          } else if (route.name === 'Settings') {
            iconName = 'settings';
          } else {
            iconName = 'home';
          }

          return <MaterialIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Alerts" component={AlertsLogScreen} />
      <Tab.Screen name="Settings" component={SettingsStack} />
    </Tab.Navigator>
  );
};

// Process pending notifications from AsyncStorage (fallback for edge cases)
// Note: Background handler now processes notifications immediately, so this is mainly for
// notifications that might have failed to process or edge cases
const processPendingNotifications = async (
  dispatch: AppDispatch,
  config: any,
  credentials: any
) => {
  try {
    console.log('[App] Checking for any missed pending notifications (fallback)...');
    const pendingNotificationsJson = await AsyncStorage.getItem('pending_notifications');
    
    if (!pendingNotificationsJson) {
      console.log('[App] No pending notifications found');
      return;
    }
    
    const pendingNotifications = JSON.parse(pendingNotificationsJson);
    console.log('[App] Found', pendingNotifications.length, 'pending notifications (should be empty if background handler worked)');
    
    // Process each pending notification
    for (const notificationData of pendingNotifications) {
      if (notificationData.processed) {
        continue; // Skip already processed notifications
      }
      
      try {
        const messageData = notificationData.data || {};
        const hasTradingFields = messageData.pair || messageData.symbol || messageData.side || messageData.price;
        const alertType = messageData.type || messageData.type;
        const isTradingAlert = alertType === 'trading_alert' || 
                              alertType === 'trade_alert' || 
                              (hasTradingFields && !messageData.type);
        
        if (isTradingAlert) {
          console.log('[App] Processing missed pending trading alert:', JSON.stringify(messageData, null, 2));
          
          const tradeAlert = convertMessageToTradeAlert(messageData);
          console.log('[App] Converted pending trade alert:', JSON.stringify(tradeAlert, null, 2));
          
          // Store the alert locally (might already be stored, but ensure it's in Redux)
          await tradingService.storeTradeAlert(tradeAlert);
          console.log('[App] Pending alert stored locally');
          
          // Add to trade history in Redux store
          dispatch(addTradeAlert(tradeAlert));
          console.log('[App] Pending alert added to Redux store');
          
          // Auto-execute if in AUTO mode (might have already executed, but ensure it's done)
          if (config.mode === 'AUTO') {
            try {
              await dispatch(processTradeAlert({
                alert: tradeAlert,
                config,
                credentials
              })).unwrap();
              console.log('[App] Auto-executed pending trade alert:', tradeAlert.id);
            } catch (error) {
              console.error('[App] Failed to auto-execute pending trade:', error);
            }
          }
          
          // Mark as processed
          notificationData.processed = true;
        } else {
          notificationData.processed = true;
        }
      } catch (error) {
        console.error('[App] Error processing pending notification:', error);
        notificationData.processed = true;
      }
    }
    
    // Clear all processed notifications
    await AsyncStorage.removeItem('pending_notifications');
    console.log('[App] Cleared pending notifications storage');
  } catch (error) {
    console.error('[App] Error processing pending notifications:', error);
  }
};

// Convert backend message to TradeAlert
// Note: FCM sends all data values as strings, so we need to parse them
const convertMessageToTradeAlert = (message: any): TradeAlert => {
  // Map backend side codes to frontend side codes
  const sideMapping: { [key: string]: 'BUY' | 'SELL' } = {
    'L': 'BUY',   // Long
    'S': 'SELL',  // Short
    'C': 'SELL',  // Close (treat as sell for now)
    'CL': 'SELL', // Close Long
    'CS': 'BUY',  // Close Short (buy to cover)
  };

  // Default values for missing fields
  const defaultQuantity = 1.0; // Default quantity if not specified
  const defaultExchange = 'binance'; // Default exchange

  // FCM sends all data as strings, so we need to parse numeric values
  // Also handle both string keys and direct access
  const getValue = (key: string, altKey?: string): any => {
    const value = message[key] || message[altKey || ''] || '';
    return value;
  };

  const parseFloatSafe = (value: any): number => {
    if (value === null || value === undefined || value === '') return 0;
    const parsed = typeof value === 'string' ? parseFloat(value) : Number(value);
    return isNaN(parsed) ? 0 : parsed;
  };

  const sideValue = getValue('side', 'SIDE');
  const quantityValue = getValue('quantity', 'QUANTITY');
  const priceValue = getValue('price', 'PRICE');
  const stopLossValue = getValue('stopLoss', 'STOP_LOSS');
  const takeProfitValue = getValue('takeProfit', 'TAKE_PROFIT');

  // Get additional fields that might be present
  const alertField = getValue('alert') || getValue('ALERT');
  const pairField = getValue('pair') || getValue('PAIR');
  const symbolField = getValue('symbol') || getValue('SYMBOL');
  const actionField = getValue('action') || getValue('ACTION');
  const timeframeField = getValue('timeframe') || getValue('TIMEFRAME') || getValue('timeFrame') || getValue('TIMEFRAME');
  const aliasField = getValue('alias') || getValue('ALIAS');

  return {
    id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    symbol: (symbolField || pairField || 'UNKNOWN').toString(),
    side: sideMapping[sideValue?.toString().toUpperCase()] || (actionField?.toString().toUpperCase() === 'SELL' ? 'SELL' : 'BUY'),
    quantity: quantityValue ? parseFloatSafe(quantityValue) : defaultQuantity,
    price: parseFloatSafe(priceValue),
    stopLoss: stopLossValue ? parseFloatSafe(stopLossValue) : undefined,
    takeProfit: takeProfitValue ? parseFloatSafe(takeProfitValue) : undefined,
    exchange: (getValue('exchange') || getValue('EXCHANGE') || defaultExchange).toString(),
    strategy: (getValue('strategy') || getValue('STRATEGY') || 'Unknown').toString(),
    timestamp: new Date().toISOString(),
    status: 'pending',
    // Additional fields for multientry and other strategies
    alert: alertField ? alertField.toString() : undefined,
    pair: pairField ? pairField.toString() : undefined,
    timeFrame: timeframeField ? timeframeField.toString() : undefined,
    alias: aliasField ? aliasField.toString() : undefined,
  };
};

// Navigation component that handles auth state
const Navigation = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { isAuthenticated, isLoading } = useSelector((state: RootState) => state.auth);
  const { config, credentials } = useSelector((state: RootState) => state.trading);

  useEffect(() => {
    // Initialize language on app start
    dispatch(initializeLanguage());
    
    // Restore session on app start first
    dispatch(restoreSession());
  }, [dispatch]);

  // Load trading data after authentication is restored
  useEffect(() => {
    if (isAuthenticated) {
      console.log('[App] User authenticated, loading credentials and config...');
      dispatch(loadCredentials());
      dispatch(loadTradingConfig());
    }
  }, [isAuthenticated, dispatch]);

  // Process pending notifications when authenticated and config/credentials are loaded
  useEffect(() => {
    if (isAuthenticated && config && credentials.length > 0) {
      console.log('[App] Processing pending notifications on app start...');
      processPendingNotifications(dispatch, config, credentials);
    }
  }, [isAuthenticated, config, credentials, dispatch]);

  // Check for app updates when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;

    const checkForUpdates = async () => {
      try {
        console.log('[App] Checking for app updates...');
        const updateInfo = await versionCheckService.checkForUpdates();
        
        if (updateInfo) {
          console.log('[App] New version available:', updateInfo.version);
          
          // Show update notification after a short delay to not interrupt app startup
          setTimeout(() => {
            const title = i18n.t('versionCheck.newVersionAvailable') || 'New Version Available';
            const message = (i18n.t('versionCheck.newVersionMessage', { version: updateInfo.version }) || 
              `A new version (${updateInfo.version}) is available for download.\n\nWould you like to download it now?`);
            const laterText = i18n.t('versionCheck.downloadLater') || i18n.t('common.later') || 'Later';
            const downloadText = i18n.t('versionCheck.downloadNow') || i18n.t('common.download') || 'Download';
            const errorTitle = i18n.t('common.error') || 'Error';
            const errorMessage = i18n.t('versionCheck.failedToOpenUrl') || 'Failed to open download page';
            
            Alert.alert(
              title,
              message,
              [
                {
                  text: laterText,
                  style: 'cancel',
                },
                {
                  text: downloadText,
                  onPress: () => {
                    Linking.openURL(updateInfo.releaseUrl).catch(err => {
                      console.error('[App] Failed to open release URL:', err);
                      Alert.alert(errorTitle, errorMessage);
                    });
                  },
                },
              ],
              { cancelable: true }
            );
          }, 2000); // Wait 2 seconds after app starts
        } else {
          console.log('[App] App is up to date');
        }
      } catch (error) {
        console.error('[App] Error checking for updates:', error);
        // Don't show error to user, just log it
      }
    };

    // Check for updates after authentication
    checkForUpdates();
  }, [isAuthenticated]);

  // Set up FCM token refresh listener and periodic token validation
  useEffect(() => {
    if (!isAuthenticated) return;

    let tokenRefreshUnsubscribe: (() => void) | null = null;
    let appStateSubscription: any = null;
    let tokenCheckInterval: NodeJS.Timeout | null = null;

    const setupTokenRefresh = async () => {
      try {
        // Listen for token refresh events
        tokenRefreshUnsubscribe = await firebaseNotificationService.onTokenRefresh(
          async (newToken) => {
            console.log('FCM token refreshed, updating backend...', newToken);
            try {
              // Update token in Redux store
              dispatch(setToken(newToken));
              
              // Update token in backend
              await dispatch(updateDeviceToken(newToken)).unwrap();
              console.log('FCM token updated successfully in backend');
            } catch (error) {
              console.error('Failed to update FCM token in backend:', error);
            }
          }
        );

        // Get current token and verify it's registered
        const currentToken = await firebaseNotificationService.registerForPushNotifications();
        if (currentToken) {
          dispatch(setToken(currentToken));
          
          // Update backend with current token (in case it changed)
          try {
            await dispatch(updateDeviceToken(currentToken)).unwrap();
            console.log('Current FCM token verified and updated in backend');
          } catch (error) {
            console.warn('Failed to update current FCM token in backend:', error);
          }
        }

        // Set up periodic token check (every 24 hours)
        tokenCheckInterval = setInterval(async () => {
          try {
            console.log('Performing periodic FCM token check...');
            const token = await firebaseNotificationService.registerForPushNotifications();
            if (token) {
              dispatch(setToken(token));
              await dispatch(updateDeviceToken(token)).unwrap();
              console.log('Periodic FCM token check completed');
            }
          } catch (error) {
            console.error('Periodic FCM token check failed:', error);
          }
        }, 24 * 60 * 60 * 1000); // 24 hours

        // Refresh token when app comes to foreground and check for missed notifications
        const handleAppStateChange = async (nextAppState: string) => {
          if (nextAppState === 'active') {
            console.log('[App] App came to foreground, checking FCM token and missed notifications...');
            
            // Process pending notifications first (notifications that arrived while app was closed)
            if (config && credentials.length > 0) {
              await processPendingNotifications(dispatch, config, credentials);
            }
            
            // Check for any notification that opened the app
            try {
              const initialNotification = await messaging().getInitialNotification();
              if (initialNotification) {
                console.log('[App] Found initial notification when app came to foreground:', JSON.stringify(initialNotification, null, 2));
                // Process it if it's a trading alert
                const messageData = initialNotification.data || {};
                const hasTradingFields = messageData.pair || messageData.symbol || messageData.side || messageData.price;
                const alertType = messageData.type || initialNotification.data?.type;
                const isTradingAlert = alertType === 'trading_alert' || 
                                      alertType === 'trade_alert' || 
                                      (hasTradingFields && !messageData.type);
                
                if (isTradingAlert) {
                  console.log('[App] Processing missed trading alert from initial notification...');
                  try {
                    const tradeAlert = convertMessageToTradeAlert(messageData);
                    console.log('[App] Converted trade alert from initial notification:', JSON.stringify(tradeAlert, null, 2));
                    
                    // Store the alert locally
                    await tradingService.storeTradeAlert(tradeAlert);
                    console.log('[App] Initial notification alert stored locally');
                    
                    // Add to trade history in Redux store
                    dispatch(addTradeAlert(tradeAlert));
                    console.log('[App] Initial notification alert added to Redux store');
                    
                    // Auto-execute if in AUTO mode
                    if (config.mode === 'AUTO') {
                      try {
                        await dispatch(processTradeAlert({
                          alert: tradeAlert,
                          config,
                          credentials
                        })).unwrap();
                        console.log('[App] Auto-executed trade alert from initial notification:', tradeAlert.id);
                      } catch (error) {
                        console.error('[App] Failed to auto-execute trade from initial notification:', error);
                      }
                    }
                  } catch (error) {
                    console.error('[App] Error processing trade alert from initial notification:', error);
                    // Still try to store the alert even if conversion had issues
                    try {
                      const fallbackAlert: TradeAlert = {
                        id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        symbol: (messageData.pair || messageData.symbol || messageData.PAIR || messageData.SYMBOL || 'UNKNOWN').toString(),
                        side: 'BUY',
                        quantity: 1,
                        price: 0,
                        exchange: (messageData.exchange || messageData.EXCHANGE || 'binance').toString(),
                        strategy: (messageData.strategy || messageData.STRATEGY || 'Unknown').toString(),
                        timestamp: new Date().toISOString(),
                        status: 'pending',
                      };
                      await tradingService.storeTradeAlert(fallbackAlert);
                      dispatch(addTradeAlert(fallbackAlert));
                      console.log('[App] Stored fallback alert from initial notification due to conversion error');
                    } catch (fallbackError) {
                      console.error('[App] Failed to store fallback alert from initial notification:', fallbackError);
                    }
                  }
                }
              }
            } catch (error) {
              console.warn('[App] Error checking initial notification:', error);
            }
            
            // Refresh FCM token
            firebaseNotificationService.registerForPushNotifications()
              .then((token) => {
                if (token) {
                  dispatch(setToken(token));
                  dispatch(updateDeviceToken(token)).catch((error) => {
                    console.warn('Failed to update token on foreground:', error);
                  });
                }
              })
              .catch((error) => {
                console.warn('Failed to get token on foreground:', error);
              });
          }
        };

        appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

        console.log('FCM token refresh listener set up successfully');
      } catch (error) {
        console.error('Failed to set up FCM token refresh listener:', error);
      }
    };

    setupTokenRefresh();

    // Cleanup
    return () => {
      if (tokenRefreshUnsubscribe) {
        tokenRefreshUnsubscribe();
      }
      if (appStateSubscription) {
        appStateSubscription.remove();
      }
      if (tokenCheckInterval) {
        clearInterval(tokenCheckInterval);
      }
    };
  }, [isAuthenticated, dispatch]);

  // Set up notification listeners when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;

    let unsubscribeForeground: (() => void) | null = null;
    let unsubscribeBackground: (() => void) | null = null;

    const setupNotificationListeners = async () => {
      try {
        // Listen for foreground messages
        console.log('[App] Setting up foreground notification listener...');
        unsubscribeForeground = await firebaseNotificationService.addNotificationListener(
          async (remoteMessage) => {
            console.log('[App] Received foreground notification:', JSON.stringify(remoteMessage, null, 2));
            console.log('[App] Message data type:', remoteMessage.data?.type);
            console.log('[App] Full message data:', remoteMessage.data);
            console.log('[App] Message notification:', remoteMessage.notification);
            console.log('[App] All message keys:', Object.keys(remoteMessage));
            
            // Process notification - FCM sends all data as strings, so we need to handle that
            // FCM data payload is always in remoteMessage.data
            const messageData = remoteMessage.data || {};
            
            // FCM sends all data values as strings, so we need to check the type field carefully
            // The type might be in data.type or we need to check if it's a trading alert by other fields
            const alertType = messageData.type || remoteMessage.data?.type || 
                            (messageData.pair || messageData.symbol ? 'trading_alert' : null);
            
            console.log('[App] Alert type found:', alertType);
            console.log('[App] Message data keys:', Object.keys(messageData));
            console.log('[App] Raw message data values:', messageData);
            
            // Check if it's a trading alert by type OR by presence of trading fields (pair, symbol, side, etc.)
            // Check multiple variations of field names (case-insensitive)
            const hasPair = messageData.pair || messageData.PAIR || messageData.pair || messageData.symbol || messageData.SYMBOL;
            const hasSide = messageData.side || messageData.SIDE || messageData.action || messageData.ACTION;
            const hasPrice = messageData.price || messageData.PRICE;
            const hasTradingFields = hasPair || hasSide || hasPrice || messageData.strategy || messageData.STRATEGY;
            
            const isTradingAlert = alertType === 'trading_alert' || 
                                  alertType === 'trade_alert' || 
                                  (hasTradingFields && !messageData.type); // If it has trading fields but no type, assume it's a trading alert
            
            console.log('[App] Notification classification:', {
              alertType,
              hasPair: !!hasPair,
              hasSide: !!hasSide,
              hasPrice: !!hasPrice,
              hasTradingFields,
              isTradingAlert,
              messageDataKeys: Object.keys(messageData)
            });
            
            if (isTradingAlert) {
              console.log('[App] Processing trading alert from notification');
              console.log('[App] Using message data for conversion:', messageData);
              
              try {
                const tradeAlert = convertMessageToTradeAlert(messageData);
                console.log('[App] Converted trade alert:', JSON.stringify(tradeAlert, null, 2));
                
                // Store the alert locally
                await tradingService.storeTradeAlert(tradeAlert);
                console.log('[App] Alert stored locally');
                
                // Add to trade history in Redux store
                dispatch(addTradeAlert(tradeAlert));
                console.log('[App] Alert added to Redux store');
                
                // Auto-execute if in AUTO mode
                if (config.mode === 'AUTO') {
                  try {
                    await dispatch(processTradeAlert({
                      alert: tradeAlert,
                      config,
                      credentials
                    })).unwrap();
                    console.log('[App] Auto-executed trade alert:', tradeAlert.id);
                  } catch (error) {
                    console.error('[App] Failed to auto-execute trade:', error);
                  }
                }
              } catch (error) {
                console.error('[App] Error processing trade alert:', error);
                // Still try to store the alert even if conversion had issues
                try {
                  const fallbackAlert: TradeAlert = {
                    id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    symbol: (messageData.pair || messageData.symbol || messageData.PAIR || messageData.SYMBOL || 'UNKNOWN').toString(),
                    side: 'BUY',
                    quantity: 1,
                    price: 0,
                    exchange: (messageData.exchange || messageData.EXCHANGE || 'binance').toString(),
                    strategy: (messageData.strategy || messageData.STRATEGY || 'Unknown').toString(),
                    timestamp: new Date().toISOString(),
                    status: 'pending',
                  };
                  await tradingService.storeTradeAlert(fallbackAlert);
                  dispatch(addTradeAlert(fallbackAlert));
                  console.log('[App] Stored fallback alert due to conversion error');
                } catch (fallbackError) {
                  console.error('[App] Failed to store fallback alert:', fallbackError);
                }
              }
            } else {
              console.log('[App] Notification is not a trading alert, type:', alertType, 'hasTradingFields:', hasTradingFields);
              console.log('[App] Message data:', JSON.stringify(messageData, null, 2));
            }
          }
        );

        // Listen for background/quit state messages
        console.log('[App] Setting up background notification listener...');
        unsubscribeBackground = await firebaseNotificationService.addNotificationResponseListener(
          async (remoteMessage) => {
            console.log('[App] Received background notification:', JSON.stringify(remoteMessage, null, 2));
            console.log('[App] Message data type:', remoteMessage.data?.type);
            console.log('[App] Full message data:', remoteMessage.data);
            console.log('[App] Message notification:', remoteMessage.notification);
            console.log('[App] All message keys:', Object.keys(remoteMessage));
            
            // Process notification - FCM sends all data as strings, so we need to handle that
            // FCM data payload is always in remoteMessage.data
            const messageData = remoteMessage.data || {};
            
            // FCM sends all data values as strings, so we need to check the type field carefully
            // The type might be in data.type or we need to check if it's a trading alert by other fields
            const alertType = messageData.type || remoteMessage.data?.type || 
                            (messageData.pair || messageData.symbol ? 'trading_alert' : null);
            
            console.log('[App] Background alert type found:', alertType);
            console.log('[App] Background message data keys:', Object.keys(messageData));
            console.log('[App] Raw background message data values:', messageData);
            
            // Check if it's a trading alert by type OR by presence of trading fields (pair, symbol, side, etc.)
            // Check multiple variations of field names (case-insensitive)
            const hasPair = messageData.pair || messageData.PAIR || messageData.pair || messageData.symbol || messageData.SYMBOL;
            const hasSide = messageData.side || messageData.SIDE || messageData.action || messageData.ACTION;
            const hasPrice = messageData.price || messageData.PRICE;
            const hasTradingFields = hasPair || hasSide || hasPrice || messageData.strategy || messageData.STRATEGY;
            
            const isTradingAlert = alertType === 'trading_alert' || 
                                  alertType === 'trade_alert' || 
                                  (hasTradingFields && !messageData.type); // If it has trading fields but no type, assume it's a trading alert
            
            console.log('[App] Background notification classification:', {
              alertType,
              hasPair: !!hasPair,
              hasSide: !!hasSide,
              hasPrice: !!hasPrice,
              hasTradingFields,
              isTradingAlert,
              messageDataKeys: Object.keys(messageData)
            });
            
            if (isTradingAlert) {
              console.log('[App] Processing trading alert from background notification');
              console.log('[App] Using message data for conversion:', messageData);
              
              try {
                const tradeAlert = convertMessageToTradeAlert(messageData);
                console.log('[App] Converted trade alert:', JSON.stringify(tradeAlert, null, 2));
                
                // Store the alert locally
                await tradingService.storeTradeAlert(tradeAlert);
                console.log('[App] Background alert stored locally');
                
                // Add to trade history in Redux store
                dispatch(addTradeAlert(tradeAlert));
                console.log('[App] Background alert added to Redux store');
                
                // Auto-execute if in AUTO mode
                if (config.mode === 'AUTO') {
                  try {
                    await dispatch(processTradeAlert({
                      alert: tradeAlert,
                      config,
                      credentials
                    })).unwrap();
                    console.log('[App] Auto-executed trade alert from background:', tradeAlert.id);
                  } catch (error) {
                    console.error('[App] Failed to auto-execute trade from background:', error);
                  }
                }
              } catch (error) {
                console.error('[App] Error processing trade alert from background:', error);
                // Still try to store the alert even if conversion had issues
                try {
                  const fallbackAlert: TradeAlert = {
                    id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    symbol: (messageData.pair || messageData.symbol || messageData.PAIR || messageData.SYMBOL || 'UNKNOWN').toString(),
                    side: 'BUY',
                    quantity: 1,
                    price: 0,
                    exchange: (messageData.exchange || messageData.EXCHANGE || 'binance').toString(),
                    strategy: (messageData.strategy || messageData.STRATEGY || 'Unknown').toString(),
                    timestamp: new Date().toISOString(),
                    status: 'pending',
                  };
                  await tradingService.storeTradeAlert(fallbackAlert);
                  dispatch(addTradeAlert(fallbackAlert));
                  console.log('[App] Stored fallback alert from background due to conversion error');
                } catch (fallbackError) {
                  console.error('[App] Failed to store fallback alert from background:', fallbackError);
                }
              }
            } else {
              console.log('[App] Background notification is not a trading alert, type:', alertType, 'hasTradingFields:', hasTradingFields);
              console.log('[App] Background message data:', JSON.stringify(messageData, null, 2));
            }
          }
        );

        console.log('Notification listeners set up successfully');
      } catch (error) {
        console.error('Failed to set up notification listeners:', error);
      }
    };

    setupNotificationListeners();

    // Cleanup listeners on unmount
    return () => {
      if (unsubscribeForeground) {
        unsubscribeForeground();
      }
      if (unsubscribeBackground) {
        unsubscribeBackground();
      }
    };
  }, [isAuthenticated, config.mode, credentials, dispatch]);

  // Show loading screen while restoring session
  if (isLoading) {
    return (
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Loading" component={LoadingScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Auth" component={LoginScreen} />
        ) : (
          <Stack.Screen name="Main" component={MainTabs} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

// Main App component
const AppContent = () => {
  return (
    <>
      <StatusBar style="dark" backgroundColor="#FFFFFF" />
      <Navigation />
    </>
  );
};

// App with Redux Provider
export default function App() {
  return (
    <Provider store={store}>
      <PaperProvider theme={MD3LightTheme}>
        <AppContent />
      </PaperProvider>
    </Provider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 16,
    color: colors.textSecondary,
  },
});
