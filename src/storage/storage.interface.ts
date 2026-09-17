import { StorageProviderName } from '../config/constants';

export interface UploadInput {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  /** Optional logical folder, e.g. 'organizations'. Sanitised by the provider. */
  keyPrefix?: string;
}

export interface StoredFile {
  storageKey: string;
  sizeBytes: number;
  provider: StorageProviderName;
}

/**
 * The abstraction that lets local disk be swapped for cloud object storage
 * without touching a service, controller, or repository.
 */
export interface StorageProvider {
  readonly name: StorageProviderName;

  upload(input: UploadInput): Promise<StoredFile>;
  delete(storageKey: string): Promise<void>;
  getFile(storageKey: string): Promise<Buffer>;

  /**
   * A URL the client can fetch. LOCAL returns a route on this API; a cloud
   * provider returns a presigned URL. Callers must treat it as short-lived and
   * never persist it.
   */
  getPublicUrl(storageKey: string, expiresInSeconds?: number): Promise<string>;
}
