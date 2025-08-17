import { ExchangeCredentials } from '../types';
import CryptoJS from 'crypto-js';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  exchange?: string;
  permissions?: string[];
  accountInfo?: any;
}

class CredentialValidationService {
  // Validate credentials for a specific exchange
  async validateCredentials(credentials: Omit<ExchangeCredentials, 'id' | 'createdAt'>): Promise<ValidationResult> {
    const { exchange, apiKey, apiSecret, passphrase } = credentials;
    
    try {
      switch (exchange.toLowerCase()) {
        case 'binance':
          return await this.validateBinanceCredentials(apiKey, apiSecret);
        case 'kraken':
          return await this.validateKrakenCredentials(apiKey, apiSecret);
        case 'mexc':
          return await this.validateMexcCredentials(apiKey, apiSecret);
        case 'kucoin':
          return await this.validateKucoinCredentials(apiKey, apiSecret, passphrase);
        case 'bingx':
          return await this.validateBingXCredentials(apiKey, apiSecret);
        case 'bybit':
          return await this.validateBybitCredentials(apiKey, apiSecret);
        case 'coinex':
          return await this.validateCoinexCredentials(apiKey, apiSecret);
        default:
          return {
            isValid: false,
            error: `Unsupported exchange: ${exchange}`,
            exchange: exchange.toLowerCase(),
          };
      }
    } catch (error: any) {
      return {
        isValid: false,
        error: error.message || 'Validation failed',
        exchange: exchange.toLowerCase(),
      };
    }
  }

  // Binance API validation
  private async validateBinanceCredentials(apiKey: string, apiSecret: string): Promise<ValidationResult> {
    try {
      const timestamp = Date.now();
      const queryString = `timestamp=${timestamp}`;
      const signature = this.generateBinanceSignature(queryString, apiSecret);
      
      const response = await fetch(`https://api.binance.com/api/v3/account?${queryString}&signature=${signature}`, {
        method: 'GET',
        headers: {
          'X-MBX-APIKEY': apiKey,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        return {
          isValid: false,
          error: errorData.msg || `HTTP ${response.status}`,
          exchange: 'binance',
        };
      }

      const accountData = await response.json();
      
      return {
        isValid: true,
        exchange: 'binance',
        permissions: accountData.permissions || [],
        accountInfo: {
          makerCommission: accountData.makerCommission,
          takerCommission: accountData.takerCommission,
          canTrade: accountData.canTrade,
          canWithdraw: accountData.canWithdraw,
          canDeposit: accountData.canDeposit,
        },
      };
    } catch (error: any) {
      return {
        isValid: false,
        error: error.message,
        exchange: 'binance',
      };
    }
  }

  // Kraken API validation
  private async validateKrakenCredentials(apiKey: string, apiSecret: string): Promise<ValidationResult> {
    try {
      const endpoint = '/0/private/Balance';
      const nonce = Date.now().toString();
      const postData = `nonce=${nonce}`;
      
      const signature = this.generateKrakenSignature(endpoint, postData, apiSecret);
      
      const response = await fetch(`https://api.kraken.com${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'API-Key': apiKey,
          'API-Sign': signature,
        },
        body: postData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        return {
          isValid: false,
          error: errorData.error?.[0] || `HTTP ${response.status}`,
          exchange: 'kraken',
        };
      }

      const balanceData = await response.json();
      
      return {
        isValid: true,
        exchange: 'kraken',
        accountInfo: {
          hasBalances: Object.keys(balanceData.result || {}).length > 0,
        },
      };
    } catch (error: any) {
      return {
        isValid: false,
        error: error.message,
        exchange: 'kraken',
      };
    }
  }

  // MEXC API validation
  private async validateMexcCredentials(apiKey: string, apiSecret: string): Promise<ValidationResult> {
    try {
      const timestamp = Date.now();
      const queryString = `timestamp=${timestamp}`;
      const signature = this.generateMexcSignature(queryString, apiSecret);
      
      const response = await fetch(`https://www.mexc.com/open/api/v2/account/info?${queryString}&api_key=${apiKey}&sign=${signature}`, {
        method: 'GET',
      });

      if (!response.ok) {
        return {
          isValid: false,
          error: `HTTP ${response.status}`,
          exchange: 'mexc',
        };
      }

      const accountData = await response.json();
      
      if (accountData.code !== 200) {
        return {
          isValid: false,
          error: accountData.msg || 'API validation failed',
          exchange: 'mexc',
        };
      }

      return {
        isValid: true,
        exchange: 'mexc',
        accountInfo: accountData.data,
      };
    } catch (error: any) {
      return {
        isValid: false,
        error: error.message,
        exchange: 'mexc',
      };
    }
  }

  // KuCoin API validation
  private async validateKucoinCredentials(apiKey: string, apiSecret: string, passphrase?: string): Promise<ValidationResult> {
    try {
      const timestamp = Date.now();
      const endpoint = '/api/v1/accounts';
      const method = 'GET';
      
      const signature = this.generateKucoinSignature(timestamp, method, endpoint, '', apiSecret);
      const passphraseSignature = this.generateKucoinPassphrase(passphrase || '', apiSecret);
      
      const response = await fetch(`https://api.kucoin.com${endpoint}`, {
        method: 'GET',
        headers: {
          'KC-API-KEY': apiKey,
          'KC-API-SIGN': signature,
          'KC-API-TIMESTAMP': timestamp.toString(),
          'KC-API-PASSPHRASE': passphraseSignature,
          'KC-API-KEY-VERSION': '2',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        return {
          isValid: false,
          error: errorData.msg || `HTTP ${response.status}`,
          exchange: 'kucoin',
        };
      }

      const accountData = await response.json();
      
      if (accountData.code !== '200000') {
        return {
          isValid: false,
          error: accountData.msg || 'API validation failed',
          exchange: 'kucoin',
        };
      }

      return {
        isValid: true,
        exchange: 'kucoin',
        accountInfo: {
          accounts: accountData.data,
        },
      };
    } catch (error: any) {
      return {
        isValid: false,
        error: error.message,
        exchange: 'kucoin',
      };
    }
  }

  // BingX API validation
  private async validateBingXCredentials(apiKey: string, apiSecret: string): Promise<ValidationResult> {
    try {
      const timestamp = Date.now();
      const queryString = `timestamp=${timestamp}`;
      const signature = this.generateBingXSignature(queryString, apiSecret);
      
      const response = await fetch(`https://open-api.bingx.com/openApi/account/v2/balance?${queryString}&api_key=${apiKey}&sign=${signature}`, {
        method: 'GET',
      });

      if (!response.ok) {
        return {
          isValid: false,
          error: `HTTP ${response.status}`,
          exchange: 'bingx',
        };
      }

      const accountData = await response.json();
      
      if (accountData.code !== 0) {
        return {
          isValid: false,
          error: accountData.msg || 'API validation failed',
          exchange: 'bingx',
        };
      }

      return {
        isValid: true,
        exchange: 'bingx',
        accountInfo: accountData.data,
      };
    } catch (error: any) {
      return {
        isValid: false,
        error: error.message,
        exchange: 'bingx',
      };
    }
  }

  // Bybit API validation
  private async validateBybitCredentials(apiKey: string, apiSecret: string): Promise<ValidationResult> {
    try {
      const timestamp = Date.now();
      const queryString = `api_key=${apiKey}&timestamp=${timestamp}`;
      const signature = this.generateBybitSignature(queryString, apiSecret);
      
      const response = await fetch(`https://api.bybit.com/v2/private/wallet/balance?${queryString}&sign=${signature}`, {
        method: 'GET',
      });

      if (!response.ok) {
        return {
          isValid: false,
          error: `HTTP ${response.status}`,
          exchange: 'bybit',
        };
      }

      const accountData = await response.json();
      
      if (accountData.ret_code !== 0) {
        return {
          isValid: false,
          error: accountData.ret_msg || 'API validation failed',
          exchange: 'bybit',
        };
      }

      return {
        isValid: true,
        exchange: 'bybit',
        accountInfo: accountData.result,
      };
    } catch (error: any) {
      return {
        isValid: false,
        error: error.message,
        exchange: 'bybit',
      };
    }
  }

  // Coinex API validation
  private async validateCoinexCredentials(apiKey: string, apiSecret: string): Promise<ValidationResult> {
    try {
      const timestamp = Date.now();
      const queryString = `access_id=${apiKey}&tonce=${timestamp}`;
      const signature = this.generateCoinexSignature(queryString, apiSecret);
      
      const response = await fetch(`https://api.coinex.com/v1/balance/info?${queryString}&signature=${signature}`, {
        method: 'GET',
      });

      if (!response.ok) {
        return {
          isValid: false,
          error: `HTTP ${response.status}`,
          exchange: 'coinex',
        };
      }

      const accountData = await response.json();
      
      if (accountData.code !== 0) {
        return {
          isValid: false,
          error: accountData.message || 'API validation failed',
          exchange: 'coinex',
        };
      }

      return {
        isValid: true,
        exchange: 'coinex',
        accountInfo: accountData.data,
      };
    } catch (error: any) {
      return {
        isValid: false,
        error: error.message,
        exchange: 'coinex',
      };
    }
  }

  // Signature generation methods for different exchanges
  private generateBinanceSignature(queryString: string, secret: string): string {
    return CryptoJS.HmacSHA256(queryString, secret).toString(CryptoJS.enc.Hex);
  }

  private generateKrakenSignature(endpoint: string, postData: string, secret: string): string {
    const sha256 = CryptoJS.SHA256(postData);
    const message = endpoint + sha256.toString(CryptoJS.enc.Binary);
    const hmac = CryptoJS.HmacSHA512(message, CryptoJS.enc.Base64.parse(secret));
    return hmac.toString(CryptoJS.enc.Base64);
  }

  private generateMexcSignature(queryString: string, secret: string): string {
    return CryptoJS.HmacSHA256(queryString, secret).toString(CryptoJS.enc.Hex);
  }

  private generateKucoinSignature(timestamp: number, method: string, endpoint: string, body: string, secret: string): string {
    const message = timestamp + method + endpoint + body;
    return CryptoJS.HmacSHA256(message, secret).toString(CryptoJS.enc.Base64);
  }

  private generateKucoinPassphrase(passphrase: string, secret: string): string {
    return CryptoJS.HmacSHA256(passphrase, secret).toString(CryptoJS.enc.Base64);
  }

  private generateBingXSignature(queryString: string, secret: string): string {
    return CryptoJS.HmacSHA256(queryString, secret).toString(CryptoJS.enc.Hex);
  }

  private generateBybitSignature(queryString: string, secret: string): string {
    return CryptoJS.HmacSHA256(queryString, secret).toString(CryptoJS.enc.Hex);
  }

  private generateCoinexSignature(queryString: string, secret: string): string {
    return CryptoJS.HmacSHA256(queryString, secret).toString(CryptoJS.enc.Hex);
  }
}

export const credentialValidationService = new CredentialValidationService();
