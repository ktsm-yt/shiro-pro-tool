# ダメージ計算機能 設計ドキュメント

## 概要

城プロ編成ツールにダメージ計算機能を追加する。複数の条件付きバフ、動的な倍率計算（HP依存など）、計略発動状態など、城プロ特有の複雑な計算ロジックに対応する。

## 関連Issue

- [Issue #2: ダメージ計算ツールの実装](https://github.com/ktsm-yt/shiro-pro-tool/issues/2)
- [Issue #3: キャラクター登録の簡略化とWikiからのデータ取得連携](https://github.com/ktsm-yt/shiro-pro-tool/issues/3)

## 対応すべき複雑性

### 実例：［絢爛］ダノター城

**特技（改壱）:**
- 自身の攻撃が敵の防御を無視
- 耐久50%以下の敵に与えるダメージ1.5倍
- 射程内城娘の攻撃40%、［絢爛］城娘は50%上昇
- 計略中、自身の与えるダメージ1.3倍、攻撃後の隙60%短縮

**計略（改壱）:**
- 10秒間対象の与ダメ/攻撃速度2.5倍
- 敵の耐久が低い程与えるダメージ上昇（最大2.5倍、動的）

### 複雑性の要素

1. **防御無視** - 防御計算をスキップ
2. **条件付きバフ** - 敵HP、計略状態、対象タグで効果が変わる
3. **動的倍率** - 敵HP残量に応じて倍率がリアルタイムで変化
4. **複数バフの乗算** - 1.3倍 × 2.5倍 = 3.25倍
5. **状態依存** - 計略発動中のみ有効なバフ

## アーキテクチャ設計

### レイヤー型ダメージ計算エンジン

```javascript
const damageCalculator = {
  // Step 1: 基礎攻撃力計算
  calculateBaseAttack(character, buffs)

  // Step 2: 防御計算
  calculateDefenseReduction(baseAttack, enemyDefense, buffs)

  // Step 3: 与ダメージバフ計算（条件評価含む）
  calculateDamageMultipliers(baseDamage, buffs, context)

  // Step 4: 条件評価エンジン
  evaluateCondition(condition, context)

  // HP依存の動的倍率計算
  calculateHPBasedMultiplier(enemyHPPercent)

  // 最終ダメージ計算（全ステップ統合）
  calculate(character, enemy, buffs, context)
}
```

### 計算フロー

```
基礎攻撃力
  ↓
+ 攻撃固定バフ
  ↓
× 攻撃割合バフ（加算後乗算）
  ↓
- 敵防御力（防御無視の場合スキップ）
  ↓
× 与ダメージバフ（条件評価後、乗算）
  ↓
= 最終ダメージ
```

## データ構造設計

### バフデータ構造（拡張）

```javascript
{
  // 既存フィールド
  target: '自身' | '味方射程内' | '味方全員',
  type: '攻撃固定' | '攻撃割合' | '与ダメ' | '防御無視',
  value: 40,
  unit: '+%' | '×' | '+',
  condition: '耐久50%以下', // テキスト
  duplicate: false,

  // 新規フィールド（計算用）
  conditionData: {
    type: 'enemyHP' | 'strategyActive' | 'targetTag',
    operator: '<=' | '>=' | '===',
    value: 0.5,
    dynamic: true,  // HP依存など動的計算
    formula: 'hp'   // 動的計算の種類
  },
  activeWhen: 'always' | 'strategy' | 'skill',
  priority: 1,  // 計算順序
  category: 'attack' | 'damage' | 'defense'
}
```

### 計算コンテキスト

```javascript
{
  enemyHP: 0.3,          // 敵HP残量（0-1）
  strategyActive: true,  // 計略発動中
  skillActive: true,     // 特技発動中（常にtrue）
  target: character,     // 対象キャラクター
  formation: []          // 編成メンバー（範囲判定用）
}
```

### 敵データ構造

```javascript
{
  name: '敵名',
  defense: 1000,
  currentHP: 0.3,  // HP残量（0-1）
  maxHP: 100000,
  attributes: ['水', '平']
}
```

## 条件評価システム

### 条件パターンマッチング

```javascript
const conditionPatterns = {
  'HP依存': (ctx) => calculateHPBasedMultiplier(ctx.enemyHP),
  '耐久50%以下': (ctx) => ctx.enemyHP <= 0.5,
  '耐久80%以下': (ctx) => ctx.enemyHP <= 0.8,
  '計略中': (ctx) => ctx.strategyActive,
  '絢爛': (ctx) => ctx.target?.tags?.includes('絢爛'),
  '水城': (ctx) => ctx.target?.attributes?.includes('水'),
  // 拡張可能
};
```

### 動的倍率計算

```javascript
// HP依存: HP100% → 1.0倍、HP0% → 2.5倍（線形補間）
calculateHPBasedMultiplier(enemyHPPercent) {
  const minMultiplier = 1.0;
  const maxMultiplier = 2.5;
  return minMultiplier + (maxMultiplier - minMultiplier) * (1 - enemyHPPercent);
}
```

## ファイル構成

```
js/
├── app.js               # 既存のメインロジック
├── damageCalculator.js  # ダメージ計算エンジン
├── buffManager.js       # バフ管理・フィルタリング
└── damageUI.js          # ダメージ計算UI処理
```

### 各ファイルの責務

#### `damageCalculator.js`
- 基礎攻撃力計算
- 防御計算
- 与ダメージバフ計算
- 条件評価エンジン
- HP依存など動的計算
- 計算内訳の生成

#### `buffManager.js`
- バフの収集（編成特技、特技、計略）
- バフのフィルタリング（対象判定）
- バフのカテゴリー分け
- 条件評価
- 重複判定

#### `damageUI.js`
- 編成選択
- キャラクター選択
- 敵設定UI
- 計算結果表示
- 計算内訳表示
- インタラクティブ機能（HPスライダー、計略トグル）

## 実装フェーズ

### Phase 1: 基礎実装（最優先）

**目標**: シンプルなダメージ計算を動作させる

- [x] ダメージ計算タブのHTML作成
- [ ] 基礎攻撃力計算（攻撃固定+攻撃割合）
- [ ] 防御計算（防御無視含む）
- [ ] 単純な与ダメージバフ（条件なし）
- [ ] 基本的なUI（敵防御入力、結果表示）
- [ ] バフの収集と適用

**実装ファイル**:
- `js/damageCalculator.js`
- `js/buffManager.js`
- `js/damageUI.js`

### Phase 2: 条件システム

**目標**: 条件付きバフを正しく評価

- [ ] 条件評価エンジンの実装
- [ ] 計略中/スキル中の状態管理
- [ ] HP依存など動的条件の実装
- [ ] 条件パターンの拡張
- [ ] 計算内訳の詳細表示

### Phase 3: 高度な機能

**目標**: 実戦的な機能追加

- [ ] DPS計算（速度・隙を含む）
- [ ] 複数敵への攻撃（対象数考慮）
- [ ] タイムライン表示（バフの時間経過）
- [ ] バフなし/あり比較表示
- [ ] 編成全体の火力比較

### Phase 4: 最適化・改善

**目標**: パフォーマンスとUX向上

- [ ] 計算結果のキャッシング
- [ ] ダメージグラフ（HP推移）
- [ ] プリセット敵データ
- [ ] エクスポート機能（計算結果）
- [ ] モバイル対応

## UI設計

### ダメージ計算タブのレイアウト

```
┌─────────────────────────────────────────────┐
│ ダメージ計算                                 │
├─────────────────┬───────────────────────────┤
│ キャラクター選択  │  敵設定                   │
│                 │  - 防御力                  │
│ 編成から選択     │  - HP残量（スライダー）     │
│ [選択中のキャラ]  │  - 計略発動中（チェック）   │
│                 │  - 基礎攻撃力（手動入力）   │
├─────────────────┴───────────────────────────┤
│ 計算結果                                     │
│ - 最終ダメージ: 8,500                        │
│ - バフなしダメージ: 4,000                    │
│ - ダメージ増加率: +112.5%                    │
├─────────────────────────────────────────────┤
│ 計算内訳                                     │
│ 1. 基礎攻撃力: 5,000                         │
│ 2. 攻撃バフ適用: 7,000 (×1.4)               │
│ 3. 防御計算: 6,000 (敵防御1,000)             │
│ 4. 与ダメバフ適用: 9,000 (×1.5)             │
│ 5. 最終ダメージ: 9,000                       │
└─────────────────────────────────────────────┘
```

## インタラクティブ機能

### リアルタイム計算

- 敵HPスライダーを動かすと即座に再計算
- 計略トグルでON/OFF切り替え
- 各入力値の変更で自動更新

### 視覚的フィードバック

- バフ適用前後の比較表示
- HP依存倍率のグラフ表示（Phase 3）
- 適用中のバフをハイライト

## 技術的な実装詳細

### バフの収集方法

```javascript
function collectAllBuffs(character, formation, context) {
  const allBuffs = [];

  // 1. 編成特技（編成全員から）
  formation.forEach(member => {
    member.formations?.forEach(buff => {
      if (isValidTarget(buff, character)) {
        allBuffs.push({ ...buff, source: 'formation', from: member.name });
      }
    });
  });

  // 2. 特技（自身と射程内から）
  formation.forEach(member => {
    member.skills?.forEach(buff => {
      if (isValidTarget(buff, character)) {
        allBuffs.push({ ...buff, source: 'skill', from: member.name });
      }
    });
  });

  // 3. 計略（計略発動中のみ）
  if (context.strategyActive) {
    character.strategies?.forEach(buff => {
      allBuffs.push({ ...buff, source: 'strategy', from: character.name });
    });
  }

  return allBuffs;
}
```

### 計算内訳の生成

```javascript
function generateBreakdown(steps) {
  return steps.map((step, i) => ({
    step: i + 1,
    description: step.description,
    value: step.value,
    formula: step.formula,
    appliedBuffs: step.appliedBuffs
  }));
}
```

## テストケース

### 基本ケース

```javascript
// ケース1: バフなし、防御あり
{
  baseAttack: 5000,
  enemyDefense: 1000,
  buffs: [],
  expected: 4000
}

// ケース2: 攻撃バフのみ
{
  baseAttack: 5000,
  enemyDefense: 1000,
  buffs: [{ type: '攻撃割合', value: 40, unit: '+%' }],
  expected: 6000  // (5000 * 1.4) - 1000
}

// ケース3: 防御無視
{
  baseAttack: 5000,
  enemyDefense: 1000,
  buffs: [{ type: '防御無視' }],
  expected: 5000
}
```

### 複雑なケース（ダノター城）

```javascript
{
  baseAttack: 5000,
  enemyDefense: 1000,
  enemyHP: 0.3,  // 30%
  strategyActive: true,
  buffs: [
    { type: '攻撃割合', value: 40, unit: '+%' },
    { type: '防御無視' },
    { type: '与ダメ', value: 1.5, unit: '×', condition: '耐久50%以下' },
    { type: '与ダメ', value: 1.3, unit: '×', activeWhen: 'strategy' },
    { type: '与ダメ', value: 2.5, unit: '×', conditionData: { dynamic: true, formula: 'hp' } }
  ],
  expected: 5000 * 1.4 * 1.5 * 1.3 * (1 + 1.5 * 0.7) = 28,665
}
```

## 拡張性の考慮

### 将来追加する可能性のある機能

1. **複数攻撃の計算**
   - 対象数によるダメージ分散
   - 連続攻撃の合計ダメージ

2. **時間軸の追加**
   - バフの持続時間
   - DPS時系列グラフ

3. **確率的要素**
   - クリティカル率
   - 発動率のあるバフ

4. **複数敵シミュレーション**
   - 敵グループへの攻撃
   - 敵撃破時間の計算

5. **最適化提案**
   - 火力を最大化する編成提案
   - バフの優先順位分析

## 参考リンク

- [城プロRE 城娘図鑑Wiki - ダノター城](https://scre.swiki.jp/index.php?［絢爛］ダノター城)
- [GitHub Issue #2: ダメージ計算ツールの実装](https://github.com/ktsm-yt/shiro-pro-tool/issues/2)

## 次のステップ

1. ✅ HTMLにダメージ計算タブを追加
2. 🔄 3つのJSファイルを作成
   - `js/damageCalculator.js`
   - `js/buffManager.js`
   - `js/damageUI.js`
3. 🔄 index.htmlで新しいJSファイルを読み込み
4. 🔄 Phase 1の基礎実装
5. ⏳ 動作確認とテスト

## 更新履歴

- 2025-11-06: 初版作成
