import { sql } from 'drizzle-orm';
import {
  boolean,
  date,
  integer,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

const id = () => uuid().primaryKey().defaultRandom();
const instant = () => timestamp({ withTimezone: true }).notNull();
export const role = pgEnum('role', ['student', 'tutor']);
export const skill = pgEnum('skill_level', [
  'Beginner',
  'Intermediate',
  'Advanced',
]);
export const interestStatus = pgEnum('interest_status', [
  'pending',
  'proposed',
  'rejected',
  'withdrawn',
  'closed',
  'confirmed',
  'expired',
]);
export const matchStatus = pgEnum('match_status', [
  'confirmed',
  'completed',
  'cancelled',
]);
export const users = pgTable('users', {
  id: id(),
  googleSub: text('google_sub').unique().notNull(),
  email: text().notNull(),
  name: text().notNull(),
  avatarUrl: text('avatar_url'),
  photos: text('photos').array().notNull().default(sql`'{}'::text[]`),
  role: role(),
  onboarded: boolean().notNull().default(false),
});
const userRef = (name: string) =>
  uuid(name)
    .notNull()
    .references(() => users.id);
export const students = pgTable('students', {
  userId: userRef('user_id').primaryKey(),
  phone: text().notNull(),
  bio: text().notNull(),
  gradeLevel: text('grade_level').notNull(),
});
export const tutors = pgTable('tutors', {
  userId: userRef('user_id').primaryKey(),
  phone: text().notNull(),
  bio: text().notNull(),
  education: text().notNull(),
  experienceYears: integer('experience_years').notNull(),
  hourlyRate: numeric('hourly_rate', {
    precision: 10,
    scale: 2,
    mode: 'number',
  }).notNull(),
});
export const sessions = pgTable('sessions', {
  tokenHash: text('token_hash').primaryKey(),
  userId: userRef('user_id'),
  csrf: text().notNull(),
  expiresAt: instant(),
});
export const oauthTransactions = pgTable('oauth_transactions', {
  state: text().primaryKey(),
  browserHash: text('browser_hash').notNull(),
  verifier: text().notNull(),
  nonce: text().notNull(),
  expiresAt: instant(),
});
export const categories = pgTable('categories', {
  id: id(),
  name: text().unique().notNull(),
  description: text().notNull().default(''),
});
export const subjects = pgTable('subjects', {
  id: id(),
  name: text().unique().notNull(),
  description: text().notNull().default(''),
});
const subjectRef = () =>
  uuid('subject_id')
    .notNull()
    .references(() => subjects.id);
export const subjectCategories = pgTable(
  'subject_categories',
  {
    subjectId: subjectRef(),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id),
  },
  (t) => [primaryKey({ columns: [t.subjectId, t.categoryId] })],
);
export const teachings = pgTable(
  'teachings',
  {
    tutorId: userRef('tutor_id'),
    subjectId: subjectRef(),
    skillLevel: skill('skill_level').notNull(),
  },
  (t) => [primaryKey({ columns: [t.tutorId, t.subjectId] })],
);
export const interests = pgTable(
  'interests',
  {
    id: id(),
    status: interestStatus().notNull().default('pending'),
    swipedAt: timestamp('swiped_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    studentId: userRef('student_id'),
    tutorId: userRef('tutor_id'),
    subjectId: subjectRef(),
    studentName: text('student_name').notNull(),
    tutorName: text('tutor_name').notNull(),
    subjectName: text('subject_name').notNull(),
    skillLevel: skill('skill_level').notNull(),
    hourlyRate: numeric('hourly_rate', {
      precision: 10,
      scale: 2,
      mode: 'number',
    }).notNull(),
    date: date(),
    start: integer(),
    end: integer(),
  },
  (t) => [
    uniqueIndex('one_open_interest')
      .on(t.studentId, t.tutorId, t.subjectId)
      .where(sql`status in ('pending','proposed')`),
  ],
);
export const timeSlots = pgTable('time_slots', {
  id: id(),
  tutorId: uuid('tutor_id')
    .notNull()
    .references(() => tutors.userId),
  date: date().notNull(),
  start: integer().notNull(),
  end: integer().notNull(),
  startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
  endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
});
export const matches = pgTable(
  'matches',
  {
    id: id(),
    interestId: uuid('interest_id')
      .notNull()
      .unique()
      .references(() => interests.id),
    studentId: userRef('student_id'),
    tutorId: userRef('tutor_id'),
    timeSlotId: uuid('time_slot_id')
      .unique()
      .notNull()
      .references(() => timeSlots.id),
    status: matchStatus().notNull().default('confirmed'),
    matchedAt: timestamp('matched_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('active_student')
      .on(t.studentId)
      .where(sql`status='confirmed'`),
    uniqueIndex('active_tutor')
      .on(t.tutorId)
      .where(sql`status='confirmed'`),
  ],
);
