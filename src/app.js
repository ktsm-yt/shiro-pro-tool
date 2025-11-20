// データ管理
let characters = [];
let currentFormation = [];
let savedFormations = [];
let selectedFormationsForComparison = [];
let selectedDamageCharacterId = null;
let damageConditionToggles = {};
let damageCharacterSearchTerm = '';
let simpleDamageProfiles = [];
let simpleDamageActiveProfileId = null;
let simpleDamageEnemyDefense = 0;
let simpleDamageInspireSelf = 0;
let simpleDamageInspireOthers = 0;
let simpleDamageEditorCollapsedState = {};
let simpleRowDragState = { profileId: null, rowId: null };
let simpleProfileDragState = { profileId: null };
const SIMPLE_DAMAGE_SPECIAL_MULTIPLIER_REGEX = {
    give: /与えるダメージ|直撃ボーナス/,
    yo: /与ダメ/,
    hi: /被ダメ/,
    count: /攻撃回数/
};

const SIMPLE_ROW_PRESETS = [
    { key: 'base', label: '基礎攻撃力（図鑑）', type: 'base', value: 0 },
    { key: 'fixed', label: '攻撃 固定値', type: 'add', value: 0 },
    { key: 'ratio', label: '割合バフ', type: 'multiply', value: 1, stage: 'pre' },
    { key: 'give', label: '与えるダメージ', type: 'multiply', value: 1, stage: 'post' },
    { key: 'direct', label: '直撃ボーナス', type: 'multiply', value: 1, stage: 'post' },
    { key: 'yo', label: '与ダメージ', type: 'multiply', value: 1, stage: 'post' },
    { key: 'hi', label: '被ダメージ', type: 'multiply', value: 1, stage: 'post' },
    { key: 'count', label: '攻撃回数', type: 'multiply', value: 1, stage: 'post' },
    { key: 'inspire', label: '鼓舞（加算）', type: 'inspire', value: 0, stage: 'pre' },
    { key: 'ratioDup', label: '効果重複', type: 'multiply', value: 1, stage: 'post' }
];

// バフ入力用の一時データ
let tempSkills = [];
let tempFormationSkills = [];
let tempStrategies = [];

// 編集モード
let isEditMode = false;
let editingCharacterId = null;

// バフ編集状態
let editingBuff = {
    type: null,  // 'skill', 'formation', 'strategy'
    index: null  // 編集中のバフのインデックス
};

// 属性フィルター状態
let selectedAttributeFilters = ['すべて'];

// バフ種別フィルター状態
let selectedCategoryFilters = ['すべて'];

// ボタン選択の初期化
document.addEventListener('DOMContentLoaded', () => {
    // 全てのselect-buttonにクリックイベント（フィルターボタンは除外）
    document.querySelectorAll('.select-button:not([data-group="attributeFilter"]):not([data-group="categoryFilter"])').forEach(button => {
        button.addEventListener('click', function() {
            const group = this.dataset.group;

            // 複数選択可能なボタンの場合
            if (this.classList.contains('multi-select')) {
                // トグル（追加/削除）
                this.classList.toggle('active');
            } else {
                // 単一選択の場合
                // 同じグループの他のボタンから activeを削除
                document.querySelectorAll(`[data-group="${group}"]`).forEach(btn => {
                    btn.classList.remove('active');
                });
                // このボタンにactiveを追加
                this.classList.add('active');
            }

        });
    });

    setSkillTargetBase('射程内');
    setSkillTargetModifiers([]);
    setStrategyTargetBase('射程内');
    setStrategyTargetModifiers([]);
});

// 選択された値を取得（単一選択）
function getSelectedValue(group) {
    const activeButton = document.querySelector(`[data-group="${group}"].active`);
    return activeButton ? activeButton.dataset.value : '';
}

// 選択された値を取得（複数選択）
function getSelectedValues(group) {
    const activeButtons = document.querySelectorAll(`[data-group="${group}"].active`);
    return Array.from(activeButtons).map(btn => btn.dataset.value);
}

// LocalStorageから読み込み
function loadData() {
    const saved = localStorage.getItem('shiroProCharacters');
    if (saved) {
        characters = JSON.parse(saved);
    } else {
        // LocalStorageにデータがない場合は空配列
        characters = [];
    }
    renderCharacters();
    loadFormations();
}

// LocalStorageに保存
function saveData() {
    localStorage.setItem('shiroProCharacters', JSON.stringify(characters));
}

// データのエクスポート/インポート機能
let currentImportType = 'characters'; // 'characters', 'formations', 'all'

// JSONファイルをダウンロード
function downloadJSON(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// キャラクターデータをエクスポート
function exportCharacters() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    downloadJSON(characters, `shiro-pro-characters-${timestamp}.json`);
    alert('キャラクターデータをエクスポートしました');
}

// 編成データをエクスポート
function exportFormations() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    downloadJSON(savedFormations, `shiro-pro-formations-${timestamp}.json`);
    alert('編成データをエクスポートしました');
}

// 全データをエクスポート
function exportAllData() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const allData = {
        characters: characters,
        formations: savedFormations,
        exportDate: new Date().toISOString(),
        version: '1.0'
    };
    downloadJSON(allData, `shiro-pro-all-data-${timestamp}.json`);
    alert('全データをエクスポートしました');
}

// キャラクターデータをインポート
function importCharacters() {
    currentImportType = 'characters';
    document.getElementById('fileInput').click();
}

// 編成データをインポート
function importFormations() {
    currentImportType = 'formations';
    document.getElementById('fileInput').click();
}

// ファイル選択時の処理
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);

            if (currentImportType === 'characters') {
                importCharactersData(data);
            } else if (currentImportType === 'formations') {
                importFormationsData(data);
            }

            // ファイル入力をリセット
            event.target.value = '';
        } catch (error) {
            alert('ファイルの読み込みに失敗しました: ' + error.message);
        }
    };
    reader.readAsText(file);
}

// キャラクターデータのインポート処理
function importCharactersData(data) {
    let importedData = [];

    // 全データフォーマットの場合
    if (data.characters && Array.isArray(data.characters)) {
        importedData = data.characters;
    }
    // キャラクター配列の場合
    else if (Array.isArray(data)) {
        importedData = data;
    }
    else {
        alert('無効なデータ形式です');
        return;
    }

    // データのマージ（IDが重複する場合は上書き）
    importedData.forEach(newChar => {
        const existingIndex = characters.findIndex(c => c.id === newChar.id);
        if (existingIndex >= 0) {
            characters[existingIndex] = newChar;
        } else {
            characters.push(newChar);
        }
    });

    saveData();
    renderCharacters();
    alert(`${importedData.length}件のキャラクターをインポートしました`);
}

// 編成データのインポート処理
function importFormationsData(data) {
    let importedData = [];

    // 全データフォーマットの場合
    if (data.formations && Array.isArray(data.formations)) {
        importedData = data.formations;
    }
    // 編成配列の場合
    else if (Array.isArray(data)) {
        importedData = data;
    }
    else {
        alert('無効なデータ形式です');
        return;
    }

    // データのマージ（IDが重複する場合は上書き）
    importedData.forEach(newFormation => {
        const existingIndex = savedFormations.findIndex(f => f.id === newFormation.id);
        if (existingIndex >= 0) {
            savedFormations[existingIndex] = newFormation;
        } else {
            savedFormations.push(newFormation);
        }
    });

    saveFormationsData();
    renderSavedFormations();
    alert(`${importedData.length}件の編成をインポートしました`);
}

// 編成をLocalStorageから読み込み
function loadFormations() {
    const saved = localStorage.getItem('shiroProFormations');
    if (saved) {
        savedFormations = JSON.parse(saved);
    }
    renderSavedFormations();
}

// 編成をLocalStorageに保存
function saveFormationsData() {
    localStorage.setItem('shiroProFormations', JSON.stringify(savedFormations));
}

// バフ追加機能
function addSkillBuff() {
    const target = getSkillTargetValue();
    const type = getSelectedValue('skillType');
    const value = document.getElementById('skillValue').value;
    const unit = document.getElementById('skillUnit').value;
    const condition = document.getElementById('skillCondition').value.trim();
    const isDuplicate = document.getElementById('skillDuplicate').checked;

    if (!target) {
        alert('対象を選択してください');
        return;
    }

    if (!type || !value) {
        alert('バフ種と数値を入力してください');
        return;
    }

    let buffText = condition
        ? `${target}/${type}${unit}${value}（${condition}）`
        : `${target}/${type}${unit}${value}`;

    // 重複フラグがついている場合は[重複]プレフィックスを付ける
    if (isDuplicate) {
        buffText = `[重複]${buffText}`;
    }

    // 編集中の場合は置き換え、そうでない場合は追加
    if (editingBuff.type === 'skill' && editingBuff.index !== null) {
        tempSkills[editingBuff.index] = buffText;
        editingBuff.type = null;
        editingBuff.index = null;
    } else {
        tempSkills.push(buffText);
    }

    renderBuffsList('skillsList', tempSkills, 'skill');

    // フォームはクリアせず、入力内容を保持（連続入力しやすくするため）
}

function addFormationBuff() {
    const target = getSelectedValue('formationTarget');
    const type = getSelectedValue('formationType');
    const value = document.getElementById('formationValue').value;
    const unit = document.getElementById('formationUnit').value;
    const condition = document.getElementById('formationCondition').value.trim();

    if (!target || !type || !value) {
        alert('全ての項目を選択・入力してください');
        return;
    }

    const buffText = condition
        ? `${target}/${type}${unit}${value}（${condition}）`
        : `${target}/${type}${unit}${value}`;

    // 編集中の場合は置き換え、そうでない場合は追加
    if (editingBuff.type === 'formation' && editingBuff.index !== null) {
        tempFormationSkills[editingBuff.index] = buffText;
        editingBuff.type = null;
        editingBuff.index = null;
    } else {
        tempFormationSkills.push(buffText);
    }

    renderBuffsList('formationsList', tempFormationSkills, 'formation');

    // フォームはクリアせず、入力内容を保持（連続入力しやすくするため）
}

function addStrategyBuff() {
    const target = getStrategyTargetValue();
    const type = getSelectedValue('strategyType');
    const value = document.getElementById('strategyValue').value;
    const unit = document.getElementById('strategyUnit').value;
    const condition = document.getElementById('strategyCondition').value.trim();
    const isDuplicate = document.getElementById('strategyDuplicate').checked;

    if (!target || !type || !value) {
        alert('全ての項目を選択・入力してください');
        return;
    }

    let buffText = condition
        ? `${target}/${type}${unit}${value}（${condition}）`
        : `${target}/${type}${unit}${value}`;

    // 重複フラグがついている場合は[重複]プレフィックスを付ける
    if (isDuplicate) {
        buffText = `[重複]${buffText}`;
    }

    // 編集中の場合は置き換え、そうでない場合は追加
    if (editingBuff.type === 'strategy' && editingBuff.index !== null) {
        tempStrategies[editingBuff.index] = buffText;
        editingBuff.type = null;
        editingBuff.index = null;
    } else {
        tempStrategies.push(buffText);
    }

    renderBuffsList('strategiesList', tempStrategies, 'strategy');

    // フォームはクリアせず、入力内容を保持（連続入力しやすくするため）
}

function renderBuffsList(containerId, buffs, type) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';

    buffs.forEach((buff, index) => {
        const tag = document.createElement('div');

        // 編集中のバフかどうかチェック
        const isEditing = editingBuff.type === type && editingBuff.index === index;
        tag.className = isEditing ? 'buff-tag editing' : 'buff-tag';

        // 重複フラグを検出
        const isDuplicate = buff.startsWith('[重複]');
        let displayBuff = isDuplicate ? buff.substring(4) : buff;

        // 条件部分（）または()を分離
        const conditionMatch = displayBuff.match(/[（(](.+)[）)]$/);
       const mainText = conditionMatch ? displayBuff.replace(/[（(].+[）)]$/, '') : displayBuff;
       const condition = conditionMatch ? conditionMatch[1] : null;
        const highlightedMain = highlightBuffMain(mainText);

        // 重複バッジ
        const duplicateBadge = isDuplicate ? '<span style="background: #ffc107; color: #333; padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: bold; margin-right: 5px;">重複</span>' : '';

        const buffContent = condition
            ? `<div class="buff-content" onclick="editBuff('${type}', ${index})">${duplicateBadge}<span class="buff-main">${highlightedMain}</span><span class="buff-condition">${condition}</span></div>`
            : `<div class="buff-content" onclick="editBuff('${type}', ${index})">${duplicateBadge}<span class="buff-main">${highlightedMain}</span></div>`;

        tag.innerHTML = `
            ${buffContent}
            <button onclick="removeBuff('${type}', ${index}); event.stopPropagation();">×</button>
        `;
        container.appendChild(tag);
    });
}

// バフを編集モードに戻す
function editBuff(type, index) {
    let buff, targetId, typeId, valueId, unitId, conditionId, duplicateId;

    if (type === 'skill') {
        buff = tempSkills[index];
        typeId = 'skillType';
        valueId = 'skillValue';
        unitId = 'skillUnit';
        conditionId = 'skillCondition';
        duplicateId = 'skillDuplicate';
    } else if (type === 'formation') {
        buff = tempFormationSkills[index];
        targetId = 'formationTarget';
        typeId = 'formationType';
        valueId = 'formationValue';
        unitId = 'formationUnit';
        conditionId = 'formationCondition';
        duplicateId = null; // 編成特技には重複チェックボックスなし
    } else if (type === 'strategy') {
        buff = tempStrategies[index];
        typeId = 'strategyType';
        valueId = 'strategyValue';
        unitId = 'strategyUnit';
        conditionId = 'strategyCondition';
        duplicateId = 'strategyDuplicate';
    }

    // 編集状態を記録
    editingBuff.type = type;
    editingBuff.index = index;

    // バフテキストを解析
    const parsed = parseBuff(buff);

    // フォームに値を設定
    if (type === 'skill') {
        if (parsed.targetParts) {
            setSkillTargetFromParts(parsed.targetParts);
        } else {
            setSkillTargetFromString(parsed.target);
        }
    } else if (type === 'strategy') {
        if (parsed.targetParts) {
            setStrategyTargetFromParts(parsed.targetParts);
        } else {
            setStrategyTargetFromString(parsed.target);
        }
    } else if (targetId) {
        setSelectedButton(targetId, parsed.target);
    }
    setSelectedButton(typeId, parsed.type);
    document.getElementById(valueId).value = parsed.value;
    document.getElementById(unitId).value = parsed.unit;
    document.getElementById(conditionId).value = parsed.condition || '';

    // 重複チェックボックスを復元（特技と計略のみ）
    if (duplicateId) {
        document.getElementById(duplicateId).checked = parsed.isDuplicate || false;
    }

    // 編集中の視覚的フィードバック
    if (type === 'skill') {
        renderBuffsList('skillsList', tempSkills, 'skill');
    } else if (type === 'formation') {
        renderBuffsList('formationsList', tempFormationSkills, 'formation');
    } else if (type === 'strategy') {
        renderBuffsList('strategiesList', tempStrategies, 'strategy');
    }
}

// バフテキストを解析
function parseBuff(buffText) {
    // 重複フラグを検出
    const isDuplicate = buffText.startsWith('[重複]');
    let cleanText = isDuplicate ? buffText.substring(4) : buffText;

    // 条件を抽出（全角・半角両対応）
    const conditionMatch = cleanText.match(/[（(](.+)[）)]$/);
    const condition = conditionMatch ? conditionMatch[1] : '';
    const mainText = conditionMatch ? cleanText.replace(/[（(].+[）)]$/, '') : cleanText;

    const segments = mainText.split('/').filter(part => part !== undefined);
    let targetSegments = [];
    let effectSegment = '';

    if (segments.length === 0) {
        targetSegments = ['射程内'];
    } else if (segments.length === 1) {
        targetSegments = [segments[0]];
    } else {
        effectSegment = segments.pop() || '';
        targetSegments = segments;
    }

    const targetParts = targetSegments.filter(Boolean);
    const translatedTarget = translateLegacyTarget(targetParts);
    const target = formatTargetParts(translatedTarget.base, translatedTarget.modifiers);
    const normalizedTargetParts = target.split('/').filter(Boolean);

    let unit = '';
    let type = '';
    let value = '';

    const unitCandidates = ['+%', '-%', '×', '+', '-'];
    const detectedUnit = unitCandidates.find(u => effectSegment.includes(u));

    if (detectedUnit) {
        const unitIndex = effectSegment.indexOf(detectedUnit);
        type = effectSegment.substring(0, unitIndex);
        value = effectSegment.substring(unitIndex + detectedUnit.length);
        unit = detectedUnit;
    } else {
        type = effectSegment;
        value = '';
        unit = '';
    }

    let result = {
        target,
        targetParts: normalizedTargetParts,
        type: type.trim(),
        value: value.trim(),
        unit,
        condition: cleanupCondition(condition, type.trim()),
        isDuplicate
    };

    adjustParsedBuff(result);
    return result;
}

// ボタンを選択状態にする
function setSelectedButton(groupName, value) {
    // 既存の選択を解除
    const buttons = document.querySelectorAll(`[data-group="${groupName}"]`);
    buttons.forEach(btn => btn.classList.remove('active'));

    // 該当するボタンを選択
    const targetButton = document.querySelector(`[data-group="${groupName}"][data-value="${value}"]`);
    if (targetButton) {
        targetButton.classList.add('active');
    }
}

// ボタンの選択を全てクリア
function clearSelectedButtons(groupName) {
    const buttons = document.querySelectorAll(`[data-group="${groupName}"]`);
    buttons.forEach(btn => btn.classList.remove('active'));
}

function removeBuff(type, index) {
    // 削除対象が編集中のバフの場合、編集状態をリセット
    if (editingBuff.type === type && editingBuff.index === index) {
        editingBuff.type = null;
        editingBuff.index = null;
    } else if (editingBuff.type === type && editingBuff.index > index) {
        // 削除後にインデックスがずれる場合は調整
        editingBuff.index--;
    }

    if (type === 'skill') {
        tempSkills.splice(index, 1);
        renderBuffsList('skillsList', tempSkills, 'skill');
    } else if (type === 'formation') {
        tempFormationSkills.splice(index, 1);
        renderBuffsList('formationsList', tempFormationSkills, 'formation');
    } else if (type === 'strategy') {
        tempStrategies.splice(index, 1);
        renderBuffsList('strategiesList', tempStrategies, 'strategy');
    }
}

// キャラクター追加・更新
function submitCharacter() {
    const name = document.getElementById('charName').value.trim();
    const period = document.getElementById('charPeriod').value.trim();
    const weapon = document.getElementById('charWeapon').value.trim();
    const weaponRange = getSelectedValue('weaponRange');
    const weaponType = getSelectedValue('weaponType');
    const placement = getSelectedValue('placement');
    const attributes = getSelectedValues('attribute');

    if (!name) {
        alert('名前を入力してください');
        return;
    }

    if (isEditMode) {
        // 編集モード：既存キャラを更新
        const char = characters.find(c => c.id === editingCharacterId);
        if (char) {
            char.name = name;
            char.period = period;
            char.weapon = weapon;
            char.weaponRange = weaponRange;
            char.weaponType = weaponType;
            char.placement = placement;
            char.attributes = attributes;
            char.skills = [...tempSkills];
            char.formationSkills = [...tempFormationSkills];
            char.strategies = [...tempStrategies];
        }
        isEditMode = false;
        editingCharacterId = null;
    } else {
        // 新規追加モード
        const newChar = {
            id: Date.now(),
            name,
            period,
            weapon,
            weaponRange,
            weaponType,
            placement,
            attributes,
            skills: [...tempSkills],
            formationSkills: [...tempFormationSkills],
            strategies: [...tempStrategies]
        };
        characters.push(newChar);
    }

    saveData();
    renderCharacters();
    clearForm();
}

// フォームをクリア
function clearForm() {
    document.getElementById('charName').value = '';
    document.getElementById('charPeriod').value = '';
    document.getElementById('charWeapon').value = '';

    // 条件入力欄をクリア
    document.getElementById('skillValue').value = '';
    document.getElementById('skillCondition').value = '';
    document.getElementById('formationValue').value = '';
    document.getElementById('formationCondition').value = '';
    document.getElementById('strategyValue').value = '';
    document.getElementById('strategyCondition').value = '';

    // バフリストクリア
    tempSkills = [];
    tempFormationSkills = [];
    tempStrategies = [];
    renderBuffsList('skillsList', tempSkills, 'skill');
    renderBuffsList('formationsList', tempFormationSkills, 'formation');
    renderBuffsList('strategiesList', tempStrategies, 'strategy');

    // 全てのボタンの選択を解除
    document.querySelectorAll('.select-button').forEach(btn => {
        btn.classList.remove('active');
    });

    setSkillTargetBase('射程内');
    setSkillTargetModifiers([]);
    setStrategyTargetBase('射程内');
    setStrategyTargetModifiers([]);

    // フォームタイトルとボタンを元に戻す
    document.getElementById('formTitle').textContent = '新規キャラクター追加';
    document.getElementById('submitBtn').textContent = 'キャラクター追加';
    document.getElementById('cancelEditBtn').style.display = 'none';

    isEditMode = false;
    editingCharacterId = null;
}

// 編集モードに入る
function editCharacter(id) {
    const char = characters.find(c => c.id === id);
    if (!char) return;

    isEditMode = true;
    editingCharacterId = id;

    // フォームにデータを読み込む
    document.getElementById('charName').value = char.name;
    document.getElementById('charPeriod').value = char.period || '';
    document.getElementById('charWeapon').value = char.weapon;

    // ボタンの選択状態を復元
    document.querySelectorAll('.select-button').forEach(btn => btn.classList.remove('active'));
    setSkillTargetBase('射程内');
    setSkillTargetModifiers([]);
    setStrategyTargetBase('射程内');
    setStrategyTargetModifiers([]);
    if (char.weaponRange) {
        const rangeBtn = document.querySelector(`[data-group="weaponRange"][data-value="${char.weaponRange}"]`);
        if (rangeBtn) rangeBtn.classList.add('active');
    }
    if (char.weaponType) {
        const typeBtn = document.querySelector(`[data-group="weaponType"][data-value="${char.weaponType}"]`);
        if (typeBtn) typeBtn.classList.add('active');
    }
    if (char.placement) {
        const placementBtn = document.querySelector(`[data-group="placement"][data-value="${char.placement}"]`);
        if (placementBtn) placementBtn.classList.add('active');
    }
    // 属性ボタンの選択状態を復元（複数選択）
    const attributes = char.attributes || (char.attribute ? [char.attribute] : []); // 後方互換性
    attributes.forEach(attr => {
        const attrBtn = document.querySelector(`[data-group="attribute"][data-value="${attr}"]`);
        if (attrBtn) attrBtn.classList.add('active');
    });

    // バフリストを読み込む
    tempSkills = [...char.skills];
    tempFormationSkills = [...char.formationSkills];
    tempStrategies = [...char.strategies];
    renderBuffsList('skillsList', tempSkills, 'skill');
    renderBuffsList('formationsList', tempFormationSkills, 'formation');
    renderBuffsList('strategiesList', tempStrategies, 'strategy');

    // フォームタイトルとボタンを変更
    document.getElementById('formTitle').textContent = `「${char.name}」を編集`;
    document.getElementById('submitBtn').textContent = 'キャラクター更新';
    document.getElementById('cancelEditBtn').style.display = 'inline-block';

    // フォームまでスクロール
    document.querySelector('.character-form').scrollIntoView({ behavior: 'smooth' });
}

// 編集をキャンセル
function cancelEdit() {
    clearForm();
}

// キャラクター削除
function deleteCharacter(id) {
    if (confirm('このキャラクターを削除しますか？')) {
        characters = characters.filter(c => c.id !== id);
        saveData();
        renderCharacters();
    }
}

// バフテキストを条件付きでフォーマット
function formatBuffWithCondition(buffText) {
    const conditionMatch = buffText.match(/[（(](.+)[）)]$/);
    if (conditionMatch) {
        const mainText = buffText.replace(/[（(].+[）)]$/, '');
        const condition = conditionMatch[1];
        const highlighted = highlightBuffMain(mainText);
        return `${highlighted}<br><span style="font-size: 10px; opacity: 0.8; font-style: italic;">${condition}</span>`;
    }
    return highlightBuffMain(buffText);
}

// キャラクター一覧を表示
function renderCharacters() {
    const grid = document.getElementById('characterGrid');
    grid.innerHTML = '';

    characters.forEach(char => {
        const card = document.createElement('div');
        card.className = 'character-card';
        const weaponInfo = `${char.weapon || ''}${char.weaponRange ? ` (${char.weaponRange}${char.weaponType ? '/' + char.weaponType : ''})` : ''}`;
        const placementInfo = char.placement ? ` [${char.placement}]` : '';
        const attributeInfo = char.attributes ? char.attributes.join('・') : (char.attribute || ''); // 後方互換性

        // 特技を条件付きでフォーマット
        const formattedSkills = char.skills.slice(0, 2).map(skill => formatBuffWithCondition(skill)).join('<br>');

        card.innerHTML = `
            <h3>${char.period ? `[${char.period}] ` : ''}${char.name}</h3>
            <div class="meta">
                ${weaponInfo}${placementInfo} | ${attributeInfo}
            </div>
            <div class="buffs">
                <strong>特技:</strong><br>
                ${formattedSkills}
                ${char.skills.length > 2 ? '<br>...' : ''}
            </div>
            <button class="btn" onclick="editCharacter(${char.id}); event.stopPropagation();" style="padding: 5px 15px; font-size: 12px; margin-top: 10px; background: #43e97b;">編集</button>
            <button class="btn delete-btn" onclick="deleteCharacter(${char.id}); event.stopPropagation();" style="padding: 5px 15px; font-size: 12px;">削除</button>
        `;
        grid.appendChild(card);
    });

    // ダメージ計算タブに反映
    renderDamageCharacterList();
    renderSelectedDamageCharacter();
    calculateDamage();
}

// 編成管理
function addToFormation(charId) {
    if (currentFormation.length >= 8) {
        alert('編成は8人までです');
        return;
    }

    if (currentFormation.includes(charId)) {
        alert('このキャラクターは既に編成に含まれています');
        return;
    }

    currentFormation.push(charId);
    renderFormation();
    renderAvailableCharacters();
}

function removeFromFormation(charId) {
    currentFormation = currentFormation.filter(id => id !== charId);
    renderFormation();
    renderAvailableCharacters();
}

function renderFormation() {
    const slots = document.querySelectorAll('.formation-slot');

    slots.forEach((slot, index) => {
        if (currentFormation[index]) {
            const char = characters.find(c => c.id === currentFormation[index]);
            if (char) {
                const weaponInfo = `${char.weapon || ''}${char.weaponRange ? ` (${char.weaponRange}${char.weaponType ? '/' + char.weaponType : ''})` : ''}`;
                const placementInfo = char.placement ? ` [${char.placement}]` : '';
                const attributeInfo = char.attributes ? char.attributes.join('・') : (char.attribute || '');
                slot.className = 'formation-slot filled';
                slot.innerHTML = `
                    <h4>${char.period ? `[${char.period}] ` : ''}${char.name}</h4>
                    <div class="meta">
                        ${weaponInfo}${placementInfo}<br>${attributeInfo}
                    </div>
                `;
                slot.onclick = () => removeFromFormation(char.id);
            }
        } else {
            slot.className = 'formation-slot empty';
            slot.innerHTML = '空き';
            slot.onclick = null;
        }
    });

    document.getElementById('memberCount').textContent = currentFormation.length;
    updateFormationStats();
    renderBarChart();
}

// 編成の統計情報を更新
function updateFormationStats() {
    const statsContainer = document.getElementById('formationStats');
    if (!statsContainer) return;

    // カウントを初期化
    const attributeCounts = {};
    const placementCounts = { '遠': 0, '近': 0 };

    // 編成メンバーをループしてカウント
    currentFormation.forEach(charId => {
        const char = characters.find(c => c.id === charId);
        if (!char) return;

        // 属性のカウント
        if (char.attributes && char.attributes.length > 0) {
            char.attributes.forEach(attr => {
                attributeCounts[attr] = (attributeCounts[attr] || 0) + 1;
            });
        } else if (char.attribute) {
            attributeCounts[char.attribute] = (attributeCounts[char.attribute] || 0) + 1;
        }

        // 配置のカウント（遠近は両方カウント）
        if (char.placement === '遠近') {
            placementCounts['遠']++;
            placementCounts['近']++;
        } else if (char.placement) {
            placementCounts[char.placement] = (placementCounts[char.placement] || 0) + 1;
        }
    });

    // バッジを生成
    let html = '';

    // 配置バッジ
    if (placementCounts['遠'] > 0 || placementCounts['近'] > 0) {
        html += `<span class="stat-badge placement">遠:${placementCounts['遠']} 近:${placementCounts['近']}</span>`;
    }

    // 属性バッジ
    const attrOrder = ['水', '平', '山', '平山', '地獄', '無属性'];
    attrOrder.forEach(attr => {
        if (attributeCounts[attr] > 0) {
            html += `<span class="stat-badge attr-${attr}">${attr}:${attributeCounts[attr]}</span>`;
        }
    });

    statsContainer.innerHTML = html;
}

// 数値を抽出する関数
function extractBuffValue(effect) {
    // ×形式（倍率）
    if (effect.includes('×')) {
        const match = effect.match(/×(\d+\.?\d*)/);
        if (match) {
            const value = parseFloat(match[1]);
            return { value: value, display: `×${value}`, numeric: value * 100 }; // 比較用に100倍
        }
    }
    // %形式
    if (effect.includes('%')) {
        const match = effect.match(/([+-]?\d+)%/);
        if (match) {
            const value = parseInt(match[1]);
            return { value: value, display: `${value > 0 ? '+' : ''}${value}%`, numeric: Math.abs(value) };
        }
    }
    // 固定値形式
    const match = effect.match(/([+-]?\d+)/);
    if (match) {
        const value = parseInt(match[1]);
        return { value: value, display: `${value > 0 ? '+' : ''}${value}`, numeric: Math.abs(value) };
    }
    return null;
}

// 隙の数値を抽出する関数（+%で短縮、-%で増加）
function extractGapValue(effect) {
    // %形式
    if (effect.includes('%')) {
        const match = effect.match(/([+-]?\d+)%/);
        if (match) {
            const value = parseInt(match[1]);
            // +なら短縮（バフ）、-なら増加（デバフ）
            return {
                value: value,
                display: `${value > 0 ? '+' : ''}${value}%`,
                numeric: Math.abs(value),
                isBuff: value > 0  // 正の値ならバフ、負の値ならデバフ
            };
        }
    }
    // 固定値形式
    const match = effect.match(/([+-]?\d+)/);
    if (match) {
        const value = parseInt(match[1]);
        return {
            value: value,
            display: `${value > 0 ? '+' : ''}${value}`,
            numeric: Math.abs(value),
            isBuff: value > 0
        };
    }
    return null;
}

// 条件付きバフから基本値を抽出（条件が限定的な場合は基本値0とする）
function extractBaseValueFromConditionalBuff(buffText) {
    // 条件部分を抽出
    const conditionMatch = buffText.match(/[（(](.+?)[）)]/);
    if (!conditionMatch) {
        // 条件がない場合は通常通り抽出
        return extractBuffValue(buffText);
    }

    const condition = conditionMatch[1];
    const mainText = buffText.replace(/[（(].+?[）)]/g, '');

    // 条件限定ワードがある場合は基本値0（グラフに表示しない）
    const exclusiveKeywords = ['のみ', '時のみ', '場合のみ', '以外は効果なし', '以外0'];
    const isExclusive = exclusiveKeywords.some(keyword => condition.includes(keyword));

    if (isExclusive) {
        return null; // 基本値なし
    }

    // 条件限定でない場合は基本値を抽出
    return extractBuffValue(mainText);
}

// バフ/デバフを詳細に集計（実際の数値）
function calculateDetailedBuffScores() {
    const formationChars = currentFormation.map(id => characters.find(c => c.id === id)).filter(c => c);

    const scores = {
        '気管理': {
            '自然気': { value: null, display: '-', numeric: 0 },
            '気(牛)': { value: null, display: '-', numeric: 0 },
            '気(ノビ)': { value: null, display: '-', numeric: 0 },
            '徐々気': { value: null, display: '-', numeric: 0 },
            '気軽減': { value: null, display: '-', numeric: 0 }
        },
        '計略': {
            '計略短縮': { value: null, display: '-', numeric: 0 }
        },
        '攻撃系': {
            '攻撃固定': { value: null, display: '-', numeric: 0, isFixed: true },
            '攻撃割合': { value: null, display: '-', numeric: 0 },
            '与ダメバフ': { value: null, display: '-', numeric: 0 },
            '与えるダメージバフ': { value: null, display: '-', numeric: 0 },
            '被ダメバフ': { value: null, display: '-', numeric: 0 },
            '防御無視': { value: null, display: '-', numeric: 0 },
            '防御デバフ固定': { value: null, display: '-', numeric: 0, isFixed: true },
            '防御デバフ割合': { value: null, display: '-', numeric: 0 }
        },
        '防御系': {
            '被ダメ軽減': { value: null, display: '-', numeric: 0 },
            '与ダメ回復': { value: null, display: '-', numeric: 0 },
            '与ダメデバフ': { value: null, display: '-', numeric: 0 },
            '防御固定': { value: null, display: '-', numeric: 0, isFixed: true },
            '防御割合': { value: null, display: '-', numeric: 0 },
            '回復': { value: null, display: '-', numeric: 0, isFixed: true },
            '回復割合': { value: null, display: '-', numeric: 0 },
            '攻撃デバフ固定': { value: null, display: '-', numeric: 0, isFixed: true },
            '攻撃デバフ割合': { value: null, display: '-', numeric: 0 }
        },
        '速度': {
            '速度バフ': { value: null, display: '-', numeric: 0 },
            '速度デバフ': { value: null, display: '-', numeric: 0 },
            '隙短縮': { value: null, display: '-', numeric: 0 },
            '隙増加': { value: null, display: '-', numeric: 0 }
        },
        '移動速度': {
            '移動変更': { value: null, display: '-', numeric: 0 },
            '移動低下': { value: null, display: '-', numeric: 0 },
            '移動停止': { value: null, display: '-', numeric: 0 },
            '移動後退': { value: null, display: '-', numeric: 0 }
        },
        '射程': {
            '射程固定': { value: null, display: '-', numeric: 0, isFixed: true },
            '射程割合': { value: null, display: '-', numeric: 0 },
            '射程デバフ': { value: null, display: '-', numeric: 0 },
            '対象数': { value: null, display: '-', numeric: 0, isFixed: true }
        }
    };

    function updateMax(category, item, newValue) {
        if (!newValue) return;
        const current = scores[category][item];

        // 固定値バフは加算
        if (current.isFixed) {
            const totalValue = (current.value || 0) + newValue.value;
            const totalNumeric = (current.numeric || 0) + newValue.numeric;
            scores[category][item] = {
                value: totalValue,
                display: totalValue > 0 ? `+${totalValue}` : `${totalValue}`,
                numeric: totalNumeric,
                isFixed: true
            };
        } else {
            // 割合バフは最大値を採用
            if (current.value === null || newValue.numeric > current.numeric) {
                scores[category][item] = { ...newValue, isFixed: false };
            }
        }
    }

    formationChars.forEach(char => {
        const allEffects = [...char.skills, ...char.formationSkills, ...char.strategies];

        allEffects.forEach(effect => {
            // 重複バフはスキップ（グラフに含めない）
            if (effect.startsWith('[重複]')) {
                return;
            }

            // 「自身」バフは編成比較から除外（ダメージ計算では使用）
            if (effect.startsWith('自身/')) {
                return;
            }

            // 条件付きバフから基本値を抽出（extractBuffValueの代わりに使用）
            const extractFunc = extractBaseValueFromConditionalBuff;

            // 計略
            if (effect.includes('計略短縮')) {
                updateMax('計略', '計略短縮', extractFunc(effect));
            }

            // 気管理
            if (effect.includes('気軽減')) {
                updateMax('気管理', '気軽減', extractFunc(effect));
            } else if (effect.includes('気-')) {
                updateMax('気管理', '気軽減', extractFunc(effect));
            }
            if (effect.includes('自然気')) {
                updateMax('気管理', '自然気', extractFunc(effect));
            }
            if (effect.includes('気(牛)') || effect.includes('気（牛）')) {
                updateMax('気管理', '気(牛)', extractFunc(effect));
            } else if (effect.includes('気(ノビ)') || effect.includes('気（ノビ）')) {
                updateMax('気管理', '気(ノビ)', extractFunc(effect));
            } else if (effect.includes('気+') && effect.includes('撃破')) {
                const val = extractFunc(effect);
                if (val && val.value === 2) updateMax('気管理', '気(牛)', val);
                else if (val && val.value === 1) updateMax('気管理', '気(ノビ)', val);
            }
            if (effect.includes('徐々気')) {
                updateMax('気管理', '徐々気', extractFunc(effect));
            }

            // 速度
            if (effect.includes('攻撃速度+') || (effect.includes('速度+') && !effect.includes('移動'))) {
                updateMax('速度', '速度バフ', extractFunc(effect));
            }
            if (effect.includes('攻撃速度-') || (effect.includes('速度-') && !effect.includes('移動'))) {
                updateMax('速度', '速度デバフ', extractFunc(effect));
            }
            // 隙の処理（+で短縮、-で増加）
            if (effect.includes('隙-') || effect.includes('隙+')) {
                const gapValue = extractGapValue(effect);
                if (gapValue) {
                    if (gapValue.isBuff) {
                        // 隙+XX% → 隙短縮+XX%（バフ）
                        updateMax('速度', '隙短縮', gapValue);
                    } else {
                        // 隙-XX% → 隙増加-XX%（デバフ）
                        updateMax('速度', '隙増加', gapValue);
                    }
                }
            }
            if (effect.includes('攻撃隙0')) {
                updateMax('速度', '隙短縮', { value: 100, display: '+100%', numeric: 100 });
            }

            // 射程
            if (effect.includes('射程固定')) {
                if (effect.includes('射程固定-%') || effect.includes('射程固定-')) {
                    updateMax('射程', '射程デバフ', extractFunc(effect));
                } else {
                    updateMax('射程', '射程固定', extractFunc(effect));
                }
            } else if (effect.includes('射程割合')) {
                if (effect.includes('射程割合-%') || effect.includes('射程割合-')) {
                    updateMax('射程', '射程デバフ', extractFunc(effect));
                } else {
                    updateMax('射程', '射程割合', extractFunc(effect));
                }
            } else if (effect.includes('射程×')) {
                updateMax('射程', '射程割合', extractFunc(effect));
            } else if (effect.includes('射程-')) {
                updateMax('射程', '射程デバフ', extractFunc(effect));
            } else if (effect.includes('射程+')) {
                updateMax('射程', '射程固定', extractFunc(effect));
            }
            // 対象数
            if (effect.includes('対象数+') || effect.includes('対象+')) {
                updateMax('射程', '対象数', extractFunc(effect));
            }

            // 攻撃系
            if (effect.includes('攻撃固定')) {
                updateMax('攻撃系', '攻撃固定', extractFunc(effect));
            } else if (effect.includes('攻撃割合')) {
                updateMax('攻撃系', '攻撃割合', extractFunc(effect));
            } else if (effect.includes('攻撃+')) {
                updateMax('攻撃系', '攻撃固定', extractFunc(effect));
            } else if (effect.includes('攻撃×')) {
                updateMax('攻撃系', '攻撃割合', extractFunc(effect));
            }
            // 「与えるダメージ」が先にチェック（より具体的な方を先に）
            if (effect.includes('与ダメ回復')) {
                updateMax('防御系', '与ダメ回復', extractFunc(effect));
            } else if (effect.includes('与えるダメージ')) {
                updateMax('攻撃系', '与えるダメージバフ', extractFunc(effect));
            } else if (effect.includes('与ダメ-')) {
                updateMax('防御系', '与ダメデバフ', extractFunc(effect));
            } else if (effect.includes('与ダメ')) {
                updateMax('攻撃系', '与ダメバフ', extractFunc(effect));
            }
            if (effect.includes('被ダメ+') || effect.includes('被ダメ×')) {
                updateMax('攻撃系', '被ダメバフ', extractFunc(effect));
            }
            // 割合重複
            if (effect.includes('割合重複')) {
                updateMax('攻撃系', '重複バフ', extractFunc(effect));
            }
            // 防御デバフ
            if (effect.includes('防御デバフ固定')) {
                updateMax('攻撃系', '防御デバフ固定', extractFunc(effect));
            } else if (effect.includes('防御デバフ割合')) {
                updateMax('攻撃系', '防御デバフ割合', extractFunc(effect));
            } else if (effect.includes('防御-') && effect.includes('%')) {
                updateMax('攻撃系', '防御デバフ割合', extractFunc(effect));
            } else if (effect.includes('防御-')) {
                updateMax('攻撃系', '防御デバフ固定', extractFunc(effect));
            }
            // 防御無視
            if (effect.includes('防御無視')) {
                updateMax('攻撃系', '防御無視', extractFunc(effect));
            }

            // 防御系
            if (effect.includes('被ダメ-')) {
                updateMax('防御系', '被ダメ軽減', extractFunc(effect));
            }
            if (effect.includes('防御固定')) {
                updateMax('防御系', '防御固定', extractFunc(effect));
            } else if (effect.includes('防御割合')) {
                updateMax('防御系', '防御割合', extractFunc(effect));
            } else if (effect.includes('防御×')) {
                updateMax('防御系', '防御割合', extractFunc(effect));
            } else if (effect.includes('防御+')) {
                updateMax('防御系', '防御固定', extractFunc(effect));
            }
            if (effect.includes('回復+')) {
                updateMax('防御系', '回復', extractFunc(effect));
            } else if (effect.includes('回復割合')) {
                updateMax('防御系', '回復割合', extractFunc(effect));
            } else if (effect.includes('回復×')) {
                updateMax('防御系', '回復割合', extractFunc(effect));
            }
            // 攻撃デバフ
            if (effect.includes('攻撃デバフ固定')) {
                updateMax('防御系', '攻撃デバフ固定', extractFunc(effect));
            } else if (effect.includes('攻撃デバフ割合')) {
                updateMax('防御系', '攻撃デバフ割合', extractFunc(effect));
            }

            // 移動速度
            if (effect.includes('移動変更')) {
                updateMax('移動速度', '移動変更', extractFunc(effect));
            }
            if (effect.includes('移動低下')) {
                updateMax('移動速度', '移動低下', extractFunc(effect));
            }
            if (effect.includes('移動停止')) {
                updateMax('移動速度', '移動停止', { value: 100, display: '停止', numeric: 100 });
            }
            if (effect.includes('移動後退')) {
                updateMax('移動速度', '移動後退', extractFunc(effect));
            }
        });
    });

    return scores;
}

function renderBarChart() {
    const chartDiv = document.getElementById('barChart');
    const scores = calculateDetailedBuffScores();
    chartDiv.innerHTML = '';

    // カテゴリごとの色定義（表示順序に対応）
    const categoryColors = {
        '気管理': '#4facfe',
        '計略': '#9b59b6',
        '攻撃系': '#fd79a8',
        '防御系': '#95a5a6',
        '速度': '#43e97b',
        '移動速度': '#f39c12',
        '射程': '#e74c3c'
    };

    // 凡例を作成
    const legend = document.createElement('div');
    legend.className = 'chart-legend';
    Object.entries(categoryColors).forEach(([category, color]) => {
        const item = document.createElement('div');
        item.className = 'legend-item';
        item.innerHTML = `
            <div class="legend-color" style="background: ${color}"></div>
            <span>${category}</span>
        `;
        legend.appendChild(item);
    });
    chartDiv.appendChild(legend);

    // 全てのバフを1つのコンパクトな棒グラフに表示
    const barsContainer = document.createElement('div');
    barsContainer.className = 'compact-bars';

    // 統一基準値（全カテゴリ共通）
    const maxBaseValue = 100;

    Object.entries(scores).forEach(([category, items], catIndex) => {
        // カテゴリの区切り線（最初以外）
        if (catIndex > 0) {
            const divider = document.createElement('div');
            divider.className = 'category-divider';
            barsContainer.appendChild(divider);
        }

        Object.entries(items).forEach(([itemName, buffData]) => {
            // 固定値バフは除外
            if (buffData.isFixed) return;

            const barItem = document.createElement('div');
            barItem.className = 'compact-bar-item';

            // 統一基準値（100）に対する割合
            const height = buffData.numeric > 0 ? Math.min((buffData.numeric / maxBaseValue) * 100, 100) : 0;

            // デバフ項目（名前に「デバフ」「増加」「低下」などを含む）は暗い色で表示
            let color = categoryColors[category];
            const isDebuff = itemName.includes('デバフ') || itemName.includes('増加') ||
                            itemName.includes('低下') || itemName.includes('後退') || itemName.includes('停止');
            if (isDebuff) {
                // デバフは少し暗めの色に変更（不透明度を下げる）
                color = categoryColors[category] + '80'; // 50%の不透明度
            }

            barItem.innerHTML = `
                <div class="compact-bar-container">
                    <div class="compact-bar-fill" style="height: ${height}%; background: ${color}">
                        <div class="compact-bar-value" style="color: ${color}">${buffData.display}</div>
                    </div>
                </div>
                <div class="compact-bar-label">${itemName}</div>
            `;

            barsContainer.appendChild(barItem);
        });
    });

    chartDiv.appendChild(barsContainer);

    // 固定値バフの合計を別表示
    const fixedValuesDiv = document.createElement('div');
    fixedValuesDiv.style.cssText = 'margin-top: 30px; padding: 20px; background: white; border-radius: 10px; border: 2px solid #e0e0e0;';

    let hasFixedValues = false;
    let fixedValuesHTML = '<h4 style="margin-bottom: 15px; color: #667eea;">固定値バフ合計</h4><div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px;">';

    Object.entries(scores).forEach(([category, items]) => {
        Object.entries(items).forEach(([itemName, buffData]) => {
            if (buffData.isFixed) {
                hasFixedValues = true;
                const color = categoryColors[category];
                fixedValuesHTML += `
                    <div style="padding: 10px; background: ${color}20; border-left: 4px solid ${color}; border-radius: 5px;">
                        <div style="font-size: 12px; color: #666; margin-bottom: 3px;">${itemName}</div>
                        <div style="font-size: 18px; font-weight: bold; color: ${color};">${buffData.display}</div>
                    </div>
                `;
            }
        });
    });

    fixedValuesHTML += '</div>';

    if (hasFixedValues) {
        fixedValuesDiv.innerHTML = fixedValuesHTML;
        chartDiv.appendChild(fixedValuesDiv);
    }

    // 条件付きバフを別表示
    const conditionalBuffsDiv = document.createElement('div');
    conditionalBuffsDiv.style.cssText = 'margin-top: 20px; padding: 20px; background: white; border-radius: 10px; border: 2px solid #e0e0e0;';

    let hasConditionalBuffs = false;
    let conditionalBuffsHTML = '<h4 style="margin-bottom: 10px; color: #667eea;">条件付きバフ</h4><div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 8px;">';

    // 編成メンバーの全バフから条件付きのものを抽出
    currentFormation.forEach(charId => {
        const char = characters.find(c => c.id === charId);
        if (!char) return;

        const allBuffs = [
            ...(char.skills || []),
            ...(char.formationSkills || []),
            ...(char.strategies || [])
        ];

        allBuffs.forEach(buff => {
            const conditionMatch = buff.match(/[（(](.+)[）)]$/);
            if (conditionMatch) {
                hasConditionalBuffs = true;
                const mainText = buff.replace(/[（(].+[）)]$/, '');
                const condition = conditionMatch[1];
                conditionalBuffsHTML += `
                    <div style="padding: 8px; background: #f8f9fa; border-left: 3px solid #667eea; border-radius: 4px;">
                        <div style="font-size: 11px; font-weight: bold; color: #333; margin-bottom: 2px;">${mainText}</div>
                        <div style="font-size: 10px; color: #666; font-style: italic; margin-bottom: 2px;">条件: ${condition}</div>
                        <div style="font-size: 9px; color: #999;">[${char.name}]</div>
                    </div>
                `;
            }
        });
    });

    conditionalBuffsHTML += '</div>';

    if (hasConditionalBuffs) {
        conditionalBuffsDiv.innerHTML = conditionalBuffsHTML;
        chartDiv.appendChild(conditionalBuffsDiv);
    }

    // 重複バフを別表示
    const duplicateBuffsDiv = document.createElement('div');
    duplicateBuffsDiv.style.cssText = 'margin-top: 20px; padding: 20px; background: white; border-radius: 10px; border: 2px solid #e0e0e0;';

    let hasDuplicateBuffs = false;
    let duplicateBuffsHTML = '<h4 style="margin-bottom: 10px; color: #667eea;">重複バフ（グラフ除外）</h4><div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 8px;">';

    // 編成メンバーの全バフから重複フラグ付きのものを抽出
    currentFormation.forEach(charId => {
        const char = characters.find(c => c.id === charId);
        if (!char) return;

        const allBuffs = [
            ...(char.skills || []),
            ...(char.formationSkills || []),
            ...(char.strategies || [])
        ];

        allBuffs.forEach(buff => {
            if (buff.startsWith('[重複]')) {
                hasDuplicateBuffs = true;
                // [重複]を除去して表示
                const cleanBuff = buff.substring(4);
                // 条件があれば分離
                const conditionMatch = cleanBuff.match(/[（(](.+)[）)]$/);
                const mainText = conditionMatch ? cleanBuff.replace(/[（(].+[）)]$/, '') : cleanBuff;
                const condition = conditionMatch ? conditionMatch[1] : null;

                duplicateBuffsHTML += `
                    <div style="padding: 8px; background: #fff3cd; border-left: 3px solid #ffc107; border-radius: 4px;">
                        <div style="font-size: 11px; font-weight: bold; color: #333; margin-bottom: 2px;">${mainText}</div>
                        ${condition ? `<div style="font-size: 10px; color: #666; font-style: italic; margin-bottom: 2px;">条件: ${condition}</div>` : ''}
                        <div style="font-size: 9px; color: #999;">[${char.name}]</div>
                    </div>
                `;
            }
        });
    });

    duplicateBuffsHTML += '</div>';

    if (hasDuplicateBuffs) {
        duplicateBuffsDiv.innerHTML = duplicateBuffsHTML;
        chartDiv.appendChild(duplicateBuffsDiv);
    }
}

// 属性フィルターのトグル
function toggleAttributeFilter(button) {
    const value = button.dataset.value;
    const filterButtons = document.querySelectorAll('[data-group="attributeFilter"]');
    const allButton = document.querySelector('[data-group="attributeFilter"][data-value="すべて"]');

    if (value === 'すべて') {
        // すべてを選択した場合、他を全て解除
        selectedAttributeFilters = ['すべて'];
        filterButtons.forEach(btn => {
            if (btn.dataset.value === 'すべて') {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    } else {
        // 特定の属性を選択/解除
        // まず「すべて」を解除
        if (selectedAttributeFilters.includes('すべて')) {
            selectedAttributeFilters = [];
            allButton.classList.remove('active');
        }

        if (selectedAttributeFilters.includes(value)) {
            // 既に選択されている場合は解除
            selectedAttributeFilters = selectedAttributeFilters.filter(v => v !== value);
            button.classList.remove('active');
        } else {
            // 選択されていない場合は追加
            selectedAttributeFilters.push(value);
            button.classList.add('active');
        }

        // 何も選択されていない場合は「すべて」に戻す
        if (selectedAttributeFilters.length === 0) {
            selectedAttributeFilters = ['すべて'];
            allButton.classList.add('active');
        }
    }

    renderAvailableCharacters();
}

// バフ種別フィルターのトグル
function toggleCategoryFilter(button) {
    const value = button.dataset.value;
    const filterButtons = document.querySelectorAll('[data-group="categoryFilter"]');
    const allButton = document.querySelector('[data-group="categoryFilter"][data-value="すべて"]');

    if (value === 'すべて') {
        // すべてを選択した場合、他を全て解除
        selectedCategoryFilters = ['すべて'];
        filterButtons.forEach(btn => {
            if (btn.dataset.value === 'すべて') {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    } else {
        // 特定のカテゴリを選択/解除
        // まず「すべて」を解除
        if (selectedCategoryFilters.includes('すべて')) {
            selectedCategoryFilters = [];
            allButton.classList.remove('active');
        }

        if (selectedCategoryFilters.includes(value)) {
            // 既に選択されている場合は解除
            selectedCategoryFilters = selectedCategoryFilters.filter(v => v !== value);
            button.classList.remove('active');
        } else {
            // 選択されていない場合は追加
            selectedCategoryFilters.push(value);
            button.classList.add('active');
        }

        // 何も選択されていない場合は「すべて」に戻す
        if (selectedCategoryFilters.length === 0) {
            selectedCategoryFilters = ['すべて'];
            allButton.classList.add('active');
        }
    }

    renderAvailableCharacters();
}

// キャラが持つバフカテゴリを判定
function getCharacterCategories(char) {
    const categories = new Set();
    const allBuffs = [
        ...(char.skills || []),
        ...(char.formationSkills || []),
        ...(char.strategies || [])
    ];

    allBuffs.forEach(buff => {
        // [重複]プレフィックスを除去
        const cleanBuff = buff.startsWith('[重複]') ? buff.substring(4) : buff;

        // 気管理
        if (cleanBuff.includes('気') || cleanBuff.includes('巨大化')) {
            categories.add('気管理');
        }
        // 計略
        if (cleanBuff.includes('計略')) {
            categories.add('計略');
        }
        // 攻撃系（より具体的なパターンを先にチェック）
        if (cleanBuff.includes('防御デバフ') || cleanBuff.includes('防御無視') || cleanBuff.includes('防御-') ||
            cleanBuff.includes('与ダメ') || cleanBuff.includes('与えるダメージ') ||
            cleanBuff.includes('被ダメ+') ||  // 被ダメ増加は攻撃系（敵への防御デバフ）
            (cleanBuff.includes('攻撃') && !cleanBuff.includes('攻撃デバフ') && !cleanBuff.includes('攻撃-'))) {
            categories.add('攻撃系');
        }
        // 防御系（より具体的なパターンを先にチェック）
        if (cleanBuff.includes('攻撃デバフ') || cleanBuff.includes('攻撃-') ||
            cleanBuff.includes('耐久') || cleanBuff.includes('被ダメ-') || cleanBuff.includes('被ダメ軽減') ||
            (cleanBuff.includes('防御') && !cleanBuff.includes('防御デバフ') && !cleanBuff.includes('防御無視') && !cleanBuff.includes('防御-'))) {
            categories.add('防御系');
        }
        // 速度（移動を除外）
        if ((cleanBuff.includes('速度') || cleanBuff.includes('隙')) && !cleanBuff.includes('移動')) {
            categories.add('速度');
        }
        // 移動速度
        if (cleanBuff.includes('移動')) {
            categories.add('移動速度');
        }
        // 射程
        if (cleanBuff.includes('射程') || cleanBuff.includes('対象数') || cleanBuff.includes('対象+')) {
            categories.add('射程');
        }
    });

    return Array.from(categories);
}

function renderAvailableCharacters() {
    const grid = document.getElementById('availableCharacters');
    if (!grid) return;

    grid.innerHTML = '';

    // フィルター適用
    const filteredCharacters = characters.filter(char => {
        // 属性フィルターチェック
        const attributeMatch = selectedAttributeFilters.includes('すべて') ||
            selectedAttributeFilters.some(filter => (char.attributes || []).includes(filter));

        // バフ種別フィルターチェック
        const charCategories = getCharacterCategories(char);
        const categoryMatch = selectedCategoryFilters.includes('すべて') ||
            selectedCategoryFilters.some(filter => charCategories.includes(filter));

        return attributeMatch && categoryMatch;
    });

    filteredCharacters.forEach(char => {
        const card = document.createElement('div');
        const isInFormation = currentFormation.includes(char.id);
        card.className = 'character-card' + (isInFormation ? ' in-formation' : '');

        card.innerHTML = `
            <h3>${char.period ? `[${char.period}] ` : ''}${char.name}</h3>
        `;

        // クリックで追加・削除をトグル
        if (isInFormation) {
            card.onclick = () => removeFromFormation(char.id);
            card.style.cursor = 'pointer';
        } else {
            card.onclick = () => addToFormation(char.id);
        }

        grid.appendChild(card);
    });
}

// 編成保存
function saveFormation() {
    if (currentFormation.length === 0) {
        alert('編成にキャラクターを追加してください');
        return;
    }

    const name = document.getElementById('formationName').value.trim();
    if (!name) {
        alert('編成名を入力してください');
        return;
    }

    const formation = {
        id: Date.now(),
        name: name,
        members: [...currentFormation]
    };

    savedFormations.push(formation);
    saveFormationsData();
    renderSavedFormations();

    document.getElementById('formationName').value = '';
    alert('編成を保存しました');
}

// 編成クリア
function clearFormation() {
    if (confirm('現在の編成をクリアしますか？')) {
        currentFormation = [];
        renderFormation();
        renderAvailableCharacters();
    }
}

// 保存した編成を表示
function renderSavedFormations() {
    const list = document.getElementById('savedFormationsList');
    list.innerHTML = '';

    if (savedFormations.length === 0) {
        list.innerHTML = '<p style="color: #999; text-align: center;">保存した編成はありません</p>';
        return;
    }

    savedFormations.forEach(formation => {
        const card = document.createElement('div');
        card.className = 'saved-formation-card';

        const memberNames = formation.members
            .map(id => {
                const char = characters.find(c => c.id === id);
                return char ? (char.period ? `[${char.period}] ${char.name}` : char.name) : '不明';
            })
            .join('、');

        card.innerHTML = `
            <div class="saved-formation-header">
                <div class="saved-formation-name">${formation.name}</div>
                <div class="saved-formation-actions">
                    <button class="btn" onclick="loadFormation(${formation.id})" style="padding: 5px 15px; font-size: 12px;">読込</button>
                    <button class="btn delete-btn" onclick="deleteSavedFormation(${formation.id})" style="padding: 5px 15px; font-size: 12px;">削除</button>
                </div>
            </div>
            <div class="saved-formation-members">
                メンバー（${formation.members.length}）: ${memberNames}
            </div>
        `;

        list.appendChild(card);
    });
}

// 編成をロード
function loadFormation(id) {
    const formation = savedFormations.find(f => f.id === id);
    if (formation) {
        currentFormation = [...formation.members];
        renderFormation();
        renderAvailableCharacters();
    }
}

// 保存した編成を削除
function deleteSavedFormation(id) {
    if (confirm('この編成を削除しますか？')) {
        savedFormations = savedFormations.filter(f => f.id !== id);
        saveFormationsData();
        renderSavedFormations();
    }
}

// 編成比較機能
function renderFormationSelector() {
    const selector = document.getElementById('formationSelector');
    selector.innerHTML = '';

    if (savedFormations.length === 0) {
        selector.innerHTML = '<p style="color: #999; text-align: center;">保存した編成がありません。先に編成を保存してください。</p>';
        return;
    }

    savedFormations.forEach(formation => {
        const checkbox = document.createElement('div');
        checkbox.className = 'formation-checkbox';

        const memberNames = formation.members
            .map(id => {
                const char = characters.find(c => c.id === id);
                return char ? (char.period ? `[${char.period}] ${char.name}` : char.name) : '不明';
            })
            .join('、');

        const isChecked = selectedFormationsForComparison.includes(formation.id);

        checkbox.innerHTML = `
            <input type="checkbox" ${isChecked ? 'checked' : ''} onchange="toggleFormationComparison(${formation.id})">
            <div class="formation-checkbox-label">
                <div class="formation-checkbox-name">${formation.name}</div>
                <div class="formation-checkbox-members">メンバー（${formation.members.length}）: ${memberNames}</div>
            </div>
        `;

        selector.appendChild(checkbox);
    });
}

function toggleFormationComparison(formationId) {
    if (selectedFormationsForComparison.includes(formationId)) {
        selectedFormationsForComparison = selectedFormationsForComparison.filter(id => id !== formationId);
    } else {
        selectedFormationsForComparison.push(formationId);
    }
    renderComparisonChart();
}

function renderComparisonChart() {
    const chartDiv = document.getElementById('comparisonChart');
    chartDiv.innerHTML = '';

    if (selectedFormationsForComparison.length === 0) {
        chartDiv.innerHTML = '<p style="color: #999; text-align: center;">編成を選択すると、比較チャートが表示されます</p>';
        return;
    }

    // 各編成のスコアを計算
    const formationScores = selectedFormationsForComparison.map(formationId => {
        const formation = savedFormations.find(f => f.id === formationId);
        if (!formation) return null;

        const tempFormation = currentFormation;
        currentFormation = formation.members;
        const scores = calculateDetailedBuffScores();
        currentFormation = tempFormation;

        return {
            name: formation.name,
            scores: scores
        };
    }).filter(f => f !== null);

    // カテゴリごとの色定義（表示順序に対応）
    const categoryColors = {
        '気管理': '#4facfe',
        '計略': '#9b59b6',
        '攻撃系': '#fd79a8',
        '防御系': '#95a5a6',
        '速度': '#43e97b',
        '移動速度': '#f39c12',
        '射程': '#e74c3c'
    };

    // 編成ごとの色
    const formationColors = ['#667eea', '#f093fb', '#4facfe', '#43e97b'];

    // 凡例を作成
    const legend = document.createElement('div');
    legend.className = 'chart-legend';

    // カテゴリ凡例
    Object.entries(categoryColors).forEach(([category, color]) => {
        const item = document.createElement('div');
        item.className = 'legend-item';
        item.innerHTML = `
            <div class="legend-color" style="background: ${color}"></div>
            <span>${category}</span>
        `;
        legend.appendChild(item);
    });

    // 編成凡例
    formationScores.forEach((formation, index) => {
        const item = document.createElement('div');
        item.className = 'legend-item';
        item.innerHTML = `
            <div class="legend-color" style="background: ${formationColors[index]}; border: 2px solid ${formationColors[index]}"></div>
            <span>${formation.name}</span>
        `;
        legend.appendChild(item);
    });

    chartDiv.appendChild(legend);

    // 全てのバフを1つのコンパクトな比較チャートに表示
    const categories = Object.keys(formationScores[0].scores);

    // 統一基準値（全カテゴリ共通）
    const maxBaseValue = 100;

    categories.forEach((category, catIndex) => {
        if (catIndex > 0) {
            const divider = document.createElement('div');
            divider.style.height = '2px';
            divider.style.background = '#e0e0e0';
            divider.style.margin = '30px 0';
            chartDiv.appendChild(divider);
        }

        const items = Object.keys(formationScores[0].scores[category]);
        const barsContainer = document.createElement('div');
        barsContainer.className = 'compact-bars';
        barsContainer.style.height = '150px';

        items.forEach((itemName, itemIndex) => {
            // 項目間の区切り
            if (itemIndex > 0) {
                const divider = document.createElement('div');
                divider.className = 'category-divider';
                barsContainer.appendChild(divider);
            }

            // 固定値バフは除外
            const firstBuffData = formationScores[0].scores[category][itemName];
            if (firstBuffData.isFixed) return;

            formationScores.forEach((formation, formIndex) => {
                const buffData = formation.scores[category][itemName];
                // 統一基準値（100）に対する割合
                const height = buffData.numeric > 0 ? Math.min((buffData.numeric / maxBaseValue) * 100, 100) : 0;

                // デバフ項目は不透明度を下げる
                let color = formationColors[formIndex];
                const isDebuff = itemName.includes('デバフ') || itemName.includes('増加') ||
                                itemName.includes('低下') || itemName.includes('後退') || itemName.includes('停止');
                if (isDebuff) {
                    color = formationColors[formIndex] + '80'; // 50%の不透明度
                }

                const barItem = document.createElement('div');
                barItem.className = 'compact-bar-item';
                barItem.innerHTML = `
                    <div class="compact-bar-container">
                        <div class="compact-bar-fill" style="height: ${height}%; background: ${color}">
                            <div class="compact-bar-value" style="color: ${color}">${buffData.display}</div>
                        </div>
                    </div>
                    <div class="compact-bar-label">${itemName}</div>
                `;

                barsContainer.appendChild(barItem);
            });
        });

        chartDiv.appendChild(barsContainer);
    });
}

// 簡易ダメージ計算
const SIMPLE_DAMAGE_STORAGE_KEY = 'simpleDamageProfiles';
const SIMPLE_DAMAGE_SETTINGS_KEY = 'simpleDamageSettings';
const ACTIVE_TAB_STORAGE_KEY = 'activeTabName';
let simpleDamageRowIdCounter = 0;
function generateSimpleProfileId() {
    return Math.floor(Date.now() + Math.random() * 1000);
}

function initializeSimpleDamageModule() {
    loadSimpleDamageData();
    loadSimpleDamageSettings();
    if (simpleDamageProfiles.length === 0) {
        const profile = createDefaultSimpleDamageProfile();
        simpleDamageProfiles.push(profile);
        simpleDamageActiveProfileId = profile.id;
        saveSimpleDamageData();
    }
    if (!simpleDamageActiveProfileId && simpleDamageProfiles.length > 0) {
        simpleDamageActiveProfileId = simpleDamageProfiles[0].id;
    }
    renderSimpleDamageTab();
}

function loadSimpleDamageData() {
    try {
        const storedProfiles = localStorage.getItem(SIMPLE_DAMAGE_STORAGE_KEY);
        if (storedProfiles) {
            simpleDamageProfiles = JSON.parse(storedProfiles);
        }
    } catch (err) {
        console.error('Failed to load simple damage data', err);
        simpleDamageProfiles = [];
    }

    normalizeSimpleDamageData();
}

function loadSimpleDamageSettings() {
    let fallbackEnemyDefense = 0;
    const profileWithDefense = simpleDamageProfiles.find(profile => Number.isFinite(Number(profile.enemyDefense)));
    if (profileWithDefense) {
        fallbackEnemyDefense = Number(profileWithDefense.enemyDefense) || 0;
    }

    try {
        const stored = localStorage.getItem(SIMPLE_DAMAGE_SETTINGS_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            simpleDamageEnemyDefense = Number(parsed.enemyDefense);
            if (!Number.isFinite(simpleDamageEnemyDefense)) {
                simpleDamageEnemyDefense = fallbackEnemyDefense;
            }
            simpleDamageInspireSelf = Number(parsed.inspireSelf);
            if (!Number.isFinite(simpleDamageInspireSelf)) {
                simpleDamageInspireSelf = 0;
            }
            simpleDamageInspireOthers = Number(parsed.inspireOthers);
            if (!Number.isFinite(simpleDamageInspireOthers)) {
                simpleDamageInspireOthers = 0;
            }
            return;
        }
    } catch (err) {
        console.error('Failed to load simple damage settings', err);
    }

    simpleDamageEnemyDefense = fallbackEnemyDefense;
    simpleDamageInspireSelf = 0;
    simpleDamageInspireOthers = 0;
}

function saveSimpleDamageData() {
    simpleDamageProfiles.forEach(profile => {
        profile.enemyDefense = simpleDamageEnemyDefense;
    });
    localStorage.setItem(SIMPLE_DAMAGE_STORAGE_KEY, JSON.stringify(simpleDamageProfiles));
}

function saveSimpleDamageSettings() {
    const payload = {
        enemyDefense: simpleDamageEnemyDefense,
        inspireSelf: simpleDamageInspireSelf,
        inspireOthers: simpleDamageInspireOthers
    };
    localStorage.setItem(SIMPLE_DAMAGE_SETTINGS_KEY, JSON.stringify(payload));
}

function normalizeSimpleDamageData() {
    simpleDamageProfiles = (simpleDamageProfiles || []).map(profile => {
        const normalizedRows = (profile.rows || []).map(row => {
            const normalizedType = ['base', 'add', 'inspire', 'multiply'].includes(row.type)
                ? row.type
                : (row.type === '鼓舞' ? 'inspire' : (row.type === '攻撃固定' ? 'add' : 'multiply'));
            const normalizedInspireMode = normalizedType === 'inspire'
                ? (row.inspireMode === 'ratio' || row.inspireMode === 'fixed'
                    ? row.inspireMode
                    : (Math.abs(Number(row.value)) <= 10 ? 'ratio' : 'fixed'))
                : undefined;
            return {
                id: row.id || generateSimpleDamageRowId(),
                label: row.label || '項目',
                type: normalizedType,
                value: Number(row.value) || 0,
                stage: normalizedType === 'multiply' && row.stage === 'post' ? 'post' : 'pre',
                disabled: !!row.disabled,
                presetKey: typeof row.presetKey === 'string' ? row.presetKey : '',
                condition: typeof row.condition === 'string' ? row.condition : '',
                applyInspireToSelf: normalizedType === 'inspire'
                    ? (typeof row.applyInspireToSelf === 'boolean' ? row.applyInspireToSelf : false)
                    : undefined,
                inspireMode: normalizedInspireMode
            };
        });
        return {
            id: profile.id ? Math.floor(profile.id) : generateSimpleProfileId(),
            name: profile.name || 'キャラ',
            rows: normalizedRows,
            enemyDefense: Number(profile.enemyDefense) || 0
        };
    });

    ensureSimpleDamageEditorCollapsedState();
}

function createDefaultSimpleDamageProfile() {
    const now = Date.now();
    return {
        id: now,
        name: 'キャラA',
        enemyDefense: 0,
        rows: [
            { id: now + 1, label: '基礎攻撃力（図鑑）', type: 'base', value: 1000, stage: 'pre', disabled: false, presetKey: 'base', condition: '' },
            { id: now + 2, label: '特技 固定値', type: 'add', value: 0, stage: 'pre', disabled: false, presetKey: 'fixed', condition: '' },
            { id: now + 3, label: '割合バフ', type: 'multiply', value: 1, stage: 'pre', disabled: false, presetKey: 'ratio', condition: '' },
            { id: now + 4, label: '特技 与えるダメージ', type: 'multiply', value: 1, stage: 'post', disabled: false, presetKey: 'give', condition: '' },
            { id: now + 5, label: '計略 与えるダメージ', type: 'multiply', value: 1, stage: 'post', disabled: false, presetKey: 'give', condition: '' },
            { id: now + 6, label: '与ダメージ', type: 'multiply', value: 1, stage: 'post', disabled: false, presetKey: 'yo', condition: '' },
            { id: now + 7, label: '被ダメージ', type: 'multiply', value: 1, stage: 'post', disabled: false, presetKey: 'hi', condition: '' },
            { id: now + 8, label: '効果重複', type: 'multiply', value: 1, stage: 'post', disabled: false, presetKey: 'ratioDup', condition: '' },
            { id: now + 9, label: '攻撃回数', type: 'multiply', value: 1, stage: 'post', disabled: false, presetKey: 'count', condition: '' }
        ]
    };
}

function generateSimpleDamageRowId() {
    simpleDamageRowIdCounter += 1;
    return Date.now() + simpleDamageRowIdCounter;
}

function getActiveSimpleDamageProfile() {
    return simpleDamageProfiles.find(profile => profile.id === simpleDamageActiveProfileId) || null;
}

function addSimpleDamageProfile() {
    const suffix = simpleDamageProfiles.length + 1;
    const newProfile = createDefaultSimpleDamageProfile();
    newProfile.id = generateSimpleProfileId();
    newProfile.name = `キャラ${suffix}`;
    simpleDamageProfiles.push(newProfile);
    simpleDamageActiveProfileId = newProfile.id;
    simpleDamageEditorCollapsedState[String(newProfile.id)] = true;
    saveSimpleDamageData();
    renderSimpleDamageTab();
}

function selectSimpleDamageProfile(profileId, options = {}) {
    simpleDamageActiveProfileId = profileId;
    if (profileId != null) {
        simpleDamageEditorCollapsedState[String(profileId)] = false;
    }
    renderSimpleDamageTab(() => {
        if (options.scroll) {
            scrollToSimpleDamageEditor(profileId);
        }
    });
}

function renameSimpleDamageProfile(profileId) {
    const profile = simpleDamageProfiles.find(p => p.id === profileId);
    if (!profile) return;
    const name = prompt('プロファイル名を入力してください', profile.name || '');
    if (name && name.trim()) {
        profile.name = name.trim();
        saveSimpleDamageData();
        renderSimpleDamageTab();
    }
}

function deleteSimpleDamageProfile(profileId) {
    if (!confirm('この計算セットを削除しますか？')) return;
    simpleDamageProfiles = simpleDamageProfiles.filter(p => p.id !== profileId);
    delete simpleDamageEditorCollapsedState[String(profileId)];
    if (simpleDamageProfiles.length === 0) {
        const profile = createDefaultSimpleDamageProfile();
        simpleDamageProfiles.push(profile);
        simpleDamageActiveProfileId = profile.id;
    } else if (simpleDamageActiveProfileId === profileId) {
        simpleDamageActiveProfileId = simpleDamageProfiles[0].id;
    }
    saveSimpleDamageData();
    renderSimpleDamageTab();
}

function copySimpleDamageProfile(profileId) {
    const source = simpleDamageProfiles.find(p => p.id === profileId);
    if (!source) return;
    const cloned = structuredClone(source);
    cloned.id = generateSimpleProfileId();
    cloned.name = `${source.name || 'キャラ'} (コピー)`;
    cloned.rows = (cloned.rows || []).map(row => ({
        ...row,
        id: generateSimpleDamageRowId()
    }));
    simpleDamageProfiles.push(cloned);
    simpleDamageActiveProfileId = cloned.id;
    simpleDamageEditorCollapsedState[String(cloned.id)] = true;
    saveSimpleDamageData();
    renderSimpleDamageTab();
}

function renderSimpleDamageTab(afterRenderCallback) {
    if (!simpleDamageActiveProfileId && simpleDamageProfiles.length > 0) {
        simpleDamageActiveProfileId = simpleDamageProfiles[0].id;
    }
    renderSimpleDamageProfilesSummary();
    ensureSimpleDamageEditorCollapsedState();
    const editorsContainer = document.getElementById('simpleDamageEditorsContainer');
    if (editorsContainer) {
        editorsContainer.innerHTML = '';
        if (simpleDamageProfiles.length === 0) {
            const emptyState = document.createElement('p');
            emptyState.style.color = '#666';
            emptyState.style.textAlign = 'center';
            emptyState.style.margin = '30px 0';
            emptyState.textContent = '計算セットを左上の「＋ セット追加」から作成してください。';
            editorsContainer.appendChild(emptyState);
        } else {
            simpleDamageProfiles.forEach(profile => {
                const editorWrapper = document.createElement('div');
                editorWrapper.className = 'simple-damage-editor';
                editorWrapper.id = `simpleDamageEditor-${profile.id}`;
                if (profile.id === simpleDamageActiveProfileId) {
                    editorWrapper.classList.add('active');
                }
                editorsContainer.appendChild(editorWrapper);
                renderSimpleDamageEditor(profile.id, editorWrapper);
            });
        }
    }

    syncSimpleDamageGlobalControls();

    if (typeof afterRenderCallback === 'function') {
        afterRenderCallback();
    }
}

function syncSimpleDamageGlobalControls() {
    const enemyInput = document.getElementById('globalEnemyDefenseInput');
    if (enemyInput) {
        enemyInput.value = simpleDamageEnemyDefense || 0;
    }
    const inspireSelfInput = document.getElementById('globalInspireSelfInput');
    if (inspireSelfInput) {
        inspireSelfInput.value = simpleDamageInspireSelf || 0;
    }
    const inspireOthersInput = document.getElementById('globalInspireOthersInput');
    if (inspireOthersInput) {
        inspireOthersInput.value = simpleDamageInspireOthers || 0;
    }
}

function formatInspireValueDisplay(value) {
    if (!Number.isFinite(Number(value))) return '0';
    const rounded = Math.round(Number(value) * 1000) / 1000;
    return rounded.toString();
}

function isSimpleDamageEditorCollapsed(profileId) {
    if (!profileId) return false;
    const key = String(profileId);
    return !!simpleDamageEditorCollapsedState[key];
}

function toggleSimpleDamageEditor(profileId) {
    if (!profileId) return;
    const key = String(profileId);
    simpleDamageEditorCollapsedState[key] = !simpleDamageEditorCollapsedState[key];
    renderSimpleDamageTab(() => {
        if (!simpleDamageEditorCollapsedState[key]) {
            scrollToSimpleDamageEditor(profileId);
        }
    });
}

function setAllSimpleDamageEditorsCollapsed(collapsed) {
    const target = !!collapsed;
    simpleDamageProfiles.forEach(profile => {
        if (!profile) return;
        simpleDamageEditorCollapsedState[String(profile.id)] = target;
    });
}

function ensureSimpleDamageEditorCollapsedState() {
    simpleDamageProfiles.forEach(profile => {
        if (!profile) return;
        const key = String(profile.id);
        if (!(key in simpleDamageEditorCollapsedState)) {
            simpleDamageEditorCollapsedState[key] = true;
        }
    });
}

function expandAllSimpleDamageEditors() {
    setAllSimpleDamageEditorsCollapsed(false);
    renderSimpleDamageTab();
}

function collapseAllSimpleDamageEditors() {
    setAllSimpleDamageEditorsCollapsed(true);
    renderSimpleDamageTab();
}

function applyNumericInputMode(rootElement) {
    const target = rootElement && typeof rootElement.querySelectorAll === 'function'
        ? rootElement
        : document;
    target.querySelectorAll('input[type="number"]').forEach(input => {
        input.setAttribute('inputmode', 'decimal');
    });
}

function renderSimpleDamageProfilesSummary() {
    const container = document.getElementById('simpleDamageProfiles');
    if (!container) return;

    if (simpleDamageProfiles.length === 0) {
        container.innerHTML = `
            <div style="flex: 1;">
                <p style="color: #666;">計算セットがありません。「セット追加」ボタンから作成してください。</p>
            </div>
            <div class="simple-damage-card" style="display:flex; align-items:center; justify-content:center;">
                <button class="btn" style="width:100%;" onclick="addSimpleDamageProfile()">＋ セット追加</button>
            </div>
        `;
        return;
    }

    const cards = simpleDamageProfiles.map(profile => {
        const result = calculateSimpleDamage(profile);
        const formatted = formatNumber(Math.round(result.total || 0));
        const active = profile.id === simpleDamageActiveProfileId ? 'active' : '';
        const inspireProvidedValue = Math.round(result.inspireProvided || 0);
        const inspireSelfDamageDelta = Math.round(result.globalSelfDamageDelta || (calculateGlobalSelfDamageDelta(profile) || 0));
        const inspireBadges = [];
        if (inspireProvidedValue > 0) {
            inspireBadges.push(`<span class="simple-damage-badge">味方 +${formatNumber(inspireProvidedValue)}</span>`);
        }
        inspireBadges.push(`<span class="simple-damage-badge simple-damage-badge-self">鼓舞ダメ +${formatNumber(inspireSelfDamageDelta)}</span>`);
        const inspireBadge = inspireBadges.length > 0
            ? `<div class="simple-damage-card-inspire">${inspireBadges.join(' ')}</div>`
            : '';
        return `
            <div class="simple-damage-card ${active}" draggable="true" ondragstart="startProfileDrag(event, ${profile.id})" ondragend="endProfileDrag(event)">
                <h3>${profile.name}</h3>
                <div class="result-value" id="simpleDamageCardResult-${profile.id}">${formatted}</div>
                ${inspireBadge}
                <div class="simple-damage-card-actions">
                    <button class="btn" onclick="selectSimpleDamageProfile(${profile.id}, { scroll: true })">編集</button>
                    <button class="btn" onclick="renameSimpleDamageProfile(${profile.id})">名称変更</button>
                    <button class="btn" onclick="copySimpleDamageProfile(${profile.id})">複製</button>
                    <button class="btn delete-btn" onclick="deleteSimpleDamageProfile(${profile.id})">削除</button>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = cards + `
        <div class="simple-damage-card" style="display: flex; align-items: center; justify-content: center;">
            <button class="btn" style="width: 100%;" onclick="addSimpleDamageProfile()">＋ セット追加</button>
        </div>
    `;
}

function renderSimpleDamageEditor(profileId = null, containerOverride = null) {
    const container = containerOverride || document.getElementById('simpleDamageEditor');
    if (!container) return;
    const profile = profileId ? simpleDamageProfiles.find(p => p.id === profileId) : getActiveSimpleDamageProfile();

    if (!profile) {
        container.innerHTML = '<p style="color: #666;">左のカードから編集するセットを選択してください。</p>';
        return;
    }

    const collapsed = isSimpleDamageEditorCollapsed(profile.id);
    const result = calculateSimpleDamage(profile);
    let rowsHtml = '';
    if (!collapsed) {
        rowsHtml = (profile.rows || []).map((row) => {
            const disabledClass = row.disabled ? 'simple-damage-row disabled' : 'simple-damage-row';
            const typeSelect = `
                <select class="simple-damage-inline-select" onchange="updateSimpleRowField(${profile.id}, ${row.id}, 'type', this.value)">
                    <option value="base" ${row.type === 'base' ? 'selected' : ''}>基礎値</option>
                    <option value="multiply" ${row.type === 'multiply' ? 'selected' : ''}>乗算</option>
                    <option value="add" ${row.type === 'add' ? 'selected' : ''}>攻撃固定値</option>
                    <option value="inspire" ${row.type === 'inspire' ? 'selected' : ''}>鼓舞</option>
                </select>`;
            const stageSelect = row.type === 'multiply' && shouldShowStageSelect(row)
                ? `<select class="simple-damage-inline-select" onchange="updateSimpleRowField(${profile.id}, ${row.id}, 'stage', this.value)">
                        <option value="pre" ${row.stage !== 'post' ? 'selected' : ''}>通常</option>
                        <option value="post" ${row.stage === 'post' ? 'selected' : ''}>割合重複</option>
                   </select>`
                : '';
            const valueStep = row.type === 'multiply' ? '0.01' : '1';
            const valueInput = `<input type="number" step="${valueStep}" class="simple-damage-inline-input" value="${row.value}" onchange="updateSimpleRowField(${profile.id}, ${row.id}, 'value', this.value)">`;
            const presetSelect = `<select class="simple-damage-inline-select" onchange="applySimpleRowPreset(${profile.id}, ${row.id}, this.value)">
                    <option value="">カスタム</option>
                    ${SIMPLE_ROW_PRESETS.map(preset => `<option value="${preset.key}" ${row.presetKey === preset.key ? 'selected' : ''}>${preset.label}</option>`).join('')}
                </select>`;
            const inspireToggle = row.type === 'inspire'
                ? `<label class="simple-inline-checkbox">
                        <input type="checkbox" ${row.applyInspireToSelf ? 'checked' : ''} onchange="updateSimpleRowField(${profile.id}, ${row.id}, 'applyInspireToSelf', this.checked)">
                        自身に適用
                   </label>`
                : '';
            const inspireModeSelect = row.type === 'inspire'
                ? `<select class="simple-damage-inline-select" onchange="updateSimpleRowField(${profile.id}, ${row.id}, 'inspireMode', this.value)">
                        <option value="fixed" ${row.inspireMode !== 'ratio' ? 'selected' : ''}>固定値</option>
                        <option value="ratio" ${row.inspireMode === 'ratio' ? 'selected' : ''}>割合</option>
                   </select>`
                : '';
            const labelInput = row.presetKey
                ? ''
                : `<input type="text" class="simple-damage-inline-input simple-row-label-input" data-profile-id="${profile.id}" data-row-id="${row.id}" data-field="label" value="${escapeHtml(row.label || '')}" oninput="updateSimpleRowField(${profile.id}, ${row.id}, 'label', this.value)">`;
            const conditionInput = `<input type="text" class="simple-damage-inline-input simple-row-condition-input" placeholder="条件/メモ (例: HP50%以下)" value="${escapeHtml(row.condition || '')}" oninput="updateSimpleRowField(${profile.id}, ${row.id}, 'condition', this.value)">`;
            return `
                <tr class="${disabledClass}" ondragover="handleSimpleRowDragOver(event)" ondrop="handleSimpleRowDrop(event, ${profile.id}, ${row.id})">
                    <td>
                        ${presetSelect}
                        ${labelInput}
                        ${conditionInput}
                        <div class="simple-damage-inline-meta">
                            ${typeSelect}
                            ${stageSelect}
                            ${inspireToggle}
                            ${inspireModeSelect}
                        </div>
                    </td>
                    <td>${valueInput}</td>
                    <td>
                        <div class="simple-damage-tools">
                            <button type="button" class="btn drag-handle" draggable="true" title="ドラッグで並び替え" ondragstart="startSimpleRowDrag(event, ${profile.id}, ${row.id})" ondragend="endSimpleRowDrag(event)">↕</button>
                            <button type="button" class="btn" title="有効/無効" onclick="toggleSimpleRow(${profile.id}, ${row.id})">${row.disabled ? '✅' : '🚫'}</button>
                            <button type="button" class="btn delete-btn" title="削除" onclick="deleteSimpleRow(${profile.id}, ${row.id})">🗑</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    const toggleIcon = collapsed ? '▸' : '▾';
    const toggleAriaLabel = collapsed ? `${profile.name}の計算行を展開` : `${profile.name}の計算行を折りたたみ`;
    const addRowAriaLabel = `${profile.name}に行を追加`;
    const resultHtml = buildSimpleDamageResultHTML(profile, result);
    const bodyHtml = collapsed ? '' : `
        <div class="simple-damage-editor-body">
            <table class="simple-damage-table">
                <thead>
                    <tr>
                        <th>項目 / 種別</th>
                        <th>数値</th>
                        <th>編集ツール</th>
                    </tr>
                </thead>
                <tbody ondragover="handleSimpleRowDragOver(event)" ondrop="handleSimpleRowDropEnd(event, ${profile.id})">
                    ${rowsHtml || '<tr><td colspan="3" style="text-align:center; padding:20px; color:#666;">行がありません。「行を追加」から追加してください。</td></tr>'}
                </tbody>
            </table>
            <p style="font-size: 12px; color: #666; margin-top: 5px;">※ 乗算の「通常」は鼓舞を含まない乗算、「割合重複」は鼓舞加算後の値も乗算に含みます。</p>
        </div>
    `;

    if (collapsed) {
        container.classList.add('collapsed');
    } else {
        container.classList.remove('collapsed');
    }

    const globalInspireSummary = `
        <div class="simple-damage-global-summary">
            <span>受け取る鼓舞(固定値): ${formatInspireValueDisplay(simpleDamageInspireSelf)}</span>
            <span>味方へ配る鼓舞(固定値): ${formatInspireValueDisplay(simpleDamageInspireOthers)}</span>
        </div>
    `;

    container.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-bottom: 10px;">
            <div>
                <h3 style="margin: 0;">${profile.name}</h3>
            </div>
            <div class="simple-damage-header-actions">
                <button class="simple-damage-icon-button" type="button" onclick="toggleSimpleDamageEditor(${profile.id})" aria-label="${toggleAriaLabel}" title="${toggleAriaLabel}">${toggleIcon}</button>
                <button class="simple-damage-icon-button" type="button" onclick="addSimpleRow(${profile.id})" aria-label="${addRowAriaLabel}" title="${addRowAriaLabel}">＋</button>
            </div>
        </div>
        ${globalInspireSummary}
        <div id="simpleDamageResult-${profile.id}">
            ${resultHtml}
        </div>
        ${bodyHtml}
    `;

    applyNumericInputMode(container);
}

function buildSimpleDamageResultHTML(profile, result) {
    const totalDisplay = formatNumber(Math.round(result.total || 0));
    const inspireProvided = Math.round(result.inspireProvided || 0);
    const inspireSelfDamageDelta = Math.round(result.globalSelfDamageDelta || (calculateGlobalSelfDamageDelta(profile) || 0));
    const badges = [];
    if (inspireProvided > 0) {
        badges.push(`<span class="simple-damage-badge">味方 +${formatNumber(inspireProvided)}</span>`);
    }
    badges.push(`<span class="simple-damage-badge simple-damage-badge-self">鼓舞ダメ +${formatNumber(inspireSelfDamageDelta)}</span>`);
    const inspireInfo = badges.length > 0
        ? `<div class="simple-damage-inspire-info">${badges.join(' ')}</div>`
        : '';
    return `
        <div class="simple-damage-result-bar">${totalDisplay} ダメージ</div>
        ${inspireInfo}
    `;
}

function calculateGlobalSelfDamageDelta(profile) {
    const current = calculateSimpleDamageInternal(profile, { excludeGlobalSelfInspire: false });
    const baseline = calculateSimpleDamageInternal(profile, { excludeGlobalSelfInspire: true });
    return (current.total || 0) - (baseline.total || 0);
}

function updateSimpleDamageResultView(profile, result) {
    const container = document.getElementById(`simpleDamageResult-${profile.id}`);
    if (container) {
        container.innerHTML = buildSimpleDamageResultHTML(profile, result);
    }
}

function updateSimpleDamageSummaryValue(profile, result) {
    const el = document.getElementById(`simpleDamageCardResult-${profile.id}`);
    if (el) {
        el.textContent = formatNumber(Math.round(result.total || 0));
    }
}

function addSimpleRow(profileId) {
    const profile = simpleDamageProfiles.find(p => p.id === profileId);
    if (!profile) return;
    const newRow = {
        id: generateSimpleDamageRowId(),
        label: '新規項目',
        type: 'multiply',
        value: 1,
        stage: 'pre',
        disabled: false,
        condition: ''
    };
    profile.rows.push(newRow);
    saveSimpleDamageData();
    renderSimpleDamageTab(() => focusSimpleRowLabel(profileId, newRow.id));
}

function updateSimpleRowField(profileId, rowId, field, value) {
    const profile = simpleDamageProfiles.find(p => p.id === profileId);
    if (!profile) return;
    const row = profile.rows.find(r => r.id === rowId);
    if (!row) return;

    let shouldRerender = true;

    if (field === 'label') {
        row.label = value == null ? '' : value;
        row.presetKey = '';
        normalizeSimpleRowStage(row);
        shouldRerender = false;
    } else if (field === 'type') {
        row.type = value;
        if (value !== 'multiply') {
            row.stage = 'pre';
        }
        if (value === 'inspire') {
            row.applyInspireToSelf = !!row.applyInspireToSelf;
            row.inspireMode = row.inspireMode === 'ratio' ? 'ratio' : 'fixed';
        } else {
            delete row.applyInspireToSelf;
            delete row.inspireMode;
        }
        normalizeSimpleRowStage(row);
    } else if (field === 'value') {
        let parsed = parseFloat(value);
        if (Number.isNaN(parsed)) {
            parsed = row.type === 'multiply' ? 1 : 0;
        }
        row.value = parsed;
    } else if (field === 'stage') {
        row.stage = value === 'post' ? 'post' : 'pre';
    } else if (field === 'applyInspireToSelf') {
        row.applyInspireToSelf = !!value;
        shouldRerender = true;
    } else if (field === 'inspireMode') {
        const normalizedMode = value === 'ratio' ? 'ratio' : 'fixed';
        row.inspireMode = normalizedMode;
        shouldRerender = true;
    } else if (field === 'condition') {
        row.condition = value || '';
        shouldRerender = false;
    }

    saveSimpleDamageData();
    if (shouldRerender) {
        renderSimpleDamageTab();
    }
}

function applySimpleRowPreset(profileId, rowId, presetKey) {
    const profile = simpleDamageProfiles.find(p => p.id === profileId);
    if (!profile) return;
    const row = profile.rows.find(r => r.id === rowId);
    if (!row) return;
    const preset = SIMPLE_ROW_PRESETS.find(p => p.key === presetKey);
    if (!preset) {
        row.presetKey = '';
        renderSimpleDamageTab();
        return;
    }
    row.presetKey = preset.key;
    row.label = preset.label;
    row.type = preset.type;
    row.value = preset.value;
    row.stage = preset.stage || 'pre';
    row.condition = '';
    if (preset.type === 'inspire') {
        row.applyInspireToSelf = false;
        row.inspireMode = 'fixed';
    } else {
        delete row.applyInspireToSelf;
        delete row.inspireMode;
    }
    normalizeSimpleRowStage(row);
    saveSimpleDamageData();
    renderSimpleDamageTab();
}

function focusSimpleRowLabel(profileId, rowId) {
    const selector = `.simple-row-label-input[data-profile-id="${profileId}"][data-row-id="${rowId}"]`;
    const input = document.querySelector(selector);
    if (input) {
        input.focus();
        input.select();
    }
}

function handleGlobalEnemyDefenseInput(event) {
    const caretPos = event?.target?.selectionStart ?? null;
    updateSimpleDamageEnemyDefense(event.target.value, caretPos);
}

function updateSimpleDamageEnemyDefense(value, caretPos = null) {
    const parsed = parseFloat(value);
    simpleDamageEnemyDefense = Number.isFinite(parsed) ? parsed : 0;
    simpleDamageProfiles.forEach(profile => {
        profile.enemyDefense = simpleDamageEnemyDefense;
    });
    saveSimpleDamageSettings();
    saveSimpleDamageData();
    renderSimpleDamageTab(() => focusGlobalEnemyDefenseInput(caretPos));
}

function focusGlobalEnemyDefenseInput(caretPos = null) {
    const input = document.getElementById('globalEnemyDefenseInput');
    if (!input) return;
    const length = input.value.length;
    const pos = caretPos === null ? length : Math.max(0, Math.min(caretPos, length));
    input.focus();
    input.setSelectionRange(pos, pos);
}

function handleGlobalInspireInput(type, event) {
    const caretPos = event?.target?.selectionStart ?? null;
    updateSimpleDamageGlobalInspire(type, event.target.value, caretPos);
}

function updateSimpleDamageGlobalInspire(type, value, caretPos = null) {
    const parsed = parseFloat(value);
    const safeValue = Number.isFinite(parsed) ? parsed : 0;
    if (type === 'self') {
        simpleDamageInspireSelf = safeValue;
    } else {
        simpleDamageInspireOthers = safeValue;
    }
    saveSimpleDamageSettings();
    renderSimpleDamageTab(() => focusGlobalInspireInput(type, caretPos));
}

function focusGlobalInspireInput(type, caretPos = null) {
    const inputId = type === 'self' ? 'globalInspireSelfInput' : 'globalInspireOthersInput';
    const input = document.getElementById(inputId);
    if (!input) return;
    const length = input.value.length;
    const pos = caretPos === null ? length : Math.max(0, Math.min(caretPos, length));
    input.focus();
    input.setSelectionRange(pos, pos);
}

function scrollToSimpleDamageEditor(profileId) {
    const editor = document.getElementById(`simpleDamageEditor-${profileId}`);
    if (!editor) return;
    editor.scrollIntoView({ behavior: 'smooth', block: 'start' });
    editor.classList.add('highlight');
    setTimeout(() => editor.classList.remove('highlight'), 1200);
}

function isSpecialMultiplierRow(row) {
    if (!row || row.type !== 'multiply') return false;
    const label = row.label || '';
    return Object.values(SIMPLE_DAMAGE_SPECIAL_MULTIPLIER_REGEX).some(regex => regex.test(label));
}

function shouldShowStageSelect(row) {
    return row.type === 'multiply' && !isSpecialMultiplierRow(row);
}

function normalizeSimpleRowStage(row) {
    if (!row) return;
    if (row.type !== 'multiply') {
        row.stage = 'pre';
        return;
    }
    if (isSpecialMultiplierRow(row)) {
        row.stage = 'post';
    }
}

function startSimpleRowDrag(event, profileId, rowId) {
    event.stopPropagation();
    simpleRowDragState = { profileId, rowId };
    if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', String(rowId));
    }
    const rowElement = event.target.closest('tr');
    if (rowElement) {
        rowElement.classList.add('dragging');
    }
}

function endSimpleRowDrag(event) {
    if (event) {
        const rowElement = event.target.closest('tr');
        if (rowElement) {
            rowElement.classList.remove('dragging');
        }
    }
    clearSimpleRowDragState();
}

function handleSimpleRowDragOver(event) {
    if (!simpleRowDragState.rowId) return;
    event.preventDefault();
    if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'move';
    }
}

function startProfileDrag(event, profileId) {
    simpleProfileDragState = { profileId };
    if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', String(profileId));
    }
    const card = event.target.closest('.simple-damage-card');
    if (card) {
        card.classList.add('dragging');
    }
}

function endProfileDrag(event) {
    const card = event?.target?.closest('.simple-damage-card');
    if (card) {
        card.classList.remove('dragging');
    }
    simpleProfileDragState = { profileId: null };
}

function handleProfileDragOver(event) {
    if (!simpleProfileDragState.profileId) return;
    event.preventDefault();
    if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'move';
    }
}

function handleProfileDrop(event) {
    event.preventDefault();
    const sourceId = simpleProfileDragState.profileId;
    if (!sourceId) return;
    const container = document.getElementById('simpleDamageProfiles');
    if (!container) return;

    let targetCard = event.target.closest('.simple-damage-card');
    if (!targetCard || !container.contains(targetCard)) {
        simpleProfileDragState = { profileId: null };
        renderSimpleDamageTab();
        return;
    }

    const profile = simpleDamageProfiles.find(p => p.id === sourceId);
    if (!profile) {
        simpleProfileDragState = { profileId: null };
        return;
    }

    const sourceIndex = simpleDamageProfiles.findIndex(p => p.id === sourceId);
    const children = Array.from(container.children).filter(child => child.classList.contains('simple-damage-card'));
    const targetIndex = children.indexOf(targetCard);
    if (sourceIndex === -1 || targetIndex === -1) {
        simpleProfileDragState = { profileId: null };
        return;
    }

    const [movedProfile] = simpleDamageProfiles.splice(sourceIndex, 1);
    simpleDamageProfiles.splice(targetIndex, 0, movedProfile);
    saveSimpleDamageData();
    simpleProfileDragState = { profileId: null };
    renderSimpleDamageTab();
}

function handleSimpleRowDrop(event, profileId, targetRowId) {
    event.preventDefault();
    event.stopPropagation();
    const source = simpleRowDragState;
    if (!source.rowId || source.profileId !== profileId || source.rowId === targetRowId) {
        clearSimpleRowDragState();
        return;
    }
    const profile = simpleDamageProfiles.find(p => p.id === profileId);
    if (!profile) {
        clearSimpleRowDragState();
        return;
    }
    const sourceIndex = profile.rows.findIndex(r => r.id === source.rowId);
    const targetIndex = profile.rows.findIndex(r => r.id === targetRowId);
    if (sourceIndex === -1 || targetIndex === -1) {
        clearSimpleRowDragState();
        return;
    }
    const [row] = profile.rows.splice(sourceIndex, 1);
    const insertIndex = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
    profile.rows.splice(Math.max(insertIndex, 0), 0, row);
    saveSimpleDamageData();
    renderSimpleDamageTab();
    clearSimpleRowDragState();
}

function handleSimpleRowDropEnd(event, profileId) {
    event.preventDefault();
    const source = simpleRowDragState;
    if (!source.rowId || source.profileId !== profileId) {
        clearSimpleRowDragState();
        return;
    }
    const profile = simpleDamageProfiles.find(p => p.id === profileId);
    if (!profile) {
        clearSimpleRowDragState();
        return;
    }
    const sourceIndex = profile.rows.findIndex(r => r.id === source.rowId);
    if (sourceIndex === -1) {
        clearSimpleRowDragState();
        return;
    }
    const [row] = profile.rows.splice(sourceIndex, 1);
    profile.rows.push(row);
    saveSimpleDamageData();
    renderSimpleDamageTab();
    clearSimpleRowDragState();
}

function clearSimpleRowDragState() {
    document.querySelectorAll('.simple-damage-row.dragging').forEach(el => el.classList.remove('dragging'));
    simpleRowDragState = { profileId: null, rowId: null };
}

function calculateSimpleDamage(profile) {
    const result = calculateSimpleDamageInternal(profile, { excludeGlobalSelfInspire: false });
    const baseline = calculateSimpleDamageInternal(profile, { excludeGlobalSelfInspire: true });
    result.globalSelfDamageDelta = (result.total || 0) - (baseline.total || 0);
    return result;
}

function calculateSimpleDamageInternal(profile, options = {}) {
    if (!profile) {
        return { total: 0, base: 0, add: 0, inspire: 0, inspireProvided: 0 };
    }
    const rows = profile.rows || [];
    let baseValue = 0;
    let attackAddTotal = 0;
    const excludeGlobalSelfInspire = !!options.excludeGlobalSelfInspire;
    let selfFixedInspire = excludeGlobalSelfInspire ? 0 : (Number(simpleDamageInspireSelf) || 0);
    let providedFixedInspire = Number(simpleDamageInspireOthers) || 0;
    let selfRatioInspireTotal = 0;
    let providedRatioInspireTotal = 0;
    const attackRatioMultipliers = [];
    const ratioMultipliers = [];
    const duplicationMultipliers = [];
    const giveDamageMultipliers = [];
    const yoDamageMultipliers = [];
    const hiDamageMultipliers = [];
    const attackCountMultipliers = [];

    const multiplyValues = (list) => list.reduce((acc, val) => acc * val, 1);

    rows.forEach(row => {
        if (row.disabled) return;
        const value = Number(row.value);
        if (!Number.isFinite(value)) return;
        switch (row.type) {
            case 'base':
                baseValue = value;
                break;
            case 'add':
                attackAddTotal += value;
                break;
            case 'inspire':
                if (row.inspireMode === 'ratio') {
                    if (row.applyInspireToSelf) {
                        selfRatioInspireTotal += value;
                    } else {
                        providedRatioInspireTotal += value;
                    }
                } else {
                    if (row.applyInspireToSelf) {
                        selfFixedInspire += value;
                    } else {
                        providedFixedInspire += value;
                    }
                }
                break;
            case 'multiply': {
                const label = row.label || '';
                const isDuplication = row.presetKey === 'ratioDup' || /効果重複/.test(label);
                if (SIMPLE_DAMAGE_SPECIAL_MULTIPLIER_REGEX.give.test(label)) {
                    giveDamageMultipliers.push(value);
                } else if (SIMPLE_DAMAGE_SPECIAL_MULTIPLIER_REGEX.yo.test(label)) {
                    yoDamageMultipliers.push(value);
                } else if (SIMPLE_DAMAGE_SPECIAL_MULTIPLIER_REGEX.hi.test(label)) {
                    hiDamageMultipliers.push(value);
                } else if (SIMPLE_DAMAGE_SPECIAL_MULTIPLIER_REGEX.count.test(label)) {
                    attackCountMultipliers.push(value);
                } else if (row.stage === 'post') {
                    ratioMultipliers.push(value);
                    if (isDuplication) {
                        duplicationMultipliers.push(value);
                    }
                } else {
                    attackRatioMultipliers.push(value);
                }
                break;
            }
            default:
                break;
        }
    });

    const attackRatioProduct = multiplyValues(attackRatioMultipliers);
    const ratioDupProduct = multiplyValues(ratioMultipliers || []);
    const duplicationProduct = duplicationMultipliers.length ? multiplyValues(duplicationMultipliers) : 1;
    const giveDamageProduct = multiplyValues(giveDamageMultipliers || []);
    const yoDamageProduct = multiplyValues(yoDamageMultipliers || []);
    const hiDamageProduct = multiplyValues(hiDamageMultipliers || []);
    const attackCountProduct = multiplyValues(attackCountMultipliers || []);

    const attackBaseBeforeSelfInspire = baseValue * attackRatioProduct + attackAddTotal;
    const selfRatioContribution = attackBaseBeforeSelfInspire * selfRatioInspireTotal;
    const duplicationIncrease = duplicationProduct > 1
        ? selfFixedInspire * (duplicationProduct - 1)
        : 0;
    const effectiveSelfFixedInspire = selfFixedInspire + duplicationIncrease;
    const attackValueBeforePostMultipliers = (attackBaseBeforeSelfInspire + effectiveSelfFixedInspire + selfRatioContribution) * ratioDupProduct;
    const providedRatioBase = (attackBaseBeforeSelfInspire + duplicationIncrease + selfRatioContribution) * ratioDupProduct;
    const attackValue = attackValueBeforePostMultipliers;

    const afterGiveDamage = attackValue * giveDamageProduct;
    const enemyDefense = Number(simpleDamageEnemyDefense) || 0;
    const damageAfterDefense = Math.max(afterGiveDamage - enemyDefense, 0);

    let total = damageAfterDefense;
    total *= yoDamageProduct;
    total *= hiDamageProduct;
    total *= attackCountProduct;

    const providedFixedEffective = providedFixedInspire;
    const providedRatioContribution = providedRatioBase * providedRatioInspireTotal;
    const providedInspireValue = providedFixedEffective + providedRatioContribution;
    const inspireSelfTotal = effectiveSelfFixedInspire + selfRatioContribution;

    return {
        total,
        base: baseValue,
        add: attackAddTotal,
        inspire: inspireSelfTotal,
        inspireProvided: providedInspireValue,
        attackRatioMultipliers,
        ratioMultipliers,
        giveDamageMultipliers,
        yoDamageMultipliers,
        hiDamageMultipliers,
        attackCountMultipliers
    };
}

function renderSimpleDamageComparison() {
    const container = document.getElementById('simpleDamageComparison');
    if (!container) return;

    if (simpleDamageProfiles.length === 0) {
        container.innerHTML = '';
        return;
    }

    const rows = simpleDamageProfiles
        .map(profile => ({
            name: profile.name,
            total: Math.round(calculateSimpleDamage(profile).total || 0)
        }))
        .sort((a, b) => b.total - a.total);

    const rowsHtml = rows.map((row, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>${row.name}</td>
            <td>${formatNumber(row.total)}</td>
        </tr>
    `).join('');

    container.innerHTML = `
        <h3>結果比較</h3>
        <table>
            <thead>
                <tr><th>#</th><th>セット名</th><th>ダメージ</th></tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
        </table>
    `;
}

function toggleSimpleRow(profileId, rowId) {
    const profile = simpleDamageProfiles.find(p => p.id === profileId);
    if (!profile) return;
    const row = profile.rows.find(r => r.id === rowId);
    if (!row) return;
    row.disabled = !row.disabled;
    saveSimpleDamageData();
    renderSimpleDamageTab();
}

function deleteSimpleRow(profileId, rowId) {
    const profile = simpleDamageProfiles.find(p => p.id === profileId);
    if (!profile) return;
    profile.rows = profile.rows.filter(r => r.id !== rowId);
    saveSimpleDamageData();
    renderSimpleDamageTab();
}

// 既存ダメージ計算（β）関連
const DAMAGE_SOURCE_LABELS = {
    skill: '特技',
    formation: '編成特技',
    strategy: '計略'
};
const DAMAGE_ATTRIBUTE_KEYWORDS = ['水', '平', '山', '平山', '地獄', '無属性'];

function updateDamageCharacterSearch(value = '') {
    damageCharacterSearchTerm = (value || '').trim();
    renderDamageCharacterList();
}

function renderDamageCharacterList() {
    const container = document.getElementById('damageCharacterList');
    if (!container) return;

    const allCharacters = characters || [];
    const hasSelected = allCharacters.some(c => c && c.id === selectedDamageCharacterId);
    if (!hasSelected && selectedDamageCharacterId !== null) {
        selectedDamageCharacterId = null;
        damageConditionToggles = {};
        renderSelectedDamageCharacter();
        calculateDamage();
    }

    container.innerHTML = '';

    if (allCharacters.length === 0) {
        container.innerHTML = '<p style="color: #777; font-size: 14px;">キャラクターが登録されていません</p>';
        return;
    }

    const searchTerm = damageCharacterSearchTerm.trim().toLowerCase();
    const filtered = allCharacters
        .slice()
        .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ja'))
        .filter(char => {
            if (!searchTerm) return true;
            const target = [
                char.name || '',
                char.period || '',
                char.weapon || '',
                char.weaponRange || '',
                char.weaponType || '',
                (char.attributes || []).join(' ')
            ].join(' ').toLowerCase();
            return target.includes(searchTerm);
        });

    if (filtered.length === 0) {
        container.innerHTML = '<p style="color: #777; font-size: 14px;">該当するキャラクターが見つかりません</p>';
        return;
    }

    filtered.forEach(char => {
        const card = document.createElement('div');
        const isSelected = char.id === selectedDamageCharacterId;
        card.style.padding = '10px';
        card.style.borderRadius = '8px';
        card.style.border = isSelected ? '2px solid #3498db' : '1px solid #dcdcdc';
        card.style.background = isSelected ? '#e7f3ff' : '#fff';
        card.style.cursor = 'pointer';
        card.style.transition = 'border-color 0.2s';
        const weaponInfo = `${char.weapon || ''}${char.weaponRange ? ` (${char.weaponRange}${char.weaponType ? '/' + char.weaponType : ''})` : ''}`;
        const attrInfo = char.attributes && char.attributes.length ? ` | ${char.attributes.join('・')}` : '';
        card.innerHTML = `
            <div style="font-weight: bold;">${char.period ? `[${char.period}] ` : ''}${char.name || '名称不明'}</div>
            <div style="font-size: 12px; color: #555;">${weaponInfo}${attrInfo}</div>
        `;
        card.onclick = () => selectDamageCharacter(char.id);
        container.appendChild(card);
    });
}

function selectDamageCharacter(charId) {
    if (selectedDamageCharacterId !== charId) {
        damageConditionToggles = {};
    }
    selectedDamageCharacterId = charId;
    renderDamageCharacterList();
    renderSelectedDamageCharacter();
    calculateDamage();
}

function renderSelectedDamageCharacter() {
    const container = document.getElementById('selectedCharacterForDamage');
    if (!container) return;

    if (!selectedDamageCharacterId) {
        container.innerHTML = '<p style="color: #666; text-align: center;">キャラクターを選択してください</p>';
        return;
    }

    const char = characters.find(c => c.id === selectedDamageCharacterId);
    if (!char) {
        container.innerHTML = '<p style="color: #c0392b; text-align: center;">キャラクターデータが見つかりません</p>';
        return;
    }

    const buildBuffList = (label, buffs) => {
        const list = (buffs || []).map(buff => `<li>${escapeHtml(buff)}</li>`).join('');
        return `
            <div style="margin-top: 10px;">
                <strong>${label}</strong>
                <ul style="margin: 5px 0 0 18px; padding: 0;">${list || '<li style="color: #999;">なし</li>'}</ul>
            </div>
        `;
    };

    container.innerHTML = `
        <div>
            <div style="font-weight: bold; font-size: 18px; margin-bottom: 5px;">${char.period ? `[${char.period}] ` : ''}${char.name}</div>
            <div style="color: #555; font-size: 13px;">
                ${char.weapon || ''}${char.weaponRange ? ` (${char.weaponRange}${char.weaponType ? '/' + char.weaponType : ''})` : ''}
                ${char.attributes && char.attributes.length ? ` | ${char.attributes.join('・')}` : ''}
            </div>
            ${buildBuffList('特技', char.skills)}
            ${buildBuffList('編成特技', char.formationSkills)}
            ${buildBuffList('計略', char.strategies)}
        </div>
    `;
}

function doesBuffApplyToCharacter(parsed, character) {
    if (!parsed) return true;
    const targetText = parsed.target || '';
    if (!targetText) return true;

    if (/殿/.test(targetText) || /伏兵/.test(targetText)) {
        return false;
    }

    const attrs = character.attributes || [];
    const requiredAttrs = DAMAGE_ATTRIBUTE_KEYWORDS.filter(attr => targetText.includes(attr));
    if (requiredAttrs.length > 0) {
        return requiredAttrs.some(attr => attrs.includes(attr));
    }

    return true;
}

function classifyDamageBuffCondition(parsed, buffText, sourceType) {
    const raw = (parsed && parsed.condition ? parsed.condition : '').trim().replace(/^条件[:：]?/, '');
    const normalized = raw.replace(/\s+/g, '');

    if (sourceType === 'strategy') {
        return { type: 'strategy', label: raw || '計略発動中' };
    }

    if (!raw) {
        return { type: 'always', label: '' };
    }

    if (/計略/.test(normalized)) {
        return { type: 'strategy', label: raw };
    }

    const hpCondition = parseHpCondition(normalized, raw);
    if (hpCondition) {
        return hpCondition;
    }

    return { type: 'manual', label: raw || '条件' };
}

function parseHpCondition(normalized, rawText) {
    if (!/(耐久|HP)/.test(normalized)) {
        return null;
    }

    const isEnemy = /敵/.test(normalized);
    const thresholdMatch = normalized.match(/(\d+)[％%]?/);
    const threshold = thresholdMatch ? parseInt(thresholdMatch[1], 10) : null;
    const isAbove = /(以上|超|より上)/.test(normalized);
    const isBelow = /(以下|未満|より下)/.test(normalized);

    if (threshold === null || (!isAbove && !isBelow)) {
        return { type: 'manual', label: rawText };
    }

    const typeKey = `${isEnemy ? 'enemy' : 'ally'}Hp${isAbove ? 'Above' : 'Below'}`;
    return { type: typeKey, threshold, label: rawText };
}

function evaluateDamageBuffCondition(conditionInfo, context, conditionId) {
    switch (conditionInfo.type) {
        case 'always':
            return true;
        case 'strategy':
            return !!context.strategyActive;
        case 'enemyHpBelow':
            return context.enemyHpPercent <= conditionInfo.threshold;
        case 'enemyHpAbove':
            return context.enemyHpPercent >= conditionInfo.threshold;
        case 'allyHpBelow':
            return context.allyHpPercent <= conditionInfo.threshold;
        case 'allyHpAbove':
            return context.allyHpPercent >= conditionInfo.threshold;
        case 'manual':
        default:
            if (!(conditionId in damageConditionToggles)) {
                damageConditionToggles[conditionId] = false;
            }
            return !!damageConditionToggles[conditionId];
    }
}

function collectDamageBuffEffects(character, context) {
    const stats = {
        attackFlat: 0,
        attackFlatDetails: [],
        attackPercent: 0,
        attackPercentDetails: [],
        attackMultipliers: [],
        attackMultiplierDetails: [],
        damagePercent: 0,
        damagePercentDetails: [],
        damageMultipliers: [],
        damageMultiplierDetails: [],
        enemyDefenseDebuffFlat: 0,
        enemyDefenseDebuffFlatDetails: [],
        enemyDefenseDebuffPercent: 0,
        enemyDefenseDebuffPercentDetails: [],
        ignoreDefense: false,
        ignoreDefenseDetails: [],
        receivedDamagePercent: 0,
        receivedDamagePercentDetails: [],
        receivedDamageMultipliers: [],
        receivedDamageMultiplierDetails: []
    };

    const manualConditions = [];
    const sources = [
        { list: character.skills || [], type: 'skill' },
        { list: character.formationSkills || [], type: 'formation' },
        { list: character.strategies || [], type: 'strategy' }
    ];

    sources.forEach(source => {
        source.list.forEach((buffText, index) => {
            if (!buffText) return;
            const parsed = parseBuff(buffText);
            if (!parsed) return;
            if (!doesBuffApplyToCharacter(parsed, character)) return;

            const conditionInfo = classifyDamageBuffCondition(parsed, buffText, source.type);
            const conditionId = `${source.type}-${index}-${buffText}`;
            const applies = evaluateDamageBuffCondition(conditionInfo, context, conditionId);

            if (conditionInfo.type === 'manual') {
                manualConditions.push({
                    id: conditionId,
                    effect: `${DAMAGE_SOURCE_LABELS[source.type] || '効果'}: ${buffText}`,
                    label: conditionInfo.label || parsed.condition || '条件',
                    applied: applies
                });
            }

            if (!applies) return;
            applyBuffEffect(stats, parsed, buffText, source.type);
        });
    });

    return { stats, manualConditions };
}

function parseNumericValue(value) {
    if (typeof value === 'number') {
        return value;
    }
    if (typeof value !== 'string') {
        return 0;
    }
    const normalized = value.replace(/[＋]/g, '+').replace(/[－]/g, '-').replace(/[^0-9.+-]/g, '');
    const parsed = parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
}

function getSignedNumericValue(parsed, buffText) {
    let numeric = parseNumericValue(parsed.value);
    if (parsed.unit === '-%' || parsed.unit === '-') {
        numeric = -Math.abs(numeric);
    } else if (parsed.unit === '+%' || parsed.unit === '+') {
        numeric = Math.abs(numeric);
    }

    if (!parsed.unit && /^-/.test(parsed.value || '')) {
        numeric = -Math.abs(numeric);
    }

    if (parsed.type === '被ダメ') {
        if (/(低下|減少|軽減|半減)/.test(buffText)) {
            numeric = -Math.abs(numeric);
        } else if (/(上昇|増加|強化)/.test(buffText)) {
            numeric = Math.abs(numeric);
        }
    }

    return Number.isFinite(numeric) ? numeric : 0;
}

function applyBuffEffect(stats, parsed, buffText, sourceType) {
    if (!parsed || !parsed.type) return;
    const labelBase = `${DAMAGE_SOURCE_LABELS[sourceType] || '効果'}: ${buffText}`;
    const numericValue = parseNumericValue(parsed.value);
    const signedValue = getSignedNumericValue(parsed, buffText);

    switch (parsed.type) {
        case '攻撃固定':
            stats.attackFlat += signedValue;
            stats.attackFlatDetails.push(`${labelBase} (${signedValue >= 0 ? '+' : ''}${signedValue})`);
            break;
        case '攻撃割合':
            if (parsed.unit === '×') {
                if (numericValue > 0) {
                    stats.attackMultipliers.push(numericValue);
                    stats.attackMultiplierDetails.push(`${labelBase} (${numericValue.toFixed(2)}×)`);
                }
            } else {
                stats.attackPercent += signedValue;
                stats.attackPercentDetails.push(`${labelBase} (${signedValue >= 0 ? '+' : ''}${signedValue}%)`);
            }
            break;
        case '与えるダメージ':
        case '与ダメ':
            if (parsed.unit === '×') {
                if (numericValue > 0) {
                    stats.damageMultipliers.push(numericValue);
                    stats.damageMultiplierDetails.push(`${labelBase} (${numericValue.toFixed(2)}×)`);
                }
            } else {
                stats.damagePercent += signedValue;
                stats.damagePercentDetails.push(`${labelBase} (${signedValue >= 0 ? '+' : ''}${signedValue}%)`);
            }
            break;
        case '防御デバフ固定':
            if (numericValue > 0) {
                stats.enemyDefenseDebuffFlat += numericValue;
                stats.enemyDefenseDebuffFlatDetails.push(`${labelBase} (-${numericValue})`);
            }
            break;
        case '防御デバフ割合':
            if (numericValue > 0) {
                stats.enemyDefenseDebuffPercent += numericValue;
                stats.enemyDefenseDebuffPercentDetails.push(`${labelBase} (-${numericValue}%)`);
            }
            break;
        case '防御無視':
            stats.ignoreDefense = true;
            stats.ignoreDefenseDetails.push(labelBase);
            break;
        case '被ダメ':
            if (parsed.unit === '×') {
                if (numericValue > 0) {
                    stats.receivedDamageMultipliers.push(numericValue);
                    stats.receivedDamageMultiplierDetails.push(`${labelBase} (${numericValue.toFixed(2)}×)`);
                }
            } else {
                stats.receivedDamagePercent += signedValue;
                stats.receivedDamagePercentDetails.push(`${labelBase} (${signedValue >= 0 ? '+' : ''}${signedValue}%)`);
            }
            break;
        default:
            break;
    }
}

function formatNumber(value) {
    if (!Number.isFinite(value)) return '-';
    return Math.round(value).toLocaleString();
}

function formatSignedNumber(value) {
    if (!Number.isFinite(value) || value === 0) return '0';
    const rounded = Math.round(value * 10) / 10;
    return rounded > 0 ? `+${rounded}` : `${rounded}`;
}

function formatPercent(value) {
    if (!Number.isFinite(value)) return '0%';
    const rounded = Math.round(value * 10) / 10;
    return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)}%`;
}

function renderDetailList(details) {
    if (!details || details.length === 0) {
        return '<div style="font-size: 12px; color: #999;">該当なし</div>';
    }
    const items = details.map(item => `<li>${escapeHtml(item)}</li>`).join('');
    return `<ul style="margin: 4px 0 10px 18px; padding: 0; list-style: disc;">${items}</ul>`;
}

function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function renderDamageConditionControls(entries) {
    const list = document.getElementById('damageConditionList');
    if (!list) return;

    const validIds = new Set(entries.map(entry => entry.id));
    Object.keys(damageConditionToggles).forEach(id => {
        if (!validIds.has(id)) {
            delete damageConditionToggles[id];
        }
    });

    if (!entries.length) {
        list.innerHTML = '<p style="color: #777; font-size: 14px;">手動で切り替える条件付きバフはありません</p>';
        return;
    }

    list.innerHTML = entries.map(entry => `
        <label style="display: flex; gap: 10px; align-items: flex-start; border: 1px solid #eee; border-radius: 6px; padding: 8px;">
            <input type="checkbox" data-condition-id="${escapeHtml(entry.id)}" ${entry.applied ? 'checked' : ''}>
            <div style="font-size: 13px;">
                <div style="font-weight: bold;">${escapeHtml(entry.effect)}</div>
                <div style="color: #666;">条件: ${escapeHtml(entry.label)}</div>
            </div>
        </label>
    `).join('');

    list.querySelectorAll('input[data-condition-id]').forEach(input => {
        input.addEventListener('change', (event) => {
            const conditionId = event.target.dataset.conditionId;
            toggleDamageCondition(conditionId, event.target.checked);
        });
    });
}

function toggleDamageCondition(conditionId, isChecked) {
    damageConditionToggles[conditionId] = isChecked;
    calculateDamage();
}

function calculateDamage() {
    const resultDiv = document.getElementById('damageResult');
    const breakdownDiv = document.getElementById('damageBreakdown');
    if (!resultDiv || !breakdownDiv) return;

    if (!selectedDamageCharacterId) {
        resultDiv.innerHTML = '<p style="color: #666; text-align: center;">キャラクターを選択すると計算結果が表示されます</p>';
        breakdownDiv.innerHTML = '<p style="color: #666; text-align: center;">計算内訳はここに表示されます</p>';
        renderDamageConditionControls([]);
        return;
    }

    const char = characters.find(c => c.id === selectedDamageCharacterId);
    if (!char) {
        resultDiv.innerHTML = '<p style="color: #c0392b; text-align: center;">キャラクターデータが見つかりません</p>';
        breakdownDiv.innerHTML = '';
        renderDamageConditionControls([]);
        return;
    }

    const baseAttack = parseFloat(document.getElementById('baseAttackInput')?.value || '0') || 0;
    const enemyDefenseInput = parseFloat(document.getElementById('enemyDefense')?.value || '0') || 0;
    const enemyHpPercent = parseInt(document.getElementById('enemyHP')?.value || '0', 10) || 0;
    const allyHpPercent = parseInt(document.getElementById('allyHP')?.value || '0', 10) || 0;
    const hitCount = Math.max(1, parseInt(document.getElementById('hitCount')?.value || '1', 10) || 1);
    const strategyActive = document.getElementById('strategyActive')?.checked || false;

    const context = { strategyActive, enemyHpPercent, allyHpPercent };
    const { stats, manualConditions } = collectDamageBuffEffects(char, context);
    renderDamageConditionControls(manualConditions);

    const attackBase = baseAttack + stats.attackFlat;
    const attackPercentMultiplier = Math.max(0, 1 + stats.attackPercent / 100);
    const attackMultiplierProduct = stats.attackMultipliers.reduce((acc, mult) => acc * mult, 1) || 1;
    const finalAttack = Math.max(0, attackBase * attackPercentMultiplier * attackMultiplierProduct);

    let effectiveDefense = enemyDefenseInput;
    if (stats.enemyDefenseDebuffFlat > 0) {
        effectiveDefense = Math.max(0, effectiveDefense - stats.enemyDefenseDebuffFlat);
    }
    if (stats.enemyDefenseDebuffPercent > 0) {
        const cappedPercent = Math.min(100, stats.enemyDefenseDebuffPercent);
        effectiveDefense = Math.max(0, effectiveDefense * (1 - cappedPercent / 100));
    }
    if (stats.ignoreDefense) {
        effectiveDefense = 0;
    }

    const damagePercentMultiplier = Math.max(0, 1 + stats.damagePercent / 100);
    const damageMultiplierProduct = stats.damageMultipliers.reduce((acc, mult) => acc * mult, 1) || 1;
    const totalDamageMultiplier = damagePercentMultiplier * damageMultiplierProduct;

    let damagePerHit = Math.max(0, finalAttack - effectiveDefense);
    damagePerHit *= totalDamageMultiplier;
    const totalDamage = damagePerHit * hitCount;

    const receivedPercentMultiplier = Math.max(0, 1 + stats.receivedDamagePercent / 100);
    const receivedMultiplierProduct = stats.receivedDamageMultipliers.reduce((acc, mult) => acc * mult, 1) || 1;
    const receivedDamageMultiplier = receivedPercentMultiplier * receivedMultiplierProduct;

    resultDiv.innerHTML = `
        <div style="font-weight: bold; font-size: 18px;">${char.period ? `[${char.period}] ` : ''}${char.name}</div>
        <ul style="list-style: none; padding-left: 0; margin: 10px 0; line-height: 1.8;">
            <li>最終攻撃力: <strong>${formatNumber(finalAttack)}</strong></li>
            <li>1ヒットダメージ: <strong>${formatNumber(damagePerHit)}</strong></li>
            <li>合計ダメージ（ヒット${hitCount}）: <strong>${formatNumber(totalDamage)}</strong></li>
            <li>敵の有効防御: <strong>${formatNumber(effectiveDefense)}</strong></li>
            <li>被ダメージ倍率: <strong>${receivedDamageMultiplier.toFixed(2)}×</strong></li>
        </ul>
    `;

    const attackMultiplierDisplay = stats.attackMultipliers.length
        ? stats.attackMultipliers.map(mult => `${mult.toFixed(2)}×`).join(' × ')
        : '1.00×';
    const damageMultiplierDisplay = stats.damageMultipliers.length
        ? stats.damageMultipliers.map(mult => `${mult.toFixed(2)}×`).join(' × ')
        : '1.00×';
    const receivedMultiplierDisplay = stats.receivedDamageMultipliers.length
        ? stats.receivedDamageMultipliers.map(mult => `${mult.toFixed(2)}×`).join(' × ')
        : '1.00×';

    breakdownDiv.innerHTML = `
        <div style="margin-bottom: 15px;">
            <strong>攻撃補正</strong>
            <div>基礎攻撃力: ${formatNumber(baseAttack)}</div>
            <div>攻撃固定合計: ${formatSignedNumber(stats.attackFlat)}</div>
            ${renderDetailList(stats.attackFlatDetails)}
            <div>攻撃割合合計: ${formatPercent(stats.attackPercent)}</div>
            ${renderDetailList(stats.attackPercentDetails)}
            <div>攻撃乗算: ${attackMultiplierDisplay}</div>
            ${renderDetailList(stats.attackMultiplierDetails)}
        </div>
        <div style="margin-bottom: 15px;">
            <strong>敵防御/デバフ</strong>
            <div>基礎防御: ${formatNumber(enemyDefenseInput)}</div>
            <div>固定デバフ合計: ${stats.enemyDefenseDebuffFlat ? `-${formatNumber(stats.enemyDefenseDebuffFlat)}` : '0'}</div>
            ${renderDetailList(stats.enemyDefenseDebuffFlatDetails)}
            <div>割合デバフ合計: ${formatPercent(-stats.enemyDefenseDebuffPercent)}</div>
            ${renderDetailList(stats.enemyDefenseDebuffPercentDetails)}
            <div>防御無視: ${stats.ignoreDefense ? 'あり' : 'なし'}</div>
            ${renderDetailList(stats.ignoreDefenseDetails)}
        </div>
        <div style="margin-bottom: 15px;">
            <strong>与ダメージ補正</strong>
            <div>与ダメ加算: ${formatPercent(stats.damagePercent)}</div>
            ${renderDetailList(stats.damagePercentDetails)}
            <div>与ダメ乗算: ${damageMultiplierDisplay}</div>
            ${renderDetailList(stats.damageMultiplierDetails)}
        </div>
        <div>
            <strong>被ダメージ補正</strong>
            <div>被ダメ加算: ${formatPercent(stats.receivedDamagePercent)}</div>
            ${renderDetailList(stats.receivedDamagePercentDetails)}
            <div>被ダメ乗算: ${receivedMultiplierDisplay}</div>
            ${renderDetailList(stats.receivedDamageMultiplierDetails)}
        </div>
    `;
}

function updateEnemyHPDisplay() {
    const slider = document.getElementById('enemyHP');
    const display = document.getElementById('enemyHPDisplay');
    if (!slider || !display) return;
    display.textContent = `${slider.value}%`;
}

function updateAllyHPDisplay() {
    const slider = document.getElementById('allyHP');
    const display = document.getElementById('allyHPDisplay');
    if (!slider || !display) return;
    display.textContent = `${slider.value}%`;
}

function setActiveTab(tabName, options = {}) {
    const tabButton = document.querySelector(`.tab[data-tab="${tabName}"]`);
    const tabContent = document.getElementById(tabName);
    if (!tabButton || !tabContent) return;

    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tabButton.classList.add('active');

    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    tabContent.classList.add('active');

    if (!options.skipSave) {
        localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, tabName);
    }

    if (tabName === 'formation') {
        renderAvailableCharacters();
        renderFormation();
    }

    if (tabName === 'comparison') {
        renderFormationSelector();
        renderComparisonChart();
    }
}

document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;
        setActiveTab(tabName);
    });
});

// 初期化
loadData();
updateEnemyHPDisplay();
updateAllyHPDisplay();
calculateDamage();
initializeSimpleDamageModule();

const savedTabName = localStorage.getItem(ACTIVE_TAB_STORAGE_KEY) || 'characters';
setActiveTab(savedTabName, { skipSave: true });
applyNumericInputMode();
