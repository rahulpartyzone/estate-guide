import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Allow embedding static resources (like images) from this API on different origins (e.g., Vite dev server)
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
    }),
  );
  app.use(cookieParser());

  // Flexible CORS handling. In dev, you often hit via 127.0.0.1 or localhost, maybe different ports.
  // Set CORS_ORIGIN to a comma-separated list. Optionally set CORS_ALLOW_ALL=true ONLY for local dev.
  const allowAll = (process.env.CORS_ALLOW_ALL || 'false').toLowerCase() === 'true';
  const originEnv = process.env.CORS_ORIGIN || 'http://localhost:5173';
  const allowedOrigins = new Set(originEnv.split(',').map(o => o.trim()).filter(Boolean));

  app.enableCors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // non-browser or same-origin
      if (allowAll) return cb(null, origin);
      if (allowedOrigins.has(origin)) return cb(null, origin);
      return cb(new Error('Not allowed by CORS: ' + origin), false);
    },
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type,Accept,Authorization',
    exposedHeaders: 'Set-Cookie'
  });

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      forbidNonWhitelisted: true,
      forbidUnknownValues: false,
      validationError: { target: false },
    }),
  );

  const port = process.env.PORT || 8080;
  await app.listen(port as number);
}

bootstrap();
