// 折りたたみ機能
function toggleCollapsible(labelElement) {
    labelElement.classList.toggle('active');
    const content = labelElement.nextElementSibling;
    content.classList.toggle('active');
}

// データ管理
let characters = [];
let currentFormation = [];
let savedFormations = [];
let selectedFormationsForComparison = [];

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
    const target = getSelectedValue('skillTarget');
    const type = getSelectedValue('skillType');
    const value = document.getElementById('skillValue').value;
    const unit = document.getElementById('skillUnit').value;
    const condition = document.getElementById('skillCondition').value.trim();
    const isDuplicate = document.getElementById('skillDuplicate').checked;

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
    const target = getSelectedValue('strategyTarget');
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

        // 重複バッジ
        const duplicateBadge = isDuplicate ? '<span style="background: #ffc107; color: #333; padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: bold; margin-right: 5px;">重複</span>' : '';

        const buffContent = condition
            ? `<div class="buff-content" onclick="editBuff('${type}', ${index})">${duplicateBadge}<span class="buff-main">${mainText}</span><span class="buff-condition">${condition}</span></div>`
            : `<div class="buff-content" onclick="editBuff('${type}', ${index})">${duplicateBadge}<span class="buff-main">${mainText}</span></div>`;

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
        targetId = 'skillTarget';
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
        targetId = 'strategyTarget';
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
    setSelectedButton(targetId, parsed.target);
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

    // 対象とバフ内容を分離
    const parts = mainText.split('/');
    const target = parts[0];
    const buffPart = parts[1];

    // 単位と数値を抽出
    let unit = '';
    let type = '';
    let value = '';

    // 単位を検出（長いものから順に）
    if (buffPart.includes('+%')) {
        unit = '+%';
    } else if (buffPart.includes('-%')) {
        unit = '-%';
    } else if (buffPart.includes('×')) {
        unit = '×';
    } else if (buffPart.includes('+')) {
        unit = '+';
    } else if (buffPart.includes('-')) {
        unit = '-';
    }

    // バフ種と数値を分離
    const unitIndex = buffPart.indexOf(unit);
    type = buffPart.substring(0, unitIndex);
    value = buffPart.substring(unitIndex + unit.length);

    return { target, type, value, unit, condition, isDuplicate };
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
        return `${mainText}<br><span style="font-size: 10px; opacity: 0.8; font-style: italic;">${condition}</span>`;
    }
    return buffText;
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
            '与ダメデバフ': { value: null, display: '-', numeric: 0 },
            '防御固定': { value: null, display: '-', numeric: 0, isFixed: true },
            '防御割合': { value: null, display: '-', numeric: 0 },
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
            if (effect.includes('与えるダメージ')) {
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

// タブ切り替え
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;

        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(tabName).classList.add('active');

        // 編成タブに切り替えたら利用可能なキャラクターを表示
        if (tabName === 'formation') {
            renderAvailableCharacters();
            renderFormation();
        }

        // 比較タブに切り替えたら編成セレクターを表示
        if (tabName === 'comparison') {
            renderFormationSelector();
            renderComparisonChart();
        }
    });
});

// 初期化
loadData();
