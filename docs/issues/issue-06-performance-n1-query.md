# Issue #6: パフォーマンス: N+1クエリ問題の解消とページネーション実装

**作成日**: 2025-07-03  
**優先度**: High  
**ラベル**: enhancement, performance, priority:high

## 問題
1. 複雑なネストされたinclude文によるN+1クエリ問題
2. ページネーションが未実装で全件取得している

## 影響箇所
- `app/routes/works.$workId/server/loader.ts`
- `app/routes/_index.tsx`のfindMany呼び出し

## 改善案
1. **クエリの最適化**
   - 必要なデータのみ選択
   - JOINの見直し
   - データローダーパターンの導入検討

2. **ページネーション実装**
   ```typescript
   const works = await db.work.findMany({
     take: 20,
     skip: (page - 1) * 20,
     orderBy: { publishedAt: 'desc' }
   });
   ```

3. **インデックスの追加**
   - よく検索される列にインデックスを追加
   - 複合インデックスの検討