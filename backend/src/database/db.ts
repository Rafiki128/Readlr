import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sqlite3 from 'sqlite3';
import { open, type Database } from 'sqlite';

type QueryResult<T = unknown> = { data: T; error: { message: string } | null };
type Filter = { column: string; operator: 'eq' | 'in'; value: unknown };
type OrderBy = { column: string; ascending: boolean };
type SingleMode = 'single' | 'maybeSingle' | null;

const databaseDirectory = path.dirname(fileURLToPath(import.meta.url));
const backendDirectory = path.resolve(databaseDirectory, '../..');
dotenv.config({ path: path.resolve(backendDirectory, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const requestedProvider = process.env.DATABASE_PROVIDER?.toLowerCase();
const databaseProvider = requestedProvider ?? (supabaseUrl && supabaseServiceRoleKey ? 'supabase' : 'sqlite');

if (databaseProvider === 'supabase') {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set when DATABASE_PROVIDER=supabase.');
  }
}

const supabaseClient = databaseProvider === 'supabase'
  ? createClient(supabaseUrl!, supabaseServiceRoleKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null;

let sqlitePromise: Promise<Database> | null = null;

function assertIdentifier(value: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
    throw new Error(`Invalid database identifier: ${value}`);
  }
  return value;
}

function normalizeColumns(columns?: string): string {
  if (!columns || columns.trim() === '*') return '*';
  return columns
    .split(',')
    .map((column) => assertIdentifier(column.trim()))
    .join(', ');
}

function toSqlValue(table: string, column: string, value: unknown): unknown {
  if (value === undefined) return null;
  if (
    (table === 'character_appearance' && column === 'accessories') ||
    (table === 'character_behaviors' && column === 'animation_config')
  ) {
    return JSON.stringify(value ?? (column === 'accessories' ? [] : {}));
  }
  if (typeof value === 'boolean') return value ? 1 : 0;
  return value;
}

function fromSqlRow(table: string, row: Record<string, unknown>): Record<string, unknown> {
  const parsed = { ...row };
  if (table === 'character_appearance' && typeof parsed.accessories === 'string') {
    parsed.accessories = JSON.parse(parsed.accessories || '[]');
  }
  if (table === 'character_behaviors' && typeof parsed.animation_config === 'string') {
    parsed.animation_config = JSON.parse(parsed.animation_config || '{}');
  }
  if (table === 'session_results' && 'matched' in parsed) {
    parsed.matched = Boolean(parsed.matched);
  }
  return parsed;
}

function whereClause(filters: Filter[]): { sql: string; params: unknown[] } {
  if (filters.length === 0) return { sql: '', params: [] };

  const clauses: string[] = [];
  const params: unknown[] = [];
  for (const filter of filters) {
    const column = assertIdentifier(filter.column);
    if (filter.operator === 'eq') {
      clauses.push(`${column} = ?`);
      params.push(filter.value);
    } else {
      const values = Array.isArray(filter.value) ? filter.value : [];
      if (values.length === 0) {
        clauses.push('1 = 0');
      } else {
        clauses.push(`${column} in (${values.map(() => '?').join(', ')})`);
        params.push(...values);
      }
    }
  }

  return { sql: ` where ${clauses.join(' and ')}`, params };
}

async function initializeSqlite(db: Database): Promise<void> {
  await db.exec(`
    pragma foreign_keys = on;

    create table if not exists users (
      id integer primary key autoincrement,
      email text not null unique,
      password_hash text not null,
      role text not null check (role in ('learner', 'teacher', 'admin')),
      created_at text not null default (datetime('now')),
      updated_at text not null default (datetime('now'))
    );

    create table if not exists learner_profiles (
      id integer primary key autoincrement,
      user_id integer not null unique references users(id) on delete cascade,
      name text not null,
      avatar text not null default 'fox',
      grade integer not null default 1,
      created_at text not null default (datetime('now')),
      updated_at text not null default (datetime('now'))
    );

    create table if not exists stages (
      id integer primary key autoincrement,
      stage_number integer not null unique,
      title text not null,
      description text,
      difficulty integer not null default 1,
      created_at text not null default (datetime('now'))
    );

    create table if not exists levels (
      id integer primary key autoincrement,
      stage_id integer not null references stages(id) on delete cascade,
      level_number integer not null,
      title text not null,
      description text,
      target_phoneme text not null,
      difficulty integer not null default 1,
      created_at text not null default (datetime('now')),
      unique(stage_id, level_number)
    );

    create table if not exists sessions (
      id integer primary key autoincrement,
      learner_id integer not null references learner_profiles(id) on delete cascade,
      level_id integer not null references levels(id) on delete cascade,
      stage_id integer not null references stages(id) on delete cascade,
      started_at text not null default (datetime('now')),
      completed_at text,
      status text not null default 'in_progress' check (status in ('in_progress', 'completed', 'abandoned'))
    );

    create table if not exists session_results (
      id integer primary key autoincrement,
      session_id integer not null references sessions(id) on delete cascade,
      attempt_number integer not null default 1,
      transcription text,
      detected_phoneme text,
      target_phoneme text not null,
      score integer not null default 0,
      matched integer not null default 0,
      feedback text,
      created_at text not null default (datetime('now'))
    );

    create table if not exists progress (
      id integer primary key autoincrement,
      learner_id integer not null references learner_profiles(id) on delete cascade,
      stage_id integer not null references stages(id) on delete cascade,
      completed_levels integer not null default 0,
      total_levels integer not null,
      completion_percentage integer not null default 0,
      last_updated text not null default (datetime('now')),
      unique(learner_id, stage_id)
    );

    create table if not exists achievements (
      id integer primary key autoincrement,
      learner_id integer not null references learner_profiles(id) on delete cascade,
      achievement_type text not null,
      achievement_name text not null,
      description text,
      icon_emoji text,
      earned_at text not null default (datetime('now'))
    );

    create table if not exists characters (
      id integer primary key autoincrement,
      name text not null unique,
      template text not null,
      created_at text not null default (datetime('now')),
      updated_at text not null default (datetime('now'))
    );

    create table if not exists character_appearance (
      id integer primary key autoincrement,
      character_id integer not null unique references characters(id) on delete cascade,
      head_color text not null,
      head_shape text not null,
      eye_color text not null,
      eye_shape text not null,
      mouth_color text not null,
      accessories text not null default '[]',
      body_color text not null
    );

    create table if not exists character_personality (
      id integer primary key autoincrement,
      character_id integer not null unique references characters(id) on delete cascade,
      personality_type text not null,
      animation_speed real not null,
      expression_style text not null
    );

    create table if not exists character_voice (
      id integer primary key autoincrement,
      character_id integer not null unique references characters(id) on delete cascade,
      voice_id text not null,
      pitch real not null,
      speed real not null,
      tone text not null,
      language text not null
    );

    create table if not exists character_behaviors (
      id integer primary key autoincrement,
      character_id integer not null references characters(id) on delete cascade,
      state text not null,
      animation_config text not null,
      sound_effect text
    );
  `);

  await seedLocalContent(db);
}

async function seedLocalContent(db: Database): Promise<void> {
  const stageRows = [
    [1, 'Valley of Vowels', 'Train vowel powers, hear your voice, then cross the valley road.', 1, 20],
    [2, 'Blending Bridges', 'Blend a consonant with a vowel.', 2, 8],
    [3, 'CVC Kingdom', 'Read your first whole words.', 3, 10],
  ] as const;

  for (const [stageNumber, title, description, difficulty, totalLevels] of stageRows) {
    await db.run(
      `insert into stages (stage_number, title, description, difficulty)
       values (?, ?, ?, ?)
       on conflict(stage_number) do update set
         title = excluded.title,
         description = excluded.description,
         difficulty = excluded.difficulty`,
      stageNumber,
      title,
      description,
      difficulty
    );

    const stage = await db.get<{ id: number }>('select id from stages where stage_number = ?', stageNumber);
    if (!stage) continue;

    for (let levelNumber = 1; levelNumber <= totalLevels; levelNumber += 1) {
      await db.run(
        `insert into levels (stage_id, level_number, title, description, target_phoneme, difficulty)
         values (?, ?, ?, ?, ?, ?)
         on conflict(stage_id, level_number) do update set
           title = excluded.title,
           description = excluded.description,
           target_phoneme = excluded.target_phoneme,
           difficulty = excluded.difficulty`,
        stage.id,
        levelNumber,
        `${title} ${levelNumber}`,
        `Practice ${title} level ${levelNumber}`,
        String(levelNumber),
        difficulty
      );
    }

    await db.run('delete from levels where stage_id = ? and level_number > ?', stage.id, totalLevels);
  }
}

async function getSqlite(): Promise<Database> {
  if (!sqlitePromise) {
    const filename = process.env.DATABASE_PATH
      ? path.resolve(backendDirectory, process.env.DATABASE_PATH)
      : path.resolve(backendDirectory, 'readlr.db');
    sqlitePromise = open({ filename, driver: sqlite3.Database }).then(async (db) => {
      await initializeSqlite(db);
      console.log(`Using local SQLite database at ${filename}`);
      return db;
    });
  }
  return sqlitePromise;
}

class LocalQueryBuilder {
  private action: 'select' | 'insert' | 'update' | 'delete' = 'select';
  private columns = '*';
  private payload: Record<string, unknown> | Record<string, unknown>[] | null = null;
  private filters: Filter[] = [];
  private orderings: OrderBy[] = [];
  private rowLimit: number | null = null;
  private singleMode: SingleMode = null;

  constructor(private readonly table: string) {}

  select(columns = '*'): this {
    this.columns = columns;
    return this;
  }

  insert(payload: Record<string, unknown> | Record<string, unknown>[]): this {
    this.action = 'insert';
    this.payload = payload;
    return this;
  }

  update(payload: Record<string, unknown>): this {
    this.action = 'update';
    this.payload = payload;
    return this;
  }

  delete(): this {
    this.action = 'delete';
    return this;
  }

  eq(column: string, value: unknown): this {
    this.filters.push({ column, operator: 'eq', value });
    return this;
  }

  in(column: string, values: unknown[]): this {
    this.filters.push({ column, operator: 'in', value: values });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }): this {
    this.orderings.push({ column, ascending: options?.ascending ?? true });
    return this;
  }

  limit(count: number): this {
    this.rowLimit = count;
    return this;
  }

  single(): Promise<QueryResult<unknown>> {
    this.singleMode = 'single';
    return this.execute();
  }

  maybeSingle(): Promise<QueryResult<unknown>> {
    this.singleMode = 'maybeSingle';
    return this.execute();
  }

  then<TResult1 = QueryResult<unknown>, TResult2 = never>(
    onfulfilled?: ((value: QueryResult<unknown>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }

  private async execute(): Promise<QueryResult<unknown>> {
    try {
      const db = await getSqlite();
      const table = assertIdentifier(this.table);

      if (this.action === 'insert') return { data: await this.executeInsert(db, table), error: null };
      if (this.action === 'update') return { data: await this.executeUpdate(db, table), error: null };
      if (this.action === 'delete') return { data: await this.executeDelete(db, table), error: null };
      return { data: await this.executeSelect(db, table), error: null };
    } catch (error) {
      return { data: null, error: { message: error instanceof Error ? error.message : String(error) } };
    }
  }

  private async executeInsert(db: Database, table: string): Promise<unknown> {
    const rows = Array.isArray(this.payload) ? this.payload : [this.payload];
    const insertedIds: number[] = [];

    for (const row of rows) {
      if (!row) continue;
      const columns = Object.keys(row).map(assertIdentifier);
      const placeholders = columns.map(() => '?').join(', ');
      const params = columns.map((column) => toSqlValue(table, column, row[column]));
      const result = await db.run(
        `insert into ${table} (${columns.join(', ')}) values (${placeholders})`,
        ...params
      );
      if (result.lastID) insertedIds.push(result.lastID);
    }

    if (insertedIds.length === 0) return this.formatRows([]);
    const selectColumns = normalizeColumns(this.columns);
    const selectedRows = await db.all<Record<string, unknown>[]>(
      `select ${selectColumns} from ${table} where id in (${insertedIds.map(() => '?').join(', ')})`,
      ...insertedIds
    );
    return this.formatRows(selectedRows.map((row) => fromSqlRow(table, row)));
  }

  private async executeUpdate(db: Database, table: string): Promise<unknown> {
    const payload = this.payload as Record<string, unknown> | null;
    if (!payload) return null;

    const columns = Object.keys(payload).map(assertIdentifier);
    const assignments = columns.map((column) => `${column} = ?`).join(', ');
    const params = columns.map((column) => toSqlValue(table, column, payload[column]));
    const where = whereClause(this.filters);
    await db.run(`update ${table} set ${assignments}${where.sql}`, ...params, ...where.params);

    if (this.singleMode || this.columns !== '*') {
      return this.executeSelect(db, table);
    }
    return null;
  }

  private async executeDelete(db: Database, table: string): Promise<unknown> {
    const where = whereClause(this.filters);
    await db.run(`delete from ${table}${where.sql}`, ...where.params);
    return null;
  }

  private async executeSelect(db: Database, table: string): Promise<unknown> {
    const selectColumns = normalizeColumns(this.columns);
    const where = whereClause(this.filters);
    const orderSql = this.orderings.length
      ? ` order by ${this.orderings
          .map((order) => `${assertIdentifier(order.column)} ${order.ascending ? 'asc' : 'desc'}`)
          .join(', ')}`
      : '';
    const limitSql = this.rowLimit ? ` limit ${this.rowLimit}` : '';
    const rows = await db.all<Record<string, unknown>[]>(
      `select ${selectColumns} from ${table}${where.sql}${orderSql}${limitSql}`,
      ...where.params
    );
    return this.formatRows(rows.map((row) => fromSqlRow(table, row)));
  }

  private formatRows(rows: Record<string, unknown>[]): unknown {
    if (this.singleMode === 'single') {
      if (rows.length !== 1) throw new Error(`Expected exactly one row from ${this.table}, received ${rows.length}.`);
      return rows[0];
    }
    if (this.singleMode === 'maybeSingle') {
      if (rows.length > 1) throw new Error(`Expected one or zero rows from ${this.table}, received ${rows.length}.`);
      return rows[0] ?? null;
    }
    return rows;
  }
}

const sqliteClient = {
  from(table: string): LocalQueryBuilder {
    return new LocalQueryBuilder(table);
  },
};

export const supabase: any = supabaseClient ?? sqliteClient;

export function unwrap<T = any>({ data, error }: { data: T; error: { message: string } | null }): T {
  if (error) throw new Error(`${databaseProvider === 'sqlite' ? 'SQLite' : 'Supabase'} database error: ${error.message}`);
  return data;
}
