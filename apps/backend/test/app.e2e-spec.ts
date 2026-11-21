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
import {
  matches,
  sessions,
  swipes,
  timeSlots,
  users,
} from '../src/database/schema.js';
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
  it('orders ongoing, upcoming, awaiting confirmation and historical matches for both roles', async () => {
    const student = await account(randomUUID());
    const tutor = await account(randomUUID());
    const subjectId = (await api().get('/api/subjects')).body[0].id;
    for (const person of [student, tutor]) {
      await api()
        .post('/api/onboarding')
        .set(person.headers)
        .send({
          role: person === student ? 'student' : 'tutor',
          name: person.name,
          phone: '0812345678',
          bio: 'My bio',
          ...(person === student
            ? { gradeLevel: 'Grade 8' }
            : {
                education: 'Degree',
                experienceYears: 3,
                hourlyRate: 400,
                teachings: [{ subjectId, skillLevel: 'Advanced' }],
              }),
        })
        .expect(201);
    }
    const now = Date.now();
    const at = (minutes: number) => new Date(now + minutes * 60000);
    const ids: string[] = [];
    const lessons = [
      ['confirmed', 4320, 4380, 0],
      ['completed', -4380, -4320, 0],
      ['cancelled', 5760, 5820, -30],
      ['confirmed', -30, 30, 0],
      ['confirmed', 1440, 1500, 0],
      ['confirmed', -120, -60, 0],
      ['cancelled', 7200, 7260, -5760],
      ['confirmed', 1440, 1500, 0],
    ] as const;
    for (const [status, start, end, updated] of lessons) {
      const [interest] = await db.db
        .insert(swipes)
        .values({
          studentId: student.id,
          tutorId: tutor.id,
          subjectId,
          studentName: student.name,
          tutorName: tutor.name,
          subjectName: 'Sorting test',
          skillLevel: 'Advanced',
          hourlyRate: 400,
          status: 'confirmed',
        })
        .returning();
      const [slot] = await db.db
        .insert(timeSlots)
        .values({
          tutorId: tutor.id,
          date: '2099-01-01',
          start: 60,
          end: 120,
          startsAt: at(start),
          endsAt: at(end),
          status: status === 'cancelled' ? 'cancelled' : 'booked',
        })
        .returning();
      const [match] = await db.db
        .insert(matches)
        .values({
          interestId: interest.id,
          studentId: student.id,
          tutorId: tutor.id,
          timeSlotId: slot.id,
          status,
          updatedAt: at(updated),
        })
        .returning();
      ids.push(match.id);
    }
    const expected = [
      ids[3],
      ...[ids[4], ids[7]].sort(),
      ids[0],
      ids[5],
      ids[2],
      ids[1],
      ids[6],
    ];
    for (const person of [student, tutor, student]) {
      const { body } = await api()
        .get('/api/matches')
        .set(person.headers)
        .expect(200);
      expect(body.map((match: { id: string }) => match.id)).toEqual(expected);
    }
  });
  it('persists profile photos, preserves them on other edits, and supports removal', async () => {
    const gmailAvatar = 'https://example.test/gmail-avatar.png';
    const person = await account('photo-test', gmailAvatar);
    const photo =
      'data:image/jpeg;base64,' +
      Buffer.from([255, 216, 255, 0, 255, 217]).toString('base64');
    await api()
      .get('/api/auth/session')
      .set(person.headers)
      .expect(200)
      .expect(({ body }) => {
        expect(body.user.avatarUrl).toBe(gmailAvatar);
      });
    await api()
      .post('/api/onboarding')
      .set(person.headers)
      .send({
        role: 'student',
        name: person.name,
        phone: '0812345678',
        bio: 'Learning together',
        gradeLevel: 'University',
        photos: [photo],
      })
      .expect(201);
    await api()
      .get('/api/auth/session')
      .set(person.headers)
      .expect(200)
      .expect(({ body }) => {
        expect(body.user.avatarUrl).toBe(photo);
      });
    await api()
      .patch('/api/profile')
      .set(person.headers)
      .send({ bio: 'Updated introduction' })
      .expect(200);
    await api()
      .get('/api/profile')
      .set(person.headers)
      .expect(200)
      .expect(({ body }) => {
        expect(body.photos).toEqual([photo]);
      });
    await api()
      .patch('/api/profile')
      .set(person.headers)
      .send({ photos: ['not an image'] })
      .expect(400);
    await api()
      .patch('/api/profile')
      .set(person.headers)
      .send({ photos: [] })
      .expect(200)
      .expect(({ body }) => {
        expect(body.photos).toEqual([]);
      });
    await api()
      .get('/api/auth/session')
      .set(person.headers)
      .expect(200)
      .expect(({ body }) => {
        expect(body.user.avatarUrl).toBe(gmailAvatar);
      });
  });
  async function account(name: string, avatarUrl: string | null = null) {
    const token = randomUUID(),
      csrf = randomUUID(),
      email = name + '@example.test';
    const [u] = await db.db
      .insert(users)
      .values({ name, email, googleSub: randomUUID(), avatarUrl })
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
  it.each(['student', 'tutor'] as const)(
    'hard-deletes a %s, anonymizes all states, and dismisses both lists once',
    async (deletedRole) => {
      const [student, tutor, otherStudent, otherTutor] = await Promise.all(
        Array.from({ length: 4 }, () => account(randomUUID())),
      );
      const subjectId = (await api().get('/api/subjects')).body[0].id;
      for (const person of [student, tutor, otherStudent, otherTutor]) {
        const role =
          person === student || person === otherStudent ? 'student' : 'tutor';
        await api()
          .post('/api/onboarding')
          .set(person.headers)
          .send({
            role,
            name: person.name,
            phone: '0812345678',
            bio: 'Private biography',
            ...(role === 'student'
              ? { gradeLevel: 'Grade 8' }
              : {
                  education: 'Degree',
                  experienceYears: 3,
                  hourlyRate: 400,
                  teachings: [{ subjectId, skillLevel: 'Advanced' }],
                }),
          })
          .expect(201);
      }
      const deleted = deletedRole === 'student' ? student : tutor;
      const survivor = deletedRole === 'student' ? tutor : student;
      const otherSurvivor =
        deletedRole === 'student' ? otherTutor : otherStudent;
      const interest = async (
        s: typeof student,
        t: typeof tutor,
        status: typeof swipes.$inferInsert.status,
      ) => {
        const [row] = await db.db
          .insert(swipes)
          .values({
            studentId: s.id,
            tutorId: t.id,
            subjectId,
            studentName: s.name,
            tutorName: t.name,
            subjectName: 'Math',
            skillLevel: 'Advanced',
            hourlyRate: 400,
            status,
            ...(status === 'proposed'
              ? { date: '2099-01-01', start: 60, end: 90 }
              : {}),
          })
          .returning();
        return row;
      };
      // Historical and active records must all disappear together.
      for (const status of [
        'rejected',
        'withdrawn',
        'closed',
        'confirmed',
        'expired',
        'proposed',
      ] as const)
        await interest(student, tutor, status);
      for (const status of ['confirmed', 'completed', 'cancelled'] as const) {
        const row = await interest(student, tutor, 'confirmed');
        const [slot] = await db.db
          .insert(timeSlots)
          .values({
            tutorId: tutor.id,
            date: '2099-01-01',
            start: 60,
            end: 90,
            startsAt: new Date('2099-01-01T01:00:00+07:00'),
            endsAt: new Date('2099-01-01T01:30:00+07:00'),
            status: 'booked',
          })
          .returning();
        await db.db.insert(matches).values({
          interestId: row.id,
          studentId: student.id,
          tutorId: tutor.id,
          timeSlotId: slot.id,
          status,
        });
      }
      await interest(
        deletedRole === 'student' ? student : otherStudent,
        deletedRole === 'student' ? otherTutor : tutor,
        'pending',
      );
      const unrelated = await interest(otherStudent, otherTutor, 'pending');
      const extraToken = randomUUID();
      await db.db.insert(sessions).values({
        userId: deleted.id,
        tokenHash: digest(extraToken),
        csrf: randomUUID(),
        expiresAt: new Date(Date.now() + 600000),
      });
      await api()
        .delete('/api/profile')
        .send({ email: deleted.email })
        .expect(401);
      await api()
        .delete('/api/profile')
        .set('Cookie', deleted.headers.Cookie)
        .set('Origin', origin)
        .send({ email: deleted.email })
        .expect(403);
      for (const body of [
        { email: survivor.email },
        {},
        { email: deleted.email, userId: survivor.id },
      ])
        await api()
          .delete('/api/profile')
          .set(deleted.headers)
          .send(body)
          .expect(400);
      expect(
        (await api().get('/api/auth/session').set(deleted.headers)).body.user
          .id,
      ).toBe(deleted.id);

      const result = await api()
        .delete('/api/profile')
        .set(deleted.headers)
        .send({ email: deleted.email })
        .expect(200);
      expect(result.headers['set-cookie']).toEqual(
        expect.arrayContaining([expect.stringContaining('tiwder_session=;')]),
      );
      for (const cookie of [
        deleted.headers.Cookie,
        'tiwder_session=' + extraToken,
      ])
        expect(
          (await api().get('/api/auth/session').set('Cookie', cookie)).body,
        ).toEqual({ user: null });
      for (const [table, condition] of [
        ['users', 'id'],
        ['students', 'user_id'],
        ['tutors', 'user_id'],
        ['sessions', 'user_id'],
        ['teachings', 'tutor_id'],
        ['time_slots', 'tutor_id'],
        ['swipes', 'student_id'],
        ['swipes', 'tutor_id'],
        ['matches', 'student_id'],
        ['matches', 'tutor_id'],
        ['deleted_accounts', 'owner_id'],
      ]) {
        const { rows } = await testPool.query(
          `SELECT count(*) FROM ${table} WHERE ${condition} = $1`,
          [deleted.id],
        );
        expect(Number(rows[0].count)).toBe(0);
      }
      for (const path of ['/api/interests', '/api/matches']) {
        const { body } = await api()
          .get(path)
          .set(survivor.headers)
          .expect(200);
        expect(body).toEqual([]);
      }
      const { body: notices } = await api()
        .get('/api/deleted-accounts')
        .set(survivor.headers)
        .expect(200);
      expect(notices).toHaveLength(2);
      const accountId = notices[0].accountId;
      expect(accountId).not.toBe(deleted.id);
      expect(notices).toEqual(
        expect.arrayContaining([
          { accountId, kind: 'interests' },
          { accountId, kind: 'matches' },
        ]),
      );
      // Someone else cannot remove this owner's notices.
      await api()
        .delete('/api/deleted-accounts/' + accountId)
        .set(otherSurvivor.headers)
        .expect(200);
      expect(
        (await api().get('/api/deleted-accounts').set(survivor.headers)).body,
      ).toHaveLength(2);
      await api()
        .delete('/api/deleted-accounts/' + accountId)
        .set(survivor.headers)
        .expect(200);
      expect(
        (await api().get('/api/deleted-accounts').set(survivor.headers)).body,
      ).toEqual([]);
      const others = await api()
        .get('/api/interests')
        .set(otherStudent.headers)
        .expect(200);
      expect(
        others.body.some((row: { id: string }) => row.id === unrelated.id),
      ).toBe(true);
      // Deleting the remaining participant also clears notices they own.
      await api()
        .delete('/api/profile')
        .set(survivor.headers)
        .send({ email: survivor.email })
        .expect(200);
    },
  );
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
  it('keeps tutors out of a student discovery deck while active or ever completed', async () => {
    const [student, otherStudent, tutor] = await Promise.all(
      Array.from({ length: 3 }, () => account(randomUUID())),
    );
    const catalog = (await api().get('/api/subjects').expect(200)).body;
    const subjectIds = catalog.slice(0, 2).map((s: { id: string }) => s.id);
    expect(subjectIds).toHaveLength(2);
    for (const person of [student, otherStudent, tutor]) {
      await api()
        .post('/api/onboarding')
        .set(person.headers)
        .send({
          name: person.name,
          phone: '0812345678',
          bio: 'Discovery test',
          ...(person === tutor
            ? {
                role: 'tutor',
                education: 'Degree',
                experienceYears: 3,
                hourlyRate: 400,
                teachings: subjectIds.map((subjectId: string) => ({
                  subjectId,
                  skillLevel: 'Advanced',
                })),
              }
            : { role: 'student', gradeLevel: 'Grade 8' }),
        })
        .expect(201);
    }
    const visible = async (person = student) => {
      const response = await api()
        .get('/api/tutors')
        .set(person.headers)
        .expect(200);
      expect(response.headers['cache-control']).toBe('no-store');
      return response.body.some((row: { id: string }) => row.id === tutor.id);
    };
    const interest = async (subjectId = subjectIds[0]) =>
      (
        await api()
          .post('/api/interests')
          .set(student.headers)
          .send({ tutorId: tutor.id, subjectId })
          .expect(201)
      ).body.id as string;
    const change = (id: string, action: string) =>
      api().post(`/api/interests/${id}/${action}`).set(student.headers);
    const propose = (id: string) =>
      api()
        .post(`/api/interests/${id}/proposal`)
        .set(tutor.headers)
        .send({ date: '2099-02-01', start: 120, end: 150 })
        .expect(201);
    const confirm = async () => {
      const id = await interest();
      await propose(id);
      return (await change(id, 'confirm').expect(201)).body.id as string;
    };
    const cancel = (id: string) =>
      api().post(`/api/matches/${id}/cancel`).set(student.headers);

    expect(await visible()).toBe(true);
    const pending = await interest();
    expect(await visible()).toBe(false);
    expect(await visible(otherStudent)).toBe(true);
    expect(await visible(tutor)).toBe(true);
    expect(
      (await api().get('/api/tutors').expect(200)).body.some(
        (row: { id: string }) => row.id === tutor.id,
      ),
    ).toBe(true);

    const secondSubject = await interest(subjectIds[1]);
    await change(pending, 'withdraw').expect(201);
    expect(await visible()).toBe(false);
    await change(secondSubject, 'withdraw').expect(201);
    expect(await visible()).toBe(true);

    const offered = await interest();
    await propose(offered);
    expect(await visible()).toBe(false);
    await change(offered, 'reject').expect(201);
    expect(await visible()).toBe(true);

    const cancelled = await confirm();
    expect(await visible()).toBe(false);
    await cancel(cancelled).expect(201);
    expect(await visible()).toBe(true);

    const completed = await confirm();
    const complete = (person = student) =>
      api().post(`/api/matches/${completed}/complete`).set(person.headers);
    await complete().expect(409);
    await testPool.query(
      "update time_slots set starts_at=now()-interval '1 hour', ends_at=now()+interval '1 hour' where id=(select time_slot_id from matches where id=$1)",
      [completed],
    );
    expect(await visible()).toBe(false);
    await complete().expect(409);
    await testPool.query(
      "update time_slots set ends_at=now()-interval '1 minute' where id=(select time_slot_id from matches where id=$1)",
      [completed],
    );
    expect(await visible()).toBe(false);
    const readMatch = async (person = student) => {
      const lessons = (
        await api().get('/api/matches').set(person.headers).expect(200)
      ).body;
      return lessons.find((row: { id: string }) => row.id === completed);
    };
    expect(await readMatch()).toMatchObject({ status: 'confirmed', contact: null });
    expect(await readMatch(tutor)).toMatchObject({ status: 'confirmed', contact: null });
    await complete(tutor).expect(403);
    await complete(otherStudent).expect(404);
    await Promise.all([complete().expect(201), complete().expect(201)]);
    expect(await readMatch()).toMatchObject({ status: 'completed', contact: null });
    expect(await readMatch(tutor)).toMatchObject({ status: 'completed', contact: null });
    expect(await visible()).toBe(false);
    await cancel(completed).expect(409);

    const laterOffer = await interest();
    await propose(laterOffer);
    await change(laterOffer, 'reject').expect(201);
    expect(await visible()).toBe(false);
    const laterMatch = await confirm();
    await cancel(laterMatch).expect(201);
    expect(await visible()).toBe(false);
    expect(await visible(otherStudent)).toBe(true);
  });
  it.each(
    ['student', 'tutor'].flatMap((shared) =>
      [
        { range: 'identical', start: 60, end: 120 },
        { range: 'partial', start: 90, end: 150 },
        { range: 'contained', start: 90, end: 120 },
        { range: 'surrounding', start: 30, end: 150 },
      ].map((proposal) => ({ shared, ...proposal })),
    ),
  )(
    'rejects simultaneous $range overlaps sharing a $shared and preserves other offers',
    async ({ shared: overlap, start, end }) => {
      const people = await Promise.all(
        Array.from({ length: 4 }, () => account(randomUUID())),
      );
      const [s1, s2, t1, t2] = people,
        students = [s1, s2],
        tutors = [t1, t2];
      const subjectId = (await api().get('/api/subjects')).body[0].id;
      const photos = [0, 1].map(
        (value) =>
          'data:image/jpeg;base64,' +
          Buffer.from([255, 216, 255, value, 255, 217]).toString('base64'),
      );
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
            photos,
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
      expect(publicTutor.photos).toEqual(photos);
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
        expect(preview.student.photos).toEqual(photos);
        expect(preview.tutor).toMatchObject({ id: t.id, name: t.name });
        expect(preview.tutor.photos).toEqual(photos);
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
          .send({
            date: '2099-01-01',
            start: index === 0 ? 60 : start,
            end: index === 0 ? 120 : end,
          })
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
      expect(own.body[0].student.photos).toEqual(photos);
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
          .send({ date: '2099-01-01', start: 90, end: 120 })
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
        expect(
          (
            await testPool.query(
              'select slot_status from time_slots where id=(select time_slot_id from matches where id=$1)',
              [match],
            )
          ).rows[0].slot_status,
        ).toBe('cancelled');
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
      ).toBe('proposed');
    },
  );
  it.each([
    ['student', 'adjacent'],
    ['tutor', 'adjacent'],
    ['student', 'different dates'],
    ['tutor', 'different dates'],
    ['student', 'midnight'],
    ['tutor', 'midnight'],
  ])(
    'allows simultaneous non-overlapping confirmations sharing a %s (%s)',
    async (shared, schedule) => {
      const people = await Promise.all(
        Array.from({ length: 4 }, () => account(randomUUID())),
      );
      const [s1, s2, t1, t2] = people;
      const subjectId = (await api().get('/api/subjects')).body[0].id;
      for (const person of people) {
        const role = person === s1 || person === s2 ? 'student' : 'tutor';
        await api()
          .post('/api/onboarding')
          .set(person.headers)
          .send({
            role,
            name: person.name,
            phone: '0812345678',
            bio: 'My bio',
            ...(role === 'student'
              ? { gradeLevel: 'Grade 8' }
              : {
                  education: 'Degree',
                  experienceYears: 3,
                  hourlyRate: 400,
                  teachings: [{ subjectId, skillLevel: 'Advanced' }],
                }),
          })
          .expect(201);
      }
      const pairs = [
        [s1, t1],
        [shared === 'student' ? s1 : s2, shared === 'tutor' ? t1 : t2],
      ];
      const ids: string[] = [];
      for (const [index, [student, tutor]] of pairs.entries()) {
        const { body } = await api()
          .post('/api/interests')
          .set(student.headers)
          .send({ tutorId: tutor.id, subjectId })
          .expect(201);
        ids.push(body.id);
        const date =
          index === 1 && schedule !== 'adjacent' ? '2099-01-02' : '2099-01-01';
        const start =
          schedule === 'midnight'
            ? index === 0
              ? 1410
              : 0
            : schedule === 'adjacent' && index === 1
              ? 90
              : 60;
        await api()
          .post('/api/interests/' + body.id + '/proposal')
          .set(tutor.headers)
          .send({ date, start, end: start + 30 })
          .expect(201);
      }
      const results = await Promise.all(
        pairs.map(([student], index) =>
          api()
            .post('/api/interests/' + ids[index] + '/confirm')
            .set(student.headers),
        ),
      );
      expect(results.map((result) => result.status)).toEqual([201, 201]);
      const participant = shared === 'student' ? s1 : t1;
      const { body: matches } = await api()
        .get('/api/matches')
        .set(participant.headers)
        .expect(200);
      expect(matches).toHaveLength(2);

      // A later confirmation must also leave a pending request untouched.
      const { body: pending } = await api()
        .post('/api/interests')
        .set(s1.headers)
        .send({ tutorId: t1.id, subjectId })
        .expect(201);
      const nextStudent = shared === 'student' ? s1 : s2;
      const nextTutor = shared === 'student' ? t2 : t1;
      const { body: next } = await api()
        .post('/api/interests')
        .set(nextStudent.headers)
        .send({ tutorId: nextTutor.id, subjectId })
        .expect(201);
      await api()
        .post('/api/interests/' + next.id + '/proposal')
        .set(nextTutor.headers)
        .send({ date: '2099-02-01', start: 60, end: 90 })
        .expect(201);
      await api()
        .post('/api/interests/' + next.id + '/confirm')
        .set(nextStudent.headers)
        .expect(201);
      const { body: interests } = await api()
        .get('/api/interests')
        .set(s1.headers)
        .expect(200);
      expect(
        interests.find((item: { id: string }) => item.id === pending.id).status,
      ).toBe('pending');
    },
  );
});
