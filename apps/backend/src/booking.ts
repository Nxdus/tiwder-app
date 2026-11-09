import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  Controller,
  Get,
  Post,
  Body,
  Param,
  Req,
  Inject,
  Injectable,
  Header,
} from '@nestjs/common';
import type { Request } from 'express';
import { and, eq, inArray, or, sql, asc } from 'drizzle-orm';
import { z } from 'zod';
import { AuthService, type Identity } from './auth.js';
import { parse } from './profile.js';
import { DatabaseService } from './database/database.service.js';
import {
  users,
  students,
  tutors,
  subjects,
  teachings,
  interests,
  timeSlots,
  matches,
} from './database/schema.js';

type Tx = Parameters<Parameters<DatabaseService['db']['transaction']>[0]>[0];
const live = ['pending', 'proposed'] as const;
async function withProfiles<T extends { studentId: string; tutorId: string }>(
  tx: Tx,
  rows: T[],
) {
  if (!rows.length) return [];
  const [studentRows, tutorRows] = await Promise.all([
    tx
      .select({
        id: users.id,
        name: users.name,
        avatarUrl: users.avatarUrl,
        gradeLevel: students.gradeLevel,
        bio: students.bio,
      })
      .from(users)
      .innerJoin(students, eq(students.userId, users.id))
      .where(inArray(users.id, [...new Set(rows.map((r) => r.studentId))])),
    tx
      .select({
        id: users.id,
        name: users.name,
        avatarUrl: users.avatarUrl,
        education: tutors.education,
        experienceYears: tutors.experienceYears,
        bio: tutors.bio,
      })
      .from(users)
      .innerJoin(tutors, eq(tutors.userId, users.id))
      .where(inArray(users.id, [...new Set(rows.map((r) => r.tutorId))])),
  ]);
  const studentMap = new Map(studentRows.map((p) => [p.id, p]));
  const tutorMap = new Map(tutorRows.map((p) => [p.id, p]));
  return rows.map((row) => ({
    ...row,
    student: studentMap.get(row.studentId),
    tutor: tutorMap.get(row.tutorId),
  }));
}
const minute = z.number().int().min(0).max(1440).multipleOf(30);
export const proposalSchema = z
  .object({ date: z.iso.date(), start: minute, end: minute })
  .strict()
  .refine((p) => p.start < p.end, 'Start must precede end');
function slotTime(date: string, minute: number) {
  return new Date(Date.parse(date + 'T00:00:00+07:00') + minute * 60000);
}
function requireRole(user: Identity, role: Identity['role']) {
  if (user.role !== role) throw new ForbiddenException();
}
async function lockPair(tx: Tx, studentId: string, tutorId: string) {
  await tx
    .select({ id: users.id })
    .from(users)
    .where(inArray(users.id, [studentId, tutorId]))
    .orderBy(asc(users.id))
    .for('update');
}
async function settleMatches(tx: Tx, ids: string[]) {
  const ended = tx
    .select({ id: timeSlots.id })
    .from(timeSlots)
    .where(sql`${timeSlots.endsAt}<=clock_timestamp()`);
  await tx
    .update(matches)
    .set({ status: 'completed', updatedAt: new Date() })
    .where(
      and(
        eq(matches.status, 'confirmed'),
        or(inArray(matches.studentId, ids), inArray(matches.tutorId, ids)),
        inArray(matches.timeSlotId, ended),
      ),
    );
}
async function expire(tx: Tx, ids: string[]) {
  await tx
    .update(interests)
    .set({ status: 'expired', updatedAt: new Date() })
    .where(
      and(
        eq(interests.status, 'proposed'),
        or(inArray(interests.studentId, ids), inArray(interests.tutorId, ids)),
        sql`((${interests.date}::timestamp + ${interests.start} * interval '1 minute') at time zone 'Asia/Bangkok') <= clock_timestamp()`,
      ),
    );
}
@Injectable()
export class BookingService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
  ) {}
  private async transaction<T>(work: (tx: Tx) => Promise<T>): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.database.db.transaction(work);
      } catch (error) {
        const code = (error as { cause?: { code?: string } }).cause?.code;
        if (code === '40P01' && attempt < 2) continue;
        if (code === '23505' || code === '40P01')
          throw new ConflictException(
            'Booking changed. Refresh and try again.',
          );
        throw error;
      }
    }
  }
  async create(user: Identity, body: unknown) {
    requireRole(user, 'student');
    const { tutorId, subjectId } = parse(
      z.object({ tutorId: z.uuid(), subjectId: z.uuid() }).strict(),
      body,
    );
    return this.transaction(async (tx) => {
      await lockPair(tx, user.id, tutorId);
      await expire(tx, [user.id, tutorId]);
      const [offer] = await tx
        .select({
          tutorName: users.name,
          hourlyRate: tutors.hourlyRate,
          skillLevel: teachings.skillLevel,
          subjectName: subjects.name,
        })
        .from(teachings)
        .innerJoin(users, eq(users.id, teachings.tutorId))
        .innerJoin(tutors, eq(tutors.userId, teachings.tutorId))
        .innerJoin(subjects, eq(subjects.id, teachings.subjectId))
        .where(
          and(
            eq(users.role, 'tutor'),
            eq(users.onboarded, true),
            eq(teachings.tutorId, tutorId),
            eq(teachings.subjectId, subjectId),
          ),
        );
      if (!offer || !offer.hourlyRate)
        throw new NotFoundException('Teaching not found');
      const [row] = await tx
        .insert(interests)
        .values({
          ...offer,
          hourlyRate: offer.hourlyRate,
          studentName: user.name,
          studentId: user.id,
          tutorId,
          subjectId,
        })
        .returning({ id: interests.id });
      return row;
    });
  }
  async list(user: Identity) {
    return this.transaction(async (tx) => {
      await expire(tx, [user.id]);
      const rows = await tx
        .select()
        .from(interests)
        .where(
          eq(
            user.role === 'student' ? interests.studentId : interests.tutorId,
            user.id,
          ),
        );
      return withProfiles(
        tx,
        rows.map(({ date, start, end, ...r }) => ({
          ...r,
          proposal: date ? { date, start, end } : null,
        })),
      );
    });
  }
  async change(user: Identity, id: string, action: string, body: unknown) {
    parse(z.uuid(), id);
    if (!['withdraw', 'reject', 'proposal', 'confirm'].includes(action))
      throw new NotFoundException();
    return this.transaction(async (tx) => {
      const own = eq(
        user.role === 'student' ? interests.studentId : interests.tutorId,
        user.id,
      );
      const where = and(eq(interests.id, id), own);
      const [initial] = await tx.select().from(interests).where(where);
      if (!initial) throw new NotFoundException();
      await lockPair(tx, initial.studentId, initial.tutorId);
      const [row] = await tx
        .select()
        .from(interests)
        .where(where)
        .for('update');
      if (row.status !== 'pending' && row.status !== 'proposed')
        throw new ConflictException('Interest already closed');
      if (
        row.date &&
        row.start !== null &&
        slotTime(row.date, row.start).getTime() <= Date.now()
      )
        throw new ConflictException('Proposal expired');
      if (action === 'confirm') {
        requireRole(user, 'student');
        if (
          row.status !== 'proposed' ||
          !row.date ||
          row.start === null ||
          row.end === null
        )
          throw new ConflictException('No proposal to confirm');
        const participants = [row.studentId, row.tutorId];
        await settleMatches(tx, participants);
        const [active] = await tx
          .select({ id: matches.id })
          .from(matches)
          .where(
            and(
              eq(matches.status, 'confirmed'),
              or(
                eq(matches.studentId, row.studentId),
                eq(matches.tutorId, row.tutorId),
              ),
            ),
          );
        if (active)
          throw new ConflictException(
            'Participant already has an active match',
          );
        const [slot] = await tx
          .insert(timeSlots)
          .values({
            tutorId: row.tutorId,
            date: row.date,
            start: row.start,
            end: row.end,
            startsAt: slotTime(row.date, row.start),
            endsAt: slotTime(row.date, row.end),
          })
          .returning({ id: timeSlots.id });
        const [match] = await tx
          .insert(matches)
          .values({
            interestId: id,
            studentId: row.studentId,
            tutorId: row.tutorId,
            timeSlotId: slot.id,
          })
          .returning({ id: matches.id });
        await tx
          .update(interests)
          .set({ status: 'confirmed', updatedAt: new Date() })
          .where(where);
        await tx
          .update(interests)
          .set({ status: 'closed', updatedAt: new Date() })
          .where(
            and(
              inArray(interests.status, [...live]),
              or(
                eq(interests.studentId, row.studentId),
                eq(interests.tutorId, row.tutorId),
              ),
            ),
          );
        return match;
      }
      if (action === 'proposal') {
        requireRole(user, 'tutor');
        if (row.status !== 'pending')
          throw new ConflictException('Proposal already sent');
        const p = parse(proposalSchema, body);
        if (slotTime(p.date, p.start).getTime() <= Date.now())
          throw new BadRequestException('Start must be in the future');
        await tx
          .update(interests)
          .set({ ...p, status: 'proposed', updatedAt: new Date() })
          .where(where);
      } else {
        if (action === 'withdraw') {
          requireRole(user, 'student');
          if (row.status !== 'pending')
            throw new ConflictException(
              'Only pending interests can be withdrawn',
            );
        } else if (
          (user.role === 'student' && row.status !== 'proposed') ||
          (user.role === 'tutor' && row.status !== 'pending')
        )
          throw new ConflictException(
            'Interest cannot be rejected in this state',
          );
        await tx
          .update(interests)
          .set({
            status: action === 'withdraw' ? 'withdrawn' : 'rejected',
            updatedAt: new Date(),
          })
          .where(where);
      }
      return { id };
    });
  }
  async matches(user: Identity) {
    return this.transaction(async (tx) => {
      await settleMatches(tx, [user.id]);
      const rows = await tx
        .select({
          id: matches.id,
          status: matches.status,
          studentId: interests.studentId,
          studentName: interests.studentName,
          tutorId: interests.tutorId,
          tutorName: interests.tutorName,
          subjectId: interests.subjectId,
          subjectName: interests.subjectName,
          skillLevel: interests.skillLevel,
          hourlyRate: interests.hourlyRate,
          date: timeSlots.date,
          start: timeSlots.start,
          end: timeSlots.end,
          email: users.email,
          phone: sql<string>`coalesce(${tutors.phone}, ${students.phone})`,
          matchedAt: matches.matchedAt,
          updatedAt: matches.updatedAt,
        })
        .from(matches)
        .innerJoin(interests, eq(interests.id, matches.interestId))
        .innerJoin(timeSlots, eq(timeSlots.id, matches.timeSlotId))
        .innerJoin(
          users,
          eq(
            users.id,
            user.role === 'student' ? matches.tutorId : matches.studentId,
          ),
        )
        .leftJoin(tutors, eq(tutors.userId, users.id))
        .leftJoin(students, eq(students.userId, users.id))
        .where(
          eq(
            user.role === 'student' ? matches.studentId : matches.tutorId,
            user.id,
          ),
        );
      return withProfiles(
        tx,
        rows.map(({ email, phone, ...row }) => ({
          ...row,
          contact: row.status === 'confirmed' ? { email, phone } : null,
        })),
      );
    });
  }
  async cancel(user: Identity, id: string) {
    parse(z.uuid(), id);
    return this.transaction(async (tx) => {
      const [row] = await tx
        .select({
          id: matches.id,
          student: matches.studentId,
          tutor: matches.tutorId,
          startsAt: timeSlots.startsAt,
        })
        .from(matches)
        .innerJoin(timeSlots, eq(timeSlots.id, matches.timeSlotId))
        .where(
          and(
            eq(matches.id, id),
            eq(
              user.role === 'student' ? matches.studentId : matches.tutorId,
              user.id,
            ),
          ),
        );
      if (!row) throw new NotFoundException();
      await lockPair(tx, row.student, row.tutor);
      const updated = await tx
        .update(matches)
        .set({ status: 'cancelled', updatedAt: new Date() })
        .where(
          and(
            eq(matches.id, id),
            eq(matches.status, 'confirmed'),
            sql`clock_timestamp()<${row.startsAt.toISOString()}::timestamptz`,
          ),
        )
        .returning({ id: matches.id });
      if (!updated[0]) throw new ConflictException('Match cannot be cancelled');
      return updated[0];
    });
  }
}
@Controller()
export class BookingController {
  constructor(
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(BookingService) private readonly booking: BookingService,
  ) {}
  @Get('interests') @Header('Cache-Control', 'no-store') async interests(
    @Req() req: Request,
  ) {
    return this.booking.list(await this.auth.require(req));
  }
  @Post('interests') async create(@Req() req: Request, @Body() b: unknown) {
    return this.booking.create(await this.auth.require(req), b);
  }
  @Post('interests/:id/:action') async change(
    @Req() req: Request,
    @Param('id') id: string,
    @Param('action') action: string,
    @Body() b: unknown,
  ) {
    return this.booking.change(await this.auth.require(req), id, action, b);
  }
  @Get('matches') @Header('Cache-Control', 'no-store') async matches(
    @Req() req: Request,
  ) {
    return this.booking.matches(await this.auth.require(req));
  }
  @Post('matches/:id/cancel') async cancel(
    @Req() req: Request,
    @Param('id') id: string,
  ) {
    return this.booking.cancel(await this.auth.require(req), id);
  }
}
