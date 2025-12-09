# Test Endpoints Verification Guide - Detailed Elaboration

## Overview

This document provides a comprehensive guide for verifying and configuring test/sandbox API endpoints for MEXC, BingX, and CoinEx exchanges. These exchanges require verification because their test endpoints may not be publicly documented or may not exist.

---

## Why Verification is Needed

### Current Status

The app currently includes placeholder test endpoints for MEXC, BingX, and CoinEx based on common naming conventions (e.g., `testnet.exchange.com`). However, these endpoints have **NOT been verified** and may:

1. **Not exist**: The exchange may not provide a public testnet/sandbox environment
2. **Be incorrect**: The endpoint URL may be different from what's configured
3. **Have different requirements**: Authentication, request format, or response structure may differ
4. **Have limitations**: Some features may not be available in the test environment

### Risks of Using Unverified Endpoints

1. **Order Failures**: Orders may fail silently or with unclear error messages
2. **Incorrect Testing**: Tests may not reflect actual exchange behavior
3. **Security Issues**: Unverified endpoints may pose security risks
4. **Wasted Time**: Debugging issues with incorrect endpoints can be time-consuming

---

## Verification Process for Each Exchange

### 1. MEXC (Mexc Global)

#### Current Configuration
- **Test Endpoint**: `https://testnet.mexc.com/api/v3/order`
- **Live Endpoint**: `https://api.mexc.com/api/v3/order`
- **Status**: ⚠️ **NEEDS VERIFICATION**

#### Verification Steps

1. **Check Official Documentation**
   - Visit: https://mexcdevelop.github.io/apidocs/spot_v3_en/
   - Look for sections on:
     - Testnet/Sandbox environment
     - Testing/Development endpoints
     - API key generation for testing
     - Test endpoint URLs
   - Search for keywords: "testnet", "sandbox", "test", "demo"

2. **Check Exchange Website**
   - Visit: https://www.mexc.com/
   - Look for:
     - Developer portal
     - API documentation
     - Testnet/sandbox information
     - Support or contact information

3. **Contact Exchange Support**
   - Reach out to MEXC API support
   - Ask about:
     - Testnet/sandbox environment availability
     - Test endpoint URLs
     - Test API key generation
     - Testing limitations or requirements

4. **Test Endpoint Connectivity**
   ```bash
   # Test if endpoint exists
   curl -X GET "https://testnet.mexc.com/api/v3/ping" \
     -H "X-MEXC-APIKEY: YOUR_TEST_API_KEY"
   ```
   - If endpoint exists, you should get a response
   - If endpoint doesn't exist, you'll get a connection error or 404

5. **Test with Test API Key**
   - Create a test account (if available)
   - Generate test API keys
   - Test a simple API call (e.g., get account info)
   - Verify response format matches expected structure

6. **Test Order Submission**
   - Submit a test order with minimal quantity
   - Verify order is accepted and processed
   - Check order status and response format
   - Verify order execution (if supported)

#### Expected Outcomes

- **Best Case**: MEXC provides a public testnet, endpoint is correct, and orders work as expected
- **Worst Case**: No public testnet exists, endpoint is incorrect, or orders don't work
- **Alternative**: Use demo/test API keys with live endpoint, implement mock mode, or use third-party testing

#### Alternative Solutions

If no public testnet exists:

1. **Demo/Test API Keys**
   - Check if MEXC allows demo/test API keys with live endpoint
   - These keys may have restrictions (e.g., no real trading, limited functionality)
   - Contact MEXC support for demo API key options

2. **Mock/Simulation Mode**
   - Implement a mock mode that simulates MEXC responses
   - Use local test data instead of real API calls
   - Useful for testing app logic without API dependencies

3. **Third-Party Testing Services**
   - Use third-party services that provide test environments
   - Some services simulate exchange APIs for testing
   - Useful for comprehensive testing without real API access

4. **Paper Trading Mode**
   - Implement a paper trading mode that tracks orders without executing them
   - Simulate order execution and track results
   - Useful for testing order logic without API calls

---

### 2. BingX

#### Current Configuration
- **Test Endpoint**: `https://open-api-testnet.bingx.com/openApi/spot/v1/trade/order`
- **Live Endpoint**: `https://open-api.bingx.com/openApi/spot/v1/trade/order`
- **Status**: ⚠️ **NEEDS VERIFICATION**

#### Verification Steps

1. **Check Official Documentation**
   - Visit: https://bingx.com/en-us/help/api/
   - Look for sections on:
     - Testnet/Sandbox environment
     - Testing/Development endpoints
     - API key generation for testing
     - Test endpoint URLs
   - Search for keywords: "testnet", "sandbox", "test", "demo"

2. **Check Exchange Website**
   - Visit: https://www.bingx.com/
   - Look for:
     - Developer portal
     - API documentation
     - Testnet/sandbox information
     - Support or contact information

3. **Contact Exchange Support**
   - Reach out to BingX API support
   - Ask about:
     - Testnet/sandbox environment availability
     - Test endpoint URLs
     - Test API key generation
     - Testing limitations or requirements

4. **Test Endpoint Connectivity**
   ```bash
   # Test if endpoint exists
   curl -X GET "https://open-api-testnet.bingx.com/openApi/spot/v1/common/server-time" \
     -H "X-BX-APIKEY: YOUR_TEST_API_KEY"
   ```
   - If endpoint exists, you should get a response
   - If endpoint doesn't exist, you'll get a connection error or 404

5. **Test with Test API Key**
   - Create a test account (if available)
   - Generate test API keys
   - Test a simple API call (e.g., get server time)
   - Verify response format matches expected structure

6. **Test Order Submission**
   - Submit a test order with minimal quantity
   - Verify order is accepted and processed
   - Check order status and response format
   - Verify order execution (if supported)

#### Expected Outcomes

- **Best Case**: BingX provides a public testnet, endpoint is correct, and orders work as expected
- **Worst Case**: No public testnet exists, endpoint is incorrect, or orders don't work
- **Alternative**: Use demo/test API keys with live endpoint, implement mock mode, or use third-party testing

#### Alternative Solutions

Same as MEXC (see above).

---

### 3. CoinEx

#### Current Configuration
- **Test Endpoint**: `https://testnet.coinex.com/v1/order`
- **Live Endpoint**: `https://api.coinex.com/v1/order`
- **Status**: ⚠️ **NEEDS VERIFICATION**

#### Verification Steps

1. **Check Official Documentation**
   - Visit: https://docs.coinex.com/
   - Look for sections on:
     - Testnet/Sandbox environment
     - Testing/Development endpoints
     - API key generation for testing
     - Test endpoint URLs
   - Search for keywords: "testnet", "sandbox", "test", "demo"

2. **Check Exchange Website**
   - Visit: https://www.coinex.com/
   - Look for:
     - Developer portal
     - API documentation
     - Testnet/sandbox information
     - Support or contact information

3. **Contact Exchange Support**
   - Reach out to CoinEx API support
   - Ask about:
     - Testnet/sandbox environment availability
     - Test endpoint URLs
     - Test API key generation
     - Testing limitations or requirements

4. **Test Endpoint Connectivity**
   ```bash
   # Test if endpoint exists
   curl -X GET "https://testnet.coinex.com/v1/market/ticker?market=BTCUSDT" \
     -H "Authorization: YOUR_TEST_API_KEY"
   ```
   - If endpoint exists, you should get a response
   - If endpoint doesn't exist, you'll get a connection error or 404

5. **Test with Test API Key**
   - Create a test account (if available)
   - Generate test API keys
   - Test a simple API call (e.g., get market ticker)
   - Verify response format matches expected structure

6. **Test Order Submission**
   - Submit a test order with minimal quantity
   - Verify order is accepted and processed
   - Check order status and response format
   - Verify order execution (if supported)

#### Expected Outcomes

- **Best Case**: CoinEx provides a public testnet, endpoint is correct, and orders work as expected
- **Worst Case**: No public testnet exists, endpoint is incorrect, or orders don't work
- **Alternative**: Use demo/test API keys with live endpoint, implement mock mode, or use third-party testing

#### Alternative Solutions

Same as MEXC (see above).

---

## Testing Checklist

### For Each Exchange:

- [ ] Check official documentation for testnet/sandbox information
- [ ] Verify test endpoint URL in official documentation
- [ ] Test endpoint connectivity with test API key
- [ ] Test order submission with minimal quantity
- [ ] Verify order response format matches expected structure
- [ ] Test order execution (if supported in testnet)
- [ ] Verify error handling for invalid orders
- [ ] Test order cancellation (if supported)
- [ ] Update code if endpoint is incorrect
- [ ] Update documentation with verified endpoint
- [ ] Test with multiple demo alerts
- [ ] Verify order submission and handling work correctly

### For Exchanges Without Public Testnet:

- [ ] Check for demo/test API key options
- [ ] Consider implementing mock/simulation mode
- [ ] Consider using third-party testing services
- [ ] Implement paper trading mode if applicable
- [ ] Document alternative testing approach

---

## Updating Test Endpoints in Code

### Location: `src/services/tradingService.ts`

The test endpoints are configured in the `getExchangeEndpoint()` method:

```typescript
private getExchangeEndpoint(exchange: string, testMode: boolean): string {
  const exchangeLower = exchange.toLowerCase();
  
  if (testMode) {
    // Test/Sandbox endpoints
    switch (exchangeLower) {
      case 'mexc':
        // Update this endpoint after verification
        return 'https://testnet.mexc.com/api/v3/order';
      case 'bingx':
        // Update this endpoint after verification
        return 'https://open-api-testnet.bingx.com/openApi/spot/v1/trade/order';
      case 'coinex':
        // Update this endpoint after verification
        return 'https://testnet.coinex.com/v1/order';
      // ... other exchanges
    }
  } else {
    // Live endpoints
    // ...
  }
}
```

### Steps to Update:

1. **Find the correct endpoint**:
   - Check official documentation
   - Test the endpoint with a test API key
   - Verify response format

2. **Update the code**:
   - Open `src/services/tradingService.ts`
   - Find the `getExchangeEndpoint()` method
   - Update the test endpoint URL for the exchange
   - Remove TODO comments if endpoint is verified
   - Add verification notes if endpoint is confirmed

3. **Test the update**:
   - Enable test mode in the app
   - Configure test API keys for the exchange
   - Send a test order
   - Verify the order is sent to the correct endpoint
   - Check console logs for endpoint confirmation

4. **Update documentation**:
   - Update `TEST_ENDPOINTS_VERIFICATION.md` with verified endpoint
   - Update status from "Needs Verification" to "Verified"
   - Add any notes about the endpoint

---

## Common Issues and Solutions

### Issue 1: Endpoint Doesn't Exist

**Symptoms**:
- Connection timeout
- 404 Not Found error
- DNS resolution failure

**Solutions**:
1. Verify endpoint URL in official documentation
2. Check if exchange provides testnet at all
3. Contact exchange support for correct endpoint
4. Consider alternative testing solutions

### Issue 2: Authentication Fails

**Symptoms**:
- 401 Unauthorized error
- Invalid API key error
- Authentication signature error

**Solutions**:
1. Verify test API keys are correct
2. Check if test API keys are required for testnet
3. Verify authentication method matches live endpoint
4. Check if additional headers or parameters are required

### Issue 3: Order Format Mismatch

**Symptoms**:
- 400 Bad Request error
- Invalid order parameters error
- Order rejected with unclear error

**Solutions**:
1. Verify order format matches testnet requirements
2. Check if testnet has different order parameters
3. Verify symbol format (e.g., BTC/USDT vs BTCUSDT)
4. Check if testnet has different order types

### Issue 4: Response Format Mismatch

**Symptoms**:
- Parsing errors
- Missing fields in response
- Unexpected response structure

**Solutions**:
1. Verify response format matches expected structure
2. Check if testnet has different response format
3. Update response parsing logic if needed
4. Add error handling for unexpected responses

---

## Best Practices

1. **Always Verify Endpoints**: Don't assume test endpoints exist or work correctly
2. **Test Thoroughly**: Test with multiple scenarios before using in production
3. **Document Findings**: Document verified endpoints and any limitations
4. **Update Code**: Update code when endpoints are verified or changed
5. **Monitor Changes**: Monitor exchange documentation for endpoint changes
6. **Have Alternatives**: Always have alternative testing solutions ready
7. **Error Handling**: Implement proper error handling for test endpoint failures
8. **Logging**: Add detailed logging for test endpoint verification

---

## Conclusion

Verifying test endpoints is crucial for safe testing of order submission and handling. While some exchanges provide public testnets, others may not. It's important to:

1. **Verify endpoints** before using them in production
2. **Test thoroughly** with multiple demo alerts
3. **Update endpoints** if incorrect or unavailable
4. **Document findings** for future reference
5. **Consider alternatives** if no public testnet exists

By following this guide, you can ensure that test mode works correctly for all supported exchanges, allowing safe testing of order submission and handling without using real funds.

---

## Additional Resources

- **MEXC API Documentation**: https://mexcdevelop.github.io/apidocs/spot_v3_en/
- **BingX API Documentation**: https://bingx.com/en-us/help/api/
- **CoinEx API Documentation**: https://docs.coinex.com/
- **Kraken Futures Testnet**: https://demo-futures.kraken.com/
- **Test Endpoints Verification Document**: `TEST_ENDPOINTS_VERIFICATION.md`

---

## Support

If you encounter issues verifying test endpoints, consider:

1. **Contact Exchange Support**: Reach out to exchange API support for testnet information
2. **Check Community Forums**: Look for community discussions about testnet availability
3. **Review Exchange Updates**: Check exchange announcements for testnet releases
4. **Implement Alternatives**: Use mock mode or third-party testing services if testnet is unavailable

