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
import { and, eq, inArray, or, sql, asc, lt, gt } from 'drizzle-orm';
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
  swipes,
  timeSlots,
  matches,
} from './database/schema.js';

type Tx = Parameters<Parameters<DatabaseService['db']['transaction']>[0]>[0];
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
        photos: users.photos,
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
        photos: users.photos,
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
  const participants = await tx
    .select({ id: users.id })
    .from(users)
    .where(inArray(users.id, [studentId, tutorId]))
    .orderBy(asc(users.id))
    .for('update');
  if (participants.length !== 2)
    throw new NotFoundException('This account has been deleted');
}
async function expire(tx: Tx, ids: string[]) {
  await tx
    .update(swipes)
    .set({ status: 'expired', updatedAt: new Date() })
    .where(
      and(
        eq(swipes.status, 'proposed'),
        or(inArray(swipes.studentId, ids), inArray(swipes.tutorId, ids)),
        sql`((${swipes.date}::timestamp + ${swipes.start} * interval '1 minute') at time zone 'Asia/Bangkok') <= clock_timestamp()`,
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
        .insert(swipes)
        .values({
          ...offer,
          hourlyRate: offer.hourlyRate,
          studentName: user.name,
          studentId: user.id,
          tutorId,
          subjectId,
        })
        .returning({ id: swipes.id });
      return row;
    });
  }
  async list(user: Identity) {
    return this.transaction(async (tx) => {
      await expire(tx, [user.id]);
      const rows = await tx
        .select()
        .from(swipes)
        .where(
          eq(
            user.role === 'student' ? swipes.studentId : swipes.tutorId,
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
        user.role === 'student' ? swipes.studentId : swipes.tutorId,
        user.id,
      );
      const where = and(eq(swipes.id, id), own);
      const [initial] = await tx.select().from(swipes).where(where);
      if (!initial) throw new NotFoundException();
      await lockPair(tx, initial.studentId, initial.tutorId);
      const [row] = await tx
        .select()
        .from(swipes)
        .where(where)
        .for('update');
      if (!row) throw new NotFoundException();
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
        const startsAt = slotTime(row.date, row.start);
        const endsAt = slotTime(row.date, row.end);
        const [active] = await tx
          .select({ id: matches.id })
          .from(matches)
          .innerJoin(timeSlots, eq(timeSlots.id, matches.timeSlotId))
          .where(
            and(
              eq(matches.status, 'confirmed'),
              or(
                eq(matches.studentId, row.studentId),
                eq(matches.tutorId, row.tutorId),
              ),
              lt(timeSlots.startsAt, endsAt),
              gt(timeSlots.endsAt, startsAt),
            ),
          );
        if (active)
          throw new ConflictException(
            'This lesson overlaps another confirmed lesson for the student or tutor',
          );
        const [slot] = await tx
          .insert(timeSlots)
          .values({
            tutorId: row.tutorId,
            date: row.date,
            start: row.start,
            end: row.end,
            startsAt,
            endsAt,
            status: 'booked',
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
          .update(swipes)
          .set({ status: 'confirmed', updatedAt: new Date() })
          .where(where);
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
          .update(swipes)
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
          .update(swipes)
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
      const rows = await tx
        .select({
          id: matches.id,
          status: matches.status,
          studentId: swipes.studentId,
          studentName: swipes.studentName,
          tutorId: swipes.tutorId,
          tutorName: swipes.tutorName,
          subjectId: swipes.subjectId,
          subjectName: swipes.subjectName,
          skillLevel: swipes.skillLevel,
          hourlyRate: swipes.hourlyRate,
          date: timeSlots.date,
          start: timeSlots.start,
          end: timeSlots.end,
          ended: sql<boolean>`${timeSlots.endsAt} <= current_timestamp`,
          email: users.email,
          phone: sql<string>`coalesce(${tutors.phone}, ${students.phone})`,
          matchedAt: matches.matchedAt,
          updatedAt: matches.updatedAt,
        })
        .from(matches)
        .innerJoin(swipes, eq(swipes.id, matches.interestId))
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
        )
        .orderBy(
          sql`case
            when ${matches.status} = 'confirmed' and ${timeSlots.endsAt} <= current_timestamp then 2
            when ${matches.status} = 'confirmed' and ${timeSlots.startsAt} <= current_timestamp then 0
            when ${matches.status} = 'confirmed' then 1
            else 3
          end`,
          sql`case when ${matches.status} = 'confirmed' and ${timeSlots.endsAt} > current_timestamp then ${timeSlots.startsAt} end asc`,
          sql`case
            when ${matches.status} = 'cancelled' then ${matches.updatedAt}
            else ${timeSlots.endsAt}
          end desc`,
          asc(matches.id),
        );
      return withProfiles(
        tx,
        rows.map(({ email, phone, ended, ...row }) => ({
          ...row,
          contact: row.status === 'confirmed' && !ended ? { email, phone } : null,
        })),
      );
    });
  }
  async complete(user: Identity, id: string) {
    requireRole(user, 'student');
    parse(z.uuid(), id);
    const ownMatch = and(eq(matches.id, id), eq(matches.studentId, user.id));
    return this.transaction(async (tx) => {
      const [completed] = await tx
        .update(matches)
        .set({ status: 'completed', updatedAt: new Date() })
        .from(timeSlots)
        .where(
          and(
            ownMatch,
            eq(matches.status, 'confirmed'),
            eq(matches.timeSlotId, timeSlots.id),
            sql`${timeSlots.endsAt} <= clock_timestamp()`,
          ),
        )
        .returning({ id: matches.id });
      if (completed) return completed;

      const [match] = await tx
        .select({ status: matches.status })
        .from(matches)
        .where(ownMatch);
      if (!match) throw new NotFoundException();
      if (match.status === 'completed') return { id };
      throw new ConflictException('Lesson can only be confirmed after it ends');
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
        .returning({ id: matches.id, timeSlotId: matches.timeSlotId });
      if (!updated[0]) throw new ConflictException('Match cannot be cancelled');
      await tx
        .update(timeSlots)
        .set({ status: 'cancelled' })
        .where(eq(timeSlots.id, updated[0].timeSlotId));
      return { id: updated[0].id };
    });
  }
}
@Controller()
export class BookingController {
  constructor(
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(BookingService) private readonly booking: BookingService,
  ) {}
  @Get('interests') @Header('Cache-Control', 'no-store') async swipes(
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
  @Post('matches/:id/complete') async complete(
    @Req() req: Request,
    @Param('id') id: string,
  ) {
    return this.booking.complete(await this.auth.require(req), id);
  }
}
