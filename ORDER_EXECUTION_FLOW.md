# Order Execution Flow - How the App Builds and Submits Orders

## Overview
This document explains how the Cointeligencia Android app receives trading alerts, processes them, builds orders, and submits them to cryptocurrency exchanges.

## Complete Flow Diagram

```
1. Alert Reception (Push Notification)
   ↓
2. Alert Parsing & Conversion
   ↓
3. Alert Storage (Local + Redux)
   ↓
4. Mode Check (AUTO vs MANUAL)
   ↓
5. Alert Parsing & Validation
   ↓
6. Order Building
   ↓
7. Exchange Authentication
   ↓
8. Order Execution
   ↓
9. Response Parsing
   ↓
10. Status Update
```

---

## Step-by-Step Process

### 1. Alert Reception (Push Notification)

**Location**: `App.tsx` (lines 130-212)

The app receives trading alerts via Firebase Cloud Messaging (FCM) push notifications. Two listeners are set up:

- **Foreground Listener**: Handles alerts when app is open
- **Background Listener**: Handles alerts when app is in background or closed

```typescript
// When a notification is received
if (remoteMessage.data?.type === 'trading_alert') {
  const tradeAlert = convertMessageToTradeAlert(remoteMessage.data);
  // Process the alert...
}
```

**Notification Data Structure**:
- `type`: "trading_alert"
- `pair` or `symbol`: Trading pair (e.g., "BTC/USDT")
- `side`: "L" (Long/BUY), "S" (Short/SELL), "C" (Close)
- `price`: Entry price
- `quantity`: Order quantity
- `exchange`: Exchange name (e.g., "Binance")
- `strategy`: Strategy name
- `stopLoss`: Optional stop loss price
- `takeProfit`: Optional take profit price

---

### 2. Alert Parsing & Conversion

**Location**: `App.tsx` (lines 80-107)

The raw notification data is converted into a standardized `TradeAlert` object:

```typescript
const convertMessageToTradeAlert = (message: any): TradeAlert => {
  // Map backend side codes to frontend codes
  const sideMapping = {
    'L': 'BUY',    // Long
    'S': 'SELL',   // Short
    'C': 'SELL',   // Close
    'CL': 'SELL',  // Close Long
    'CS': 'BUY',   // Close Short (buy to cover)
  };

  return {
    id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    symbol: message.pair || message.symbol || 'UNKNOWN',
    side: sideMapping[message.side] || 'BUY',
    quantity: message.quantity || 1.0,
    price: parseFloat(message.price) || 0,
    stopLoss: message.stopLoss ? parseFloat(message.stopLoss) : undefined,
    takeProfit: message.takeProfit ? parseFloat(message.takeProfit) : undefined,
    exchange: message.exchange || 'binance',
    strategy: message.strategy || 'Unknown',
    timestamp: new Date().toISOString(),
    status: 'pending',
  };
};
```

---

### 3. Alert Storage

**Location**: `App.tsx` (lines 142, 174) & `tradingService.ts` (lines 32-47)

The alert is stored in two places:

1. **Local Storage** (SecureStore): Persisted for offline access
   ```typescript
   await tradingService.storeTradeAlert(tradeAlert);
   ```

2. **Redux Store**: In-memory state management
   ```typescript
   dispatch(addTradeAlert(tradeAlert));
   ```

---

### 4. Mode Check (AUTO vs MANUAL)

**Location**: `App.tsx` (lines 148-159, 180-191)

The app checks the trading mode configuration:

- **AUTO Mode**: Automatically processes and executes the alert
- **MANUAL Mode**: Stores the alert and waits for user approval

```typescript
if (config.mode === 'AUTO') {
  await dispatch(processTradeAlert({
    alert: tradeAlert,
    config,
    credentials
  })).unwrap();
}
```

---

### 5. Alert Parsing & Validation

**Location**: `tradingService.ts` (lines 87-129)

The `parseTradeAlert` method processes the alert and prepares it for execution:

#### 5.1 Exchange Credentials Lookup
```typescript
const exchangeCreds = credentials.find(c => 
  c.exchange.toLowerCase() === alert.exchange.toLowerCase() && c.isActive
);

if (!exchangeCreds) {
  throw new Error(`No active credentials found for exchange: ${alert.exchange}`);
}
```

#### 5.2 Order Size Calculation

The app calculates the order quantity based on configuration:

**Percentage-based** (default):
```typescript
if (config.orderSizeType === 'percentage') {
  calculatedQuantity = alert.quantity * (config.orderSizeValue / 100);
  orderValue = calculatedQuantity * alert.price;
}
```

**Fixed amount**:
```typescript
else {
  calculatedQuantity = config.orderSizeValue / alert.price;
  orderValue = config.orderSizeValue;
}
```

#### 5.3 Position Size Limits

Applies maximum position size constraints:
```typescript
if (orderValue > config.maxPositionSize) {
  calculatedQuantity = config.maxPositionSize / alert.price;
  orderValue = config.maxPositionSize;
}
```

**Result**: Creates a `ParsedTradeAlert` object with:
- `calculatedQuantity`: Final order quantity
- `calculatedPrice`: Order price
- `orderValue`: Total order value
- `exchangeCredentials`: Authenticated exchange credentials

---

### 6. Order Building

**Location**: `tradingService.ts` (lines 132-183)

The `buildExchangeOrder` method creates an exchange-specific order object:

#### 6.1 Base Order Structure
```typescript
const baseOrder = {
  symbol: symbol,           // e.g., "BTC/USDT"
  side: side.toLowerCase(), // "buy" or "sell"
  quantity: calculatedQuantity,
  price: calculatedPrice,
  type: 'limit',            // Default to limit order
  timeInForce: 'GTC',       // Good Till Cancelled
};
```

#### 6.2 Exchange-Specific Parameters

Each exchange has unique requirements:

**Binance**:
```typescript
{
  ...baseOrder,
  newClientOrderId: `cointel_${Date.now()}`,
  icebergQty: 0,
}
```

**Kraken**:
```typescript
{
  ...baseOrder,
  userref: Date.now(),
  oflags: 'post', // Post-only order
}
```

**KuCoin**:
```typescript
{
  ...baseOrder,
  clientOid: `cointel_${Date.now()}`,
}
```

**Bybit**:
```typescript
{
  ...baseOrder,
  orderLinkId: `cointel_${Date.now()}`,
  category: 'spot',
}
```

---

### 7. Exchange Authentication

**Location**: `tradingService.ts` (lines 186-234)

The app authenticates with the exchange using API credentials:

```typescript
const headers = {
  'Content-Type': 'application/json',
  'X-API-Key': exchangeCredentials.apiKey,
  'X-API-Secret': exchangeCredentials.apiSecret,
  ...(exchangeCredentials.passphrase && { 
    'X-Passphrase': exchangeCredentials.passphrase 
  }),
};
```

**Note**: Different exchanges may require different authentication methods:
- **API Key + Secret**: Most exchanges
- **API Key + Secret + Passphrase**: Coinbase Pro, KuCoin
- **Signed Requests**: Some exchanges require request signing

---

### 8. Order Execution

**Location**: `tradingService.ts` (lines 376-420)

The app sends the order to the exchange API:

#### 8.1 Exchange-Specific API Endpoints

**Binance**:
```typescript
POST https://api.binance.com/api/v3/order
```

**Kraken**:
```typescript
POST https://api.kraken.com/0/private/AddOrder
```

**Coinbase Pro**:
```typescript
POST https://api.pro.coinbase.com/orders
```

**KuCoin**:
```typescript
POST https://api.kucoin.com/api/v1/orders
```

**Bybit**:
```typescript
POST https://api.bybit.com/v2/private/order/create
```

#### 8.2 Execution Flow
```typescript
const response = await fetch(exchangeAPIEndpoint, {
  method: 'POST',
  headers: authenticatedHeaders,
  body: JSON.stringify(orderData),
});

const exchangeResponse = await response.json();
```

---

### 9. Response Parsing

**Location**: `tradingService.ts` (lines 237-288)

The app parses the exchange response into a standardized format:

#### 9.1 Standardized Response Format
```typescript
interface ExchangeOrderResponse {
  orderId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  status: 'filled' | 'partial' | 'cancelled' | 'rejected';
  executedQuantity?: number;
  executedPrice?: number;
  timestamp: string;
  exchange: string;
  error?: string;
}
```

#### 9.2 Exchange-Specific Parsing

**Binance**:
```typescript
{
  orderId: response.orderId || response.clientOrderId,
  status: mapBinanceStatus(response.status),
  executedQuantity: parseFloat(response.executedQty) || 0,
  executedPrice: parseFloat(response.avgPrice) || calculatedPrice,
}
```

**Kraken**:
```typescript
{
  orderId: response.txid?.[0] || response.descr?.order,
  status: mapKrakenStatus(response.status),
  executedQuantity: parseFloat(response.vol_exec) || 0,
  executedPrice: parseFloat(response.cost) / parseFloat(response.vol_exec),
}
```

#### 9.3 Status Mapping

Each exchange uses different status codes:

**Binance**:
- `FILLED` → `filled`
- `PARTIALLY_FILLED` → `partial`
- `CANCELED` → `cancelled`
- `REJECTED` → `rejected`

**Kraken**:
- `closed` → `filled`
- `open` → `partial`
- `canceled` → `cancelled`

---

### 10. Status Update

**Location**: `tradingService.ts` (lines 320-335) & `tradingSlice.ts` (lines 239-263)

#### 10.1 Store Trade Result
```typescript
await this.storeTradeResult(alert.id, exchangeResponse);
```

#### 10.2 Update Redux State
```typescript
// In tradingSlice.ts
.addCase(processTradeAlert.fulfilled, (state, action) => {
  const alert = state.history.alerts.find(a => a.id === action.payload.alert.id);
  if (alert) {
    alert.status = action.payload.response.status === 'filled' ? 'executed' : 'failed';
    alert.executedPrice = action.payload.response.executedPrice;
    alert.executedAt = action.payload.response.timestamp;
    if (action.payload.response.error) {
      alert.error = action.payload.response.error;
    }
  }
})
```

#### 10.3 Update Local Storage
```typescript
await this.updateTradeAlertStatus(
  alertId, 
  'executed', 
  executedPrice
);
```

---

## Error Handling

### Common Error Scenarios

1. **No Exchange Credentials**
   - Error: `"No active credentials found for exchange: {exchange}"`
   - Action: Alert status set to `failed`

2. **Invalid Order Parameters**
   - Error: `"Exchange execution failed: {error}"`
   - Action: Alert status set to `failed`, error stored

3. **Network Errors**
   - Error: Connection timeout or network failure
   - Action: Alert status set to `failed`, retry may be attempted

4. **Exchange API Errors**
   - Error: Exchange-specific error (insufficient funds, invalid symbol, etc.)
   - Action: Alert status set to `failed`, error message stored

---

## Manual Mode Flow

When in **MANUAL** mode:

1. Alert is received and stored
2. Alert appears in Dashboard with `pending` status
3. User can manually approve or reject the trade
4. If approved, `processTradeAlert` is called manually
5. Order is executed same as AUTO mode

**Location**: `DashboardScreen.tsx` (lines 58-77)

```typescript
const handleProcessTradeAlert = async (alert: TradeAlert) => {
  try {
    await dispatch(processTradeAlert({
      alert,
      config,
      credentials
    })).unwrap();
  } catch (error) {
    // Handle error...
  }
};
```

---

## Key Configuration Parameters

### TradingConfig
- `mode`: `'AUTO' | 'MANUAL'` - Trading mode
- `orderSizeType`: `'percentage' | 'fixed'` - Order size calculation method
- `orderSizeValue`: `number` - Percentage (0-100) or fixed amount (USD)
- `maxPositionSize`: `number` - Maximum position size in USD
- `stopLossPercentage`: `number` - Stop loss percentage
- `takeProfitPercentage`: `number` - Take profit percentage
- `riskLevel`: `'low' | 'medium' | 'high'` - Risk level

### ExchangeCredentials
- `exchange`: `string` - Exchange name
- `apiKey`: `string` - API key
- `apiSecret`: `string` - API secret
- `passphrase`: `string?` - Passphrase (optional, for some exchanges)
- `isActive`: `boolean` - Whether credentials are active

---

## Supported Exchanges

Currently supported exchanges:
1. **Binance** - Full support
2. **Kraken** - Full support
3. **Coinbase Pro** - Full support
4. **KuCoin** - Full support
5. **Bybit** - Full support
6. **Mexc** - Configuration ready
7. **BingX** - Configuration ready
8. **Coinex** - Configuration ready

---

## Security Considerations

1. **Credential Storage**: API credentials are stored securely using Expo SecureStore
2. **API Key Permissions**: Ensure API keys have only trading permissions (not withdrawal)
3. **Request Signing**: Some exchanges require request signing for security
4. **Rate Limiting**: Exchanges may have rate limits on API requests
5. **Error Handling**: Sensitive error messages are logged but not exposed to users

---

## Testing & Debugging

### Logging
- All trade execution steps are logged to console
- Errors are logged with full context
- Exchange responses are logged for debugging

### Mock Implementation
- Some methods use mock implementations for testing
- Real exchange APIs are called in production
- Mock data can be used for development

---

## Future Enhancements

1. **Request Signing**: Implement proper request signing for exchanges that require it
2. **Order Types**: Support market orders, stop-loss orders, take-profit orders
3. **Partial Fills**: Handle partial order fills
4. **Order Cancellation**: Allow cancelling pending orders
5. **Balance Checking**: Verify sufficient balance before executing orders
6. **Risk Management**: Enhanced risk management checks
7. **Multi-Exchange**: Support executing same trade on multiple exchanges
8. **Order Tracking**: Track order status and update in real-time

---

## Summary

The app follows a clear, step-by-step process:

1. **Receive** alert via push notification
2. **Parse** alert data into standardized format
3. **Store** alert locally and in Redux
4. **Check** trading mode (AUTO/MANUAL)
5. **Parse** alert with trading configuration
6. **Build** exchange-specific order
7. **Authenticate** with exchange API
8. **Execute** order on exchange
9. **Parse** exchange response
10. **Update** alert status and store result

The entire process is handled asynchronously and includes comprehensive error handling to ensure reliability and user feedback.

