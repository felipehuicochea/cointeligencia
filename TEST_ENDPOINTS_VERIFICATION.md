# Test Endpoints Verification Guide

## Overview

This document provides detailed information about verifying and configuring test/sandbox API endpoints for supported cryptocurrency exchanges. Some exchanges may not have public testnets, and endpoints may need to be verified or updated based on official documentation.

---

## Current Test Endpoint Configuration

### ✅ Verified Test Endpoints

#### 1. **Binance**
- **Test Endpoint**: `https://testnet.binance.vision/api/v3/order`
- **Status**: ✅ Verified - Public testnet available
- **Documentation**: https://testnet.binance.vision/
- **API Key Generation**: Create test account at https://testnet.binance.vision/
- **Notes**: 
  - Full testnet environment available
  - Separate API keys required for testnet
  - Supports most REST API endpoints
  - Some `sapi/wapi` endpoints may not be available

#### 2. **Coinbase Pro**
- **Test Endpoint**: `https://api-public.sandbox.pro.coinbase.com/orders`
- **Status**: ✅ Verified - Public sandbox available
- **Documentation**: https://docs.pro.coinbase.com/#sandbox
- **API Key Generation**: Create sandbox account at https://public.sandbox.pro.coinbase.com/
- **Notes**:
  - Full sandbox environment available
  - Separate API keys required for sandbox
  - Supports all REST API endpoints
  - Test data may not reflect real market conditions

#### 3. **KuCoin**
- **Test Endpoint**: `https://openapi-sandbox.kucoin.com/api/v1/orders`
- **Status**: ✅ Verified - Public sandbox available
- **Documentation**: https://docs.kucoin.com/#sandbox-trading
- **API Key Generation**: Create sandbox account at https://sandbox.kucoin.com/
- **Notes**:
  - Full sandbox environment available
  - Separate API keys required for sandbox
  - Supports all REST API endpoints
  - Test data may not reflect real market conditions

#### 4. **Bybit**
- **Test Endpoint**: `https://api-testnet.bybit.com/v2/private/order/create`
- **Status**: ✅ Verified - Public testnet available
- **Documentation**: https://bybit-exchange.github.io/docs/testnet/
- **API Key Generation**: Create testnet account at https://testnet.bybit.com/
- **Notes**:
  - Full testnet environment available
  - Separate API keys required for testnet
  - Supports all REST API endpoints
  - Test data may not reflect real market conditions

---

### ⚠️ Needs Verification

#### 5. **MEXC**
- **Current Test Endpoint**: `https://testnet.mexc.com/api/v3/order`
- **Status**: ⚠️ Needs Verification
- **Documentation**: Check official MEXC API documentation
- **Verification Steps**:
  1. Check if MEXC provides a public testnet/sandbox environment
  2. Verify the test endpoint URL in official documentation
  3. Test the endpoint with a test API key
  4. Update the endpoint if incorrect
  
- **Alternative Options**:
  - If no public testnet exists, consider:
    - Using demo/test API keys with the live endpoint (if supported)
    - Implementing a mock/test mode that simulates responses
    - Using a third-party testing service
  
- **How to Verify**:
  1. Visit MEXC official documentation: https://mexcdevelop.github.io/apidocs/spot_v3_en/
  2. Look for testnet/sandbox documentation
  3. Check if test endpoint URLs are provided
  4. Test the endpoint with a test API key
  5. Verify response format matches expected structure

#### 6. **BingX**
- **Current Test Endpoint**: `https://open-api-testnet.bingx.com/openApi/spot/v1/trade/order`
- **Status**: ⚠️ Needs Verification
- **Documentation**: Check official BingX API documentation
- **Verification Steps**:
  1. Check if BingX provides a public testnet/sandbox environment
  2. Verify the test endpoint URL in official documentation
  3. Test the endpoint with a test API key
  4. Update the endpoint if incorrect
  
- **Alternative Options**:
  - If no public testnet exists, consider:
    - Using demo/test API keys with the live endpoint (if supported)
    - Implementing a mock/test mode that simulates responses
    - Using a third-party testing service
  
- **How to Verify**:
  1. Visit BingX official documentation: https://bingx.com/en-us/help/api/
  2. Look for testnet/sandbox documentation
  3. Check if test endpoint URLs are provided
  4. Test the endpoint with a test API key
  5. Verify response format matches expected structure

#### 7. **CoinEx**
- **Current Test Endpoint**: `https://testnet.coinex.com/v1/order`
- **Status**: ⚠️ Needs Verification
- **Documentation**: Check official CoinEx API documentation
- **Verification Steps**:
  1. Check if CoinEx provides a public testnet/sandbox environment
  2. Verify the test endpoint URL in official documentation
  3. Test the endpoint with a test API key
  4. Update the endpoint if incorrect
  
- **Alternative Options**:
  - If no public testnet exists, consider:
    - Using demo/test API keys with the live endpoint (if supported)
    - Implementing a mock/test mode that simulates responses
    - Using a third-party testing service
  
- **How to Verify**:
  1. Visit CoinEx official documentation: https://docs.coinex.com/
  2. Look for testnet/sandbox documentation
  3. Check if test endpoint URLs are provided
  4. Test the endpoint with a test API key
  5. Verify response format matches expected structure

#### 8. **Kraken**
- **Current Test Endpoint**: `https://api.kraken.com/0/private/AddOrder` (uses live endpoint)
- **Status**: ⚠️ Limited Test Support
- **Documentation**: https://support.kraken.com/en-us/articles/360024809011-api-testing-environment-derivatives
- **Notes**:
  - Kraken does NOT have a public spot trading testnet
  - Kraken DOES have a futures testnet: `https://demo-futures.kraken.com/derivatives/api/v3`
  - For spot trading, consider:
    - Using demo/test API keys with the live endpoint (if supported)
    - Implementing a mock/test mode that simulates responses
    - Using a third-party testing service
  
- **Futures Testnet**:
  - **Test Endpoint**: `https://demo-futures.kraken.com/derivatives/api/v3`
  - **Documentation**: https://support.kraken.com/en-us/articles/360024809011-api-testing-environment-derivatives
  - **API Key Generation**: Create demo account at https://demo-futures.kraken.com/
  - **Notes**: Only for futures trading, not spot trading

---

## Verification Process

### Step 1: Check Official Documentation

1. Visit the exchange's official API documentation
2. Look for sections on:
   - Testnet/Sandbox environment
   - Testing/Development endpoints
   - API key generation for testing
   - Test endpoint URLs

### Step 2: Test Endpoint Connectivity

1. Create a test account on the exchange (if available)
2. Generate test API keys
3. Test the endpoint with a simple API call:
   ```bash
   curl -X GET "https://testnet.example.com/api/v3/account" \
     -H "X-API-Key: YOUR_TEST_API_KEY" \
     -H "X-API-Secret: YOUR_TEST_API_SECRET"
   ```
4. Verify the response format matches expected structure

### Step 3: Test Order Submission

1. Create a test order with minimal quantity
2. Verify the order is accepted and processed
3. Check the order status and response format
4. Verify order execution (if supported in testnet)

### Step 4: Update Code if Needed

If the test endpoint is incorrect or unavailable:

1. Update the endpoint URL in `src/services/tradingService.ts`
2. Update the `getExchangeEndpoint()` method
3. Test the updated endpoint
4. Update documentation

---

## Updating Test Endpoints

### Location: `src/services/tradingService.ts`

The test endpoints are configured in the `getExchangeEndpoint()` method:

```typescript
private getExchangeEndpoint(exchange: string, testMode: boolean): string {
  const exchangeLower = exchange.toLowerCase();
  
  if (testMode) {
    // Test/Sandbox endpoints
    switch (exchangeLower) {
      case 'mexc':
        // Update this endpoint if incorrect
        return 'https://testnet.mexc.com/api/v3/order';
      case 'bingx':
        // Update this endpoint if incorrect
        return 'https://open-api-testnet.bingx.com/openApi/spot/v1/trade/order';
      case 'coinex':
        // Update this endpoint if incorrect
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
   - Save the file

3. **Test the update**:
   - Enable test mode in the app
   - Configure test API keys for the exchange
   - Send a test order
   - Verify the order is sent to the correct endpoint
   - Check console logs for endpoint confirmation

4. **Update documentation**:
   - Update this document with the verified endpoint
   - Update status from "Needs Verification" to "Verified"
   - Add any notes about the endpoint

---

## Alternative Solutions

### If No Public Testnet Exists

If an exchange does not provide a public testnet/sandbox environment, consider these alternatives:

#### 1. **Mock/Simulation Mode**
- Implement a mock mode that simulates exchange responses
- Use local test data instead of real API calls
- Useful for testing app logic without API dependencies

#### 2. **Demo/Test API Keys**
- Some exchanges allow demo/test API keys with the live endpoint
- These keys may have restrictions (e.g., no real trading, limited functionality)
- Check exchange documentation for demo API key options

#### 3. **Third-Party Testing Services**
- Use third-party services that provide test environments
- Some services simulate exchange APIs for testing
- Useful for comprehensive testing without real API access

#### 4. **Paper Trading Mode**
- Implement a paper trading mode that tracks orders without executing them
- Simulate order execution and track results
- Useful for testing order logic without API calls

---

## Testing Checklist

### For Each Exchange:

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

## Exchange-Specific Verification Resources

### MEXC
- **Official Documentation**: https://mexcdevelop.github.io/apidocs/spot_v3_en/
- **API Support**: Check MEXC support for testnet/sandbox information
- **Contact**: Reach out to MEXC API support for testnet availability

### BingX
- **Official Documentation**: https://bingx.com/en-us/help/api/
- **API Support**: Check BingX support for testnet/sandbox information
- **Contact**: Reach out to BingX API support for testnet availability

### CoinEx
- **Official Documentation**: https://docs.coinex.com/
- **API Support**: Check CoinEx support for testnet/sandbox information
- **Contact**: Reach out to CoinEx API support for testnet availability

### Kraken
- **Official Documentation**: https://support.kraken.com/en-us/articles/360024809011-api-testing-environment-derivatives
- **Futures Testnet**: https://demo-futures.kraken.com/
- **Spot Trading**: No public testnet available
- **Contact**: Reach out to Kraken API support for spot trading test options

---

## Implementation Notes

### Current Implementation

The app currently implements test mode with the following features:

1. **Test Mode Toggle**: Settings screen allows toggling between test and live mode
2. **Endpoint Routing**: Automatically routes to test endpoints when test mode is enabled
3. **Visual Indicators**: Dashboard and Settings show test mode status
4. **Logging**: Console logs indicate test vs live execution
5. **Error Handling**: Proper error handling for test endpoint failures

### Recommended Updates

1. **Verify Test Endpoints**: Verify MEXC, BingX, and CoinEx test endpoints
2. **Update Endpoints**: Update endpoints if incorrect or unavailable
3. **Add Mock Mode**: Consider adding mock mode for exchanges without testnets
4. **Enhanced Logging**: Add more detailed logging for test endpoint verification
5. **Error Messages**: Improve error messages for test endpoint failures

---

## Conclusion

Test endpoints are crucial for safe testing of order submission and handling. While some exchanges provide public testnets, others may not. It's important to:

1. **Verify endpoints** before using them in production
2. **Test thoroughly** with multiple demo alerts
3. **Update endpoints** if incorrect or unavailable
4. **Document findings** for future reference
5. **Consider alternatives** if no public testnet exists

By following this guide, you can ensure that test mode works correctly for all supported exchanges, allowing safe testing of order submission and handling without using real funds.

