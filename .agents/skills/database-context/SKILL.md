---
name: supabase-schema
description: >
  Use this skill EVERY TIME a task involves the Supabase database in this React project —
  including any changes to queries, components, hooks, API calls, or logic that touches
  data stored in Supabase. This includes adding features, fixing bugs, refactoring code,
  writing new queries, updating RLS policies, or anything where table names, column names,
  foreign keys, or relationships matter. Do NOT rely on memory or training data for the
  schema — always load it fresh from the repo file or by calling the RPC. If you are
  uncertain whether the schema is relevant, assume it is and load it anyway.
---

# Supabase Schema Skill

This skill gives you accurate, up-to-date knowledge of the project's Supabase database
structure — including all tables, columns, data types, relationships, and foreign keys —
so you never have to guess or re-derive the structure mid-task.

---

## Step 1 — Load the Schema

Always start here. Follow this decision tree:

### A) Cached file exists → read it first

The schema is cached at:

```
/debug-files/db-schema.json
```

Read this file at the start of any database-related task:

```bash
cat .agents/skills/database-context/resources/db-schema.json
```

If the file exists and is non-empty, use it as your source of truth and **skip to Step 2**.

### B) File is missing, empty, or you suspect it's stale → call the RPC

Call the Supabase RPC function `get_database_context` to fetch the latest schema.
This function returns a JSON object describing the full database structure.

**How to call it** — run this in the project root (requires `supabase-js` and env vars to be available):

```bash
node .agents/skills/database-context/resources/fetch-db-context.js
```

> **Env var note:** The script tries common env var names for both Next.js and Vite.
> If neither is set, check `.env`, `.env.local`, or `.env.development` in the project root
> and source the correct one before running.

After the RPC succeeds, the fresh JSON is written to `/debug-files/db-schema.json` and
you can read it normally.

---

## Step 2 — Parse and Understand the Schema

Once you have the JSON, extract the following before writing any code:

1. **Tables** — full list of table names in the relevant schema(s)
2. **Columns** — for each table you'll touch: name, type, nullable, default
3. **Primary keys** — which column(s) are PKs
4. **Foreign keys** — which columns reference other tables and which column they point to
5. **Relationships** — one-to-one, one-to-many, many-to-many (via join tables)
6. **Enums / custom types** — any Postgres enums used as column types
7. **RLS-relevant info** — if the task involves auth or row-level security

Use this understanding to inform every decision: query construction, join order, insert
payloads, update targets, and type-safe TypeScript interfaces.

---

## Step 3 — Apply the Schema to the Task

### Writing queries

- Always use the exact column names from the schema — no guessing or camelCase conversion
  unless the project's Supabase client is configured to do so
- Respect nullability: don't assume a nullable column has a value
- Honour FK constraints: insert parent records before child records

### TypeScript types

- Derive types from the schema, not from existing code (which may be out of sync)
- If the project has a generated `database.types.ts`, cross-reference it but treat the
  live RPC schema as the authority if they conflict

### Joins and relationships

- Use the FK map from the schema to construct `.select()` with nested relations correctly
- For many-to-many, identify the join table and its two FK columns explicitly

### Migrations / schema changes

- If the task requires a schema change (new table, new column, new FK), note it clearly
  and write the migration SQL before writing any application code
- After a schema change, remind the user to re-run `get_database_context` so the cached
  file stays current

### SQL queries → always write to `/debug-files/execute-query.sql`

Any SQL that needs to be executed against Supabase — migrations, one-off data fixes,
diagnostic queries, seed inserts, RLS policy changes, index creation, anything — must be
written to:

```
/debug-files/execute-query.sql
```

**Rules:**

- **Always overwrite** the file with the full SQL for the current task (do not append
  across unrelated tasks — each task gets a clean file)
- **Include a header comment** describing what the query does and why:
  ```sql
  -- Task: <short description>
  -- Date: <today's date>
  -- Tables affected: <comma-separated list>
  ```
- **Wrap multi-statement queries in a transaction** where safe to do so:
  ```sql
  BEGIN;
  -- your statements here
  COMMIT;
  ```
- **Never execute SQL directly** via bash or node unless the user explicitly asks — write
  to the file and tell the user to run it in the Supabase SQL editor or via `psql`
- After writing the file, tell the user: _"SQL written to `/debug-files/execute-query.sql`
  — run it in the Supabase dashboard → SQL Editor or via psql."_

---

## Step 4 — Refresh the Cache When Needed

Prompt the user (or do it yourself if you have terminal access) to refresh the schema when:

- A migration has just been run
- The task involves a table you don't see in the cached JSON
- The cached file's modification time looks older than recent changes in the conversation

To refresh, re-run the RPC command from Step 1B above.

---

## Quick Reference

| What you need   | Where to look                                              |
| --------------- | ---------------------------------------------------------- |
| Cached schema   | `.agents/skills/database-context/resources/db-schema.json` |
| Live schema     | RPC: `get_database_context()`                              |
| How to call RPC | Step 1B node snippet above                                 |
| What to extract | Step 2 checklist                                           |
| When to refresh | Step 4                                                     |

---

## Common Pitfalls to Avoid

- **Do not invent column names** — always verify against the schema JSON
- **Do not assume snake_case ↔ camelCase** without checking the client config
- **Do not skip this skill** for "small" changes — even a one-line query fix can break if
  the column name or type is wrong
- **Do not use a stale cache** if you know a migration was run — refresh first
