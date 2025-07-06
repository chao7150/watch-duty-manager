# Issue #7: テスト: コンポーネントテストとE2Eテストの追加

**作成日**: 2025-07-03  
**優先度**: Medium  
**ラベル**: enhancement, testing, priority:medium

## 問題
- UIコンポーネントのテストが存在しない
- 統合テスト・E2Eテストが未実装
- ルートハンドラーのテストが不足

## リスク
- UIの変更が他の部分に影響する可能性
- リグレッションの検出が困難
- 品質保証が不十分

## 改善案
1. **コンポーネントテスト**
   - React Testing Libraryの導入
   - 主要コンポーネントの単体テスト作成
   
2. **E2Eテスト**
   - PlaywrightまたはCypressの導入
   - 主要なユーザーフローのテスト作成
   
3. **テストカバレッジ目標**
   - 初期目標: 60%
   - 最終目標: 80%以上

```typescript
// Example: コンポーネントテスト
import { render, screen } from '@testing-library/react';
import { Work } from '~/components/work/Work';

test('renders work title', () => {
  render(<Work title="Test Work" />);
  expect(screen.getByText('Test Work')).toBeInTheDocument();
});
```

## 追加すべきテストケース（2025-01-06追記）

### Issue #17の修正に関連するテスト
マイナス視聴遅延機能の実装により、以下のテストケースが必要：

1. **`getTickets`関数のテスト**
   - 遅延が正の場合（+7日）: 公開から7日後にチケットが表示される
   - 遅延が0の場合: 公開と同時にチケットが表示される
   - 遅延が負の場合（-1日）: 公開1日前にチケットが表示される
   - 複数作品で異なる遅延を設定した場合の動作

2. **`unwatchedTickets`フィルタリングのテスト**
   - 各作品の`watchDelaySecFromPublish`を考慮した表示判定

3. **`episode-schedule-section`コンポーネントのテスト**
   - `delay`プロパティが正しく`EpisodeRow`に渡される
   - 視聴可能アイコンが遅延を考慮して表示される

4. **統合テスト**
   - 実際のDBデータで各種遅延パターンが正しく動作する
   - パフォーマンステスト: 大量の購読作品がある場合の処理速度