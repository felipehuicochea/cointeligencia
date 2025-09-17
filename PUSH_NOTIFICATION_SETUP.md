# Push Notification Setup Guide

## Issue: Expo Go Limitation in SDK 53

**Problem**: Expo Go no longer supports push notifications in SDK 53. This is why you're getting "DeviceNotRegistered" errors.

**Solution**: Use a development build instead of Expo Go.

## Setup Options

### Option 1: EAS Development Build (Recommended)

#### Prerequisites
1. **Expo Account Access**: You need access to the Expo project `6bac0265-f2ef-4a03-aeaa-9e90b92664ee`
2. **EAS CLI**: `npm install -g @expo/eas-cli`
3. **Login**: `eas login`

#### Steps
```bash
# 1. Ensure you have access to the project
eas whoami

# 2. Create development build
npx eas build --platform android --profile development

# 3. Download and install the APK on your device

# 4. Start development server
npx expo start --dev-client
```

### Option 2: Local Development Build

#### Prerequisites
1. **Android Studio** with Android SDK
2. **Physical Android device** or emulator
3. **USB debugging** enabled on device

#### Steps
```bash
# 1. Connect your Android device or start emulator

# 2. Create local development build
npx expo run:android --device

# 3. The app will be installed automatically
```

### Option 3: Expo Go with Mock Notifications (Development Only)

For UI development without real push notifications:

```bash
# Start with Expo Go (limited functionality)
npx expo start
```

**Note**: Push notifications won't work, but you can test the UI.

## Testing Push Notifications

### 1. Generate Valid Token
- Use the "Refresh Token" button in the debug section
- Token should start with `ExponentPushToken[` and end with `]`

### 2. Test Token Validity
- Use the "Test Token" button
- Should show "Token is valid and working correctly"

### 3. Backend Integration
- Ensure backend has correct Expo project configuration
- Test with real device tokens (not mock tokens)

## Troubleshooting

### "DeviceNotRegistered" Error
**Cause**: Using Expo Go or invalid token
**Solution**: Use development build

### "Invalid Expo push token" Error
**Cause**: Token format issue or wrong project
**Solution**: Refresh token or check project configuration

### Permission Denied Error
**Cause**: No access to Expo project
**Solution**: 
1. Get project access from owner
2. Create new Expo project
3. Update `app.json` with new projectId

### Build Fails
**Cause**: EAS configuration issues
**Solution**: Check `eas.json` configuration

## Development Workflow

### For UI Development
```bash
npx expo start  # Use Expo Go
```

### For Push Notification Testing
```bash
# 1. Create development build
npx eas build --platform android --profile development

# 2. Install on device

# 3. Start development server
npx expo start --dev-client
```

### For Production Testing
```bash
# 1. Create production build
npx eas build --platform android --profile production

# 2. Install on device

# 3. Test with real backend
```

## Configuration Files

### app.json
```json
{
  "expo": {
    "extra": {
      "eas": {
        "projectId": "6bac0265-f2ef-4a03-aeaa-9e90b92664ee"
      }
    }
  }
}
```

### eas.json
```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      }
    }
  }
}
```

## Best Practices

1. **Always test on physical devices** - emulators don't support push notifications
2. **Use development builds** for push notification testing
3. **Keep tokens updated** - refresh when needed
4. **Handle errors gracefully** - don't fail login if notifications fail
5. **Log token operations** - helps with debugging

## Support

If you encounter issues:
1. Check Expo documentation
2. Verify project permissions
3. Test with minimal configuration
4. Contact Expo support if needed

---

**Last Updated**: August 16, 2024  
**SDK Version**: 53  
**Status**: Requires development build for push notifications

