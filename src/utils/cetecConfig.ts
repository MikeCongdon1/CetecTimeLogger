/**
 * CetecERP Instance Configuration Storage
 * Stores the user's CetecERP server URL
 * 
 * On React Native: Uses AsyncStorage
 * On Web: Uses localStorage
 */

import { Platform } from 'react-native';

const CETEC_URL_KEY = 'cetec_instance_url';

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

  // React Native: Try to use AsyncStorage
  try {
    // eslint-disable-next-line global-require
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    return AsyncStorage;
  } catch (e) {
    throw new Error('AsyncStorage not available on this platform');
  }
}

/**
 * Save the CetecERP instance URL
 */
export async function saveCetecUrl(url: string): Promise<void> {
  try {
    const storage = await getStorageImpl();

    // Validate URL format
    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      throw new Error('URL cannot be empty');
    }

    // Ensure it starts with http:// or https://
    let validUrl = trimmedUrl;
    if (!validUrl.startsWith('http://') && !validUrl.startsWith('https://')) {
      validUrl = 'http://' + validUrl;
    }

    // Validate it's a proper URL
    new URL(validUrl);

    await storage.setItem(CETEC_URL_KEY, validUrl);
    console.log('CetecERP URL saved:', validUrl);
  } catch (error) {
    console.error('Failed to save CetecERP URL:', error);
    throw new Error('Invalid URL format. Please enter a valid URL.');
  }
}

/**
 * Retrieve the saved CetecERP instance URL
 */
export async function getCetecUrl(): Promise<string | null> {
  try {
    const storage = await getStorageImpl();
    const url = await storage.getItem(CETEC_URL_KEY);
    return url;
  } catch (error) {
    console.error('Failed to retrieve CetecERP URL:', error);
    return null;
  }
}

/**
 * Clear the saved CetecERP instance URL
 */
export async function clearCetecUrl(): Promise<void> {
  try {
    const storage = await getStorageImpl();
    await storage.removeItem(CETEC_URL_KEY);
    console.log('CetecERP URL cleared');
  } catch (error) {
    console.error('Failed to clear CetecERP URL:', error);
    throw error;
  }
}

/**
 * Check if CetecERP URL is configured
 */
export async function isCetecUrlConfigured(): Promise<boolean> {
  const url = await getCetecUrl();
  return !!url;
}
