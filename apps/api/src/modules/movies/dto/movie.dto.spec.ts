import { plainToInstance } from 'class-transformer';

import { MovieListQueryDto } from './movie.dto';

// Matches the ValidationPipe's transformOptions in app.module.ts. A plain
// `enableImplicitConversion` boolean coercion does `Boolean(value)`, which is
// true for the non-empty string "false" too — isComingSoon's @Transform must
// read the raw value to avoid that trap.
const TRANSFORM_OPTIONS = { enableImplicitConversion: true };

describe('MovieListQueryDto', () => {
  describe('isComingSoon', () => {
    it('parses the query string "false" as boolean false', () => {
      const dto = plainToInstance(
        MovieListQueryDto,
        { isComingSoon: 'false' },
        TRANSFORM_OPTIONS,
      );

      expect(dto.isComingSoon).toBe(false);
    });

    it('parses the query string "true" as boolean true', () => {
      const dto = plainToInstance(
        MovieListQueryDto,
        { isComingSoon: 'true' },
        TRANSFORM_OPTIONS,
      );

      expect(dto.isComingSoon).toBe(true);
    });

    it('leaves isComingSoon undefined when omitted', () => {
      const dto = plainToInstance(MovieListQueryDto, {}, TRANSFORM_OPTIONS);

      expect(dto.isComingSoon).toBeUndefined();
    });
  });
});
