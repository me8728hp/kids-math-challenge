/**
 * Kids Math Adventure - Main Logic
 * 幼児教育向け算数PWA
 */

/* =========================================
   1. StorageManager
   ユーザーデータと進捗の永続化
   ========================================= */
class StorageManager {
    static USERS_KEY = 'kidsMath_users';
    static CURRENT_ID_KEY = 'kidsMath_currentUserId';

    // ユーザーリスト取得
    static getUsers() {
        return JSON.parse(localStorage.getItem(this.USERS_KEY) || '[]');
    }

    // ユーザー追加
    static addUser(name, age) {
        const users = this.getUsers();
        const id = Date.now().toString(); // Simple ID generation
        const newUser = { id, name, age };
        users.push(newUser);
        localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
        return newUser;
    }

    // ユーザー削除
    static deleteUser(id) {
        let users = this.getUsers();
        users = users.filter(u => u.id !== id);
        localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
        localStorage.removeItem(`kidsMath_progress_${id}`);

        // If deleting current user, clear current ID
        if (localStorage.getItem(this.CURRENT_ID_KEY) === id) {
            localStorage.removeItem(this.CURRENT_ID_KEY);
        }
    }

    static setCurrentUser(id) {
        localStorage.setItem(this.CURRENT_ID_KEY, id);
    }

    static getCurrentUser() {
        const id = localStorage.getItem(this.CURRENT_ID_KEY);
        if (!id) return null;
        const users = this.getUsers();
        return users.find(u => u.id === id) || null;
    }

    // 進捗保存 (ユーザーID紐付け)
    static saveLevelResult(levelId, stars) {
        const user = this.getCurrentUser();
        if (!user) return;

        const key = `kidsMath_progress_${user.id}`;
        let progress = this._getProgressByKey(key);

        // 既存のスコアより高ければ更新
        const currentBest = progress[levelId] || 0;
        if (stars > currentBest) {
            progress[levelId] = stars;
            localStorage.setItem(key, JSON.stringify(progress));
        }
    }

    static getProgress() {
        const user = this.getCurrentUser();
        if (!user) return {};
        const key = `kidsMath_progress_${user.id}`;
        return this._getProgressByKey(key);
    }

    static _getProgressByKey(key) {
        return JSON.parse(localStorage.getItem(key) || '{}');
    }

    // 全データ削除
    static clearAll() {
        localStorage.clear();
    }
}

/* =========================================
   2. AudioManager
   効果音・BGM管理 (Web Audio API / HTML5 Audio)
   ========================================= */
class AudioManager {
    constructor() {
        this.bgm = document.getElementById('bgm-main');
        this.sounds = {
            correct: { src: 'assets/correct.mp3', fallbackFreq: 880, type: 'sine' },
            wrong: { src: 'assets/wrong.mp3', fallbackFreq: 150, type: 'sawtooth' },
            click: { src: 'assets/click.mp3', fallbackFreq: 440, type: 'triangle' },
            fanfare: { src: 'assets/fanfare.mp3', fallbackFreq: 600, type: 'square' }
        };

        // Web Audio Context for generating fallback beeps if files are missing
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }

    playBGM() {
        // ユーザーインタラクション後に呼び出す必要あり
        if (this.bgm) {
            this.bgm.volume = 0.3;
            this.bgm.play().catch(e => console.log('Audio autoplay blocked', e));
        }
    }

    playSound(name) {
        const sound = this.sounds[name];
        if (!sound) return;

        // まずはファイル再生を試みる (プレースホルダーなので実際はエラーになる可能性大)
        // エラーまたはファイルなしの場合は Web Audio API でビープ音を生成
        this._playOscillator(sound.fallbackFreq, sound.type, name);
    }

    _playOscillator(freq, type, name) {
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
        const osc = this.audioCtx.createOscillator();
        const gainNode = this.audioCtx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);

        // 音の長さ調整
        const duration = name === 'correct' ? 0.5 : (name === 'wrong' ? 0.3 : 0.1);

        // エンベロープ
        gainNode.gain.setValueAtTime(0.1, this.audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + duration);

        if (name === 'correct') {
            // 簡易的な「ピンポン」 (2音)
            osc.frequency.setValueAtTime(660, this.audioCtx.currentTime);
            osc.frequency.setValueAtTime(880, this.audioCtx.currentTime + 0.1);
        }

        osc.connect(gainNode);
        gainNode.connect(this.audioCtx.destination);

        osc.start();
        osc.stop(this.audioCtx.currentTime + duration);
    }
}

/* =========================================
   3. LevelConfig
   12段階のカリキュラムと問題生成ロジック
   ========================================= */
const LevelConfig = {
    // 共通ヘルパー: ランダム整数 (min以上 max以下)
    randomInt: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,

    // 共通ヘルパー: 配列シャッフル
    shuffle: (array) => array.sort(() => Math.random() - 0.5),

    // 共通ヘルパー: 誤答生成
    generateOptions: (answer, count = 3, range = 5) => {
        const options = new Set([answer]);
        while (options.size < count) {
            let dummy = answer + LevelConfig.randomInt(-range, range);
            if (dummy >= 0 && dummy !== answer && dummy <= 20) { // 負の数や大きすぎる数は除外
                options.add(dummy);
            }
        }
        return LevelConfig.shuffle(Array.from(options));
    },

    levels: [
        /* --- ステップA：数の概念 --- */
        {
            id: 1,
            title: "タッチして数えよう",
            label: "タッチしてね",
            desc: "え を タッチして かぞえてね",
            gen: () => {
                const ans = LevelConfig.randomInt(1, 5);
                const themes = [
                    { emoji: '🍎', text: 'りんごを タッチしてね', unit: 'こ' },
                    { emoji: '🐶', text: 'いぬを タッチしてね', unit: 'ひき' },
                    { emoji: '🚗', text: 'くるまを タッチしてね', unit: 'だい' },
                    { emoji: '🐸', text: 'かえるを タッチしてね', unit: 'ひき' },
                    { emoji: '⚽️', text: 'ボールを タッチしてね', unit: 'こ' }
                ];
                const theme = themes[Math.floor(Math.random() * themes.length)];

                return {
                    text: theme.text,
                    type: "tap_to_count",
                    value: ans,
                    answer: ans,
                    emoji: theme.emoji,
                    options: null, // No options needed
                    hint: null
                };
            }
        },
        {
            id: 2,
            title: "同じ数はどっち？",
            label: "おなじ かずは？",
            desc: "みほんと おなじ かずは どっち？",
            gen: () => {
                const ans = LevelConfig.randomInt(1, 5);
                // 正解の選択肢（値）とダミー
                return {
                    text: "したと おなじ かずは？",
                    type: "match_visual_group",
                    value: ans, // 見本の数
                    answer: ans, // 正解の数（内部的）
                    options: LevelConfig.generateOptions(ans, 3, 2), // ※表示時に絵に変換する
                    visualOption: true, // 選択肢を数字じゃなくて絵にするフラグ
                    hint: null
                };
            }
        },
        {
            id: 3,
            title: "数字を選ぼう",
            label: "すうじを えらぼう",
            desc: "かずを すうじで こたえてね",
            gen: () => {
                const ans = LevelConfig.randomInt(1, 9);
                return {
                    text: "いくつ あるかな？",
                    type: "count_objects",
                    value: ans,
                    answer: ans,
                    options: LevelConfig.generateOptions(ans, 4, 3),
                    hint: null
                };
            }
        },
        /* --- ステップB：順序と大小 --- */
        {
            id: 4,
            title: "数字の順番",
            label: "じゅんばん",
            desc: "あいている ところは なにかな？",
            gen: () => {
                const start = LevelConfig.randomInt(1, 6);
                const sequence = [start, start + 1, start + 2, start + 3]; // 連続4つ
                const hiddenIdx = LevelConfig.randomInt(1, 2); // 最初と最後以外を隠す
                const ans = sequence[hiddenIdx];
                sequence[hiddenIdx] = '?';

                return {
                    text: "□ にはいるのは なに？",
                    type: "sequence",
                    value: sequence.join(",  "),
                    answer: ans,
                    options: LevelConfig.generateOptions(ans, 3, 2),
                    hint: null
                };
            }
        },
        {
            id: 5,
            title: "どっちが多い？",
            label: "どっちが おおい？",
            desc: "おおいほうを エラんでね",
            gen: () => {
                const left = LevelConfig.randomInt(1, 8);
                let right = left;
                while (right === left) right = LevelConfig.randomInt(1, 8);

                return {
                    text: "どっちが おおい？",
                    type: "compare_visual",
                    value: { left, right },
                    answer: left > right ? left : right, // answerは値として持つが、判定は選択した方
                    options: [left, right], // 選択肢はこの2つの値
                    visualOption: true, // 絵で表示
                    hint: null
                };
            }
        },
        {
            id: 6,
            title: "どっちが大きい？",
            label: "どっちが おおきい？",
            desc: "おおきい すうじは どっち？",
            gen: () => {
                const left = LevelConfig.randomInt(1, 10);
                let right = left;
                while (right === left) right = LevelConfig.randomInt(1, 10);

                return {
                    text: "おおきい すうじは？",
                    type: "compare_number",
                    value: { left, right },
                    answer: Math.max(left, right),
                    options: [left, right],
                    hint: 'compare_number_visual'
                };
            }
        },
        /* --- ステップC：合成・分解 --- */
        {
            id: 7,
            title: "あわせて5 (パズル)",
            label: "あわせて 5 (パズル)",
            desc: "あと いくつで 5 になる？",
            gen: () => {
                const current = LevelConfig.randomInt(1, 4);
                const ans = 5 - current;
                return {
                    text: `■が ${current}こ あります。<br>あと いくつで 5こ？<div class="question-formula" style="margin-top:10px; font-weight:bold; color:#FF5722;">${current} ＋ □ ＝ 5</div>`,
                    type: "complement_5_visual",
                    value: current,
                    answer: ans,
                    options: LevelConfig.generateOptions(ans, 3, 2),
                    hint: 'complement_5_hint'
                };
            }
        },
        {
            id: 8,
            title: "あわせて5 (数式)",
            label: "あわせて 5 (しき)",
            desc: "2 + □ = 5",
            gen: () => {
                const current = LevelConfig.randomInt(1, 4);
                const ans = 5 - current;
                return {
                    text: `<div class="question-formula large-formula">${current} ＋ □ ＝ 5</div>`,
                    type: "formula_missing",
                    value: current, // 表示用補助データ
                    answer: ans,
                    options: LevelConfig.generateOptions(ans, 3, 2),
                    hint: 'complement_5_hint'
                };
            }
        },
        {
            id: 9,
            title: "あわせて10",
            label: "あわせて 10",
            desc: "あと いくつで 10 になる？",
            gen: () => {
                const current = LevelConfig.randomInt(1, 9);
                const ans = 10 - current;
                return {
                    text: `<div>${current} が あります。<br>あと いくつで 10 ？</div><div class="question-formula" style="margin-top:10px;">${current} ＋ □ ＝ 10</div>`,
                    type: "complement_10_visual",
                    value: current,
                    answer: ans,
                    options: LevelConfig.generateOptions(ans, 4, 3),
                    hint: 'tenframe'
                };
            }
        },
        /* --- ステップD：計算への導入 --- */
        {
            id: 10,
            title: "もの＋もの",
            label: "あわせると？(え)",
            desc: "あわせると いくつ？",
            gen: () => {
                const a = LevelConfig.randomInt(1, 4);
                const b = LevelConfig.randomInt(1, 4);
                const ans = a + b;
                return {
                    text: "あわせると いくつ？",
                    type: "add_visual",
                    value: { a, b },
                    answer: ans,
                    options: LevelConfig.generateOptions(ans, 4, 3),
                    hint: null
                };
            }
        },
        {
            id: 11,
            title: "ヒントつき 足し算",
            label: "たしざん (ヒント)",
            desc: "3 + 4 = ?",
            gen: () => {
                const a = LevelConfig.randomInt(1, 5);
                const b = LevelConfig.randomInt(1, 4);
                const ans = a + b;
                return {
                    text: `${a} ＋ ${b} ＝ ？`,
                    type: "add_formula_hint",
                    value: { a, b },
                    answer: ans,
                    options: LevelConfig.generateOptions(ans, 4, 3),
                    hint: 'dot_below'
                };
            }
        },
        {
            id: 12,
            title: "暗算チャレンジ",
            label: "あんざん チャレンジ",
            desc: "ぜんぶで いくつ？",
            gen: () => {
                const a = LevelConfig.randomInt(1, 5);
                const b = LevelConfig.randomInt(1, 5);
                const ans = a + b;
                return {
                    text: `${a} ＋ ${b} ＝ ？`,
                    type: "add_formula_normal",
                    value: null,
                    answer: ans,
                    options: LevelConfig.generateOptions(ans, 4, 3),
                    hint: null
                };
            }
        }
    ]
};

/* =========================================
   4. UIController
   DOM操作・描画担当
   ========================================= */
class UIController {
    constructor() {
        this.appContainer = document.getElementById('app-container');
        this.views = {
            registration: document.getElementById('registration-view'),
            map: document.getElementById('map-view'),
            game: document.getElementById('game-view'),
            result: document.getElementById('result-view')
        };
        this.audio = new AudioManager();
        this.emojis = ['🍎', '🐶', '🚗', '🐸', '⚽️', '🐱', '🚙', '⭐️'];
    }

    showView(viewName) {
        // 全Viewを隠す
        Object.values(this.views).forEach(el => el.classList.add('hidden'));
        // 指定Viewを表示
        if (this.views[viewName]) {
            this.views[viewName].classList.remove('hidden');
        }
    }

    updateUserName(name) {
        document.getElementById('display-user-name').textContent = name;
    }

    renderMap(progress, onLevelSelect) {
        const path = document.querySelector('.map-path');
        path.innerHTML = '';

        // 2. Render Level Nodes
        LevelConfig.levels.forEach((level, index) => {
            const container = document.createElement('div');
            container.className = 'level-node-container';

            // Grid logic handled by CSS (6 cols x 2 rows auto-flow)

            // Node Logic
            const btn = document.createElement('div');
            btn.className = 'level-node';
            btn.textContent = level.id;

            // Previous level cleared? (Level 1 is always unlocked)
            // Note: level.id corresponds to index+1. So level.id-1 is the Previous ID.
            const prevLevelId = level.id - 1;
            const prevStars = level.id === 1 ? 1 : (progress[prevLevelId] || 0);
            const isUnlocked = prevStars > 0;
            const currentStars = progress[level.id] || 0;

            if (isUnlocked) {
                btn.classList.add('unlocked');
                btn.onclick = () => onLevelSelect(level.id);
            } else {
                btn.classList.add('locked');
            }

            if (currentStars > 0) {
                btn.classList.add('cleared');
                const badge = document.createElement('div');
                badge.className = 'level-badge';

                if (currentStars === 3) {
                    badge.classList.add('hanamaru-badge');
                    badge.textContent = '💮';
                } else {
                    badge.textContent = '⭐️';
                }
                container.appendChild(badge);
            }

            // Level Label (Hiragana)
            const label = document.createElement('div');
            label.className = 'level-label';
            // First 6 levels (Top Row) -> Label Above
            // Next 6 levels (Bottom Row) -> Label Below
            if (index < 6) {
                label.classList.add('label-top');
            } else {
                label.classList.add('label-bottom');
            }
            label.textContent = level.label;
            container.appendChild(label);

            container.appendChild(btn);
            path.appendChild(container); // Add to container (which is grid)
        });
    }

    renderQuestion(qData, onAnswer) {
        this.currentQuestionData = qData; // Store for hint usage
        this.hintShown = false; // Reset hint state
        const qText = document.getElementById('question-text');
        const qVisuals = document.getElementById('question-visuals');
        const optArea = document.getElementById('options-area');
        const hintBtn = document.getElementById('hint-btn');

        // テキスト設定
        qText.innerHTML = qData.text;

        // ビジュアル描画
        qVisuals.innerHTML = '';
        // Pass onAnswer to _renderVisuals for interactive types
        this._renderVisuals(qData, qVisuals, onAnswer);

        // 選択肢描画
        optArea.innerHTML = '';

        // compare_visualの場合は選択肢ボタンを表示しない (ビジュアル自体をタップする)
        if (qData.options && qData.type !== 'compare_visual') {
            qData.options.forEach(optVal => {
                const btn = document.createElement('button');
                btn.className = 'option-btn';

                if (qData.visualOption) {
                    btn.innerHTML = this._getVisualString(optVal); // 絵で選択肢を表示する場合
                } else {
                    btn.textContent = optVal;
                }

                btn.onclick = (e) => onAnswer(optVal, btn);
                optArea.appendChild(btn);
            });
        }

        // Layout adjustment for full-width (Level 5 / compare_visual / tap_to_count)
        const gameArea = document.querySelector('.game-area');
        if (qData.type === 'compare_visual' || qData.type === 'tap_to_count') {
            gameArea.classList.add('full-width');
        } else {
            gameArea.classList.remove('full-width');
        }

        // ヒントボタン
        if (qData.hint) {
            hintBtn.classList.remove('hidden');
            hintBtn.onclick = () => this._showHint(qData.hint);
        } else {
            hintBtn.classList.add('hidden');
        }
    }

    _renderVisuals(qData, container, onAnswer) {
        const emoji = qData.emoji || this.emojis[Math.floor(Math.random() * this.emojis.length)];

        switch (qData.type) {
            case 'count_objects':
            case 'match_visual_group':
                container.textContent = emoji.repeat(qData.value);
                break;
            case 'tap_to_count':
                container.textContent = ''; // Clear default

                // Wrap icons for better layout
                const iconsContainer = document.createElement('div');
                iconsContainer.style.display = 'flex';
                iconsContainer.style.flexWrap = 'wrap';
                iconsContainer.style.justifyContent = 'center';
                iconsContainer.style.gap = '20px';
                container.appendChild(iconsContainer);

                // Total count display
                const totalDisplay = document.createElement('div');
                totalDisplay.className = 'level1-total-display';
                totalDisplay.textContent = '0'; // Initial state
                container.appendChild(totalDisplay);

                let currentCount = 0;
                const total = qData.value;

                for (let i = 0; i < total; i++) {
                    const wrapper = document.createElement('div');
                    wrapper.className = 'tap-object';
                    wrapper.textContent = emoji;
                    wrapper.onclick = (e) => {
                        if (wrapper.classList.contains('tapped')) return;

                        wrapper.classList.add('tapped');
                        currentCount++;
                        totalDisplay.textContent = currentCount; // Update total display

                        // Play sound
                        const uttr = new SpeechSynthesisUtterance(currentCount.toString());
                        uttr.lang = 'ja-JP';
                        speechSynthesis.speak(uttr);

                        // Show number on object
                        const numOverlay = document.createElement('div');
                        numOverlay.className = 'tap-count-overlay';
                        numOverlay.textContent = currentCount;
                        wrapper.appendChild(numOverlay);

                        // Check finish
                        if (currentCount >= total) {
                            setTimeout(() => {
                                onAnswer(total, null);
                            }, 1000);
                        }
                    };
                    iconsContainer.appendChild(wrapper);
                }
                break;
            case 'sequence':
                // Replace '?' with a styled box
                container.innerHTML = qData.value.replace('?', '<span class="fill-in-box"></span>');
                break;
            case 'compare_visual':
                // 左と右の比較: 対話的 (Interactive)
                container.style.display = 'flex';
                container.style.justifyContent = 'center';
                container.style.gap = '30px';
                container.style.alignItems = 'center';

                const leftVal = qData.value.left;
                const rightVal = qData.value.right;

                const createGroup = (val) => {
                    const div = document.createElement('div');
                    div.className = 'compare-card';

                    // Visual Icons
                    const iconPart = document.createElement('div');
                    iconPart.className = 'visual-icons';
                    iconPart.textContent = emoji.repeat(val);
                    div.appendChild(iconPart);

                    // Number Count
                    const countPart = document.createElement('div');
                    countPart.className = 'visual-count';
                    countPart.textContent = val;
                    div.appendChild(countPart);

                    div.onclick = (e) => {
                        onAnswer(val, div);
                    };
                    return div;
                };

                const leftGroup = createGroup(leftVal);
                const vsText = document.createElement('div');
                vsText.textContent = 'vs';
                vsText.style.fontSize = '2rem';
                vsText.style.color = '#888';
                const rightGroup = createGroup(rightVal);

                container.appendChild(leftGroup);
                container.appendChild(vsText);
                container.appendChild(rightGroup);
                break;

            case 'complement_5_visual':
                // Clean up any inline styles set by compare_visual previously
                container.removeAttribute('style');

                // 5個の枠を表示して、埋まっている分だけ●を表示 (CSS Class base)
                let html5 = '<div class="complement-grid">';
                for (let i = 0; i < 5; i++) {
                    const isFilled = i < qData.value ? 'filled' : '';
                    html5 += `<div class="complement-cell ${isFilled}"></div>`;
                }
                html5 += '</div>';
                container.innerHTML = html5;
                break;

            case 'complement_10_visual':
                container.removeAttribute('style');
                // Show 'current' number of items loosely or in a group
                container.innerHTML = emoji.repeat(qData.value);
                break;

            case 'add_visual':
                container.removeAttribute('style');
                container.innerHTML = `<span>${emoji.repeat(qData.value.a)}</span> 
                                       <span style="margin:0 20px;">+</span> 
                                       <span>${emoji.repeat(qData.value.b)}</span>`;
                break;

            default:
                container.removeAttribute('style');
                // 数式などはテキストで十分なのでVisualsは空でも良い
                break;
        }
    }

    _getVisualString(count) {
        // 絵文字をcount個返すヘルパー
        return '🐸'.repeat(count);
    }

    _showHint(hintType) {
        // すでにヒントが表示されていたら何もしない (重複防止)
        if (this.hintShown) return;
        this.hintShown = true;

        // 簡易実装: アラートや追加要素で表示
        if (hintType === 'dot_below') {
            document.getElementById('question-visuals').innerHTML += '<br><div style="font-size:2rem; color:#888;">●●● ＋ ●●●●</div>'; // 簡易固定
        } else if (hintType === 'tenframe') {
            const currentVal = this.currentQuestionData.value; // e.g. 3 (Question is: 3 + ? = 10)

            let gridHtml = '<div class="ten-frame-container"><div class="ten-frame-grid">';
            for (let i = 0; i < 10; i++) {
                const isFilled = i < currentVal ? 'filled' : '';
                gridHtml += `<div class="ten-frame-cell ${isFilled}"></div>`;
            }
            gridHtml += '</div></div>';

            // Add explanation text
            const missing = 10 - currentVal;
            gridHtml += `<div style="margin-top:5px; color:#888;">あと ${missing} こ！</div>`;

            document.getElementById('question-visuals').innerHTML += gridHtml;
        } else if (hintType === 'compare_number_visual') {
            const data = this.currentQuestionData;
            if (data && data.value) {
                const left = data.value.left;
                const right = data.value.right;
                const html = `
                    <div style="display:flex; gap:20px; justify-content:center; align-items:center; margin-top:10px;">
                        <div style="border:2px dashed #bbb; padding:5px; border-radius:10px; font-size:1.5rem;">${'🍎'.repeat(left)}</div>
                        <div style="font-size:1rem; color:#888;">vs</div>
                        <div style="border:2px dashed #bbb; padding:5px; border-radius:10px; font-size:1.5rem;">${'🍎'.repeat(right)}</div>
                    </div>
                 `;
                document.getElementById('question-visuals').innerHTML += html;
            }
        } else if (hintType === 'complement_5_hint') {
            const ans = this.currentQuestionData.answer;
            // Show dots representing the missing number (answer)
            const html = `<div style="margin-top:10px; color:#FF5722; font-size:2rem;">あと ${ans} こ！ <br> ${'●'.repeat(ans)}</div>`;
            document.getElementById('question-visuals').innerHTML += html;
        }
    }

    showFeedback(isCorrect, btnElement) {
        const overlay = document.getElementById('feedback-overlay');
        const icon = document.getElementById('feedback-icon');
        const text = document.getElementById('feedback-text');

        if (isCorrect) {
            this.audio.playSound('correct');
            icon.textContent = '🌟';
            text.textContent = 'すごい！';
            overlay.classList.remove('hidden');

            // 紙吹雪エフェクト (簡易)
            this._runConfetti();

            setTimeout(() => {
                overlay.classList.add('hidden');
            }, 1500);
        } else {
            this.audio.playSound('wrong');
            btnElement.classList.add('shake-anim');
            setTimeout(() => btnElement.classList.remove('shake-anim'), 500);
        }
    }

    _runConfetti() {
        // CSSパーティクル等を生成するのが理想だが、今回は色変化で代用
        document.body.style.backgroundColor = '#FFF176';
        setTimeout(() => document.body.style.backgroundColor = '', 300);
    }

    updateProgress(current, total) {
        const bar = document.getElementById('game-progress-bar');
        const text = document.getElementById('game-progress-text');
        const percent = (current / total) * 100;
        bar.style.width = `${percent}%`;

        // current is completed count. If current=0, showing Q1.
        // We want to show current question number? 
        // Logic: if current is 0, we are on Q1 (0/10 finished) => Show 1/10?
        // Or show completed? "X/10" usually implies "Question X of 10".
        // Let's assume we want to show "Current Question Index + 1".
        // BUT current passed in is often 'currentIndex' which increments AFTER answer.
        // When checking: startLevel calls updateProgress(0, 10). We want "1/10".
        // When Q1 checks out: currentIndex becomes 1. updateProgress(1, 10). We want "2/10".
        // Exception: when finished (10/10), we might prefer "10/10" or it goes to result.

        const displayVal = Math.min(current + 1, total);
        if (text) text.textContent = `${displayVal}/${total}`;
    }

    showResult(score, total, onNext) {
        const starsContainer = document.getElementById('result-stars');
        const msg = document.getElementById('result-message');

        // Hanamaru Logic: 10/10 = 3 stars (internal value for 'Perfect'), else if >0 = 1 star (Pass)
        // The user asked for Hanamaru. We will map:
        // 10 points -> 3 (Hanamaru)
        // 1-9 points -> 1 or 2 (Star)
        // 0 points -> 0 (Failed)

        let starCount = 0;
        let displayHtml = '';

        if (score === total) {
            starCount = 3; // Perfect
            displayHtml = '<span style="font-size:5rem; color:red;">💮</span>';
            msg.innerHTML = 'すごい！ <br> パーフェクト！';
            this.audio.playSound('fanfare');
        } else if (score >= 1) {
            starCount = 1; // Pass
            displayHtml = '<span>⭐️</span> <span>クリア！</span>';
            msg.textContent = `${total}もんちゅう ${score}もん せいかい！`;
            this.audio.playSound('correct'); // Simple correct sound
        } else {
            starCount = 0; // Fail
            displayHtml = '';
            msg.textContent = 'もういちど がんばろう！';
        }

        starsContainer.innerHTML = displayHtml;

        this.showView('result');

        return starCount; // 保存用に返す
    }
}

/* =========================================
   5. GameEngine
   ゲーム進行管理
   ========================================= */
class GameEngine {
    constructor(ui) {
        this.ui = ui;
        this.currentLevelId = 0;
        this.questions = [];
        this.currentIndex = 0;
        this.score = 0;
        this.isProcessing = false;
    }

    startLevel(levelId) {
        this.currentLevelId = levelId;
        this.score = 0;
        this.currentIndex = 0;
        this.questions = [];

        const levelData = LevelConfig.levels.find(l => l.id === levelId);
        if (!levelData) return;

        // 10問生成
        for (let i = 0; i < 10; i++) {
            this.questions.push(levelData.gen());
        }

        this.ui.showView('game');
        this.ui.updateProgress(0, 10);
        this.nextQuestion();
    }

    nextQuestion() {
        if (this.currentIndex >= 10) {
            this.finishGame();
            return;
        }

        const q = this.questions[this.currentIndex];
        this.ui.renderQuestion(q, (selectedVal, btn) => this.checkAnswer(selectedVal, q.answer, btn));
    }

    checkAnswer(selectedVal, correctVal, btn) {
        if (this.isProcessing) return;

        // 数値比較
        if (selectedVal === correctVal) {
            this.isProcessing = true;
            this.score++;
            // btn might be null in tap_to_count
            if (btn) {
                this.ui.showFeedback(true, btn);
            } else {
                // Direct feedback for visual interaction
                this.ui.showFeedback(true, { classList: { add: () => { }, remove: () => { } } }); // Dummy
            }

            this.currentIndex++;
            this.ui.updateProgress(this.currentIndex, 10);

            setTimeout(() => {
                this.isProcessing = false;
                if (this.currentIndex >= 10) {
                    this.finishGame();
                } else {
                    this.nextQuestion();
                }
            }, 1500);
        } else {
            if (btn) this.ui.showFeedback(false, btn);
            // 不正解でも進めるならここでカウントアップだが、
            // 「正解するまで進めない」か「1回で次へ」か。
            // 幼児向けには「正解するまで」が優しいが、スコア的には1発正解のみカウントしたい
            // 今回は「正解するまで何度でもトライ」にする（スコア減算なしの簡易版）
        }
    }

    finishGame() {
        const stars = this.ui.showResult(this.score, 10);
        StorageManager.saveLevelResult(this.currentLevelId, stars);
    }
}

/* =========================================
   6. App Initialization (Main)
   ========================================= */
document.addEventListener('DOMContentLoaded', () => {
    const ui = new UIController();
    const game = new GameEngine(ui);

    // Initial Check
    renderUserSelectionScreen();

    function renderUserSelectionScreen() {
        const users = StorageManager.getUsers();

        if (users.length > 0) {
            ui.showView('registration');
            document.getElementById('registration-area').classList.add('hidden');
            document.getElementById('returning-user-area').classList.remove('hidden');

            const listContainer = document.getElementById('user-list-container');
            listContainer.innerHTML = '';

            users.forEach(u => {
                const card = document.createElement('div');
                card.className = 'user-card';

                const selectBtn = document.createElement('button');
                selectBtn.className = 'user-select-btn';
                selectBtn.textContent = `${u.name} (${u.age}さい)`;
                selectBtn.onclick = () => {
                    StorageManager.setCurrentUser(u.id);
                    initMap(u);
                };

                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'user-delete-btn';
                deleteBtn.textContent = '🗑️'; // Trash icon
                deleteBtn.onclick = (e) => {
                    e.stopPropagation(); // Prevent select
                    if (confirm(`${u.name} さんの データを けしますか？`)) {
                        StorageManager.deleteUser(u.id);
                        renderUserSelectionScreen(); // Re-render
                    }
                };

                card.appendChild(selectBtn);
                card.appendChild(deleteBtn);
                listContainer.appendChild(card);
            });

        } else {
            // No users, show registration immediately
            ui.showView('registration');
            document.getElementById('registration-area').classList.remove('hidden');
            document.getElementById('returning-user-area').classList.add('hidden');
            document.getElementById('reg-back-btn').classList.add('hidden'); // No back button if no users
        }
    }

    /* --- Event Listeners --- */

    document.getElementById('add-new-user-btn').onclick = () => {
        document.getElementById('returning-user-area').classList.add('hidden');
        document.getElementById('registration-area').classList.remove('hidden');
        document.getElementById('reg-back-btn').classList.remove('hidden'); // Show back button

        // Reset inputs
        document.getElementById('user-name-input').value = '';
        document.querySelectorAll('#registration-area .age-btn').forEach(b => b.classList.remove('selected'));
        // selectedAge is local variable, need to reset if possible or it persists?
        // Actually selectedAge is strictly scoped below. We need to handle it.
        // We will trigger a reset by re-selecting nothing? 
        // Best to just rely on user clicking.
        document.getElementById('start-btn').classList.add('disabled');
    };

    document.getElementById('reg-back-btn').onclick = () => {
        renderUserSelectionScreen();
    };


    // User Settings Modal Removed as per request

    // Registration
    const ageBtns = document.querySelectorAll('#registration-area .age-btn');
    let selectedAge = null;
    ageBtns.forEach(btn => {
        btn.onclick = () => {
            ageBtns.forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            selectedAge = btn.dataset.age;
            checkStartBtn();
        };
    });

    const nameInput = document.getElementById('user-name-input');
    nameInput.addEventListener('input', checkStartBtn);

    function checkStartBtn() {
        const name = nameInput.value.trim();
        const startBtn = document.getElementById('start-btn');
        if (name && selectedAge) {
            startBtn.classList.remove('disabled');
        } else {
            startBtn.classList.add('disabled');
        }
    }

    document.getElementById('start-btn').onclick = () => {
        const name = nameInput.value.trim();
        if (name && selectedAge) {
            const newUser = StorageManager.addUser(name, selectedAge);
            StorageManager.setCurrentUser(newUser.id);
            initMap(newUser);
        }
    };

    // Map & Navigation
    function initMap(userObj) {
        ui.updateUserName(userObj.name);
        const progress = StorageManager.getProgress();
        ui.renderMap(progress, (levelId) => {
            game.startLevel(levelId);
        });
        ui.showView('map');
        ui.audio.playBGM();
    }

    document.getElementById('title-back-btn').onclick = () => {
        renderUserSelectionScreen();
    };

    document.getElementById('back-to-map-btn').onclick = () => {
        const user = StorageManager.getCurrentUser();
        initMap(user);
    };

    // Result Actions
    document.getElementById('retry-btn').onclick = () => {
        game.startLevel(game.currentLevelId);
    };

    document.getElementById('next-level-btn').onclick = () => {
        // 次のレベルがあれば
        if (game.currentLevelId < 12) {
            game.startLevel(game.currentLevelId + 1);
        } else {
            alert('ぜんぶ クリア！ すごい！！');
            const user = StorageManager.getCurrentUser();
            initMap(user);
        }
    };

    document.getElementById('return-map-btn').onclick = () => {
        const user = StorageManager.getCurrentUser();
        initMap(user);
    };

    // App Update Logic
    document.getElementById('update-app-btn').onclick = () => {
        if (confirm('あたらしい バージョンに こうしん しますか？')) {
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(function (registrations) {
                    for (let registration of registrations) {
                        registration.unregister();
                    }
                    window.location.reload(true);
                });
            } else {
                window.location.reload(true);
            }
        }
    };
});
