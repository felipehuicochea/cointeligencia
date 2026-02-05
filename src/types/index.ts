// User and Authentication Types
export interface User {
  _id?: string;
  email: string;
  telegramAlias?: string;
  telegramId?: string;
  expirationDate: string;
  licenseType: string;
  deviceId?: string;
  isAppUser: boolean;
  isAdmin?: boolean;
  api_secret?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// Trading Configuration Types
export type TradingMode = 'AUTO' | 'MANUAL';

// Trading Strategy Types
export type TradingStrategy = 'intraday' | 'multientry'; // Add more strategies as needed

export interface StrategyConfig {
  id: TradingStrategy;
  enabled: boolean;
  label: string; // Display label (will be translated)
}

export interface ExchangeCredentials {
  id: string;
  exchange: string;
  apiKey: string;
  apiSecret: string;
  passphrase?: string; // For some exchanges like Coinbase Pro
  // Test API keys (required for some exchanges that have separate test environments)
  testApiKey?: string;
  testApiSecret?: string;
  testPassphrase?: string;
  // Market type configuration (for exchanges that use same API for spot/futures)
  marketType?: 'spot' | 'futures'; // Only used for exchanges with usesSameAPI = true
  /** Leverage for futures (when exchange supports leverage via API). Valid range per exchange. */
  leverage?: number;
  isActive: boolean;
  createdAt: string;
}

// Exchange test API requirements
export interface ExchangeTestRequirements {
  requiresSeparateTestKeys: boolean; // If true, exchange requires separate API keys for test mode
  usesPublicTestAPI: boolean; // If true, exchange has a public test API that uses same keys
  testEndpointAvailable: boolean; // If true, exchange has a test endpoint
  notes?: string; // Additional notes about test mode for this exchange
}

export interface TradingConfig {
  mode: TradingMode;
  defaultExchange: string | null;
  riskLevel: 'low' | 'medium' | 'high';
  maxPositionSize: number;
  stopLossPercentage: number;
  takeProfitPercentage: number;
  orderSizeType: 'percentage' | 'fixed';
  orderSizeValue: number; // percentage (0-100) or fixed amount in USD
  testMode: boolean; // If true, use test/sandbox API endpoints instead of live
  enabledStrategies: TradingStrategy[]; // List of enabled trading strategies
  multientryBaseAmount: number; // Base amount (x) for Multientry strategy orders (L1=x, L2=2x, L3=3x, L4=4x)
}

// Multientry order level
export interface MultientryLevel {
  level: 'L1' | 'L2' | 'L3' | 'L4';
  price: number;
  quantity: number; // Calculated based on base amount
  orderType: 'market' | 'limit';
}

// Multientry order tracking
export interface MultientryOrder {
  alertId: string; // Original alert ID
  multientryId: string; // ID from alert field (e.g., "AVAX000005")
  symbol: string;
  exchange: string;
  levels: {
    level: 'L1' | 'L2' | 'L3' | 'L4';
    orderId: string; // Exchange order ID
    status: 'pending' | 'filled' | 'cancelled' | 'rejected';
    quantity: number;
    price: number;
    filledQuantity?: number;
    filledPrice?: number;
  }[];
  createdAt: string;
  side: 'BUY' | 'SELL';
}

// Trade Alert Types
export interface TradeAlert {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  stopLoss?: number;
  takeProfit?: number;
  exchange: string;
  strategy: string;
  timestamp: string;
  status: 'pending' | 'executed' | 'ignored' | 'failed';
  executedAt?: string;
  executedPrice?: number;
  error?: string;
  // API response logging
  apiResponse?: string; // Raw API response JSON string (for debugging)
  // Multientry specific fields
  alert?: string; // Raw alert string: "L1,18.35:L2,18.06:L3,17.89:L4,17.78:ID,AVAX000005"
  multientryLevels?: MultientryLevel[]; // Parsed entry levels
  pair?: string; // Alternative to symbol (for Multientry)
  timeFrame?: string; // Timeframe for Multientry
  alias?: string; // Strategy alias
}

export interface TradeHistory {
  alerts: TradeAlert[];
  isLoading: boolean;
  error: string | null;
}

// App State Types
export interface AppState {
  auth: AuthState;
  trading: {
    config: TradingConfig;
    credentials: ExchangeCredentials[];
    history: TradeHistory;
  };
  notifications: {
    token: string | null;
    isRegistered: boolean;
  };
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface LoginResponse {
  status: string;
  data: User;
  token?: string;
  message?: string;
}

export interface RegisterDeviceResponse {
  status: string;
  message: string;
  deviceId?: string;
}

// Navigation Types
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Login: undefined;
  Register: undefined;
  Setup: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  Alerts: undefined;
  History: undefined;
  Settings: undefined;
  TestApiConfig: undefined;
};
