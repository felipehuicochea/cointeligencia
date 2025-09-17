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
import { loginUser, registerDevice, validateSession } from '../store/slices/authSlice';
import { registerForPushNotifications } from '../store/slices/notificationsSlice';
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
      
      // Get FCM token for push notifications
      let fcmToken = notificationToken;
      if (!fcmToken) {
        try {
          fcmToken = await dispatch(registerForPushNotifications()).unwrap();
        } catch (notificationError: any) {
          console.warn('Failed to register for notifications:', notificationError);
          // Continue with login even if notifications fail
        }
      }
      
      // Login user with email, device ID, and FCM token
      await dispatch(loginUser({ email, deviceId, fcmToken })).unwrap();
      
    } catch (error: any) {
      Alert.alert('Login Failed', error.message || 'An error occurred during login');
    } finally {
      setIsLoading(false);
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
});

export default LoginScreen;
