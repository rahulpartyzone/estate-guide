import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Behind Vercel (and the frontend's /api rewrite) every request arrives through a proxy.
  // Trusting X-Forwarded-For makes req.ip the visitor's address, which the OTP rate limit relies on.
  app.set('trust proxy', true);

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
  const originRules = originEnv.split(',').map((value) => value.trim()).filter(Boolean);
  const allowedOrigins = new Set(originRules.filter((rule) => !rule.startsWith('*.')));
  const wildcardDomains = originRules.filter((rule) => rule.startsWith('*.')).map((rule) => rule.slice(2));

  const isAllowedOrigin = (origin: string) => {
    if (allowedOrigins.has(origin)) return true;
    try {
      const host = new URL(origin).hostname;
      return wildcardDomains.some((domain) => host === domain || host.endsWith(`.${domain}`));
    } catch {
      return false;
    }
  };

  app.enableCors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // non-browser or same-origin
      if (allowAll) return cb(null, origin);
      if (isAllowedOrigin(origin)) return cb(null, origin);
      return cb(null, false);
    },
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type,Accept,Authorization,X-Anon-Id',
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
