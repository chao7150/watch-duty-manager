# Issue #18: コード品質: 健全性評価指標の導入（similarity-ts、主系列）

**作成日**: 2025-01-06  
**優先度**: Medium  
**ラベル**: enhancement, code-quality, tooling  
**更新日**: 2025-01-06

## 背景
コードベースの健全性を定量的に評価し、技術的負債の蓄積を防ぐため、自動化された評価指標を導入する。

## 提案する評価指標

### 1. similarity-ts
- TypeScriptコードの類似性を検出するツール
- コードの重複を定量的に把握
- リファクタリングの機会を特定

### 2. 主系列（Main Sequence）からの距離
- Robert C. Martin（Uncle Bob）の設計品質メトリクス
- 抽象度（Abstractness）と不安定度（Instability）のバランスを評価
- 理想的な設計からの乖離を可視化

## 実装方針

### フェーズ1: similarity-tsの導入
```json
// package.json
{
  "scripts": {
    "analyze:similarity": "similarity-ts analyze src/",
    "analyze:similarity:report": "similarity-ts analyze src/ --format html > similarity-report.html"
  }
}
```

### フェーズ2: 主系列分析の実装
```typescript
// scripts/analyze-main-sequence.ts
interface ModuleMetrics {
  name: string;
  abstractness: number;  // 抽象型の割合
  instability: number;   // 依存関係の不安定度
  distance: number;      // 主系列からの距離
}

// A + I = 1 が理想的な主系列
// Distance = |A + I - 1|
```

### フェーズ3: CI/CDへの統合
```yaml
# .github/workflows/code-quality.yml
name: Code Quality Analysis
on: [push, pull_request]
jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - name: Run similarity analysis
        run: npm run analyze:similarity
      - name: Run main sequence analysis
        run: npm run analyze:main-sequence
      - name: Upload reports
        uses: actions/upload-artifact@v3
```

## 期待される効果
1. **コード重複の削減**
   - similarity-tsにより重複コードを発見し、共通化を促進
   - Issue #13（フォーム処理パターンの共通化）と連携

2. **設計品質の維持**
   - 主系列からの距離を監視し、設計の劣化を早期発見
   - リファクタリングの優先順位付けに活用

3. **技術的負債の可視化**
   - 定量的な指標により、改善の進捗を追跡可能
   - チーム内での共通認識を形成

## 成功基準
- similarity-tsのしきい値: 重複率10%未満
- 主系列からの平均距離: 0.2未満
- CI/CDでの自動実行と警告の仕組み確立

## 参考資料
- [similarity-ts GitHub](https://github.com/...)
- [Clean Architecture - Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [OOD Quality Metrics](https://www.cs.sjsu.edu/~pearce/modules/lectures/ood/quality/metrics.htm)
