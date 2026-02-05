import { apiService } from './apiService';
import { ExchangeCredentials, TradingConfig, TradeAlert, MultientryLevel, MultientryOrder } from '../types';
import { secureStorageService } from './secureStorageService';
import { getExchangeCapability, isFuturesExchange, getBaseExchangeName } from './exchangeCapabilities';

// Exchange API response types
export interface ExchangeOrderResponse {
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
  rawApiResponse?: string; // Raw API response JSON string (for logging/debugging)
}

// Parsed trade alert with calculated values
export interface ParsedTradeAlert extends TradeAlert {
  calculatedQuantity: number;
  calculatedPrice: number;
  orderValue: number;
  exchangeCredentials?: ExchangeCredentials;
}

class TradingService {
  private static readonly TRADE_ALERTS_KEY = 'trade_alerts';
  private static readonly MULTIENTRY_ORDERS_KEY = 'multientry_orders';
  private static readonly EXCHANGE_CREDENTIALS_KEY = 'exchange_credentials';
  private static readonly TRADING_CONFIG_KEY = 'trading_config';
  private static readonly ENCRYPTION_KEY = 'cointel_encryption_key_v1'; // In production, use a secure key management system

  // Parse Multientry alert string: "L1,18.35:L2,18.06:L3,17.89:L4,17.78:ID,AVAX000005"
  parseMultientryAlert(alertString: string, baseAmount: number): { levels: MultientryLevel[]; multientryId?: string } {
    const levels: MultientryLevel[] = [];
    let multientryId: string | undefined;
    const parts = alertString.split(':');
    
    for (const part of parts) {
      const [key, value] = part.split(',');
      if (key && value) {
        if (key === 'L1' || key === 'L2' || key === 'L3' || key === 'L4') {
          const price = parseFloat(value);
          if (!isNaN(price)) {
            const levelNum = parseInt(key.substring(1)); // Extract number from L1, L2, etc.
            const quantity = (baseAmount * levelNum) / price; // Calculate quantity based on level multiplier
            
            levels.push({
              level: key as 'L1' | 'L2' | 'L3' | 'L4',
              price: price,
              quantity: quantity,
              orderType: key === 'L1' ? 'market' : 'limit',
            });
          }
        } else if (key === 'ID') {
          multientryId = value;
        }
      }
    }
    
    const sortedLevels = levels.sort((a, b) => {
      // Sort by level: L1, L2, L3, L4
      const order = { 'L1': 1, 'L2': 2, 'L3': 3, 'L4': 4 };
      return order[a.level] - order[b.level];
    });

    return { levels: sortedLevels, multientryId };
  }

  // Parse close alert: "TP:ID,AVAX000005"
  parseCloseAlert(alertString: string): { type: 'TP' | 'SL'; multientryId?: string } {
    const parts = alertString.split(':');
    let multientryId: string | undefined;
    let type: 'TP' | 'SL' = 'TP';

    for (const part of parts) {
      const [key, value] = part.split(',');
      if (key === 'TP' || key === 'SL') {
        type = key as 'TP' | 'SL';
      } else if (key === 'ID' && value) {
        multientryId = value;
      }
    }

    return { type, multientryId };
  }

  // Store Multientry order tracking
  async storeMultientryOrder(order: MultientryOrder): Promise<void> {
    try {
      const existingOrders = await this.getMultientryOrders();
      const updatedOrders = existingOrders.filter(o => o.multientryId !== order.multientryId);
      updatedOrders.push(order);
      
      // Get existing user data (may be null if first time)
      const existingUserData = await secureStorageService.getUserData() || {};
      
      await secureStorageService.storeUserData({
        ...existingUserData,
        [TradingService.MULTIENTRY_ORDERS_KEY]: updatedOrders
      });
    } catch (error) {
      console.error('Failed to store Multientry order:', error);
    }
  }

  // Get stored Multientry orders
  async getMultientryOrders(): Promise<MultientryOrder[]> {
    try {
      const userData = await secureStorageService.getUserData();
      return userData?.[TradingService.MULTIENTRY_ORDERS_KEY] || [];
    } catch (error) {
      console.error('Failed to get Multientry orders:', error);
      return [];
    }
  }

  // Get Multientry order by ID
  async getMultientryOrderById(multientryId: string): Promise<MultientryOrder | null> {
    const orders = await this.getMultientryOrders();
    return orders.find(o => o.multientryId === multientryId) || null;
  }

  // Store trade alert locally
  async storeTradeAlert(alert: TradeAlert): Promise<void> {
    try {
      const existingAlerts = await this.getStoredTradeAlerts();
      const updatedAlerts = [alert, ...existingAlerts]; // Add new alert at the beginning
      
      // Keep only the last 100 alerts to prevent storage bloat
      const limitedAlerts = updatedAlerts.slice(0, 100);
      
      // Get existing user data (may be null if first time)
      const existingUserData = await secureStorageService.getUserData() || {};
      
      await secureStorageService.storeUserData({
        ...existingUserData,
        [TradingService.TRADE_ALERTS_KEY]: limitedAlerts
      });
    } catch (error) {
      console.error('Failed to store trade alert:', error);
    }
  }

  // Get stored trade alerts
  async getStoredTradeAlerts(): Promise<TradeAlert[]> {
    try {
      const userData = await secureStorageService.getUserData();
      return userData?.[TradingService.TRADE_ALERTS_KEY] || [];
    } catch (error) {
      console.error('Failed to get stored trade alerts:', error);
      return [];
    }
  }

  // Update trade alert status
  async updateTradeAlertStatus(
    alertId: string, 
    status: TradeAlert['status'], 
    executedPrice?: number, 
    error?: string,
    apiResponse?: string
  ): Promise<void> {
    try {
      const alerts = await this.getStoredTradeAlerts();
      const alertIndex = alerts.findIndex(alert => alert.id === alertId);
      
      if (alertIndex !== -1) {
        alerts[alertIndex].status = status;
        if (executedPrice) {
          alerts[alertIndex].executedPrice = executedPrice;
          alerts[alertIndex].executedAt = new Date().toISOString();
        }
        if (error) {
          alerts[alertIndex].error = error;
        }
        if (apiResponse !== undefined) {
          alerts[alertIndex].apiResponse = apiResponse;
        }
        
        // Get existing user data (may be null if first time)
        const existingUserData = await secureStorageService.getUserData() || {};
        
        await secureStorageService.storeUserData({
          ...existingUserData,
          [TradingService.TRADE_ALERTS_KEY]: alerts
        });
      }
    } catch (error) {
      console.error('Failed to update trade alert status:', error);
    }
  }

  /**
   * Binance EU and Kraken EU use USDC pairs; alerts typically use USDT (or USD).
   * Convert symbol so order execution uses the correct pair and is not rejected.
   */
  private toExchangeSymbol(exchange: string, symbol: string): string {
    const base = (isFuturesExchange(exchange) ? getBaseExchangeName(exchange) : exchange).trim().toLowerCase();
    if (base !== 'binance eu' && base !== 'kraken eu') return symbol;
    return symbol.replace(/USDT$/i, 'USDC').replace(/USD$/i, 'USDC');
  }

  // Map strategy name from alert to strategy type
  private mapStrategyNameToType(strategyName: string): 'intraday' | 'multientry' | null {
    const strategyUpper = strategyName.toUpperCase();
    
    // BB* patterns map to intraday
    if (strategyUpper.startsWith('BB')) {
      return 'intraday';
    }
    
    // SARTP* patterns map to multientry
    if (strategyUpper.startsWith('SARTP')) {
      return 'multientry';
    }
    
    // Fallback: check if it's a direct match
    const strategyLower = strategyName.toLowerCase();
    if (strategyLower === 'intraday' || strategyLower === 'intradía' || strategyLower === 'intradia') {
      return 'intraday';
    }
    if (strategyLower === 'multientry' || strategyLower === 'multientrada') {
      return 'multientry';
    }
    
    return null;
  }

  /**
   * Get the user's configured (active) exchange credentials.
   * Orders are always sent to the exchange the user configured, not the exchange in the alert.
   */
  private getActiveCredential(credentials: ExchangeCredentials[]): ExchangeCredentials {
    const active = credentials.find(c => c.isActive);
    if (!active) {
      throw new Error('No exchange configured. Please add and validate credentials in Settings.');
    }
    return active;
  }

  // Parse trade alert and calculate order parameters
  parseTradeAlert(
    alert: TradeAlert, 
    config: TradingConfig, 
    credentials: ExchangeCredentials[]
  ): ParsedTradeAlert {
    // Map alert strategy name to strategy type (BB* → intraday, SARTP* → multientry)
    const strategyType = this.mapStrategyNameToType(alert.strategy);
    
    if (!strategyType) {
      throw new Error(`Unknown strategy: "${alert.strategy}". Supported strategies: BB* (Intraday), SARTP* (Multientry)`);
    }
    
    // Check if the mapped strategy type is enabled
    if (!config.enabledStrategies.includes(strategyType)) {
      throw new Error(`Strategy "${alert.strategy}" (${strategyType}) is not enabled. Please enable it in Settings.`);
    }

    // Use the user's configured exchange (not the alert's). Orders always go to the exchange the user set up.
    const exchangeCreds = this.getActiveCredential(credentials);

    // In test mode, use test API keys if available
    const effectiveCreds = config.testMode && exchangeCreds.testApiKey && exchangeCreds.testApiSecret
      ? {
          ...exchangeCreds,
          apiKey: exchangeCreds.testApiKey,
          apiSecret: exchangeCreds.testApiSecret,
          passphrase: exchangeCreds.testPassphrase || exchangeCreds.passphrase,
        }
      : exchangeCreds;

    // Calculate order quantity based on configuration
    let calculatedQuantity: number;
    let orderValue: number;

    if (config.orderSizeType === 'percentage') {
      // For percentage, we need to calculate based on available balance
      // This would typically require a balance check, but for now we'll use the alert quantity
      calculatedQuantity = alert.quantity * (config.orderSizeValue / 100);
      orderValue = calculatedQuantity * alert.price;
    } else {
      // For fixed amount, calculate quantity based on current price
      calculatedQuantity = config.orderSizeValue / alert.price;
      orderValue = config.orderSizeValue;
    }

    // Apply position size limits
    if (orderValue > config.maxPositionSize) {
      calculatedQuantity = config.maxPositionSize / alert.price;
      orderValue = config.maxPositionSize;
    }

    return {
      ...alert,
      exchange: effectiveCreds.exchange,
      calculatedQuantity,
      calculatedPrice: alert.price,
      orderValue,
      exchangeCredentials: effectiveCreds,
    };
  }

  // Build exchange API call based on parsed alert
  buildExchangeOrder(parsedAlert: ParsedTradeAlert): any {
    const { exchange, symbol, side, calculatedQuantity, calculatedPrice, stopLoss, takeProfit } = parsedAlert;
    const exchangeSymbol = this.toExchangeSymbol(exchange, symbol);

    const baseOrder = {
      symbol: exchangeSymbol,
      side: side.toLowerCase(),
      quantity: calculatedQuantity,
      price: calculatedPrice,
      type: 'limit', // Default to limit order
      timeInForce: 'GTC', // Good Till Cancelled
    };

    // Add exchange-specific parameters
    switch (exchange.toLowerCase()) {
      case 'binance':
      case 'binance eu':
        return {
          ...baseOrder,
          newClientOrderId: `cointel_${Date.now()}`,
          icebergQty: 0,
        };
      
      case 'kraken':
      case 'kraken eu':
        return {
          ...baseOrder,
          userref: Date.now(),
          oflags: 'post', // Post-only order
        };
      
      case 'coinbase':
        return {
          ...baseOrder,
          client_order_id: `cointel_${Date.now()}`,
          stp: 'dc', // Decrease and cancel
        };
      
      case 'kucoin':
        return {
          ...baseOrder,
          clientOid: `cointel_${Date.now()}`,
        };
      
      case 'bybit':
        // Determine category based on market type from credentials
        const bybitCredential = parsedAlert.exchangeCredentials;
        const bybitMarketType = bybitCredential?.marketType || 'spot';
        return {
          ...baseOrder,
          orderLinkId: `cointel_${Date.now()}`,
          category: bybitMarketType === 'futures' ? 'linear' : 'spot', // Bybit uses 'linear' for USD-M futures
        };
      
      default:
        return baseOrder;
    }
  }

  /**
   * Build exchange-specific order payload for multientry strategy.
   * L1 = market order, L2/L3/L4 = limit orders at indicated levels.
   * Ensures all exchanges receive correctly named and shaped parameters.
   */
  buildMultientryOrderForExchange(
    exchange: string,
    symbol: string,
    side: 'BUY' | 'SELL',
    orderType: 'market' | 'limit',
    quantity: number,
    price: number | undefined,
    exchangeCredentials?: ExchangeCredentials
  ): any {
    symbol = this.toExchangeSymbol(exchange, symbol);
    const exchangeLower = exchange.toLowerCase();
    const isFutures = exchangeCredentials?.marketType === 'futures' || isFuturesExchange(exchange);
    const baseExchange = isFuturesExchange(exchange) ? getBaseExchangeName(exchange) : exchange;
    const baseExchangeLower = baseExchange.toLowerCase();
    const clientId = `cointel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    switch (baseExchangeLower) {
      case 'binance':
      case 'binance eu': {
        const order: any = {
          symbol,
          side: side.toUpperCase(),
          type: orderType === 'market' ? 'MARKET' : 'LIMIT',
          quantity: String(quantity),
          newClientOrderId: clientId,
        };
        if (orderType === 'limit' && price !== undefined && !isNaN(price)) {
          order.timeInForce = 'GTC';
          order.price = String(price);
        }
        return order;
      }

      case 'bybit': {
        const category = exchangeCredentials?.marketType === 'futures' ? 'linear' : 'spot';
        const order: any = {
          category,
          symbol,
          side: side === 'BUY' ? 'Buy' : 'Sell',
          orderType: orderType === 'market' ? 'Market' : 'Limit',
          qty: String(quantity),
          orderLinkId: clientId,
        };
        if (orderType === 'limit' && price !== undefined && !isNaN(price)) {
          order.price = String(price);
        }
        return order;
      }

      case 'kraken':
      case 'kraken eu': {
        // Kraken: pair, type (buy/sell), ordertype (market/limit), volume, price (for limit)
        const order: any = {
          pair: symbol,
          type: side.toLowerCase(),
          ordertype: orderType === 'market' ? 'market' : 'limit',
          volume: String(quantity),
          userref: Date.now(),
        };
        if (orderType === 'limit' && price !== undefined && !isNaN(price)) {
          order.price = String(price);
        }
        return order;
      }

      case 'coinbase':
      case 'coinbase pro': {
        // Coinbase: product_id (e.g. BTC-USD), side, type (market/limit), size, price (for limit)
        const productId = symbol.includes('-') ? symbol.replace(/USDT$/i, 'USD') : `${symbol.replace(/USDT$/i, '')}-USD`;
        const order: any = {
          product_id: productId,
          side: side.toLowerCase(),
          type: orderType === 'market' ? 'market' : 'limit',
          size: String(quantity),
          client_order_id: clientId,
        };
        if (orderType === 'limit' && price !== undefined && !isNaN(price)) {
          order.price = String(price);
        }
        return order;
      }

      case 'kucoin': {
        const order: any = {
          symbol,
          side: side.toUpperCase(),
          type: orderType === 'market' ? 'MARKET' : 'LIMIT',
          size: String(quantity),
          clientOid: clientId,
        };
        if (orderType === 'limit' && price !== undefined && !isNaN(price)) {
          order.price = String(price);
        }
        return order;
      }

      case 'mexc': {
        const order: any = {
          symbol,
          side: side.toUpperCase(),
          type: orderType === 'market' ? 'MARKET' : 'LIMIT',
          quantity: String(quantity),
          newClientOrderId: clientId,
        };
        if (orderType === 'limit' && price !== undefined && !isNaN(price)) {
          order.price = String(price);
        }
        return order;
      }

      case 'bingx': {
        const order: any = {
          symbol,
          side: side.toUpperCase(),
          type: orderType === 'market' ? 'MARKET' : 'LIMIT',
          quantity: String(quantity),
        };
        if (orderType === 'limit' && price !== undefined && !isNaN(price)) {
          order.price = String(price);
        }
        return order;
      }

      case 'coinex': {
        const order: any = {
          market: symbol,
          market_type: 'SPOT',
          side: side.toLowerCase(),
          type: orderType === 'market' ? 'market' : 'limit',
          amount: String(quantity),
        };
        if (orderType === 'limit' && price !== undefined && !isNaN(price)) {
          order.price = String(price);
        }
        return order;
      }

      default:
        return {
          symbol,
          side: side.toLowerCase(),
          type: orderType === 'market' ? 'MARKET' : 'LIMIT',
          quantity: String(quantity),
          ...(orderType === 'limit' && price !== undefined && { price: String(price) }),
        };
    }
  }

  // Get exchange API endpoint (live or test)
  private getExchangeEndpoint(exchange: string, testMode: boolean, marketType?: 'spot' | 'futures'): string {
    const exchangeLower = exchange.toLowerCase();
    const isFutures = marketType === 'futures' || isFuturesExchange(exchange);
    const baseExchange = isFuturesExchange(exchange) ? getBaseExchangeName(exchange) : exchange;
    const baseExchangeLower = baseExchange.toLowerCase();
    
    if (testMode) {
      // Test/Sandbox endpoints
      switch (baseExchangeLower) {
        case 'binance':
        case 'binance eu':
          if (isFutures) {
            return 'https://testnet.binancefuture.com/fapi/v1/order'; // Binance Futures testnet
          }
          return 'https://testnet.binance.vision/api/v3/order';
        case 'kraken':
        case 'kraken eu':
          if (isFutures) {
            return 'https://demo-futures.kraken.com/derivatives/api/v3/sendorder'; // Kraken Futures testnet
          }
          // Kraken - LIMITED TEST SUPPORT
          // Kraken does NOT have a public spot trading testnet
          // Kraken DOES have a futures testnet: https://demo-futures.kraken.com/derivatives/api/v3
          // Documentation: https://support.kraken.com/en-us/articles/360024809011-api-testing-environment-derivatives
          // For spot trading, consider:
          // - Using demo/test API keys with live endpoint (if supported)
          // - Implementing mock/simulation mode
          // - Using third-party testing services
          // NOTE: This endpoint uses the live API. Test with caution!
          // TODO: Implement mock mode or find alternative testing solution for spot trading
          return 'https://api.kraken.com/0/private/AddOrder';
        case 'coinbase':
        case 'coinbase pro':
          return 'https://api-public.sandbox.pro.coinbase.com/orders';
        case 'kucoin':
          return 'https://openapi-sandbox.kucoin.com/api/v1/orders';
        case 'bybit':
          // Bybit uses same endpoint, category parameter determines spot/futures
          return 'https://api-testnet.bybit.com/v5/order/create'; // Updated to V5 API
        case 'mexc':
          // MEXC test endpoint - NEEDS VERIFICATION
          // TODO: Verify if MEXC provides a public testnet/sandbox environment
          // Documentation: https://mexcdevelop.github.io/apidocs/spot_v3_en/
          // Steps to verify:
          // 1. Check official MEXC API documentation for testnet/sandbox information
          // 2. Test the endpoint with a test API key
          // 3. Verify response format matches expected structure
          // 4. Update endpoint if incorrect or unavailable
          // If no testnet exists, consider:
          // - Using demo/test API keys with live endpoint (if supported)
          // - Implementing mock/simulation mode
          // - Using third-party testing services
          return 'https://testnet.mexc.com/api/v3/order';
        case 'bingx':
          // BingX test endpoint - NEEDS VERIFICATION
          // TODO: Verify if BingX provides a public testnet/sandbox environment
          // Documentation: https://bingx.com/en-us/help/api/
          // Steps to verify:
          // 1. Check official BingX API documentation for testnet/sandbox information
          // 2. Test the endpoint with a test API key
          // 3. Verify response format matches expected structure
          // 4. Update endpoint if incorrect or unavailable
          // If no testnet exists, consider:
          // - Using demo/test API keys with live endpoint (if supported)
          // - Implementing mock/simulation mode
          // - Using third-party testing services
          return 'https://open-api-testnet.bingx.com/openApi/spot/v1/trade/order';
        case 'coinex':
          // CoinEx test endpoint - Updated to V2 API
          // Note: CoinEx V1 API was discontinued on September 25, 2024
          // Documentation: https://docs.coinex.com/api/v2/
          // Test endpoint may not be available - using live endpoint with test credentials
          return 'https://api.coinex.com/v2/assets/spot/order';
        default:
          throw new Error(`Test endpoint not configured for exchange: ${exchange}`);
      }
    } else {
      // Live endpoints
      switch (baseExchangeLower) {
        case 'binance':
        case 'binance eu':
          if (isFutures) {
            return 'https://fapi.binance.com/fapi/v1/order'; // Binance USD-M Futures
          }
          return 'https://api.binance.com/api/v3/order';
        case 'kraken':
        case 'kraken eu':
          if (isFutures) {
            return 'https://futures.kraken.com/derivatives/api/v3/sendorder'; // Kraken Futures
          }
          return 'https://api.kraken.com/0/private/AddOrder';
        case 'coinbase':
        case 'coinbase pro':
          return 'https://api.pro.coinbase.com/orders';
        case 'kucoin':
          return 'https://api.kucoin.com/api/v1/orders';
        case 'bybit':
          // Bybit uses same endpoint, category parameter determines spot/futures
          return 'https://api.bybit.com/v5/order/create'; // Updated to V5 API
        case 'mexc':
          return 'https://api.mexc.com/api/v3/order';
        case 'bingx':
          return 'https://open-api.bingx.com/openApi/spot/v1/trade/order';
        case 'coinex':
          // CoinEx V2 API - Updated from deprecated V1
          // V1 API was discontinued on September 25, 2024
          // Documentation: https://docs.coinex.com/api/v2/
          return 'https://api.coinex.com/v2/assets/spot/order';
        default:
          throw new Error(`Unsupported exchange: ${exchange}`);
      }
    }
  }

  // Execute trade on exchange
  async executeTradeOnExchange(
    parsedAlert: ParsedTradeAlert, 
    orderData: any,
    testMode: boolean = false
  ): Promise<ExchangeOrderResponse> {
    const { exchange, exchangeCredentials } = parsedAlert;
    
    if (!exchangeCredentials) {
      throw new Error('No exchange credentials provided');
    }

    try {
      // Get the appropriate endpoint based on test mode and market type
      const marketType = exchangeCredentials.marketType || (isFuturesExchange(exchange) ? 'futures' : 'spot');
      const endpoint = this.getExchangeEndpoint(exchange, testMode, marketType);
      
      // Log test mode status
      if (testMode) {
        console.log(`[TEST MODE] Executing order on ${exchange} test endpoint: ${endpoint}`);
      } else {
        console.log(`[LIVE MODE] Executing order on ${exchange} live endpoint: ${endpoint}`);
      }

      // Add authentication headers based on exchange
      const exchangeLower = exchange.toLowerCase();
      const isFutures = marketType === 'futures' || isFuturesExchange(exchange);
      const baseExchange = isFuturesExchange(exchange) ? getBaseExchangeName(exchange) : exchange;
      const baseExchangeLower = baseExchange.toLowerCase();
      
      let headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      let requestBody: any = orderData;
      let requestUrl = endpoint;

      if (baseExchangeLower === 'binance' || baseExchangeLower === 'binance eu') {
        // Binance uses query string authentication for both spot and futures
        // API key goes in headers (X-MBX-APIKEY), signature goes in query string
        const timestamp = Date.now();
        const recvWindow = 5000;
        
        // Build query string (without signature)
        const queryParams = new URLSearchParams();
        Object.entries(orderData).forEach(([key, value]) => {
          queryParams.append(key, String(value));
        });
        queryParams.append('timestamp', timestamp.toString());
        queryParams.append('recvWindow', recvWindow.toString());
        
        // Generate signature from query string
        const signature = this.generateBinanceSignature(queryParams.toString(), exchangeCredentials.apiSecret);
        queryParams.append('signature', signature);
        
        // For Binance, use query string instead of JSON body
        requestUrl = `${endpoint}?${queryParams.toString()}`;
        requestBody = undefined;
        
        headers = {
          'Content-Type': 'application/json',
          'X-MBX-APIKEY': exchangeCredentials.apiKey,
        };
      } else if (baseExchangeLower === 'bybit') {
        // Bybit V5 API authentication
        const timestamp = Date.now();
        const recvWindow = 5000;
        const params = JSON.stringify(orderData);
        
        // Generate signature: timestamp + recvWindow + params
        const signature = this.generateBybitSignature(timestamp, recvWindow, params, exchangeCredentials.apiSecret);
        
        headers = {
          'Content-Type': 'application/json',
          'X-BAPI-API-KEY': exchangeCredentials.apiKey,
          'X-BAPI-SIGN': signature,
          'X-BAPI-SIGN-TYPE': '2',
          'X-BAPI-TIMESTAMP': timestamp.toString(),
          'X-BAPI-RECV-WINDOW': recvWindow.toString(),
        };
        requestBody = orderData;
      } else if (baseExchangeLower === 'kraken' || baseExchangeLower === 'kraken eu') {
        // Kraken authentication
        const nonce = Date.now();
        const postData = JSON.stringify(orderData);
        const path = new URL(endpoint).pathname + new URL(endpoint).search;
        
        // Generate signature: nonce + postData
        const signature = this.generateKrakenSignature(path, nonce, postData, exchangeCredentials.apiSecret);
        
        headers = {
          'Content-Type': 'application/json',
          'API-Key': exchangeCredentials.apiKey,
          'API-Sign': signature,
        };
        requestBody = { ...orderData, nonce };
      } else if (exchangeLower === 'coinex') {
        // Coinex V2 authentication
        const timestamp = Date.now();
        const method = 'POST';
        const path = new URL(endpoint).pathname;
        const body = JSON.stringify(orderData);
        
        // Generate signature for Coinex V2
        // Signature format: method + path + body + timestamp
        const message = `${method}${path}${body}${timestamp}`;
        const signature = this.generateCoinexV2Signature(message, exchangeCredentials.apiSecret);
        
        headers = {
          'Content-Type': 'application/json',
          'X-COINEX-KEY': exchangeCredentials.apiKey,
          'X-COINEX-SIGN': signature,
          'X-COINEX-TIMESTAMP': timestamp.toString(),
        };
        requestBody = orderData;
      } else {
        // Standard authentication for other exchanges (Coinbase, KuCoin, MEXC, BingX)
        headers = {
          'Content-Type': 'application/json',
          'X-API-Key': exchangeCredentials.apiKey,
          'X-API-Secret': exchangeCredentials.apiSecret,
          ...(exchangeCredentials.passphrase && { 'X-Passphrase': exchangeCredentials.passphrase }),
        };
        requestBody = orderData;
      }

      // Execute order on exchange with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const response = await fetch(requestUrl, {
        method: 'POST',
        headers,
        body: requestBody ? JSON.stringify(requestBody) : undefined,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      let responseData: any;
      let rawApiResponse: string = '';
      
      // Capture raw response before parsing
      try {
        const responseText = await response.text();
        rawApiResponse = responseText;
        
        if (!response.ok) {
          // Try to parse error response
          try {
            responseData = JSON.parse(responseText);
          } catch {
            responseData = { message: response.statusText };
          }
          // Include raw response in error for logging
          console.error(`[${testMode ? 'TEST' : 'LIVE'} MODE] Exchange API error:`, {
            status: response.status,
            statusText: response.statusText,
            rawResponse: rawApiResponse,
            parsedError: responseData
          });
          throw new Error(`Exchange API error: ${responseData.message || response.statusText}`);
        } else {
          // Parse successful response
          responseData = JSON.parse(responseText);
        }
      } catch (parseError: any) {
        // If parsing fails, use raw response
        console.error('Failed to parse API response:', parseError);
        rawApiResponse = rawApiResponse || 'Unable to capture response';
        throw new Error(`Failed to parse API response: ${parseError.message}`);
      }

      // Parse and standardize response
      const parsedResponse = this.parseExchangeResponse(responseData, exchange, parsedAlert);
      
      // Include raw API response in the parsed response for logging
      parsedResponse.rawApiResponse = rawApiResponse;
      
      return parsedResponse;
      
    } catch (error: any) {
      console.error(`[${testMode ? 'TEST' : 'LIVE'} MODE] Exchange execution failed:`, error);
      
      // Handle timeout specifically
      if (error.name === 'AbortError') {
        throw new Error('Request timeout: Exchange did not respond within 30 seconds');
      }
      
      // Handle network errors
      if (error.message?.includes('Network request failed') || error.message?.includes('Failed to fetch')) {
        throw new Error('Network error: Please check your internet connection and try again');
      }
      
      throw new Error(`Exchange execution failed: ${error.message}`);
    }
  }

  // Parse exchange-specific response into standard format (all exchanges)
  parseExchangeResponse(
    response: any, 
    exchange: string, 
    parsedAlert: ParsedTradeAlert
  ): ExchangeOrderResponse {
    const baseResponse = {
      symbol: parsedAlert.symbol,
      side: parsedAlert.side,
      quantity: parsedAlert.calculatedQuantity,
      price: parsedAlert.calculatedPrice,
      exchange,
      timestamp: new Date().toISOString(),
    };

    const exchangeLower = exchange.toLowerCase();
    const baseExchange = isFuturesExchange(exchange) ? getBaseExchangeName(exchange) : exchange;
    const baseExchangeLower = baseExchange.toLowerCase();

    switch (baseExchangeLower) {
      case 'binance':
      case 'binance eu': {
        const status = response.status ? this.mapBinanceStatus(response.status) : 'rejected';
        const executedQty = parseFloat(response.executedQty) || 0;
        const avgPrice = parseFloat(response.avgPrice) || parsedAlert.calculatedPrice;
        return {
          ...baseResponse,
          orderId: response.orderId || response.clientOrderId || 'unknown',
          status,
          executedQuantity: executedQty,
          executedPrice: executedQty > 0 ? avgPrice : parsedAlert.calculatedPrice,
        };
      }

      case 'kraken':
      case 'kraken eu': {
        const orderId = response.txid?.[0] || response.descr?.order || response.result?.txid?.[0] || 'unknown';
        const status = response.status ? this.mapKrakenStatus(response.status) : (response.result ? 'filled' : 'rejected');
        const volExec = parseFloat(response.vol_exec || response.result?.vol_exec) || 0;
        const cost = parseFloat(response.cost || response.result?.cost) || 0;
        const executedPrice = volExec > 0 ? cost / volExec : parsedAlert.calculatedPrice;
        return {
          ...baseResponse,
          orderId,
          status,
          executedQuantity: volExec,
          executedPrice,
        };
      }

      case 'coinbase':
      case 'coinbase pro': {
        const id = response.id || response.order_id;
        const status = response.status ? this.mapCoinbaseStatus(response.status) : 'rejected';
        const filledSize = parseFloat(response.filled_size || response.filled_size?.base) || 0;
        const executedValue = parseFloat(response.executed_value || response.executed_value?.quote) || 0;
        const executedPrice = filledSize > 0 ? executedValue / filledSize : parsedAlert.calculatedPrice;
        return {
          ...baseResponse,
          orderId: id || 'unknown',
          status,
          executedQuantity: filledSize,
          executedPrice,
        };
      }

      case 'bybit': {
        const result = response.result || response;
        const orderId = result.orderId || result.order_id || response.orderId || 'unknown';
        const orderStatus = (result.orderStatus || result.order_status || result.status || '').toUpperCase();
        const filledQty = parseFloat(result.cumExecQty || result.cum_exec_qty || result.executedQty || '0') || 0;
        const avgPrice = parseFloat(result.avgPrice || result.avg_price || result.avgPrice) || parsedAlert.calculatedPrice;
        const status = orderStatus === 'FILLED' ? 'filled' : orderStatus === 'PARTIALLYFILLED' || orderStatus === 'PARTIALLY_FILLED' ? 'partial' : orderStatus === 'CANCELLED' || orderStatus === 'CANCELED' ? 'cancelled' : 'rejected';
        return {
          ...baseResponse,
          orderId,
          status,
          executedQuantity: filledQty,
          executedPrice: filledQty > 0 ? avgPrice : parsedAlert.calculatedPrice,
        };
      }

      case 'kucoin': {
        const orderId = response.data?.orderId || response.orderId || response.data?.order_id || response.id || 'unknown';
        const statusStr = (response.data?.status || response.status || '').toLowerCase();
        const status = statusStr === 'done' || statusStr === 'filled' ? 'filled' : statusStr === 'open' || statusStr === 'partial' ? 'partial' : statusStr === 'cancel' ? 'cancelled' : 'rejected';
        const dealSize = parseFloat(response.data?.dealSize || response.data?.deal_size || response.dealSize || '0') || 0;
        const dealFunds = parseFloat(response.data?.dealFunds || response.data?.deal_funds || response.dealFunds || '0') || 0;
        const executedPrice = dealSize > 0 ? dealFunds / dealSize : parsedAlert.calculatedPrice;
        return {
          ...baseResponse,
          orderId,
          status,
          executedQuantity: dealSize,
          executedPrice,
        };
      }

      case 'mexc': {
        const orderId = response.orderId || response.clientOrderId || response.id || 'unknown';
        const statusStr = (response.status || '').toUpperCase();
        const status = statusStr === 'FILLED' ? 'filled' : statusStr === 'PARTIALLY_FILLED' ? 'partial' : statusStr === 'CANCELED' || statusStr === 'CANCELLED' ? 'cancelled' : 'rejected';
        const executedQty = parseFloat(response.executedQty || response.executed_qty || '0') || 0;
        const avgPrice = parseFloat(response.avgPrice || response.price || '0') || parsedAlert.calculatedPrice;
        return {
          ...baseResponse,
          orderId,
          status,
          executedQuantity: executedQty,
          executedPrice: executedQty > 0 ? avgPrice : parsedAlert.calculatedPrice,
        };
      }

      case 'bingx': {
        const orderId = response.orderId || response.data?.orderId || response.order_id || 'unknown';
        const statusStr = (response.status || response.data?.status || '').toLowerCase();
        const status = statusStr === 'filled' ? 'filled' : statusStr === 'partial' ? 'partial' : statusStr === 'cancelled' || statusStr === 'canceled' ? 'cancelled' : 'rejected';
        const filledQty = parseFloat(response.filledQuantity || response.data?.filledQuantity || response.executedQty || '0') || 0;
        const avgPrice = parseFloat(response.avgPrice || response.data?.avgPrice || '0') || parsedAlert.calculatedPrice;
        return {
          ...baseResponse,
          orderId,
          status,
          executedQuantity: filledQty,
          executedPrice: filledQty > 0 ? avgPrice : parsedAlert.calculatedPrice,
        };
      }

      case 'coinex': {
        const orderId = response.data?.order_id || response.order_id || response.id || response.data?.id || 'unknown';
        const statusStr = (response.data?.status ?? response.status ?? '').toString().toLowerCase();
        const status = statusStr === 'done' || statusStr === 'filled' ? 'filled' : statusStr === 'open' || statusStr === 'partial' ? 'partial' : statusStr === 'cancel' ? 'cancelled' : 'rejected';
        const amountDone = parseFloat(response.data?.amount_done ?? response.amount_done ?? '0') || 0;
        const price = parseFloat(response.data?.price ?? response.price ?? '0') || parsedAlert.calculatedPrice;
        return {
          ...baseResponse,
          orderId,
          status,
          executedQuantity: amountDone,
          executedPrice: amountDone > 0 ? price : parsedAlert.calculatedPrice,
        };
      }

      default:
        return {
          ...baseResponse,
          orderId: response.orderId || response.order_id || response.id || response.data?.orderId || 'unknown',
          status: (response.status || response.data?.status) ? (response.status || response.data?.status).toString().toLowerCase().includes('fill') ? 'filled' : 'rejected' : 'filled',
          executedQuantity: parseFloat(response.executedQty || response.executed_qty || response.filled_size || response.vol_exec || '0') || parsedAlert.calculatedQuantity,
          executedPrice: parseFloat(response.avgPrice || response.executed_value || response.price || '0') || parsedAlert.calculatedPrice,
        };
    }
  }

  // Map exchange-specific statuses to standard format
  mapBinanceStatus(status: string): 'filled' | 'partial' | 'cancelled' | 'rejected' {
    switch (status) {
      case 'FILLED': return 'filled';
      case 'PARTIALLY_FILLED': return 'partial';
      case 'CANCELED': return 'cancelled';
      case 'REJECTED': return 'rejected';
      default: return 'rejected';
    }
  }

  mapKrakenStatus(status: string): 'filled' | 'partial' | 'cancelled' | 'rejected' {
    switch (status) {
      case 'closed': return 'filled';
      case 'open': return 'partial';
      case 'canceled': return 'cancelled';
      default: return 'rejected';
    }
  }

  mapCoinbaseStatus(status: string): 'filled' | 'partial' | 'cancelled' | 'rejected' {
    switch (status) {
      case 'done': return 'filled';
      case 'open': return 'partial';
      case 'canceled': return 'cancelled';
      default: return 'rejected';
    }
  }

  // Store trade execution result
  async storeTradeResult(
    alertId: string, 
    exchangeResponse: ExchangeOrderResponse
  ): Promise<void> {
    try {
      // Mock implementation - in real app this would store to backend
      console.log('Storing trade result - using mock implementation', {
        alertId,
        exchangeResponse,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to store trade result:', error);
      // Don't throw here as the trade was executed successfully
    }
  }

  // Main method to process trade alert
  async processTradeAlert(
    alert: TradeAlert,
    config: TradingConfig,
    credentials: ExchangeCredentials[]
  ): Promise<ExchangeOrderResponse> {
    try {
      // Check if this is a close alert (TP:ID or SL:ID format)
      if (alert.alert && (alert.alert.includes('TP:ID') || alert.alert.includes('SL:ID'))) {
        await this.processCloseAlert(alert, config, credentials);
        const activeCred = this.getActiveCredential(credentials);
        return {
          orderId: 'close_' + alert.id,
          symbol: alert.pair || alert.symbol,
          side: alert.side || ((alert as any).action?.toUpperCase() === 'SELL' ? 'SELL' : 'BUY'),
          quantity: 0,
          price: Number(alert.price) || 0,
          status: 'filled',
          timestamp: new Date().toISOString(),
          exchange: activeCred.exchange,
        };
      }

      // Check if this is a Multientry entry strategy
      const isMultientry = alert.strategy.toLowerCase().includes('sartp') || 
                          alert.strategy.toLowerCase() === 'multientry' ||
                          (alert.alert !== undefined && alert.alert.includes('L1'));

      if (isMultientry && alert.alert) {
        return await this.processMultientryAlert(alert, config, credentials);
      }

      // Standard Intraday processing
      // 1. Parse the alert
      const parsedAlert = this.parseTradeAlert(alert, config, credentials);
      
      // 2. Build exchange order
      const orderData = this.buildExchangeOrder(parsedAlert);
      
      // 3. Execute on exchange (pass testMode from config)
      const exchangeResponse = await this.executeTradeOnExchange(
        parsedAlert, 
        orderData, 
        config.testMode
      );
      
      // 4. Store result
      await this.storeTradeResult(alert.id, exchangeResponse);
      
      // 5. Update alert with API response for logging
      await this.updateTradeAlertStatus(
        alert.id,
        exchangeResponse.status === 'filled' ? 'executed' : 'failed',
        exchangeResponse.executedPrice,
        exchangeResponse.error,
        exchangeResponse.rawApiResponse
      );
      
      // Log execution mode (use user's exchange, not alert's)
      console.log(`Trade alert ${alert.id} ${config.testMode ? 'TEST' : 'LIVE'} executed:`, {
        exchange: parsedAlert.exchange,
        symbol: alert.symbol,
        side: alert.side,
        status: exchangeResponse.status,
        apiResponse: exchangeResponse.rawApiResponse ? 'captured' : 'not available',
      });
      
      return exchangeResponse;
      
      } catch (error: any) {
        // Capture error details as API response for logging
        const errorResponse = {
          error: error.message,
          timestamp: new Date().toISOString(),
          status: 'rejected',
          exchange: alert.exchange,
          symbol: alert.symbol,
          side: alert.side,
        };
        
        const errorResponseJson = JSON.stringify(errorResponse, null, 2);
        
        // Store failed result
        await this.storeTradeResult(alert.id, {
          orderId: 'failed',
          symbol: alert.symbol,
          side: alert.side,
          quantity: 0,
          price: 0,
          status: 'rejected',
          timestamp: new Date().toISOString(),
          exchange: alert.exchange,
          error: error.message,
          rawApiResponse: errorResponseJson,
        });
        
        // Update alert with error response
        await this.updateTradeAlertStatus(
          alert.id,
          'failed',
          undefined,
          error.message,
          errorResponseJson
        );
        
        console.error(`Trade alert ${alert.id} ${config.testMode ? 'TEST' : 'LIVE'} execution failed:`, error);
        throw error;
      }
  }

  // Process Multientry strategy: Execute L1 (market) and L2-L4 (limit) orders
  async processMultientryAlert(
    alert: TradeAlert,
    config: TradingConfig,
    credentials: ExchangeCredentials[]
  ): Promise<ExchangeOrderResponse> {
    if (!alert.alert) {
      throw new Error('Multientry alert missing alert field');
    }

    // Parse the alert string to get entry levels and ID
    const parsed = this.parseMultientryAlert(alert.alert, config.multientryBaseAmount);
    const { levels, multientryId } = parsed;
    
    if (levels.length === 0) {
      throw new Error('Failed to parse Multientry alert levels');
    }

    if (!multientryId) {
      throw new Error('Multientry alert missing ID');
    }

    // Use the user's configured exchange (not the alert's)
    const exchangeCreds = this.getActiveCredential(credentials);

    // Use test credentials if in test mode
    const effectiveCreds = config.testMode && exchangeCreds.testApiKey && exchangeCreds.testApiSecret
      ? {
          ...exchangeCreds,
          apiKey: exchangeCreds.testApiKey,
          apiSecret: exchangeCreds.testApiSecret,
          passphrase: exchangeCreds.testPassphrase || exchangeCreds.passphrase,
        }
      : exchangeCreds;

    const userExchange = effectiveCreds.exchange;
    const symbol = alert.pair || alert.symbol;
    const side: 'BUY' | 'SELL' = alert.side || ((alert as any).action?.toUpperCase() === 'SELL' ? 'SELL' : 'BUY');
    const results: ExchangeOrderResponse[] = [];
    const orderLevels: MultientryOrder['levels'] = [];

    // Execute all orders immediately: L1 = market, L2/L3/L4 = limit at indicated levels
    for (const level of levels) {
      try {
        const orderData = this.buildMultientryOrderForExchange(
          userExchange,
          symbol,
          side,
          level.orderType,
          level.quantity,
          level.orderType === 'limit' ? level.price : undefined,
          effectiveCreds
        );

        const parsedAlert: ParsedTradeAlert = {
          ...alert,
          exchange: userExchange,
          calculatedQuantity: level.quantity,
          calculatedPrice: level.price,
          orderValue: level.quantity * level.price,
          exchangeCredentials: effectiveCreds,
        };

        const response = await this.executeTradeOnExchange(
          parsedAlert,
          orderData,
          config.testMode
        );

        results.push(response);
        
        // Track order status
        orderLevels.push({
          level: level.level,
          orderId: response.orderId,
          status: response.status === 'filled' ? 'filled' : response.status === 'partial' ? 'pending' : 'rejected',
          quantity: level.quantity,
          price: level.price,
          filledQuantity: response.executedQuantity,
          filledPrice: response.executedPrice,
        });
        
        // Update alert with API response for each level (store combined response)
        // Note: For multientry, we'll store the last API response or combine them
        if (response.rawApiResponse) {
          await this.updateTradeAlertStatus(
            alert.id,
            'pending', // Keep as pending until all levels are processed
            undefined,
            undefined,
            response.rawApiResponse // Update with latest level's response
          );
        }
        
        console.log(`Multientry ${level.level} order executed:`, {
          level: level.level,
          type: level.orderType,
          quantity: level.quantity,
          price: level.price,
          status: response.status,
          orderId: response.orderId,
          apiResponse: response.rawApiResponse ? 'captured' : 'not available',
        });
      } catch (error: any) {
        console.error(`Failed to execute ${level.level} order:`, error);
        
        // Capture error details as API response for logging
        const errorResponse = {
          error: error.message,
          level: level.level,
          timestamp: new Date().toISOString(),
          status: 'rejected',
        };
        
        // Update alert with error response
        await this.updateTradeAlertStatus(
          alert.id,
          'pending',
          undefined,
          error.message,
          JSON.stringify(errorResponse, null, 2)
        );
        
        results.push({
          orderId: 'failed',
          symbol: symbol,
          side: side,
          quantity: level.quantity,
          price: level.price,
          status: 'rejected',
          timestamp: new Date().toISOString(),
          exchange: userExchange,
          error: error.message,
          rawApiResponse: JSON.stringify(errorResponse, null, 2),
        });

        // Track failed order
        orderLevels.push({
          level: level.level,
          orderId: 'failed',
          status: 'rejected',
          quantity: level.quantity,
          price: level.price,
        });
      }
    }

    // Store Multientry order tracking (use user's exchange)
    const multientryOrder: MultientryOrder = {
      alertId: alert.id,
      multientryId: multientryId,
      symbol: symbol,
      exchange: userExchange,
      levels: orderLevels,
      createdAt: new Date().toISOString(),
      side: side,
    };
    await this.storeMultientryOrder(multientryOrder);

    // Store the first result (L1) as the main result, but log all
    const mainResult = results[0];
    await this.storeTradeResult(alert.id, mainResult);

    // Log all results
    console.log(`Multientry alert ${alert.id} ${config.testMode ? 'TEST' : 'LIVE'} executed:`, {
      exchange: userExchange,
      symbol: symbol,
      levels: results.map(r => ({ status: r.status, error: r.error })),
    });

    return mainResult;
  }

  // Cancel order on exchange
  async cancelOrderOnExchange(
    exchange: string,
    orderId: string,
    symbol: string,
    credentials: ExchangeCredentials,
    testMode: boolean = false
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Determine market type from credentials (default to spot if not specified)
      const marketType = credentials.marketType || (isFuturesExchange(exchange) ? 'futures' : 'spot');
      let endpoint = this.getExchangeEndpoint(exchange, testMode, marketType);
      
      // Coinex V2 uses different cancel endpoint structure
      if (exchange.toLowerCase() === 'coinex') {
        endpoint = endpoint.replace('/order', '/cancel-order');
      } else {
        // Most exchanges use DELETE method for cancel order
        endpoint = endpoint.replace('/order', '/cancelOrder');
      }
      
      // Build headers based on exchange (same authentication logic as executeTradeOnExchange)
      const exchangeLower = exchange.toLowerCase();
      const isFutures = credentials.marketType === 'futures' || isFuturesExchange(exchange);
      const baseExchange = isFuturesExchange(exchange) ? getBaseExchangeName(exchange) : exchange;
      const baseExchangeLower = baseExchange.toLowerCase();

      const cancelData = {
        symbol: symbol,
        orderId: orderId,
      };

      let headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      let requestBody: any = cancelData;
      let requestUrl = endpoint;

      if (baseExchangeLower === 'binance' || baseExchangeLower === 'binance eu') {
        // Binance uses query string authentication
        // API key goes in headers (X-MBX-APIKEY), signature goes in query string
        const timestamp = Date.now();
        const recvWindow = 5000;
        const queryParams = new URLSearchParams();
        Object.entries(cancelData).forEach(([key, value]) => {
          queryParams.append(key, String(value));
        });
        queryParams.append('timestamp', timestamp.toString());
        queryParams.append('recvWindow', recvWindow.toString());
        const signature = this.generateBinanceSignature(queryParams.toString(), credentials.apiSecret);
        queryParams.append('signature', signature);
        requestUrl = `${endpoint}?${queryParams.toString()}`;
        requestBody = undefined;
        headers = {
          'Content-Type': 'application/json',
          'X-MBX-APIKEY': credentials.apiKey,
        };
      } else if (baseExchangeLower === 'bybit') {
        // Bybit V5 API authentication
        const timestamp = Date.now();
        const recvWindow = 5000;
        const params = JSON.stringify(cancelData);
        const signature = this.generateBybitSignature(timestamp, recvWindow, params, credentials.apiSecret);
        headers = {
          'Content-Type': 'application/json',
          'X-BAPI-API-KEY': credentials.apiKey,
          'X-BAPI-SIGN': signature,
          'X-BAPI-SIGN-TYPE': '2',
          'X-BAPI-TIMESTAMP': timestamp.toString(),
          'X-BAPI-RECV-WINDOW': recvWindow.toString(),
        };
        requestBody = cancelData;
      } else if (baseExchangeLower === 'kraken' || baseExchangeLower === 'kraken eu') {
        // Kraken authentication
        const nonce = Date.now();
        const postData = JSON.stringify(cancelData);
        const path = new URL(endpoint).pathname + new URL(endpoint).search;
        const signature = this.generateKrakenSignature(path, nonce, postData, credentials.apiSecret);
        headers = {
          'Content-Type': 'application/json',
          'API-Key': credentials.apiKey,
          'API-Sign': signature,
        };
        requestBody = { ...cancelData, nonce };
      } else if (exchangeLower === 'coinex') {
        // Coinex V2 authentication
        const timestamp = Date.now();
        const method = 'DELETE';
        const path = new URL(endpoint).pathname;
        const body = JSON.stringify(cancelData);
        const message = `${method}${path}${body}${timestamp}`;
        const signature = this.generateCoinexV2Signature(message, credentials.apiSecret);
        headers = {
          'Content-Type': 'application/json',
          'X-COINEX-KEY': credentials.apiKey,
          'X-COINEX-SIGN': signature,
          'X-COINEX-TIMESTAMP': timestamp.toString(),
        };
        requestBody = cancelData;
      } else {
        // Standard authentication for other exchanges
        headers = {
          'Content-Type': 'application/json',
          'X-API-Key': credentials.apiKey,
          'X-API-Secret': credentials.apiSecret,
          ...(credentials.passphrase && { 'X-Passphrase': credentials.passphrase }),
        };
        requestBody = cancelData;
      }

      // Try DELETE method first (most common)
      const response = await fetch(requestUrl, {
        method: 'DELETE',
        headers,
        body: requestBody ? JSON.stringify(requestBody) : undefined,
      });

      if (!response.ok) {
        throw new Error(`Failed to cancel order: ${response.statusText}`);
      }

      return { success: true };
    } catch (error: any) {
      console.error(`Failed to cancel order ${orderId} on ${exchange}:`, error);
      return { success: false, error: error.message };
    }
  }

  // Process close alert: Cancel open orders and close positions
  async processCloseAlert(
    alert: TradeAlert,
    config: TradingConfig,
    credentials: ExchangeCredentials[]
  ): Promise<{ cancelled: number; closed: number; errors: string[] }> {
    if (!alert.alert) {
      throw new Error('Close alert missing alert field');
    }

    // Parse close alert to get ID
    const { multientryId } = this.parseCloseAlert(alert.alert);
    
    if (!multientryId) {
      throw new Error('Close alert missing Multientry ID');
    }

    // Find the Multientry order
    const multientryOrder = await this.getMultientryOrderById(multientryId);
    
    if (!multientryOrder) {
      throw new Error(`Multientry order not found for ID: ${multientryId}`);
    }

    // Use the user's configured exchange (not the stored order's)
    const exchangeCreds = this.getActiveCredential(credentials);

    // Use test credentials if in test mode
    const effectiveCreds = config.testMode && exchangeCreds.testApiKey && exchangeCreds.testApiSecret
      ? {
          ...exchangeCreds,
          apiKey: exchangeCreds.testApiKey,
          apiSecret: exchangeCreds.testApiSecret,
          passphrase: exchangeCreds.testPassphrase || exchangeCreds.passphrase,
        }
      : exchangeCreds;

    const userExchange = effectiveCreds.exchange;
    const symbol = alert.pair || alert.symbol || multientryOrder.symbol;
    const exchangeSymbol = this.toExchangeSymbol(userExchange, symbol);
    const closeSide: 'BUY' | 'SELL' = alert.side || ((alert as any).action?.toUpperCase() === 'SELL' ? 'SELL' : 'BUY');
    const results = { cancelled: 0, closed: 0, errors: [] as string[] };

    // STEP 1: Close L1 position first (if filled)
    const l1Level = multientryOrder.levels.find(l => l.level === 'L1' && l.status === 'filled' && l.filledQuantity);
    if (l1Level && l1Level.filledQuantity && l1Level.filledQuantity > 0) {
      try {
        // Create a market order to close the L1 position
        const closeOrderData = {
          symbol: exchangeSymbol,
          side: closeSide.toLowerCase(),
          type: 'MARKET',
          quantity: l1Level.filledQuantity,
        };

        const parsedAlert: ParsedTradeAlert = {
          ...alert,
          exchange: userExchange,
          calculatedQuantity: l1Level.filledQuantity,
          calculatedPrice: Number(alert.price) || 0,
          orderValue: l1Level.filledQuantity * (Number(alert.price) || 0),
          exchangeCredentials: effectiveCreds,
        };

        const closeResponse = await this.executeTradeOnExchange(
          parsedAlert,
          closeOrderData,
          config.testMode
        );

        if (closeResponse.status === 'filled' || closeResponse.status === 'partial') {
          results.closed++;
          console.log(`Closed L1 position: ${l1Level.filledQuantity} ${exchangeSymbol} at ${closeResponse.executedPrice}`);
        } else {
          results.errors.push(`Failed to close L1 position: ${closeResponse.status}`);
        }
      } catch (error: any) {
        results.errors.push(`Error closing L1 position: ${error.message}`);
      }
    }

    // STEP 2: Close any other filled limit orders (L2, L3, L4 that were filled)
    const filledLimitLevels = multientryOrder.levels.filter(
      l => l.level !== 'L1' && l.status === 'filled' && l.filledQuantity && l.filledQuantity > 0
    );
    
    if (filledLimitLevels.length > 0) {
      for (const level of filledLimitLevels) {
        if (level.filledQuantity && level.filledQuantity > 0) {
          try {
            const closeOrderData = {
              symbol: exchangeSymbol,
              side: closeSide.toLowerCase(),
              type: 'MARKET',
              quantity: level.filledQuantity,
            };

            const parsedAlert: ParsedTradeAlert = {
              ...alert,
              exchange: userExchange,
              calculatedQuantity: level.filledQuantity,
              calculatedPrice: Number(alert.price) || 0,
              orderValue: level.filledQuantity * (Number(alert.price) || 0),
              exchangeCredentials: effectiveCreds,
            };

            const closeResponse = await this.executeTradeOnExchange(
              parsedAlert,
              closeOrderData,
              config.testMode
            );

            if (closeResponse.status === 'filled' || closeResponse.status === 'partial') {
              results.closed++;
              console.log(`Closed ${level.level} position: ${level.filledQuantity} ${exchangeSymbol} at ${closeResponse.executedPrice}`);
            } else {
              results.errors.push(`Failed to close ${level.level} position: ${closeResponse.status}`);
            }
          } catch (error: any) {
            results.errors.push(`Error closing ${level.level} position: ${error.message}`);
          }
        }
      }
    }

    // STEP 3: Cancel open limit orders (L2, L3, L4 that are still pending)
    for (const level of multientryOrder.levels) {
      if (level.level !== 'L1' && level.status === 'pending' && level.orderId !== 'failed') {
        try {
          const cancelResult = await this.cancelOrderOnExchange(
            userExchange,
            level.orderId,
            exchangeSymbol,
            effectiveCreds,
            config.testMode
          );

          if (cancelResult.success) {
            results.cancelled++;
            console.log(`Cancelled ${level.level} order: ${level.orderId}`);
          } else {
            results.errors.push(`Failed to cancel ${level.level}: ${cancelResult.error}`);
          }
        } catch (error: any) {
          results.errors.push(`Error cancelling ${level.level}: ${error.message}`);
        }
      }
    }

    // Update Multientry order status to closed
    multientryOrder.levels.forEach(level => {
      if (level.status === 'pending') {
        level.status = 'cancelled';
      }
    });
    await this.storeMultientryOrder(multientryOrder);

    console.log(`Close alert processed for ${multientryId}:`, results);
    return results;
  }

  // Legacy exchange-specific execution methods (deprecated - use executeTradeOnExchange instead)
  // These are kept for backward compatibility but should not be used directly
  async executeOnBinance(orderData: any, headers: any, testMode: boolean = false): Promise<any> {
    const endpoint = testMode 
      ? 'https://testnet.binance.vision/api/v3/order'
      : 'https://api.binance.com/api/v3/order';
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(orderData),
    });
    return response.json();
  }

  async executeOnKraken(orderData: any, headers: any, testMode: boolean = false): Promise<any> {
    // Kraken doesn't have a public testnet
    const endpoint = 'https://api.kraken.com/0/private/AddOrder';
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(orderData),
    });
    return response.json();
  }

  async executeOnCoinbase(orderData: any, headers: any, testMode: boolean = false): Promise<any> {
    const endpoint = testMode
      ? 'https://api-public.sandbox.pro.coinbase.com/orders'
      : 'https://api.pro.coinbase.com/orders';
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(orderData),
    });
    return response.json();
  }

  async executeOnKucoin(orderData: any, headers: any, testMode: boolean = false): Promise<any> {
    const endpoint = testMode
      ? 'https://openapi-sandbox.kucoin.com/api/v1/orders'
      : 'https://api.kucoin.com/api/v1/orders';
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(orderData),
    });
    return response.json();
  }

  async executeOnBybit(orderData: any, headers: any, testMode: boolean = false): Promise<any> {
    const endpoint = testMode
      ? 'https://api-testnet.bybit.com/v2/private/order/create'
      : 'https://api.bybit.com/v2/private/order/create';
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(orderData),
    });
    return response.json();
  }

  // Since SecureStore already provides OS-level encryption,
  // we'll store the data directly without additional encryption
  // This avoids crypto module compatibility issues
  private encryptData(data: string): string {
    // Simply return the data as-is since SecureStore encrypts it
    // In the future, if additional encryption is needed, use a library
    // that works properly in React Native (e.g., react-native-quick-crypto)
    return data;
  }

  private decryptData(encryptedData: string): string {
    // Simply return the data as-is since SecureStore handles decryption
    return encryptedData;
  }

  // Save credentials to secure storage
  async saveCredentials(credentials: Omit<ExchangeCredentials, 'id' | 'createdAt'> | ExchangeCredentials): Promise<ExchangeCredentials> {
    try {
      // Validate required fields
      if (!credentials.exchange || !credentials.apiKey || !credentials.apiSecret) {
        throw new Error('Missing required fields: exchange, apiKey, and apiSecret are required');
      }

      // Load existing credentials
      const existingCredentials = await this.getCredentials();
      
      // Check if this is an update (has id) or new credential
      const hasId = 'id' in credentials && credentials.id;
      const hasCreatedAt = 'id' in credentials && credentials.createdAt;
      
      // Create credential with ID and timestamp
      const credentialWithId: ExchangeCredentials = hasId && hasCreatedAt
        ? credentials as ExchangeCredentials
        : {
      ...credentials,
            id: credentials.exchange + '_' + Date.now().toString(),
      createdAt: new Date().toISOString(),
    };

      // Check if credential for this exchange already exists (by ID if provided, otherwise by exchange)
      const existingIndex = hasId
        ? existingCredentials.findIndex(c => c.id === credentialWithId.id)
        : existingCredentials.findIndex(c => c.exchange === credentials.exchange);

      let updatedCredentials: ExchangeCredentials[];
      if (existingIndex >= 0) {
        // Update existing credential
        updatedCredentials = [...existingCredentials];
        updatedCredentials[existingIndex] = {
          ...credentialWithId,
          id: existingCredentials[existingIndex].id, // Keep existing ID
          createdAt: existingCredentials[existingIndex].createdAt, // Keep original creation date
        };
      } else {
        // Add new credential
        updatedCredentials = [...existingCredentials, credentialWithId];
      }

      // Encrypt and store credentials
      try {
        console.log('=== Starting credential save process ===');
        console.log('Number of credentials to save:', updatedCredentials.length);
        console.log('Exchange:', credentials.exchange);
        
        let credentialsJson: string;
        try {
          credentialsJson = JSON.stringify(updatedCredentials);
          console.log('Credentials JSON created, size:', credentialsJson.length, 'characters');
        } catch (jsonError: any) {
          console.error('JSON.stringify failed:', jsonError);
          throw new Error(`Failed to serialize credentials: ${jsonError.message || jsonError}`);
        }
        
        let encryptedCredentials: string;
        try {
          encryptedCredentials = this.encryptData(credentialsJson);
          console.log('Data prepared for storage, size:', encryptedCredentials.length, 'characters');
        } catch (encryptError: any) {
          console.error('Data preparation failed:', encryptError);
          throw new Error(`Data preparation failed: ${encryptError.message || encryptError}`);
        }
        
        // Get existing user data (may be null if first time)
        console.log('Retrieving existing user data...');
        let existingUserData: any;
        try {
          existingUserData = await secureStorageService.getUserData() || {};
          console.log('Existing user data retrieved, keys:', Object.keys(existingUserData));
        } catch (getDataError: any) {
          console.error('Failed to get existing user data:', getDataError);
          // Continue with empty object if we can't get existing data
          existingUserData = {};
        }

        // Merge with existing user data to preserve other stored data
        const userDataToStore = {
          ...existingUserData,
          [TradingService.EXCHANGE_CREDENTIALS_KEY]: encryptedCredentials
        };
        
        console.log('Prepared user data object with', Object.keys(userDataToStore).length, 'keys');
        console.log('Keys:', Object.keys(userDataToStore));
        console.log('Calling secureStorageService.storeUserData...');
        
        await secureStorageService.storeUserData(userDataToStore);
        console.log('secureStorageService.storeUserData completed successfully');

        console.log('Credentials saved successfully');
        const savedCredential = updatedCredentials.find(c => c.exchange === credentials.exchange) || credentialWithId;
        console.log('Returning saved credential for exchange:', savedCredential.exchange);
        return savedCredential;
      } catch (storageError: any) {
        console.error('Storage error details:', {
          message: storageError?.message,
          error: storageError,
          stack: storageError?.stack,
          code: storageError?.code,
          name: storageError?.name
        });
        console.error('Storage error JSON:', JSON.stringify(storageError, null, 2));
        throw new Error(`Failed to store credentials: ${storageError.message || storageError.code || storageError}`);
      }
    } catch (error: any) {
      console.error('Failed to save credentials - Full error:', JSON.stringify(error, null, 2));
      console.error('Failed to save credentials - Error object:', error);
      console.error('Failed to save credentials - Error message:', error?.message);
      console.error('Failed to save credentials - Error code:', error?.code);
      console.error('Failed to save credentials - Error name:', error?.name);
      console.error('Failed to save credentials - Error stack:', error?.stack);
      // Re-throw with more context if it's not already an Error object
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Failed to save credentials: ${error?.message || error?.code || String(error)}`);
    }
  }

  // Load credentials from secure storage
  async getCredentials(): Promise<ExchangeCredentials[]> {
    try {
      console.log('[tradingService] Loading credentials from storage...');
      const userData = await secureStorageService.getUserData();
      console.log('[tradingService] User data retrieved:', userData ? 'exists' : 'null');
      console.log('[tradingService] User data keys:', userData ? Object.keys(userData) : 'none');
      
      const encryptedCredentials = userData?.[TradingService.EXCHANGE_CREDENTIALS_KEY];
      console.log('[tradingService] Encrypted credentials found:', encryptedCredentials ? 'yes' : 'no');
      
      if (!encryptedCredentials) {
        console.log('[tradingService] No credentials found in storage');
    return [];
  }

      // Decrypt credentials (decryptData just returns data as-is now)
      const decryptedData = this.decryptData(encryptedCredentials);
      console.log('[tradingService] Decrypted data length:', decryptedData.length);
      const credentials = JSON.parse(decryptedData) as ExchangeCredentials[];
      console.log('[tradingService] Credentials loaded successfully, count:', credentials.length);
      return credentials;
    } catch (error: any) {
      console.error('[tradingService] Failed to get credentials:', error);
      console.error('[tradingService] Error details:', error?.message, error?.stack);
      return [];
    }
  }

  // Delete credentials from secure storage
  async deleteCredentials(credentialId: string): Promise<void> {
    try {
      const existingCredentials = await this.getCredentials();
      const updatedCredentials = existingCredentials.filter(c => c.id !== credentialId);
      
      // Encrypt and store updated credentials
      const encryptedCredentials = this.encryptData(JSON.stringify(updatedCredentials));
      
      // Get existing user data (may be null if first time)
      const existingUserData = await secureStorageService.getUserData() || {};
      
      // Merge with existing user data to preserve other stored data
      await secureStorageService.storeUserData({
        ...existingUserData,
        [TradingService.EXCHANGE_CREDENTIALS_KEY]: encryptedCredentials
      });

      console.log('Credential deleted successfully');
    } catch (error) {
      console.error('Failed to delete credentials:', error);
      throw new Error('Failed to delete credentials');
  }
  }

  // Save trading config to secure storage
  async updateConfig(config: Partial<TradingConfig>): Promise<TradingConfig> {
    try {
      // Load existing config
      const existingConfig = await this.getConfig();
      
      // Merge with new config
      const updatedConfig: TradingConfig = {
        ...existingConfig,
        ...config,
      };

      // Get existing user data (may be null if first time)
      const existingUserData = await secureStorageService.getUserData() || {};
      
      // Store config
      await secureStorageService.storeUserData({
        ...existingUserData,
        [TradingService.TRADING_CONFIG_KEY]: updatedConfig
      });

      console.log('Trading config updated successfully');
      return updatedConfig;
    } catch (error) {
      console.error('Failed to update config:', error);
      throw new Error('Failed to update config');
    }
  }

  // Load trading config from secure storage
  async getConfig(): Promise<TradingConfig> {
    try {
      console.log('[tradingService] Loading trading config from storage...');
      const userData = await secureStorageService.getUserData();
      console.log('[tradingService] User data for config:', userData ? 'exists' : 'null');
      const storedConfig = userData?.[TradingService.TRADING_CONFIG_KEY];
      console.log('[tradingService] Stored config found:', storedConfig ? 'yes' : 'no');

      if (!storedConfig) {
        // Return default config if none exists
        console.log('[tradingService] No config found, returning default');
    return {
      mode: 'MANUAL',
      defaultExchange: null,
      riskLevel: 'medium',
      maxPositionSize: 1000,
          stopLossPercentage: 5.3,
          takeProfitPercentage: 77,
      orderSizeType: 'percentage',
      orderSizeValue: 100,
          testMode: false,
          enabledStrategies: ['intraday'],
          multientryBaseAmount: 100,
        };
      }

      console.log('Trading config loaded successfully');
      return storedConfig as TradingConfig;
    } catch (error) {
      console.error('Failed to get config:', error);
      // Return default config on error
      return {
        mode: 'MANUAL',
        defaultExchange: null,
        riskLevel: 'medium',
        maxPositionSize: 1000,
        stopLossPercentage: 5.3,
        takeProfitPercentage: 77,
        orderSizeType: 'percentage',
        orderSizeValue: 100,
        testMode: false,
        enabledStrategies: ['intraday'],
        multientryBaseAmount: 100,
      };
    }
  }

  async executeTrade(alert: TradeAlert): Promise<TradeAlert> {
    // Mock implementation - in real app this would execute on exchange
    console.log('Executing trade - using mock implementation');
    return {
      ...alert,
      status: 'executed',
      executedPrice: alert.price,
      executedAt: new Date().toISOString(),
    };
  }

  async ignoreTrade(alertId: string): Promise<TradeAlert> {
    // Update the real alert status to ignored
    console.log('Ignoring trade:', alertId);
    await this.updateTradeAlertStatus(alertId, 'ignored');
    
    // Return the updated alert
    const alerts = await this.getStoredTradeAlerts();
    const alert = alerts.find(a => a.id === alertId);
    
    if (alert) {
      return alert;
    }
    
    // Fallback if alert not found
    throw new Error('Alert not found');
  }

  async getTradeHistory(): Promise<TradeAlert[]> {
    // Get real stored alerts instead of mock data
    console.log('Fetching trade history from local storage');
    const storedAlerts = await this.getStoredTradeAlerts();
    
    // If no stored alerts, return empty array (no mock data)
    if (storedAlerts.length === 0) {
      console.log('No stored alerts found');
      return [];
    }
    
    console.log(`Found ${storedAlerts.length} stored alerts`);
    return storedAlerts;
  }

  async clearIgnoredAlerts(): Promise<void> {
    try {
      console.log('Clearing ignored alerts from local storage');
      const existingAlerts = await this.getStoredTradeAlerts();
      
      // Keep only alerts that are not ignored (executed, pending, failed)
      const filteredAlerts = existingAlerts.filter(alert => alert.status !== 'ignored');
      
      const existingUserData = await secureStorageService.getUserData() || {};
      
      await secureStorageService.storeUserData({
        ...existingUserData,
        [TradingService.TRADE_ALERTS_KEY]: filteredAlerts
      });
      
      console.log(`Cleared ${existingAlerts.length - filteredAlerts.length} ignored alerts. Kept ${filteredAlerts.length} alerts.`);
    } catch (error) {
      console.error('Failed to clear ignored alerts:', error);
      throw new Error('Failed to clear ignored alerts');
    }
  }

  // Generate HMAC-SHA256 signature (generic)
  private generateHMACSignature(message: string, secret: string): string {
    try {
      const CryptoJS = require('crypto-js');
      return CryptoJS.HmacSHA256(message, secret).toString(CryptoJS.enc.Hex);
    } catch (error: any) {
      console.error('HMAC generation failed:', error);
      throw new Error(`Signature generation failed: ${error.message || error}`);
    }
  }

  // Generate Coinex V2 signature
  private generateCoinexV2Signature(message: string, secret: string): string {
    return this.generateHMACSignature(message, secret);
  }

  // Generate Binance signature (query string format)
  private generateBinanceSignature(queryString: string, secret: string): string {
    return this.generateHMACSignature(queryString, secret);
  }

  // Generate Bybit V5 signature
  private generateBybitSignature(timestamp: number, recvWindow: number, params: string, secret: string): string {
    const message = `${timestamp}${recvWindow}${params}`;
    return this.generateHMACSignature(message, secret);
  }

  // Generate Kraken signature
  private generateKrakenSignature(path: string, nonce: number, postData: string, secret: string): string {
    const message = `${nonce}${postData}`;
    const hash = this.generateHMACSignature(message, secret);
    // Kraken requires base64 encoding of the HMAC
    try {
      const CryptoJS = require('crypto-js');
      return CryptoJS.enc.Base64.stringify(CryptoJS.enc.Hex.parse(hash));
    } catch (error: any) {
      console.error('Kraken signature encoding failed:', error);
      throw new Error(`Kraken signature encoding failed: ${error.message || error}`);
    }
  }

  async getTradeAlert(alertId: string): Promise<TradeAlert> {
    // Mock implementation - in real app this would fetch from backend
    console.log('Getting trade alert - using mock implementation');
    return {
      id: alertId,
      symbol: 'BTC/USDT',
      side: 'BUY',
      quantity: 0.001,
      price: 45000,
      exchange: 'Binance',
      strategy: 'RSI Divergence',
      status: 'pending',
      timestamp: new Date().toISOString(),
    };
  }

  // Market data
  async getMarketPrice(symbol: string, exchange: string): Promise<number> {
    // Mock implementation - in real app this would fetch from exchange API
    console.log('Getting market price - using mock implementation');
    return 45000; // Mock BTC price
  }

  // Risk management
  async validateOrder(orderData: any): Promise<{ isValid: boolean; error?: string }> {
    // Mock implementation - in real app this would validate with backend
    console.log('Validating order - using mock implementation');
    return { isValid: true };
  }
}

export const tradingService = new TradingService();
