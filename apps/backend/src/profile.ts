import {
  BadRequestException,
  ConflictException,
  Controller,
  ForbiddenException,
  Get,
  Post,
  Patch,
  Body,
  Req,
  Inject,
  Header,
  Injectable,
} from '@nestjs/common';
import { eq, asc, and, inArray, notExists, sql } from 'drizzle-orm';
import { z } from 'zod';
import type { Request } from 'express';
import { AuthService, type Identity } from './auth.js';
import { DatabaseService } from './database/database.service.js';
import { profilePhotosSchema } from './profile-photos.js';
import {
  users,
  students,
  tutors,
  teachings,
  skill,
  subjects,
  categories,
  contains,
  swipes,
  matches,
} from './database/schema.js';
export function parse<T>(schema: z.ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success)
    throw new BadRequestException(
      result.error.issues.map((i) => i.path.join('.') + ' ' + i.message),
    );
  return result.data;
}
const words = (max: number) => z.string().trim().min(1).max(max);
const common = {
  role: z.enum(['student', 'tutor']),
  name: words(200),
  phone: z
    .string()
    .trim()
    .min(5)
    .max(32)
    .regex(/^[+\d][\d ()-]+$/),
  bio: words(5000),
};
const student = z.object({
  ...common,
  role: z.literal('student'),
  gradeLevel: words(200),
});
const tutor = z.object({
  ...common,
  role: z.literal('tutor'),
  education: words(1000),
  experienceYears: z.number().int().min(0).max(100),
  hourlyRate: z.number().positive().max(100000).multipleOf(0.01),
  teachings: z
    .array(
      z.object({ subjectId: z.uuid(), skillLevel: z.enum(skill.enumValues) }),
    )
    .min(1)
    .refine(
      (xs) => new Set(xs.map((x) => x.subjectId)).size === xs.length,
      'Duplicate subject',
    ),
});
const profileSchema = z.discriminatedUnion('role', [student, tutor]);
const subjectSchema = z
  .object({
    name: words(100),
    categoryId: z.uuid().optional(),
  })
  .strict();
@Injectable()
export class ProfileService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
  ) {}
  async catalog() {
    const rows = await this.database.db
      .select({
        id: subjects.id,
        name: subjects.name,
        categoryId: categories.id,
        category: categories.name,
      })
      .from(subjects)
      .leftJoin(contains, eq(subjects.id, contains.subjectId))
      .leftJoin(categories, eq(categories.id, contains.categoryId))
      .orderBy(asc(subjects.name), asc(categories.name));
    const catalog = new Map<
      string,
      { id: string; name: string; categories: { id: string; name: string }[] }
    >();
    for (const r of rows) {
      const subject = catalog.get(r.id) ?? {
        id: r.id,
        name: r.name,
        categories: [],
      };
      if (r.categoryId && r.category)
        subject.categories.push({ id: r.categoryId, name: r.category });
      catalog.set(r.id, subject);
    }
    return [...catalog.values()];
  }
  async createSubject(user: Identity, body: unknown) {
    if (user.role === 'student') {
      throw new ForbiddenException('Only tutors can add subjects');
    }
    const { name, categoryId } = parse(subjectSchema, body);
    const normalizedName = name.replace(/\s+/g, ' ');
    const subjectId = await this.database.db.transaction(async (tx) => {
      const [existing] = await tx
        .select({ id: subjects.id })
        .from(subjects)
        .where(sql`lower(${subjects.name}) = ${normalizedName.toLowerCase()}`);
      if (existing) return existing.id;

      let resolvedCategoryId = categoryId;
      if (resolvedCategoryId) {
        const [category] = await tx
          .select({ id: categories.id })
          .from(categories)
          .where(eq(categories.id, resolvedCategoryId));
        if (!category) throw new BadRequestException('Unknown category');
      } else {
        const [other] = await tx
          .select({ id: categories.id })
          .from(categories)
          .where(sql`lower(${categories.name}) = 'other'`);
        if (other) {
          resolvedCategoryId = other.id;
        } else {
          await tx
            .insert(categories)
            .values({ name: 'Other' })
            .onConflictDoNothing();
          const [createdCategory] = await tx
            .select({ id: categories.id })
            .from(categories)
            .where(sql`lower(${categories.name}) = 'other'`);
          resolvedCategoryId = createdCategory?.id;
        }
      }

      const [inserted] = await tx
        .insert(subjects)
        .values({ name: normalizedName })
        .onConflictDoNothing()
        .returning({ id: subjects.id });
      const id =
        inserted?.id ??
        (
          await tx
            .select({ id: subjects.id })
            .from(subjects)
            .where(
              sql`lower(${subjects.name}) = ${normalizedName.toLowerCase()}`,
            )
        )[0]?.id;
      if (!id) throw new ConflictException('Subject already exists');
      if (resolvedCategoryId) {
        await tx
          .insert(contains)
          .values({ subjectId: id, categoryId: resolvedCategoryId })
          .onConflictDoNothing();
      }
      return id;
    });
    const catalog = await this.catalog();
    return catalog.find((s) => s.id === subjectId)!;
  }
  async tutors(user: Identity | null = null) {
    const studentId = user?.role === 'student' ? user.id : null;
    const [people, entries, catalog] = await Promise.all([
      this.database.db
        .select({
          id: users.id,
          name: users.name,
          avatarUrl: users.avatarUrl,
          photos: users.photos,
          bio: tutors.bio,
          education: tutors.education,
          experienceYears: tutors.experienceYears,
          hourlyRate: tutors.hourlyRate,
        })
        .from(users)
        .innerJoin(tutors, eq(tutors.userId, users.id))
        .where(
          and(
            eq(users.onboarded, true),
            eq(users.role, 'tutor'),
            studentId
              ? and(
                  notExists(
                    this.database.db
                      .select({ id: swipes.id })
                      .from(swipes)
                      .where(
                        and(
                          eq(swipes.studentId, studentId),
                          eq(swipes.tutorId, users.id),
                          inArray(swipes.status, ['pending', 'proposed']),
                        ),
                      ),
                  ),
                  notExists(
                    this.database.db
                      .select({ id: matches.id })
                      .from(matches)
                      .where(
                        and(
                          eq(matches.studentId, studentId),
                          eq(matches.tutorId, users.id),
                          inArray(matches.status, ['confirmed', 'completed']),
                        ),
                      ),
                  ),
                )
              : undefined,
          ),
        )
        .orderBy(asc(users.name), asc(users.id)),
      this.database.db.select().from(teachings),
      this.catalog(),
    ]);
    return people.map((p) => ({
      ...p,
      teachings: entries
        .filter((e) => e.tutorId === p.id)
        .map(({ subjectId, skillLevel }) => ({
          subjectId,
          skillLevel,
          subject: catalog.find((s) => s.id === subjectId),
        })),
    }));
  }
  async profile(id: string) {
    const [[row], entries] = await Promise.all([
      this.database.db.select().from(users).where(eq(users.id, id)),
      this.database.db
        .select({
          subjectId: teachings.subjectId,
          skillLevel: teachings.skillLevel,
        })
        .from(teachings)
        .where(eq(teachings.tutorId, id)),
    ]);
    const { googleSub: _, ...profile } = row;
    const table = row.role === 'student' ? students : tutors;
    const [details] = await this.database.db
      .select()
      .from(table)
      .where(eq(table.userId, id));
    const { userId: _userId, ...fields } = details ?? { userId: id };
    return {
      ...profile,
      gradeLevel: null,
      education: null,
      experienceYears: null,
      hourlyRate: null,
      ...fields,
      phone: details?.phone ?? null,
      bio: details?.bio ?? null,
      teachings: entries,
    };
  }
  async save(user: Identity, body: unknown, onboarding: boolean) {
    const updates = parse(
      z
        .object({
          ...common,
          gradeLevel: words(200),
          education: tutor.shape.education,
          experienceYears: tutor.shape.experienceYears,
          hourlyRate: tutor.shape.hourlyRate,
          teachings: tutor.shape.teachings,
          photos: profilePhotosSchema,
        })
        .partial()
        .strict(),
      body,
    );
    await this.database.db.transaction(async (tx) => {
      const [current] = await tx
        .select()
        .from(users)
        .where(eq(users.id, user.id))
        .for('update');
      if (onboarding && current.onboarded)
        throw new ConflictException('Already onboarded');
      if (current.role && updates.role && updates.role !== current.role)
        throw new ConflictException('Role cannot change');
      const entries = await tx
        .select()
        .from(teachings)
        .where(eq(teachings.tutorId, user.id));
      const table = current.role === 'student' ? students : tutors;
      const [details] = await tx
        .select()
        .from(table)
        .where(eq(table.userId, user.id));
      const data = parse(profileSchema, {
        ...current,
        ...details,
        ...updates,
        teachings: updates.teachings ?? entries,
      });
      await tx
        .update(users)
        .set({
          name: data.name,
          role: data.role,
          onboarded: true,
          ...(updates.photos !== undefined ? { photos: updates.photos } : {}),
        })
        .where(eq(users.id, user.id));
      if (data.role === 'student') {
        const fields = {
          phone: data.phone,
          bio: data.bio,
          gradeLevel: data.gradeLevel,
        };
        await tx
          .insert(students)
          .values({ userId: user.id, ...fields })
          .onConflictDoUpdate({ target: students.userId, set: fields });
      } else {
        const { teachings: next, name: _name, role: _role, ...fields } = data;
        const catalog = new Set(
          (await tx.select({ id: subjects.id }).from(subjects)).map(
            (s) => s.id,
          ),
        );
        if (next.some((e) => !catalog.has(e.subjectId)))
          throw new BadRequestException('Unknown subject');
        await tx
          .insert(tutors)
          .values({ userId: user.id, ...fields })
          .onConflictDoUpdate({ target: tutors.userId, set: fields });
        await tx.delete(teachings).where(eq(teachings.tutorId, user.id));
        await tx
          .insert(teachings)
          .values(next.map((e) => ({ ...e, tutorId: user.id })));
      }
    });
    return this.profile(user.id);
  }
}
@Controller()
export class ProfileController {
  constructor(
    @Inject(ProfileService) private readonly profiles: ProfileService,
    @Inject(AuthService) private readonly auth: AuthService,
  ) {}
  @Get('subjects') @Header('Cache-Control', 'no-store') subjects() {
    return this.profiles.catalog();
  }
  @Post('subjects') async createSubject(
    @Req() req: Request,
    @Body() body: unknown,
  ) {
    return this.profiles.createSubject(
      await this.auth.require(req, true),
      body,
    );
  }
  @Get('tutors') @Header('Cache-Control', 'no-store') async tutors(
    @Req() req: Request,
  ) {
    return this.profiles.tutors((await this.auth.session(req)).user);
  }
  @Get('profile') @Header('Cache-Control', 'no-store') async profile(
    @Req() req: Request,
  ) {
    return this.profiles.profile((await this.auth.require(req, true)).id);
  }
  @Patch('profile') async patch(@Req() req: Request, @Body() body: unknown) {
    return this.profiles.save(await this.auth.require(req, true), body, false);
  }
  @Post('onboarding') async onboard(
    @Req() req: Request,
    @Body() body: unknown,
  ) {
    return this.profiles.save(await this.auth.require(req, true), body, true);
  }
}
