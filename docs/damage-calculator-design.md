# ダメージ計算機能 設計ドキュメント

## 概要

城プロ編成ツールにダメージ計算機能を追加する。複数の条件付きバフ、動的な倍率計算（HP依存など）、計略発動状態など、城プロ特有の複雑な計算ロジックに対応する。

## 最新状況（2025-11-20）
- `index.html`/`js/app.js` に「ダメージ計算(β)」タブを実装済み。登録済みバフを自動集計し、敵防御・HP、ヒット数、計略ON/OFFを指定して結果と内訳を表示。条件付きバフは手動トグル適用。
- 「簡易ダメージ計算」タブ（行ベース、複数プロファイル比較）が先行実装され、固定加算・割合・与ダメ/被ダメ・鼓舞などの簡易見積りが可能。
- 設計時に想定した `damageCalculator.js` / `buffManager.js` / `damageUI.js` への分割は未実施。ロジックは `js/app.js` に統合されている。
- HP依存の動的倍率、時間経過/DPS、複数敵シミュレーションなどは未実装。

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

## 実装構成（現状と予定）

- 現状: すべて `js/app.js` に統合。
- 予定: 以下の責務に分割して見通しを良くする。

```
js/
├── app.js               # 初期化・イベント束ね役
├── damageCalculator.js  # 基礎攻撃力、防御、与/被ダメ計算、HP依存など動的計算
├── buffManager.js       # バフ収集・フィルタリング・重複判定・条件評価
└── damageUI.js          # キャラ/敵設定UI、結果表示、内訳表示、トグル制御
```

## 実装フェーズ

### Phase 1: 基礎実装（完了）

**目標**: シンプルなダメージ計算を動作させる

- [x] ダメージ計算タブのHTML作成
- [x] 基礎攻撃力計算（攻撃固定+攻撃割合）
- [x] 防御計算（防御無視含む、防御デバフ反映）
- [x] 単純な与ダメージバフ（条件なし）
- [x] 基本的なUI（敵防御/HP、ヒット数、計略ON/OFF、結果・内訳表示）
- [x] バフの収集と適用（登録済み編成特技/特技/計略を集計）

**実装ファイル**:
- `js/damageCalculator.js`
- `js/buffManager.js`
- `js/damageUI.js`

### Phase 2: 条件システム（進行中）

**目標**: 条件付きバフを正しく評価

- [~] 条件評価エンジン — 手動トグルで適用可。自動判定/優先度制御は未実装。
- [x] 計略中/スキル中の状態管理（`strategyActive` トグル）
- [ ] HP依存など動的条件の実装（未）
- [ ] 条件パターンの拡張（動的倍率・対象判定の厳密化は未）
- [~] 計算内訳の詳細表示 — 現在は簡易内訳のみ。バフ別寄与やタイムラインは未。

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

## 次のステップ（2025-11-20時点）

1. ファイル分割（calculator / manager / UI）とロジック整理
2. HP依存・属性条件等の自動評価を追加し、手動トグル依存を減らす
3. DPS計算（攻撃速度・隙）とダメージタイムライン表示を実装
4. バフ重複判定の明示と内訳の詳細化（どのバフが効いているかを一覧表示）
5. テストケース拡充（計算ロジックの単体テスト＋UIスナップショット）

## 更新履歴

- 2025-11-20: 現状反映（実装済み/未実装を明記、フェーズ進捗更新）
- 2025-11-06: 初版作成
