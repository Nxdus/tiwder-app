import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Inject,
  Injectable,
  Param,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { and, eq, inArray, or } from 'drizzle-orm';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { AuthService, clearSessionCookie, type Identity } from './auth.js';
import { DatabaseService } from './database/database.service.js';
import {
  deletedAccounts,
  matches,
  sessions,
  students,
  swipes,
  teachings,
  timeSlots,
  tutors,
  users,
} from './database/schema.js';
import { parse } from './profile.js';

@Injectable()
export class AccountService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
  ) {}

  async delete(user: Identity, body: unknown) {
    const { email } = parse(
      z.object({ email: z.string().trim().email() }).strict(),
      body,
    );
    for (let attempt = 0; ; attempt++) {
      try {
        await this.database.db.transaction(async (tx) => {
          const [current] = await tx
            .select()
            .from(users)
            .where(eq(users.id, user.id))
            .for('update');
          if (!current) throw new UnauthorizedException();
          if (email !== current.email)
            throw new BadRequestException('Email does not match your account');

          const ownInterests = or(
            eq(swipes.studentId, user.id),
            eq(swipes.tutorId, user.id),
          );
          const ownMatches = or(
            eq(matches.studentId, user.id),
            eq(matches.tutorId, user.id),
          );
          const interests = await tx.select().from(swipes).where(ownInterests);
          const lessons = await tx.select().from(matches).where(ownMatches);
          // Keep only anonymous notices; no old account ID or profile survives.
          const accountId = randomUUID();
          const notices = new Map<
            string,
            typeof deletedAccounts.$inferInsert
          >();
          for (const [kind, rows] of [
            ['interests', interests],
            ['matches', lessons],
          ] as const) {
            for (const row of rows) {
              const ownerId =
                row.studentId === user.id ? row.tutorId : row.studentId;
              notices.set(`${ownerId}:${kind}`, { ownerId, accountId, kind });
            }
          }
          if (notices.size)
            await tx.insert(deletedAccounts).values([...notices.values()]);
          await tx.delete(matches).where(ownMatches);
          if (lessons.length)
            await tx.delete(timeSlots).where(
              inArray(
                timeSlots.id,
                lessons.map((m) => m.timeSlotId),
              ),
            );
          await tx.delete(swipes).where(ownInterests);
          await tx.delete(timeSlots).where(eq(timeSlots.tutorId, user.id));
          await tx.delete(teachings).where(eq(teachings.tutorId, user.id));
          await tx.delete(students).where(eq(students.userId, user.id));
          await tx.delete(tutors).where(eq(tutors.userId, user.id));
          await tx.delete(sessions).where(eq(sessions.userId, user.id));
          await tx
            .delete(deletedAccounts)
            .where(eq(deletedAccounts.ownerId, user.id));
          await tx.delete(users).where(eq(users.id, user.id));
        });
        return { deleted: true };
      } catch (error) {
        // A booking or another account deletion may hold the other participant's lock.
        if (
          (error as { cause?: { code?: string } }).cause?.code === '40P01' &&
          attempt < 2
        )
          continue;
        throw error;
      }
    }
  }

  list(user: Identity) {
    return this.database.db
      .select({
        accountId: deletedAccounts.accountId,
        kind: deletedAccounts.kind,
      })
      .from(deletedAccounts)
      .where(eq(deletedAccounts.ownerId, user.id));
  }

  async dismiss(user: Identity, accountId: string) {
    parse(z.uuid(), accountId);
    await this.database.db
      .delete(deletedAccounts)
      .where(
        and(
          eq(deletedAccounts.ownerId, user.id),
          eq(deletedAccounts.accountId, accountId),
        ),
      );
    return { deleted: true };
  }
}

@Controller()
export class AccountController {
  constructor(
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(AccountService) private readonly accounts: AccountService,
  ) {}

  @Delete('profile') async delete(
    @Req() req: Request,
    @Body() body: unknown,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.accounts.delete(
      await this.auth.require(req, true),
      body,
    );
    clearSessionCookie(res);
    return result;
  }

  @Get('deleted-accounts') @Header('Cache-Control', 'no-store') async list(
    @Req() req: Request,
  ) {
    return this.accounts.list(await this.auth.require(req));
  }

  @Delete('deleted-accounts/:accountId') async dismiss(
    @Req() req: Request,
    @Param('accountId') accountId: string,
  ) {
    return this.accounts.dismiss(await this.auth.require(req), accountId);
  }
}
