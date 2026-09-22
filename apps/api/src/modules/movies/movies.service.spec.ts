import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { ErrorCode } from '../../common/exceptions/error-codes';
import { Genre } from './entities/genre.entity';
import { MovieGenre } from './entities/movie-genre.entity';
import { Movie } from './entities/movie.entity';
import { MoviesService } from './movies.service';

function mockQueryBuilder() {
  const qb: Record<string, jest.Mock> = {};
  for (const method of [
    'leftJoinAndSelect',
    'orderBy',
    'skip',
    'take',
    'andWhere',
  ]) {
    qb[method] = jest.fn().mockReturnValue(qb);
  }
  qb.getManyAndCount = jest.fn();
  return qb;
}

function mockManager() {
  return {
    count: jest.fn(),
    create: jest.fn((_entityClass: unknown, data: unknown) => data),
    save: jest.fn((_entityClass: unknown, data: unknown) =>
      Promise.resolve(data),
    ),
    merge: jest.fn((_entityClass: unknown, target: object, data: object) => ({
      ...target,
      ...data,
    })),
    delete: jest.fn(),
  };
}

describe('MoviesService', () => {
  let service: MoviesService;
  let repo: {
    createQueryBuilder: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    manager: { transaction: jest.Mock } & ReturnType<typeof mockManager>;
  };
  let qb: ReturnType<typeof mockQueryBuilder>;
  let manager: ReturnType<typeof mockManager>;

  const genre: Genre = { id: 'g1', name: 'Drama', movieGenres: [] };

  const baseMovie: Movie = {
    id: 'm1',
    title: 'Arrival',
    synopsis: null,
    posterUrl: null,
    durationMinutes: 116,
    language: 'en',
    releaseDate: '2016-11-11',
    rating: null,
    isActive: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    movieGenres: [
      { movieId: 'm1', genreId: 'g1', movie: undefined as never, genre },
    ],
    showtimes: [],
  };

  beforeEach(async () => {
    qb = mockQueryBuilder();
    manager = mockManager();
    repo = {
      createQueryBuilder: jest.fn().mockReturnValue(qb),
      findOne: jest.fn(),
      update: jest.fn(),
      manager: {
        transaction: jest.fn((cb: (m: typeof manager) => unknown) =>
          cb(manager),
        ),
        ...manager,
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MoviesService,
        { provide: getRepositoryToken(Movie), useValue: repo },
      ],
    }).compile();

    service = module.get(MoviesService);
  });

  describe('findAllMovies', () => {
    it('excludes inactive movies for a non-admin caller', async () => {
      qb.getManyAndCount.mockResolvedValue([[baseMovie], 1]);

      const result = await service.findAllMovies(
        { page: 1, limit: 20, skip: 0 },
        { includeInactive: false },
      );

      expect(qb.andWhere).toHaveBeenCalledWith('movie.isActive = true');
      expect(result.data[0].genres).toEqual([{ id: 'g1', name: 'Drama' }]);
    });

    it('does not filter by isActive for an admin caller', async () => {
      qb.getManyAndCount.mockResolvedValue([[baseMovie], 1]);

      await service.findAllMovies(
        { page: 1, limit: 20, skip: 0 },
        { includeInactive: true },
      );

      expect(qb.andWhere).not.toHaveBeenCalledWith('movie.isActive = true');
    });

    it('derives isComingSoon as false for a past releaseDate', async () => {
      qb.getManyAndCount.mockResolvedValue([[baseMovie], 1]);

      const result = await service.findAllMovies(
        { page: 1, limit: 20, skip: 0 },
        { includeInactive: false },
      );

      expect(result.data[0].isComingSoon).toBe(false);
    });

    it('derives isComingSoon as true for a future releaseDate', async () => {
      const upcoming = { ...baseMovie, releaseDate: '2099-01-01' };
      qb.getManyAndCount.mockResolvedValue([[upcoming], 1]);

      const result = await service.findAllMovies(
        { page: 1, limit: 20, skip: 0 },
        { includeInactive: false },
      );

      expect(result.data[0].isComingSoon).toBe(true);
    });

    it('filters by isComingSoon when requested', async () => {
      qb.getManyAndCount.mockResolvedValue([[baseMovie], 1]);

      await service.findAllMovies(
        { page: 1, limit: 20, skip: 0, isComingSoon: true },
        { includeInactive: false },
      );

      expect(qb.andWhere).toHaveBeenCalledWith(
        'movie.releaseDate > CURRENT_DATE',
      );
    });

    it('does not apply an isComingSoon filter when omitted', async () => {
      qb.getManyAndCount.mockResolvedValue([[baseMovie], 1]);

      await service.findAllMovies(
        { page: 1, limit: 20, skip: 0 },
        { includeInactive: false },
      );

      expect(qb.andWhere).not.toHaveBeenCalledWith(
        expect.stringContaining('CURRENT_DATE'),
      );
    });
  });

  describe('createMovie', () => {
    it('rejects an empty genreIds without starting a transaction', async () => {
      await expect(
        service.createMovie({
          title: 'X',
          durationMinutes: 90,
          language: 'en',
          releaseDate: '2026-01-01',
          genreIds: [],
        }),
      ).rejects.toMatchObject({ errorCode: ErrorCode.MOVIE_REQUIRES_GENRE });

      expect(repo.manager.transaction).not.toHaveBeenCalled();
    });

    it('rejects when a genreId does not exist', async () => {
      manager.count.mockResolvedValue(0);

      await expect(
        service.createMovie({
          title: 'X',
          durationMinutes: 90,
          language: 'en',
          releaseDate: '2026-01-01',
          genreIds: ['missing'],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates the movie and assigns the requested genres', async () => {
      manager.count.mockResolvedValue(1);
      manager.save.mockImplementation((entityClass: unknown, data: unknown) =>
        entityClass === Movie
          ? Promise.resolve({ ...(data as object), id: 'm1' })
          : Promise.resolve(data),
      );
      repo.findOne.mockResolvedValue(baseMovie);

      const result = await service.createMovie({
        title: 'Arrival',
        durationMinutes: 116,
        language: 'en',
        releaseDate: '2016-11-11',
        genreIds: ['g1'],
      });

      expect(manager.save).toHaveBeenCalledWith(
        MovieGenre,
        expect.arrayContaining([
          expect.objectContaining({ movieId: 'm1', genreId: 'g1' }),
        ]),
      );
      expect(result.genres).toEqual([{ id: 'g1', name: 'Drama' }]);
    });
  });

  describe('updateMovie', () => {
    it('rejects replacing genreIds with an empty array', async () => {
      repo.findOne.mockResolvedValue(baseMovie);

      await expect(
        service.updateMovie('m1', { genreIds: [] }),
      ).rejects.toMatchObject({ errorCode: ErrorCode.MOVIE_REQUIRES_GENRE });

      expect(repo.manager.transaction).not.toHaveBeenCalled();
    });

    it('leaves genre assignment untouched when genreIds is omitted', async () => {
      repo.findOne.mockResolvedValue(baseMovie);

      await service.updateMovie('m1', { title: "Arrival (Director's Cut)" });

      expect(manager.delete).not.toHaveBeenCalled();
    });

    it('reactivates a deactivated movie through isActive', async () => {
      repo.findOne.mockResolvedValue({ ...baseMovie, isActive: false });

      await service.updateMovie('m1', { isActive: true });

      expect(manager.save).toHaveBeenCalledWith(
        Movie,
        expect.objectContaining({ id: 'm1', isActive: true }),
      );
    });
  });

  describe('remove', () => {
    it('soft-deletes by flipping isActive to false, not deleting the row', async () => {
      repo.findOne.mockResolvedValue(baseMovie);
      repo.update.mockResolvedValue({});

      await service.remove('m1');

      expect(repo.update).toHaveBeenCalledWith('m1', { isActive: false });
    });
  });
});
