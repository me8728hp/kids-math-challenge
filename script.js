/**
 * Kids Math Challenge - Main Logic
 */

// --- Sound Manager ---
class SoundManager {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.ctx.createGain();
        this.masterGain.connect(this.ctx.destination);
        this.masterGain.gain.value = 0.5;
    }

    playTone(freq, type, duration) {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    playCorrect() {
        // Ding-dong!
        this.playTone(660, 'sine', 0.1);
        setTimeout(() => this.playTone(880, 'sine', 0.4), 100);
    }

    playWrong() {
        // Buu-buu
        this.playTone(150, 'sawtooth', 0.3);
        setTimeout(() => this.playTone(120, 'sawtooth', 0.3), 300);
    }

    playFanfare() {
        // Simple fanfare sequence
        const now = this.ctx.currentTime;
        [523, 659, 784, 1046].forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, 'square', 0.2), i * 150);
        });
    }
}

// --- User Manager ---
class UserManager {
    constructor() {
        this.users = JSON.parse(localStorage.getItem('kmc_users')) || [];
        this.currentUser = null;
    }

    addUser(name, birthYear) {
        const user = {
            id: Date.now().toString(),
            name: name,
            birthYear: birthYear,
            history: [] // { level: 1, score: 8, date: ... }
        };
        this.users.push(user);
        this.save();
        return user;
    }

    selectUser(userId) {
        this.currentUser = this.users.find(u => u.id === userId);
        return this.currentUser;
    }

    saveResult(level, score) {
        if (!this.currentUser) return;
        this.currentUser.history.push({
            level: level,
            score: score,
            timestamp: Date.now()
        });
        this.save();
    }

    save() {
        localStorage.setItem('kmc_users', JSON.stringify(this.users));
    }

    getUsers() {
        return this.users;
    }

    updateUser(id, name, birthYear) {
        const user = this.users.find(u => u.id === id);
        if (user) {
            user.name = name;
            user.birthYear = birthYear;
            this.save();
        }
    }

    deleteUser(id) {
        this.users = this.users.filter(u => u.id !== id);
        this.save();
        if (this.currentUser && this.currentUser.id === id) {
            this.currentUser = null;
        }
    }

    getLevelStats(userId) {
        const user = this.users.find(u => u.id === userId);
        if (!user) return {};

        const stats = {};
        user.history.forEach(h => {
            const lvl = h.level;
            if (!stats[lvl] || h.score > stats[lvl].score) {
                stats[lvl] = { score: h.score, date: h.timestamp };
            }
        });
        return stats;
    }
}

// --- Game Engine ---
class GameEngine {
    constructor() {
        this.emojis = ['🍎', '🍌', '🐶', '🐱', '🚗', '⭐️', '🎈', '🍪'];
    }

    generateQuestion(level) {
        let question = {};

        switch (parseInt(level)) {
            case 1: // Counting
                const count = Math.floor(Math.random() * 10) + 1;
                const emoji = this.emojis[Math.floor(Math.random() * this.emojis.length)];
                question = {
                    type: 'counting',
                    text: `${emoji} は いくつ？`,
                    formula: `Count: ?`,
                    visuals: Array(count).fill(emoji),
                    answer: count,
                    choices: this.generateChoices(count, 1, 10)
                };
                break;

            case 2: // Comparison
                // Choose two distinct numbers
                let n1 = Math.floor(Math.random() * 10) + 1;
                let n2 = Math.floor(Math.random() * 10) + 1;
                while (n1 === n2) n2 = Math.floor(Math.random() * 10) + 1;

                // Spec says "Choose the larger one" mainly
                const larger = Math.max(n1, n2);
                question = {
                    type: 'compare',
                    text: 'どっちが おおい？',
                    formula: `? > ?`,
                    visuals: [
                        { val: n1, label: `${n1}こ`, isCorrect: n1 === larger },
                        { val: n2, label: `${n2}こ`, isCorrect: n2 === larger }
                    ],
                    answer: larger,
                    choices: [n1, n2],
                    isComparison: true
                };
                break;

            case 3: // Sum to 5
                const target5 = 5;
                const a3 = Math.floor(Math.random() * (target5 + 1)); // 0 to 5
                const b3 = target5 - a3;
                question = {
                    type: 'calc',
                    text: `${a3} と なにで 5 ？`,
                    formula: `${a3} + ? = 5`,
                    visuals: [],
                    answer: b3,
                    choices: this.generateChoices(b3, 0, 5)
                };
                break;

            case 4: // Sum to 10
                const target10 = 10;
                const a4 = Math.floor(Math.random() * (target10 + 1));
                const b4 = target10 - a4;
                question = {
                    type: 'calc',
                    text: `${a4} と なにで 10 ？`,
                    formula: `${a4} + ? = 10`,
                    visuals: [],
                    answer: b4,
                    choices: this.generateChoices(b4, 0, 10)
                };
                break;

            case 5: // Addition up to 20 (no carry)
                let a5, b5;
                do {
                    a5 = Math.floor(Math.random() * 20) + 1;
                    b5 = Math.floor(Math.random() * (20 - a5)) + 1;
                } while ((a5 % 10) + (b5 % 10) >= 10 || (a5 + b5) > 20);

                question = {
                    type: 'calc',
                    text: `${a5} たす ${b5} は？`,
                    formula: `${a5} + ${b5} = ?`,
                    visuals: [],
                    answer: a5 + b5,
                    choices: this.generateChoices(a5 + b5, 1, 20)
                };
                break;
        }
        return question;
    }

    generateChoices(correct, min, max, count = 4) {
        const choices = new Set([correct]);
        while (choices.size < count) {
            const offset = Math.floor(Math.random() * 5) - 2;
            let wrong = correct + offset;
            if (wrong < min) wrong = min + Math.floor(Math.random() * 3);
            if (wrong > max) wrong = max - Math.floor(Math.random() * 3);
            if (wrong !== correct && wrong >= min && wrong <= max) {
                choices.add(wrong);
            }
            if (choices.size < count) {
                choices.add(Math.floor(Math.random() * (max - min + 1)) + min);
            }
        }
        return Array.from(choices).sort(() => Math.random() - 0.5);
    }
}

// --- Main App ---
class App {
    constructor() {
        this.userManager = new UserManager();
        this.soundManager = new SoundManager();
        this.gameEngine = new GameEngine();

        this.currentLevel = 0;
        this.currentQuestionIndex = 0;
        this.currentScore = 0;
        this.questions = [];
        this.wrongAnswers = [];
        this.editingUserId = null;

        this.initDOM();
        this.bindEvents();
        this.renderUserList();
    }

    initDOM() {
        this.screens = {
            user: document.getElementById('user-screen'),
            level: document.getElementById('level-screen'),
            game: document.getElementById('game-screen'),
            result: document.getElementById('result-screen')
        };
        this.elements = {
            userList: document.getElementById('user-list'),
            userNameInput: document.getElementById('user-name'),
            birthYearSelect: document.getElementById('birth-year'),
            currentUserName: document.getElementById('current-user-name'),
            questionText: document.getElementById('question-text'),
            questionFormula: document.getElementById('question-formula'),
            questionVisuals: document.getElementById('question-visuals'),
            optionsArea: document.getElementById('options-area'),
            scoreDisplay: document.getElementById('score-display'),
            progressFill: document.getElementById('progress-fill'),
            feedbackOverlay: document.getElementById('feedback-overlay'),
            resultTitle: document.getElementById('result-title'),
            resultScoreText: document.getElementById('result-score-text'),
            resultMessage: document.getElementById('result-message'),

            // Modal Elements
            editModal: document.getElementById('edit-modal'),
            editNameInput: document.getElementById('edit-name'),
            editBirthYearSelect: document.getElementById('edit-birth-year'),
            saveUserBtn: document.getElementById('save-user-btn'),
            deleteUserBtn: document.getElementById('delete-user-btn'),
            cancelEditBtn: document.getElementById('cancel-edit-btn')
        };
    }

    bindEvents() {
        // User Screen
        document.getElementById('start-btn').addEventListener('click', () => this.handleRegister());
        const updateBtn = document.getElementById('update-app-btn');
        if (updateBtn) updateBtn.addEventListener('click', () => this.handleAppUpdate());

        // Modal Events
        if (this.elements.saveUserBtn) this.elements.saveUserBtn.addEventListener('click', () => this.handleSaveUser());
        if (this.elements.deleteUserBtn) this.elements.deleteUserBtn.addEventListener('click', () => this.handleDeleteUser());
        if (this.elements.cancelEditBtn) this.elements.cancelEditBtn.addEventListener('click', () => this.closeModal());

        // Level Screen
        document.querySelectorAll('.level-btn').forEach(btn => {
            btn.addEventListener('click', () => this.startGame(btn.dataset.level));
        });
        document.getElementById('logout-btn').addEventListener('click', () => {
            this.userManager.currentUser = null;
            this.showScreen('user');
        });

        // Game Screen
        document.getElementById('quit-game-btn').addEventListener('click', () => this.showScreen('level'));

        // Result Screen
        document.getElementById('retry-btn').addEventListener('click', () => this.startGame(this.currentLevel));
        document.getElementById('home-btn').addEventListener('click', () => this.showScreen('level'));
    }

    showScreen(screenName) {
        Object.values(this.screens).forEach(el => el.classList.remove('active'));
        this.screens[screenName].classList.add('active');
        if (screenName === 'level') {
            this.updateLevelBadges();
        }
    }

    renderUserList() {
        const users = this.userManager.getUsers();
        this.elements.userList.innerHTML = '';
        users.forEach(user => {
            const wrapper = document.createElement('div');
            wrapper.style.display = 'inline-flex';
            wrapper.style.alignItems = 'center';
            wrapper.style.margin = '5px';

            const btn = document.createElement('button');
            btn.className = 'secondary-btn';
            btn.textContent = user.name;
            btn.onclick = () => {
                this.userManager.selectUser(user.id);
                this.updateUserInfo();
                this.showScreen('level');
            };

            const editBtn = document.createElement('button');
            editBtn.className = 'edit-user-btn';
            editBtn.textContent = '⚙️';
            editBtn.onclick = (e) => {
                e.stopPropagation();
                this.openEditModal(user);
            };

            wrapper.appendChild(btn);
            wrapper.appendChild(editBtn);
            this.elements.userList.appendChild(wrapper);
        });
    }

    openEditModal(user) {
        this.editingUserId = user.id;
        this.elements.editNameInput.value = user.name;
        this.elements.editBirthYearSelect.value = user.birthYear;
        this.elements.editModal.style.display = 'flex';
    }

    closeModal() {
        this.elements.editModal.style.display = 'none';
        this.editingUserId = null;
    }

    handleSaveUser() {
        if (!this.editingUserId) return;
        const name = this.elements.editNameInput.value.trim();
        const year = this.elements.editBirthYearSelect.value;
        if (name && year) {
            this.userManager.updateUser(this.editingUserId, name, year);
            this.renderUserList();
            this.closeModal();
            // If current user was edited, update name display
            if (this.userManager.currentUser && this.userManager.currentUser.id === this.editingUserId) {
                this.userManager.selectUser(this.editingUserId); // reload
                this.updateUserInfo();
            }
        }
    }

    handleDeleteUser() {
        if (!this.editingUserId) return;
        if (confirm('ほんとうに けす？')) {
            this.userManager.deleteUser(this.editingUserId);
            this.renderUserList();
            this.closeModal();
        }
    }

    updateLevelBadges() {
        if (!this.userManager.currentUser) return;
        const stats = this.userManager.getLevelStats(this.userManager.currentUser.id);
        document.querySelectorAll('.level-btn').forEach(btn => {
            const level = btn.dataset.level;
            const existing = btn.querySelector('.score-badge');
            if (existing) existing.remove();

            if (stats[level]) {
                const badge = document.createElement('div');
                badge.className = 'score-badge';
                badge.textContent = `${stats[level].score}/10`;
                btn.appendChild(badge);
            }
        });
    }

    handleRegister() {
        const name = this.elements.userNameInput.value.trim();
        const age = this.elements.birthYearSelect.value;
        if (name && age) {
            this.userManager.addUser(name, age);
            const users = this.userManager.getUsers();
            this.userManager.selectUser(users[users.length - 1].id);
            this.updateUserInfo();
            this.renderUserList();
            this.elements.userNameInput.value = '';
            this.elements.birthYearSelect.value = '';
            this.showScreen('level');
        } else {
            alert('おなまえと 年齢を おしえてね！');
        }
    }

    updateUserInfo() {
        if (this.userManager.currentUser) {
            this.elements.currentUserName.textContent = `${this.userManager.currentUser.name} くん/ちゃん`;
        }
    }

    startGame(level) {
        this.currentLevel = parseInt(level);
        this.currentQuestionIndex = 0;
        this.currentScore = 0;
        this.wrongAnswers = [];
        this.questions = [];

        // Generate 10 questions, avoiding consecutive duplicates
        let lastQ = null;
        for (let i = 0; i < 10; i++) {
            let q;
            let attempts = 0;
            do {
                q = this.gameEngine.generateQuestion(this.currentLevel);
                attempts++;
            } while (lastQ && q.text === lastQ.text && attempts < 5);

            this.questions.push(q);
            lastQ = q;
        }

        this.showScreen('game');
        this.renderQuestion();
    }

    renderQuestion() {
        const q = this.questions[this.currentQuestionIndex];

        this.elements.scoreDisplay.textContent = `${this.currentQuestionIndex + 1} / 10`;
        this.elements.progressFill.style.width = `${((this.currentQuestionIndex) / 10) * 100}%`;

        this.elements.questionText.textContent = q.text;
        // Make sure formula element exists
        if (this.elements.questionFormula) {
            this.elements.questionFormula.textContent = q.formula || '';
        }

        this.elements.questionVisuals.innerHTML = '';
        this.elements.optionsArea.innerHTML = '';

        if (q.type === 'compare') {
            q.visuals.forEach(group => {
                const btn = document.createElement('button');
                btn.className = 'option-btn';
                btn.style.width = '200px';
                btn.style.height = '150px';
                btn.style.borderRadius = '20px';
                btn.innerHTML = `<div>${group.val}</div><div style="font-size:1.5rem">${this.gameEngine.emojis[0].repeat(group.val)}</div>`;
                btn.onclick = () => this.handleAnswer(group.val, q.answer);
                this.elements.optionsArea.appendChild(btn);
            });
        } else {
            if (q.visuals && q.visuals.length > 0) {
                q.visuals.forEach(v => {
                    const el = document.createElement('div');
                    el.className = 'visual-item';
                    el.textContent = v;
                    this.elements.questionVisuals.appendChild(el);
                });
            }

            q.choices.forEach(choice => {
                const btn = document.createElement('button');
                btn.className = 'option-btn';
                btn.textContent = choice;
                btn.onclick = (e) => this.handleAnswer(choice, q.answer, e.target);
                this.elements.optionsArea.appendChild(btn);
            });
        }
    }

    handleAnswer(selected, correct, btnElement) {
        if (selected == correct) {
            this.currentScore++;
            this.soundManager.playCorrect();
            this.showFeedback(true);
            this.nextQuestion();
        } else {
            this.soundManager.playWrong();
            if (btnElement) {
                btnElement.classList.add('shake');
                setTimeout(() => btnElement.classList.remove('shake'), 500);
            }
            this.wrongAnswers.push({
                q: this.questions[this.currentQuestionIndex],
                yourAns: selected
            });
            this.showFeedback(false);
            this.nextQuestion();
        }
    }

    showFeedback(isCorrect) {
        const overlay = this.elements.feedbackOverlay;
        overlay.textContent = isCorrect ? '⭕️' : '❌';
        overlay.className = isCorrect ? 'correct' : 'wrong';
        overlay.style.opacity = '1';

        setTimeout(() => {
            overlay.style.opacity = '0';
        }, 800);
    }

    nextQuestion() {
        setTimeout(() => {
            this.currentQuestionIndex++;
            if (this.currentQuestionIndex < 10) {
                this.renderQuestion();
            } else {
                this.endGame();
            }
        }, 1000);
    }

    endGame() {
        this.userManager.saveResult(this.currentLevel, this.currentScore);
        this.soundManager.playFanfare();
        this.showScreen('result');

        this.elements.resultScoreText.textContent = `10もんちゅう ${this.currentScore}もん せいかい！`;

        let msg = '';
        if (this.currentScore === 10) msg = 'すごい！てんさいだね！💯';
        else if (this.currentScore >= 7) msg = 'とってもじょうず！🌟';
        else if (this.currentScore >= 4) msg = 'がんばったね！👍';
        else msg = 'もう少し！いっしょにがんばろう💪';

        this.elements.resultMessage.textContent = msg;
    }

    handleAppUpdate() {
        if (!confirm('アプリをこうしん しますか？')) return;

        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(registrations => {
                for (let registration of registrations) {
                    registration.unregister();
                }
                // Clear caches
                caches.keys().then(names => {
                    for (let name of names) caches.delete(name);
                }).then(() => {
                    window.location.reload(true);
                });
            });
        } else {
            window.location.reload(true);
        }
    }
}

// Start App
window.addEventListener('DOMContentLoaded', () => {
    new App();
});
