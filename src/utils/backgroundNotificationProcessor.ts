import { secureStorageService } from '../services/secureStorageService';
import { tradingService } from '../services/tradingService';
import { TradeAlert, TradingConfig, ExchangeCredentials } from '../types';

// Constants matching TradingService
const TRADE_ALERTS_KEY = 'trade_alerts';
const TRADING_CONFIG_KEY = 'trading_config';
const EXCHANGE_CREDENTIALS_KEY = 'exchange_credentials';

// Convert backend message to TradeAlert (same logic as in App.tsx)
const convertMessageToTradeAlert = (message: any): TradeAlert => {
  // Map backend side codes to frontend side codes
  const sideMapping: { [key: string]: 'BUY' | 'SELL' } = {
    'L': 'BUY',   // Long
    'S': 'SELL',  // Short
    'C': 'SELL',  // Close (treat as sell for now)
    'CL': 'SELL', // Close Long
    'CS': 'BUY',  // Close Short (buy to cover)
  };

  // Default values for missing fields
  const defaultQuantity = 1.0;
  const defaultExchange = 'binance';

  // FCM sends all data as strings, so we need to parse numeric values
  const getValue = (key: string, altKey?: string): any => {
    const value = message[key] || message[altKey || ''] || '';
    return value;
  };

  const parseFloatSafe = (value: any): number => {
    if (value === null || value === undefined || value === '') return 0;
    const parsed = typeof value === 'string' ? parseFloat(value) : Number(value);
    return isNaN(parsed) ? 0 : parsed;
  };

  const sideValue = getValue('side', 'SIDE');
  const quantityValue = getValue('quantity', 'QUANTITY');
  const priceValue = getValue('price', 'PRICE');
  const stopLossValue = getValue('stopLoss', 'STOP_LOSS');
  const takeProfitValue = getValue('takeProfit', 'TAKE_PROFIT');

  // Get additional fields
  const alertField = getValue('alert') || getValue('ALERT');
  const pairField = getValue('pair') || getValue('PAIR');
  const symbolField = getValue('symbol') || getValue('SYMBOL');
  const actionField = getValue('action') || getValue('ACTION');
  const timeframeField = getValue('timeframe') || getValue('TIMEFRAME') || getValue('timeFrame') || getValue('TIMEFRAME');
  const aliasField = getValue('alias') || getValue('ALIAS');

  return {
    id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    symbol: (symbolField || pairField || 'UNKNOWN').toString(),
    side: sideMapping[sideValue?.toString().toUpperCase()] || (actionField?.toString().toUpperCase() === 'SELL' ? 'SELL' : 'BUY'),
    quantity: quantityValue ? parseFloatSafe(quantityValue) : defaultQuantity,
    price: parseFloatSafe(priceValue),
    stopLoss: stopLossValue ? parseFloatSafe(stopLossValue) : undefined,
    takeProfit: takeProfitValue ? parseFloatSafe(takeProfitValue) : undefined,
    exchange: (getValue('exchange') || getValue('EXCHANGE') || defaultExchange).toString(),
    strategy: (getValue('strategy') || getValue('STRATEGY') || 'Unknown').toString(),
    timestamp: new Date().toISOString(),
    status: 'pending',
    // Additional fields for multientry and other strategies
    alert: alertField ? alertField.toString() : undefined,
    pair: pairField ? pairField.toString() : undefined,
    timeFrame: timeframeField ? timeframeField.toString() : undefined,
    alias: aliasField ? aliasField.toString() : undefined,
  };
};

// Load trading config from secure storage
const loadTradingConfig = async (): Promise<TradingConfig | null> => {
  try {
    const userData = await secureStorageService.getUserData();
    const storedConfig = userData?.[TRADING_CONFIG_KEY];
    
    if (!storedConfig) {
      // Return default config
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
    
    return storedConfig as TradingConfig;
  } catch (error) {
    console.error('[BackgroundProcessor] Error loading config:', error);
    return null;
  }
};

// Load credentials from secure storage
const loadCredentials = async (): Promise<ExchangeCredentials[]> => {
  try {
    const userData = await secureStorageService.getUserData();
    const encryptedCredentials = userData?.[EXCHANGE_CREDENTIALS_KEY];
    
    if (!encryptedCredentials) {
      return [];
    }
    
    // Decrypt credentials (in TradingService, decryptData just returns data as-is)
    const decryptedData = encryptedCredentials; // Since we're using AsyncStorage, no encryption needed
    const credentials = typeof decryptedData === 'string' 
      ? JSON.parse(decryptedData) 
      : decryptedData;
    
    return credentials as ExchangeCredentials[];
  } catch (error) {
    console.error('[BackgroundProcessor] Error loading credentials:', error);
    return [];
  }
};

// Process notification in background - stores alert and executes trade if AUTO mode
export const processBackgroundNotification = async (remoteMessage: any): Promise<void> => {
  try {
    console.log('[BackgroundProcessor] Processing notification:', JSON.stringify(remoteMessage, null, 2));
    
    const messageData = remoteMessage.data || {};
    
    // Check if it's a trading alert
    const hasTradingFields = messageData.pair || messageData.symbol || messageData.side || messageData.price;
    const alertType = messageData.type || messageData.type;
    const isTradingAlert = alertType === 'trading_alert' || 
                          alertType === 'trade_alert' || 
                          (hasTradingFields && !messageData.type);
    
    if (!isTradingAlert) {
      console.log('[BackgroundProcessor] Notification is not a trading alert, skipping');
      return;
    }
    
    console.log('[BackgroundProcessor] Processing trading alert from background notification');
    
    // Convert message to TradeAlert
    const tradeAlert = convertMessageToTradeAlert(messageData);
    console.log('[BackgroundProcessor] Converted trade alert:', JSON.stringify(tradeAlert, null, 2));
    
    // Store the alert locally (always store, regardless of mode)
    await tradingService.storeTradeAlert(tradeAlert);
    console.log('[BackgroundProcessor] Alert stored locally');
    
    // Load config and credentials
    const config = await loadTradingConfig();
    const credentials = await loadCredentials();
    
    if (!config) {
      console.error('[BackgroundProcessor] Failed to load config, cannot execute trade');
      return;
    }
    
    if (credentials.length === 0) {
      console.warn('[BackgroundProcessor] No credentials found, cannot execute trade');
      return;
    }
    
    // Execute trade if in AUTO mode
    if (config.mode === 'AUTO') {
      try {
        console.log('[BackgroundProcessor] AUTO mode enabled, executing trade...');
        await tradingService.processTradeAlert(tradeAlert, config, credentials);
        console.log('[BackgroundProcessor] Trade executed successfully in background');
      } catch (error: any) {
        console.error('[BackgroundProcessor] Failed to execute trade in background:', error);
        // Update alert status to failed
        await tradingService.updateTradeAlertStatus(tradeAlert.id, 'failed', undefined, error.message);
      }
    } else {
      console.log('[BackgroundProcessor] MANUAL mode - alert stored, waiting for user action');
    }
  } catch (error) {
    console.error('[BackgroundProcessor] Error processing background notification:', error);
  }
};

