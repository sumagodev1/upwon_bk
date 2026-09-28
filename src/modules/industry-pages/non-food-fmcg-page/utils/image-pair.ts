// src/modules/industry-pages/non-food-fmcg-page/utils/image-pair.ts

/**
 * Appends the assignments for one URL / file-id pair to an UPDATE.
 *
 * The two sources are mutually exclusive by CHECK on every table in this page,
 * so setting one has to clear the other in the same statement. Without this,
 * patching a URL onto a row that already has a file id violates the constraint
 * instead of replacing the image. `undefined` leaves a column alone; `null`
 * clears it.
 */
export function assignImagePair(
  assign: (column: string, value: unknown) => void,
  urlColumn: string,
  fileColumn: string,
  url: string | null | undefined,
  fileId: string | null | undefined,
): void {
  if (url !== undefined) {
    assign(urlColumn, url);
    if (url !== null && fileId === undefined) assign(fileColumn, null);
  }
  if (fileId !== undefined) {
    assign(fileColumn, fileId);
    if (fileId !== null && url === undefined) assign(urlColumn, null);
  }
}
