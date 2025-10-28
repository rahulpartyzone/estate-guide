/// <reference types="jest" />
import { config } from 'dotenv';
config({ path: '.env.test' });
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://estate:estatepass@localhost:5433/estateguide';
}
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

describe('App E2E', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.use(helmet());
    app.use(cookieParser());
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidUnknownValues: false }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('health check', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/healthz');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('login + me + logout flow (mock auth)', async () => {
    const res = await request(app.getHttpServer()).post('/api/v1/auth/login').send({ email: 'admin@local', password: 'admin123' });
    expect(res.status).toBe(200);
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();

    const me = await request(app.getHttpServer()).get('/api/v1/auth/me').set('Cookie', cookies);
    expect(me.status).toBe(200);
    expect(me.body.email).toBe('admin@local');

    const logout = await request(app.getHttpServer()).post('/api/v1/auth/logout').set('Cookie', cookies);
    expect(logout.status).toBe(204);
  });

  it('list properties', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/properties');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});