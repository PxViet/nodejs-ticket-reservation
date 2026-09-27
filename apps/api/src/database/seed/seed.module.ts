import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Genre } from '../../modules/movies/entities/genre.entity';
import { MovieGenre } from '../../modules/movies/entities/movie-genre.entity';
import { Movie } from '../../modules/movies/entities/movie.entity';
import { Hall } from '../../modules/showtimes/entities/hall.entity';
import { Seat } from '../../modules/showtimes/entities/seat.entity';
import { Showtime } from '../../modules/showtimes/entities/showtime.entity';
import { User } from '../../modules/users/entities/user.entity';
import { SeedService } from './seed.service';

// Bootstrap infrastructure, not a domain module — it necessarily reaches into
// every domain's repositories to build the startup catalogue (DDR-009), the
// same way src/database/migrations does. This is a deliberate, narrow
// exception to ADR-001's "no module reaches into another's repositories",
// which governs domain services calling each other, not a one-shot seed.
@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Genre,
      Movie,
      MovieGenre,
      Hall,
      Seat,
      Showtime,
    ]),
  ],
  providers: [SeedService],
})
export class SeedModule {}
