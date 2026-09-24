import type { ValueTransformer } from 'typeorm';

/**
 * pg returns BIGINT columns as strings, since they can exceed 2^53. Token
 * balances (DDR-024) never come near that, so convert back to a number.
 */
export const bigintTransformer: ValueTransformer = {
  to: (value?: number | null) => value,
  from: (value?: string | null) =>
    value === null || value === undefined ? value : Number(value),
};
