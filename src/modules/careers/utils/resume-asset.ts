// src/modules/careers/utils/resume-asset.ts

import path from 'node:path';
import { FieldError } from '../../../core/errors/AppError';
import { logger } from '../../../core/utils/logger';
import { getStorageProvider } from '../../../storage/storage.factory';
import { StoredFile } from '../../../storage/storage.interface';
import * as fileRepository from '../../files/repositories/file.repository';
import { FileRecord } from '../../files/types/file.types';
import { ResumeUpload } from '../types/applications.types';

/**
 * Everything about the one file this module accepts: what counts as a resume,
 * how it is stored, and how it is read back.
 *
 * Modelled on home-page/utils/image-asset.ts, which does the same job for CMS
 * images, and for the same reason: the rules have to be identical wherever the
 * file is touched, and a check that lives in one controller is a check the
 * next caller forgets.
 *
 * It does NOT go through fileService.upload, deliberately:
 *
 *   the type list    That service's allowlist is the set of things an
 *                    administrator may attach to a record. This is a narrower,
 *                    different list - three document formats and nothing else,
 *                    least of all an image or a spreadsheet.
 *   the size         It answers 413 FILE_TOO_LARGE. An oversized resume is a
 *                    field the applicant can fix, so it belongs in the same
 *                    422 as their mistyped email, listed beside it.
 *   the audit row    FILE_UPLOADED records an administrator's action. There is
 *                    no administrator here; the applicant is anonymous. The
 *                    career_applications row is itself the permanent record,
 *                    exactly as the contact_enquiries row is.
 */

/**
 * The only three formats a CV arrives in, keyed by EXTENSION, with the media
 * type each one is properly announced as.
 *
 * The extension decides, and the declared type is a secondary signal that may
 * contradict it but may not be missing. That asymmetry is deliberate, and it
 * used to be the other way round - the declared type was looked up first and a
 * miss ended the check, which rejected a large share of genuine CVs:
 *
 *   A browser does not read a file to work out File.type; on Windows it reads
 *   the registry, and Windows ships no Content Type registration for .doc or
 *   .docx - Office installs one. On a machine with LibreOffice, WPS, or a CV
 *   exported from Google Docs and nothing else, Chrome and Edge hand a .docx
 *   over as application/octet-stream or application/x-zip-compressed, and a
 *   .doc as application/octet-stream. Dragged from some contexts the type is
 *   '' outright. The picker accepts the file (the accept attribute lists the
 *   extensions too) and then the form insisted it was the wrong kind, with no
 *   way round it - for a file that was never wrong.
 *
 * Nothing is lost by this. An attacker writes both halves anyway, so neither
 * check was ever a defence: a .exe renamed .pdf still passes both, here and in
 * every other upload form on the internet. The real protection is that this
 * file is never served inline, never served to an anonymous caller, and never
 * written to disk under its own name (the storage provider generates the key).
 * What the check is for is catching an applicant who attached the wrong thing,
 * and for that the extension is the better signal and the one they can see.
 */
const ALLOWED_RESUME_EXTENSIONS: Readonly<Record<string, string>> = {
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

/**
 * Declared types that say nothing about the format, so the extension stands.
 *
 * These are what a browser reports when it has no registration to consult -
 * plus the two ZIP spellings, because a .docx IS a zip archive and a machine
 * that recognises the container but not the Office format says so.
 */
const UNINFORMATIVE_MIME_TYPES: ReadonlySet<string> = new Set([
  '',
  'application/octet-stream',
  'application/zip',
  'application/x-zip-compressed',
]);

/** What the form tells the applicant, and what the website repeats. */
export const RESUME_ACCEPTED_LABEL = 'PDF, DOC or DOCX';

/**
 * 5 MB. A CV is two pages; anything larger is a scanned photograph of two
 * pages, which still fits, or it is not a CV. Below the 10 MB the files module
 * allows, because this limit is reachable without credentials.
 */
export const RESUME_MAX_BYTES = 5 * 1024 * 1024;
export const RESUME_MAX_MB = RESUME_MAX_BYTES / (1024 * 1024);

/** The storage folder. The provider strips anything but [a-z0-9-] anyway. */
const RESUME_KEY_PREFIX = 'career-resume';

/**
 * The entity type stamped on the files row.
 *
 * Emphatically NOT on PUBLIC_FILE_ENTITY_TYPES - see the note there. It exists
 * so a resume is identifiable in the files table, and so the download route
 * can refuse a file id that is not one.
 */
export const RESUME_ENTITY_TYPE = 'career_resume';

/** Leaves a filename that is recognisable to a recruiter and inert on a disk. */
const MAX_FILE_NAME = 120;

/**
 * Reduces the applicant's filename to something safe to store and to echo back
 * in a Content-Disposition header.
 *
 * path.basename first, so 'x/../../etc/passwd.pdf' loses its directories; then
 * everything outside a small character class becomes an underscore, so quotes,
 * semicolons and newlines cannot reach the header, and runs of underscores are
 * collapsed so the result still reads like a name.
 *
 * The extension is preserved because it has already been checked against the
 * declared type, and because 'Priya_Nair_CV' with no suffix opens in nothing.
 */
export const sanitizeResumeFileName = (originalName: string): string => {
  const base = path.basename(originalName ?? '').trim();
  const extension = path.extname(base).toLowerCase();
  const stem = base.slice(0, base.length - extension.length);

  const safeStem =
    stem
      .replace(/[^A-Za-z0-9._ -]+/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^[._ -]+|[._ -]+$/g, '')
      .slice(0, MAX_FILE_NAME - extension.length) || 'resume';

  return `${safeStem}${extension}`;
};

/** The shape multer hands over, narrowed to what this file needs. */
export interface IncomingResume {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
}

/** Either the file is usable, or there is one field error to report for it. */
export type ResumeCheck =
  | { ok: true; resume: ResumeUpload }
  | { ok: false; error: FieldError };

/**
 * Checks one uploaded file against every resume rule.
 *
 * Returns a result rather than throwing, so the caller can fold a bad file in
 * with the body's field errors and answer both in one response. An applicant
 * who mistyped their email AND attached a .docx that is really a .exe should
 * be told both things once, not sent round twice - the same reasoning as the
 * Contact enquiry validator taking its choices as an argument.
 *
 * Every failure is reported as a field error on `resume` rather than as a 413
 * or a 415, because every one of them is something the applicant can fix, and
 * the website renders it under the file input beside the rest.
 */
export function checkResumeUpload(file: IncomingResume | undefined): ResumeCheck {
  const bad = (message: string, code: string): ResumeCheck => ({
    ok: false,
    error: { field: 'resume', message, code },
  });

  if (!file) return bad('Attach your resume', 'REQUIRED');
  if (!file.buffer || file.buffer.length === 0) return bad('The file is empty', 'EMPTY_FILE');

  // Checked again here even though multer's own limit already aborted anything
  // larger: multer guards the HTTP path, this guards the rule.
  if (file.buffer.length > RESUME_MAX_BYTES) {
    return bad(`Resume must be at most ${RESUME_MAX_MB} MB`, 'FILE_TOO_LARGE');
  }

  // The extension decides; see ALLOWED_RESUME_EXTENSIONS above for why round
  // this way. The message names what was actually wrong, because "must be a
  // PDF, DOC or DOCX file" over a file called cv.pages tells the applicant
  // nothing they did not already believe.
  const fileName = sanitizeResumeFileName(file.originalname);
  const extension = path.extname(fileName).toLowerCase();
  const expectedMimeType = ALLOWED_RESUME_EXTENSIONS[extension] as string | undefined;
  if (!expectedMimeType) {
    return bad(
      `Resume must be a ${RESUME_ACCEPTED_LABEL} file - its name ends in ${extension || 'nothing'}`,
      'UNSUPPORTED_FILE_TYPE',
    );
  }

  // A declared type that CONTRADICTS the extension is still refused - a .pdf
  // announced as application/x-msdownload is not somebody's CV. One that is
  // merely uninformative is not held against the file.
  const declaredType = (file.mimetype ?? '').toLowerCase().split(';')[0].trim();
  if (declaredType !== expectedMimeType && !UNINFORMATIVE_MIME_TYPES.has(declaredType)) {
    return bad(`Resume must be a ${RESUME_ACCEPTED_LABEL} file`, 'UNSUPPORTED_FILE_TYPE');
  }

  // Stored under the type the extension implies, never under whatever the
  // caller declared: this value is echoed back in the download route's
  // Content-Type, so it has to come from the allowlist and not from the wire.
  return { ok: true, resume: { buffer: file.buffer, fileName, mimeType: expectedMimeType } };
}

/**
 * Writes the bytes to storage. The files row is written separately, by
 * recordResumeFile, inside the caller's transaction.
 *
 * Split that way on purpose, and called in that order: the blob goes down
 * BEFORE the transaction, mirroring fileService.upload, because the reverse
 * order would leave a database row pointing at a file that does not exist,
 * which is the worse failure. If the transaction then rolls back, the caller
 * removes the orphan with discardStoredResume below.
 */
export const storeResume = async (resume: ResumeUpload): Promise<StoredFile> =>
  getStorageProvider().upload({
    buffer: resume.buffer,
    originalName: resume.fileName,
    mimeType: resume.mimeType,
    keyPrefix: RESUME_KEY_PREFIX,
  });

/** Removes a blob whose database write did not commit. Never throws. */
export const discardStoredResume = async (storageKey: string): Promise<void> => {
  await getStorageProvider()
    .delete(storageKey)
    .catch((error: unknown) => {
      // The application was not saved, so nothing references this file. A
      // leftover blob is a cleanup problem, not a correctness problem.
      logger.error('Failed to clean up orphaned resume upload', {
        storageKey,
        message: (error as Error).message,
      });
    });
};

/**
 * The files row for a stored resume, written inside the caller's transaction.
 *
 * Exported separately from storeResume so the row and the application commit
 * or roll back together.
 */
export const recordResumeFile = fileRepository.create;

/**
 * Reads a stored resume back for the download route.
 *
 * Returns null rather than throwing when the row is gone or is not a resume:
 * the caller turns that into a 404, and a file id that belongs to some other
 * upload must not become a way to pull arbitrary files out of this endpoint.
 */
export const readResume = async (
  fileId: string,
): Promise<{ file: FileRecord; buffer: Buffer } | null> => {
  const file = await fileRepository.findById(fileId);
  if (!file) return null;
  if (file.entityType !== RESUME_ENTITY_TYPE) return null;

  const buffer = await getStorageProvider().getFile(file.storageKey);
  return { file, buffer };
};
