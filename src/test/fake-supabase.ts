/**
 * In-memory stand-in for the Supabase client.
 *
 * It mimics only the query API the app actually uses, but it does enforce
 * the unique indexes and run the same triggers as the migration, so tests
 * can catch faults that would otherwise surface only against a real
 * database.
 */

type Row = Record<string, unknown>;

type QueryError = { message: string; code?: string };

type Result<T> = { data: T; error: QueryError | null };

type Filter = { column: string; value: unknown };

type Order = { column: string; ascending: boolean };

/** Mirrors the unique indexes from 0001_init.sql. */
const UNIQUE_INDEXES: Record<string, ((row: Row) => string)[]> = {
  game_sessions: [(row) => `pin:${String(row.pin)}`],
  players: [
    (row) =>
      `nick:${String(row.session_id)}:${String(row.nickname).trim().toLowerCase()}`,
  ],
  answers: [
    (row) => `answer:${String(row.question_id)}:${String(row.player_id)}`,
  ],
};

const DUPLICATE_ERROR: QueryError = {
  code: "23505",
  message: "duplicate key value violates unique constraint",
};

/** Embedded selects the app uses, e.g. `questions(id, correct_index)`. */
type Relation = {
  table: string;
  /** Column on the far side, for one-to-many. */
  foreignKey?: string;
  /** Column on this side, for many-to-one. */
  localKey?: string;
  many: boolean;
};

const RELATIONS: Record<string, Record<string, Relation>> = {
  quizzes: {
    questions: { table: "questions", foreignKey: "quiz_id", many: true },
  },
  game_sessions: {
    quizzes: { table: "quizzes", localKey: "quiz_id", many: false },
  },
};

const EMBED_PATTERN = /(\w+)\s*\(([^)]*)\)/g;

let idCounter = 0;

/** Deterministic UUIDs keep tests independent of randomness. */
export function testUuid(seed?: number): string {
  const n = seed ?? ++idCounter;
  const hex = n.toString(16).padStart(12, "0");
  return `00000000-0000-4000-8000-${hex}`;
}

export function resetTestUuids() {
  idCounter = 0;
}

export class FakeSupabase {
  readonly tables: Record<string, Row[]> = {
    quizzes: [],
    questions: [],
    game_sessions: [],
    players: [],
    answers: [],
  };

  /** Query count, useful for asserting something is not run in a loop. */
  queryCount = 0;

  from(table: string) {
    return new FakeQuery(this, table);
  }

  async rpc(name: string, args: Record<string, string>): Promise<Result<null>> {
    if (name !== "apply_question_scores") {
      return { data: null, error: { message: `neznámá funkce ${name}` } };
    }

    for (const answer of this.tables.answers) {
      if (
        answer.session_id === args.p_session_id &&
        answer.question_id === args.p_question_id &&
        Number(answer.points) > 0
      ) {
        const player = this.tables.players.find(
          (candidate) => candidate.id === answer.player_id,
        );
        if (player) {
          player.score = Number(player.score) + Number(answer.points);
        }
      }
    }

    return { data: null, error: null };
  }

  /** The migration's triggers: counters on game_sessions. */
  runInsertTriggers(table: string, row: Row) {
    if (table === "answers") {
      const session = this.findSession(row.session_id);
      if (session) {
        session.answers_received = Number(session.answers_received) + 1;
      }
    }

    if (table === "players") {
      const session = this.findSession(row.session_id);
      if (session) {
        session.player_count = Number(session.player_count) + 1;
      }
    }
  }

  runDeleteTriggers(table: string, row: Row) {
    if (table === "players") {
      const session = this.findSession(row.session_id);
      if (session) {
        session.player_count = Math.max(0, Number(session.player_count) - 1);
      }
    }
  }

  private findSession(id: unknown) {
    return this.tables.game_sessions.find((row) => row.id === id);
  }

  /** Column defaults as declared by the schema. */
  defaultsFor(table: string): Row {
    const now = new Date().toISOString();

    switch (table) {
      case "quizzes":
        return { id: testUuid(), description: null, created_at: now };
      case "questions":
        return {
          id: testUuid(),
          position: 0,
          time_limit: 20,
          correct_index: null,
          created_at: now,
        };
      case "game_sessions":
        return {
          id: testUuid(),
          status: "lobby",
          current_question_index: -1,
          question_started_at: null,
          question_ends_at: null,
          answers_received: 0,
          player_count: 0,
          created_at: now,
        };
      case "players":
        return { id: testUuid(), score: 0, joined_at: now };
      case "answers":
        return {
          id: testUuid(),
          is_correct: false,
          points: 0,
          answered_at: now,
        };
      default:
        return { id: testUuid() };
    }
  }

  violatesUnique(table: string, candidate: Row, ignoreId?: unknown): boolean {
    const indexes = UNIQUE_INDEXES[table];
    if (!indexes) return false;

    return this.tables[table].some((existing) => {
      if (existing.id === ignoreId) return false;
      return indexes.some((key) => key(existing) === key(candidate));
    });
  }
}

class FakeQuery implements PromiseLike<Result<Row[] | Row | null>> {
  private op: "select" | "insert" | "update" | "delete" = "select";
  private payload: Row | Row[] = {};
  private filters: Filter[] = [];
  private orders: Order[] = [];
  private rowLimit: number | null = null;
  private wantsRows = false;
  private cardinality: "many" | "single" | "maybe" = "many";
  private embeds: string[] = [];

  constructor(
    private readonly db: FakeSupabase,
    private readonly table: string,
  ) {}

  select(columns = "*") {
    this.wantsRows = true;
    this.embeds = [...columns.matchAll(EMBED_PATTERN)].map((match) => match[1]);
    return this;
  }

  insert(payload: Row | Row[]) {
    this.op = "insert";
    this.payload = payload;
    return this;
  }

  update(payload: Row) {
    this.op = "update";
    this.payload = payload;
    return this;
  }

  delete() {
    this.op = "delete";
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push({ column, value });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orders.push({ column, ascending: options?.ascending !== false });
    return this;
  }

  limit(count: number) {
    this.rowLimit = count;
    return this;
  }

  single() {
    this.cardinality = "single";
    this.wantsRows = true;
    return this;
  }

  maybeSingle() {
    this.cardinality = "maybe";
    this.wantsRows = true;
    return this;
  }

  // The Supabase builder is deliberately thenable, which is what makes
  // `await db.from(...)` work. The stand-in has to match, or the tests
  // would not exercise the real API shape.
  // biome-ignore lint/suspicious/noThenProperty: mirrors the Supabase client API
  then<TResult1 = Result<Row[] | Row | null>, TResult2 = never>(
    onfulfilled?:
      | ((
          value: Result<Row[] | Row | null>,
        ) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.run()).then(onfulfilled, onrejected);
  }

  private matches(row: Row): boolean {
    return this.filters.every((filter) => row[filter.column] === filter.value);
  }

  private sorted(rows: Row[]): Row[] {
    if (this.orders.length === 0) return rows;

    return [...rows].sort((a, b) => {
      for (const order of this.orders) {
        const left = a[order.column];
        const right = b[order.column];
        if (left === right) continue;

        const comparison =
          typeof left === "number" && typeof right === "number"
            ? left - right
            : String(left).localeCompare(String(right));

        return order.ascending ? comparison : -comparison;
      }
      return 0;
    });
  }

  /** Fills in embedded selects such as `questions(...)`. */
  private withEmbeds(row: Row): Row {
    if (this.embeds.length === 0) return { ...row };

    const result: Row = { ...row };
    const relations = RELATIONS[this.table] ?? {};

    for (const name of this.embeds) {
      const relation = relations[name];
      if (!relation) continue;

      const target = this.db.tables[relation.table] ?? [];

      if (relation.many && relation.foreignKey) {
        const key = relation.foreignKey;
        result[name] = target
          .filter((child) => child[key] === row.id)
          .map((child) => ({ ...child }));
      } else if (relation.localKey) {
        const parent = target.find(
          (candidate) => candidate.id === row[relation.localKey as string],
        );
        result[name] = parent ? { ...parent } : null;
      }
    }

    return result;
  }

  private shape(rows: Row[]): Result<Row[] | Row | null> {
    if (this.cardinality === "single") {
      if (rows.length !== 1) {
        return {
          data: null,
          error: {
            code: "PGRST116",
            message: "JSON object requested, multiple (or no) rows returned",
          },
        };
      }
      return { data: this.withEmbeds(rows[0]), error: null };
    }

    if (this.cardinality === "maybe") {
      return {
        data: rows.length > 0 ? this.withEmbeds(rows[0]) : null,
        error: null,
      };
    }

    return { data: rows.map((row) => this.withEmbeds(row)), error: null };
  }

  private run(): Result<Row[] | Row | null> {
    this.db.queryCount += 1;

    const table = this.db.tables[this.table];
    if (!table) {
      return {
        data: null,
        error: {
          code: "42P01",
          message: `relation ${this.table} does not exist`,
        },
      };
    }

    if (this.op === "insert") {
      const incoming = Array.isArray(this.payload)
        ? this.payload
        : [this.payload];
      const created: Row[] = [];

      for (const item of incoming) {
        const row = { ...this.db.defaultsFor(this.table), ...item };

        if (this.db.violatesUnique(this.table, row)) {
          return { data: null, error: DUPLICATE_ERROR };
        }

        table.push(row);
        this.db.runInsertTriggers(this.table, row);
        created.push(row);
      }

      return this.wantsRows ? this.shape(created) : { data: null, error: null };
    }

    if (this.op === "update") {
      const affected = table.filter((row) => this.matches(row));

      for (const row of affected) {
        const next = { ...row, ...(this.payload as Row) };
        if (this.db.violatesUnique(this.table, next, row.id)) {
          return { data: null, error: DUPLICATE_ERROR };
        }
        Object.assign(row, this.payload as Row);
      }

      return this.wantsRows
        ? this.shape(affected)
        : { data: null, error: null };
    }

    if (this.op === "delete") {
      const removed = table.filter((row) => this.matches(row));

      for (const row of removed) {
        table.splice(table.indexOf(row), 1);
        this.db.runDeleteTriggers(this.table, row);
        this.cascade(row);
      }

      return this.wantsRows ? this.shape(removed) : { data: null, error: null };
    }

    let rows = this.sorted(table.filter((row) => this.matches(row)));
    if (this.rowLimit !== null) rows = rows.slice(0, this.rowLimit);

    return this.shape(rows);
  }

  /** ON DELETE CASCADE for the relations the tests rely on. */
  private cascade(row: Row) {
    const cascades: Record<string, [string, string][]> = {
      quizzes: [
        ["questions", "quiz_id"],
        ["game_sessions", "quiz_id"],
      ],
      questions: [["answers", "question_id"]],
      game_sessions: [
        ["players", "session_id"],
        ["answers", "session_id"],
      ],
      players: [["answers", "player_id"]],
    };

    for (const [childTable, column] of cascades[this.table] ?? []) {
      const children = this.db.tables[childTable].filter(
        (child) => child[column] === row.id,
      );
      for (const child of children) {
        const list = this.db.tables[childTable];
        list.splice(list.indexOf(child), 1);
      }
    }
  }
}
