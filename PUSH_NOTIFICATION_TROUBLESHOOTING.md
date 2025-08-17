# Push Notification Troubleshooting Guide

## Issue: "DeviceNotRegistered" Error

The error `"ExponentPushToken[RZBS31.Q2-143-27-25]" is not a valid Expo push token` with `"error":"DeviceNotRegistered"` indicates that the Expo push token is invalid or expired.

## Common Causes

### 1. **Token Expiration**
- Expo push tokens can expire over time
- Tokens may become invalid after app updates
- Solution: Refresh the token using the "Refresh Token" button

### 2. **Development vs Production Mismatch**
- Development tokens don't work in production builds
- Production tokens don't work in development
- Solution: Ensure you're using the correct build type

### 3. **Project Configuration Issues**
- Token generated from wrong Expo project
- Incorrect projectId in app.json
- Solution: Verify projectId matches your Expo project

### 4. **App Installation Issues**
- App was uninstalled and reinstalled
- App was updated from development to production
- Solution: Re-register for notifications

### 5. **Device/Simulator Issues**
- Push notifications don't work in simulators
- Physical device required for testing
- Solution: Test on a physical device

## Solutions

### Immediate Fixes

1. **Refresh Token**
   - Use the "Refresh Token" button in the debug section
   - This generates a new valid token

2. **Test Token**
   - Use the "Test Token" button to validate current token
   - Shows detailed error information

3. **Re-register Device**
   - Log out and log back in
   - This triggers a new token generation

### Development Setup

1. **Verify Project Configuration**
   ```json
   // app.json
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

2. **Check Expo Project**
   - Ensure projectId matches your Expo project
   - Verify project is properly configured

3. **Development vs Production**
   - Use Expo Go for development testing
   - Use EAS builds for production testing

### Backend Configuration

1. **Token Validation**
   - Backend now validates token format before sending
   - Checks for "DeviceNotRegistered" errors
   - Logs detailed error information

2. **Error Handling**
   - Backend handles invalid tokens gracefully
   - Returns detailed error messages
   - Suggests token refresh when needed

## Testing Steps

### 1. Generate New Token
```javascript
// In the app, use the "Refresh Token" button
// Or log out and log back in
```

### 2. Test Token Validity
```javascript
// Use the "Test Token" button to validate
// This sends a test notification to Expo's API
```

### 3. Verify Backend Integration
```bash
# Test with curl
curl -X POST https://exp.host/--/api/v2/push/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "YOUR_TOKEN_HERE",
    "title": "Test",
    "body": "Test notification"
  }'
```

## Debug Information

### Token Format Validation
Valid Expo tokens follow this pattern:
```
ExponentPushToken[alphanumeric_chars]
```

### Common Error Messages
- `"DeviceNotRegistered"` - Token is invalid/expired
- `"InvalidCredentials"` - Project configuration issue
- `"MessageTooBig"` - Notification payload too large
- `"MessageRateExceeded"` - Too many notifications sent

### Logging
- Check console logs for detailed error information
- Backend logs include token validation results
- Mobile app logs show token generation process

## Prevention

### 1. **Regular Token Refresh**
- Implement automatic token refresh
- Check token validity periodically
- Handle "DeviceNotRegistered" errors gracefully

### 2. **Proper Error Handling**
- Don't fail login if notifications fail
- Provide clear error messages
- Offer retry mechanisms

### 3. **Development Best Practices**
- Test on physical devices
- Use correct build types
- Validate tokens before sending

## Support

If issues persist:
1. Check Expo documentation
2. Verify project configuration
3. Test with minimal notification payload
4. Contact Expo support if needed

---

**Last Updated**: August 16, 2024  
**Version**: 1.0.0
