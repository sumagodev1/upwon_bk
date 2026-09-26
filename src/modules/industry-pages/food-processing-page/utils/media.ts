// src/modules/industry-pages/food-processing-page/utils/media.ts

import { env } from '../../../../config/env';
import { ValidationError } from '../../../../core/errors/ValidationError';
import { getStorageProvider } from '../../../../storage/storage.factory';
import * as fileRepository from '../../../files/repositories/file.repository';
import { checkImageDimensions, ImageSlot } from '../../../home-page/utils/image-spec';
import { readImageDimensions } from '../../../home-page/utils/image-dimensions';

/**
 * The image handling every section of this page shares.
 *
 * The product pages carry a copy of these two in each service. This page has
 * six sections with artwork, so they live here once - the behaviour is exactly
 * the FMS closing band's, which already took the slot, field and label as
 * arguments.
 */

/** Only images belong in these slots; a PDF there renders nothing. */
const IMAGE_MIME_PREFIX = 'image/';

/**
 * Collapses a URL / file-id pair into the one URL to render.
 *
 * A soft-deleted or purged asset resolves to null, so the section renders
 * without that image rather than failing the whole request for one file.
 */
export const resolveSource = async (
  url: string | null,
  fileId: string | null,
): Promise<string | null> => {
  if (url) return url;
  if (!fileId) return null;

  const file = await fileRepository.findById(fileId);
  if (!file) return null;
  return `${env.publicApiBaseUrl}/public/files/${file.id}`;
};

/**
 * Rejects a file id that is not a live image of the right shape for its slot.
 *
 * @param field the request field, so the error lands on the right input
 * @param label what the admin calls it, for the message
 */
export const assertUsableImageFile = async (
  fileId: string,
  slot: ImageSlot,
  field: string,
  label: string,
): Promise<void> => {
  const file = await fileRepository.findById(fileId);
  if (!file) {
    throw new ValidationError('Image file not found', [
      { field, message: 'No such uploaded file, or it has been deleted', code: 'UNKNOWN_FILE' },
    ]);
  }
  if (!file.mimeType.startsWith(IMAGE_MIME_PREFIX)) {
    throw new ValidationError(`${label} must be an image`, [
      { field, message: `Expected an image, got ${file.mimeType}`, code: 'INVALID_FILE_TYPE' },
    ]);
  }

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

  const problem = checkImageDimensions(slot, dimensions);
  if (problem) {
    throw new ValidationError(`${label} is the wrong size`, [
      { field, message: problem, code: 'INVALID_IMAGE_DIMENSIONS' },
    ]);
  }
};
