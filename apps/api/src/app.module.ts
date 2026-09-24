import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';

import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { appConfig, type AppConfig } from './config/app.config';
import { envValidationSchema } from './config/env.validation';
import { jwtConfig } from './config/jwt.config';
import { stripeConfig } from './config/stripe.config';
import { throttleConfig, type ThrottleConfig } from './config/throttle.config';
import { DatabaseModule } from './database/database.module';
import { SeedModule } from './database/seed/seed.module';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { MoviesModule } from './modules/movies/movies.module';
import { ReportsModule } from './modules/reports/reports.module';
import { ReservationsModule } from './modules/reservations/reservations.module';
import { ShowtimesModule } from './modules/showtimes/showtimes.module';
import { UsersModule } from './modules/users/users.module';
import { WalletsModule } from './modules/wallets/wallets.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [appConfig, jwtConfig, throttleConfig, stripeConfig],
      validationSchema: envValidationSchema,
      validationOptions: { abortEarly: false },
      envFilePath: ['.env.local', '.env'],
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const { nodeEnv, logLevel } =
          configService.getOrThrow<AppConfig>('app');

        return {
          pinoHttp: {
            level: logLevel,
            autoLogging: false,
            redact: {
              paths: [
                'req.headers.authorization',
                'req.headers.cookie',
                'req.body.password',
                'req.body.accessToken',
                'req.body.refreshToken',
              ],
              censor: '[REDACTED]',
            },
            transport:
              nodeEnv === 'development'
                ? { target: 'pino-pretty', options: { singleLine: true } }
                : undefined,
          },
        };
      },
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const { ttlMs, limit } =
          configService.getOrThrow<ThrottleConfig>('throttle');
        return [{ ttl: ttlMs, limit }];
      },
    }),
    // ADR-009: in-process scheduled jobs, discovered app-wide off this one
    // root registration — no per-module ScheduleModule import needed.
    ScheduleModule.forRoot(),
    DatabaseModule,
    HealthModule,
    AuthModule,
    UsersModule,
    MoviesModule,
    ShowtimesModule,
    ReservationsModule,
    ReportsModule,
    WalletsModule,
    SeedModule,
  ],
  providers: [
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
