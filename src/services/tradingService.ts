import { apiService } from './apiService';
import { ExchangeCredentials, TradingConfig, TradeAlert } from '../types';
import { secureStorageService } from './secureStorageService';

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

  // Store trade alert locally
  async storeTradeAlert(alert: TradeAlert): Promise<void> {
    try {
      const existingAlerts = await this.getStoredTradeAlerts();
      const updatedAlerts = [alert, ...existingAlerts]; // Add new alert at the beginning
      
      // Keep only the last 100 alerts to prevent storage bloat
      const limitedAlerts = updatedAlerts.slice(0, 100);
      
      await secureStorageService.storeUserData({
        ...await secureStorageService.getUserData(),
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
  async updateTradeAlertStatus(alertId: string, status: TradeAlert['status'], executedPrice?: number, error?: string): Promise<void> {
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
        
        await secureStorageService.storeUserData({
          ...await secureStorageService.getUserData(),
          [TradingService.TRADE_ALERTS_KEY]: alerts
        });
      }
    } catch (error) {
      console.error('Failed to update trade alert status:', error);
    }
  }

  // Parse trade alert and calculate order parameters
  parseTradeAlert(
    alert: TradeAlert, 
    config: TradingConfig, 
    credentials: ExchangeCredentials[]
  ): ParsedTradeAlert {
    // Find credentials for the specified exchange
    const exchangeCreds = credentials.find(c => 
      c.exchange.toLowerCase() === alert.exchange.toLowerCase() && c.isActive
    );

    if (!exchangeCreds) {
      throw new Error(`No active credentials found for exchange: ${alert.exchange}`);
    }

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
      calculatedQuantity,
      calculatedPrice: alert.price,
      orderValue,
      exchangeCredentials: effectiveCreds,
    };
  }

  // Build exchange API call based on parsed alert
  buildExchangeOrder(parsedAlert: ParsedTradeAlert): any {
    const { exchange, symbol, side, calculatedQuantity, calculatedPrice, stopLoss, takeProfit } = parsedAlert;
    
    const baseOrder = {
      symbol,
      side: side.toLowerCase(),
      quantity: calculatedQuantity,
      price: calculatedPrice,
      type: 'limit', // Default to limit order
      timeInForce: 'GTC', // Good Till Cancelled
    };

    // Add exchange-specific parameters
    switch (exchange.toLowerCase()) {
      case 'binance':
        return {
          ...baseOrder,
          newClientOrderId: `cointel_${Date.now()}`,
          icebergQty: 0,
        };
      
      case 'kraken':
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
        return {
          ...baseOrder,
          orderLinkId: `cointel_${Date.now()}`,
          category: 'spot',
        };
      
      default:
        return baseOrder;
    }
  }

  // Get exchange API endpoint (live or test)
  private getExchangeEndpoint(exchange: string, testMode: boolean): string {
    const exchangeLower = exchange.toLowerCase();
    
    if (testMode) {
      // Test/Sandbox endpoints
      switch (exchangeLower) {
        case 'binance':
          return 'https://testnet.binance.vision/api/v3/order';
        case 'kraken':
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
          return 'https://api-testnet.bybit.com/v2/private/order/create';
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
          // CoinEx test endpoint - NEEDS VERIFICATION
          // TODO: Verify if CoinEx provides a public testnet/sandbox environment
          // Documentation: https://docs.coinex.com/
          // Steps to verify:
          // 1. Check official CoinEx API documentation for testnet/sandbox information
          // 2. Test the endpoint with a test API key
          // 3. Verify response format matches expected structure
          // 4. Update endpoint if incorrect or unavailable
          // If no testnet exists, consider:
          // - Using demo/test API keys with live endpoint (if supported)
          // - Implementing mock/simulation mode
          // - Using third-party testing services
          return 'https://testnet.coinex.com/v1/order';
        default:
          throw new Error(`Test endpoint not configured for exchange: ${exchange}`);
      }
    } else {
      // Live endpoints
      switch (exchangeLower) {
        case 'binance':
          return 'https://api.binance.com/api/v3/order';
        case 'kraken':
          return 'https://api.kraken.com/0/private/AddOrder';
        case 'coinbase':
        case 'coinbase pro':
          return 'https://api.pro.coinbase.com/orders';
        case 'kucoin':
          return 'https://api.kucoin.com/api/v1/orders';
        case 'bybit':
          return 'https://api.bybit.com/v2/private/order/create';
        case 'mexc':
          return 'https://api.mexc.com/api/v3/order';
        case 'bingx':
          return 'https://open-api.bingx.com/openApi/spot/v1/trade/order';
        case 'coinex':
          return 'https://api.coinex.com/v1/order';
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
      // Get the appropriate endpoint based on test mode
      const endpoint = this.getExchangeEndpoint(exchange, testMode);
      
      // Log test mode status
      if (testMode) {
        console.log(`[TEST MODE] Executing order on ${exchange} test endpoint: ${endpoint}`);
      } else {
        console.log(`[LIVE MODE] Executing order on ${exchange} live endpoint: ${endpoint}`);
      }

      // Add authentication headers
      const headers = {
        'Content-Type': 'application/json',
        'X-API-Key': exchangeCredentials.apiKey,
        'X-API-Secret': exchangeCredentials.apiSecret,
        ...(exchangeCredentials.passphrase && { 'X-Passphrase': exchangeCredentials.passphrase }),
      };

      // Execute order on exchange with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(orderData),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(`Exchange API error: ${errorData.message || response.statusText}`);
      }

      const responseData = await response.json();

      // Parse and standardize response
      return this.parseExchangeResponse(responseData, exchange, parsedAlert);
      
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

  // Parse exchange-specific response into standard format
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

    switch (exchange.toLowerCase()) {
      case 'binance':
        return {
          ...baseResponse,
          orderId: response.orderId || response.clientOrderId,
          status: this.mapBinanceStatus(response.status),
          executedQuantity: parseFloat(response.executedQty) || 0,
          executedPrice: parseFloat(response.avgPrice) || parsedAlert.calculatedPrice,
        };
      
      case 'kraken':
        return {
          ...baseResponse,
          orderId: response.txid?.[0] || response.descr?.order,
          status: this.mapKrakenStatus(response.status),
          executedQuantity: parseFloat(response.vol_exec) || 0,
          executedPrice: parseFloat(response.cost) / parseFloat(response.vol_exec) || parsedAlert.calculatedPrice,
        };
      
      case 'coinbase':
        return {
          ...baseResponse,
          orderId: response.id,
          status: this.mapCoinbaseStatus(response.status),
          executedQuantity: parseFloat(response.filled_size) || 0,
          executedPrice: parseFloat(response.executed_value) / parseFloat(response.filled_size) || parsedAlert.calculatedPrice,
        };
      
      default:
        return {
          ...baseResponse,
          orderId: response.orderId || response.id || 'unknown',
          status: 'filled',
          executedQuantity: parsedAlert.calculatedQuantity,
          executedPrice: parsedAlert.calculatedPrice,
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
      
      // Log execution mode
      console.log(`Trade alert ${alert.id} ${config.testMode ? 'TEST' : 'LIVE'} executed:`, {
        exchange: alert.exchange,
        symbol: alert.symbol,
        side: alert.side,
        status: exchangeResponse.status,
      });
      
      return exchangeResponse;
      
    } catch (error: any) {
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
      });
      
      console.error(`Trade alert ${alert.id} ${config.testMode ? 'TEST' : 'LIVE'} execution failed:`, error);
      throw error;
    }
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

  // Legacy methods for backward compatibility
  async saveCredentials(credentials: Omit<ExchangeCredentials, 'id' | 'createdAt'>): Promise<ExchangeCredentials> {
    // Mock implementation - in real app this would save to backend
    console.log('Saving credentials - using mock implementation');
    return {
      ...credentials,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
  }

  async getCredentials(): Promise<ExchangeCredentials[]> {
    // Mock implementation - in real app this would fetch from backend
    console.log('Getting credentials - using mock implementation');
    return [];
  }

  async deleteCredentials(credentialId: string): Promise<void> {
    // Mock implementation - in real app this would delete from backend
    console.log('Deleting credentials - using mock implementation');
  }

  async updateConfig(config: Partial<TradingConfig>): Promise<TradingConfig> {
    // Mock implementation - in real app this would update backend
    console.log('Updating config - using mock implementation');
    return config as TradingConfig;
  }

  async getConfig(): Promise<TradingConfig> {
    // Mock implementation - in real app this would fetch from backend
    console.log('Getting config - using mock implementation');
    return {
      mode: 'MANUAL',
      defaultExchange: null,
      riskLevel: 'medium',
      maxPositionSize: 1000,
      stopLossPercentage: 5,
      orderSizeType: 'percentage',
      orderSizeValue: 100,
    };
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
