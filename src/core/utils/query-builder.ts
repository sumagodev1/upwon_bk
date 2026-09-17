export type SortOrder = 'asc' | 'desc';

export interface FilterCondition {
  /** A whitelisted, fully-qualified column expression - NEVER user input. */
  column: string;
  operator: '=' | '<>' | '>' | '>=' | '<' | '<=' | 'ILIKE' | 'IN' | 'IS NULL' | 'IS NOT NULL';
  value?: unknown;
}

/**
 * Accumulates parameterized fragments and keeps $n numbering correct across
 * a WHERE clause that is assembled conditionally.
 *
 * Every VALUE goes through the parameter list. Only developer-authored text
 * ever reaches the SQL string; a client-supplied string can never become an
 * identifier or an operator.
 */
export class SqlBuilder {
  private readonly conditions: string[] = [];
  private readonly values: unknown[] = [];

  where(condition: FilterCondition): this {
    const { column, operator, value } = condition;

    if (operator === 'IS NULL' || operator === 'IS NOT NULL') {
      this.conditions.push(`${column} ${operator}`);
      return this;
    }

    if (operator === 'IN') {
      const list = Array.isArray(value) ? value : [value];
      if (list.length === 0) {
        // IN () is a syntax error; an empty set matches nothing.
        this.conditions.push('FALSE');
        return this;
      }
      const placeholders: string[] = [];
      for (const item of list) {
        this.values.push(item);
        placeholders.push(`$${this.values.length}`);
      }
      this.conditions.push(`${column} IN (${placeholders.join(', ')})`);
      return this;
    }

    this.values.push(value);
    this.conditions.push(`${column} ${operator} $${this.values.length}`);
    return this;
  }

  whereIf(shouldApply: unknown, condition: FilterCondition): this {
    if (shouldApply !== undefined && shouldApply !== null && shouldApply !== '') {
      this.where(condition);
    }
    return this;
  }

  /**
   * Adds a developer-authored fragment. Each '?' is replaced with the next
   * positional parameter, so values stay parameterized.
   */
  raw(fragment: string, ...values: unknown[]): this {
    let rendered = fragment;
    for (const value of values) {
      this.values.push(value);
      rendered = rendered.replace('?', `$${this.values.length}`);
    }
    this.conditions.push(rendered);
    return this;
  }

  buildWhere(): string {
    return this.conditions.length ? `WHERE ${this.conditions.join(' AND ')}` : '';
  }

  getValues(): unknown[] {
    return [...this.values];
  }

  /** Appends LIMIT/OFFSET as parameters and returns the clause. */
  buildLimitOffset(limit: number, offset: number): string {
    this.values.push(limit, offset);
    return `LIMIT $${this.values.length - 1} OFFSET $${this.values.length}`;
  }
}

/**
 * Resolves a client-supplied sort field against a whitelist.
 *
 * Anything unrecognised silently falls back to the default - a 400 here would
 * only tell an attacker which columns exist.
 */
export function resolveSort(
  requestedField: string | undefined,
  requestedOrder: string | undefined,
  whitelist: Readonly<Record<string, string>>,
  defaults: { field: string; order: SortOrder },
): { column: string; order: 'ASC' | 'DESC' } {
  const column =
    (requestedField && whitelist[requestedField]) ?? whitelist[defaults.field] ?? 'id';

  const order = requestedOrder
    ? requestedOrder.toLowerCase() === 'asc'
      ? 'ASC'
      : 'DESC'
    : (defaults.order.toUpperCase() as 'ASC' | 'DESC');

  return { column, order };
}

/**
 * Builds a dynamic SET clause from a whitelist of updatable columns.
 * Returns null when nothing was provided, so the caller can skip the write.
 */
export function buildUpdateSet<T extends object>(
  patch: T,
  columnMap: Readonly<Record<string, string>>,
  startIndex = 1,
): { clause: string; values: unknown[] } | null {
  const assignments: string[] = [];
  const values: unknown[] = [];

  for (const [key, column] of Object.entries(columnMap)) {
    const value = (patch as Record<string, unknown>)[key];
    if (value === undefined) continue;
    values.push(value);
    assignments.push(`${column} = $${startIndex + values.length - 1}`);
  }

  if (assignments.length === 0) return null;
  return { clause: assignments.join(', '), values };
}
