import { VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module';
import type { AppConfig } from './config/app.config';
import { buildOpenApiDocument } from './swagger';

async function bootstrap(): Promise<void> {
  // rawBody: the Stripe webhook verifies its signature over the exact bytes
  // Stripe sent (ADR-017); JSON parsing still runs for every other route.
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    rawBody: true,
  });
  const logger = app.get(Logger);
  app.useLogger(logger);

  const { corsOrigin, apiPrefix, apiVersion, swaggerEnabled, port } = app
    .get(ConfigService)
    .getOrThrow<AppConfig>('app');

  app.use(helmet());
  app.enableCors({ origin: corsOrigin, credentials: true });
  app.setGlobalPrefix(apiPrefix);
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: apiVersion,
  });
  app.enableShutdownHooks();

  if (swaggerEnabled) {
    SwaggerModule.setup(
      `${apiPrefix}/docs`,
      app,
      buildOpenApiDocument(app, apiVersion),
    );
  }

  await app.listen(port);

  logger.log(
    `API listening on ${await app.getUrl()}/${apiPrefix}`,
    'Bootstrap',
  );

  if (swaggerEnabled) {
    logger.log(
      `Swagger UI at ${await app.getUrl()}/${apiPrefix}/docs`,
      'Bootstrap',
    );
  }
}

void bootstrap();
