# Cointeligencia Trading Alert App

A React Native mobile application that receives trading alerts from TradingView via a backend service and executes trades automatically or manually based on user configuration.

## Features

### MVP Scope ✅

1. **User Authentication & Device Registration**
   - Email/password login
   - Device ID registration with backend
   - Subscription status validation

2. **Push Notification System**
   - Receives trade alerts from backend
   - Handles both AUTO and MANUAL execution modes
   - Interactive notifications with execute/ignore actions

3. **Trading Execution**
   - **AUTO Mode**: Automatically executes trades using stored API credentials
   - **MANUAL Mode**: Displays alerts for user approval/rejection
   - Support for multiple exchanges (Binance, Coinbase, Kraken)

4. **API Credential Management**
   - Secure storage of exchange API keys
   - Support for multiple exchange accounts
   - Encrypted credential storage using Expo SecureStore

5. **Trade History & Alerts**
   - Complete history of received alerts
   - Trade execution status tracking
   - Failed trade error logging

## Architecture

### Tech Stack
- **React Native 0.79.5** - Cross-platform mobile development
- **Expo SDK 53** - Development platform and services
- **Redux Toolkit** - State management
- **React Navigation** - Navigation system
- **React Native Paper** - Material Design UI components
- **Expo Notifications** - Push notification handling
- **Expo SecureStore** - Secure credential storage

### Project Structure
```
src/
├── components/          # Reusable UI components
├── screens/            # App screens
│   ├── LoginScreen.tsx
│   ├── DashboardScreen.tsx
│   └── SettingsScreen.tsx
├── services/           # API and external services
│   ├── apiService.ts
│   ├── authService.ts
│   ├── tradingService.ts
│   └── notificationService.ts
├── store/              # Redux store and slices
│   ├── index.ts
│   └── slices/
│       ├── authSlice.ts
│       ├── tradingSlice.ts
│       └── notificationsSlice.ts
├── types/              # TypeScript type definitions
│   └── index.ts
└── utils/              # Utility functions
```

## Installation & Setup

### Prerequisites
- Node.js 18+
- Expo CLI
- iOS Simulator or Android Emulator (or physical device)

### Installation
```bash
# Install dependencies
npm install

# Start the development server
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android
```

### Environment Configuration
1. Update `src/services/apiService.ts` with your backend API URL
2. Configure EAS project ID in `app.json`
3. Set up Google Services for Android (if needed)

## Backend Integration

### API Endpoints Required

#### Authentication
- `POST /auth/login` - User login
- `POST /auth/register-device` - Device registration
- `GET /auth/subscription` - Check subscription status
- `POST /auth/logout` - User logout

#### Trading
- `POST /trading/credentials` - Save API credentials
- `GET /trading/credentials` - Get stored credentials
- `PUT /trading/config` - Update trading configuration
- `POST /trading/execute` - Execute trade
- `PUT /trading/alerts/{id}/ignore` - Ignore trade alert
- `GET /trading/history` - Get trade history

#### Push Notifications
The backend should send push notifications with the following structure:
```json
{
  "to": "ExponentPushToken[...]",
  "title": "Trade Alert: BTC/USDT",
  "body": "BUY 0.1 BTC @ $45,000",
  "data": {
    "type": "trade_alert",
    "alertId": "unique-alert-id",
    "symbol": "BTC/USDT",
    "side": "BUY",
    "quantity": "0.1",
    "price": "45000",
    "stopLoss": "44000",
    "takeProfit": "47000",
    "exchange": "binance",
    "strategy": "breakout"
  }
}
```

## Usage

### Initial Setup
1. **Login**: Enter email and password
2. **Device Registration**: App automatically registers device for notifications
3. **Configure Trading Mode**: Choose between AUTO or MANUAL execution
4. **Add API Credentials**: Configure exchange API keys for automated trading

### Trading Modes

#### AUTO Mode
- Trades are executed automatically when alerts are received
- Requires valid API credentials to be configured
- Includes risk management parameters (position size, stop loss)

#### MANUAL Mode
- User receives notifications for each trade alert
- Can approve or reject trades via notification actions
- Provides full control over trade execution

### Security Features
- API credentials encrypted using Expo SecureStore
- Authentication tokens managed securely
- Device-specific push notification tokens
- Subscription validation on app startup

## Development

### Adding New Exchanges
1. Add exchange configuration in `src/services/tradingService.ts`
2. Implement exchange-specific API calls
3. Update credential validation logic

### Customizing UI
- Modify components in `src/components/`
- Update theme in `App.js` (PaperProvider)
- Customize navigation in tab navigator

### Testing
```bash
# Run tests (when implemented)
npm test

# Test push notifications
# Use the test notification button in development
```

## Deployment

### EAS Build
```bash
# Install EAS CLI
npm install -g @expo/eas-cli

# Configure EAS
eas build:configure

# Build for production
eas build --platform all
```

### App Store Deployment
1. Configure app signing certificates
2. Update app metadata in `app.json`
3. Submit builds to App Store Connect

## Security Considerations

- API credentials are encrypted and stored locally
- Authentication tokens are managed securely
- Push notification tokens are device-specific
- All API communications use HTTPS
- Subscription validation prevents unauthorized access

## Troubleshooting

### Common Issues
1. **Push notifications not working**: Check device permissions and EAS configuration
2. **API calls failing**: Verify backend URL and authentication
3. **Trades not executing**: Check API credentials and exchange connectivity

### Debug Mode
Enable debug logging by setting environment variables or using React Native Debugger.

## Support

For technical support or feature requests, contact the development team.

## License

Proprietary - All rights reserved.
