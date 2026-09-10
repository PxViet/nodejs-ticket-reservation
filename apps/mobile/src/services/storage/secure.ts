import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

// Constants
import { SECURE_STORE_SIZE_LIMIT, STORAGE_KEYS } from '@/constants';

export class SecureStorageService {
  private static instance: SecureStorageService;

  private constructor() {}

  /**
   * Returns an instance of the SecureStorageService. If the instance does not exist yet,
   * a new instance will be created.
   * @returns {SecureStorageService} The instance of SecureStorageService.
   */
  static getInstance(): SecureStorageService {
    if (!SecureStorageService.instance) {
      SecureStorageService.instance = new SecureStorageService();
    }
    return SecureStorageService.instance;
  }

  /**
   * Determines if a key should be stored in SecureStore (for sensitive data)
   * or AsyncStorage (for larger, less sensitive data).
   * @param {string} key The key to check.
   * @returns {boolean} True if the key should use SecureStore, false for AsyncStorage.
   */
  private isSecureKey(key: string): boolean {
    // Store all sensitive authentication data in SecureStore
    const secureKeys = [
      STORAGE_KEYS.ACCESS_TOKEN,
      STORAGE_KEYS.REFRESH_TOKEN,
      STORAGE_KEYS.AUTH_KEYS,
      STORAGE_KEYS.AUTH_REFRESH_TOKEN,
      STORAGE_KEYS.USER_PIN,
      STORAGE_KEYS.BIOMETRIC_KEY,
    ];
    return secureKeys.some(secureKey => key.includes(secureKey));
  }

  /**
   * Check if value size exceeds SecureStore limit
   * @param {string} value The value to check
   * @returns {boolean} True if size is within limit
   */
  private isWithinSecureStoreLimit(value: string): boolean {
    const byteSize = new Blob([value]).size;
    return byteSize <= SECURE_STORE_SIZE_LIMIT;
  }

  /**
   * Sets a value for a given key in the appropriate storage.
   * Sensitive keys (like tokens) go to SecureStore if within size limit.
   * Large values automatically fallback to AsyncStorage with warning.
   * @param {string} key The key to store the value under.
   * @param {string} value The value to store.
   * @returns {Promise<void>} A promise that resolves when the value has been set.
   * @throws {Error} If there was an error setting the value.
   */
  async setItem(key: string, value: string): Promise<void> {
    try {
      if (this.isSecureKey(key)) {
        if (!this.isWithinSecureStoreLimit(value)) {
          await AsyncStorage.setItem(key, value);
        } else {
          await SecureStore.setItemAsync(key, value);
        }
      } else {
        await AsyncStorage.setItem(key, value);
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Retrieves a value from the appropriate storage for a given key.
   * @param {string} key The key to retrieve the value for.
   * @returns {Promise<string | null>} A promise that resolves with the value for the given key if it exists,
   * or null if it does not exist or if there was an error retrieving it.
   */
  async getItem(key: string): Promise<string | null> {
    try {
      if (this.isSecureKey(key)) {
        return await SecureStore.getItemAsync(key);
      } else {
        return await AsyncStorage.getItem(key);
      }
    } catch {
      return null;
    }
  }

  /**
   * Retrieves a value with timeout to prevent hanging
   * @param {string} key The key to retrieve
   * @param {number} timeout Timeout in milliseconds (default: 5000ms)
   * @returns {Promise<string | null>} The value or null
   */
  async getItemWithTimeout(
    key: string,
    timeout = 5000,
  ): Promise<string | null> {
    return Promise.race([
      this.getItem(key),
      new Promise<null>(resolve =>
        setTimeout(() => {
          resolve(null);
        }, timeout),
      ),
    ]);
  }

  /**
   * Removes a value from the appropriate storage for a given key.
   * @param {string} key The key to remove the value for.
   * @returns {Promise<void>} A promise that resolves when the value has been removed.
   * @throws {Error} If there was an error removing the value.
   */
  async removeItem(key: string): Promise<void> {
    try {
      if (this.isSecureKey(key)) {
        await SecureStore.deleteItemAsync(key);
      } else {
        await AsyncStorage.removeItem(key);
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Remove session data (both sensitive and non-sensitive parts)
   * @returns {Promise<void>}
   */
  async removeSession(): Promise<void> {
    try {
      await Promise.all([
        // Remove from SecureStore
        SecureStore.deleteItemAsync(`${STORAGE_KEYS.USER_SESSION}_sensitive`),

        // Remove from AsyncStorage (both regular and fallback)
        AsyncStorage.removeItem(STORAGE_KEYS.USER_SESSION),
        AsyncStorage.removeItem(`${STORAGE_KEYS.USER_SESSION}_sensitive`),
      ]);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Clears all sensitive authentication data from storage.
   * Use this when logging out or when user requests to clear data.
   * @returns {Promise<void>} A promise that resolves when all sensitive data has been removed.
   */
  async clearSensitiveData(): Promise<void> {
    try {
      const sensitiveKeys = [
        STORAGE_KEYS.ACCESS_TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
        STORAGE_KEYS.USER_PIN,
        STORAGE_KEYS.BIOMETRIC_KEY,
        STORAGE_KEYS.AUTH_KEYS,
        STORAGE_KEYS.AUTH_REFRESH_TOKEN,
        `${STORAGE_KEYS.USER_SESSION}_sensitive`,
      ];

      await Promise.all(sensitiveKeys.map(key => this.removeItem(key)));
    } catch (error) {
      throw error;
    }
  }

  /**
   * Clears the storage of all values related to authentication.
   * @returns {Promise<void>} A promise that resolves when all authentication-related values have been removed.
   * @throws {Error} If there was an error removing the values.
   */
  async clear(): Promise<void> {
    try {
      // Clear session first (handles both parts)
      await this.removeSession();

      // Clear other auth-related keys
      const keys = [
        STORAGE_KEYS.ACCESS_TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
        STORAGE_KEYS.AUTH_KEYS,
        STORAGE_KEYS.AUTH_REFRESH_TOKEN,
      ];

      await Promise.all(keys.map(key => this.removeItem(key)));
    } catch (error) {
      throw error;
    }
  }

  /**
   * Check if a key exists in storage
   * @param {string} key The key to check
   * @returns {Promise<boolean>} True if key exists
   */
  async hasItem(key: string): Promise<boolean> {
    const value = await this.getItem(key);
    return value !== null;
  }
}

export const secureStorage = SecureStorageService.getInstance();
