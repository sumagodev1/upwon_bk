import { PaginationParams } from '../types/common.types';

export const PAGINATION_DEFAULTS = {
  page: 1,
  limit: 20,
  maxLimit: 100,
  maxOffset: 100_000, // deep-paging guard: OFFSET 5_000_000 is a table scan
} as const;

export function parsePagination(query: Record<string, unknown>): PaginationParams {
  const rawPage = Number(query.page);
  const rawLimit = Number(query.limit);

  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : PAGINATION_DEFAULTS.page;
  const limit =
    Number.isInteger(rawLimit) && rawLimit > 0
      ? Math.min(rawLimit, PAGINATION_DEFAULTS.maxLimit)
      : PAGINATION_DEFAULTS.limit;

  const offset = Math.min((page - 1) * limit, PAGINATION_DEFAULTS.maxOffset);

  const search =
    typeof query.search === 'string' && query.search.trim() !== ''
      ? query.search.trim().slice(0, 120)
      : undefined;

  const sortOrder =
    query.sortOrder === 'asc' ? 'asc' : query.sortOrder === 'desc' ? 'desc' : undefined;

  return {
    page,
    limit,
    offset,
    // Resolved against a whitelist in the repository - never used as SQL here.
    sortBy: typeof query.sortBy === 'string' ? query.sortBy : undefined,
    sortOrder,
    search,
  };
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export function buildPaginationMeta(
  total: number,
  { page, limit }: PaginationParams,
): PaginationMeta {
  const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}
