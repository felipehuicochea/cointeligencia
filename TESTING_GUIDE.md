# Cointeligencia Android App - Testing Guide

## 🚀 Quick Start Testing

### Option 1: Using Expo Go (Recommended for quick testing)

1. **Install Expo Go** on your Android device from the Google Play Store
2. **Start the development server**:
   ```bash
   npx expo start
   ```
3. **Scan the QR code** with Expo Go app
4. **Test the app** on your device

**Note**: The app currently uses mock data for trading features since the backend doesn't have trading endpoints yet. This allows you to test the UI and navigation without backend integration.

### Option 2: Build APK for Testing

#### Prerequisites
- Android Studio installed
- Android SDK configured
- ANDROID_HOME environment variable set

#### Build Steps
1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Prebuild the project**:
   ```bash
   npx expo prebuild --platform android --clean
   ```

3. **Build the APK**:
   ```bash
   npx expo run:android
   ```

### Option 3: Cloud Build (No local setup required)

1. **Create Expo account** at https://expo.dev/signup
2. **Login to EAS**:
   ```bash
   eas login
   ```
3. **Build APK**:
   ```bash
   eas build --platform android --profile preview
   ```

## 📱 App Features to Test

### 1. Authentication Flow
- [ ] **Login Screen**: Enter email address
- [ ] **Email Validation**: Test invalid email formats
- [ ] **Backend Integration**: Test with real backend endpoint
- [ ] **Device Registration**: Verify device ID is sent
- [ ] **Navigation**: Successfully redirects to Dashboard

### 2. Dashboard Screen
- [ ] **Trading Mode Toggle**: Switch between AUTO/MANUAL
- [ ] **Recent Alerts**: Display trade alerts
- [ ] **Alert Actions**: Execute/Ignore buttons for pending alerts
- [ ] **Status Display**: Show execution status
- [ ] **Error Handling**: Display error messages

### 3. Settings Screen
- [ ] **Account Information**: Display user details
- [ ] **Order Size Configuration**: 
  - [ ] Toggle between Percentage/Fixed Amount
  - [ ] Input validation (0-100% for percentage, positive values for fixed)
  - [ ] Save configuration
- [ ] **Exchange Configuration**: Add/remove API credentials
- [ ] **Risk Management**: View current settings
- [ ] **Logout**: Successfully log out

### 4. Trade Alert Processing
- [ ] **Alert Parsing**: Parse incoming trade alerts
- [ ] **Order Calculation**: Calculate quantities based on configuration
- [ ] **Exchange Integration**: Execute trades on configured exchanges
- [ ] **Response Storage**: Store execution results
- [ ] **Status Updates**: Update UI with execution status

## 🔧 Backend Integration Testing

### Test Endpoints
- **Login**: `https://backend.cointeligencia.com/api/users/register_device`
- **Authentication**: Requires API secret in headers
- **Test User**: `sargatext@gmail.com` with API secret `rzBHWKvWNeFinffP96YaiKVB`

### Test Scenarios
1. **Valid User Login**: Test with existing user email
2. **Invalid User**: Test with non-existent email
3. **Expired License**: Test with expired user
4. **Network Errors**: Test with no internet connection
5. **Server Errors**: Test with backend down

## 📊 Exchange Integration Testing

### Supported Exchanges
- [ ] **Binance**: Test order execution
- [ ] **Kraken**: Test order execution
- [ ] **Coinbase Pro**: Test order execution
- [ ] **KuCoin**: Test order execution
- [ ] **Bybit**: Test order execution

### Test Scenarios
1. **Valid Credentials**: Test with real API keys
2. **Invalid Credentials**: Test with wrong API keys
3. **Insufficient Balance**: Test with low balance
4. **Market Closed**: Test during maintenance
5. **Rate Limiting**: Test API rate limits

## 🐛 Common Issues & Solutions

### Build Issues
- **Android SDK not found**: Install Android Studio and set ANDROID_HOME
- **Gradle build failed**: Check Java version and Android SDK
- **Metro bundler issues**: Clear cache with `npx expo start --clear`

### Runtime Issues
- **HTTP 400 errors**: The app uses mock data for trading features - this is expected
- **Expo Notifications warnings**: Use development build for full notification support
- **React Native Paper warnings**: Fixed by adding PaperProvider wrapper
- **Network errors**: Check backend URL and internet connection
- **Authentication errors**: Verify API secret and user credentials
- **Navigation issues**: Check Redux store configuration

### Testing Issues
- **Expo Go not working**: Update Expo Go app or use development build
- **QR code not scanning**: Check network connectivity
- **App crashes**: Check console logs for error details
- **Mock data**: Trading features show mock data - this is intentional for development

## 📝 Testing Checklist

### Pre-Testing Setup
- [ ] Backend server is running
- [ ] Test user credentials are available
- [ ] Exchange API credentials are configured
- [ ] Network connectivity is stable

### Core Functionality
- [ ] App launches without crashes
- [ ] Login flow works correctly
- [ ] Navigation between screens works
- [ ] Settings are saved and loaded
- [ ] Trade alerts are processed correctly

### Edge Cases
- [ ] App handles network disconnection
- [ ] App handles invalid user input
- [ ] App handles backend errors gracefully
- [ ] App handles exchange API errors
- [ ] App maintains state after background/foreground

### Performance
- [ ] App loads quickly
- [ ] UI is responsive
- [ ] No memory leaks
- [ ] Battery usage is reasonable

## 🎯 Success Criteria

The app is ready for production when:
- [ ] All core features work correctly
- [ ] Backend integration is stable
- [ ] Exchange integration is reliable
- [ ] Error handling is comprehensive
- [ ] User experience is smooth
- [ ] Performance is acceptable
- [ ] Security measures are in place

## 📞 Support

For issues during testing:
1. Check the console logs for error details
2. Verify backend connectivity
3. Test with different devices/Android versions
4. Contact the development team with specific error messages
