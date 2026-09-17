import { randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { StorageProviderName } from '../config/constants';
import { AppError } from '../core/errors/AppError';
import { NotFoundError } from '../core/errors/NotFoundError';
import { logger } from '../core/utils/logger';
import { StorageProvider, StoredFile, UploadInput } from './storage.interface';

/** Only these characters survive in a key prefix - everything else is dropped. */
const SAFE_PREFIX = /[^a-z0-9-]/g;

/**
 * Extensions that must never be written to disk with their original suffix,
 * because a misconfigured static server could execute them.
 */
const DANGEROUS_EXTENSIONS = new Set([
  '.php', '.phtml', '.php3', '.php4', '.php5', '.phar',
  '.asp', '.aspx', '.jsp', '.jspx',
  '.cgi', '.pl', '.py', '.rb', '.sh', '.bash',
  '.exe', '.dll', '.bat', '.cmd', '.com', '.scr',
  '.js', '.mjs', '.cjs', '.html', '.htm', '.svg',
]);

/**
 * Filesystem-backed storage.
 *
 * ── SCALING LIMITATION ──
 * A file written to one node's disk is invisible to every other node. This
 * provider is therefore incompatible with horizontal scaling unless
 * STORAGE_LOCAL_PATH points at shared storage (EFS/NFS). Implement
 * S3StorageProvider before scaling out.
 */
export class LocalStorageProvider implements StorageProvider {
  readonly name: StorageProviderName = 'LOCAL';

  private readonly rootDir: string;
  private readonly publicBaseUrl: string;

  constructor(rootDir: string, publicBaseUrl: string) {
    this.rootDir = path.resolve(rootDir);
    this.publicBaseUrl = publicBaseUrl.replace(/\/+$/, '');
  }

  /**
   * Resolves a storage key to an absolute path and refuses anything that
   * escapes the root. This is the path-traversal guard: a key of
   * '../../etc/passwd' resolves outside rootDir and is rejected here.
   */
  private resolveSafePath(storageKey: string): string {
    const resolved = path.resolve(this.rootDir, storageKey);
    const rootWithSep = this.rootDir.endsWith(path.sep)
      ? this.rootDir
      : this.rootDir + path.sep;

    if (!resolved.startsWith(rootWithSep)) {
      logger.warn('Rejected storage key outside root', { storageKey });
      throw new AppError('Invalid storage key', 400, 'INVALID_STORAGE_KEY');
    }
    return resolved;
  }

  /**
   * Storage keys are generated, never derived from the uploaded filename.
   * The original name is preserved only in the database, so a hostile filename
   * cannot influence the path or the extension on disk.
   */
  private buildStorageKey(input: UploadInput): string {
    const prefix = (input.keyPrefix ?? 'general')
      .toLowerCase()
      .replace(SAFE_PREFIX, '')
      .slice(0, 40) || 'general';

    const rawExtension = path.extname(input.originalName).toLowerCase().slice(0, 10);
    const extension =
      rawExtension && !DANGEROUS_EXTENSIONS.has(rawExtension) && /^\.[a-z0-9]+$/.test(rawExtension)
        ? rawExtension
        : '.bin';

    const now = new Date();
    const datePath = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}`;

    return `${prefix}/${datePath}/${randomUUID()}${extension}`;
  }

  async upload(input: UploadInput): Promise<StoredFile> {
    const storageKey = this.buildStorageKey(input);
    const absolutePath = this.resolveSafePath(storageKey);

    await mkdir(path.dirname(absolutePath), { recursive: true });
    // 'wx' fails if the path already exists - a generated UUID collision must
    // never silently overwrite an existing file.
    await writeFile(absolutePath, input.buffer, { flag: 'wx', mode: 0o640 });

    logger.debug('File stored locally', { storageKey, sizeBytes: input.buffer.length });

    return {
      storageKey,
      sizeBytes: input.buffer.length,
      provider: this.name,
    };
  }

  async getFile(storageKey: string): Promise<Buffer> {
    const absolutePath = this.resolveSafePath(storageKey);
    try {
      return await readFile(absolutePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new NotFoundError('File');
      }
      throw error;
    }
  }

  async delete(storageKey: string): Promise<void> {
    const absolutePath = this.resolveSafePath(storageKey);
    try {
      await unlink(absolutePath);
    } catch (error) {
      // Already gone is the desired end state - deletion is idempotent.
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      logger.debug('Delete skipped, file already absent', { storageKey });
    }
  }

  /**
   * Local files are served through this API rather than by a static server, so
   * the download route can enforce authentication and permissions. There is no
   * expiry to honour, so expiresInSeconds is ignored.
   */
  async getPublicUrl(storageKey: string): Promise<string> {
    return `${this.publicBaseUrl}/${encodeURIComponent(storageKey)}/download`;
  }
}
