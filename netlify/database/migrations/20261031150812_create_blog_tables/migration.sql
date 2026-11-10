CREATE TABLE "articles" (
	"id" text PRIMARY KEY,
	"title" text NOT NULL,
	"tag" text DEFAULT '' NOT NULL,
	"excerpt" text DEFAULT '' NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"cover" text DEFAULT '' NOT NULL,
	"thumb_class" text DEFAULT 'img1' NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"reactions" jsonb DEFAULT '{}' NOT NULL,
	"date" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "authors" (
	"id" serial PRIMARY KEY,
	"singleton" boolean DEFAULT true NOT NULL UNIQUE,
	"name" text NOT NULL,
	"email" text NOT NULL UNIQUE,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" serial PRIMARY KEY,
	"kind" text NOT NULL,
	"item_id" text NOT NULL,
	"name" text NOT NULL,
	"text" text NOT NULL,
	"date" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" text PRIMARY KEY,
	"text" text DEFAULT '' NOT NULL,
	"media" text DEFAULT '' NOT NULL,
	"media_type" text DEFAULT '' NOT NULL,
	"reactions" jsonb DEFAULT '{}' NOT NULL,
	"date" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"token" text PRIMARY KEY,
	"author_id" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX "comments_item_idx" ON "comments" ("kind","item_id");--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_author_id_authors_id_fkey" FOREIGN KEY ("author_id") REFERENCES "authors"("id") ON DELETE CASCADE;