import { ExchangeTestRequirements } from '../types';

/**
 * Exchange test API requirements mapping
 * This defines which exchanges require separate test API keys vs using the same keys with different endpoints
 */
export const EXCHANGE_TEST_REQUIREMENTS: Record<string, ExchangeTestRequirements> = {
  'binance': {
    requiresSeparateTestKeys: true, // Binance requires separate API keys for testnet
    usesPublicTestAPI: true, // Binance has a public testnet
    testEndpointAvailable: true,
    notes: 'Binance requires separate API keys for testnet. Create test API keys at https://testnet.binance.vision/',
  },
  'binance eu': {
    requiresSeparateTestKeys: true, // Binance EU uses same API as Binance, requires separate test keys
    usesPublicTestAPI: true,
    testEndpointAvailable: true,
    notes: 'Binance EU uses the same API as Binance. Trading pairs use USDC instead of USDT. Requires separate API keys for testnet. Create test API keys at https://testnet.binance.vision/',
  },
  'coinbase': {
    requiresSeparateTestKeys: true, // Coinbase Pro requires separate API keys for sandbox
    usesPublicTestAPI: true, // Coinbase Pro has a public sandbox
    testEndpointAvailable: true,
    notes: 'Coinbase Pro requires separate API keys for sandbox. Create sandbox API keys at https://public.sandbox.pro.coinbase.com/',
  },
  'coinbase pro': {
    requiresSeparateTestKeys: true, // Coinbase Pro requires separate API keys for sandbox
    usesPublicTestAPI: true, // Coinbase Pro has a public sandbox
    testEndpointAvailable: true,
    notes: 'Coinbase Pro requires separate API keys for sandbox. Create sandbox API keys at https://public.sandbox.pro.coinbase.com/',
  },
  'kucoin': {
    requiresSeparateTestKeys: true, // KuCoin requires separate API keys for sandbox
    usesPublicTestAPI: true, // KuCoin has a public sandbox
    testEndpointAvailable: true,
    notes: 'KuCoin requires separate API keys for sandbox. Create sandbox API keys at https://sandbox.kucoin.com/',
  },
  'bybit': {
    requiresSeparateTestKeys: true, // Bybit requires separate API keys for testnet
    usesPublicTestAPI: true, // Bybit has a public testnet
    testEndpointAvailable: true,
    notes: 'Bybit requires separate API keys for testnet. Create testnet API keys at https://testnet.bybit.com/',
  },
  'kraken': {
    requiresSeparateTestKeys: false, // Kraken doesn't have a public spot trading testnet
    usesPublicTestAPI: false, // Kraken doesn't have a public spot trading testnet
    testEndpointAvailable: false,
    notes: 'Kraken does not have a public spot trading testnet. Only futures testnet is available. Test with caution using live endpoint.',
  },
  'kraken eu': {
    requiresSeparateTestKeys: false, // Kraken EU uses same API as Kraken, no separate testnet
    usesPublicTestAPI: false,
    testEndpointAvailable: false,
    notes: 'Kraken EU uses the same API as Kraken. Trading pairs use USDC instead of USDT. No public spot trading testnet available. Test with caution using live endpoint.',
  },
  'mexc': {
    requiresSeparateTestKeys: true, // MEXC likely requires separate API keys if testnet exists
    usesPublicTestAPI: false, // MEXC testnet availability needs verification
    testEndpointAvailable: false, // Needs verification
    notes: 'MEXC testnet availability needs verification. Check official documentation at https://mexcdevelop.github.io/apidocs/spot_v3_en/',
  },
  'bingx': {
    requiresSeparateTestKeys: true, // BingX likely requires separate API keys if testnet exists
    usesPublicTestAPI: false, // BingX testnet availability needs verification
    testEndpointAvailable: false, // Needs verification
    notes: 'BingX testnet availability needs verification. Check official documentation at https://bingx.com/en-us/help/api/',
  },
  'coinex': {
    requiresSeparateTestKeys: true, // CoinEx likely requires separate API keys if testnet exists
    usesPublicTestAPI: false, // CoinEx testnet availability needs verification
    testEndpointAvailable: false, // Needs verification
    notes: 'CoinEx testnet availability needs verification. Check official documentation at https://docs.coinex.com/',
  },
};

/**
 * Get test API requirements for an exchange
 */
export function getExchangeTestRequirements(exchange: string): ExchangeTestRequirements | null {
  const exchangeLower = exchange.toLowerCase();
  return EXCHANGE_TEST_REQUIREMENTS[exchangeLower] || null;
}

/**
 * Check if an exchange requires separate test API keys
 */
export function requiresSeparateTestKeys(exchange: string): boolean {
  const requirements = getExchangeTestRequirements(exchange);
  return requirements?.requiresSeparateTestKeys ?? false;
}

/**
 * Check if an exchange has a public test API
 */
export function hasPublicTestAPI(exchange: string): boolean {
  const requirements = getExchangeTestRequirements(exchange);
  return requirements?.usesPublicTestAPI ?? false;
}

/**
 * Check if an exchange has a test endpoint available
 */
export function hasTestEndpoint(exchange: string): boolean {
  const requirements = getExchangeTestRequirements(exchange);
  return requirements?.testEndpointAvailable ?? false;
}

/**
 * Get notes about test mode for an exchange
 */
export function getTestModeNotes(exchange: string): string | null {
  const requirements = getExchangeTestRequirements(exchange);
  return requirements?.notes || null;
}

