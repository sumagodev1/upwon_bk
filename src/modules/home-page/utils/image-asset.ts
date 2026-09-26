// src/modules/home-page/utils/image-asset.ts

import { isPubliclyServableEntityType } from '../../../config/constants';
import { env } from '../../../config/env';
import { ValidationError } from '../../../core/errors/ValidationError';
import { getStorageProvider } from '../../../storage/storage.factory';
import * as fileRepository from '../../files/repositories/file.repository';
import { checkImageDimensions, ImageSpec } from './hero-image-spec';
import { readImageDimensions } from './image-dimensions';

/**
 * The two halves of "a CMS image": turning a stored source into a URL the
 * marketing site can render, and refusing an upload that cannot serve the slot
 * it is attached to.
 *
 * Shared by every CMS section with an image - the home hero, the Insider page
 * sections and the Contact hero - so an image behaves identically wherever it
 * is authored.
 */

/** Only images belong in an image slot; a PDF in an <img> is a broken section. */
const IMAGE_MIME_PREFIX = 'image/';

/**
 * Turns an imageUrl / imageFileId pair into a URL an anonymous browser can
 * render.
 *
 * Deliberately NOT the storage provider's getPublicUrl. Under LOCAL storage
 * that points at the files module's download route, which requires FILES_READ
 * and responds with Content-Disposition: attachment - so the marketing site,
 * which holds no token, could neither fetch it nor render it in an <img>.
 *
 * The public file route has neither problem: it is unauthenticated, serves
 * inline, and is restricted to uploads that opted in by entity type. It also
 * behaves identically whatever STORAGE_DRIVER is set to, so moving to S3 later
 * does not change the URLs already embedded in the site.
 */
export const resolveImageSource = async (
  url: string | null,
  fileId: string | null,
): Promise<string | null> => {
  if (url) return url;
  if (!fileId) return null;

  const file = await fileRepository.findById(fileId);
  // Soft-deleted or purged asset: render without an image rather than failing
  // the whole request for one missing file.
  if (!file) return null;
  return `${env.publicApiBaseUrl}/public/files/${file.id}`;
};

/**
 * Rejects a file id that does not point at a live image asset of the right
 * shape for the slot it is destined for.
 *
 * Checked in services rather than validators for two reasons: it needs the
 * database (the FK alone would accept a soft-deleted row or a PDF), and the
 * dimension check needs the stored bytes.
 */
export const assertUsableImageFile = async (
  fileId: string,
  spec: ImageSpec,
  field: string,
): Promise<void> => {
  const file = await fileRepository.findById(fileId);
  if (!file) {
    throw new ValidationError('Image file not found', [
      {
        field,
        message: 'No such uploaded file, or it has been deleted',
        code: 'UNKNOWN_FILE',
      },
    ]);
  }
  if (!file.mimeType.startsWith(IMAGE_MIME_PREFIX)) {
    throw new ValidationError('Image file must be an image', [
      { field, message: `Expected an image, got ${file.mimeType}`, code: 'INVALID_FILE_TYPE' },
    ]);
  }

  /*
   * The same gate fileService.getPublicImage applies on the way out: an upload
   * whose entity type is not on PUBLIC_FILE_ENTITY_TYPES is served a 404 to an
   * anonymous browser. Accepting one here would save a section whose image is
   * invisible on the public site with nothing to explain it, so the slot is
   * refused now instead. The admin panel always tags its uploads (each CMS
   * form has its own entity type), so this only bites a caller that supplied
   * its own file id.
   */
  if (!isPubliclyServableEntityType(file.entityType)) {
    throw new ValidationError('Image file is not publicly servable', [
      {
        field,
        message:
          'This upload is not tagged for public use, so the site could not load it. Upload the image through this form.',
        code: 'FILE_NOT_PUBLIC',
      },
    ]);
  }

  /*
   * The dimension check reads the blob back. That is one storage round trip per
   * changed image on save - only on create/update, never on a read path - and
   * it is the only way to know what was actually uploaded. The admin panel
   * checks the same rules in the browser before uploading, so reaching a
   * failure here means the client was bypassed.
   */
  const buffer = await getStorageProvider().getFile(file.storageKey);
  const dimensions = readImageDimensions(buffer);

  if (!dimensions) {
    throw new ValidationError('Image could not be read', [
      {
        field,
        message: `${file.originalName} is not a readable PNG, JPEG, GIF or WebP image`,
        code: 'UNREADABLE_IMAGE',
      },
    ]);
  }

  const problem = checkImageDimensions(spec, dimensions);
  if (problem) {
    throw new ValidationError('Image is the wrong size', [
      { field, message: problem, code: 'INVALID_IMAGE_DIMENSIONS' },
    ]);
  }
};
