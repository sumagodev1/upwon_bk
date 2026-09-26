// src/modules/knowledgebase/validators/shared.ts

import { Validator } from '../../../core/utils/validation';
import { KbFaq } from '../types/articles.types';
import { isKbCategoryIconName, KB_CATEGORY_ICON_NAMES } from '../utils/icons';

/**
 * The checks more than one Knowledgebase validator needs, and the readers for
 * the parts of an article the Validator's field methods cannot walk.
 *
 * The article body is not here: it is the blog post's body, read by the blog's
 * own readBodyBlocks (blog/validators/shared.ts), so the two are held to the
 * same limits with the same wording.
 *
 * Every number below is also a column size or CHECK in 052_knowledgebase.sql
 * and a counter in the admin panel's forms. Changing one means changing all
 * three.
 */

// ── categories ────────────────────────────────────────────────────────────

/**
 * The card's icon, from the allowlist in utils/icons.ts.
 *
 * `required` is the create/update split: on create the icon must be there, on
 * update an absent one means "leave it alone" and comes back undefined.
 */
export function readKbCategoryIcon(v: Validator, required: boolean): string | undefined {
  if (!required && !v.has('icon')) return undefined;

  const raw = v.requiredString('icon', { min: 1, max: 60 });
  if (raw) {
    v.custom(
      isKbCategoryIconName(raw),
      'icon',
      `icon must be one of the available icons: ${KB_CATEGORY_ICON_NAMES.join(', ')}`,
      'UNKNOWN_ICON',
    );
  }
  return raw;
}

// ── the "Updated" date ────────────────────────────────────────────────────

/** 'YYYY-MM-DD' and nothing else - no time, no zone, no other order. */
const DATE_SHAPE = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * The article's "Updated" date: a calendar date, exactly as the card prints
 * it.
 *
 * Read as text and checked by hand rather than with requiredDate, for the
 * blog's publish date's reasons: a timestamp string is a different day
 * depending on where it is read, and '2026-02-30' would roll over into March.
 * Only a real YYYY-MM-DD is taken, and it is stored and returned as the same
 * ten characters.
 */
export function readUpdatedOn(v: Validator): string {
  const value = v.requiredString('updatedOn', { max: 10 });
  if (!value) return value;

  const match = DATE_SHAPE.exec(value);
  let valid = false;
  if (match) {
    const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
    const date = new Date(Date.UTC(year, month - 1, day));
    valid =
      year >= 1900 &&
      year <= 9999 &&
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day;
  }

  v.custom(valid, 'updatedOn', 'updatedOn must be a real date as YYYY-MM-DD', 'INVALID_DATE');
  return value;
}

// ── the FAQs ──────────────────────────────────────────────────────────────

/**
 * The FAQ limits. The seeded articles carry two each, their longest answer
 * about 270 characters; these leave room for a real FAQ section while keeping
 * the accordion something a reader scans rather than scrolls.
 */
export const FAQ_MAX_ENTRIES = 20;
export const FAQ_QUESTION_MIN = 3;
export const FAQ_QUESTION_MAX = 300;
export const FAQ_ANSWER_MIN = 3;
export const FAQ_ANSWER_MAX = 2000;

/**
 * C0 control characters, less tab, newline and carriage return - the same set
 * Validator.requiredString refuses, for the same reason: PostgreSQL cannot
 * store NUL, and a value that passes here must insert.
 */
const CONTROL_CHARACTERS = /[\x00-\x08\x0B\x0C\x0E-\x1F]/;

const isBlank = (value: unknown): boolean =>
  value === undefined || value === null || (typeof value === 'string' && value.trim() === '');

/**
 * One side of one FAQ, trimmed and held to its limits. Every failure is
 * reported under `faqs`, so the panel can put it beside the FAQ editor, with
 * the entry's index in the message ('faqs[1].answer ...'). Null when unusable -
 * the reason has already been reported.
 */
function readFaqText(
  v: Validator,
  label: string,
  value: unknown,
  opts: { min: number; max: number },
): string | null {
  if (isBlank(value)) {
    v.custom(false, 'faqs', `${label} is required`, 'REQUIRED');
    return null;
  }
  if (typeof value !== 'string') {
    v.custom(false, 'faqs', `${label} must be a string`, 'INVALID_TYPE');
    return null;
  }

  const trimmed = value.trim();
  const clean = !CONTROL_CHARACTERS.test(trimmed);
  v.custom(
    clean,
    'faqs',
    `${label} contains characters that are not allowed`,
    'INVALID_CHARACTERS',
  );
  v.custom(
    trimmed.length >= opts.min,
    'faqs',
    `${label} must be at least ${opts.min} characters`,
    'TOO_SHORT',
  );
  v.custom(
    trimmed.length <= opts.max,
    'faqs',
    `${label} must be at most ${opts.max} characters`,
    'TOO_LONG',
  );
  return clean && trimmed.length >= opts.min && trimmed.length <= opts.max ? trimmed : null;
}

/**
 * The article's FAQs, normalised to exactly { question, answer }: unknown keys
 * are dropped and both sides trimmed. Zero entries is a valid answer - the
 * site then draws no "Frequently asked" block.
 *
 * `raw` is undefined when the key was absent. The caller decides what that
 * means: an empty list on create, "leave it alone" on update (which then never
 * calls this). null is read as "no FAQs", the way a cleared list editor may
 * send it.
 *
 * A row left completely blank - the empty row a repeatable editor leaves
 * behind - is not an entry and is dropped, as the body's list reader drops a
 * blank bullet. A row with only one side filled in is an error: half an FAQ is
 * a question with no answer on the live page.
 */
export function readFaqs(v: Validator, raw: unknown): KbFaq[] {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw)) {
    v.custom(false, 'faqs', 'faqs must be an array of { question, answer }', 'INVALID_TYPE');
    return [];
  }

  const kept = raw
    .map((entry, index) => ({ entry, index }))
    .filter(({ entry }) => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return true;
      const row = entry as Record<string, unknown>;
      return !(isBlank(row.question) && isBlank(row.answer));
    });

  if (kept.length > FAQ_MAX_ENTRIES) {
    v.custom(false, 'faqs', `faqs may contain at most ${FAQ_MAX_ENTRIES} entries`, 'TOO_MANY');
    return [];
  }

  const faqs: KbFaq[] = [];
  for (const { entry, index } of kept) {
    const label = `faqs[${index}]`;
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      v.custom(
        false,
        'faqs',
        `${label} must be an object with a question and an answer`,
        'INVALID_FAQ',
      );
      continue;
    }

    const row = entry as Record<string, unknown>;
    const question = readFaqText(v, `${label}.question`, row.question, {
      min: FAQ_QUESTION_MIN,
      max: FAQ_QUESTION_MAX,
    });
    const answer = readFaqText(v, `${label}.answer`, row.answer, {
      min: FAQ_ANSWER_MIN,
      max: FAQ_ANSWER_MAX,
    });
    if (question !== null && answer !== null) faqs.push({ question, answer });
  }
  return faqs;
}
