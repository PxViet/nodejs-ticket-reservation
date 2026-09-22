import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

import { PaginationMetaDto } from '../../../common/dto/paginated-response.dto';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { GenreResponseDto } from './genre.dto';

// A cinema release, not a marathon. BR-02 only requires a positive duration;
// this upper bound is catalogue policy, so it lives in the DTO rather than a
// CHECK constraint that would need a migration to adjust.
const MAX_DURATION_MINUTES = 180;

// BR-30 / MOVIE_REQUIRES_GENRE: genreIds is deliberately not @ArrayMinSize(1)
// — an empty array must reach MoviesService so it can throw the specific
// errorCode instead of a generic validation 400.
export class CreateMovieDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  synopsis?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  posterUrl?: string;

  @ApiProperty({ minimum: 1, maximum: MAX_DURATION_MINUTES })
  @IsInt()
  @Min(1)
  @Max(MAX_DURATION_MINUTES)
  durationMinutes: number;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(10)
  language: string;

  @ApiProperty()
  @IsDateString()
  releaseDate: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(10)
  rating?: number;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  genreIds: string[];
}

export class UpdateMovieDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  synopsis?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  posterUrl?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: MAX_DURATION_MINUTES })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_DURATION_MINUTES)
  durationMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(10)
  language?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  releaseDate?: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(10)
  rating?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  genreIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class MovieListQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  genreId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    description: 'Filter by release status: true for not-yet-released movies.',
  })
  @IsOptional()
  @Transform(({ obj }: { obj: Record<string, unknown> }) => {
    const raw = obj.isComingSoon;
    return typeof raw === 'string' ? raw === 'true' : raw;
  })
  @IsBoolean()
  isComingSoon?: boolean;
}

export class MovieResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  synopsis: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  posterUrl: string | null;

  @ApiProperty()
  durationMinutes: number;

  @ApiProperty()
  language: string;

  @ApiProperty()
  releaseDate: string;

  @ApiPropertyOptional({ type: Number, nullable: true })
  rating: number | null;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty({
    description: 'True when releaseDate is in the future.',
  })
  isComingSoon: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ type: [GenreResponseDto] })
  genres: GenreResponseDto[];
}

export class PaginatedMovieResponseDto {
  @ApiProperty({ type: [MovieResponseDto] })
  data: MovieResponseDto[];

  @ApiProperty()
  meta: PaginationMetaDto;
}
