# Issue #8: アーキテクチャ: リポジトリパターンの導入

**作成日**: 2025-07-03  
**優先度**: Medium  
**ラベル**: enhancement, architecture, priority:medium

## 問題
データアクセスロジックが各ルートファイルに散在しており、保守性が低い。

## 現状の課題
- Prismaクライアントを直接使用
- 同じようなクエリの重複
- テストが困難

## 改善案
1. **リポジトリ層の作成**
   ```typescript
   // app/repositories/work.repository.ts
   export class WorkRepository {
     constructor(private db: PrismaClient) {}
     
     async findById(id: number) {
       return this.db.work.findUnique({
         where: { id },
         include: { episodes: true }
       });
     }
     
     async findByUser(userId: string) {
       return this.db.work.findMany({
         where: { users: { some: { userId } } }
       });
     }
   }
   ```

2. **依存性注入の導入**
   - リポジトリをルートで注入
   - テスト時のモック化が容易に

3. **段階的な移行**
   - 新機能から適用
   - 既存コードは徐々に移行
