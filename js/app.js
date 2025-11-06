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
    // 攻撃バフ
    { pattern: /攻撃(?:力)?[がを]?(\d+(?:\.\d+)?)%(?:上昇|アップ|UP|増加)/i, type: "攻撃割合", unit: "+%", getValue: (m) => parseFloat(m[1]) },
    { pattern: /攻撃(?:力)?[がを]?(\d+)(?:上昇|アップ|UP|増加)/i, type: "攻撃固定", unit: "+", getValue: (m) => parseInt(m[1]) },

    // 防御バフ
    { pattern: /防御(?:力)?[がを]?(\d+(?:\.\d+)?)%(?:上昇|アップ|UP|増加)/i, type: "防御割合", unit: "+%", getValue: (m) => parseFloat(m[1]) },
    { pattern: /防御(?:力)?[がを]?(\d+)(?:上昇|アップ|UP|増加)/i, type: "防御固定", unit: "+", getValue: (m) => parseInt(m[1]) },
    { pattern: /防御[をが]?無視/i, type: "防御無視", unit: "", getValue: () => null },

    // 防御デバフ
    { pattern: /(?:敵の)?防御(?:力)?[がを]?(\d+(?:\.\d+)?)%(?:低下|減少|ダウン|DOWN)/i, type: "防御デバフ割合", unit: "+%", getValue: (m) => parseFloat(m[1]) },
    { pattern: /(?:敵の)?防御(?:力)?[がを]?(\d+)(?:低下|減少|ダウン|DOWN)/i, type: "防御デバフ固定", unit: "+", getValue: (m) => parseInt(m[1]) },

    // 攻撃デバフ
    { pattern: /(?:敵の)?攻撃(?:力)?[がを]?(\d+(?:\.\d+)?)%(?:低下|減少|ダウン|DOWN)/i, type: "攻撃デバフ割合", unit: "+%", getValue: (m) => parseFloat(m[1]) },
    { pattern: /(?:敵の)?攻撃(?:力)?[がを]?(\d+)(?:低下|減少|ダウン|DOWN)/i, type: "攻撃デバフ固定", unit: "+", getValue: (m) => parseInt(m[1]) },

    // ダメージ
    { pattern: /(?:与える)?ダメージ[がを]?(\d+(?:\.\d+)?)倍/i, type: "与ダメ", unit: "×", getValue: (m) => parseFloat(m[1]) },
    { pattern: /(?:受ける)?ダメージ[がを]?(\d+(?:\.\d+)?)倍/i, type: "被ダメ", unit: "×", getValue: (m) => parseFloat(m[1]) },
    { pattern: /(?:与える)?ダメージ[がを]?(\d+(?:\.\d+)?)%(?:上昇|アップ|UP|増加)/i, type: "与えるダメージ", unit: "+%", getValue: (m) => parseFloat(m[1]) },

    // 射程
    { pattern: /射程[がを]?(\d+(?:\.\d+)?)%(?:上昇|アップ|UP|増加)/i, type: "射程割合", unit: "+%", getValue: (m) => parseFloat(m[1]) },
    { pattern: /射程[がを]?(\d+)(?:上昇|アップ|UP|増加)/i, type: "射程固定", unit: "+", getValue: (m) => parseInt(m[1]) },

    // 速度・隙
    { pattern: /(?:攻撃)?速度[がを]?(\d+(?:\.\d+)?)%(?:上昇|アップ|UP|増加)/i, type: "速度", unit: "+%", getValue: (m) => parseFloat(m[1]) },
    { pattern: /隙[がを]?(\d+(?:\.\d+)?)%(?:低下|減少|短縮)/i, type: "隙", unit: "+%", getValue: (m) => parseFloat(m[1]) },
    { pattern: /隙[がを]?(\d+(?:\.\d+)?)%(?:増加|上昇)/i, type: "隙", unit: "-%", getValue: (m) => parseFloat(m[1]) },

    // 対象数
    { pattern: /(?:攻撃)?対象[がを]?(\d+)(?:体)?(?:増加|上昇|アップ|UP)/i, type: "対象数", unit: "+", getValue: (m) => parseInt(m[1]) },

    // 気トークン
    { pattern: /(?:毎秒)?(?:気トークン|気)[がを]?(\d+(?:\.\d+)?)(?:増加|上昇|取得)/i, type: "自然気", unit: "+", getValue: (m) => parseFloat(m[1]) },
    { pattern: /計略使用時[^。]*?気トークン[がを]?(\d+)(?:増加|上昇)/i, type: "気(牛)", unit: "+", getValue: (m) => parseInt(m[1]) },
    { pattern: /行動開始時[^。]*?気トークン[がを]?(\d+)(?:増加|上昇)/i, type: "気(ノビ)", unit: "+", getValue: (m) => parseInt(m[1]) },
    { pattern: /徐々に[^。]*?気トークン[がを]?(\d+)(?:増加|上昇)/i, type: "徐々気", unit: "+", getValue: (m) => parseFloat(m[1]) },
    { pattern: /消費(?:気トークン|気)[がを]?(\d+(?:\.\d+)?)%(?:減少|軽減)/i, type: "気軽減", unit: "+%", getValue: (m) => parseFloat(m[1]) },

    // 計略再使用
    { pattern: /計略(?:の)?再使用[^。]*?(\d+(?:\.\d+)?)%(?:短縮|減少)/i, type: "計略短縮", unit: "+%", getValue: (m) => parseFloat(m[1]) },

    // 移動速度
    { pattern: /移動速度[がを]?(\d+(?:\.\d+)?)%(?:低下|減少|ダウン|DOWN)/i, type: "移動低下", unit: "+%", getValue: (m) => parseFloat(m[1]) },
    { pattern: /移動速度[がを]?(\d+(?:\.\d+)?)%(?:上昇|増加|アップ|UP)/i, type: "移動上昇", unit: "+%", getValue: (m) => parseFloat(m[1]) },
    { pattern: /移動速度[がを]?(\d+(?:\.\d+)?)(?:に変更|へ変更)/i, type: "移動変更", unit: "+", getValue: (m) => parseFloat(m[1]) },
    { pattern: /移動(?:を)?停止/i, type: "移動停止", unit: "", getValue: () => null },
    { pattern: /(\d+)(?:マス)?(?:後退|ノックバック)/i, type: "移動後退", unit: "+", getValue: (m) => parseInt(m[1]) }
];

// 対象キーワードマッピング（Wiki表記 → アプリ内表記）
const targetKeywords = [
    // 伏兵射程内（優先度高：他のパターンより先にマッチさせる）
    { pattern: /伏兵(?:の)?射程(?:内|範囲)/i, target: "伏兵射程内" },

    // 自身
    { pattern: /自身/i, target: "自身" },

    // 全員（射程内外問わず）
    { pattern: /(?:全ての?|すべての?)(?:味方|城娘)/i, target: "全員" },
    { pattern: /味方(?:の)?(?:全(?:員|体)|全て)/i, target: "全員" },

    // 射程内（自分の射程内の味方/城娘）
    { pattern: /(?:自身の)?射程(?:内|範囲)(?:の)?(?:味方|城娘)/i, target: "射程内" },
    { pattern: /味方(?:の)?射程(?:内|範囲)/i, target: "射程内" },
    { pattern: /範囲内(?:の)?(?:味方|城娘)/i, target: "射程内" },
    { pattern: /味方(?:の)?(?:歌舞|本|札|杖|鈴|砲術)(?:ユニット)?/i, target: "射程内" }
];

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

        // テーブルから基本情報を取得
        const tables = doc.querySelectorAll('table');

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
    const results = [];

    // 対象を検出
    let target = "射程内"; // デフォルト
    for (const keyword of targetKeywords) {
        if (keyword.pattern.test(text)) {
            target = keyword.target;
            break;
        }
    }

    // 各バフパターンをマッチング
    for (const buffPattern of buffPatterns) {
        const match = text.match(buffPattern.pattern);
        if (match) {
            const value = buffPattern.getValue(match);

            // 条件を抽出
            let condition = "";

            // 「○○の場合」「○○時」「○○のみ」などのパターンを検出
            const conditionPatterns = [
                // 武器種限定（例：「近接のみ」「軍船は」）
                /([近遠]接|[弓鉄槍刀盾歌本砲鈴杖札軍投双拳鞭茶石陣砲大ラ探人][器船舞砲剣外山貝ン検][のは])/,
                // 属性限定（例：「水のみ」「平山は」）
                /([水平山地無][上獄属限定のは]{1,3})/,
                // 敵条件（例：「飛行敵は」「近接単体のみ」）
                /([飛近遠単複][行接接体数][敵体](?:のみ|は|に対して))/,
                // HP条件（例：「敵のHP50%以下」）
                /(HP\d+%以[上下]|防御\d+%以[上下])/,
                // 範囲条件（例：「射程内は」「射程外は」）
                /(射程[内外](?:は|のみ))/,
                // 一般的な条件（例：「〇〇の場合」「〇〇時」）
                /([^。、]+)(?:の場合|時)/,
                /([^。、]+)(?:のみ|に限[りる])/
            ];

            for (const condPattern of conditionPatterns) {
                const condMatch = text.match(condPattern);
                if (condMatch) {
                    condition = condMatch[1].trim();
                    break;
                }
            }

            results.push({
                target: target,
                type: buffPattern.type,
                unit: buffPattern.unit,
                value: value,
                condition: condition
            });
        }
    }

    return results;
}

// バフ解析結果を適切なリストに追加
function addParsedBuffs(buffs, buffType) {
    // buffType: 'skill' または 'strategy'

    buffs.forEach(buff => {
        // バフ文字列を構築
        let buffString;
        if (buff.value !== null) {
            // 値がある場合: 対象/タイプ/単位/値
            buffString = `${buff.target}/${buff.type}/${buff.unit}/${buff.value}`;
        } else if (buff.unit === "") {
            // 値がなく単位も空の場合（例: 防御無視）: 対象/タイプ
            buffString = `${buff.target}/${buff.type}`;
        } else {
            // 値がないが単位がある場合: 対象/タイプ/単位
            buffString = `${buff.target}/${buff.type}/${buff.unit}`;
        }

        // 条件がある場合は括弧で追加
        const fullBuffString = buff.condition
            ? `${buffString}（${buff.condition}）`
            : buffString;

        if (buffType === 'skill') {
            tempSkills.push(fullBuffString);
        } else if (buffType === 'strategy') {
            tempStrategies.push(fullBuffString);
        }
    });

    // リストを更新
    if (buffType === 'skill') {
        renderBuffsList('skillsList', tempSkills, 'skill');
    } else if (buffType === 'strategy') {
        renderBuffsList('strategiesList', tempStrategies, 'strategy');
    }
}

// 特技テキストから解析してバフを追加
function analyzeAndAddSkill(description) {
    const buffs = parseBuffText(description);
    if (buffs.length === 0) {
        alert('バフパターンが検出されませんでした。手動で入力してください。');
        return;
    }

    addParsedBuffs(buffs, 'skill');
    alert(`${buffs.length}個のバフを検出し、特技リストに追加しました。`);
}

// 計略テキストから解析してバフを追加
function analyzeAndAddStrategy(description) {
    const buffs = parseBuffText(description);
    if (buffs.length === 0) {
        alert('バフパターンが検出されませんでした。手動で入力してください。');
        return;
    }

    addParsedBuffs(buffs, 'strategy');
    alert(`${buffs.length}個のバフを検出し、計略リストに追加しました。`);
}

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
