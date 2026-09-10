import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { SecureStorageService, secureStorage } from '../secure';

// Mock constants
jest.mock('@/constants', () => ({
  STORAGE_KEYS: {
    ACCESS_TOKEN: 'access_token',
    REFRESH_TOKEN: 'refresh_token',
    AUTH_KEYS: 'auth_keys',
    AUTH_REFRESH_TOKEN: 'auth_refresh_token',
    USER_PIN: 'user_pin',
    BIOMETRIC_KEY: 'biometric_key',
    USER_SESSION: 'user_session',
  },
  SECURE_STORE_SIZE_LIMIT: 2048,
  SENSITIVE_SESSION_FIELDS: ['token', 'password', 'key', 'secret', 'auth'],
}));

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(() => Promise.resolve()),
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
}));

// Get the mocked constants
const { STORAGE_KEYS } = require('@/constants');

describe('SecureStorageService', () => {
  let service: SecureStorageService;
  const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset mocks to their default implementations
    (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
    (SecureStore.deleteItemAsync as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue([]);

    service = SecureStorageService.getInstance();
    global.Blob = jest.fn(
      parts =>
        ({
          size: parts?.join('').length,
        }) as any,
    );
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  it('should be a singleton', () => {
    const instance1 = SecureStorageService.getInstance();
    const instance2 = SecureStorageService.getInstance();
    expect(instance1).toBe(instance2);
    expect(instance1).toBe(secureStorage);
  });

  describe('setItem', () => {
    it('should use SecureStore for a secure key', async () => {
      await service.setItem(STORAGE_KEYS.ACCESS_TOKEN, 'my-token');
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        STORAGE_KEYS.ACCESS_TOKEN,
        'my-token',
      );
      expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    });

    it('should use AsyncStorage for a non-secure key', async () => {
      await service.setItem('some_other_key', 'some-value');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'some_other_key',
        'some-value',
      );
      expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
    });

    it('should fall back to AsyncStorage if value is too large for SecureStore', async () => {
      const largeValue = 'a'.repeat(3000);
      await service.setItem(STORAGE_KEYS.ACCESS_TOKEN, largeValue);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEYS.ACCESS_TOKEN,
        largeValue,
      );
      expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
    });

    it('should throw and log error if SecureStore fails', async () => {
      const error = new Error('SecureStore failed');
      (SecureStore.setItemAsync as jest.Mock).mockRejectedValue(error);
      await expect(
        service.setItem(STORAGE_KEYS.ACCESS_TOKEN, 'token'),
      ).rejects.toThrow(error);
    });

    it('should throw and log error if AsyncStorage fails', async () => {
      const error = new Error('AsyncStorage failed');
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(error);
      await expect(service.setItem('key', 'value')).rejects.toThrow(error);
    });
  });

  describe('getItem', () => {
    it('should get from SecureStore for a secure key', async () => {
      await service.getItem(STORAGE_KEYS.REFRESH_TOKEN);
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith(
        STORAGE_KEYS.REFRESH_TOKEN,
      );
    });

    it('should get from AsyncStorage for a non-secure key', async () => {
      await service.getItem('some_other_key');
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('some_other_key');
    });

    it('should return null and log on error', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockRejectedValue(
        new Error('Failed'),
      );
      const result = await service.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      expect(result).toBeNull();
    });
  });

  describe('removeItem', () => {
    it('should remove from SecureStore for a secure key', async () => {
      await service.removeItem(STORAGE_KEYS.USER_PIN);
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(
        STORAGE_KEYS.USER_PIN,
      );
    });

    it('should remove from AsyncStorage for a non-secure key', async () => {
      await service.removeItem('some_other_key');
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('some_other_key');
    });

    it('should throw and log error on failure', async () => {
      (SecureStore.deleteItemAsync as jest.Mock).mockRejectedValue(
        new Error('Failed'),
      );
      await expect(service.removeItem(STORAGE_KEYS.USER_PIN)).rejects.toThrow(
        'Failed',
      );
    });
  });

  describe('removeSession', () => {
    it('should remove both sensitive and non-sensitive session data', async () => {
      await service.removeSession();

      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(
        `${STORAGE_KEYS.USER_SESSION}_sensitive`,
      );
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith(
        STORAGE_KEYS.USER_SESSION,
      );
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith(
        `${STORAGE_KEYS.USER_SESSION}_sensitive`,
      );
    });
  });

  describe('clearSensitiveData', () => {
    it('should remove all known sensitive keys', async () => {
      const removeItemSpy = jest
        .spyOn(service, 'removeItem')
        .mockResolvedValue();
      await service.clearSensitiveData();
      const sensitiveKeys = [
        STORAGE_KEYS.ACCESS_TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
        STORAGE_KEYS.USER_PIN,
        STORAGE_KEYS.BIOMETRIC_KEY,
        STORAGE_KEYS.AUTH_KEYS,
        STORAGE_KEYS.AUTH_REFRESH_TOKEN,
        `${STORAGE_KEYS.USER_SESSION}_sensitive`,
      ];
      expect(removeItemSpy).toHaveBeenCalledTimes(sensitiveKeys.length);
      sensitiveKeys.forEach(key => {
        expect(removeItemSpy).toHaveBeenCalledWith(key);
      });
      removeItemSpy.mockRestore();
    });

    it('should throw and log error on failure', async () => {
      const error = new Error('Complete failure');
      // Make the entire Promise.all fail by making removeItem throw synchronously
      jest.spyOn(service, 'removeItem').mockImplementation(() => {
        throw error;
      });

      await expect(service.clearSensitiveData()).rejects.toThrow();
    });
  });

  describe('clear', () => {
    it('should throw and log error on failure', async () => {
      const error = new Error('Failed');
      jest.spyOn(service, 'removeSession').mockRejectedValue(error);

      await expect(service.clear()).rejects.toThrow(error);
    });
  });

  describe('getItemWithTimeout', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return value if getItem resolves before timeout', async () => {
      jest.spyOn(service, 'getItem').mockResolvedValue('test-value');

      const promise = service.getItemWithTimeout('some-key', 1000);
      jest.runAllTimers();
      const result = await promise;

      expect(result).toBe('test-value');
    });

    it('should return null and warn if timeout occurs', async () => {
      jest
        .spyOn(service, 'getItem')
        .mockImplementation(
          () =>
            new Promise(resolve => setTimeout(() => resolve('value'), 10000)),
        );

      const promise = service.getItemWithTimeout('some-key', 1000);
      jest.advanceTimersByTime(1000);
      const result = await promise;

      expect(result).toBeNull();
    });
  });

  describe('hasItem', () => {
    it('should return true if item exists', async () => {
      jest.spyOn(service, 'getItem').mockResolvedValue('value');
      const result = await service.hasItem('key');
      expect(result).toBe(true);
    });

    it('should return false if item does not exist', async () => {
      jest.spyOn(service, 'getItem').mockResolvedValue(null);
      const result = await service.hasItem('key');
      expect(result).toBe(false);
    });
  });
});
