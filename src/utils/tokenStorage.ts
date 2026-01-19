/**
 * Secure token storage utility
 * 
 * On React Native (iOS/Android):
 * - Uses react-native-keychain for encrypted storage in device keychain/keystore
 * - Tokens are encrypted at rest and protected by OS-level security
 * 
 * On Web (Expo Web):
 * - Falls back to localStorage
 * - For production, should use sessionStorage and httpOnly cookies via server
 * 
 * Refresh tokens should NEVER be stored in localStorage on web for security.
 * Instead, use httpOnly cookies managed by the server.
 */

import { Platform } from 'react-native';

interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp in milliseconds
  tokenType: string; // Usually 'Bearer'
}

const TOKEN_STORAGE_KEY = 'cetec_oauth_token';
const SERVICE_NAME = 'CetecTimeLogger';

/**
 * Get storage implementation based on platform
 * Dynamically imports native modules only when needed
 */
async function getStorageImpl(): Promise<any> {
  if (Platform.OS === 'web') {
    // Web: Use localStorage
    return {
      getItem: (key: string) => Promise.resolve(localStorage.getItem(key)),
      setItem: (key: string, value: string) => {
        localStorage.setItem(key, value);
        return Promise.resolve();
      },
      removeItem: (key: string) => {
        localStorage.removeItem(key);
        return Promise.resolve();
      },
    };
  }

  // React Native: Try Keychain first, fall back to AsyncStorage
  try {
    // eslint-disable-next-line global-require
    const Keychain = require('react-native-keychain');
    return { useKeychain: true, Keychain };
  } catch (e) {
    try {
      // eslint-disable-next-line global-require
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      return { useKeychain: false, AsyncStorage };
    } catch (e2) {
      throw new Error('No storage implementation available');
    }
  }
}

/**
 * Save tokens securely to device storage
 * On native: Uses encrypted keychain/keystore
 * On web: Uses localStorage (should use httpOnly cookies in production)
 */
export async function saveTokens(tokenData: TokenData): Promise<void> {
  try {
    const storage = await getStorageImpl();
    const tokenString = JSON.stringify(tokenData);

    if (storage.useKeychain) {
      // React Native with Keychain: Use encrypted keychain
      await storage.Keychain.setGenericPassword(
        SERVICE_NAME,
        tokenString,
        {
          service: TOKEN_STORAGE_KEY,
          accessControl: storage.Keychain.ACCESS_CONTROL.BIOMETRIC_ANY,
        }
      );
      console.log('Tokens saved to secure keychain');
    } else if (storage.AsyncStorage) {
      // React Native with AsyncStorage
      await storage.AsyncStorage.setItem(TOKEN_STORAGE_KEY, tokenString);
      console.log('Tokens saved to AsyncStorage');
    } else {
      // Web: Use localStorage
      await storage.setItem(TOKEN_STORAGE_KEY, tokenString);
      console.log('Tokens saved to localStorage');
    }
  } catch (error) {
    console.error('Failed to save tokens:', error);
    throw new Error('Token storage failed');
  }
}

/**
 * Retrieve tokens from secure storage
 */
export async function getTokens(): Promise<TokenData | null> {
  try {
    const storage = await getStorageImpl();
    let tokenString: string | null = null;

    if (storage.useKeychain) {
      // React Native with Keychain
      const credentials = await storage.Keychain.getGenericPassword({
        service: TOKEN_STORAGE_KEY,
      });
      tokenString = credentials ? credentials.password : null;
    } else if (storage.AsyncStorage) {
      // React Native with AsyncStorage
      tokenString = await storage.AsyncStorage.getItem(TOKEN_STORAGE_KEY);
    } else {
      // Web: Use localStorage
      tokenString = await storage.getItem(TOKEN_STORAGE_KEY);
    }

    if (!tokenString) {
      return null;
    }

    const tokenData: TokenData = JSON.parse(tokenString);
    
    // Check if token is expired
    if (tokenData.expiresAt < Date.now()) {
      console.warn('Token has expired');
      return null; // Token expired, caller should refresh
    }

    return tokenData;
  } catch (error) {
    console.error('Failed to retrieve tokens:', error);
    return null;
  }
}

/**
 * Clear tokens from storage (on logout)
 */
export async function clearTokens(): Promise<void> {
  try {
    const storage = await getStorageImpl();

    if (storage.useKeychain) {
      // React Native with Keychain
      await storage.Keychain.resetGenericPassword({
        service: TOKEN_STORAGE_KEY,
      });
      console.log('Tokens cleared from keychain');
    } else if (storage.AsyncStorage) {
      // React Native with AsyncStorage
      await storage.AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
      console.log('Tokens cleared from AsyncStorage');
    } else {
      // Web: Use localStorage
      await storage.removeItem(TOKEN_STORAGE_KEY);
      console.log('Tokens cleared from localStorage');
    }
  } catch (error) {
    console.error('Failed to clear tokens:', error);
    throw error;
  }
}

/**
 * Check if token is expired (without retrieving it)
 */
export async function isTokenExpired(): Promise<boolean> {
  const tokens = await getTokens();
  if (!tokens) return true;
  return tokens.expiresAt < Date.now();
}

/**
 * Get time until token expiration in seconds
 */
export async function getTokenTimeToExpiry(): Promise<number | null> {
  const tokens = await getTokens();
  if (!tokens) return null;
  
  const secondsRemaining = Math.max(0, (tokens.expiresAt - Date.now()) / 1000);
  return secondsRemaining;
}
