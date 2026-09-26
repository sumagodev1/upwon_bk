// src/modules/blog/validators/shared.ts

import { Validator } from '../../../core/utils/validation';
import { hasBalancedAccentMarkers, parseHeading } from '../../home-page/utils/heading-markup';
import {
  BlogBodyBlock,
  BlogBodyBlockType,
} from '../types/posts.types';
import { BLOG_CATEGORY_ICON_NAMES, isBlogCategoryIconName } from '../utils/icons';

/**
 * The checks more than one Blog validator needs, in one place so the wording
 * an admin sees is identical wherever the same mistake is made.
 *
 * Every number below is also a column size in 049_blog.sql and a counter in
 * the admin panel's forms. Changing one means changing all three.
 */

// ── the two copy blocks ───────────────────────────────────────────────────

/*
 * Tighter than the About page's section limits (120 / 300 / 600), because
 * these are sized to the blocks they fill: the eyebrow is one small-caps line,
 * the hero headline has to sit inside a 440px-tall slide on a phone, and the
 * subtext is a single sentence under it. Today's copy uses about a third of
 * each.
 */
export const EYEBROW_MIN = 2;
export const EYEBROW_MAX = 60;
export const HEADING_MIN = 3;
export const HEADING_MAX = 160;
export const SUBTEXT_MIN = 3;
export const SUBTEXT_MAX = 300;

/**
 * A button's text: 'Request a Demo', 'Browse the Knowledgebase'. Only the text
 * - the hero's buttons link where the site's code sends them.
 */
export const CTA_LABEL_MIN = 2;
export const CTA_LABEL_MAX = 40;

/**
 * The same markup check, and the same message, as the home hero heading - plus
 * the one rule this heading adds: at most ONE accent span. The site renders
 * the topics headline as "plain words, then the orange phrase"; a second
 * accent would be drawn, but it is not a layout the section has ever had, and
 * the admin panel's preview is written against one.
 */
export function validateAccentHeading(v: Validator, field: string, value: string): void {
  if (!value) return;

  const balanced = hasBalancedAccentMarkers(value);
  v.custom(
    balanced,
    field,
    `${field} has an unclosed ** accent marker; wrap accented words as **like this**`,
    'UNBALANCED_ACCENT_MARKER',
  );
  if (!balanced) return;

  const accents = parseHeading(value)
    .flat()
    .filter((part) => part.accent).length;
  v.custom(
    accents <= 1,
    field,
    `${field} may contain at most one **accent** span`,
    'TOO_MANY_ACCENTS',
  );
}

// ── categories ────────────────────────────────────────────────────────────

/**
 * The chip's icon, from the allowlist in utils/icons.ts.
 *
 * `required` is the create/update split: on create the icon must be there, on
 * update an absent one means "leave it alone" and comes back undefined.
 */
export function readBlogCategoryIcon(v: Validator, required: boolean): string | undefined {
  if (!required && !v.has('icon')) return undefined;

  const raw = v.requiredString('icon', { min: 1, max: 60 });
  if (raw) {
    v.custom(
      isBlogCategoryIconName(raw),
      'icon',
      `icon must be one of the available icons: ${BLOG_CATEGORY_ICON_NAMES.join(', ')}`,
      'UNKNOWN_ICON',
    );
  }
  return raw;
}

// ── plain text inside a nested value ──────────────────────────────────────

/**
 * Reads a top-level key the Validator's own methods cannot reach into.
 *
 * The body blocks are a nested structure, which the Validator's field
 * readers do not walk. Their values are read here and checked by checkText
 * below, with every failure still accumulated on the one
 * Validator - so a save with a bad block AND a missing title reports both at
 * once, like every other form in the panel.
 */
export const rawField = (body: unknown, field: string): unknown =>
  body && typeof body === 'object' && !Array.isArray(body)
    ? (body as Record<string, unknown>)[field]
    : undefined;

/**
 * C0 control characters, less tab, newline and carriage return - the same set
 * Validator.requiredString refuses, for the same reason: PostgreSQL cannot
 * store NUL, and a value that passes here must insert.
 */
const CONTROL_CHARACTERS = /[\x00-\x08\x0B\x0C\x0E-\x1F]/;

const isBlank = (value: unknown): boolean =>
  value === undefined || value === null || (typeof value === 'string' && value.trim() === '');

/**
 * One nested string, trimmed and checked against its cap.
 *
 * `field` is the key the error is reported under and `label` is how the
 * message names the value - they differ for body blocks, which all report
 * under `body` so the panel can put the error beside the block editor, while
 * the message says which block and which part ('body[3].items[1] ...').
 *
 * Returns null when the value is blank (reporting REQUIRED if it had to be
 * there) or unusable.
 */
function checkText(
  v: Validator,
  field: string,
  label: string,
  value: unknown,
  opts: { max: number; required: boolean },
): string | null {
  if (isBlank(value)) {
    v.custom(!opts.required, field, `${label} is required`, 'REQUIRED');
    return null;
  }
  if (typeof value !== 'string') {
    v.custom(false, field, `${label} must be a string`, 'INVALID_TYPE');
    return null;
  }

  const trimmed = value.trim();
  v.custom(
    !CONTROL_CHARACTERS.test(trimmed),
    field,
    `${label} contains characters that are not allowed`,
    'INVALID_CHARACTERS',
  );
  v.custom(
    trimmed.length <= opts.max,
    field,
    `${label} must be at most ${opts.max} characters`,
    'TOO_LONG',
  );
  return trimmed;
}

// ── the article body ──────────────────────────────────────────────────────

/**
 * The body's limits. The longest seeded article is eight blocks, its longest
 * paragraph about 300 characters and its longest list five bullets; these
 * leave ample room while keeping one post's JSONB a sane size.
 */
export const BODY_MIN_BLOCKS = 1;
export const BODY_MAX_BLOCKS = 80;
export const PARAGRAPH_MAX = 4000;
export const SUBHEADING_MAX = 200;
export const LIST_MIN_ITEMS = 1;
export const LIST_MAX_ITEMS = 20;
export const LIST_ITEM_MAX = 500;
export const QUOTE_MAX = 1000;
export const CITE_MAX = 160;

export const BODY_BLOCK_TYPES: readonly BlogBodyBlockType[] = ['p', 'h2', 'ul', 'quote'];

const isBlockType = (value: unknown): value is BlogBodyBlockType =>
  typeof value === 'string' && (BODY_BLOCK_TYPES as readonly string[]).includes(value);

/** The bullets of one list block. Blank rows are dropped, as textList does. */
function readListItems(v: Validator, label: string, raw: unknown): string[] | null {
  if (!Array.isArray(raw)) {
    v.custom(false, 'body', `${label}.items must be an array of strings`, 'INVALID_TYPE');
    return null;
  }

  // The trailing empty row a list editor leaves behind is not a bullet.
  const kept = raw
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => !isBlank(item));

  if (kept.length < LIST_MIN_ITEMS) {
    v.custom(false, 'body', `${label} must contain at least one bullet`, 'REQUIRED');
    return null;
  }
  if (kept.length > LIST_MAX_ITEMS) {
    v.custom(
      false,
      'body',
      `${label} may contain at most ${LIST_MAX_ITEMS} bullets`,
      'TOO_MANY',
    );
    return null;
  }

  const items: string[] = [];
  for (const { item, index } of kept) {
    const text = checkText(v, 'body', `${label}.items[${index}]`, item, {
      max: LIST_ITEM_MAX,
      required: true,
    });
    if (text !== null) items.push(text);
  }
  return items.length === kept.length ? items : null;
}

/**
 * One block, normalised to exactly its shape: unknown keys are dropped, text is
 * trimmed, and a blank cite becomes null. Null when the block is unusable - the
 * reason has already been reported.
 */
function readBlock(v: Validator, raw: unknown, index: number): BlogBodyBlock | null {
  const label = `body[${index}]`;

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    v.custom(false, 'body', `${label} must be an object with a type`, 'INVALID_BLOCK');
    return null;
  }

  const block = raw as Record<string, unknown>;
  if (!isBlockType(block.type)) {
    v.custom(
      false,
      'body',
      `${label}.type must be one of: ${BODY_BLOCK_TYPES.join(', ')}`,
      'INVALID_BLOCK_TYPE',
    );
    return null;
  }

  switch (block.type) {
    case 'p': {
      const text = checkText(v, 'body', `${label}.text`, block.text, {
        max: PARAGRAPH_MAX,
        required: true,
      });
      return text === null ? null : { type: 'p', text };
    }
    case 'h2': {
      const text = checkText(v, 'body', `${label}.text`, block.text, {
        max: SUBHEADING_MAX,
        required: true,
      });
      return text === null ? null : { type: 'h2', text };
    }
    case 'ul': {
      const items = readListItems(v, label, block.items);
      return items === null ? null : { type: 'ul', items };
    }
    case 'quote': {
      const text = checkText(v, 'body', `${label}.text`, block.text, {
        max: QUOTE_MAX,
        required: true,
      });
      const cite = checkText(v, 'body', `${label}.cite`, block.cite, {
        max: CITE_MAX,
        required: false,
      });
      return text === null ? null : { type: 'quote', text, cite };
    }
    default:
      return null;
  }
}

/**
 * The whole article. A post is a page of its own at /blog/<slug>, so an empty
 * body publishes an empty page - one block is the floor, on create and on any
 * update that carries a body. Every problem is reported under `body`, with the
 * block's index in the message.
 */
export function readBodyBlocks(v: Validator, raw: unknown): BlogBodyBlock[] {
  if (raw === undefined || raw === null) {
    v.custom(false, 'body', 'body must contain at least one block', 'REQUIRED');
    return [];
  }
  if (!Array.isArray(raw)) {
    v.custom(false, 'body', 'body must be an array of blocks', 'INVALID_TYPE');
    return [];
  }
  if (raw.length < BODY_MIN_BLOCKS) {
    v.custom(false, 'body', 'body must contain at least one block', 'REQUIRED');
    return [];
  }
  if (raw.length > BODY_MAX_BLOCKS) {
    v.custom(
      false,
      'body',
      `body may contain at most ${BODY_MAX_BLOCKS} blocks`,
      'TOO_MANY',
    );
    return [];
  }

  const blocks: BlogBodyBlock[] = [];
  raw.forEach((entry, index) => {
    const block = readBlock(v, entry, index);
    if (block) blocks.push(block);
  });
  return blocks;
}
