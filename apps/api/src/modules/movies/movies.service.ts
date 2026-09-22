import {
  BadRequestException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { EntityManager, Repository } from 'typeorm';
import { In } from 'typeorm';

import { BaseAbstractService } from '../../common/base/base-crud.service';
import type { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCode } from '../../common/exceptions/error-codes';
import type {
  CreateMovieDto,
  MovieListQueryDto,
  MovieResponseDto,
  UpdateMovieDto,
} from './dto/movie.dto';
import { Genre } from './entities/genre.entity';
import { MovieGenre } from './entities/movie-genre.entity';
import { Movie } from './entities/movie.entity';

interface VisibilityOptions {
  includeInactive: boolean;
}

@Injectable()
export class MoviesService extends BaseAbstractService<Movie> {
  constructor(@InjectRepository(Movie) repository: Repository<Movie>) {
    super(repository, 'Movie');
  }

  async findAllMovies(
    { page, limit, skip, genreId, title, isComingSoon }: MovieListQueryDto,
    { includeInactive }: VisibilityOptions,
  ): Promise<PaginatedResponseDto<MovieResponseDto>> {
    const qb = this.repository
      .createQueryBuilder('movie')
      .leftJoinAndSelect('movie.movieGenres', 'movieGenre')
      .leftJoinAndSelect('movieGenre.genre', 'genre')
      .orderBy('movie.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (!includeInactive) {
      qb.andWhere('movie.isActive = true');
    }
    if (title) {
      qb.andWhere('movie.title ILIKE :title', { title: `%${title}%` });
    }
    if (genreId) {
      qb.andWhere(
        'movie.id IN (SELECT movie_id FROM movie_genres WHERE genre_id = :genreId)',
        { genreId },
      );
    }
    if (isComingSoon !== undefined) {
      qb.andWhere(
        isComingSoon
          ? 'movie.releaseDate > CURRENT_DATE'
          : 'movie.releaseDate <= CURRENT_DATE',
      );
    }

    const [movies, total] = await qb.getManyAndCount();

    return {
      data: movies.map((movie) => this.toResponse(movie)),
      meta: { page, limit, total, hasMore: skip + movies.length < total },
    };
  }

  async findOneMovie(
    id: string,
    { includeInactive }: VisibilityOptions,
  ): Promise<MovieResponseDto> {
    const movie = await this.repository.findOne({
      where: { id },
      relations: { movieGenres: { genre: true } },
    });

    if (!movie || (!movie.isActive && !includeInactive)) {
      throw new NotFoundException(`Movie with id ${id} not found`);
    }

    return this.toResponse(movie);
  }

  async createMovie({
    genreIds,
    ...data
  }: CreateMovieDto): Promise<MovieResponseDto> {
    this.assertHasGenres(genreIds);

    const movie = await this.repository.manager.transaction(async (manager) => {
      await this.assertGenresExist(manager, genreIds);

      const saved = await manager.save(Movie, manager.create(Movie, data));
      await this.assignGenres(manager, saved.id, genreIds);
      return saved;
    });

    return this.findOneMovie(movie.id, { includeInactive: true });
  }

  async updateMovie(
    id: string,
    { genreIds, ...data }: UpdateMovieDto,
  ): Promise<MovieResponseDto> {
    const movie = await this.findOne(id);

    if (genreIds !== undefined) {
      this.assertHasGenres(genreIds);
    }

    await this.repository.manager.transaction(async (manager) => {
      await manager.save(Movie, manager.merge(Movie, movie, data));

      if (genreIds !== undefined) {
        await this.assertGenresExist(manager, genreIds);
        await manager.delete(MovieGenre, { movieId: id });
        await this.assignGenres(manager, id, genreIds);
      }
    });

    return this.findOneMovie(id, { includeInactive: true });
  }

  // Implements BaseAbstractService's abstract remove() — ADR-010: soft
  // delete, not a real DELETE.
  async remove(id: string): Promise<void> {
    const movie = await this.findOne(id);
    await this.repository.update(movie.id, { isActive: false });
  }

  private assertHasGenres(genreIds: string[]): void {
    if (genreIds.length === 0) {
      throw new AppException(
        ErrorCode.MOVIE_REQUIRES_GENRE,
        'A movie must have at least one genre',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private async assertGenresExist(
    manager: EntityManager,
    genreIds: string[],
  ): Promise<void> {
    const count = await manager.count(Genre, { where: { id: In(genreIds) } });
    if (count !== new Set(genreIds).size) {
      throw new BadRequestException('One or more genreIds do not exist');
    }
  }

  private assignGenres(
    manager: EntityManager,
    movieId: string,
    genreIds: string[],
  ): Promise<MovieGenre[]> {
    return manager.save(
      MovieGenre,
      genreIds.map((genreId) =>
        manager.create(MovieGenre, { movieId, genreId }),
      ),
    );
  }

  private toResponse({ movieGenres, ...movie }: Movie): MovieResponseDto {
    return {
      ...movie,
      isComingSoon: movie.releaseDate > new Date().toISOString().slice(0, 10),
      genres: (movieGenres ?? []).map(({ genre }) => ({
        id: genre.id,
        name: genre.name,
      })),
    };
  }
}
