import { integer, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
	id: integer().primaryKey().generatedAlwaysAsIdentity(),
	name: varchar({ length: 255 }).notNull(),
	email: varchar({ length: 255 }).notNull().unique(),
	createdAt: timestamp().notNull().defaultNow(),
	updatedAt: timestamp()
		.notNull()
		.defaultNow()
		.$onUpdate(() => new Date()),
});

export const posts = pgTable("posts", {
	id: integer().primaryKey().generatedAlwaysAsIdentity(),
	title: varchar({ length: 255 }).notNull(),
	body: text().notNull(),
	authorId: integer()
		.notNull()
		.references(() => users.id),
	publishedAt: timestamp(),
	createdAt: timestamp().notNull().defaultNow(),
	updatedAt: timestamp()
		.notNull()
		.defaultNow()
		.$onUpdate(() => new Date()),
});
