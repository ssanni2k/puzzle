import { pgTable, uuid, varchar, integer, boolean, timestamp, jsonb, text, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  username: varchar('username', { length: 30 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  puzzles: many(puzzles),
  progressEntries: many(progress),
  reports: many(reports),
}));

export const puzzles = pgTable('puzzles', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  title: varchar('title', { length: 200 }).notNull(),
  gridCols: integer('grid_cols').notNull(),
  gridRows: integer('grid_rows').notNull(),
  imageKey: varchar('image_key').notNull(),
  contoursKey: varchar('contours_key'),
  status: varchar('status', { length: 20 }).default('pending').notNull(),
  isPublic: boolean('is_public').default(false).notNull(),
  completionsCount: integer('completions_count').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const puzzlesRelations = relations(puzzles, ({ one, many }) => ({
  user: one(users, { fields: [puzzles.userId], references: [users.id] }),
  progressEntries: many(progress),
  reports: many(reports),
}));

export const progress = pgTable('progress', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  puzzleId: uuid('puzzle_id').references(() => puzzles.id).notNull(),
  stateJson: jsonb('state_json').$type<Record<string, unknown>>().notNull(),
  completed: boolean('completed').default(false).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userPuzzleUnique: uniqueIndex('user_puzzle_unique').on(table.userId, table.puzzleId),
}));

export const progressRelations = relations(progress, ({ one }) => ({
  user: one(users, { fields: [progress.userId], references: [users.id] }),
  puzzle: one(puzzles, { fields: [progress.puzzleId], references: [puzzles.id] }),
}));

export const reports = pgTable('reports', {
  id: uuid('id').defaultRandom().primaryKey(),
  reporterId: uuid('reporter_id').references(() => users.id).notNull(),
  puzzleId: uuid('puzzle_id').references(() => puzzles.id).notNull(),
  reason: text('reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const reportsRelations = relations(reports, ({ one }) => ({
  reporter: one(users, { fields: [reports.reporterId], references: [users.id] }),
  puzzle: one(puzzles, { fields: [reports.puzzleId], references: [puzzles.id] }),
}));