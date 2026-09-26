import { FieldError } from '../errors/AppError';
import { ValidationError } from '../errors/ValidationError';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const PHONE_PATTERN = /^\+?[0-9\s\-().]{7,20}$/;

/**
 * C0 control characters, less tab, newline and carriage return.
 *
 * A validator's contract here is "anything that gets past me will insert".
 * NUL broke that: it is not whitespace, so it is not blank and it costs one
 * character against a max, and PostgreSQL cannot store it in a text or varchar
 * value at all - so a body carrying "Acme\0Ltd" passed every check and
 * then failed on the bind, which the caller reads as a 500 INTERNAL_ERROR
 * naming no field instead of a 422 naming the one that is wrong. On the public
 * enquiry route that is an anonymous caller turning a validation mistake into
 * an error-level log line with a stack.
 *
 * Tab, newline and carriage return are allowed through: a message field keeps
 * its paragraphs. Nothing a person types produces the rest.
 */
const CONTROL_CHARACTERS = /[\x00-\x08\x0B\x0C\x0E-\x1F]/;

export class Validator {
  private readonly errors: FieldError[] = [];
  private readonly source: Record<string, unknown>;

  constructor(source: unknown) {
    this.source =
      source && typeof source === 'object' && !Array.isArray(source)
        ? (source as Record<string, unknown>)
        : {};
  }

  private fail(field: string, message: string, code: string): void {
    this.errors.push({ field, message, code });
  }

  private raw(field: string): unknown {
    return this.source[field];
  }

  private isBlank(value: unknown): boolean {
    return (
      value === undefined ||
      value === null ||
      (typeof value === 'string' && value.trim() === '')
    );
  }

  has(field: string): boolean {
    return this.source[field] !== undefined;
  }

  // ── strings ────────────────────────────────────────────────────────────
  requiredString(field: string, opts: { min?: number; max?: number } = {}): string {
    const value = this.raw(field);
    if (this.isBlank(value)) {
      this.fail(field, `${field} is required`, 'REQUIRED');
      return '';
    }
    if (typeof value !== 'string') {
      this.fail(field, `${field} must be a string`, 'INVALID_TYPE');
      return '';
    }
    const trimmed = value.trim();
    if (CONTROL_CHARACTERS.test(trimmed)) {
      this.fail(
        field,
        `${field} contains characters that are not allowed`,
        'INVALID_CHARACTERS',
      );
    }
    if (opts.min !== undefined && trimmed.length < opts.min) {
      this.fail(field, `${field} must be at least ${opts.min} characters`, 'TOO_SHORT');
    }
    if (opts.max !== undefined && trimmed.length > opts.max) {
      this.fail(field, `${field} must be at most ${opts.max} characters`, 'TOO_LONG');
    }
    return trimmed;
  }

  optionalString(
    field: string,
    opts: { min?: number; max?: number } = {},
  ): string | undefined {
    const value = this.raw(field);
    if (value === undefined || value === null) return undefined;
    return this.requiredString(field, opts);
  }

  /**
   * For nullable columns an edit form clears by emptying the input.
   *
   * Three outcomes, where optionalString has two: absent is undefined (leave the
   * value alone), null or blank is null (clear it), anything else is validated
   * as a string. Without this an emptied input fails as "required" on a field
   * that is not.
   */
  nullableString(
    field: string,
    opts: { min?: number; max?: number } = {},
  ): string | null | undefined {
    const value = this.raw(field);
    if (value === undefined) return undefined;
    if (this.isBlank(value)) return null;
    return this.requiredString(field, opts);
  }

  // ── email ──────────────────────────────────────────────────────────────
  requiredEmail(field = 'email'): string {
    const value = this.requiredString(field, { max: 254 });
    if (value && !EMAIL_PATTERN.test(value)) {
      this.fail(field, `${field} must be a valid email address`, 'INVALID_EMAIL');
    }
    return value.toLowerCase();
  }

  optionalEmail(field = 'email'): string | undefined {
    if (this.raw(field) === undefined || this.raw(field) === null) return undefined;
    return this.requiredEmail(field);
  }

  // ── password ───────────────────────────────────────────────────────────
  /**
   * Policy: 12+ chars, one uppercase, one lowercase, one digit, one symbol.
   * Length is weighted more heavily than composition because it contributes
   * far more entropy; the composition rules exist to satisfy common policy
   * requirements, not because they add much security.
   */
  password(field = 'password'): string {
    const value = this.raw(field);
    if (this.isBlank(value) || typeof value !== 'string') {
      this.fail(field, `${field} is required`, 'REQUIRED');
      return '';
    }
    const problems: string[] = [];
    if (value.length < 12) problems.push('be at least 12 characters');
    if (value.length > 128) problems.push('be at most 128 characters');
    if (!/[A-Z]/.test(value)) problems.push('contain an uppercase letter');
    if (!/[a-z]/.test(value)) problems.push('contain a lowercase letter');
    if (!/[0-9]/.test(value)) problems.push('contain a digit');
    if (!/[^A-Za-z0-9]/.test(value)) problems.push('contain a special character');

    if (problems.length > 0) {
      this.fail(field, `Password must ${problems.join(', ')}`, 'WEAK_PASSWORD');
    }
    return value; // never trimmed - leading/trailing spaces are legitimate
  }

  // ── uuid ───────────────────────────────────────────────────────────────
  requiredUuid(field: string): string {
    const value = this.raw(field);
    if (this.isBlank(value)) {
      this.fail(field, `${field} is required`, 'REQUIRED');
      return '';
    }
    if (typeof value !== 'string' || !UUID_PATTERN.test(value)) {
      this.fail(field, `${field} must be a valid UUID`, 'INVALID_UUID');
      return '';
    }
    return value;
  }

  optionalUuid(field: string): string | undefined {
    if (this.raw(field) === undefined || this.raw(field) === null) return undefined;
    return this.requiredUuid(field);
  }

  uuidArray(field: string, opts: { max?: number } = {}): string[] {
    const value = this.raw(field);
    if (value === undefined || value === null) return [];
    if (!Array.isArray(value)) {
      this.fail(field, `${field} must be an array`, 'INVALID_TYPE');
      return [];
    }
    if (opts.max !== undefined && value.length > opts.max) {
      this.fail(field, `${field} may contain at most ${opts.max} items`, 'TOO_MANY');
      return [];
    }
    const invalid = value.filter((v) => typeof v !== 'string' || !UUID_PATTERN.test(v));
    if (invalid.length > 0) {
      this.fail(field, `${field} contains invalid UUIDs`, 'INVALID_UUID');
      return [];
    }
    // Dedupe: repeated grants are meaningless and would violate the composite PK.
    return [...new Set(value as string[])];
  }

  stringArray(field: string, opts: { max?: number; maxLength?: number } = {}): string[] {
    const value = this.raw(field);
    if (value === undefined || value === null) return [];
    if (!Array.isArray(value)) {
      this.fail(field, `${field} must be an array`, 'INVALID_TYPE');
      return [];
    }
    if (opts.max !== undefined && value.length > opts.max) {
      this.fail(field, `${field} may contain at most ${opts.max} items`, 'TOO_MANY');
      return [];
    }
    const invalid = value.filter(
      (v) => typeof v !== 'string' || (opts.maxLength !== undefined && v.length > opts.maxLength),
    );
    if (invalid.length > 0) {
      this.fail(field, `${field} contains invalid values`, 'INVALID_TYPE');
      return [];
    }
    return [...new Set(value as string[])];
  }

  /**
   * An ordered list of copy - paragraphs, bullet points.
   *
   * Unlike stringArray this keeps order and duplicates, because in copy both
   * carry meaning. Entries are trimmed and blank ones dropped, so the trailing
   * empty row an editor leaves behind never saves as an empty paragraph.
   */
  textList(field: string, opts: { max?: number; maxLength?: number } = {}): string[] {
    const value = this.raw(field);
    if (value === undefined || value === null) return [];
    if (!Array.isArray(value)) {
      this.fail(field, `${field} must be an array of strings`, 'INVALID_TYPE');
      return [];
    }
    if (value.some((entry) => typeof entry !== 'string')) {
      this.fail(field, `${field} must contain only strings`, 'INVALID_TYPE');
      return [];
    }

    const entries = (value as string[]).map((entry) => entry.trim()).filter(Boolean);
    const { max, maxLength } = opts;

    if (max !== undefined && entries.length > max) {
      this.fail(field, `${field} may contain at most ${max} items`, 'TOO_MANY');
    }
    if (maxLength !== undefined && entries.some((entry) => entry.length > maxLength)) {
      this.fail(field, `Each ${field} entry must be at most ${maxLength} characters`, 'TOO_LONG');
    }
    return entries;
  }

  // ── enums ──────────────────────────────────────────────────────────────
  requiredEnum<T extends string>(field: string, allowed: readonly T[]): T {
    const value = this.raw(field);
    if (this.isBlank(value)) {
      this.fail(field, `${field} is required`, 'REQUIRED');
      return allowed[0];
    }
    if (typeof value !== 'string' || !allowed.includes(value as T)) {
      this.fail(field, `${field} must be one of: ${allowed.join(', ')}`, 'INVALID_ENUM');
      return allowed[0];
    }
    return value as T;
  }

  optionalEnum<T extends string>(field: string, allowed: readonly T[]): T | undefined {
    if (this.raw(field) === undefined || this.raw(field) === null) return undefined;
    return this.requiredEnum(field, allowed);
  }

  // ── numbers ────────────────────────────────────────────────────────────
  requiredNumber(
    field: string,
    opts: { min?: number; max?: number; integer?: boolean } = {},
  ): number {
    const value = this.raw(field);
    if (this.isBlank(value)) {
      this.fail(field, `${field} is required`, 'REQUIRED');
      return 0;
    }
    const parsed = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(parsed)) {
      this.fail(field, `${field} must be a number`, 'INVALID_NUMBER');
      return 0;
    }
    if (opts.integer && !Number.isInteger(parsed)) {
      this.fail(field, `${field} must be an integer`, 'INVALID_INTEGER');
    }
    if (opts.min !== undefined && parsed < opts.min) {
      this.fail(field, `${field} must be at least ${opts.min}`, 'TOO_SMALL');
    }
    if (opts.max !== undefined && parsed > opts.max) {
      this.fail(field, `${field} must be at most ${opts.max}`, 'TOO_LARGE');
    }
    return parsed;
  }

  optionalNumber(
    field: string,
    opts: { min?: number; max?: number; integer?: boolean } = {},
  ): number | undefined {
    if (this.raw(field) === undefined || this.raw(field) === null) return undefined;
    return this.requiredNumber(field, opts);
  }

  /** Money: validated as a decimal string, never converted to a float. */
  requiredDecimal(field: string, opts: { min?: number; scale?: number } = {}): string {
    const value = this.raw(field);
    if (this.isBlank(value)) {
      this.fail(field, `${field} is required`, 'REQUIRED');
      return '0';
    }
    const asString = String(value).trim();
    const scale = opts.scale ?? 2;
    if (!new RegExp(`^-?\\d{1,10}(\\.\\d{1,${scale}})?$`).test(asString)) {
      this.fail(
        field,
        `${field} must be a decimal with at most ${scale} decimal places`,
        'INVALID_DECIMAL',
      );
      return '0';
    }
    if (opts.min !== undefined && Number(asString) < opts.min) {
      this.fail(field, `${field} must be at least ${opts.min}`, 'TOO_SMALL');
    }
    return asString;
  }

  optionalDecimal(field: string, opts: { min?: number; scale?: number } = {}): string | undefined {
    if (this.raw(field) === undefined || this.raw(field) === null) return undefined;
    return this.requiredDecimal(field, opts);
  }

  // ── dates ──────────────────────────────────────────────────────────────
  requiredDate(field: string): Date {
    const value = this.raw(field);
    if (this.isBlank(value)) {
      this.fail(field, `${field} is required`, 'REQUIRED');
      return new Date(0);
    }
    const parsed = new Date(value as string);
    if (Number.isNaN(parsed.getTime())) {
      this.fail(field, `${field} must be a valid ISO 8601 date`, 'INVALID_DATE');
      return new Date(0);
    }
    return parsed;
  }

  optionalDate(field: string): Date | undefined {
    if (this.raw(field) === undefined || this.raw(field) === null) return undefined;
    return this.requiredDate(field);
  }

  // ── misc ───────────────────────────────────────────────────────────────
  optionalBoolean(field: string): boolean | undefined {
    const value = this.raw(field);
    if (value === undefined || value === null) return undefined;
    if (typeof value === 'boolean') return value;
    if (value === 'true') return true;
    if (value === 'false') return false;
    this.fail(field, `${field} must be a boolean`, 'INVALID_BOOLEAN');
    return undefined;
  }

  slug(field = 'slug'): string {
    const value = this.requiredString(field, { min: 2, max: 100 });
    if (value && !SLUG_PATTERN.test(value)) {
      this.fail(
        field,
        `${field} must be lowercase alphanumeric words separated by hyphens`,
        'INVALID_SLUG',
      );
    }
    return value;
  }

  optionalPhone(field = 'phone'): string | undefined {
    const value = this.optionalString(field, { max: 30 });
    if (value && !PHONE_PATTERN.test(value)) {
      this.fail(field, `${field} must be a valid phone number`, 'INVALID_PHONE');
    }
    return value;
  }

  jsonObject(field: string): Record<string, unknown> {
    const value = this.raw(field);
    if (value === undefined || value === null) return {};
    if (typeof value !== 'object' || Array.isArray(value)) {
      this.fail(field, `${field} must be an object`, 'INVALID_TYPE');
      return {};
    }
    return value as Record<string, unknown>;
  }

  /** Ensures a PATCH body is not empty - otherwise it is a no-op write plus an audit entry. */
  requireAtLeastOne(fields: string[]): void {
    const provided = fields.filter((f) => this.raw(f) !== undefined);
    if (provided.length === 0) {
      this.fail('body', `Provide at least one of: ${fields.join(', ')}`, 'EMPTY_UPDATE');
    }
  }

  custom(condition: boolean, field: string, message: string, code = 'INVALID'): void {
    if (!condition) this.fail(field, message, code);
  }

  /** Throws with every accumulated failure, or returns cleanly. */
  assert(): void {
    if (this.errors.length > 0) {
      throw new ValidationError('Validation failed', this.errors);
    }
  }
}

export function validator(source: unknown): Validator {
  return new Validator(source);
}

/** Convenience for the common "validate one route param" case. */
export function validateUuidParam(value: unknown, field = 'id'): string {
  const v = validator({ [field]: value });
  const id = v.requiredUuid(field);
  v.assert();
  return id;
}

/** Derives a URL-safe slug from a display name. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}
