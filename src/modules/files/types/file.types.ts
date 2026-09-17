import { StorageProviderName } from '../../../config/constants';

export interface FileRecord {
  id: string;
  storageKey: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  provider: StorageProviderName;
  entityType: string | null;
  entityId: string | null;
  uploadedBy: string | null;
  createdAt: Date;
  deletedAt: Date | null;
}

export interface CreateFileRecordInput {
  storageKey: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  provider: StorageProviderName;
  entityType: string | null;
  entityId: string | null;
  uploadedBy: string | null;
}

export interface FileFilters {
  entityType?: string;
  entityId?: string;
  uploadedBy?: string;
}
