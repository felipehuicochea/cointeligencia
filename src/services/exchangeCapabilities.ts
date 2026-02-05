/**
 * Exchange capabilities configuration
 * Defines which exchanges support futures and how they handle spot vs futures trading
 */

export type MarketType = 'spot' | 'futures';

export interface ExchangeCapability {
  name: string;
  supportsFutures: boolean;
  usesSameAPI: boolean; // If true, uses same API with parameters. If false, requires separate endpoints/credentials
  futuresEndpoint?: string; // Base URL for futures API if different
  spotEndpoint?: string; // Base URL for spot API
  notes?: string;
  /** If true, leverage can be set via API (futures). See docs/EXCHANGE_FUTURES_AND_LEVERAGE.md */
  leverageViaAPI?: boolean;
  /** Min leverage (e.g. 1). Used for validation in UI when leverageViaAPI is true. */
  leverageMin?: number;
  /** Max leverage (e.g. 125). Used for validation in UI when leverageViaAPI is true. */
  leverageMax?: number;
}

/**
 * Exchange capabilities mapping
 * Based on official API documentation for each exchange
 */
export const EXCHANGE_CAPABILITIES: Record<string, ExchangeCapability> = {
  'binance': {
    name: 'Binance',
    supportsFutures: true,
    usesSameAPI: false, // Different endpoints: api.binance.com vs fapi.binance.com
    spotEndpoint: 'https://api.binance.com',
    futuresEndpoint: 'https://fapi.binance.com', // USD-M Futures
    notes: 'Binance uses separate endpoints for spot and futures. One API key can have both permissions, but different base URLs are used.',
    leverageViaAPI: true,
    leverageMin: 1,
    leverageMax: 125, // USD-M; symbol-dependent in practice
  },
  'binance eu': {
    name: 'Binance EU',
    supportsFutures: true,
    usesSameAPI: false,
    spotEndpoint: 'https://api.binance.com',
    futuresEndpoint: 'https://fapi.binance.com',
    notes: 'Binance EU uses same API structure as Binance. Trading pairs use USDC instead of USDT.',
    leverageViaAPI: true,
    leverageMin: 1,
    leverageMax: 125,
  },
  'bybit': {
    name: 'Bybit',
    supportsFutures: true,
    usesSameAPI: true, // Unified Trading Account - uses category parameter
    notes: 'Bybit uses Unified Trading Account (UTA). Same API key with category parameter (spot/linear/inverse) to switch between spot and futures.',
    leverageViaAPI: true,
    leverageMin: 1,
    leverageMax: 100,
  },
  'kraken': {
    name: 'Kraken',
    supportsFutures: true,
    usesSameAPI: false, // Different APIs and separate API keys required
    spotEndpoint: 'https://api.kraken.com',
    futuresEndpoint: 'https://futures.kraken.com',
    notes: 'Kraken requires separate API keys for spot and futures trading. Different endpoints and authentication.',
    leverageViaAPI: true,
    leverageMin: 1,
    leverageMax: 50,
  },
  'kraken eu': {
    name: 'Kraken EU',
    supportsFutures: true,
    usesSameAPI: false,
    spotEndpoint: 'https://api.kraken.com',
    futuresEndpoint: 'https://futures.kraken.com',
    notes: 'Kraken EU uses same API structure as Kraken. Trading pairs use USDC instead of USDT.',
    leverageViaAPI: true,
    leverageMin: 1,
    leverageMax: 50,
  },
  'coinbase': {
    name: 'Coinbase',
    supportsFutures: false, // Coinbase Advanced Trade API doesn't support futures via API yet
    usesSameAPI: false,
    notes: 'Coinbase Advanced Trade API currently supports spot trading only. Futures trading is not available via API.',
  },
  'coinbase pro': {
    name: 'Coinbase Pro',
    supportsFutures: false,
    usesSameAPI: false,
    notes: 'Coinbase Pro API supports spot trading only. Futures trading is not available via API.',
  },
  'kucoin': {
    name: 'KuCoin',
    supportsFutures: true,
    usesSameAPI: true, // KuCoin uses same API with different endpoints/paths
    notes: 'KuCoin supports both spot and futures. Uses same API key with different endpoint paths.',
    leverageViaAPI: true,
    leverageMin: 1,
    leverageMax: 100,
  },
  'mexc': {
    name: 'MEXC',
    supportsFutures: true,
    usesSameAPI: true, // MEXC uses same API structure
    notes: 'MEXC supports both spot and futures trading via the same API structure. Leverage is configured in account UI, not via a dedicated set-leverage API.',
    // leverageViaAPI: false - leverage set in account, not via API
  },
  'bingx': {
    name: 'BingX',
    supportsFutures: true,
    usesSameAPI: true, // BingX uses same API with different paths
    notes: 'BingX supports both spot and futures trading via the same API with different endpoint paths.',
    leverageViaAPI: true,
    leverageMin: 1,
    leverageMax: 125,
  },
  'coinex': {
    name: 'CoinEx',
    supportsFutures: true, // V2 Futures API supports perpetuals
    usesSameAPI: true,
    notes: 'CoinEx V2 API supports spot and futures. Leverage set via POST /futures/adjust-position-leverage.',
    leverageViaAPI: true,
    leverageMin: 1,
    leverageMax: 100,
  },
};

/**
 * Resolve exchange display name to capability key (e.g. "Binance Futures" -> "binance")
 */
function getCapabilityKey(exchange: string): string {
  const trimmed = exchange.trim();
  if (isFuturesExchange(trimmed)) {
    return getBaseExchangeName(trimmed).toLowerCase();
  }
  return trimmed.toLowerCase();
}

/**
 * Get exchange capability information.
 * Handles "Exchange Futures" names by resolving to the base exchange (e.g. "Binance Futures" -> Binance capability).
 */
export function getExchangeCapability(exchange: string): ExchangeCapability | null {
  const key = getCapabilityKey(exchange);
  return EXCHANGE_CAPABILITIES[key] || null;
}

/**
 * Build the list of exchange options for the credentials dropdown.
 * - Exchanges with same API for spot/futures: one entry (e.g. "Bybit"); user selects Spot/Futures in the form.
 * - Exchanges with separate APIs for spot/futures: two entries (e.g. "Binance" and "Binance Futures").
 * - Exchanges that only support spot: one entry (e.g. "Coinbase").
 */
export function getSupportedExchangeOptions(): string[] {
  const options: string[] = [];
  const keys = Object.keys(EXCHANGE_CAPABILITIES);
  for (const key of keys) {
    const cap = EXCHANGE_CAPABILITIES[key];
    if (!cap) continue;
    options.push(cap.name);
    if (cap.supportsFutures && !cap.usesSameAPI) {
      options.push(`${cap.name} Futures`);
    }
  }
  return options;
}

/**
 * Check if exchange supports futures trading
 */
export function supportsFutures(exchange: string): boolean {
  const capability = getExchangeCapability(exchange);
  return capability?.supportsFutures ?? false;
}

/**
 * Check if exchange uses same API for spot and futures
 */
export function usesSameAPI(exchange: string): boolean {
  const capability = getExchangeCapability(exchange);
  return capability?.usesSameAPI ?? false;
}

/**
 * Get futures exchange name (for exchanges that require separate entries)
 */
export function getFuturesExchangeName(exchange: string): string | null {
  const capability = getExchangeCapability(exchange);
  if (!capability?.supportsFutures || capability.usesSameAPI) {
    return null; // No separate futures exchange needed
  }
  return `${capability.name} Futures`;
}

/**
 * Check if an exchange name is a futures variant
 */
export function isFuturesExchange(exchange: string): boolean {
  return exchange.toLowerCase().endsWith(' futures');
}

/**
 * Get base exchange name from futures exchange name (e.g. "Binance Futures" -> "Binance")
 */
export function getBaseExchangeName(exchange: string): string {
  if (isFuturesExchange(exchange)) {
    return exchange.replace(/ futures$/i, '').trim();
  }
  return exchange;
}

/**
 * Whether the exchange supports setting leverage via API (futures only).
 * When true, the app can show a leverage configuration option when the user has selected futures.
 */
export function supportsLeverageViaAPI(exchange: string): boolean {
  const capability = getExchangeCapability(exchange);
  return (capability?.leverageViaAPI ?? false);
}

/**
 * Min/max leverage for the exchange (when leverageViaAPI is true). Returns undefined if not supported.
 */
export function getLeverageLimits(exchange: string): { min: number; max: number } | null {
  const capability = getExchangeCapability(exchange);
  if (!capability?.leverageViaAPI || capability.leverageMin == null || capability.leverageMax == null) {
    return null;
  }
  return { min: capability.leverageMin, max: capability.leverageMax };
}
