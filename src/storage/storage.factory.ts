import { env } from '../config/env';
import { LocalStorageProvider } from './local.storage';
import { StorageProvider } from './storage.interface';

let instance: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (instance) return instance;

  switch (env.storageDriver) {
    case 'LOCAL':
      instance = new LocalStorageProvider(env.storageLocalPath, env.storagePublicBaseUrl);
      return instance;
    case 'S3':
      // Adding S3 means one new file implementing StorageProvider and one case
      // here. No service, controller, or repository changes.
      throw new Error(
        'S3StorageProvider is not implemented. Set STORAGE_DRIVER=LOCAL or implement it.',
      );
  }
}
