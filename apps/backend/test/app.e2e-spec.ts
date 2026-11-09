import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import pg from 'pg';
import request from 'supertest';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { OAuth2Client, LoginTicket } from 'google-auth-library';
import { AppModule } from '../src/app.module.js';
import { DatabaseService } from '../src/database/database.service.js';
import { sessions, users } from '../src/database/schema.js';
import { digest } from '../src/auth.js';

describe('Tiwder API', () => {
  let app: INestApplication,
    db: DatabaseService,
    admin: pg.Pool,
    testPool: pg.Pool,
    created = false;
  const original = process.env.DATABASE_URL!,
    database = 'tiwder_test_' + randomUUID().replaceAll('-', ''),
    origin = 'http://localhost:3000';
  beforeAll(async () => {
    admin = new pg.Pool({ connectionString: original });
    await admin.query('CREATE DATABASE ' + database);
    created = true;
    const url = new URL(original);
    url.pathname = '/' + database;
    vi.stubEnv('DATABASE_URL', url.toString());
    vi.stubEnv('FRONTEND_URL', origin);
    vi.stubEnv('GOOGLE_CLIENT_ID', 'test-client');
    vi.stubEnv('GOOGLE_CLIENT_SECRET', 'test-secret');
    testPool = new pg.Pool({ connectionString: url.toString() });
    await migrate(drizzle(testPool), { migrationsFolder: './drizzle' });
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    db = module.get(DatabaseService);
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });
  afterAll(async () => {
    await app?.close();
    await testPool?.end();
    if (created) await admin.query('DROP DATABASE ' + database);
    await admin?.end();
    vi.unstubAllEnvs();
  });
  afterEach(() => vi.restoreAllMocks());
  const api = () => request(app.getHttpServer());
  async function account(name: string) {
    const token = randomUUID(),
      csrf = randomUUID(),
      email = name + '@example.test';
    const [u] = await db.db
      .insert(users)
      .values({ name, email, googleSub: randomUUID() })
      .returning({ id: users.id });
    await db.db.insert(sessions).values({
      tokenHash: digest(token),
      userId: u.id,
      csrf,
      expiresAt: new Date(Date.now() + 600000),
    });
    return {
      ...u,
      name,
      email,
      csrf,
      headers: {
        Cookie: 'tiwder_session=' + token,
        Origin: origin,
        'X-CSRF-Token': csrf,
      },
    };
  }
  async function oauth() {
    const start = await api().get('/api/auth/google').expect(302);
    const url = new URL(start.headers.location);
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    return {
      state: url.searchParams.get('state')!,
      nonce: url.searchParams.get('nonce'),
      cookie: (start.headers['set-cookie'] as unknown as string[])[0].split(
        ';',
      )[0],
    };
  }
  it('binds one-use OAuth state to its browser, validates scope and nonce, and revokes sessions on logout', async () => {
    const tokens = { id_token: 'test-id-token', scope: 'openid email profile' };
    const exchange = vi
      .spyOn(OAuth2Client.prototype, 'getToken')
      .mockResolvedValue({ tokens, res: null } as never);
    const verify = vi.spyOn(OAuth2Client.prototype, 'verifyIdToken');
    const flow = await oauth();
    function identity(nonce: string | null) {
      return new LoginTicket(undefined, {
        iss: 'https://accounts.google.com',
        aud: 'test-client',
        sub: 'google-123',
        email: 'oauth@example.test',
        email_verified: true,
        exp: 9999999999,
        iat: 0,
        nonce,
      } as never);
    }
    const callback = (state: string, cookie: string) =>
      api()
        .get('/api/auth/google/callback')
        .query({ state, code: 'test' })
        .set('Cookie', cookie);
    const failed = origin + '/login?error=oauth_failed';
    expect(
      (await callback(flow.state, 'tiwder_oauth=wrong')).headers.location,
    ).toBe(failed);
    expect(exchange).not.toHaveBeenCalled();
    verify.mockResolvedValue(identity(flow.nonce));
    const signed = await callback(flow.state, flow.cookie);
    expect(signed.headers.location).toBe(origin + '/onboarding');
    expect(exchange).toHaveBeenCalledWith(
      expect.objectContaining({ codeVerifier: expect.any(String) }),
    );
    expect((await callback(flow.state, flow.cookie)).headers.location).toBe(
      failed,
    );
    const cookie = (signed.headers['set-cookie'] as unknown as string[])
      .find((c) => c.startsWith('tiwder_session='))!
      .split(';')[0];
    const session = await api()
      .get('/api/auth/session')
      .set('Cookie', cookie)
      .expect(200);
    expect(session.body.user.email).toBe('oauth@example.test');
    expect(session.headers['cache-control']).toBe('no-store');
    await api()
      .post('/api/auth/logout')
      .set('Cookie', cookie)
      .set('Origin', origin)
      .expect(403);
    await api()
      .post('/api/auth/logout')
      .set('Cookie', cookie)
      .set('Origin', 'https://example.test')
      .set('X-CSRF-Token', session.body.csrfToken)
      .expect(403);
    await api()
      .post('/api/auth/logout')
      .set('Cookie', cookie)
      .set('Origin', origin)
      .set('X-CSRF-Token', session.body.csrfToken)
      .expect(204);
    expect(
      (await api().get('/api/auth/session').set('Cookie', cookie)).body,
    ).toEqual({ user: null });
    const bad = await oauth();
    verify.mockResolvedValue(identity('incorrect'));
    expect((await callback(bad.state, bad.cookie)).headers.location).toBe(
      failed,
    );
    const missing = await oauth();
    exchange.mockResolvedValue({
      tokens: { ...tokens, scope: 'openid email' },
      res: null,
    } as never);
    expect(
      (await callback(missing.state, missing.cookie)).headers.location,
    ).toBe(failed);
  });
  it.each(['student', 'tutor'])(
    'serializes simultaneous confirmations sharing a %s across different dates',
    async (overlap) => {
      const people = await Promise.all(
        Array.from({ length: 4 }, () => account(randomUUID())),
      );
      const [s1, s2, t1, t2] = people,
        students = [s1, s2],
        tutors = [t1, t2];
      const subjectId = (await api().get('/api/subjects')).body[0].id;
      await api().get('/api/matches').set(s1.headers).expect(403);
      for (const p of people) {
        const role = students.includes(p) ? 'student' : 'tutor';
        await api()
          .post('/api/onboarding')
          .set(p.headers)
          .send({
            role,
            name: p.name,
            phone: '0812345678',
            bio: 'My bio',
            ...(role === 'student'
              ? { gradeLevel: 'Grade 8' }
              : {
                  education: 'Degree',
                  experienceYears: 3,
                  hourlyRate: 400.5,
                  teachings: [{ subjectId, skillLevel: 'Advanced' }],
                }),
          })
          .expect(201);
      }
      await api()
        .patch('/api/profile')
        .set(s1.headers)
        .send({ role: 'tutor' })
        .expect(409);
      expect(
        (
          await testPool.query(
            'select user_id, grade_level from students where user_id=$1',
            [s1.id],
          )
        ).rows[0].grade_level,
      ).toBe('Grade 8');
      expect(
        (
          await testPool.query(
            'select hourly_rate from tutors where user_id=$1',
            [t1.id],
          )
        ).rows[0].hourly_rate,
      ).toBe('400.50');
      await api()
        .patch('/api/profile')
        .set(s1.headers)
        .send({ bio: 'Updated bio' })
        .expect(200)
        .expect(({ body }) => {
          expect(body.gradeLevel).toBe('Grade 8');
          expect(body.bio).toBe('Updated bio');
        });
      const publicTutor = (await api().get('/api/tutors')).body.find(
        (r: { id: string }) => r.id === t1.id,
      );
      expect(publicTutor).not.toHaveProperty('phone');
      expect(publicTutor).not.toHaveProperty('email');
      const pairs = [
        [s1, t1],
        [overlap === 'student' ? s1 : s2, overlap === 'tutor' ? t1 : t2],
      ];
      const ids: string[] = [];
      for (const [index, [s, t]] of pairs.entries()) {
        const create = () =>
          api()
            .post('/api/interests')
            .set(s.headers)
            .send({ tutorId: t.id, subjectId });
        const interest = (await create().expect(201)).body.id;
        ids.push(interest);
        const preview = (
          await api().get('/api/interests').set(t.headers).expect(200)
        ).body.find((row: { id: string }) => row.id === interest);
        expect(preview.student).toMatchObject({ id: s.id, name: s.name });
        expect(preview.tutor).toMatchObject({ id: t.id, name: t.name });
        expect(preview.student).not.toHaveProperty('phone');
        expect(preview.student).not.toHaveProperty('email');
        expect(preview.tutor).not.toHaveProperty('phone');
        expect(preview.tutor).not.toHaveProperty('email');
        await create().expect(409);
        const path = '/api/interests/' + interest + '/proposal';
        await api().post(path).set(s.headers).send({}).expect(403);
        await api()
          .post(path)
          .set(t.headers)
          .send({ date: '2099-02-30', start: 60, end: 90 })
          .expect(400);
        await api()
          .post(path)
          .set(t.headers)
          .send({ date: '2099-01-0' + (index + 1), start: 60, end: 90 })
          .expect(201);
      }
      const results = await Promise.all(
        pairs.map(([s], i) =>
          api()
            .post('/api/interests/' + ids[i] + '/confirm')
            .set(s.headers),
        ),
      );
      expect(results.map((x) => x.status).sort((a, b) => a - b)).toEqual([
        201, 409,
      ]);
      const winner = results.findIndex((x) => x.status === 201),
        [s, t] = pairs[winner],
        match = results[winner].body.id;
      const own = await api().get('/api/matches').set(s.headers).expect(200);
      expect(own.body[0].contact.email).toBe(t.email);
      expect(own.body[0].student.id).toBe(s.id);
      expect(own.body[0].tutor.id).toBe(t.id);
      expect(own.body[0].student).not.toHaveProperty('email');
      expect(own.body[0].tutor).not.toHaveProperty('phone');
      expect(own.body[0].matchedAt).toBeTruthy();
      expect(own.body[0].updatedAt).toBeTruthy();
      expect(
        (
          await testPool.query(
            'select tutor_id from time_slots where id=(select time_slot_id from matches where id=$1)',
            [match],
          )
        ).rows[0].tutor_id,
      ).toBe(t.id);
      const outsider = tutors.find((x) => x !== t)!;
      expect(
        (await api().get('/api/matches').set(outsider.headers)).body,
      ).toHaveLength(0);
      await api()
        .post('/api/matches/' + match + '/cancel')
        .set(outsider.headers)
        .expect(404);
      const fresh = async () =>
        (
          await api()
            .post('/api/interests')
            .set(s.headers)
            .send({ tutorId: t.id, subjectId })
            .expect(201)
        ).body.id as string;
      const propose = async (id: string) =>
        api()
          .post('/api/interests/' + id + '/proposal')
          .set(t.headers)
          .send({ date: '2099-02-01', start: 120, end: 150 })
          .expect(201);
      const rejected = await fresh();
      await propose(rejected);
      await api()
        .post('/api/interests/' + rejected + '/withdraw')
        .set(s.headers)
        .expect(409);
      const proposed = (
        await api().get('/api/interests').set(s.headers)
      ).body.find((i: { id: string }) => i.id === rejected);
      expect(new Date(proposed.updatedAt).getTime()).toBeGreaterThanOrEqual(
        new Date(proposed.swipedAt).getTime(),
      );
      await api()
        .post('/api/interests/' + rejected + '/reject')
        .set(s.headers)
        .expect(201);
      const next = await fresh();
      await propose(next);
      const confirm = () =>
        api()
          .post('/api/interests/' + next + '/confirm')
          .set(s.headers);
      await confirm().expect(409);
      if (overlap === 'student') {
        await api()
          .post('/api/matches/' + match + '/cancel')
          .set(t.headers)
          .expect(201);
      } else {
        await testPool.query(
          "update time_slots set starts_at=now()-interval '2 hours', ends_at=now()-interval '1 hour' where id=(select time_slot_id from matches where id=$1)",
          [match],
        );
        await api()
          .post('/api/matches/' + match + '/cancel')
          .set(t.headers)
          .expect(409);
      }
      await confirm().expect(201);
      expect(
        (await api().get('/api/matches').set(s.headers)).body.find(
          (m: { id: string }) => m.id === match,
        ).contact,
      ).toBeNull();
      expect(
        (
          await api()
            .get('/api/interests')
            .set(pairs[1 - winner][0].headers)
        ).body.find((x: { id: string }) => x.id === ids[1 - winner]).status,
      ).toBe('closed');
    },
  );
});
