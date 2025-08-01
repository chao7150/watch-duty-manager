# Issue #12: エラーハンドリング: 詳細なエラー情報の保持と構造化

**作成日**: 2025-07-03  
**優先度**: Medium  
**ラベル**: enhancement, tech-debt, priority:medium

## 問題
エラーハンドリングで詳細な情報が失われている箇所がある。

## 該当箇所
- `app/routes/works.$workId/server/action.ts` line 72-74
- 一般的すぎるエラーメッセージ（"db error"など）

## 改善案
1. **エラーの構造化**
   ```typescript
   class AppError extends Error {
     constructor(
       message: string,
       public code: string,
       public statusCode: number,
       public details?: any
     ) {
       super(message);
     }
   }
   ```

2. **エラーログの改善**
   ```typescript
   try {
     // 処理
   } catch (error) {
     logger.error({
       error: error instanceof Error ? error.message : 'Unknown error',
       stack: error instanceof Error ? error.stack : undefined,
       context: { userId, workId }
     });
     throw new AppError('作品の更新に失敗しました', 'WORK_UPDATE_FAILED', 500);
   }
   ```

3. **ユーザー向けメッセージの改善**
   - 技術的詳細を隠蔽
   - 分かりやすいエラーメッセージ
