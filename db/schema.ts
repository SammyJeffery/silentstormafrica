import { pgTable, text, timestamp, boolean, jsonb, serial, integer, index } from "drizzle-orm/pg-core";

// The single author. The unique "singleton" column means a second row can never be inserted,
// so only the first person to sign up becomes the author.
export const authors = pgTable("authors", {
  id: serial().primaryKey(),
  singleton: boolean().notNull().default(true).unique(),
  name: text().notNull(),
  email: text().notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  token: text().primaryKey(),
  authorId: integer("author_id").notNull().references(() => authors.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const articles = pgTable("articles", {
  id: text().primaryKey(),
  title: text().notNull(),
  tag: text().notNull().default(""),
  excerpt: text().notNull().default(""),
  body: text().notNull().default(""),
  cover: text().notNull().default(""),
  thumbClass: text("thumb_class").notNull().default("img1"),
  featured: boolean().notNull().default(false),
  reactions: jsonb().$type<Record<string, number>>().notNull().default({}),
  date: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const posts = pgTable("posts", {
  id: text().primaryKey(),
  text: text().notNull().default(""),
  media: text().notNull().default(""),
  mediaType: text("media_type").notNull().default(""),
  reactions: jsonb().$type<Record<string, number>>().notNull().default({}),
  date: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

// Comments for both articles and posts; "kind" says which table item_id points at.
export const comments = pgTable("comments", {
  id: serial().primaryKey(),
  kind: text().notNull(),
  itemId: text("item_id").notNull(),
  name: text().notNull(),
  text: text().notNull(),
  date: timestamp({ withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("comments_item_idx").on(t.kind, t.itemId)]);
