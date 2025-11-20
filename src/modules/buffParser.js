// 武器種マッピングテーブル（武器種 → 遠近・物術・配置）
const weaponMapping = {
    "弓": { range: "遠", type: "物", placement: "遠" },
    "鉄砲": { range: "遠", type: "物", placement: "遠" },
    "石弓": { range: "遠", type: "物", placement: "遠" },
    "投剣": { range: "遠", type: "物", placement: "遠近" },
    "軍船": { range: "遠", type: "物", placement: "遠近" },
    "槍": { range: "近", type: "物", placement: "近" },
    "刀": { range: "近", type: "物", placement: "近" },
    "盾": { range: "近", type: "物", placement: "近" },
    "ランス": { range: "近", type: "物", placement: "近" },
    "双剣": { range: "近", type: "物", placement: "近" },
    "拳": { range: "近", type: "物", placement: "近" },
    "鞭": { range: "近", type: "物", placement: "遠近" },
    "茶器": { range: "近", type: "物", placement: "遠近" },
    "歌舞": { range: "遠", type: "術", placement: "遠" },
    "本": { range: "遠", type: "術", placement: "遠" },
    "砲術": { range: "遠", type: "術", placement: "遠" },
    "鈴": { range: "遠", type: "術", placement: "遠" },
    "杖": { range: "遠", type: "術", placement: "遠" },
    "札": { range: "遠", type: "術", placement: "遠" },
    "大砲": { range: "遠", type: "物", placement: "遠近" },
    "陣貝": { range: "遠", type: "術", placement: "遠近" }
};

// バフパターンマッチング定義
const buffPatterns = [
    // 攻撃バフ（巨大化対応：×5倍して登録）
    { pattern: /巨大化する度に.*?攻撃(?:力)?[がを]?([+＋-－]?\d+(?:\.\d+)?)[％%](?:上昇|アップ|UP|増加)?/i, type: "攻撃割合", unit: "+%", skipGiantMultiplier: true, getValue: (m) => parseFloat(m[1].replace('＋', '+').replace('－', '-')) * 5 },
    { pattern: /巨大化する度に.*?攻撃(?:力)?(?:と)?[がを]?([+＋-－]?\d+)(?![％%倍])(?:上昇|アップ|UP|増加)?/i, type: "攻撃固定", unit: "+", skipGiantMultiplier: true, getValue: (m) => parseInt(m[1].replace('＋', '+').replace('－', '-')) * 5 },
    { pattern: /攻撃(?:力)?[がを]?([+＋-－]?\d+(?:\.\d+)?)[％%](?:上昇|アップ|UP|増加)/i, type: "攻撃割合", unit: "+%", getValue: (m) => parseFloat(m[1].replace('＋', '+').replace('－', '-')) },
    { pattern: /攻撃(?:力)?[がを]?([+＋-－]?\d+)(?:上昇|アップ|UP|増加)/i, type: "攻撃固定", unit: "+", getValue: (m) => parseInt(m[1].replace('＋', '+').replace('－', '-')) },
    { pattern: /攻撃(?:力)?が(\d+(?:\.\d+)?)倍/i, type: "攻撃割合", unit: "×", getValue: (m) => parseFloat(m[1]) },

    // 防御バフ（巨大化対応：×5倍して登録）
    { pattern: /巨大化する度に.*?防御(?:力)?[がを]?([+＋-－]?\d+(?:\.\d+)?)[％%](?:上昇|アップ|UP|増加)/i, type: "防御割合", unit: "+%", skipGiantMultiplier: true, getValue: (m) => parseFloat(m[1].replace('＋', '+').replace('－', '-')) * 5 },
    { pattern: /巨大化する度に.*?防御(?:力)?[がを]?([+＋-－]?\d+)(?:上昇|アップ|UP|増加)/i, type: "防御固定", unit: "+", skipGiantMultiplier: true, getValue: (m) => parseInt(m[1].replace('＋', '+').replace('－', '-')) * 5 },
    { pattern: /防御(?:力)?[がを]?(?:[^％%]*?)([+＋-－]?\d+(?:\.\d+)?)[％%](?:上昇|アップ|UP|増加)/i, type: "防御割合", unit: "+%", getValue: (m) => parseFloat(m[1].replace('＋', '+').replace('－', '-')) },
    { pattern: /防御(?:力)?[がを]?([+＋-－]?\d+)(?:上昇|アップ|UP|増加)/i, type: "防御固定", unit: "+", getValue: (m) => parseInt(m[1].replace('＋', '+').replace('－', '-')) },
    { pattern: /防御(?:力)?が(\d+(?:\.\d+)?)倍/i, type: "防御割合", unit: "×", getValue: (m) => parseFloat(m[1]) },
    { pattern: /防御[をが]?無視/i, type: "防御無視", unit: "", getValue: () => null },

    // 回復バフ（巨大化対応：×5倍して登録）
    { pattern: /巨大化する度に.*?回復[がを]?([+＋-－]?\d+)(?:上昇|アップ|UP|増加)/i, type: "回復", unit: "+", skipGiantMultiplier: true, getValue: (m) => parseInt(m[1].replace('＋', '+').replace('－', '-')) * 5 },
    { pattern: /回復[がを]?([+＋-－]?\d+)(?:上昇|アップ|UP|増加)/i, type: "回復", unit: "+", getValue: (m) => parseInt(m[1].replace('＋', '+').replace('－', '-')) },
    { pattern: /回復[がを]?(\d+(?:\.\d+)?)倍/i, type: "回復割合", unit: "×", getValue: (m) => parseFloat(m[1]) },

    // 防御デバフ
    { pattern: /(?:敵の)?防御(?:力)?[がを]?(?:[^％%]*?)([+＋-－]?\d+(?:\.\d+)?)[％%](?:低下|減少|ダウン|DOWN)/i, type: "防御デバフ割合", unit: "+%", getValue: (m) => parseFloat(m[1].replace('＋', '+').replace('－', '-')) },
    { pattern: /(?:敵の)?防御(?:力)?[がを]?([+＋-－]?\d+)(?:低下|減少|ダウン|DOWN)/i, type: "防御デバフ固定", unit: "+", getValue: (m) => parseInt(m[1].replace('＋', '+').replace('－', '-')) },

    // 攻撃デバフ
    { pattern: /(?:敵の)?攻撃(?:力)?[がを]?([+＋-－]?\d+(?:\.\d+)?)[％%](?:低下|減少|ダウン|DOWN)/i, type: "攻撃デバフ割合", unit: "+%", getValue: (m) => parseFloat(m[1].replace('＋', '+').replace('－', '-')) },
    { pattern: /(?:敵の)?攻撃(?:力)?[がを]?([+＋-－]?\d+)(?:低下|減少|ダウン|DOWN)/i, type: "攻撃デバフ固定", unit: "+", getValue: (m) => parseInt(m[1].replace('＋', '+').replace('－', '-')) },

    // ダメージ
    { pattern: /与えるダメージ[がを]?(\d+(?:\.\d+)?)倍/i, type: "与えるダメージ", unit: "×", getValue: (m) => parseFloat(m[1]) },
    { pattern: /与ダメ(?:ージ)?(?:の)?([+＋-－]?\d+)[％%][^。]*回復/i, type: "与ダメ回復", unit: "+%", getValue: (m) => parseFloat(m[1].replace('＋', '+').replace('－', '-')) },
    { pattern: /与ダメ(?:ージ)?[がを]?(\d+(?:\.\d+)?)倍/i, type: "与ダメ", unit: "×", getValue: (m) => parseFloat(m[1]) },
    { pattern: /(?:受ける|被)ダメ(?:ージ)?[がを]?(\d+(?:\.\d+)?)倍/i, type: "被ダメ", unit: "×", getValue: (m) => parseFloat(m[1]) },
    { pattern: /(?:受ける|被)ダメ(?:ージ)?[がを]?([+＋-－]?\d+(?:\.\d+)?)[％%](上昇|増加|低下|減少|DOWN|ダウン|軽減)/i, type: "被ダメ", unit: "+%", getValue: (m) => {
        const value = parseFloat(m[1].replace('＋', '+').replace('－', '-'));
        const action = m[2].toLowerCase();
        if (/低下|減少|down|ダウン|軽減/.test(action)) {
            return -Math.abs(value);
        }
        return value;
    }},
    { pattern: /与えるダメージ[がを]?([+＋-－]?\d+(?:\.\d+)?)[％%](?:上昇|アップ|UP|増加)/i, type: "与えるダメージ", unit: "+%", getValue: (m) => parseFloat(m[1].replace('＋', '+').replace('－', '-')) },
    { pattern: /与ダメ(?:ージ)?[がを]?([+＋-－]?\d+(?:\.\d+)?)[％%](?:上昇|アップ|UP|増加)/i, type: "与ダメ", unit: "+%", getValue: (m) => parseFloat(m[1].replace('＋', '+').replace('－', '-')) },

    // 射程（巨大化対応：×5倍して登録）
    { pattern: /巨大化する度に[^。]*?射程(?=[がをと])[^\d]*([+＋-－]?\d+(?:\.\d+)?)[％%](?:上昇|アップ|UP|増加)?/i, type: "射程割合", unit: "+%", skipGiantMultiplier: true, getValue: (m) => parseFloat(m[1].replace('＋', '+').replace('－', '-')) * 5 },
    { pattern: /巨大化する度に[^。]*?射程(?=[がをと])[^\d]*([+＋-－]?\d+)(?![％%])/i, type: "射程固定", unit: "+", skipGiantMultiplier: true, getValue: (m) => parseInt(m[1].replace('＋', '+').replace('－', '-')) * 5 },
    { pattern: /射程(?:[がをと]|は)?\s*([+＋-－]?\d+(?:\.\d+)?)[％%](?:上昇|アップ|UP|増加)/i, type: "射程割合", unit: "+%", getValue: (m) => parseFloat(m[1].replace('＋', '+').replace('－', '-')) },
    { pattern: /射程(?:[がをと]|は)?\s*([+＋-－]?\d+(?:\.\d+)?)[％%](?:低下|減少|ダウン|DOWN)/i, type: "射程割合", unit: "+%", getValue: (m) => -Math.abs(parseFloat(m[1].replace('＋', '+').replace('－', '-'))) },
    { pattern: /射程(?:[がをと]|は)?\s*([+＋-－]?\d+)(?![％%])(?:上昇|アップ|UP|増加)/i, type: "射程固定", unit: "+", getValue: (m) => parseInt(m[1].replace('＋', '+').replace('－', '-')) },

    // 速度・隙
    { pattern: /(?:攻撃)?速度[がを]?([+＋-－]?\d+(?:\.\d+)?)[％%](?:上昇|アップ|UP|増加)/i, type: "速度", unit: "+%", getValue: (m) => parseFloat(m[1].replace('＋', '+').replace('－', '-')) },
    { pattern: /(?:攻撃)?速度[がを]?([+＋-－]?\d+(?:\.\d+)?)[％%](?:低下|減少|ダウン|DOWN)/i, type: "速度", unit: "-%", getValue: (m) => parseFloat(m[1].replace('＋', '+').replace('－', '-')) },
    { pattern: /(?:攻撃後の)?隙[がを]?([+＋-－]?\d+(?:\.\d+)?)[％%](?:低下|減少|短縮)/i, type: "隙", unit: "+%", getValue: (m) => parseFloat(m[1].replace('＋', '+').replace('－', '-')) },
    { pattern: /隙[がを]?([+＋-－]?\d+(?:\.\d+)?)[％%](?:増加|上昇)/i, type: "隙", unit: "-%", getValue: (m) => parseFloat(m[1].replace('＋', '+').replace('－', '-')) },

    // 対象数
    { pattern: /(?:攻撃)?対象[がを]?(\d+)(?:体)?(?:増加|上昇|アップ|UP)/i, type: "対象数", unit: "+", getValue: (m) => parseInt(m[1]) },

    // 気トークン
    { pattern: /撃破(?:獲得|時)?気[がを]?(\d+)(?:増加|上昇)/i, type: "気(ノビ)", unit: "+", getValue: (m) => parseInt(m[1]) },
    { pattern: /計略使用時[^。]*?気トークン[がを]?(\d+)(?:増加|上昇)/i, type: "気(牛)", unit: "+", getValue: (m) => parseInt(m[1]) },
    { pattern: /行動開始時[^。]*?気トークン[がを]?(\d+)(?:増加|上昇)/i, type: "気(ノビ)", unit: "+", getValue: (m) => parseInt(m[1]) },
    { pattern: /徐々に[^。]*?気トークン[がを]?(\d+)(?:増加|上昇)/i, type: "徐々気", unit: "+", getValue: (m) => parseFloat(m[1]) },
    { pattern: /(?:毎秒)?(?:気トークン|気)[がを]?(\d+(?:\.\d+)?)(?:増加|上昇|取得)/i, type: "自然気", unit: "+", getValue: (m) => parseFloat(m[1]) },
    { pattern: /消費(?:気トークン|気)[がを]?(\d+(?:\.\d+)?)[％%](?:減少|軽減)/i, type: "気軽減", unit: "+%", getValue: (m) => parseFloat(m[1]) },
    { pattern: /巨大化気[がを]?(\d+(?:\.\d+)?)[％%](?:軽減|減少)/i, type: "気軽減", unit: "+%", getValue: (m) => parseFloat(m[1]) },

    // 計略再使用
    { pattern: /計略(?:の)?再使用[^。]*?(\d+(?:\.\d+)?)[％%](?:短縮|減少)/i, type: "計略短縮", unit: "+%", getValue: (m) => parseFloat(m[1]) },

    // 移動速度（巨大化対応：×5倍して登録）
    { pattern: /巨大化する度に.*?移動速度[がを]?(\d+(?:\.\d+)?)[％%](?:低下|減少|ダウン|DOWN)/i, type: "移動低下", unit: "-%", skipGiantMultiplier: true, getValue: (m) => parseFloat(m[1]) * 5 },
    { pattern: /巨大化する度に.*?移動速度[がを]?(\d+(?:\.\d+)?)[％%](?:上昇|増加|アップ|UP)/i, type: "移動上昇", unit: "+%", skipGiantMultiplier: true, getValue: (m) => parseFloat(m[1]) * 5 },
    { pattern: /移動速度[がを]?(\d+(?:\.\d+)?)[％%](?:低下|減少|ダウン|DOWN)/i, type: "移動低下", unit: "-%", getValue: (m) => parseFloat(m[1]) },
    { pattern: /移動速度[がを]?(\d+(?:\.\d+)?)[％%](?:上昇|増加|アップ|UP)/i, type: "移動上昇", unit: "+%", getValue: (m) => parseFloat(m[1]) },
    { pattern: /移動速度[がを]?(\d+(?:\.\d+)?)(?:に変更|へ変更)/i, type: "移動変更", unit: "+", getValue: (m) => parseFloat(m[1]) },
    { pattern: /移動(?:を)?停止/i, type: "移動停止", unit: "", getValue: () => null },
    { pattern: /(?:敵を)?(大きく|少し)?[^。]*?(?:後退|ノックバック)させる/i, type: "移動後退", unit: "+", getValue: (m) => {
        const phrase = m[0] || '';
        if (/大きく/.test(phrase)) return 3;
        if (/少し/.test(phrase)) return 1;
        return 2;
    }},
    { pattern: /(\d+)(?:マス)?(?:後退|ノックバック)/i, type: "移動後退", unit: "+", getValue: (m) => parseInt(m[1]) }
];

const TARGET_BASE_OPTIONS = ['自身', '射程内', '全'];
const TARGET_BASE_PRIORITY = {
    '全': 3,
    '射程内': 2,
    '自身': 1
};
const ATTRIBUTE_MODIFIERS = ['水', '平', '山', '平山', '地獄'];
const ATTRIBUTE_MODIFIER_SET = new Set(ATTRIBUTE_MODIFIERS);
const TARGET_MODIFIER_ORDER = ['味方', '伏兵', '殿', '水', '平', '山', '平山', '地獄'];
const TARGET_MODIFIER_OPTIONS = new Set(['味方', '伏兵', '殿', ...ATTRIBUTE_MODIFIERS]);
const CONDITION_SELF_KEYWORDS = /(自分|自身)のみ(?:が)?対象?|対象(?:は|が)?(自分|自身)のみ/;

const ALL_ENEMY_REGEX = /(?:全て|すべて)の敵|敵全体|全敵/;

const TARGET_KEYWORD_RULES = [
    { pattern: /自身/i, base: '自身', modifiers: [] },
    { pattern: /範囲内(?:の)?殿/i, base: '射程内', modifiers: ['殿'] },
    { pattern: /殿/i, base: '全', modifiers: ['殿'] },
    { pattern: /伏兵(?:の)?射程(?:内|範囲)/i, base: '射程内', modifiers: ['伏兵'] },
    { pattern: /伏兵/i, base: '射程内', modifiers: ['伏兵'] },
    { pattern: /味方(?:の)?射程(?:内|範囲)/i, base: '射程内', modifiers: ['味方'] },
    { pattern: /(?:自身の)?射程(?:内|範囲)(?:の)?味方/i, base: '射程内', modifiers: ['味方'] },
    { pattern: /範囲内(?:の)?味方/i, base: '射程内', modifiers: ['味方'] },
    { pattern: /味方(?:の)?(?:全員|全て|全体)/i, base: '全', modifiers: ['味方'] },
    { pattern: /射程(?:内|範囲)(?:の)?城娘/i, base: '射程内', modifiers: [] },
    { pattern: /範囲内(?:の)?城娘/i, base: '射程内', modifiers: [] },
    { pattern: /(?:全ての?|すべての?)(?:城娘|ユニット)/i, base: '全', modifiers: [] },
    { pattern: /(?:全て|すべて)(?:の)?敵|敵全体|全敵/i, base: '全', modifiers: [] },
    { pattern: /全員/i, base: '全', modifiers: [] },
    { pattern: /射程(?:内|範囲)/i, base: '射程内', modifiers: [] },
    { pattern: /全(?:て|体)の敵|敵全体|全敵/i, base: '全', modifiers: [] }
];

const ATTRIBUTE_KEYWORDS = [
    { pattern: /水城|水属性|水の城娘/i, value: '水' },
    { pattern: /平城|平属性|平の城娘/i, value: '平' },
    { pattern: /山城|山属性|山の城娘/i, value: '山' },
    { pattern: /平山城|平山属性|平山の城娘/i, value: '平山' },
    { pattern: /地獄城|地獄属性|地獄の城娘/i, value: '地獄' }
];

const conditionPatterns = [
    { pattern: /(水|平|山|平山|地獄|無属性)(?:城娘)?(?:のみ|限定)/i, group: 0 },
    { pattern: /(飛行敵(?:のみ|は)?)/i, group: 0 },
    { pattern: /(伏兵(?:のみ|出現中)?)/i, group: 0 },
    { pattern: /(耐久\d+[％%]以[上下])/i, group: 0 },
    { pattern: /(敵の?HP\d+[％%]以[上下])/i, group: 0 },
    { pattern: /(敵の?防御\d+[％%]以[上下])/i, group: 0 },
    { pattern: /(計略(?:中|発動中)|特技(?:中|発動中))/i, group: 0 },
    { pattern: /(射程[内外]は[^。、（）]+)/i, group: 0 },
    { pattern: /([^。、（）]+?には効果\d+倍)/i, group: 1, sources: ['after'] },
    { pattern: /([^。、（）]+?のみ)/i, group: 1 },
    { pattern: /([^。、（）]+?に対して)/i, group: 1 },
    { pattern: /([^。、（）]+?の場合)/i, group: 1 },
    { pattern: /([^。、（）]+?時)/i, group: 1 }
];

const DUPLICATE_HINT_REGEX = /(効果重複|重複可|重複可能)/;
const SELF_ONLY_NOTE_REGEX = /(?:\(|（)?(?:自分|自身)のみ(?:\)|）)?/;
const SELF_ONLY_TARGET_TYPES = new Set(['攻撃割合', '攻撃固定', '与ダメ', '与えるダメージ']);
const ENEMY_KEYWORD_REGEX = /(敵|被ダメ|敵方)/;

const GIANT_MULTIPLIER_TYPES = new Set([
    '攻撃割合',
    '攻撃固定',
    '防御割合',
    '防御固定',
    '防御デバフ割合',
    '防御デバフ固定',
    '射程割合',
    '射程固定',
    '速度',
    '隙',
    '与ダメ',
    '与えるダメージ',
    '与ダメ回復',
    '被ダメ',
    '移動低下',
    '移動上昇',
    '移動変更',
    '移動後退',
    '回復',
    '回復割合'
]);

const GIANT_SENTENCE_SHARED_TYPES = new Set([
    '攻撃割合',
    '攻撃固定',
    '射程固定',
    '回復',
    '回復割合',
    '与ダメ回復',
    '移動上昇',
    '移動変更',
    '移動後退'
]);

function expandSharedStatDebuffs(text) {
    if (!text) return '';
    return text.replace(/((?:射程|移動速度|攻撃速度)(?:[･・](?:射程|移動速度|攻撃速度))+)([をが]?)([+＋\-－]?\d+(?:\.\d+)?)([％%])(低下|減少|ダウン|DOWN)/g, (_, list, connector, value, percentSymbol, action) => {
        const stats = list.split(/[･・]/).filter(Boolean);
        const connectorText = connector && connector.trim() ? connector : 'を';
        return stats.map(stat => `${stat}${connectorText}${value}${percentSymbol}${action}`).join('、');
    });
}

function expandSharedStatBuffs(text) {
    if (!text) return '';
    return text.replace(/((?:攻撃|防御|回復)(?:と(?:攻撃|防御|回復))+)([^\d。、（）]{0,5})([+＋\-－]?\d+(?:\.\d+)?)(倍|[％%])((?:上昇|アップ|UP|増加|低下|減少|ダウン|DOWN)?)?/g, (_, list, connector, value, unit, action) => {
        const stats = list.split(/と/).filter(Boolean);
        const connectorText = connector && connector.trim() ? connector : 'が';
        const suffix = `${connectorText}${value}${unit}${action || ''}`;
        return stats.map(stat => `${stat}${suffix}`).join('、');
    });
}

function extractFirstNumber(text) {
    if (!text) return null;
    const normalized = text.replace(/[＋]/g, '+').replace(/[－]/g, '-');
    const match = normalized.match(/([+\-]?\d+(?:\.\d+)?)/);
    if (!match) return null;
    const value = parseFloat(match[1]);
    return Number.isFinite(value) ? value : null;
}

function applyGiantMultiplierIfNeeded(result, matchText, baseValue, hasGiantContext) {
    if (!result || typeof result.value !== 'number') return;
    if (result.skipGiantMultiplier) return;
    if (!hasGiantContext) return;
    if (!GIANT_MULTIPLIER_TYPES.has(result.type)) return;
    const referenceValue = (typeof baseValue === 'number' && !Number.isNaN(baseValue))
        ? baseValue
        : extractFirstNumber(matchText);
    if (referenceValue === null || referenceValue === 0) return;
    if (Math.abs(result.value - referenceValue) < 1e-9) {
        result.value = result.value * 5;
    }
}


function determineTargetBase(text) {
    if (/自身/i.test(text)) return '自身';
    if (/全(?:て|体|員)/i.test(text)) return '全';
    if (/殿/i.test(text)) return '全';
    return '射程内';
}

function extractAttributeModifiers(text) {
    const modifiers = new Set();
    ATTRIBUTE_KEYWORDS.forEach(attr => {
        if (attr.pattern.test(text)) {
            modifiers.add(attr.value);
        }
    });
    return Array.from(modifiers);
}

function detectTargetInfo(segment, beforeContext, afterContext, fullText) {
    const normalize = (text) => (text || '').replace(/\s+/g, '');
    const normalizedSegment = normalize(segment);
    const normalizedBefore = normalize(beforeContext);
    const normalizedAfter = normalize(afterContext);
    const normalizedFull = normalize(fullText);
    const contexts = [
        { text: normalizedSegment, weight: 4 },
        { text: normalizedBefore + normalizedSegment, weight: 3 },
        { text: normalizedSegment + normalizedAfter, weight: 2 },
        { text: normalizedBefore, weight: 1.5 },
        { text: normalizedAfter, weight: 1 }
    ];
    const modifiers = new Set();
    let base = null;
    let bestScore = -Infinity;

    const evaluateBase = (candidateBase, weight) => {
        if (!candidateBase) return;
        const candidatePriority = TARGET_BASE_PRIORITY[candidateBase] || 0;
        const score = weight * 10 + candidatePriority;
        if (score > bestScore) {
            base = candidateBase;
            bestScore = score;
        }
    };

    const evaluateText = (text, weight) => {
        if (!text) return;
        TARGET_KEYWORD_RULES.forEach(rule => {
            if (rule.pattern.test(text)) {
                evaluateBase(rule.base, weight);
                (rule.modifiers || []).forEach(mod => modifiers.add(mod));
            }
        });
        extractAttributeModifiers(text).forEach(mod => modifiers.add(mod));
    };

    contexts.forEach(ctx => evaluateText(ctx.text, ctx.weight));

    if (!base) {
        evaluateBase(determineTargetBase(normalizedSegment || normalizedBefore || normalizedAfter), 0);
    }

    extractAttributeModifiers(normalizedFull).forEach(mod => modifiers.add(mod));

    if (!TARGET_BASE_OPTIONS.includes(base)) {
        base = '射程内';
    }

    return {
        base,
        modifiers: Array.from(modifiers)
    };
}

const LEGACY_TARGET_RULES = [
    { pattern: /^味方射程内$/i, base: '射程内', modifiers: ['味方'] },
    { pattern: /^味方全員$/i, base: '全', modifiers: ['味方'] },
    { pattern: /^味方城娘$/i, base: '全', modifiers: ['味方'] },
    { pattern: /^味方全て$/i, base: '全', modifiers: ['味方'] },
    { pattern: /^味方$/i, base: '全', modifiers: ['味方'] },
    { pattern: /^射程内の?味方$/i, base: '射程内', modifiers: ['味方'] },
    { pattern: /^射程内味方$/i, base: '射程内', modifiers: ['味方'] },
    { pattern: /^伏兵射程内$/i, base: '射程内', modifiers: ['伏兵'] },
    { pattern: /^伏兵$/i, base: '射程内', modifiers: ['伏兵'] },
    { pattern: /^殿(?:のみ)?$/i, base: '全', modifiers: ['殿'] },
    { pattern: /^全員$/i, base: '全', modifiers: [] },
    { pattern: /^全城娘$/i, base: '全', modifiers: [] },
    { pattern: /^全$/i, base: '全', modifiers: [] },
    { pattern: /^射程内$/i, base: '射程内', modifiers: [] },
    { pattern: /^自身$/i, base: '自身', modifiers: [] }
];

function translateLegacyTarget(label) {
    if (Array.isArray(label)) {
        label = label.filter(Boolean).join('/');
    }
    const text = (label || '').trim();
    if (!text) {
        return { base: '射程内', modifiers: [] };
    }

    if (text.includes('/')) {
        const segments = text.split('/').filter(Boolean);
        if (segments.length === 0) {
            return { base: '射程内', modifiers: [] };
        }
        let base = segments[0];
        let modifiers = segments.slice(1);
        if (!TARGET_BASE_OPTIONS.includes(base)) {
            const legacy = LEGACY_TARGET_RULES.find(rule => rule.pattern.test(text));
            if (legacy) {
                return { base: legacy.base, modifiers: [...legacy.modifiers] };
            }
            modifiers = segments;
            base = '射程内';
        }
        return {
            base,
            modifiers: Array.from(new Set(modifiers))
        };
    }

    const legacyMatch = LEGACY_TARGET_RULES.find(rule => rule.pattern.test(text));
    if (legacyMatch) {
        return { base: legacyMatch.base, modifiers: [...legacyMatch.modifiers] };
    }

    if (TARGET_BASE_OPTIONS.includes(text)) {
        return { base: text, modifiers: [] };
    }

    if (/全/.test(text)) {
        return { base: '全', modifiers: [] };
    }
    if (/射程/.test(text)) {
        return { base: '射程内', modifiers: [] };
    }
    if (/自身/.test(text)) {
        return { base: '自身', modifiers: [] };
    }

    return { base: '射程内', modifiers: text ? [text] : [] };
}

function formatTargetParts(base, modifiers) {
    const normalizedBase = TARGET_BASE_OPTIONS.includes(base) ? base : '射程内';
    const uniqueModifiers = Array.from(new Set((modifiers || []).filter(Boolean)));
    if (uniqueModifiers.length === 0) {
        return normalizedBase;
    }
    const orderIndex = (mod) => {
        const order = TARGET_MODIFIER_ORDER.indexOf(mod);
        return order === -1 ? TARGET_MODIFIER_ORDER.length + uniqueModifiers.indexOf(mod) : order;
    };
    const sortedModifiers = uniqueModifiers.slice().sort((a, b) => orderIndex(a) - orderIndex(b));
    return [normalizedBase, ...sortedModifiers].join('/');
}

function detectTargetOverride(conditionText) {
    if (!conditionText) return null;
    if (CONDITION_SELF_KEYWORDS.test(conditionText)) {
        return '自身';
    }
    return null;
}

function cleanupCondition(condition, buffType) {
    if (!condition) return '';
    let text = condition;

    text = text.replace(/重複なし/g, '');
    text = text.replace(DUPLICATE_HINT_REGEX, '');
    if (buffType === '与ダメ' || buffType === '与えるダメージ') {
        text = text.replace(/重複不可/g, '');
    }

    text = text.replace(/【([^】]+)】/g, '$1');
    text = text.replace(/\s+/g, '');
    text = text.replace(/^[、。]+/, '').replace(/[、。]+$/, '');
    text = text.replace(/自分のみ|自身のみ/g, '');

    if (buffType === '速度' || buffType === '隙') {
        if (/(攻撃|与ダメ|与えるダメ|上昇)/.test(text)) {
            text = text.replace(/全ての.*?(?:上昇|増加)/g, '');
        }
        if (/(攻撃|与ダメ|与えるダメ|上昇)/.test(text)) {
            text = '';
        }
    }

    text = text.replace(/させる$/g, '');
    text = text.replace(/、{2,}/g, '、');
    return text.trim();
}

function adjustParsedBuff(buff) {
    if (!buff) return;

    const contextText = `${buff.rawText || ''} ${buff.context || ''} ${buff.condition || ''}`;

    if (!Array.isArray(buff.targetParts) || buff.targetParts.length === 0) {
        const parsedTarget = translateLegacyTarget(buff.target);
        const normalized = formatTargetParts(parsedTarget.base, parsedTarget.modifiers);
        buff.targetParts = normalized.split('/').filter(Boolean);
    }

    const base = buff.targetParts[0] || '射程内';
    let modifiers = buff.targetParts.slice(1);

    if (buff.type === '速度' || buff.type === '隙') {
        modifiers = modifiers.filter(mod => !ATTRIBUTE_MODIFIER_SET.has(mod));
    }

    if (buff.type === '気(牛)' || buff.type === '気(ノビ)') {
        const hasExplicitAttribute = ATTRIBUTE_KEYWORDS.some(attr => attr.pattern.test(contextText));
        if (!hasExplicitAttribute) {
            modifiers = modifiers.filter(mod => !ATTRIBUTE_MODIFIER_SET.has(mod));
        }
    }

    if (buff.type === '自然気') {
        if (/撃破/.test(contextText)) {
            if (/(城娘|味方).*撃破|撃破.*(城娘|味方)|城娘の撃破/.test(contextText)) {
                buff.type = '気(ノビ)';
            } else {
                buff.type = '気(牛)';
            }
        }
    }

    modifiers = Array.from(new Set(modifiers));

    if (buff.condition) {
        const attributeSet = new Set(modifiers.filter(mod => ATTRIBUTE_MODIFIER_SET.has(mod)));
        if (attributeSet.size > 0) {
            const conditionParts = buff.condition
                .split(/・/)
                .map(part => part.trim())
                .filter(Boolean);
            const cleanedParts = conditionParts.filter(part => {
                if (ATTRIBUTE_KEYWORDS.some(attr => attr.pattern.test(part) && attributeSet.has(attr.value))) {
                    return false;
                }
                return true;
            });
            buff.condition = cleanedParts.join('・');
        }
    }

    const normalizedTarget = formatTargetParts(base, modifiers);
    buff.target = normalizedTarget;
    buff.targetParts = normalizedTarget.split('/').filter(Boolean);
    delete buff.context;
    delete buff.rawText;
}


// Wiki URLからキャラクター情報を取得
async function fetchFromWikiURL() {
    const urlInput = document.getElementById('wikiURL');
    const statusDiv = document.getElementById('wikiImportStatus');
    const url = urlInput.value.trim();

    if (!url) {
        statusDiv.innerHTML = '<span style="color: #e74c3c;">❌ URLを入力してください</span>';
        return;
    }

    if (!url.includes('scre.swiki.jp')) {
        statusDiv.innerHTML = '<span style="color: #e74c3c;">❌ 城プロWikiのURLを入力してください</span>';
        return;
    }

    statusDiv.innerHTML = '<span style="color: #3498db;">⏳ データ取得中...</span>';

    // CORSプロキシのリスト（優先順位順）
    const corsProxies = [
        `https://corsproxy.io/?${encodeURIComponent(url)}`,
        `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
        `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`
    ];

    let html = null;
    let lastError = null;

    // 各プロキシを順番に試す
    for (let i = 0; i < corsProxies.length; i++) {
        try {
            statusDiv.innerHTML = `<span style="color: #3498db;">⏳ データ取得中... (試行 ${i + 1}/${corsProxies.length})</span>`;

            const response = await fetch(corsProxies[i], {
                method: 'GET',
                headers: {
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            html = await response.text();

            // HTMLが正しく取得できたか簡易チェック
            if (html && html.length > 100 && html.includes('</html>')) {
                console.log(`成功: プロキシ ${i + 1} を使用`);
                break;
            } else {
                throw new Error('HTMLの取得に失敗');
            }

        } catch (error) {
            console.warn(`プロキシ ${i + 1} でエラー:`, error.message);
            lastError = error;

            // 最後のプロキシでもない場合は次を試す
            if (i < corsProxies.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 500)); // 500ms待機
                continue;
            }
        }
    }

    // 全てのプロキシで失敗した場合
    if (!html) {
        console.error('全てのプロキシで失敗:', lastError);
        statusDiv.innerHTML = '<span style="color: #e74c3c;">❌ データの取得に失敗しました。ブラウザの拡張機能でCORSを無効化するか、ローカルサーバーを使用してください。</span>';
        return;
    }

    try {
        const characterData = parseWikiHTML(html);

        if (!characterData) {
            statusDiv.innerHTML = '<span style="color: #e74c3c;">❌ データの解析に失敗しました</span>';
            return;
        }

        // フォームにデータを自動入力
        fillFormWithData(characterData);
        statusDiv.innerHTML = '<span style="color: #27ae60;">✅ データを取得しました！フォームを確認して登録してください</span>';

    } catch (error) {
        console.error('解析エラー:', error);
        statusDiv.innerHTML = `<span style="color: #e74c3c;">❌ データの解析エラー: ${error.message}</span>`;
    }
}

// WikiのHTMLをパースしてキャラクター情報を抽出
function parseWikiHTML(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    try {
        const data = {
            name: '',
            period: '',
            weapon: '',
            attributes: [],
            weaponRange: '',
            weaponType: '',
            placement: '',
            skillsText: [],      // 特技のテキスト
            strategiesText: []   // 計略のテキスト
        };

        // ページタイトルから名前を取得
        const title = doc.querySelector('title')?.textContent || '';
        const titleMatch = title.match(/^(.+?)\s*-/);
        if (titleMatch) {
            let fullName = titleMatch[1].trim();

            // 期間の接頭辞を抽出（［絢爛］、［響乱］など）
            const periodMatch = fullName.match(/^［(.+?)］(.+)$/);
            if (periodMatch) {
                data.period = periodMatch[1];
                data.name = periodMatch[2].trim();
            } else {
                data.name = fullName;
            }
        }

        // テーブルから基本情報を取得（#body 内の「図鑑No.」を含むテーブルのみを対象）
        const bodyContainer = doc.getElementById('body');
        let tables = [];

        if (bodyContainer) {
            const bodyTables = Array.from(bodyContainer.querySelectorAll('table'));
            const infoTable = bodyTables.find(table => /図鑑No[\s\S]*武器属性/.test(table.textContent));
            if (infoTable) {
                tables = [infoTable];
            } else {
                tables = bodyTables;
            }
        }

        if (tables.length === 0) {
            tables = Array.from(doc.querySelectorAll('table'));
        }

        for (const table of tables) {
            const rows = table.querySelectorAll('tr');

            for (const row of rows) {
                let header = '';
                let value = '';
                let valueTd = null;

                // パターン1: th + td 構造
                const th = row.querySelector('th');
                const tdWithTh = row.querySelector('td');

                // パターン2: td + td 構造（基本情報テーブル）
                const allTds = row.querySelectorAll('td');

                if (th && tdWithTh) {
                    // th + td 構造
                    header = th.textContent.trim();
                    value = tdWithTh.textContent.trim();
                    valueTd = tdWithTh;
                } else if (allTds.length >= 2) {
                    // td + td 構造（最初のtdがラベル、2番目が値）
                    header = allTds[0].textContent.trim();
                    value = allTds[1].textContent.trim();
                    valueTd = allTds[1];

                    // textContentが空の場合、innerTextを試す（画像やリンクがある場合）
                    if (!value && valueTd) {
                        value = valueTd.innerText?.trim() || '';

                        // それでも空なら、リンクのテキストを探す
                        if (!value) {
                            const link = valueTd.querySelector('a');
                            if (link) {
                                value = link.textContent.trim();
                            }
                        }
                    }
                } else {
                    // どちらでもない行はスキップ
                    continue;
                }

                // 武器属性
                if (header === '武器属性') {
                    // 括弧とその中身を除去（例：「投剣(四方剣)」→「投剣」）
                    const cleanWeapon = value.replace(/\(.+?\)/g, '').trim();
                    data.weapon = cleanWeapon;

                    // 武器種から遠近・物術・配置を判定
                    if (weaponMapping[cleanWeapon]) {
                        data.weaponRange = weaponMapping[cleanWeapon].range;
                        data.weaponType = weaponMapping[cleanWeapon].type;
                        data.placement = weaponMapping[cleanWeapon].placement;
                    } else {
                        console.warn('武器種がマッピングテーブルに存在しません:', cleanWeapon);
                    }
                }

                // 城属性
                if (header === '城属性') {
                    let attrText = '';

                    // valueが空の場合、td要素から画像のalt属性を取得
                    if (!value && valueTd) {
                        const img = valueTd.querySelector('img');
                        if (img) {
                            // alt属性から取得（例：「平山.png」）
                            const altText = img.getAttribute('alt') || img.getAttribute('title') || '';
                            // .pngを除去（例：「平山.png」→「平山」）
                            attrText = altText.replace(/\.png$/i, '');
                        }
                    } else {
                        // valueがある場合はテキストから取得
                        attrText = value.replace(/\s+/g, '').replace(/属性/g, '');
                    }

                    // 「平山」は特殊な複合属性として扱う
                    if (attrText === '平山' || attrText.includes('平山')) {
                        data.attributes.push('平山');
                    } else {
                        // 個別の属性をチェック
                        if (attrText.includes('水')) data.attributes.push('水');
                        if (attrText.includes('平')) data.attributes.push('平');
                        if (attrText.includes('山')) data.attributes.push('山');
                    }
                    if (attrText.includes('地獄')) data.attributes.push('地獄');

                    // 無属性の場合
                    if (data.attributes.length === 0 && attrText.includes('無')) {
                        data.attributes.push('無属性');
                    }
                }

                // 特技・計略の検出（headerに [無印] や [改壱] が含まれる場合）
                if (header.includes('[無印]') || header.includes('[改壱]') || header.includes('[改弐]')) {
                    // 計略かどうかを判定（気コストや再使用時間が含まれている）
                    if (header.includes('気:') || header.includes('秒')) {
                        // 計略
                        data.strategiesText.push({
                            name: header,
                            description: value
                        });
                    } else if (header.includes('/')) {
                        // 特技（特殊能力）
                        data.skillsText.push({
                            name: header,
                            description: value
                        });
                    }
                }
            }
        }

        return data;

    } catch (error) {
        console.error('パースエラー:', error);
        return null;
    }
}

// 取得したデータをフォームに自動入力
function fillFormWithData(data) {
    // 名前
    document.getElementById('charName').value = data.name;

    // 期間
    document.getElementById('charPeriod').value = data.period;

    // 武器種
    document.getElementById('charWeapon').value = data.weapon;

    // 遠近ボタン
    if (data.weaponRange) {
        document.querySelectorAll('[data-group="weaponRange"]').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.value === data.weaponRange) {
                btn.classList.add('active');
            }
        });
    }

    // 物術ボタン
    if (data.weaponType) {
        document.querySelectorAll('[data-group="weaponType"]').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.value === data.weaponType) {
                btn.classList.add('active');
            }
        });
    }

    // 配置ボタン
    if (data.placement) {
        document.querySelectorAll('[data-group="placement"]').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.value === data.placement) {
                btn.classList.add('active');
            }
        });
    }

    // 属性ボタン（複数選択）
    document.querySelectorAll('[data-group="attribute"]').forEach(btn => {
        btn.classList.remove('active');
        if (data.attributes.includes(btn.dataset.value)) {
            btn.classList.add('active');
        }
    });

    // 特技・計略の表示（分割版）
    const skillsDisplay = document.getElementById('wikiSkillsDisplay');
    const strategiesDisplay = document.getElementById('wikiStrategiesDisplay');

    // [改壱]があるかチェック
    const hasKaiichi = data.skillsText.some(s => s.name.includes('[改壱]')) ||
                       data.strategiesText.some(s => s.name.includes('[改壱]'));

    // 特技の表示
    if (data.skillsText.length > 0) {
        // 重複を除去
        const uniqueSkills = [];
        const seenNames = new Set();
        for (const skill of data.skillsText) {
            if (!seenNames.has(skill.name)) {
                seenNames.add(skill.name);
                uniqueSkills.push(skill);
            }
        }

        let filteredSkills = uniqueSkills;
        if (hasKaiichi) {
            filteredSkills = uniqueSkills.filter(s => !s.name.includes('[無印]'));
        }

        if (filteredSkills.length > 0) {
            let html = '<div style="background: #fef5e7; padding: 15px; border-radius: 8px; border: 2px solid #e67e22;">';
            html += '<strong style="color: #e67e22; font-size: 16px;">📖 特技（Wikiより）</strong>';
            filteredSkills.forEach(skill => {
                const escapedDescription = skill.description.replace(/'/g, "\\'").replace(/"/g, '&quot;');
                html += `<div style="margin: 10px 0; padding: 10px; background: white; border-left: 3px solid #e67e22; border-radius: 4px;">`;
                html += `<div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 5px;">`;
                html += `<div style="font-weight: bold; color: #d35400; flex: 1;">${skill.name}</div>`;
                html += `<button class="btn" onclick="analyzeAndAddSkill('${escapedDescription}')" style="padding: 4px 12px; font-size: 12px; background: #e67e22; margin-left: 10px;">🔍 解析</button>`;
                html += `</div>`;
                html += `<div style="color: #555; line-height: 1.5;">${skill.description}</div>`;
                html += `</div>`;
            });
            html += '</div>';
            skillsDisplay.innerHTML = html;
            skillsDisplay.style.display = 'block';
        } else {
            skillsDisplay.style.display = 'none';
        }
    } else {
        skillsDisplay.style.display = 'none';
    }

    // 計略の表示
    if (data.strategiesText.length > 0) {
        // 重複を除去
        const uniqueStrategies = [];
        const seenNames = new Set();
        for (const strategy of data.strategiesText) {
            if (!seenNames.has(strategy.name)) {
                seenNames.add(strategy.name);
                uniqueStrategies.push(strategy);
            }
        }

        let filteredStrategies = uniqueStrategies;
        if (hasKaiichi) {
            filteredStrategies = uniqueStrategies.filter(s => !s.name.includes('[無印]'));
        }

        if (filteredStrategies.length > 0) {
            let html = '<div style="background: #f4ecf7; padding: 15px; border-radius: 8px; border: 2px solid #8e44ad;">';
            html += '<strong style="color: #8e44ad; font-size: 16px;">⚔️ 計略（Wikiより）</strong>';
            filteredStrategies.forEach(strategy => {
                const escapedDescription = strategy.description.replace(/'/g, "\\'").replace(/"/g, '&quot;');
                html += `<div style="margin: 10px 0; padding: 10px; background: white; border-left: 3px solid #8e44ad; border-radius: 4px;">`;
                html += `<div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 5px;">`;
                html += `<div style="font-weight: bold; color: #7d3c98; flex: 1;">${strategy.name}</div>`;
                html += `<button class="btn" onclick="analyzeAndAddStrategy('${escapedDescription}')" style="padding: 4px 12px; font-size: 12px; background: #8e44ad; margin-left: 10px;">🔍 解析</button>`;
                html += `</div>`;
                html += `<div style="color: #555; line-height: 1.5;">${strategy.description}</div>`;
                html += `</div>`;
            });
            html += '</div>';
            strategiesDisplay.innerHTML = html;
            strategiesDisplay.style.display = 'block';
        } else {
            strategiesDisplay.style.display = 'none';
        }
    } else {
        strategiesDisplay.style.display = 'none';
    }
}

// バフテキスト解析関数
function parseBuffText(text) {
    if (!text) return [];
    const cleanedText = text.replace(/\r?\n/g, ' ');
    const expandedStatsText = expandSharedStatBuffs(cleanedText);
    const sourceText = expandSharedStatDebuffs(expandedStatsText);
    const results = [];
    const seen = new Set();
    const sentenceBoundaryChars = ['。', '！', '？'];

    for (const buffPattern of buffPatterns) {
        const baseFlags = buffPattern.pattern.flags.includes('g')
            ? buffPattern.pattern.flags
            : buffPattern.pattern.flags + 'g';
        const regex = new RegExp(buffPattern.pattern.source, baseFlags);

        let match;
        while ((match = regex.exec(sourceText)) !== null) {
            const matchText = match[0];
            if (buffPattern.type === '速度' && /移動速度/.test(matchText)) {
                continue;
            }
            if (buffPattern.type === '被ダメ') {
                if (/爆風/.test(matchText)) {
                    continue;
                }
                const precedingSnippet = sourceText.slice(Math.max(0, match.index - 4), match.index);
                const combinedSnippet = precedingSnippet + matchText;
                if (/与えるダメージ|与ダメ|与えたダメージ/.test(combinedSnippet)) {
                    continue;
                }
            }
            let previousBoundary = -1;
            sentenceBoundaryChars.forEach(char => {
                const idx = sourceText.lastIndexOf(char, match.index - 1);
                if (idx > previousBoundary) {
                    previousBoundary = idx;
                }
            });
            const nextBoundaryCandidates = sentenceBoundaryChars
                .map(char => sourceText.indexOf(char, regex.lastIndex))
                .filter(idx => idx !== -1);
            const nextBoundary = nextBoundaryCandidates.length > 0
                ? Math.min(...nextBoundaryCandidates)
                : -1;
            const sentenceStart = previousBoundary === -1
                ? Math.max(0, match.index - 80)
                : previousBoundary + 1;
            const sentenceEnd = nextBoundary === -1
                ? Math.min(sourceText.length, regex.lastIndex + 80)
                : nextBoundary;
            const sentenceText = sourceText.slice(sentenceStart, sentenceEnd);
            const beforeContextStart = Math.max(sentenceStart, match.index - 60);
            const afterContextEnd = Math.min(sentenceEnd, regex.lastIndex + 60);
            const beforeContext = sourceText.slice(beforeContextStart, match.index);
            let afterContext = sourceText.slice(regex.lastIndex, afterContextEnd);
            const contextStart = Math.max(sentenceStart, match.index - 40);
            const contextEnd = Math.min(sentenceEnd, regex.lastIndex + 40);
            const context = sourceText.slice(contextStart, contextEnd);
            const snippetAroundMatch = sourceText.slice(Math.max(0, match.index - 2), Math.min(sourceText.length, regex.lastIndex + 2));
            const duplicateAfterMatchPattern = /^\s*(?:、|,)?[（(]?(効果重複|重複可|重複可能)[）)]?/;
            const duplicateAfterMatch = duplicateAfterMatchPattern.test(afterContext);
            if (duplicateAfterMatch) {
                afterContext = afterContext.replace(duplicateAfterMatchPattern, '');
            }
            const sentenceHasGiant = /巨大化する度に/.test(sentenceText);
            const matchHasGiant = /巨大化する度に/.test(matchText);
            let giantBeforeMatch = false;
            if (sentenceHasGiant && !matchHasGiant) {
                const absoluteGiantIndex = sourceText.lastIndexOf('巨大化する度に', match.index);
                if (absoluteGiantIndex !== -1 && absoluteGiantIndex >= sentenceStart && absoluteGiantIndex < match.index) {
                    giantBeforeMatch = true;
                }
            }

            if (giantBeforeMatch && GIANT_SENTENCE_SHARED_TYPES.has(buffPattern.type)) {
                continue;
            }

            if (buffPattern.type === '速度' && /移動速度/.test(snippetAroundMatch)) {
                continue;
            }

            const targetInfo = detectBuffTarget(matchText, beforeContext, afterContext, sourceText);
            let targetLabel = targetInfo.label;
            const enemyContextText = `${beforeContext}${matchText}`;
            if (ALL_ENEMY_REGEX.test(enemyContextText)) {
                const parsedTarget = translateLegacyTarget(targetLabel);
                targetLabel = formatTargetParts('全', parsedTarget.modifiers);
                targetInfo.parts = targetLabel.split('/').filter(Boolean);
            }
            const target = targetLabel;
            const rawCondition = extractBuffCondition(beforeContext, afterContext);
            const targetOverride = detectTargetOverride(rawCondition);
            let condition = cleanupCondition(rawCondition, buffPattern.type);
            if (condition && /最大化/.test(condition) && buffPattern.type !== '与えるダメージ') {
                condition = condition.replace(/最大化[^。、（）]*/g, '').trim();
                if (/^(?:上昇|低下|増加)$/.test(condition)) {
                    condition = '';
                }
            }
            if (condition && /低下させる/.test(condition) && (buffPattern.type === '射程割合' || buffPattern.type === '速度' || buffPattern.type === '移動低下')) {
                condition = '';
            }
            if (condition && /(射程|移動速度|攻撃速度)[^。、（）]*(?:低下|減少|ダウン|DOWN)/.test(condition) && (buffPattern.type === '射程割合' || buffPattern.type === '速度' || buffPattern.type === '移動低下')) {
                condition = '';
            }
            if (condition && /させる$/.test(condition)) {
                condition = condition.replace(/させる$/, '').trim();
            }
            if (buffPattern.type === '与えるダメージ') {
                if (/最大化時/.test(sentenceText) && /特殊攻撃/.test(sentenceText)) {
                    condition = '最大化時、自身の特殊攻撃';
                } else if (/最大化/.test(condition) && !/最大化時/.test(condition)) {
                    condition = '';
                }
            }
            const value = buffPattern.getValue(match);
            const normalizedValue = value === null || value === undefined ? null : Number(value);

            const precedingText = sourceText.slice(Math.max(sentenceStart, match.index - 80), match.index);
            const precedingMatches = precedingText.match(/【([^】]+)】/g) || [];
            const precedingLabel = precedingMatches.length
                ? precedingMatches[precedingMatches.length - 1].replace(/[【】]/g, '').trim()
                : null;
            const matchInnerLabels = Array.from(matchText.matchAll(/【([^】]+)】/g))
                .map(m => m[1]?.trim())
                .filter(Boolean);
            const bracketLabelsSet = new Set(matchInnerLabels);
            if (precedingLabel) {
                bracketLabelsSet.add(precedingLabel);
            }

            if (/(射程外)/.test(matchText) || /(射程外)/.test(precedingText)) {
                continue;
            }

            const bracketLabelKey = Array.from(bracketLabelsSet).join('|');
            const key = [
                target,
                buffPattern.type,
                buffPattern.unit,
                normalizedValue,
                condition,
                bracketLabelKey
            ].join('|');
            if (seen.has(key)) {
                continue;
            }
            seen.add(key);

            const result = {
                target,
                type: buffPattern.type,
                unit: buffPattern.unit,
                value: normalizedValue,
                condition,
                context,
                rawText: matchText,
                skipGiantMultiplier: !!buffPattern.skipGiantMultiplier
            };
            const duplicationContext = matchText;
            const hasDuplicateHint = DUPLICATE_HINT_REGEX.test(duplicationContext) || duplicateAfterMatch;
            if (hasDuplicateHint) {
                result.isDuplicate = true;
                if (result.condition) {
                    result.condition = result.condition.replace(DUPLICATE_HINT_REGEX, '').trim();
                    result.condition = result.condition.replace(/^[、。]+/, '').replace(/[、。]+$/, '');
                }
            }
            if (targetInfo.parts && targetInfo.parts.length) {
                result.targetParts = targetInfo.parts;
            }
            if (targetOverride) {
                const overrideParsed = translateLegacyTarget(targetOverride);
                const overrideLabel = formatTargetParts(overrideParsed.base, overrideParsed.modifiers);
                result.target = overrideLabel;
                result.targetParts = overrideLabel.split('/').filter(Boolean);
            }
            if (bracketLabelsSet.size > 0) {
                const conditionParts = result.condition
                    ? result.condition.split(/・/).map(part => part.trim()).filter(Boolean)
                    : [];
                bracketLabelsSet.forEach(label => {
                    if (!conditionParts.includes(label)) {
                        conditionParts.push(label);
                    }
                });
                result.condition = conditionParts.join('・');
            }
            if (result.type === '与ダメ回復' && result.condition) {
                const filtered = result.condition
                    .split(/・/)
                    .map(part => part.trim())
                    .filter(part => part && (!/最大/.test(part) || /回復/.test(part)));
                result.condition = filtered.join('・');
            }
            if (result.type === '与ダメ回復') {
                const noteRegex = /[\[【]([^】\]]+)[】\]]は([+＋-－]?\d+)%回復/i;
                let noteMatch = noteRegex.exec(result.context || '');
                if (!noteMatch && result.rawText) {
                    noteMatch = noteRegex.exec(result.rawText);
                }
                if (noteMatch) {
                    const noteText = `${noteMatch[1]}は${noteMatch[2]}%`;
                    const existingNotes = result.condition
                        ? result.condition.split('・').map(part => part.trim()).filter(Boolean)
                        : [];
                    if (noteText && !existingNotes.includes(noteText)) {
                        existingNotes.push(noteText);
                        result.condition = existingNotes.join('・');
                    }
                }
                if (result.target === '自身' && /(射程|範囲)/.test(`${matchText}${beforeContext}${afterContext}`)) {
                    const normalizedTarget = formatTargetParts('射程内', []);
                    result.target = normalizedTarget;
                    result.targetParts = normalizedTarget.split('/').filter(Boolean);
                }
            }
            const selfOnlyHint = SELF_ONLY_NOTE_REGEX.test(`${matchText}${afterContext}`);
            if (selfOnlyHint && SELF_ONLY_TARGET_TYPES.has(result.type) && !ENEMY_KEYWORD_REGEX.test(matchText)) {
                const normalizedTarget = formatTargetParts('自身', Array.isArray(result.targetParts) ? result.targetParts.slice(1) : []);
                result.target = normalizedTarget;
                result.targetParts = normalizedTarget.split('/').filter(Boolean);
            }
            // 明示的に「対象」や「敵」が出てくる場合は射程内扱い
            if (result.target === '自身' && /対象|敵/.test(sentenceText)) {
                const enemyTargetText = sentenceText.replace(/\s+/g, '');
                if (/射程/.test(enemyTargetText) || /対象の/.test(enemyTargetText)) {
                    const normalizedTarget = formatTargetParts('射程内', []);
                    result.target = normalizedTarget;
                    result.targetParts = normalizedTarget.split('/').filter(Boolean);
                }
            }
            const derivedResults = [];
            if (result.type === '与ダメ') {
                const combinedText = `${matchText} ${context}`;
                if (/攻撃(?:力)?(?:と|及び|および|並びに|・)与ダメ/.test(combinedText)) {
                    derivedResults.push({
                        target: result.target,
                        targetParts: Array.isArray(result.targetParts) ? [...result.targetParts] : undefined,
                        type: '攻撃割合',
                        unit: result.unit,
                        value: result.value,
                        condition: result.condition,
                        rawText: result.rawText,
                        context: result.context,
                        isDuplicate: result.isDuplicate,
                        skipGiantMultiplier: !!buffPattern.skipGiantMultiplier
                    });
                }
            }

            const hasGiantContext = /巨大化する度に/.test(matchText) || giantBeforeMatch || sentenceHasGiant || /巨大化する度に/.test(beforeContext);

            applyGiantMultiplierIfNeeded(result, matchText, normalizedValue, hasGiantContext);
            adjustParsedBuff(result);
            results.push(result);

            derivedResults.forEach(derived => {
                applyGiantMultiplierIfNeeded(derived, matchText, normalizedValue, hasGiantContext);
                const derivedKey = [
                    derived.target,
                    derived.type,
                    derived.unit,
                    derived.value,
                    derived.condition,
                    bracketLabelKey
                ].join('|');
                if (seen.has(derivedKey)) {
                    return;
                }
                seen.add(derivedKey);
                adjustParsedBuff(derived);
                results.push(derived);
            });
        }
    }

    return results;
}

function detectBuffTarget(segment, beforeContext, afterContext, fullText) {
    const info = detectTargetInfo(segment, beforeContext, afterContext, fullText);
    const label = formatTargetParts(info.base, info.modifiers);
    return {
        label,
        parts: label.split('/').filter(Boolean)
    };
}

function normalizeTargetLabel(target) {
    const parsed = translateLegacyTarget(target);
    return formatTargetParts(parsed.base, parsed.modifiers);
}

function extractBuffCondition(beforeText, afterText) {
    const normalize = (value) => (value || '').replace(/\s+/g, '');
    const searchSegments = [];
    if (beforeText) {
        searchSegments.push({ text: normalize(beforeText), source: 'before' });
    }
    if (afterText) {
        searchSegments.push({ text: normalize(afterText), source: 'after' });
    }

    for (const segment of searchSegments) {
        const parenthesesMatch = segment.text.match(/[（(]([^（）()]+)[）)]/);
        if (parenthesesMatch && parenthesesMatch[1]) {
            const sanitized = sanitizeCondition(parenthesesMatch[1]);
            if (sanitized) {
                if (/最大化時/.test(sanitized) && segment.source === 'after') {
                    continue;
                }
                return sanitized;
            }
        }
    }

    for (const segment of searchSegments) {
        for (const conditionPattern of conditionPatterns) {
            if (conditionPattern.sources && !conditionPattern.sources.includes(segment.source)) {
                continue;
            }
            const match = segment.text.match(conditionPattern.pattern);
            if (match) {
                const groupIndex = typeof conditionPattern.group === 'number'
                    ? conditionPattern.group
                    : (match.length > 1 ? 1 : 0);
                const raw = match[groupIndex] || match[0];
                const sanitized = sanitizeCondition(raw);
                if (sanitized) {
                    if (/最大化時/.test(sanitized) && segment.source === 'after') {
                        continue;
                    }
                    return sanitized;
                }
            }
        }
    }

    return '';
}

function sanitizeCondition(text) {
    if (!text) return '';
    let condition = text.trim();
    condition = condition.replace(/[（）()]/g, '');
    condition = condition.replace(/[。、]$/, '');
    condition = condition.replace(/(?:の場合|の?時)$/i, '');
    if (condition.endsWith('は')) {
        condition = condition.slice(0, -1);
    }
    condition = condition.replace(/(?:が|は)?対象$/g, '');
    condition = condition.replace(/(特殊攻撃)で$/i, '$1');
    condition = condition.replace(/(?:上昇|増加)(?=[^。、（）]*には効果\d+倍)/g, '');
    condition = condition.replace(/ゲージ蓄積[^。、（）]*/g, '');
    if (/には効果\d+倍/.test(condition)) {
        const marker = condition.lastIndexOf('には効果');
        const punctuation = Math.max(
            condition.lastIndexOf('、', marker),
            condition.lastIndexOf('。', marker),
            condition.lastIndexOf('・', marker),
            condition.lastIndexOf(' ', marker)
        );
        if (punctuation !== -1) {
            condition = condition.slice(punctuation + 1);
        } else {
            const match = condition.match(/[一-龠ぁ-んァ-ンヴー]+には効果\d+倍/g);
            if (match && match.length > 0) {
                condition = match[match.length - 1];
            }
        }
    }
    if (condition.includes('最大化時')) {
        const idx = condition.indexOf('最大化時');
        condition = condition.slice(idx);
    }
    condition = condition.replace(/時間経過で蓄積[^。、（）]*/g, '');
    condition = condition.replace(/最大ストック:?[\d０-９]+/gi, '');
    if (/^、+$/.test(condition)) {
        condition = '';
    }
    return condition.trim();
}

function formatBuffValue(value) {
    if (value === null || value === undefined) {
        return '';
    }
    if (typeof value === 'number') {
        if (Number.isInteger(value)) {
            return value.toString();
        }
        return parseFloat(value.toFixed(2)).toString();
    }
    return String(value);
}

const SPECIAL_TARGET_KEYWORDS = ['味方', '伏兵', '殿', '水', '平', '山', '平山', '地獄'];

function normalizeUnitAndValue(unit, value) {
    if (typeof value !== 'number') {
        return { unit, value };
    }
    const isPercentUnit = unit === '+%' || unit === '-%';
    const isFlatUnit = unit === '+' || unit === '-';
    if (isPercentUnit || isFlatUnit) {
        if (value < 0) {
            const normalizedUnit = isPercentUnit ? '-%' : '-';
            return { unit: normalizedUnit, value: Math.abs(value) };
        }
        const normalizedUnit = isPercentUnit ? '+%' : '+';
        return { unit: normalizedUnit, value };
    }
    return { unit, value };
}

function isSpecialTarget(targetText) {
    if (!targetText) return false;
    return SPECIAL_TARGET_KEYWORDS.some(keyword => targetText === keyword || targetText.includes(keyword));
}

function highlightBuffMain(mainText) {
    if (!mainText) return mainText;
    const parsed = parseBuff(mainText);
    const targetParts = (parsed.targetParts && parsed.targetParts.length
        ? parsed.targetParts
        : [parsed.target]).filter(Boolean);
    const targetHTML = targetParts
        .map((part, index) => {
            const isSpecial = index > 0 && isSpecialTarget(part);
            const classes = isSpecial ? 'buff-target special-target' : 'buff-target';
            return `<span class="${classes}">${part}</span>`;
        })
        .join('/');
    const effect = buildEffectDisplay(parsed);
    return effect ? `${targetHTML}/${effect}` : targetHTML;
}

function buildEffectDisplay(parsed) {
    if (!parsed) return '';
    let effect = parsed.type || '';
    if (parsed.unit) {
        effect += parsed.unit;
    }
    if (parsed.value !== undefined && parsed.value !== null && parsed.value !== '') {
        effect += parsed.value;
    }
    return effect;
}

function buildBuffString(buff) {
    let base;
    let modifiers;

    if (Array.isArray(buff.targetParts) && buff.targetParts.length) {
        base = buff.targetParts[0];
        modifiers = buff.targetParts.slice(1);
    } else {
        const parsedTarget = translateLegacyTarget(buff.target);
        base = parsedTarget.base;
        modifiers = parsedTarget.modifiers;
    }

    const normalizedTarget = formatTargetParts(base, modifiers);
    buff.target = normalizedTarget;
    buff.targetParts = normalizedTarget.split('/').filter(Boolean);

    const type = buff.type;
    let unit = buff.unit || '';
    let value = buff.value;
    const normalized = normalizeUnitAndValue(unit, typeof value === 'number' ? value : Number(value));
    unit = normalized.unit || unit;
    if (typeof normalized.value === 'number' && Number.isFinite(normalized.value)) {
        value = normalized.value;
    } else {
        value = buff.value;
    }
    buff.value = value;
    const valueText = formatBuffValue(value);

    let core = type;
    if (unit && valueText) {
        core += `${unit}${valueText}`;
    } else if (unit && !valueText) {
        core += unit;
    } else if (!unit && valueText) {
        core += valueText;
    }

    if (!core) {
        return null;
    }

    let result = `${normalizedTarget}/${core}`;
    if (buff.condition) {
        result += `（${buff.condition}）`;
    }
    if (buff.isDuplicate) {
        result = `[重複]${result}`;
    }
    return result;
}

// バフ解析結果を適切なリストに追加
function addParsedBuffs(buffs, buffType) {
    if (!Array.isArray(buffs) || buffs.length === 0) {
        return 0;
    }

    let targetList = null;
    if (buffType === 'skill') {
        targetList = tempSkills;
    } else if (buffType === 'strategy') {
        targetList = tempStrategies;
    } else if (buffType === 'formation') {
        targetList = tempFormationSkills;
    }

    if (!targetList) {
        return 0;
    }

    let addedCount = 0;
    buffs.forEach(buff => {
        const buffString = buildBuffString(buff);
        if (!buffString) {
            return;
        }
        if (!targetList.includes(buffString)) {
            targetList.push(buffString);
            addedCount += 1;
        }
    });

    if (buffType === 'skill') {
        renderBuffsList('skillsList', tempSkills, 'skill');
    } else if (buffType === 'strategy') {
        renderBuffsList('strategiesList', tempStrategies, 'strategy');
    } else if (buffType === 'formation') {
        renderBuffsList('formationsList', tempFormationSkills, 'formation');
    }

    return addedCount;
}

function buildTargetValue(baseGroup, modifierGroup, customInputId) {
    const base = getSelectedValue(baseGroup);
    if (!base) return '';
    const modifiers = getSelectedValues(modifierGroup);
    const customInput = document.getElementById(customInputId);
    let customMods = [];
    if (customInput && customInput.value.trim()) {
        customMods = customInput.value.trim().split(/[、,\/\s]+/).filter(Boolean);
    }
    const uniqueModifiers = Array.from(new Set([...modifiers, ...customMods]));
    return formatTargetParts(base, uniqueModifiers);
}

function getSkillTargetValue() {
    return buildTargetValue('skillTargetBase', 'skillTargetModifier', 'skillTargetCustom');
}

function getStrategyTargetValue() {
    return buildTargetValue('strategyTargetBase', 'strategyTargetModifier', 'strategyTargetCustom');
}

function setSkillTargetFromString(targetText) {
    const parsed = translateLegacyTarget(targetText);
    const normalizedLabel = formatTargetParts(parsed.base, parsed.modifiers);
    const parts = normalizedLabel.split('/').filter(Boolean);
    setSkillTargetBase(parts[0]);
    setSkillTargetModifiers(parts.slice(1));
}

function setSkillTargetFromParts(parts) {
    const parsed = translateLegacyTarget(parts);
    const normalizedLabel = formatTargetParts(parsed.base, parsed.modifiers);
    const normalizedParts = normalizedLabel.split('/').filter(Boolean);
    setSkillTargetBase(normalizedParts[0]);
    setSkillTargetModifiers(normalizedParts.slice(1));
}

function setStrategyTargetFromString(targetText) {
    const parsed = translateLegacyTarget(targetText);
    const normalizedLabel = formatTargetParts(parsed.base, parsed.modifiers);
    const parts = normalizedLabel.split('/').filter(Boolean);
    setStrategyTargetBase(parts[0]);
    setStrategyTargetModifiers(parts.slice(1));
}

function setStrategyTargetFromParts(parts) {
    const parsed = translateLegacyTarget(parts);
    const normalizedLabel = formatTargetParts(parsed.base, parsed.modifiers);
    const normalizedParts = normalizedLabel.split('/').filter(Boolean);
    setStrategyTargetBase(normalizedParts[0]);
    setStrategyTargetModifiers(normalizedParts.slice(1));
}

function setTargetBase(group, base) {
    const baseValue = TARGET_BASE_OPTIONS.includes(base) ? base : '射程内';
    const buttons = document.querySelectorAll(`[data-group="${group}"]`);
    let applied = false;
    buttons.forEach(btn => {
        const isActive = btn.dataset.value === baseValue;
        btn.classList.toggle('active', isActive);
        if (isActive) {
            applied = true;
        }
    });
    if (!applied && buttons.length > 0) {
        buttons[0].classList.add('active');
    }
}

function setTargetModifiers(group, customInputId, modifiers = []) {
    const uniqueModifiers = Array.from(new Set((Array.isArray(modifiers) ? modifiers : [modifiers]).filter(Boolean)));
    const buttons = document.querySelectorAll(`[data-group="${group}"]`);
    const optionSet = new Set(uniqueModifiers.filter(mod => TARGET_MODIFIER_OPTIONS.has(mod)));

    buttons.forEach(btn => {
        btn.classList.toggle('active', optionSet.has(btn.dataset.value));
    });

    const customInput = document.getElementById(customInputId);
    if (customInput) {
        const customMods = uniqueModifiers.filter(mod => !TARGET_MODIFIER_OPTIONS.has(mod));
        customInput.value = customMods.join(' ');
    }
}

function setSkillTargetBase(base) {
    setTargetBase('skillTargetBase', base);
}

function setSkillTargetModifiers(modifiers = []) {
    setTargetModifiers('skillTargetModifier', 'skillTargetCustom', modifiers);
}

function setStrategyTargetBase(base) {
    setTargetBase('strategyTargetBase', base);
}

function setStrategyTargetModifiers(modifiers = []) {
    setTargetModifiers('strategyTargetModifier', 'strategyTargetCustom', modifiers);
}
// 特技テキストから解析してバフを追加
function analyzeAndAddSkill(description) {
    const buffs = parseBuffText(description);
    if (buffs.length === 0) {
        alert('バフパターンが検出されませんでした。手動で入力してください。');
        return;
    }

    const addedCount = addParsedBuffs(buffs, 'skill');
    if (addedCount === 0) {
        alert('新しいバフは検出されませんでした（既にリストに存在します）。');
    } else {
        alert(`${addedCount}個のバフを検出し、特技リストに追加しました。`);
    }
}


// 計略テキストから解析してバフを追加
function analyzeAndAddStrategy(description) {
    const buffs = parseBuffText(description);
    if (buffs.length === 0) {
        alert('バフパターンが検出されませんでした。手動で入力してください。');
        return;
    }

    const addedCount = addParsedBuffs(buffs, 'strategy');
    if (addedCount === 0) {
        alert('新しいバフは検出されませんでした（既にリストに存在します）。');
    } else {
        alert(`${addedCount}個のバフを検出し、計略リストに追加しました。`);
    }
}


// 折りたたみ機能
function toggleCollapsible(labelElement) {
    labelElement.classList.toggle('active');
    const content = labelElement.nextElementSibling;
    content.classList.toggle('active');
}


// グローバルに公開（既存コード互換のため）
Object.assign(window, {
  weaponMapping,
  buffPatterns,
  TARGET_BASE_OPTIONS,
  TARGET_BASE_PRIORITY,
  ATTRIBUTE_MODIFIERS,
  ATTRIBUTE_MODIFIER_SET,
  TARGET_MODIFIER_ORDER,
  TARGET_MODIFIER_OPTIONS,
  CONDITION_SELF_KEYWORDS,
  ALL_ENEMY_REGEX,
  TARGET_KEYWORD_RULES,
  ATTRIBUTE_KEYWORDS,
  conditionPatterns,
  DUPLICATE_HINT_REGEX,
  SELF_ONLY_NOTE_REGEX,
  SELF_ONLY_TARGET_TYPES,
  ENEMY_KEYWORD_REGEX,
  GIANT_MULTIPLIER_TYPES,
  GIANT_SENTENCE_SHARED_TYPES,
  expandSharedStatDebuffs,
  expandSharedStatBuffs,
  extractFirstNumber,
  applyGiantMultiplierIfNeeded,
  determineTargetBase,
  extractAttributeModifiers,
  detectTargetInfo,
  translateLegacyTarget,
  formatTargetParts,
  detectTargetOverride,
  cleanupCondition,
  adjustParsedBuff,
  parseBuffText,
  detectBuffTarget,
  normalizeTargetLabel,
  extractBuffCondition,
  sanitizeCondition,
  formatBuffValue,
  normalizeUnitAndValue,
  isSpecialTarget,
  highlightBuffMain,
  buildEffectDisplay,
  buildBuffString
});

export {};
