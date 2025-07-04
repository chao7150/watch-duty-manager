# Issue #15: データベース: マイグレーション戦略とインデックス最適化

**作成日**: 2025-07-03  
**優先度**: Medium  
**ラベル**: enhancement, performance, priority:medium

## 問題
1. Prismaマイグレーションの運用戦略が不明確
2. パフォーマンスに必要なインデックスが不足している可能性

## リスク
- 大量データでのクエリ性能劣化
- マイグレーションの失敗によるダウンタイム

## 改善案
1. **インデックスの追加**
   ```prisma
   model Episode {
     @@index([publishedAt])
     @@index([workId, publishedAt])
   }
   
   model SubscribedWorksOnUser {
     @@index([userId])
   }
   ```

2. **マイグレーション戦略**
   - ステージング環境での事前検証
   - ロールバック手順の文書化
   - ゼロダウンタイムデプロイの検討

3. **クエリ分析**
   - slow query logの定期確認
   - EXPLAIN文での実行計画確認