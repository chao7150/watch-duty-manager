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
| **2** | `components/*/action.server.ts` のバリデーションを `Result` に置き換え | 中 | コンポーネントとrouteのaction | ❌ |
| **3** | Repository interface + Prisma実装を追加 | 低 | なし (新規追加のみ) | ❌ |
| **4** | `create.tsx` の `TE.bind` チェーンを Use Case + 早期returnに書き換え | 高 | `create.tsx` | ❌ |
| **5** | `works.$workId/action.ts` のaction分岐をUse Caseに抽出 | 高 | `works.$workId` | ❌ |
| **6** | `_index.tsx` loaderのクエリ群をUse Caseに抽出 | 高 | `_index.tsx`, `my._index.tsx` | ❌ |
| **7** | `fp-ts` 依存を `package.json` から削除 | 低 | package.json | ❌ |

Step 4が最も影響が大きいので、Step 2-3でResult型とドメイン層の基盤を固めてから取り組むこと。

## 8. 進捗と申し送り (Step 0-1 完了)

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

### 注意点

- `_index.tsx` はまだ fp-ts (`A.sequenceT`, `T.ApplyPar`) を使用している。Step 4-6で除去予定
- `app/domain/metrics/compute.ts` は `getAnimeDate` を import して metrics 関数内で利用している(外部から見れば `getAnimeDate` 経由で間接的に `~/utils/date` に依存している)
- ディレクトリ構成の `domain/date/` は本計画の「8. ディレクトリ構造」の図には未記載。次回更新時に反映推奨

## 10. ディレクトリ構造 (移行後)

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

## 11. 現在のコードとの差分まとめ

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