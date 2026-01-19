/**
 * Database service for storing app settings and data
 * Uses IndexedDB for web, SQLite on native platforms
 */

interface SettingsRow {
  key: string;
  value: string;
  createdAt?: number;
  updatedAt?: number;
}

class DatabaseService {
  private dbName = 'CetecTimeLoggerDB';
  private storeName = 'settings';
  private db: IDBDatabase | null = null;

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'key' });
        }
      };
    });
  }

  async setSetting(key: string, value: string): Promise<void> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);

      const setting: SettingsRow = {
        key,
        value,
        updatedAt: Date.now(),
      };

      const request = store.put(setting);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getSetting(key: string): Promise<string | null> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result as SettingsRow | undefined;
        resolve(result ? result.value : null);
      };
    });
  }

  async deleteSetting(key: string): Promise<void> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getAllSettings(): Promise<Record<string, string>> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const settings = request.result as SettingsRow[];
        const result: Record<string, string> = {};
        settings.forEach((setting) => {
          result[setting.key] = setting.value;
        });
        resolve(result);
      };
    });
  }

  async clearAll(): Promise<void> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
}

// Singleton instance
const dbService = new DatabaseService();

export default dbService;
