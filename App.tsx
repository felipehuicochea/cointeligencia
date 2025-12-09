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
import { addTradeAlert, processTradeAlert } from './src/store/slices/tradingSlice';
import { restoreSession, updateDeviceToken } from './src/store/slices/authSlice';
import { setToken } from './src/store/slices/notificationsSlice';
import { TradeAlert } from './src/types';
import { tradingService } from './src/services/tradingService';
import { AppState } from 'react-native';

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

// Convert backend message to TradeAlert
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

  return {
    id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    symbol: message.pair || message.symbol || 'UNKNOWN',
    side: sideMapping[message.side] || 'BUY',
    quantity: message.quantity || defaultQuantity,
    price: parseFloat(message.price) || 0,
    stopLoss: message.stopLoss ? parseFloat(message.stopLoss) : undefined,
    takeProfit: message.takeProfit ? parseFloat(message.takeProfit) : undefined,
    exchange: message.exchange || defaultExchange,
    strategy: message.strategy || 'Unknown',
    timestamp: new Date().toISOString(),
    status: 'pending',
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
    
    // Restore session on app start
    dispatch(restoreSession());
  }, [dispatch]);

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

        // Refresh token when app comes to foreground
        const handleAppStateChange = (nextAppState: string) => {
          if (nextAppState === 'active') {
            console.log('App came to foreground, checking FCM token...');
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
        unsubscribeForeground = await firebaseNotificationService.addNotificationListener(
          async (remoteMessage) => {
            console.log('Received foreground notification:', remoteMessage);
            
            // Check if it's a trading alert
            if (remoteMessage.data?.type === 'trading_alert') {
              const tradeAlert = convertMessageToTradeAlert(remoteMessage.data);
              
              // Store the alert locally
              await tradingService.storeTradeAlert(tradeAlert);
              
              // Add to trade history in Redux store
              dispatch(addTradeAlert(tradeAlert));
              
              // Auto-execute if in AUTO mode
              if (config.mode === 'AUTO') {
                try {
                  await dispatch(processTradeAlert({
                    alert: tradeAlert,
                    config,
                    credentials
                  })).unwrap();
                  console.log('Auto-executed trade alert:', tradeAlert.id);
                } catch (error) {
                  console.error('Failed to auto-execute trade:', error);
                }
              }
            }
          }
        );

        // Listen for background/quit state messages
        unsubscribeBackground = await firebaseNotificationService.addNotificationResponseListener(
          async (remoteMessage) => {
            console.log('Received background notification:', remoteMessage);
            
            // Check if it's a trading alert
            if (remoteMessage.data?.type === 'trading_alert') {
              const tradeAlert = convertMessageToTradeAlert(remoteMessage.data);
              
              // Store the alert locally
              await tradingService.storeTradeAlert(tradeAlert);
              
              // Add to trade history in Redux store
              dispatch(addTradeAlert(tradeAlert));
              
              // Auto-execute if in AUTO mode
              if (config.mode === 'AUTO') {
                try {
                  await dispatch(processTradeAlert({
                    alert: tradeAlert,
                    config,
                    credentials
                  })).unwrap();
                  console.log('Auto-executed trade alert from background:', tradeAlert.id);
                } catch (error) {
                  console.error('Failed to auto-execute trade from background:', error);
                }
              }
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
