/**
 * Web-compatible storage wrapper
 * Provides a common interface for localStorage on web
 */

// Simple wrapper around localStorage for consistent API
const webStorage = {
  getItem: (key: string): Promise<string | null> => {
    return Promise.resolve(localStorage.getItem(key));
  },
  setItem: (key: string, value: string): Promise<void> => {
    return Promise.resolve(localStorage.setItem(key, value));
  },
  removeItem: (key: string): Promise<void> => {
    return Promise.resolve(localStorage.removeItem(key));
  },
};

export default webStorage;
