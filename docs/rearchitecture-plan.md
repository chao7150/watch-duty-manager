# リアーキテクチャプラン: Imperative Shell / Functional Core + Clean Architecture + fp-ts廃止

## 1. 現状の問題点

| 問題 | 具体例 |
|------|--------|
| **Routeが肥大化** | `_index.tsx` の loader は ~85行、DB・auth・変換が縦にベた書き |
| **DBクエリの散在** | Prismaクエリが route, `action.server.ts`, `domain/*/db.ts` に分散 |
| **ドメイン層が薄い** | `domain/` は純粋関数のみ、ビジネスロジックはrouteに漏出 |
| **副作用の混入** | `_index.tsx` の `getTickets` 等は `db` を受け取る curried 関数だが、非同期でPrismaに直結 |
| **エラー処理の不統一** | `try/catch` / `fp-ts Either` / `fp-ts TaskEither` が混在 |
| **テスト不可能** | `db` が singleton import なのでモック不能 |
| **fp-tsの記法が難解** | `TE.bind` チェーン、`pipe`、`A.sequenceT` 等の学習コストが高い |

## 2. アーキテクチャ概要

```
┌─────────────────────────────────────────────────┐
│  Framework Layer (React Router)                  │
│  routes/*.tsx  → thin loader / action           │
│  HTTPリクエスト/レスポンスの変換のみ             │
├─────────────────────────────────────────────────┤
│  Imperative Shell (Adapters)                     │
│  app/adapters/                                   │
│    repository/prisma/  → DBアクセス実装          │
│    auth/              → 認証・セッション          │
├─────────────────────────────────────────────────┤
│  Application Layer (Use Cases)                    │
│  app/usecases/                                   │
│    getDashboard.ts  → ユースケースのオーケストレーション│
│    subscribeWork.ts → 入力→純粋関数→出力の合成      │
├─────────────────────────────────────────────────┤
│  Functional Core (Domain) ← ★ 純粋・テスト容易   │
│  app/domain/                                     │
│    work/      → Work集約の型・ビジネスルール       │
│    episode/   → Episode集約の型・計算ロジック       │
│    watch/     → 視聴状況の型・計算ロジック          │
│    cour/      → 既存の純粋関数(+拡張)             │
│    ticket/    → チケット計算(新設)                 │
│    metrics/   → メトリクス計算(新設)               │
└─────────────────────────────────────────────────┘
```

### 依存関係の方向

```
Framework → Use Cases → Domain ← Adapters
                         ↑
                    (インターフェース定義)
```

- Domain層はいかなる外部依存も持たない (Prisma, React Router, DB等に依存しない)
- Adapters層はDomain層のインターフェースを実装する
- Use Cases層はDomain層の純粋関数とRepositoryインターフェースを使用する
- Framework層(Route)はUse Casesを呼び出し、DIでRepository実装を注入する

## 3. Result型 — fp-tsの代替

fp-tsの `Either` / `TaskEither` を廃止し、Go風のResult型パターンを採用する。

### 3.1 型定義

```typescript
// app/utils/result.ts

type Result<T, E extends AppError = AppError> =
  | { ok: T; err?: never }
  | { ok?: never; err: E };

const Ok = <T>(value: T): Result<T, never> => ({ ok: value });
const Err = <E extends AppError>(error: E): Result<never, E> => ({ err: error });

export type { Result };
export { Ok, Err };
```

### 3.2 使用パターン

```typescript
// ドットアクセスで型絞り込み (推奨)
const result = someFunc();
if (result.err) {
  // result.err: 具体的なエラー型 ✓
  // result.ok: never ✓
  return handleErr(result.err);
}
const data = result.ok; // T ✓

// 分割代入は型絞り込みが効かないため避ける
// ❌ const { ok: data, err } = someFunc();
// ❌ if (err) { ... } // data は T | undefined のまま
```

### 3.3 AppError型

```typescript
// app/utils/result.ts

type AppError =
  | { type: "not_found"; resource: string; id: string | number }
  | { type: "validation"; message: string; fields?: FieldError[] }
  | { type: "unique_constraint"; duplicatedFields: string[] }
  | { type: "unauthorized"; redirectTo?: string }
  | { type: "forbidden" }
  | { type: "db"; message: string; cause?: unknown }
  | { type: "internal"; message: string };

interface FieldError {
  
  field: string;
  message: string;
}
```

各ドメインは固有のエラー型を定義し、Use Case層で `AppError` にマップする:

```typescript
// app/domain/work/errors.ts
type WorkError =
  | { type: "work_not_found"; workId: number }
  | { type: "episode_not_found"; workId: number; count: number }
  | { type: "unique_constraint"; title: string };

// app/domain/watch/errors.ts
type WatchError =
  | { type: "already_subscribed"; userId: string; workId: number }
  | { type: "subscription_not_found"; userId: string; workId: number }
  | { type: "validation"; message: string };
```

### 3.4 ヘルパー関数

```typescript
// app/utils/result.ts

export const tryResult = async <T>(
  fn: () => Promise<T>,
  onError: (e: unknown) => AppError,
): Promise<Result<T, AppError>> => {
  try {
    return Ok(await fn());
  } catch (e) {
    return Err(onError(e));
  }
};

export const errorToStatus = (err: AppError): number => {
  switch (err.type) {
    case "not_found": return 404;
    case "validation": return 400;
    case "unique_constraint": return 409;
    case "unauthorized": return 401;
    case "forbidden": return 403;
    case "db": return 500;
    case "internal": return 500;
  }
};

export const errorToMessage = (err: AppError): string => {
  switch (err.type) {
    case "not_found": return `${err.resource}が見つかりません`;
    case "validation": return err.message;
    case "unique_constraint": return `既に登録されています: ${err.duplicatedFields.join(", ")}`;
    case "unauthorized": return "ログインが必要です";
    case "forbidden": return "権限がありません";
    case "db": return "内部エラーが発生しました";
    case "internal": return err.message;
  }
};
```

## 4. 各層の詳細とコード例

### 4.1 Functional Core (Domain層) — 純粋関数・副作用ゼロ

ドメイン層は一切の副作用を持たない純粋関数のみで構成する。`db`, `request`, `Promise` に依存しない。

```typescript
// app/domain/ticket/compute.ts
import type { SubscribedWork, Episode, Ticket } from "./types";
import { Temporal } from "temporal-polyfill";

export const computeTickets = (
  now: Temporal.ZonedDateTime,
  subscribedWorks: ReadonlyArray<SubscribedWork>,
  episodes: ReadonlyArray<Episode>,
): Ticket[] => {
  const publishableEpisodes = episodes.filter((ep) => {
    const delay = subscribedWorks.find((s) => s.workId === ep.workId)
      ?.watchDelaySecFromPublish ?? 0;
    return ep.publishedAt.getTime() + delay * 1000 < now.epochMilliseconds;
  });

  return publishableEpisodes.map((ep) => ({
    workId: ep.workId,
    count: ep.count,
    title: ep.title,
    publishedAt: ep.publishedAt,
    watchReady: true,
  }));
};
```

```typescript
// app/domain/metrics/compute.ts

export const mergeWeekMetrics = (
  weekKeys: string[],
  watchAchievements: Map<string, number>,
  dutyAccumulation: Map<string, number>,
): WeekMetric[] =>
  weekKeys.map((k) => ({
    date: k,
    watchAchievements: watchAchievements.get(k) ?? 0,
    dutyAccumulation: dutyAccumulation.get(k) ?? 0,
  }));

export const computeCumulativeMetrics = (
  metrics: Array<{ date: string; watchAchievements: number; dutyAccumulation: number }>,
) =>
  metrics.reduce(
    (acc, val) => {
      if (acc.length === 0) {
        acc.push(val);
        return acc;
      }
      const last = acc[acc.length - 1];
      acc.push({
        date: val.date,
        watchAchievements: last.watchAchievements + val.watchAchievements,
        dutyAccumulation: last.dutyAccumulation + val.dutyAccumulation,
      });
      return acc;
    },
    [] as typeof metrics,
  );
```

**移行対象**: `_index.tsx` の `getNormalizedDate`, `countOccurrence`, `setOldestOfWork`, メトリクスの累積計算など。

### 4.2 Repository (インターフェース定義はDomain、実装はAdapters)

Prismaに依存するDBアクセスをRepository interfaceの実装として分離する。インターフェースはdomain層、実装はadapters層に置く。

```typescript
// app/domain/watch/repository.ts — インターフェース(副作用の署名のみ)
import type { Result, AppError } from "~/utils/result";
import type { EpisodeStatusOnUser, SubscribedWorksOnUser } from "./types";

export interface WatchRepository {
  findSubscribedWorks(userId: string): Promise<SubscribedWorksOnUser[]>;
  findUnwatchedEpisodes(
    userId: string,
    workIds: number[],
    publishedUntil: Date,
  ): Promise<Result<Episode[], AppError>>;
  findWatchAchievements(
    userId: string,
    since: Date,
  ): Promise<EpisodeStatusOnUser[]>;
  findRecentWatchAchievements(
    userId: string,
    take: number,
  ): Promise<EpisodeStatusOnUser[]>;
  subscribe(userId: string, workId: number): Promise<Result<void, AppError>>;
  unsubscribe(userId: string, workId: number): Promise<Result<void, AppError>>;
  updateWatchSettings(
    userId: string,
    workId: number,
    data: { watchDelaySecFromPublish?: number | null; watchUrl?: string | null },
  ): Promise<Result<void, AppError>>;
}
```

```typescript
// app/adapters/repository/prisma/watch.ts — 実装(副作用あり)
import type { PrismaClient } from "@prisma/client";
import type { WatchRepository } from "~/domain/watch/repository";
import { Ok, Err } from "~/utils/result";
import type { AppError } from "~/utils/result";

export const createWatchRepository = (db: PrismaClient): WatchRepository => ({
  findSubscribedWorks: (userId) =>
    db.subscribedWorksOnUser.findMany({
      where: { userId },
      select: { watchDelaySecFromPublish: true, workId: true, watchUrl: true },
    }),

  findUnwatchedEpisodes: async (userId, workIds, publishedUntil) => {
    try {
      const episodes = await db.episode.findMany({
        where: {
          AND: [
            { work: { id: { in: workIds } } },
            { work: { users: { some: { userId } } } },
            { EpisodeStatusOnUser: { none: { userId, status: { in: ["watched", "skipped"] } } } },
            { publishedAt: { lte: publishedUntil } },
          ],
        },
        include: { work: true },
        orderBy: { publishedAt: "desc" },
      });
      return Ok(episodes);
    } catch (e) {
      return Err({ type: "db" as const, message: "findUnwatchedEpisodes failed", cause: e });
    }
  },

  subscribe: async (userId, workId) => {
    try {
      await db.subscribedWorksOnUser.create({ data: { userId, workId } });
      return Ok(undefined);
    } catch (e) {
      return Err({ type: "db" as const, message: "subscribe failed", cause: e });
    }
  },
  // ...
});
```

### 4.3 Use Case (Application層) — オーケストレーション

Use CaseはImperative Shell。認証・データ取得・純粋関数の呼び出し・データ返却をオーケストレーションする。ビジネスロジックは持たず、Functional Coreの純粋関数を組み合わせる。

```typescript
// app/usecases/getDashboard.ts
import { Temporal } from "temporal-polyfill";
import type { WatchRepository } from "~/domain/watch/repository";
import type { MetricsRepository } from "~/domain/metrics/repository";
import { computeTickets } from "~/domain/ticket/compute";
import { mergeWeekMetrics, computeCumulativeMetrics } from "~/domain/metrics/compute";
import {
  getPast7DaysLocaleDateStringFromTemporal,
  getQuarterEachLocaleDateStringFromTemporal,
  zdt2Date,
  startOf4OriginDayFromTemporal,
} from "~/utils/date";
import { cour2startZonedDateTime, zonedDateTime2cour } from "~/domain/cour/util";
import { countOccurrence } from "~/domain/metrics/compute";

export const getDashboard = (deps: {
  watchRepo: WatchRepository;
  metricsRepo: MetricsRepository;
  userId: string;
}) => async () => {
  const { watchRepo, metricsRepo, userId } = deps;
  const now = Temporal.Now.zonedDateTimeISO("Asia/Tokyo");

  const subscription = await watchRepo.findSubscribedWorks(userId);
  const subscribedWorks = subscription.map((s) => ({
    workId: s.workId,
    watchDelaySecFromPublish: s.watchDelaySecFromPublish ?? 0,
  }));

  const [rawEpisodes, weekWatchAchievements, weekDutyAccumulation, recentWatchAchievements, quarterRaw] =
    await Promise.all([
      watchRepo.findUnwatchedEpisodes(userId, subscribedWorks.map((s) => s.workId), zdt2Date(now.add({ days: 1 }))),
      metricsRepo.findWeekWatchAchievements(userId, now),
      metricsRepo.findWeekDutyAccumulation(userId, now),
      watchRepo.findRecentWatchAchievements(userId, 10),
      metricsRepo.findQuarterMetrics(userId, now),
    ]);

  if (rawEpisodes.err) {
    throw new Error("Failed to load episodes"); // loader内でのみキャッチ
  }

  // ★ Functional Coreの純粋関数で変換
  const tickets = computeTickets(now, subscribedWorks, rawEpisodes.ok);
  const weekMetrics = mergeWeekMetrics(
    getPast7DaysLocaleDateStringFromTemporal(now),
    weekWatchAchievements,
    weekDutyAccumulation,
  );
  const quarterMetrics = computeCumulativeMetrics(quarterRaw);

  return {
    tickets,
    weekMetrics,
    quarterMetrics,
    recentWatchAchievements,
    nowMs: now.epochMilliseconds,
    subscription: tickets.reduce(/* ... */),
  };
};
```

```typescript
// app/usecases/bulkCreateWorks.ts — fp-ts TE.bind チェーンをGo風スタイルに
export const bulkCreateWorks = (repos: {
  workRepo: WorkRepository;
  episodeRepo: EpisodeRepository;
}) =>
  async (formData: FormData): Promise<Result<BulkCreateResult, AppError>> => {
    const validationResult = validateWorkBulkForm(formData);
    if (validationResult.err) return validationResult;

    const insertingWorks = validationResult.ok;

    const insertResult = await repos.workRepo.createMany(
      insertingWorks.map(({ episodeCount: _, ...rest }) => rest),
    );
    if (insertResult.err) return insertResult;

    // unique constraint handling...

    const insertedWorks = await repos.workRepo.findManyByTitle(
      insertingWorks.map((w) => w.title),
    );
    if (insertedWorks.err) return insertedWorks;

    const episodeResult = await repos.episodeRepo.createMany(/* ... */);
    if (episodeResult.err) return episodeResult;

    return Ok({
      action: "bulkCreate" as const,
      workCount: insertedWorks.ok.length,
      episodeCount: episodeResult.ok.count,
    });
  };
```

### 4.4 Framework Layer (Route) — 最薄のImperative Shell

HTTPリクエストからUse Caseへの入力変換と、結果のHTTPレスポンスへの変換のみを行う。

```typescript
// app/routes/_index.tsx (移行後)
import { db } from "~/utils/db.server";
import { getUserId } from "~/utils/session.server";
import { createWatchRepository } from "~/adapters/repository/prisma/watch";
import { createMetricsRepository } from "~/adapters/repository/prisma/metrics";
import { getDashboard } from "~/usecases/getDashboard";

export const loader = async ({ request }: Route.LoaderArgs) => {
  const userId = await getUserId(request);
  if (userId === null) {
    return {
      userId,
      tickets: [],
      weekMetrics: [],
      quarterMetrics: [],
      recentWatchAchievements: [],
      nowMs: Date.now(),
    };
  }

  // ★ DI: 依存関係を注入してユースケースを実行
  return getDashboard({
    watchRepo: createWatchRepository(db),
    metricsRepo: createMetricsRepository(db),
    userId,
  })();
};
```

```typescript
// app/routes/create.tsx (移行後)
export const action = async ({ request }: Route.ActionArgs) => {
  const userId = await requireUserId(request);
  const formData = await request.formData();

  const repos = {
    workRepo: createWorkRepository(db),
    episodeRepo: createEpisodeRepository(db),
  };

  if (formData.get("_action") === "bulkCreate") {
    const result = await bulkCreateWorks(repos)(formData);
    if (result.err) {
      return data(
        { errorMessage: errorToMessage(result.err) },
        { status: errorToStatus(result.err) },
      );
    }
    return result.ok;
  }

  const result = await createWork(repos)(formData);
  if (result.err) {
    return data(
      { errorMessage: errorToMessage(result.err) },
      { status: errorToStatus(result.err) },
    );
  }
  return redirect(`/works/${result.ok.id}`);
};
```

```typescript
// app/routes/works.$workId/server/action.ts (移行後)
export const action = async ({ request, params }: Route.ActionArgs) => {
  const { workId } = extractParams(params, ["workId"]);
  const workIdNum = parseInt(workId, 10);
  const userId = await requireUserId(request);
  const formData = await request.formData();
  const actionType = formData.get("_action");

  const repos = {
    watchRepo: createWatchRepository(db),
    workRepo: createWorkRepository(db),
  };

  switch (actionType) {
    case "subscribe": {
      const result = await subscribeWork(repos.watchRepo)(userId, workIdNum);
      if (result.err) return data({ message: result.err.message, hasError: true }, { status: errorToStatus(result.err) });
      return data({ message: "subscribed", hasError: false }, { status: 200 });
    }
    case "unsubscribe": {
      const result = await unsubscribeWork(repos.watchRepo)(userId, workIdNum);
      if (result.err) return data({ message: result.err.message, hasError: true }, { status: errorToStatus(result.err) });
      return data({ message: "unsubscribed", hasError: false }, { status: 200 });
    }
    case "delete": {
      // ...
    }
    case "watch-settings-edit": {
      const result = await editWatchSettings(repos.watchRepo)(userId, workIdNum, formData);
      if (result.err) return data({ message: result.err.message, hasError: true }, { status: errorToStatus(result.err) });
      return data({ message: result.ok.successMessage, hasError: false }, { status: 200 });
    }
    default: {
      const result = await editWork(repos.workRepo)(workIdNum, formData);
      if (result.err) return data({ message: result.err.message, hasError: true }, { status: errorToStatus(result.err) });
      return data({ message: result.ok.successMessage, hasError: false }, { status: result.ok.status });
    }
  }
};
```

## 5. fp-ts置き換え対応表

| fp-ts | 置き換え後 |
|-------|-----------|
| `E.Either<L, R>` | `Result<R, L>` |
| `TE.TaskEither<L, R>` | `() => Promise<Result<R, L>>` |
| `TE.Do` + `TE.bind` / `TE.bindW` | 通常の `const` 代入 + 早期 `return` |
| `TE.fromEither` | そのまま `Result` を返す |
| `TE.tryCatch(fn, onError)` | `tryResult(fn, onError)` ヘルパー |
| `TE.match` / `TE.foldW` | `if (result.err) { ... } else { ... }` |
| `E.match` | 同上 |
| `A.sequenceT(T.ApplyPar)(...)()` | `Promise.all([...])` |
| `pipe(x, f, g)` | `g(f(x))` または通常の変数代入 |
| `F.pipe` | フロー順の逐次コード |

## 6. テスト戦略

```
Functional Core  → 純粋関数なので expect(computeTickets(input)).toEqual(expected)) の単体テスト
Repository IF    → インターフェースのみ、モック実装でテスト
Use Case         → モックRepositoryを注入して統合テスト
Route            → モックUse Caseを注入してエンドツーエンドテスト(必要な場合のみ)
```

```typescript
// app/domain/ticket/__tests__/compute.test.ts
import { computeTickets } from "../compute";
import { describe, expect, it } from "vitest";

describe("computeTickets", () => {
  it("should filter episodes by watch delay", () => {
    const result = computeTickets(now, subscribedWorks, episodes);
    expect(result).toHaveLength(2);
  });

  it("should return empty array when no subscribed works", () => {
    const result = computeTickets(now, [], episodes);
    expect(result).toHaveLength(0);
  });
});
```

```typescript
// app/usecases/__tests__/subscribeWork.test.ts
import { describe, expect, it } from "vitest";
import { subscribeWork } from "../subscribeWork";

// モックRepositoryでテスト
const mockWatchRepo: WatchRepository = {
  subscribe: vi.fn(),
  // ...
};

describe("subscribeWork", () => {
  it("should subscribe user to work", async () => {
    mockWatchRepo.subscribe.mockResolvedValue(Ok(undefined));
    const result = await subscribeWork({ watchRepo: mockWatchRepo })("user1", 1);
    expect(result.err).toBeUndefined();
  });
});
```

## 7. 移行ステップ

| Step | 内容 | リスク | 影響範囲 | 状態 |
|------|------|--------|---------|------|
| **0** | `app/utils/result.ts` に `Result`, `Ok`, `Err`, `tryResult`, `AppError`, `errorToStatus`, `errorToMessage` を定義 | 低 | なし | ✅ |
| **1** | 純粋計算関数を `domain/` に抽出 | 低 | `_index.tsx` | ✅ |
| **2** | `components/*/action.server.ts` のバリデーションを `Result` に置き換え | 中 | コンポーネントとrouteのaction | ✅ |
| **3** | Repository interface + Prisma実装を追加 | 低 | なし (新規追加のみ) | ✅ |
| **4** | `create.tsx` の `TE.bind` チェーンを Use Case + 早期returnに書き換え | 高 | `create.tsx` | ✅ |
| **5** | `works.$workId/action.ts` のaction分岐をUse Caseに抽出 | 高 | `works.$workId` | ✅ |
| **6** | `_index.tsx` loaderのクエリ群をUse Caseに抽出 | 高 | `_index.tsx`, `my._index.tsx` | ✅ |
| **7** | `fp-ts` 依存を `package.json` から削除 | 低 | package.json | ✅ |

Step 4が最も影響が大きいので、Step 2-3でResult型とドメイン層の基盤を固めてから取り組むこと。

## 8. 進捗と申し送り (Step 0-2 完了)

### 完了した変更

| 変更 | 説明 |
|------|------|
| `app/utils/result.ts` | `Result<T,E>`, `Ok`, `Err`, `AppError`, `tryResult`, `errorToStatus`, `errorToMessage` を定義 |
| `app/domain/date/util.ts` | `getAnimeDate`: Date→日付キー(yyyy/M/d)、4hオフセット(深夜アニメ28時基準)。`~/utils/date` に依存 |
| `app/domain/date/__tests__/util.test.ts` | 上記のテスト |
| `app/domain/ticket/compute.ts` | `setOldestOfWork`: 同一workId内で最もpublishedAtが古い話数に `watchReady:true` をマーク。`publishedAt` を型制約に要求 |
| `app/domain/ticket/__tests__/compute.test.ts` | 上記のテスト（非破壊保証、順序非依存を確認） |
| `app/domain/metrics/compute.ts` | `countOccurrence`, `mergeWeekMetrics`, `computeCumulativeMetrics` を `_index.tsx` から抽出 |
| `app/domain/metrics/__tests__/compute.test.ts` | 上記のテスト |
| `app/routes/_index.tsx` | 上記抽出関数を import に置き換え。`getQuarterMetrics` 内のインライン reduce を `computeCumulativeMetrics` + `mergeWeekMetrics` に置き換え |
| `app/routes/__tests__/index.test.ts` | **削除**: 内容は domain の各テストファイルに移行 |
| `tsconfig.json` | `exclude: ["**/*.test.ts"]` を削除 (テストファイルにも型チェックが効くように) |
| `app/components/work-create-form/action.server.ts` | fp-ts → Result型 (Ok/Err) に置き換え。`serverValidator` が `Result` を返すように |
| `app/components/work-edit-form/action.server.ts` | fp-ts → Result型 に置き換え。`serverAction` が `Promise<Result<SuccessResult, ErrorResult>>` を返すように |
| `app/components/watch-settings-edit-form/action.server.ts` | fp-ts → Result型 に置き換え。`serverAction` が `Promise<Result<SuccessResult, ErrorResult>>` を返すように |
| `app/adapters/resultToEither.ts` | 新規作成。Result → fp-ts Either/TaskEither に変換する腐敗防止層 |
| `app/routes/create.tsx` | `resultToEither` adapter 経由で `WorkCreateFormServerValidator` を使用 |
| `app/routes/works.$workId/server/action.ts` | `resultToEither`, `awaitResultToTaskEither` adapter 経由で `serverAction` を使用 |
| `app/utils/result.ts` | `Err` の型制約を缓和 (`<E extends AppError>` → `<E>`)して任意のError型を受け取れるように |

### リネーム・整理

| 変更 | 理由 |
|------|------|
| `prismaDate2key` → `getAnimeDate` | Prisma が domain 層に出てくるのは不適切。深夜アニメの28時基準であることを名前に反映 |
| `domain/metrics/` → `domain/date/` に移動 | `getAnimeDate` は metrics 固有ではなくアニメの日付処理という基底知識 |
| `getNormalizedDate` を削除 | `_index.tsx` 内で一度も使用されていないデッドコード。テストでしか使われていなかった |

### 設計判断

| 判断 | 理由 |
|------|------|
| Domain内の依存は「具体→汎用」の方向のみ許可 | 循環依存防止。例: `metrics/compute.ts` → `date/util.ts` |
| `setOldestOfWork` は位置ベースのreverseトリックを廃止 | `publishedAt` を直接比較する純粋関数に。呼び出し元のsort順に依存しない |
| Domain層から `~/utils/date` への依存は許容 | `date2ZonedDateTime` / `formatZDT` は副作用のない純粋関数であり、Prisma/React Routerのような外部インフラではない |
| `Result` の第二型引数 (Error) は任意の型を許容 | 旧的には `extends AppError` で制約されていたが、component-level のエラーハンドリングでは `AppError` 以外の型も使うため緩和 |

### 今後の課題 (Step 2 相关)

- `_index.tsx` はまだ fp-ts (`A.sequenceT`, `T.ApplyPar`) を使用している。Step 6で除去予定
- `app/domain/metrics/compute.ts` は `getAnimeDate` を import して metrics 関数内で利用している
- ディレクトリ構成の `domain/date/` は本計画の「ディレクトリ構造」の図には未記載
- `serverAction` / `serverValidator` が `components/` にあるのは过渡的なもの。いずれ Use Case 層に移動する
- `resolveFormDataEntryValueToNonEmptyStringOrNull` は `FormDataEntryValue` をハンドリングするインフラ層のロジック。将来到了 adapter 層（例: `app/adapters/form-data.ts`）に移動する可能性が高い

## 9. 進捗と申し送り (Step 3 完了)

### 完了した変更

| 変更 | 説明 |
|------|------|
| `app/domain/watch/types.ts` | `SubscribedWorkSummary`, `WatchSettingsInput`, `TicketWorkSummary`, `TicketEpisode`, `WatchAchievement` を定義 |
| `app/domain/work/types.ts` | `WorkInput`, `WorkUpdateInput`, `WorkCore`, `WorkDetail`, `WorkListItem`, `WorkTitleRecord` を定義（`WorkCore` を `extends` の起点に） |
| `app/domain/episode/types.ts` | `EpisodeInput` を定義 |
| `app/domain/watch/repository.ts` | `WatchRepository` interface (9メソッド)。戻り値型は `types.ts` のDTOを使用 |
| `app/domain/work/repository.ts` | `WorkRepository` interface (7メソッド) |
| `app/domain/episode/repository.ts` | `EpisodeRepository` interface (4メソッド) |
| `app/domain/metrics/repository.ts` | `MetricsRepository` interface (4メソッド) |
| `app/adapters/repository/prisma/watch.ts` | `createWatchRepository(db)` — Prisma実装 |
| `app/adapters/repository/prisma/work.ts` | `createWorkRepository(db)` — Prisma実装 |
| `app/adapters/repository/prisma/episode.ts` | `createEpisodeRepository(db)` — Prisma実装 |
| `app/adapters/repository/prisma/metrics.ts` | `createMetricsRepository(db)` — Prisma実装 |

### 設計判断

| 判断 | 理由 |
|------|------|
| Repositoryの戻り値DTOは `domain/types.ts` に定義し、`extends` で段階的に構成 | インライン型の肥大化を防止。intersection (`&`) より `extends` の方がエラーメッセージが読みやすい |
| `Prisma.EpisodeWhereInput` が `episode/repository.ts` と `metrics/repository.ts` に漏れている | Episodeフィルタ条件オブジェクトの型を自前定義するのが非現実的だったため（PrismaのクエリDSLそのもの）。将来的に独自クエリ条件型に置き換えるか、interfaceを分離する |
| Domain層のDTOは結果的にPrismaの型と似た形状になる | 同一テーブル構造をモデル化している以上避けられない。重要なのは「依存の方向」（Domain ← Adapter）であり、型の「形」が似ることは問題ではない |

### 今後の課題・未解決の問い

- Domain層のDTOとPrisma型の重複に関する最終的な落とし所はまだ見えていない。Prisma自体が「DBから取り出した値をそのまま取り回す」設計思想であり、Clean Architecture的なレイヤー分離との間に自然な緊張関係がある。Step 4以降でUse Caseを書きながら感覚を掴む
- `domain/episode/filter.ts` と `domain/cour/db.ts` は現状 Prisma に依存したまま。これらをRepositoryパターンに乗せるか、Adapter層に移すかは未決定
- `components/*/action.server.ts` はまだ `db` を直接 import している。Step 4-5 で Use Case + Repository に置き換える

## 10. 進捗と申し送り (Step 4 完了)

### 完了した変更

| 変更 | 説明 |
|------|------|
| `app/usecases/createWork.ts` | 新規作成。単一作品登録のUse Case。`WorkRepository.create` + `EpisodeRepository.createMany` をオーケストレーション。早期returnパターンでResult型を返す |
| `app/usecases/bulkCreateWorks.ts` | 新規作成。一括作品登録のUse Case。`WorkRepository.createMany` → `findManyByTitle` → `EpisodeRepository.createMany` の流れを早期returnで実装。P2002の一意制約エラー時は既存作品タイトルを返す |
| `app/routes/create.tsx` | fp-ts (TE.bind, TE.foldW, pipe等) を完全除去。Result型 + Use Case呼び出しに書き換え。DIでRepository実装を注入 |
| `app/components/WorkBulkCreateForm.tsx` | `serverValidator` をfp-ts EitherからResult型(Ok/Err)に変換。fp-ts依存を除去 |
| `app/domain/work/types.ts` | `BulkWorkInput` 型を追加 (title, publishedAt, episodeCount, optional fields) |
| `app/domain/work/repository.ts` | `findManyByTitle` の戻り値を `Promise<WorkTitleRecord[]>` → `Promise<Result<WorkTitleRecord[], AppError>>` に変更 |
| `app/adapters/repository/prisma/work.ts` | P2002 (unique constraint) 検出を `create`/`createMany` に追加。`findManyByTitle` にエラーハンドリングを追加。`isUniqueConstraintError` ヘルパーを抽出 |

### 設計判断

| 判断 | 理由 |
|------|------|
| `WorkRepository.create`/`createMany` でP2002を `{ type: "unique_constraint" }` エラーとして返す |	fp-tsのtry-catchで直接Prismaエラーを処理していた旧コードから、Repository層でP2002を検出しドメインエラーに変換する設計に変更。Use Case層はPrismaのエラーコードを知らない |
| `bulkCreateWorks` でP2002後に `findManyByTitle` を呼んで重複タイトルを特定 | 一意制約違反の内容(どのタイトルが重複したか)をユーザーに伝えるため、エラー時に既存作品を検索して `duplicatedFields` にタイトルを格納する |
| Use Case入力型に `CreateWorkInput`/`BulkWorkInput` を定義 | フォームのバリデーション結果型とRepository入力型(`WorkInput`)の差異(publishedAtの導出等)をUse Case層で吸収 |
| `create.tsx` はDI (`createWorkRepository(db)`) でUse CaseにRepositoryを注入 | テスト可能性と依存関係の方向(Pramework → Use Cases → Domain ← Adapters)を維持 |
| `WorkBulkCreateForm.serverValidator` は `Result<BulkWorkInput[], { type: "empty" }>` を返す | fp-tsの `E.left({ code: "empty" })` をResult型の `Err({ type: "empty" })` に置き換え。BulkWorkInput型はdomain/work/types.tsで定義 |

### 削除できたfp-ts依存

| ファイル | 変更 |
|---------|------|
| `app/routes/create.tsx` | `fp-ts/lib/function.js`, `fp-ts/lib/Task.js`, `fp-ts/lib/TaskEither.js` のimportを除去 |
| `app/components/WorkBulkCreateForm.tsx` | `fp-ts/lib/Either.js`, `fp-ts/lib/function.js` のimportを除去 |

### fp-ts依存の完全除去 (Step 6-7完了)

| ファイル | 対応 |
|---------|------|
| `app/routes/_index.tsx` | `A.sequenceT(T.ApplyPar)` → `Promise.all([...])` に置き換え。loader ロジックを `getDashboard` Use Case に抽出 |
| `app/utils/middlewares.ts` | **削除**: 未使用の `requireUserIdTaskEither` |
| `app/domain/cour/util.ts` | `pipe` → 通常の変数代入に書き換え |
| `package.json` | `fp-ts` 依存を削除 |

### 今後の課題

- `createWork` Use Caseでepisode作成失敗時のエラーが `{ type: "db", message: "episode creation failed" }` となり、workは作成済みだがepisodeが未作成の不整合状態が発生し得る。将来はトランザクションで対応すべき
- `CreateWorkInput` と `WorkInput` の `publishedAt` の扱い(episodeDate[0]から導出)は、Form→Use Case間のマッピングの代表性に過ぎない。将来的にドメイン層で公開日計算を純粋関数化する可能性あり

## 11. 進捗と申し送り (Step 5 完了)

### 完了した変更

| 変更 | 説明 |
|------|------|
| `app/usecases/editWork.ts` | 新規作成。作品情報編集のUse Case。`WorkRepository.update` を呼び出し。入力検証はroute層で実施 |
| `app/usecases/editWatchSettings.ts` | 新規作成。視聴設定編集のUse Case。`WatchRepository.updateWatchSettings` を呼び出し |
| `app/usecases/subscribeWork.ts` | 新規作成。作品視聴登録のUse Case。`WatchRepository.subscribe` を呼び出し |
| `app/usecases/unsubscribeWork.ts` | 新規作成。作品視聴登録解除のUse Case。`WatchRepository.unsubscribe` を呼び出し |
| `app/usecases/deleteEpisode.ts` | 新規作成。エピソード削除のUse Case。`EpisodeRepository.deleteAndReorder` を呼び出し |
| `app/usecases/addEpisodes.ts` | 新規作成。エピソード一括追加のUse Case。`EpisodeRepository.createMany` を呼び出し |
| `app/routes/works.$workId/server/action.ts` | fp-ts (`E.pipe`, `E.match`, `TE.match`) を完全除去。6つのaction分岐をUse Case呼び出し + switch文に書き換え。DIでRepository実装を注入 |

### 設計判断

| 判断 | 理由 |
|------|------|
| `editWork`, `editWatchSettings` の入力検証をroute層で実施 | 既存の `components/*/action.server.ts` と同様の検証ロジックをroute層に配置。将来的にdomain層のvalidate関数に移動する可能性あり |
| `deleteEpisode`, `addEpisodes` はEpisodeRepositoryの既存メソッドを使用 | `deleteAndReorder`, `createMany` が既にinterfaceに定義されていたため、Use Caseは薄めのオーケストレーションに |
| `action.ts` のswitch文でactionTypeを分岐 | リアキテクチャプランの例に従ったパターン。各caseで早期return |

### 削除できたfp-ts依存

| ファイル | 変更 |
|---------|------|
| `app/routes/works.$workId/server/action.ts` | `fp-ts/lib/Either.js`, `fp-ts/lib/function.js`, `fp-ts/lib/TaskEither.js` のimportを除去 |
| `app/adapters/resultToEither.ts` | **削除**: `create.tsx`, `works.$workId` のfp-ts依存除去により不要に |

### fp-ts依存の完全除去 (Step 6-7完了)

| ファイル | 対応 |
|---------|------|
| `app/routes/_index.tsx` | `A.sequenceT(T.ApplyPar)` → `Promise.all([...])` に置き換え。loader ロジックを `getDashboard` Use Case に抽出 |
| `app/utils/middlewares.ts` | **削除**: 未使用の `requireUserIdTaskEither` |
| `app/domain/cour/util.ts` | `pipe` → 通常の変数代入に書き換え |
| `package.json` | `fp-ts` 依存を削除 |

### 今後の課題

- `components/watch-settings-edit-form/action.server.ts` と `components/work-edit-form/action.server.ts` はまだ存在するが、`action.ts` からは呼び出されなくなった。削除またはテスト用に残すか判断が必要
- `components/work-create-form/action.server.ts` の `serverValidator` は `create.tsx` で引き続き使用されている。将来的にUse Case層またはdomain層のvalidate関数に移動する予定

### リファクタリング: Repositoryシングルトン化

| 変更 | 説明 |
|------|------|
| `app/adapters/repository/prisma/watch.ts` | `createWatchRepository(db)` → `watchRepository` (モジュールレベルシングルトン) |
| `app/adapters/repository/prisma/work.ts` | `createWorkRepository(db)` → `workRepository` |
| `app/adapters/repository/prisma/episode.ts` | `createEpisodeRepository(db)` → `episodeRepository` |
| `app/adapters/repository/prisma/metrics.ts` | `createMetricsRepository(db)` → `metricsRepository` |
| `app/routes/create.tsx` | `createXxxRepository(db)` 呼び出しを削除、シングルトンimportに変更 |
| `app/routes/works.$workId/server/action.ts` | 同上 |

**理由**: React Routerのloader/actionはリクエストごとに独立実行されるため、毎回 `createRepository` を呼ぶのは無駄。`db` が既にsingletonなので、repositoryもモジュールロード時に一度だけ生成すれば良い。

## 12. ディレクトリ構造 (移行後)

```
app/
├── adapters/
│   └── repository/
│       └── prisma/
│           ├── work.ts
│           ├── episode.ts
│           ├── watch.ts
│           └── metrics.ts
├── domain/
│   ├── cour/
│   │   ├── consts.ts (既存)
│   │   ├── util.ts (既存)
│   │   └── db.ts → repository.ts (インターフェースのみに変更、実装はadaptersへ)
│   ├── date/
│   │   ├── util.ts (getAnimeDate: 深夜アニメ28時基準の日付変換)
│   │   └── __tests__/util.test.ts
│   ├── episode/
│   │   ├── consts.ts (既存)
│   │   ├── util.ts (既存)
│   │   ├── filter.ts → repository.ts (インターフェースに変更)
│   │   └── types.ts (新規)
│   ├── work/
│   │   ├── types.ts
│   │   ├── validate.ts (work-create-form/action.server.tsから抽出)
│   │   ├── errors.ts
│   │   └── repository.ts
│   ├── watch/
│   │   ├── types.ts
│   │   ├── errors.ts
│   │   └── repository.ts
│   ├── ticket/
│   │   └── compute.ts (_index.tsxのgetTickets等から抽出)
│   └── metrics/
│       ├── compute.ts (_index.tsxのメトリクス計算から抽出)
│       └── types.ts
├── usecases/
│   ├── getDashboard.ts
│   ├── getWorksList.ts
│   ├── createWork.ts
│   ├── bulkCreateWorks.ts
│   ├── subscribeWork.ts
│   ├── editWork.ts
│   ├── editWatchSettings.ts
│   ├── deleteEpisode.ts
│   └── addEpisodes.ts
├── utils/
│   ├── result.ts (新規: Result型, AppError, ヘルパー)
│   ├── db.server.ts (既存)
│   ├── session.server.ts (既存)
│   ├── date.ts (既存)
│   ├── type.ts (既存)
│   └── validator.ts (既存)
├── routes/ (既存、thin化)
├── components/ (既存、action.server.tsはusecasesに置き換え)
└── ...
```

## 13. 現在のコードとの差分まとめ

| 現在 | 移行後 |
|------|--------|
| `_index.tsx` に `getTickets`, DB query直書き | `domain/ticket/compute.ts` (純粋関数) + `usecases/getDashboard.ts` (オーケストレーション) |
| `getUserId(request)` を各loaderで呼び出し | Use Case が `userId: string` を受け取る (認証はrouteが担当) |
| `db` を直接 import | `Repository` interface を通じて注入 |
| `fp-ts TaskEither` と `try/catch` が混在 | `Result<T, AppError>` + 早期returnに統一 |
| `TE.Do` + `TE.bind` チェーン | 通常の `const` 代入 + `if (result.err) return` |
| `A.sequenceT(T.ApplyPar)` | `Promise.all([...])` |
| `countOccurrence` 等の純粋関数がrouteに定義 | `domain/` に移動しテスト可能に |
| `components/*/action.server.ts` が DB直アクセス | Use Case + Repository に置き換え |
| `utils/middlewares.ts` の未使用 `requireUserIdTaskEither` | 廃止 (認証はrouteのloader/action内で `requireUserId` を呼ぶ) |