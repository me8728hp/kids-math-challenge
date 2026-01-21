/**
 * Kids Math Challenge - Logic Script
 * 
 * Components:
 * 1. StorageManager: Handles saving/loading progress.
 * 2. LevelConfig: Defines the 12 levels and problem generation logic.
 * 3. GameEngine: Manages game state, UI updates, and interactions.
 */

// --- 1. StorageManager ---
const StorageManager = {
    KEY: 'kids_math_progress_v2',

    load() {
        const data = localStorage.getItem(this.KEY);
        if (data) return JSON.parse(data);
        return {
            maxLevelId: 1, // Start at level 1
            stars: {}      // Map of levelId -> starCount (1-3)
        };
    },

    save(data) {
        localStorage.setItem(this.KEY, JSON.stringify(data));
    },

    isLevelUnlocked(levelId) {
        const data = this.load();
        return levelId <= data.maxLevelId;
    },

    unlockNextLevel(currentLevelId) {
        const data = this.load();
        if (currentLevelId >= data.maxLevelId && currentLevelId < 12) {
            data.maxLevelId = currentLevelId + 1;
            this.save(data);
        }
    },

    saveStars(levelId, count) {
        const data = this.load();
        const currentStars = data.stars[levelId] || 0;
        if (count > currentStars) {
            data.stars[levelId] = count;
            this.save(data);
        }
    },

    getTotalStars() {
        const data = this.load();
        return Object.values(data.stars).reduce((a, b) => a + b, 0);
    }
};

// --- 2. LevelConfig ---
const LevelConfig = [
    {
        id: 1,
        title: "１．かぞえよう",
        description: "え を タッチ して かぞえよう！",
        type: "count_touch",
        generate: () => {
            const count = Math.floor(Math.random() * 5) + 1;
            return {
                type: "count_touch",
                target: count,
                options: [count], // Only correct answer button shown after counting
                visuals: new Array(count).fill('🍎')
            };
        }
    },
    {
        id: 2,
        title: "２．おなじかず",
        description: "おなじ かず は どっち？",
        type: "compare_match_visual",
        generate: () => {
            const target = Math.floor(Math.random() * 3) + 1;
            let other = target;
            while (other === target) other = Math.floor(Math.random() * 3) + 1;

            // 50% chance for correct answer to be first
            const isFirstCorrect = Math.random() < 0.5;
            const options = isFirstCorrect
                ? [{ val: target, label: Array(target).fill('🍎').join('') }, { val: other, label: Array(other).fill('🍎').join('') }]
                : [{ val: other, label: Array(other).fill('🍎').join('') }, { val: target, label: Array(target).fill('🍎').join('') }];

            return {
                type: "compare_match_visual",
                target: target,
                visuals: new Array(target).fill('🍎'),
                options: options.map(o => o.label),
                correctIndex: isFirstCorrect ? 0 : 1
            };
        }
    },
    {
        id: 3,
        title: "３．すうじをえらぼう",
        description: "なんこ あるかな？",
        type: "count_select",
        generate: () => {
            const count = Math.floor(Math.random() * 5) + 1; // 1-5
            // Generate 3 choices including the correct one
            let choices = [count];
            while (choices.length < 3) {
                let r = Math.floor(Math.random() * 5) + 1;
                if (!choices.includes(r)) choices.push(r);
            }
            choices.sort((a, b) => a - b);

            return {
                type: "count_select",
                target: count,
                visuals: new Array(count).fill('🍎'),
                options: choices,
                correctVal: count
            };
        }
    },
    {
        id: 4,
        title: "４．すうじのじゅんばん",
        description: "しかく に はいるのは？",
        type: "sequence",
        generate: () => {
            // Sequence of 3-4 numbers, one missing
            const start = Math.floor(Math.random() * 5) + 1; // 1-5
            const length = 4;
            const seq = [];
            for (let i = 0; i < length; i++) seq.push(start + i);

            const blankIdx = Math.floor(Math.random() * length);
            const answer = seq[blankIdx];
            seq[blankIdx] = '⬜';

            // Choices
            let choices = [answer];
            while (choices.length < 3) {
                let r = Math.floor(Math.random() * 9) + 1;
                if (!choices.includes(r)) choices.push(r);
            }
            choices.sort((a, b) => a - b);

            return {
                type: "sequence",
                formula: seq.join(' , '),
                options: choices,
                correctVal: answer
            };
        }
    },
    {
        id: 5,
        title: "５．どっちがおおい？（え）",
        description: "おおい ほう を タッチ！",
        type: "compare_more_visual",
        generate: () => {
            const left = Math.floor(Math.random() * 5) + 1;
            let right = left;
            while (right === left) right = Math.floor(Math.random() * 5) + 1;

            return {
                type: "compare_more_visual",
                options: [Array(left).fill('🍎').join(''), Array(right).fill('🍎').join('')],
                correctIndex: left > right ? 0 : 1
            };
        }
    },
    {
        id: 6,
        title: "６．どっちがおおきい？（すうじ）",
        description: "おおきい すうじ は どっち？",
        type: "compare_more_number",
        generate: () => {
            const left = Math.floor(Math.random() * 9) + 1;
            let right = left;
            while (right === left) right = Math.floor(Math.random() * 9) + 1;

            return {
                type: "compare_more_number",
                options: [left, right],
                correctIndex: left > right ? 0 : 1
            };
        }
    },
    {
        id: 7,
        title: "７．あわせて５（え）",
        description: "あと いくつで ５？",
        type: "complement_5_visual",
        hasHelp: true,
        generate: () => {
            const current = Math.floor(Math.random() * 4) + 1; // 1-4
            const needed = 5 - current;

            let choices = [needed];
            while (choices.length < 3) {
                let r = Math.floor(Math.random() * 5); // 0-4
                if (!choices.includes(r) && r !== 0) choices.push(r);
            }
            choices.sort((a, b) => a - b);

            return {
                type: "complement_5_visual",
                current: current,
                needed: needed,
                visuals: new Array(current).fill('🍎'), // Show current apples
                options: choices,
                correctVal: needed
            };
        }
    },
    {
        id: 8,
        title: "８．あわせて５（すうじ）",
        description: "しかく に はいるのは？",
        type: "complement_5_number",
        hasHelp: true,
        generate: () => {
            const current = Math.floor(Math.random() * 4) + 1;
            const needed = 5 - current;

            return {
                type: "complement_5_number",
                formula: `${current} + ⬜ = 5`,
                options: [1, 2, 3, 4], // Fixed options usually fine for this
                correctVal: needed,
                hintDots: current // for help
            };
        }
    },
    {
        id: 9,
        title: "９．あわせて１０（え）",
        description: "あと いくつで １０？",
        type: "complement_10_visual",
        hasHelp: true,
        generate: () => {
            const current = Math.floor(Math.random() * 9) + 1; // 1-9
            const needed = 10 - current;

            let choices = [needed];
            while (choices.length < 3) {
                let r = Math.floor(Math.random() * 9) + 1;
                if (!choices.includes(r)) choices.push(r);
            }
            choices.sort((a, b) => a - b);

            return {
                type: "complement_10_visual",
                current: current,
                visuals: true, // Special rendering handled by engine
                options: choices,
                correctVal: needed
            };
        }
    },
    {
        id: 10,
        title: "１０．たしざん（え）",
        description: "あわせて いくつ？",
        type: "add_visual",
        generate: () => {
            const a = Math.floor(Math.random() * 4) + 1;
            const b = Math.floor(Math.random() * 4) + 1; // Sum max 8-10 usually
            const sum = a + b;

            let choices = [sum];
            while (choices.length < 3) {
                let r = Math.floor(Math.random() * 9) + 1;
                if (!choices.includes(r)) choices.push(r);
            }
            choices.sort((a, b) => a - b);

            return {
                type: "add_visual",
                visualLeft: Array(a).fill('🍎'),
                visualRight: Array(b).fill('🍌'),
                options: choices,
                correctVal: sum
            };
        }
    },
    {
        id: 11,
        title: "１１．たしざん（ヒント）",
        description: "こたえ は なあに？",
        type: "add_hint",
        hasHelp: true,
        generate: () => {
            const a = Math.floor(Math.random() * 5) + 1;
            const b = Math.floor(Math.random() * 4) + 1;
            const sum = a + b;

            let choices = [sum];
            while (choices.length < 3) {
                let r = Math.floor(Math.random() * 9) + 1;
                if (!choices.includes(r)) choices.push(r);
            }
            choices.sort((a, b) => a - b);

            return {
                type: "add_hint",
                formula: `${a} + ${b} = ?`,
                hintDots: [a, b],
                options: choices,
                correctVal: sum
            };
        }
    },
    {
        id: 12,
        title: "１２．たしざん（チャレンジ）",
        description: "あんざん で チャレンジ！",
        type: "add_abstract",
        generate: () => {
            const a = Math.floor(Math.random() * 5) + 1;
            const b = Math.floor(Math.random() * 5) + 1;
            const sum = a + b;

            let choices = [sum];
            while (choices.length < 3) {
                let r = Math.floor(Math.random() * 10) + 1;
                if (!choices.includes(r)) choices.push(r);
            }
            choices.sort((a, b) => a - b);

            return {
                type: "add_abstract",
                formula: `${a} + ${b} = ?`,
                options: choices,
                correctVal: sum
            };
        }
    }
];

// --- 3. GameEngine ---
const GameEngine = {
    currentLevelConfig: null,
    currentProblem: null,
    correctCount: 0,
    requiredCount: 3, // Problems to clear a level

    init() {
        this.bindEvents();
        this.showTitle();
        this.updateStarsDisplay();
    },

    bindEvents() {
        document.getElementById('start-btn').onclick = () => this.showLevelMap();
        document.getElementById('back-to-title-btn').onclick = () => this.showTitle();
        document.getElementById('quit-game-btn').onclick = () => this.showLevelMap();
        document.getElementById('retry-btn').onclick = () => this.startLevel(this.currentLevelConfig.id);
        document.getElementById('next-level-btn').onclick = () => {
            const nextId = this.currentLevelConfig.id + 1;
            if (nextId <= 12) this.startLevel(nextId);
            else this.showLevelMap(); // Finished all
        };
        document.getElementById('back-to-map-btn').onclick = () => this.showLevelMap();

        // Help button toggle
        document.getElementById('help-btn').onclick = () => this.toggleHelp();
    },

    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
        document.getElementById(screenId).classList.add('active');

        // Audio interaction requirement handling (play silent sound to unlock audio if needed)
    },

    showTitle() {
        this.showScreen('title-screen');
    },

    showLevelMap() {
        this.updateStarsDisplay(); // Header stars
        const container = document.getElementById('level-road-container');
        container.innerHTML = '';

        const userData = StorageManager.load();

        LevelConfig.forEach(level => {
            const node = document.createElement('div');
            const isUnlocked = level.id <= userData.maxLevelId;
            const stars = userData.stars[level.id] || 0;

            node.className = `level-node ${isUnlocked ? '' : 'locked'} ${stars > 0 ? 'cleared' : ''}`;
            node.innerText = level.id;

            if (isUnlocked) {
                node.onclick = () => this.startLevel(level.id);
            }

            // Stars display
            const starDiv = document.createElement('div');
            starDiv.className = 'level-stars';
            starDiv.innerHTML = '⭐️'.repeat(stars);
            node.appendChild(starDiv);

            container.appendChild(node);
        });

        this.showScreen('level-map-screen');
    },

    updateStarsDisplay() {
        document.getElementById('current-stars').innerText = StorageManager.getTotalStars();
    },

    startLevel(levelId) {
        this.currentLevelConfig = LevelConfig.find(l => l.id === levelId);
        this.correctCount = 0;
        this.requiredCount = 3; // Clear condition

        document.getElementById('current-level-display').innerText = levelId;
        document.getElementById('help-btn').classList.toggle('hidden', !this.currentLevelConfig.hasHelp);

        this.showScreen('game-screen');
        this.nextProblem();
    },

    nextProblem() {
        if (this.correctCount >= this.requiredCount) {
            this.showResult(true);
            return;
        }

        this.currentProblem = this.currentLevelConfig.generate();
        this.renderProblem();
        document.getElementById('help-btn').disabled = false;
        // Hide help overlay if persistent
        const helpOverlay = document.getElementById('visual-area').querySelector('.help-overlay');
        if (helpOverlay) helpOverlay.remove();
    },

    renderProblem() {
        const visualArea = document.getElementById('visual-area');
        const formulaArea = document.getElementById('formula-area');
        const optionsContainer = document.getElementById('options-container');

        visualArea.innerHTML = '';
        formulaArea.innerHTML = '';
        optionsContainer.innerHTML = '';

        const p = this.currentProblem;

        // Visual Rendering Strategies
        if (p.visuals && Array.isArray(p.visuals)) {
            visualArea.innerText = p.visuals.join(' ');
        } else if (p.type === 'compare_more_visual') {
            // Already handled in options for this specific type usually, but let's see.
            // Actually for compare_visual, we might want side-by-side in visual area?
            // Current logic puts options as buttons. Let's make buttons the visuals.
            visualArea.innerText = this.currentLevelConfig.description;
        } else if (p.type === 'add_visual') {
            const div = document.createElement('div');
            div.innerHTML = `${p.visualLeft.join('')}  ➕  ${p.visualRight.join('')}`;
            visualArea.appendChild(div);
        } else if (p.type === 'complement_10_visual') {
            // 10 frame render
            const grid = document.createElement('div');
            grid.style.display = 'grid';
            grid.style.gridTemplateColumns = 'repeat(5, 1fr)';
            grid.style.gap = '5px';
            grid.style.border = '2px solid #ccc';
            grid.style.padding = '5px';

            for (let i = 0; i < 10; i++) {
                const cell = document.createElement('div');
                cell.innerText = i < p.current ? '🍎' : '⚪️';
                grid.appendChild(cell);
            }
            visualArea.appendChild(grid);
        } else {
            visualArea.innerText = this.currentLevelConfig.description;
        }

        // Formula Rendering
        if (p.formula) {
            formulaArea.innerText = p.formula;
        } else if (p.target && p.type.startsWith('count')) {
            // formulaArea.innerText = "?"; // Maybe too abstract
        }

        // Options Rendering
        if (p.options) {
            p.options.forEach((opt, idx) => {
                const btn = document.createElement('button');
                btn.className = 'option-btn';
                btn.innerHTML = opt; // Allow emoji strings

                // Determine if correct
                let isCorrect = false;
                if (typeof p.correctIndex !== 'undefined') {
                    isCorrect = idx === p.correctIndex;
                } else if (typeof p.correctVal !== 'undefined') {
                    isCorrect = opt === p.correctVal;
                }

                btn.onclick = () => this.handleAnswer(isCorrect, btn);
                optionsContainer.appendChild(btn);
            });
        }

        // Input for Lv1 "Touch to count"
        if (p.type === 'count_touch') {
            optionsContainer.innerHTML = ''; // Clear buttons
            // Generate clickable apples in visual area
            visualArea.innerHTML = '';
            let touchedCount = 0;
            const target = p.target;

            for (let i = 0; i < target; i++) {
                const s = document.createElement('span');
                s.innerText = '🍎';
                s.style.cursor = 'pointer';
                s.style.opacity = '0.5';
                s.onclick = (e) => {
                    if (s.dataset.touched) return;
                    s.dataset.touched = true;
                    s.style.opacity = '1';
                    s.style.transform = 'scale(1.2)';
                    // Play pop sound
                    AudioManager.playPop();
                    touchedCount++;
                    // Show number temporarily? 
                    // Voice "One", "Two" would be good
                    if (touchedCount === target) {
                        setTimeout(() => {
                            // Success animation
                            this.showFeedback(true);
                            setTimeout(() => {
                                this.correctCount++;
                                this.nextProblem();
                            }, 1000);
                        }, 500);
                    }
                };
                visualArea.appendChild(s);
            }
        }
    },

    handleAnswer(isCorrect, btnElement) {
        if (isCorrect) {
            AudioManager.playCorrect();
            btnElement.style.background = '#95E1D3'; // Success color
            this.showFeedback(true);
            setTimeout(() => {
                this.correctCount++;
                this.nextProblem();
            }, 1000);
        } else {
            AudioManager.playWrong();
            btnElement.style.background = '#FF6B6B'; // Error color
            btnElement.classList.add('shake');
            setTimeout(() => btnElement.classList.remove('shake'), 500);
            // Don't advance, let them try again
        }
    },

    showFeedback(isCorrect) {
        const overlay = document.getElementById('feedback-overlay');
        const icon = document.getElementById('feedback-icon');
        const text = document.getElementById('feedback-text');

        overlay.classList.remove('hidden');
        icon.innerText = isCorrect ? '⭕️' : '❌';
        text.innerText = isCorrect ? 'すごい！' : 'ざんねん...';

        setTimeout(() => {
            overlay.classList.add('hidden');
        }, 800);
    },

    showResult(success) {
        this.showScreen('result-screen');
        const starsContainer = document.getElementById('result-stars');
        starsContainer.innerHTML = '';

        // Determine stars based on mistakes? Simplification: Clear = 3 stars for now
        const earnedStars = 3;
        starsContainer.innerHTML = '⭐️'.repeat(earnedStars);

        StorageManager.unlockNextLevel(this.currentLevelConfig.id);
        StorageManager.saveStars(this.currentLevelConfig.id, earnedStars);

        // Confetti effect could go here
    },

    toggleHelp() {
        const p = this.currentProblem;
        const visualArea = document.getElementById('visual-area');

        // Simple hint: Show dots/fingers
        if (p.hintDots) {
            // Check if already shown
            if (document.getElementById('hint-display')) return;

            const hintDiv = document.createElement('div');
            hintDiv.id = 'hint-display';
            hintDiv.style.color = '#888';
            hintDiv.style.marginTop = '10px';

            if (Array.isArray(p.hintDots)) {
                hintDiv.innerText = '●'.repeat(p.hintDots[0]) + '   ' + '●'.repeat(p.hintDots[1]);
            } else {
                hintDiv.innerText = '●'.repeat(p.hintDots);
            }
            visualArea.appendChild(hintDiv);
        } else if (p.type.includes('complement')) {
            // Visual hint for complement
            if (document.getElementById('hint-display')) return;
            const hintDiv = document.createElement('div');
            hintDiv.id = 'hint-display';
            hintDiv.style.color = '#AAA';
            hintDiv.innerText = 'Hint: Count the empty spaces!';
            visualArea.appendChild(hintDiv);
        }
    }
};

// --- 4. AudioManager (Web Audio API) ---
const AudioManager = {
    ctx: null,

    init() {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
        } catch (e) {
            console.warn("Web Audio API not supported");
        }
    },

    playTone(freq, type, duration, startTime = 0) {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime + startTime);

        gain.gain.setValueAtTime(0.1, this.ctx.currentTime + startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + startTime + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(this.ctx.currentTime + startTime);
        osc.stop(this.ctx.currentTime + startTime + duration);
    },

    playClick() {
        if (!this.ctx) this.init();
        if (this.ctx.state === 'suspended') this.ctx.resume();
        this.playTone(600, 'sine', 0.1);
    },

    playPop() {
        if (!this.ctx) this.init();
        if (this.ctx.state === 'suspended') this.ctx.resume();
        this.playTone(800 + Math.random() * 200, 'sine', 0.1);
    },

    playCorrect() {
        if (!this.ctx) this.init();
        if (this.ctx.state === 'suspended') this.ctx.resume();
        // Major chord arpeggio
        this.playTone(523.25, 'sine', 0.3, 0);   // C5
        this.playTone(659.25, 'sine', 0.3, 0.1); // E5
        this.playTone(783.99, 'sine', 0.4, 0.2); // G5
    },

    playWrong() {
        if (!this.ctx) this.init();
        if (this.ctx.state === 'suspended') this.ctx.resume();
        this.playTone(150, 'sawtooth', 0.3);
    }
};

// --- Modified GameEngine Integration ---
// (We will augment the existing GameEngine handles below)

// Initialize
window.onload = () => {
    GameEngine.init();
    // Pre-init audio on first interaction to unlock context
    document.body.addEventListener('click', () => {
        if (!AudioManager.ctx) AudioManager.init();
    }, { once: true });
};

