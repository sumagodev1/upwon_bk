// src/modules/home-page/utils/image-dimensions.ts

/**
 * Pixel dimensions, read straight from an image's header.
 *
 * Deliberately dependency-free. The only thing the hero needs to know about an
 * uploaded image is how big it is, and every format the files module accepts
 * puts that in the first few dozen bytes. Pulling in sharp (a native build) or
 * a decoder to learn two integers would be a poor trade.
 *
 * Covers exactly the image types in the files module's ALLOWED_MIME_TYPES:
 * PNG, JPEG, GIF and WebP. Anything else returns null, which callers treat as
 * "cannot verify" rather than "invalid".
 */

export interface ImageDimensions {
  width: number;
  height: number;
}

/** 89 50 4E 47 0D 0A 1A 0A */
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function readPng(buffer: Buffer): ImageDimensions | null {
  // IHDR is always the first chunk: 8-byte signature, 4-byte length, 4-byte
  // type, then width and height as big-endian uint32.
  if (buffer.length < 24) return null;
  if (!buffer.subarray(0, 8).equals(PNG_SIGNATURE)) return null;
  if (buffer.toString('ascii', 12, 16) !== 'IHDR') return null;

  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function readGif(buffer: Buffer): ImageDimensions | null {
  // 'GIF87a' or 'GIF89a', then the logical screen descriptor: two little-endian
  // uint16s.
  if (buffer.length < 10) return null;
  const header = buffer.toString('ascii', 0, 6);
  if (header !== 'GIF87a' && header !== 'GIF89a') return null;

  return { width: buffer.readUInt16LE(6), height: buffer.readUInt16LE(8) };
}

/**
 * JPEG has no fixed header offset - dimensions live in whichever SOF segment
 * the encoder emitted, so the segment chain has to be walked.
 */
function readJpeg(buffer: Buffer): ImageDimensions | null {
  if (buffer.length < 4) return null;
  if (buffer.readUInt16BE(0) !== 0xffd8) return null; // SOI

  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      // Not on a marker boundary; the file is malformed past this point.
      return null;
    }

    const marker = buffer[offset + 1];

    // Standalone markers: no length field, no payload.
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2;
      continue;
    }
    // Start of scan - past here is entropy-coded data, not segments.
    if (marker === 0xda) return null;

    const length = buffer.readUInt16BE(offset + 2);
    if (length < 2) return null;

    /*
     * SOF0-SOF15 carry the frame header. C4 (DHT), C8 (JPG) and CC (DAC) sit
     * inside that numeric range but are not frame headers, so they are skipped
     * explicitly rather than by range alone.
     */
    const isStartOfFrame =
      marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;

    if (isStartOfFrame) {
      // Segment: length (2), precision (1), height (2), width (2).
      if (offset + 9 > buffer.length) return null;
      return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
    }

    offset += 2 + length;
  }

  return null;
}

/**
 * WebP has three container variants and each stores its size differently:
 * lossy (VP8), lossless (VP8L) and extended (VP8X, used for alpha/animation).
 */
function readWebp(buffer: Buffer): ImageDimensions | null {
  if (buffer.length < 30) return null;
  if (buffer.toString('ascii', 0, 4) !== 'RIFF') return null;
  if (buffer.toString('ascii', 8, 12) !== 'WEBP') return null;

  const chunk = buffer.toString('ascii', 12, 16);

  if (chunk === 'VP8 ') {
    // Lossy: 3-byte frame tag, 3-byte start code, then 14-bit width/height.
    return {
      width: buffer.readUInt16LE(26) & 0x3fff,
      height: buffer.readUInt16LE(28) & 0x3fff,
    };
  }

  if (chunk === 'VP8L') {
    // Lossless: a 1-byte signature then 14 bits width, 14 bits height, minus 1.
    const bits = buffer.readUInt32LE(21);
    return {
      width: (bits & 0x3fff) + 1,
      height: ((bits >> 14) & 0x3fff) + 1,
    };
  }

  if (chunk === 'VP8X') {
    // Extended: canvas size as two 24-bit little-endian values, minus 1.
    return {
      width: buffer.readUIntLE(24, 3) + 1,
      height: buffer.readUIntLE(27, 3) + 1,
    };
  }

  return null;
}

/**
 * Reads an image's dimensions, or null when the format is unrecognised or the
 * header is truncated.
 *
 * Dispatches on the bytes rather than on the declared MIME type: the type is
 * client-supplied, and a file whose header disagrees with it is exactly the
 * case worth catching.
 */
export function readImageDimensions(buffer: Buffer): ImageDimensions | null {
  const dimensions =
    readPng(buffer) ?? readGif(buffer) ?? readWebp(buffer) ?? readJpeg(buffer);

  // A zero dimension is not a real image, whatever the header claims.
  if (!dimensions || dimensions.width <= 0 || dimensions.height <= 0) return null;
  return dimensions;
}
