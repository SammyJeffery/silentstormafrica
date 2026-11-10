import type { Config, Context } from "@netlify/functions";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { and, desc, eq, gt, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { authors, sessions, articles, posts, comments } from "../../db/schema.js";

const REACTIONS = ["like", "love", "celebrate", "insight", "wow", "sad"];
const SESSION_DAYS = 30;

const json = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
  Response.json(data, { status, headers });

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return salt + ":" + scryptSync(password, salt, 64).toString("hex");
}
function checkPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  const a = Buffer.from(hash, "hex");
  const b = scryptSync(password, salt, 64);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function startSession(authorId: number) {
  const token = randomBytes(32).toString("hex");
  await db.insert(sessions).values({ token, authorId, expiresAt: new Date(Date.now() + SESSION_DAYS * 86400000) });
  return `ss_session=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${SESSION_DAYS * 86400}`;
}

async function currentAuthor(context: Context) {
  const token = context.cookies.get("ss_session");
  if (!token) return null;
  const [row] = await db
    .select({ id: authors.id, name: authors.name, email: authors.email })
    .from(sessions)
    .innerJoin(authors, eq(sessions.authorId, authors.id))
    .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())));
  return row || null;
}

const str = (v: unknown, max = 2_000_000) => (typeof v === "string" ? v.slice(0, max) : "");

function articleFields(b: any) {
  return {
    title: str(b.title, 300), tag: str(b.tag, 60), excerpt: str(b.excerpt, 1000), body: str(b.body),
    cover: str(b.cover), thumbClass: str(b.thumbClass, 20) || "img1", featured: !!b.featured,
  };
}
function postFields(b: any) {
  return { text: str(b.text), media: str(b.media), mediaType: str(b.mediaType, 10) };
}

async function auth(req: Request, context: Context, action: string) {
  if (req.method === "GET" && !action) {
    const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(authors);
    return json({ hasAuthor: count > 0, author: await currentAuthor(context) });
  }
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  if (action === "logout") {
    const token = context.cookies.get("ss_session");
    if (token) await db.delete(sessions).where(eq(sessions.token, token));
    return json({ ok: true }, 200, { "Set-Cookie": "ss_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0" });
  }

  const b = await req.json().catch(() => ({}));
  const email = str(b.email, 200).trim().toLowerCase();
  const password = str(b.password, 200);

  if (action === "signup") {
    const name = str(b.name, 100).trim();
    if (!name || !email || password.length < 6) return json({ error: "Name, email and a 6+ character password are required." }, 400);
    // The unique singleton column makes this fail if an author already exists, even under concurrent sign-ups.
    const [author] = await db.insert(authors).values({ name, email, passwordHash: hashPassword(password) })
      .onConflictDoNothing().returning({ id: authors.id, name: authors.name, email: authors.email });
    if (!author) return json({ error: "An author account already exists. Please log in instead." }, 403);
    return json({ author }, 201, { "Set-Cookie": await startSession(author.id) });
  }

  if (action === "login") {
    const [author] = await db.select().from(authors).where(eq(authors.email, email));
    if (!author || !checkPassword(password, author.passwordHash)) return json({ error: "Incorrect email or password." }, 401);
    return json({ author: { id: author.id, name: author.name, email: author.email } }, 200, { "Set-Cookie": await startSession(author.id) });
  }
  return json({ error: "Not found" }, 404);
}

async function bumpReaction(kind: string, id: string, key: string, delta: number) {
  const table = kind === "article" ? articles : posts;
  await db.update(table)
    .set({ reactions: sql`${table.reactions} || jsonb_build_object(${key}::text, greatest(0, coalesce((${table.reactions}->>${key}::text)::int, 0) + ${delta}))` })
    .where(eq(table.id, id));
}

export default async (req: Request, context: Context) => {
  const [resource, id] = new URL(req.url).pathname.replace(/^\/api\/?/, "").split("/");
  try {
    if (resource === "auth") return await auth(req, context, id || "");

    // Public: everything the site renders, with comments attached to their item.
    if (resource === "content" && req.method === "GET") {
      const [a, p, c] = await Promise.all([
        db.select().from(articles).orderBy(desc(articles.date)),
        db.select().from(posts).orderBy(desc(posts.date)),
        db.select().from(comments).orderBy(comments.date),
      ]);
      const byItem: Record<string, any[]> = {};
      c.forEach((x) => (byItem[x.kind + ":" + x.itemId] ||= []).push({ id: x.id, name: x.name, text: x.text, date: x.date }));
      return json({
        articles: a.map((x) => ({ ...x, comments: byItem["article:" + x.id] || [] })),
        posts: p.map((x) => ({ ...x, comments: byItem["post:" + x.id] || [] })),
      });
    }

    // Public: readers can comment and react.
    if (resource === "comments" && req.method === "POST") {
      const b = await req.json();
      const kind = b.kind === "post" ? "post" : "article";
      const text = str(b.text, 5000).trim();
      if (!text || !str(b.itemId)) return json({ error: "Comment text is required." }, 400);
      const [row] = await db.insert(comments).values({ kind, itemId: str(b.itemId, 100), name: str(b.name, 100).trim() || "Anonymous", text }).returning();
      return json(row, 201);
    }
    if (resource === "react" && req.method === "POST") {
      const b = await req.json();
      const kind = b.kind === "post" ? "post" : "article";
      if (REACTIONS.includes(b.remove)) await bumpReaction(kind, str(b.id, 100), b.remove, -1);
      if (REACTIONS.includes(b.add)) await bumpReaction(kind, str(b.id, 100), b.add, 1);
      return json({ ok: true });
    }

    // Everything below is author-only.
    if (!(await currentAuthor(context))) return json({ error: "Not signed in" }, 401);

    if ((resource === "articles" || resource === "posts") && id) {
      const table = resource === "articles" ? articles : posts;
      const kind = resource === "articles" ? "article" : "post";
      if (req.method === "PUT") {
        const b = await req.json();
        const fields: any = resource === "articles" ? articleFields(b) : postFields(b);
        const values = { id, ...fields, ...(b.date ? { date: new Date(b.date) } : {}) };
        const [row] = await db.insert(table).values(values).onConflictDoUpdate({ target: table.id, set: fields }).returning();
        return json(row);
      }
      if (req.method === "DELETE") {
        await db.delete(comments).where(and(eq(comments.kind, kind), eq(comments.itemId, id)));
        await db.delete(table).where(eq(table.id, id));
        return json({ ok: true });
      }
    }
    if (resource === "comments" && id && req.method === "DELETE") {
      await db.delete(comments).where(eq(comments.id, Number(id)));
      return json({ ok: true });
    }
    return json({ error: "Not found" }, 404);
  } catch (err) {
    console.error(err);
    return json({ error: "Server error" }, 500);
  }
};

export const config: Config = { path: "/api/*" };
