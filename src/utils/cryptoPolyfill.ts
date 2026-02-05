// Crypto polyfill for React Native
// This provides crypto.getRandomValues for SecureStore and other libraries
// MUST be imported before any module that uses crypto (like expo-secure-store)

import 'react-native-get-random-values';
import * as Crypto from 'expo-crypto';

// Ensure crypto exists on global (both global and window for compatibility)
const globalAny: any = global as any;

// Ensure crypto exists on globalThis / global / window
const targetGlobal = typeof globalThis !== 'undefined' ? (globalThis as any) : globalAny;
if (!targetGlobal.crypto) {
  targetGlobal.crypto = {};
}
if (typeof globalAny.window !== 'undefined' && !globalAny.window.crypto) {
  globalAny.window.crypto = {};
}

// Polyfill crypto.getRandomValues using expo-crypto
// This is critical for expo-secure-store to work
const getRandomValuesPolyfill = (array: any) => {
if (!array || array.length === 0) {
  return array;
}
try {
  const randomBytes = Crypto.getRandomBytes(array.length);
  for (let i = 0; i < array.length; i++) {
    array[i] = randomBytes[i];
  }
  return array;
} catch (error) {
  console.error('getRandomValues polyfill error:', error);
  throw error;
}
};

// Set on global/globalThis/window
targetGlobal.crypto.getRandomValues = getRandomValuesPolyfill;
if (typeof globalAny.window !== 'undefined') {
  globalAny.window.crypto = globalAny.window.crypto || {};
  globalAny.window.crypto.getRandomValues = getRandomValuesPolyfill;
}

// Verify the polyfill is working
try {
  const testArray = new Uint8Array(1);
  targetGlobal.crypto.getRandomValues(testArray);
  console.log('✓ crypto.getRandomValues polyfill verified and working');
} catch (error) {
  console.error('✗ crypto.getRandomValues polyfill verification failed:', error);
}

// Create a Buffer-like class for Node.js compatibility
class BufferPolyfill extends Uint8Array {
  // Minimal helper to mirror Buffer.from
  static fromArray(array: ArrayLike<number> | ArrayBuffer): BufferPolyfill {
    if (array instanceof ArrayBuffer) {
      return new BufferPolyfill(new Uint8Array(array));
    }
    return new BufferPolyfill(array);
  }
  
  toString(encoding?: string): string {
    // Simple implementation - CryptoJS doesn't need full Buffer functionality
    return Array.from(this).map(b => String.fromCharCode(b)).join('');
  }
}

// Polyfill Node.js style crypto.randomBytes for CryptoJS compatibility
if (!(global as any).crypto?.randomBytes) {
  (global as any).crypto.randomBytes = (size: number): BufferPolyfill => {
    const randomBytes = Crypto.getRandomBytes(size);
    // Return as BufferPolyfill
    return BufferPolyfill.fromArray(randomBytes);
  };
}

// Make Buffer available globally for CryptoJS
if (typeof (global as any).Buffer === 'undefined') {
  (global as any).Buffer = BufferPolyfill;
}

// Also ensure require('crypto') works if CryptoJS tries to use it
const originalRequire = (global as any).require;
(global as any).require = (module: string) => {
  if (module === 'crypto') {
    return {
      randomBytes: (size: number) => {
        const randomBytes = Crypto.getRandomBytes(size);
        return BufferPolyfill.fromArray(randomBytes);
      }
    };
  }
  // Fallback to original require if it exists
  if (originalRequire) {
    return originalRequire(module);
  }
  throw new Error(`Module ${module} not found`);
};

export {};
