import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import {
  TextInput,
  Button,
  Text,
  Card,
  Title,
  Paragraph,
} from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { loginUser, registerDevice } from '../store/slices/authSlice';
import { registerForPushNotifications, refreshPushToken, testToken } from '../store/slices/notificationsSlice';
import * as Device from 'expo-device';
import { colors } from '../theme/colors';

const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const dispatch = useDispatch();
  const { isLoading: authLoading, error } = useSelector((state: RootState) => state.auth);
  const { token: notificationToken, error: notificationError } = useSelector((state: RootState) => state.notifications);

  const handleLogin = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    try {
      // Get device ID
      const deviceId = Device.osInternalBuildId || Device.deviceName || 'unknown';
      
      // Login user with email and device ID (this also registers the device)
      await dispatch(loginUser({ email, deviceId })).unwrap();
      
      // Register device for notifications if not already registered
      if (!notificationToken) {
        try {
          await dispatch(registerForPushNotifications()).unwrap();
        } catch (notificationError: any) {
          console.warn('Failed to register for notifications:', notificationError);
          // Don't fail the login if notifications fail
          Alert.alert(
            'Login Successful', 
            'Login completed, but push notifications could not be set up. You can try again later in settings.',
            [{ text: 'OK' }]
          );
        }
      }
      
    } catch (error: any) {
      Alert.alert('Login Failed', error.message || 'An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshToken = async () => {
    try {
      await dispatch(refreshPushToken()).unwrap();
      Alert.alert('Success', 'Push notification token refreshed successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to refresh token');
    }
  };

  const handleTestToken = async () => {
    try {
      const result = await dispatch(testToken()).unwrap();
      if (result.valid) {
        Alert.alert('Success', 'Token is valid and working correctly');
      } else {
        Alert.alert('Token Invalid', `Token validation failed: ${result.error}`);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to test token');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.logoContainer}>
              <Image
                source={require('../../assets/icon.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <Paragraph style={styles.subtitle}>
              Trading Alert System
            </Paragraph>
            
            <TextInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              mode="outlined"
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="Enter your subscription email"
            />
            
            {error && (
              <Text style={styles.errorText}>{error}</Text>
            )}
            
            <Button
              mode="contained"
              onPress={handleLogin}
              style={styles.button}
              loading={isLoading || authLoading}
              disabled={isLoading || authLoading}
              buttonColor={colors.primary}
              textColor={colors.text}
            >
              Access app
            </Button>
            
            <Text style={styles.helpText}>
              Enter the email address associated with your Pro subscription to access the mobile app.
            </Text>
            <Text style={styles.helpText}>
              Basic subscribers can access alerts via Telegram only.
            </Text>
            
            {/* Debug section for development */}
            {__DEV__ && (
              <View style={styles.debugSection}>
                <Text style={styles.debugTitle}>Debug Information</Text>
                {notificationToken && (
                  <Text style={styles.debugText}>
                    Token: {notificationToken.substring(0, 20)}...
                  </Text>
                )}
                {notificationError && (
                  <Text style={styles.debugText}>
                    Error: {notificationError}
                  </Text>
                )}
                <Button
                  mode="outlined"
                  onPress={handleRefreshToken}
                  style={styles.debugButton}
                  buttonColor={colors.secondary}
                >
                  Refresh Token
                </Button>
                <Button
                  mode="outlined"
                  onPress={handleTestToken}
                  style={styles.debugButton}
                  buttonColor={colors.secondary}
                >
                  Test Token
                </Button>
              </View>
            )}
          </Card.Content>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    elevation: 4,
    borderRadius: 12,
    backgroundColor: colors.card,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  logo: {
    width: 120,
    height: 60,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 24,
    color: colors.textSecondary,
  },
  input: {
    marginBottom: 16,
    backgroundColor: colors.surface,
  },
  button: {
    marginTop: 8,
    marginBottom: 16,
    paddingVertical: 8,
  },
  errorText: {
    color: colors.error,
    textAlign: 'center',
    marginBottom: 16,
  },
  helpText: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 12,
  },
  debugSection: {
    marginTop: 20,
    padding: 16,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  debugText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  debugButton: {
    marginTop: 8,
  },
});

export default LoginScreen;
