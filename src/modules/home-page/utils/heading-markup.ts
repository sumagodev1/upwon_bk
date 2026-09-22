// src/modules/home-page/utils/heading-markup.ts

/**
 * The tiny markup language home page headings are authored in.
 *
 * Admins type plain text into a textarea; the site's headings need line breaks
 * and an orange accent span. Storing raw HTML would mean trusting admin input
 * with markup, and storing a nested JSON structure would mean building a
 * segment editor in the admin UI. So headings are stored as text with exactly
 * two markers:
 *
 *   a newline       ->  a line break
 *   **like this**   ->  the accent span (gradient-text-orange on the site)
 *
 * Parsing happens here, server-side, and the parsed tree ships alongside the
 * raw string in every API response. The frontend maps over the tree - it never
 * has to implement this grammar, and it never interpolates HTML.
 */

/** A run of heading text, either plain or accented. */
export interface HeadingPart {
  text: string;
  accent: boolean;
}

/** One visual line of a heading. Lines are separated by <br /> when rendered. */
export type HeadingLine = HeadingPart[];

const ACCENT_MARKER = '**';
/** Non-greedy, and rejects an empty body so `****` is not a valid accent. */
const ACCENT_PATTERN = /\*\*([^*]+?)\*\*/g;

/** Splits on newlines first - an accent never spans a line break. */
const toLines = (heading: string): string[] => heading.replace(/\r\n/g, '\n').split('\n');

function parseLine(line: string): HeadingLine {
  const parts: HeadingLine = [];
  const pattern = new RegExp(ACCENT_PATTERN.source, 'g');
  let cursor = 0;

  for (let match = pattern.exec(line); match !== null; match = pattern.exec(line)) {
    if (match.index > cursor) {
      parts.push({ text: line.slice(cursor, match.index), accent: false });
    }
    parts.push({ text: match[1], accent: true });
    cursor = match.index + match[0].length;
  }

  if (cursor < line.length) {
    parts.push({ text: line.slice(cursor), accent: false });
  }

  // A blank line still occupies a rendered line, so it must not collapse away.
  return parts.length > 0 ? parts : [{ text: '', accent: false }];
}

/** Parses an authored heading into lines of parts, ready to render. */
export function parseHeading(heading: string): HeadingLine[] {
  return toLines(heading).map(parseLine);
}

/**
 * The heading with all markers removed - for list views, page titles, and
 * anywhere the accent and the line breaks are noise rather than meaning.
 */
export function plainHeading(heading: string): string {
  return toLines(heading)
    .map((line) =>
      parseLine(line)
        .map((part) => part.text)
        .join(''),
    )
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Reports whether every accent marker in the heading is closed.
 *
 * Without this check `Ready to **Scale` saves cleanly and then renders with a
 * literal `**` on the live site - a typo the author cannot see in the form.
 */
export function hasBalancedAccentMarkers(heading: string): boolean {
  const withoutAccents = heading.replace(ACCENT_PATTERN, '');
  return !withoutAccents.includes(ACCENT_MARKER);
}
