import * as bcrypt from 'bcrypt';
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { addMinutesToTimeString } from '../../common/utils/time.util';
import { BCRYPT_SALT_ROUNDS } from '../../modules/auth/constants/auth.constants';
import { Genre } from '../../modules/movies/entities/genre.entity';
import { MovieGenre } from '../../modules/movies/entities/movie-genre.entity';
import { Movie } from '../../modules/movies/entities/movie.entity';
import { Hall } from '../../modules/showtimes/entities/hall.entity';
import { Seat } from '../../modules/showtimes/entities/seat.entity';
import { ShowtimeStatus } from '../../modules/showtimes/enums/showtime-status.enum';
import { Showtime } from '../../modules/showtimes/entities/showtime.entity';
import { UserRole } from '../../modules/users/enums/user-role.enum';
import { User } from '../../modules/users/entities/user.entity';
import { GENRE_NAMES } from './data/genres.data';
import { HALL_FIXTURES } from './data/halls.data';
import { MOVIE_FIXTURES } from './data/movies.data';
import { addDays, formatDate } from './date.util';

const SHOWTIME_SLOTS = ['10:00:00', '14:30:00', '19:00:00'];
const DAY_OFFSET_START = -1; // one showtime in the past, so BR-29 is demonstrable
const DAY_OFFSET_END = 6;

// DDR-009: creates the one admin no API route may create, plus a demo
// catalogue so the system is usable immediately after boot. Idempotent —
// every insert is gated by an existence check, so restarting is a no-op.
@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Genre) private readonly genreRepo: Repository<Genre>,
    @InjectRepository(Movie) private readonly movieRepo: Repository<Movie>,
    @InjectRepository(MovieGenre)
    private readonly movieGenreRepo: Repository<MovieGenre>,
    @InjectRepository(Hall) private readonly hallRepo: Repository<Hall>,
    @InjectRepository(Seat) private readonly seatRepo: Repository<Seat>,
    @InjectRepository(Showtime)
    private readonly showtimeRepo: Repository<Showtime>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.seedAdmin();
    const genresByName = await this.seedGenres();
    const movies = await this.seedMovies(genresByName);
    const halls = await this.seedHalls();
    await this.seedShowtimes(movies, halls);
    this.logger.log('Seed complete.');
  }

  private async seedAdmin(): Promise<void> {
    const email = this.configService.get<string>('ADMIN_EMAIL')!;
    const password = this.configService.get<string>('ADMIN_PASSWORD')!;

    const existing = await this.userRepo.findOne({ where: { email } });
    if (existing) return;

    const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
    await this.userRepo.save(
      this.userRepo.create({
        email,
        passwordHash,
        firstName: 'System',
        lastName: 'Admin',
        role: UserRole.ADMIN,
        isActive: true,
      }),
    );
  }

  private async seedGenres(): Promise<Map<string, Genre>> {
    const genresByName = new Map<string, Genre>();
    for (const name of GENRE_NAMES) {
      let genre = await this.genreRepo.findOne({ where: { name } });
      genre ??= await this.genreRepo.save(this.genreRepo.create({ name }));
      genresByName.set(name, genre);
    }
    return genresByName;
  }

  private async seedMovies(genresByName: Map<string, Genre>): Promise<Movie[]> {
    const movies: Movie[] = [];
    for (const fixture of MOVIE_FIXTURES) {
      const {
        title,
        synopsis,
        posterUrl,
        durationMinutes,
        language,
        releaseDate,
        rating,
        genreNames,
      } = fixture;

      const existing = await this.movieRepo.findOne({ where: { title } });
      if (existing) {
        movies.push(existing);
        continue;
      }

      const movie = await this.movieRepo.save(
        this.movieRepo.create({
          title,
          synopsis,
          posterUrl,
          durationMinutes,
          language,
          releaseDate,
          rating,
          isActive: true,
        }),
      );

      for (const genreName of genreNames) {
        const genre = genresByName.get(genreName);
        if (!genre) continue;
        await this.movieGenreRepo.save(
          this.movieGenreRepo.create({ movieId: movie.id, genreId: genre.id }),
        );
      }

      movies.push(movie);
    }
    return movies;
  }

  private async seedHalls(): Promise<Hall[]> {
    const halls: Hall[] = [];
    for (const fixture of HALL_FIXTURES) {
      const { name, hallType, rows, seatsPerRow } = fixture;

      const existing = await this.hallRepo.findOne({ where: { name } });
      if (existing) {
        halls.push(existing);
        continue;
      }

      const hall = await this.hallRepo.save(
        this.hallRepo.create({ name, hallType, isActive: true }),
      );

      const seats = rows.flatMap((row) =>
        Array.from({ length: seatsPerRow }, (_, i) => {
          const seatColumn = i + 1;
          return this.seatRepo.create({
            hallId: hall.id,
            seatRow: row,
            seatColumn,
            seatLabel: `${row}${seatColumn}`,
            isActive: true,
          });
        }),
      );
      await this.seatRepo.save(seats);

      halls.push(hall);
    }
    return halls;
  }

  private async seedShowtimes(movies: Movie[], halls: Hall[]): Promise<void> {
    if (movies.length === 0 || halls.length === 0) return;

    const basePriceByHallName = new Map(
      HALL_FIXTURES.map(({ name, basePrice }) => [name, basePrice]),
    );
    const today = new Date();
    let movieIndex = 0;

    for (
      let dayOffset = DAY_OFFSET_START;
      dayOffset <= DAY_OFFSET_END;
      dayOffset++
    ) {
      const showDate = formatDate(addDays(today, dayOffset));
      const status =
        dayOffset < 0 ? ShowtimeStatus.COMPLETED : ShowtimeStatus.SCHEDULED;

      for (const { id: hallId, name: hallName } of halls) {
        for (const showTime of SHOWTIME_SLOTS) {
          const { id: movieId, durationMinutes } =
            movies[movieIndex % movies.length];
          movieIndex++;

          const existing = await this.showtimeRepo.findOne({
            where: { hallId, showDate, showTime },
          });
          if (existing) continue;

          await this.showtimeRepo.save(
            this.showtimeRepo.create({
              movieId,
              hallId,
              showDate,
              showTime,
              endTime: addMinutesToTimeString(showTime, durationMinutes),
              basePrice: basePriceByHallName.get(hallName) ?? 10,
              status,
            }),
          );
        }
      }
    }
  }
}
