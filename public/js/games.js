// ====================================================
// 暧昧实验室 - 全部游戏玩法（Premium Redesign）
// 设计原则：多步骤、可互动、有积分和回合、视觉反馈
// ====================================================

// ----- 全局游戏工具 -----
const GameTools = {
    getPlayerName(role) {
        const key = role === 'A' ? 'nameA' : 'nameB';
        let name = localStorage.getItem(key);
        if (!name) {
            name = role === 'A' ? '亲爱的他' : '亲爱的她';
        }
        return name;
    },
    setPlayerName(role, name) {
        const key = role === 'A' ? 'nameA' : 'nameB';
        localStorage.setItem(key, name);
    },
    shuffle(arr) {
        const a = [...arr];
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    },
    renderScoreBar(scoreA, scoreB, nameA, nameB, round, total, extraLabel) {
        return `
          <div class="score-bar">
            <div class="score-player">
              <span class="score-emoji">🧑</span>
              <span class="score-name">${nameA}</span>
              <span class="score-num" id="scoreANum">${scoreA}</span>
            </div>
            <div class="score-center">
              <span class="score-round">${extraLabel ? extraLabel + '<br>' : ''}第 ${round} / ${total} 轮</span>
            </div>
            <div class="score-player right">
              <span class="score-num" id="scoreBNum">${scoreB}</span>
              <span class="score-name">${nameB}</span>
              <span class="score-emoji">👩</span>
            </div>
          </div>`;
    },
    startTimer(seconds, onTick, onDone) {
        clearInterval(window.__loveTimer);
        let remaining = seconds;
        onTick(remaining);
        window.__loveTimer = setInterval(() => {
            remaining--;
            onTick(remaining);
            if (remaining <= 0) {
                clearInterval(window.__loveTimer);
                onDone();
            }
        }, 1000);
    },
    stopTimer() {
        clearInterval(window.__loveTimer);
    }
};

// 游戏状态
const GameState = {
    cardDuel: { score: [0, 0], history: [], round: 1, phase: 'choose', cardA: null, cardB: null, specialUsed: { A: null, B: null } },
    truthDare: { history: [], idx: 0, currentLevel: 'warm', refused: 0 },
    loveQuiz: { score: [0, 0], idx: 0, total: 8, history: [], currentQ: null, currentRole: null, hintShown: false, hintTimer: null },
    wheel: { spinning: false, history: [], tickets: 3, pool: WISH_BANK },
    coupleDare: { idx: 0, history: [], score: [0, 0], tasks: [], totalRounds: 5, starsTotal: 0, difficulty: null, currentTask: null },
    quizBattle: { idx: 0, score: [0, 0], total: 10, history: [], questions: [], buzzerLocked: false, buzzerOwner: null, answerPhase: false, buzzerTimer: null, questionTimer: null, showBuzzer: false },
    desertIsland: { phase: 'intro', round: 1, total: 3, romancePts: 0, survivalPts: 0, choiceHistory: [], scenarioIdx: 0, pickedA: null, pickedB: null },
    coupleTimer: { timeA: 0, timeB: 0, finished: [false, false], total: 30, history: [] },
    secretGenerator: { used: [] },
    kissGame: { idx: 0, used: [] },
    massage: { idx: 0, lastCoupon: null },
    loveLetter: { completed: [] },
    dreamList: { idx: 0 },
    hotSeat: { idx: 0, score: [0, 0] }
};

const TOTAL_ROUNDS = 5;
const PLAYER_A = 'A';
const PLAYER_B = 'B';

// ====================================================
// 游戏分发
// ====================================================
function goToMenu() {
    showScreen('welcomeScreen');
}

function goToMenuAndRecord(gameId, scoreA, scoreB) {
    recordGameEnd(gameId, scoreA, scoreB);
    goToMenu();
}

function recordGoToMenu(gameId, scoreA, scoreB) {
    recordGameEnd(gameId, scoreA, scoreB);
    goToMenu();
}

function recordGameEnd(gameId, scoreA, scoreB) {
    const user = Auth.currentUser();
    if (!user) return;
    const played = parseInt(localStorage.getItem(`played_${gameId}`) || '0');
    localStorage.setItem(`played_${gameId}`, played + 1);
}

function startGame(gameType) {
    if (!requireLoginToPlay()) return;
    const user = Auth.currentUser();
    const privateGames = ['kissGame','massage','secretGenerator','hotSeat','loveLetter','dreamList','coupleTimer','truthDare'];
    if (privateGames.includes(gameType) && !user?.is_vip) {
        showModal('需要私密模式', '该游戏为私密模式专属，请先解锁');
        setTimeout(() => showScreen('paymentScreen'), 1200);
        return;
    }
    const handler = {
        cardDuel: openCardDuel,
        truthDare: openTruthDare,
        loveQuiz: openLoveQuiz,
        wheel: openWheel,
        coupleDare: openCoupleDare,
        quizBattle: openQuizBattle,
        desertIsland: openDesertIsland,
        kissGame: openKissGame,
        massage: openMassage,
        coupleTimer: openCoupleTimer,
        secretGenerator: openSecretGenerator,
        loveLetter: openLoveLetter,
        dreamList: openDreamList,
        hotSeat: openHotSeat
    }[gameType];
    if (handler) handler();
    else showModal('即将上线', '该玩法正在打磨中，敬请期待 💕');
}

// ====================================================
// 【私密】情侣秒表挑战
// ====================================================
function openCoupleTimer() {
    GameState.coupleTimer = {
        timeA: 0, timeB: 0, finished: [false, false], total: 30, history: []
    };
    showScreen('coupleTimerScreen');
    renderCoupleTimer();
}

function renderCoupleTimer() {
    const nameA = GameTools.getPlayerName('A');
    const nameB = GameTools.getPlayerName('B');
    const game = GameState.coupleTimer;

    document.getElementById('coupleTimerInfo').innerHTML = GameInfo.coupleTimer;
    document.getElementById('coupleTimerArea').innerHTML = `
      <div class="play-area">
        <p class="task-sub">目标: ${game.total} 秒，先撑不住的接受小挑战</p>
        <div class="wheel-reel" style="margin: 16px 0;">
          <div class="wheel-cell" style="height:auto;padding:18px;">
            <div style="display:flex;justify-content:space-around;align-items:center;">
              <div style="text-align:center;">
                <div style="font-size:2.6rem;">🧑</div>
                <div>${nameA}</div>
                <div class="timer" id="timerA">${game.timeA}s</div>
              </div>
              <div style="font-size:2.6rem;font-weight:800;">VS</div>
              <div style="text-align:center;">
                <div style="font-size:2.6rem;">👩</div>
                <div>${nameB}</div>
                <div class="timer" id="timerB">${game.timeB}s</div>
              </div>
            </div>
          </div>
        </div>
        <div class="btn-row">
          <button class="btn-primary" onclick="coupleTimerTick('A')">${nameA} 撑住了</button>
          <button class="btn-primary" onclick="coupleTimerTick('B')">${nameB} 撑住了</button>
          <button class="btn-primary btn-danger" onclick="coupleTimerFail()">😅 我先认输</button>
        </div>
      </div>`;
}

function coupleTimerTick(role) {
    const game = GameState.coupleTimer;
    if (game.finished[role === 'A' ? 0 : 1]) return;
    if (role === 'A') game.timeA++;
    else game.timeB++;
    const el = document.getElementById('timer' + role);
    if (el) el.textContent = (role === 'A' ? game.timeA : game.timeB) + 's';
    if (Math.max(game.timeA, game.timeB) >= game.total) {
        const winner = game.timeA === game.timeB ? null : (game.timeA > game.timeB ? 'A' : 'B');
        showModal('挑战完成', winner
            ? `🏆 ${GameTools.getPlayerName(winner)} 赢啦！输家请喂赢家吃一口零食 🍫`
            : '平局！双双获得鼓励拥抱一次 💕');
        GameState.coupleTimer.finished = [true, true];
    }
}

function coupleTimerFail() {
    showModal('认输', '接受 30 秒拥抱或者一段撒娇吧 ✨');
    GameState.coupleTimer = { timeA: 0, timeB: 0, finished: [true, true], total: 30, history: [] };
    renderCoupleTimer();
}

// ====================================================
// 【免费】卡牌对决 - 命运之轮（5轮·特殊牌·三局两胜）
// ====================================================
function openCardDuel() {
    GameState.cardDuel = {
        score: [0, 0],
        history: [],
        round: 1,
        phase: 'choose',    // choose | special | reveal | result | anim
        cardA: null,
        cardB: null,
        specialUsed: { A: null, B: null },
        specialA: null,
        specialB: null,
        specialReveal: null  // 'lightning' | 'redraw' | 'peek'
    };
    showScreen('cardDuelScreen');
    renderCardDuel();
}

function renderCardDuel() {
    const game = GameState.cardDuel;
    const nameA = GameTools.getPlayerName('A');
    const nameB = GameTools.getPlayerName('B');
    const roundTotal = 5;
    const isFinished = game.round > roundTotal;

    document.getElementById('cardDuelInfo').innerHTML = GameInfo.cardDuel;

    // ---- 结束画面 ----
    if (isFinished || game.phase === 'result') {
        const winner = game.score[0] === game.score[1] ? null : (game.score[0] > game.score[1] ? nameA : nameB);
        const title = winner ? `🏆 ${winner} 获胜！` : '🤝 平局！';
        const desc = winner ? `最终比分 ${game.score[0]} : ${game.score[1]}` : '势均力敌，再来一局？';
        document.getElementById('cardDuelScore').innerHTML = GameTools.renderScoreBar(game.score[0], game.score[1], nameA, nameB, roundTotal, roundTotal);
        document.getElementById('cardDuelArea').innerHTML = `
          <div class="play-area duel-result">
            <div class="result-emoji">${winner ? '🏆' : '💕'}</div>
            <h2 class="result-title">${title}</h2>
            <p class="result-desc">${desc}</p>
            <div class="result-stats">
              ${game.history.map((h, i) => `<div class="history-item">第${i + 1}轮：${h.label}</div>`).join('')}
            </div>
            <div class="btn-row">
              <button class="btn-primary" onclick="openCardDuel()">再来一局</button>
              <button class="btn-ghost" onclick="recordGoToMenu('cardDuel', game.score[0], game.score[1])">返回菜单</button>
            </div>
          </div>`;
        return;
    }

    // ---- 翻牌动画画面 ----
    if (game.phase === 'reveal') {
        document.getElementById('cardDuelScore').innerHTML = GameTools.renderScoreBar(game.score[0], game.score[1], nameA, nameB, game.round, roundTotal);
        document.getElementById('cardDuelArea').innerHTML = `
          <div class="play-area">
            <div class="round-announce">第 ${game.round} 轮</div>
            <div class="card-row duel-reveal-row">
              <div class="duel-card-wrapper">
                <div class="duel-card duel-flip-a" id="duelCardA">
                  <div class="duel-card-back">🂠</div>
                  <div class="duel-card-front">
                    <div class="duel-card-points">${game.cardA.points}</div>
                    <div class="duel-card-name">${nameA}</div>
                  </div>
                </div>
                ${game.specialA ? `<div class="special-badge">${game.specialA.icon}</div>` : ''}
              </div>
              <div class="vs-text duel-vs">VS</div>
              <div class="duel-card-wrapper">
                <div class="duel-card duel-flip-b" id="duelCardB">
                  <div class="duel-card-back">🂠</div>
                  <div class="duel-card-front">
                    <div class="duel-card-points">${game.cardB.points}</div>
                    <div class="duel-card-name">${nameB}</div>
                  </div>
                </div>
                ${game.specialB ? `<div class="special-badge">${game.specialB.icon}</div>` : ''}
              </div>
            </div>
            <div class="reveal-result" id="revealResult" style="display:none;"></div>
          </div>`;

        setTimeout(() => {
            document.getElementById('duelCardA')?.classList.add('flipped');
            document.getElementById('duelCardB')?.classList.add('flipped');
        }, 100);

        setTimeout(() => {
            handleCardReveal();
        }, 900);
        return;
    }

    // ---- 特殊牌处理画面 ----
    if (game.phase === 'special') {
        renderSpecialPhase();
        return;
    }

    // ---- 选卡画面 ----
    const cards = [
        { id: 1, points: 1, label: '1分卡', color: '#06b6d4' },
        { id: 2, points: 2, label: '2分卡', color: '#10b981' },
        { id: 3, points: 3, label: '3分卡', color: '#f59e0b' },
    ];
    // 随机特殊牌（20%概率出现闪电/重赛/偷看）
    const specialRoll = Math.random();
    let specialCard = null;
    if (specialRoll < 0.07) {
        specialCard = { type: 'lightning', icon: '⚡', label: '闪电（直接获胜）' };
    } else if (specialRoll < 0.14) {
        specialCard = { type: 'redraw', icon: '🔄', label: '重赛（本轮重抽）' };
    } else if (specialRoll < 0.20) {
        specialCard = { type: 'peek', icon: '👁', label: '偷看（查看对方卡）' };
    }
    const displayCards = specialCard ? [...cards, { id: 'special', points: specialCard.type === 'lightning' ? 99 : 0, label: specialCard.label, icon: specialCard.icon, color: '#a855f7', special: true }] : cards;

    document.getElementById('cardDuelScore').innerHTML = GameTools.renderScoreBar(game.score[0], game.score[1], nameA, nameB, game.round, roundTotal);
    document.getElementById('cardDuelArea').innerHTML = `
      <div class="play-area">
        <div class="round-announce">第 ${game.round} / 5 轮 · 选择你的卡牌</div>
        <p class="task-sub">两人同时选择，选好后点击"确认出牌"一起翻牌</p>
        <div class="card-choice-grid">
          ${displayCards.map(c => `
            <div class="card-choice-btn ${c.special ? 'card-special' : ''}" onclick="selectDuelCard('${c.id}', ${c.points}, '${c.label}', '${c.icon || ''}', '${c.special || ''}')" id="cardChoice${c.id}" style="--card-color:${c.color}">
              <div class="card-choice-icon">${c.special ? c.icon : c.points}</div>
              <div class="card-choice-label">${c.label}</div>
            </div>
          `).join('')}
        </div>
        <div class="duel-selected-display">
          <div class="duel-selected-player">
            <span class="duel-player-label">${nameA}</span>
            <span class="duel-selected-card" id="selectedA">未选</span>
          </div>
          <div class="duel-selected-vs">VS</div>
          <div class="duel-selected-player">
            <span class="duel-selected-card" id="selectedB">未选</span>
            <span class="duel-player-label">${nameB}</span>
          </div>
        </div>
        <div class="btn-row">
          <button class="btn-primary" onclick="confirmDuelCards()" id="confirmBtn" disabled>确认出牌</button>
          <button class="btn-ghost" onclick="openCardDuel()">重置</button>
        </div>
      </div>`;
}

function selectDuelCard(id, points, label, icon, isSpecial) {
    const game = GameState.cardDuel;
    if (game.selectedA === null) {
        game.selectedA = { id, points, label, icon, isSpecial: isSpecial === 'true' || isSpecial === 'lightning' || isSpecial === 'redraw' || isSpecial === 'peek' };
        document.getElementById('selectedA').textContent = icon ? `${icon} ${label}` : `选${label}`;
        document.getElementById('cardChoice' + id)?.classList.add('selected');
    }
    if (document.getElementById('confirmBtn')) {
        document.getElementById('confirmBtn').disabled = false;
    }
}

function confirmDuelCards() {
    const game = GameState.cardDuel;
    if (game.selectedA === null) return;

    // 对方由系统随机决定（模拟另一玩家）
    const allCards = [
        { id: 1, points: 1, label: '1分卡', icon: '' },
        { id: 2, points: 2, label: '2分卡', icon: '' },
        { id: 3, points: 3, label: '3分卡', icon: '' },
    ];
    // 对方有30%概率也有特殊牌
    const enemySpecialRoll = Math.random();
    if (enemySpecialRoll < 0.07) {
        allCards.push({ id: 'special_e', points: 99, label: '闪电', icon: '⚡', isSpecial: true });
    } else if (enemySpecialRoll < 0.14) {
        allCards.push({ id: 'special_e', points: 0, label: '重赛', icon: '🔄', isSpecial: true });
    } else if (enemySpecialRoll < 0.20) {
        allCards.push({ id: 'special_e', points: 0, label: '偷看', icon: '👁', isSpecial: true });
    }
    const enemyChoice = allCards[Math.floor(Math.random() * allCards.length)];

    game.cardA = { ...game.selectedA };
    game.cardB = { ...enemyChoice, nameB: true };
    game.specialA = game.selectedA.isSpecial ? game.selectedA : null;
    game.specialB = enemyChoice.isSpecial ? enemyChoice : null;
    game.phase = 'reveal';
    game.selectedA = null;
    renderCardDuel();
}

function handleCardReveal() {
    const game = GameState.cardDuel;
    const nameA = GameTools.getPlayerName('A');
    const nameB = GameTools.getPlayerName('B');

    // 检查闪电牌（直接获胜）
    if (game.specialA?.isSpecial === true && game.cardA.label?.includes('闪电')) {
        game.score[0] += 1;
        game.history.push({ label: `⚡ ${nameA} 使用闪电牌获胜！`, won: 'A' });
        showResultAndAdvance();
        return;
    }
    if (game.specialB?.isSpecial === true && game.cardB.label?.includes('闪电')) {
        game.score[1] += 1;
        game.history.push({ label: `⚡ ${nameB} 使用闪电牌获胜！`, won: 'B' });
        showResultAndAdvance();
        return;
    }

    // 检查偷看牌
    if (game.specialA?.isSpecial === true && game.cardA.label?.includes('偷看')) {
        game.phase = 'peek';
        renderPeekPhase();
        return;
    }
    if (game.specialB?.isSpecial === true && game.cardB.label?.includes('偷看')) {
        game.phase = 'peek';
        renderPeekPhase(true);
        return;
    }

    // 检查重赛牌
    if (game.specialA?.isSpecial === true && game.cardA.label?.includes('重赛')) {
        game.history.push({ label: `🔄 ${nameA} 使用重赛牌，本轮重来！`, won: 'draw' });
        showResultAndAdvance();
        return;
    }
    if (game.specialB?.isSpecial === true && game.cardB.label?.includes('重赛')) {
        game.history.push({ label: `🔄 ${nameB} 使用重赛牌，本轮重来！`, won: 'draw' });
        showResultAndAdvance();
        return;
    }

    // 普通比大小
    const resultEl = document.getElementById('revealResult');
    if (game.cardA.points > game.cardB.points) {
        game.score[0] += 1;
        game.history.push({ label: `🎉 ${nameA} 获胜！${game.cardA.label} 胜 ${game.cardB.label}`, won: 'A' });
        if (resultEl) resultEl.innerHTML = `<div class="round-win-text">🎉 ${nameA} 本轮获胜！</div>`;
    } else if (game.cardB.points > game.cardA.points) {
        game.score[1] += 1;
        game.history.push({ label: `🎉 ${nameB} 获胜！${game.cardB.label} 胜 ${game.cardA.label}`, won: 'B' });
        if (resultEl) resultEl.innerHTML = `<div class="round-win-text">🎉 ${nameB} 本轮获胜！</div>`;
    } else {
        game.history.push({ label: `🤝 平局！${game.cardA.label} = ${game.cardB.label}`, won: 'draw' });
        if (resultEl) resultEl.innerHTML = `<div class="round-win-text">🤝 平局！</div>`;
    }
    if (resultEl) resultEl.style.display = 'block';
    showResultAndAdvance();
}

function showResultAndAdvance() {
    setTimeout(() => {
        const game = GameState.cardDuel;
        game.round++;
        game.phase = game.round > 5 ? 'result' : 'choose';
        if (game.phase === 'result') {
            game.phase = 'result';
        }
        renderCardDuel();
    }, 1800);
}

function renderPeekPhase(isEnemyPeek = false) {
    const game = GameState.cardDuel;
    const nameA = GameTools.getPlayerName('A');
    const nameB = GameTools.getPlayerName('B');
    const peekerName = isEnemyPeek ? nameB : nameA;
    const targetName = isEnemyPeek ? nameA : nameB;
    const targetCard = isEnemyPeek ? game.cardA : game.cardB;

    document.getElementById('cardDuelArea').innerHTML = `
      <div class="play-area peek-phase">
        <div class="peek-icon">👁</div>
        <h3>${peekerName} 使用了偷看牌！</h3>
        <p class="task-sub">偷偷看了 ${targetName} 的卡牌...</p>
        <div class="peek-card-reveal">
          <div class="peek-card-name">${targetName} 的卡牌</div>
          <div class="peek-card-value">${targetCard.label}</div>
        </div>
        <p class="peek-hint">${peekerName} 记住啦！1秒后隐藏...</p>
      </div>`;

    setTimeout(() => {
        const peekEl = document.querySelector('.peek-card-reveal');
        if (peekEl) peekEl.classList.add('peek-hidden');
    }, 1500);

    setTimeout(() => {
        // 偷看后继续比大小
        const resultEl = document.getElementById('revealResult') || { style: { display: '' }, innerHTML: '' };
        const r = { style: { display: 'block' } };
        if (game.cardA.points > game.cardB.points) {
            game.score[0] += 1;
            game.history.push({ label: `🎉 ${nameA} 获胜！${game.cardA.label} 胜 ${game.cardB.label}`, won: 'A' });
        } else if (game.cardB.points > game.cardA.points) {
            game.score[1] += 1;
            game.history.push({ label: `🎉 ${nameB} 获胜！${game.cardB.label} 胜 ${game.cardA.label}`, won: 'B' });
        } else {
            game.history.push({ label: `🤝 平局！`, won: 'draw' });
        }
        showResultAndAdvance();
    }, 2800);
}

function renderSpecialPhase() {
    const game = GameState.cardDuel;
    const nameA = GameTools.getPlayerName('A');
    const nameB = GameTools.getPlayerName('B');
    // handled inline
}

// ====================================================
// 【免费】真心话大冒险
// ====================================================
const TRUTH_DARE_ITEMS = [
    { type: 'truth', level: 'warm', text: '第一次见到对方，心里在想什么？' },
    { type: 'truth', level: 'warm', text: '你最喜欢对方哪一个部位？' },
    { type: 'dare', level: 'warm', text: '和对方十指相扣30秒不说话' },
    { type: 'dare', level: 'warm', text: '喂对方喝一口水' },
    { type: 'truth', level: 'warm', text: '对方做的哪道菜让你最难忘？' },
    { type: 'truth', level: 'flirt', text: '描述你最想把对方推倒在床的瞬间' },
    { type: 'dare', level: 'flirt', text: '含一颗葡萄，用嘴喂给对方' },
    { type: 'dare', level: 'flirt', text: '让对方从脖子一路轻吻到耳根' },
    { type: 'truth', level: 'flirt', text: '你在什么时刻最想扑倒对方？' },
    { type: 'dare', level: 'flirt', text: '蒙眼亲吻对方身体任意部位三次' },
    { type: 'truth', level: 'spicy', text: '你最近一次自慰时想的是谁？' },
    { type: 'dare', level: 'spicy', text: '让对方在身上任意位置留下一个唇印' },
    { type: 'dare', level: 'spicy', text: '互相脱掉一件外衣，输家听从赢家指挥' },
    { type: 'truth', level: 'spicy', text: '你最想让对方在哪个场合被你「欺负」？' },
    { type: 'dare', level: 'spicy', text: '把自己的一件贴身衣物交给对方保管到下次见面' }
];

function openTruthDare() {
    GameState.truthDare = { history: [], idx: 0, currentLevel: 'warm', refused: 0 };
    showScreen('truthDareScreen');
    renderTruthDare('home');
}

function renderTruthDare(state, data = {}) {
    const game = GameState.truthDare;
    const nameA = GameTools.getPlayerName('A');
    const nameB = GameTools.getPlayerName('B');

    document.getElementById('truthDareInfo').innerHTML = GameInfo.truthDare;

    if (state === 'home') {
        document.getElementById('truthDareScore').innerHTML = '';
        document.getElementById('truthDareArea').innerHTML = `
          <div class="play-area">
            <div style="font-size: 3rem;">🎰</div>
            <h3>选择难度</h3>
            <div class="level-row">
              <button class="btn-primary level-chip" data-level="warm" onclick="chooseTruthLevel('warm')">💕 暖场级</button>
              <button class="btn-primary level-chip" data-level="flirt" onclick="chooseTruthLevel('flirt')">🔥 心动级</button>
              <button class="btn-primary level-chip" data-level="spicy" onclick="chooseTruthLevel('spicy')">🌶 刺激级</button>
            </div>
            <p class="task-sub">难度越高，内容越亲密</p>
            <button class="btn-primary" onclick="randomTruthDare()">🎲 随机模式</button>
          </div>`;
        return;
    }
    if (state === 'task') {
        const task = data.task;
        const actor = data.actor;
        const actorName = actor === 'A' ? nameA : nameB;
        const targetName = actor === 'A' ? nameB : nameA;
        const levelText = { warm: '暖场级', flirt: '心动级', spicy: '刺激级' }[task.level];
        const typeText = task.type === 'truth' ? '真心话' : '大冒险';
        const typeColor = task.type === 'truth' ? '#ff8fab' : '#ff6b9d';
        document.getElementById('truthDareScore').innerHTML = '';
        document.getElementById('truthDareArea').innerHTML = `
          <div class="play-area">
            <div class="task-header">
              <span class="task-level-badge" style="background:${typeColor}">${levelText} · ${typeText}</span>
              <span class="task-sub">${actorName} 抽到了任务</span>
            </div>
            <div class="task-main">${task.text}</div>
            <p class="task-sub">对方：${targetName}</p>
            <p class="task-sub">完成任务后告诉对方，或者选择「拒绝」接受惩罚 ✨</p>
            <div class="btn-row">
              <button class="btn-primary" onclick="completeTruthDare()">✅ 完成</button>
              <button class="btn-primary btn-danger" onclick="refuseTruthDare()">😣 拒绝（接受小惩罚）</button>
            </div>
            <button class="btn-ghost" onclick="renderTruthDare('home')">退出</button>
          </div>
          ${game.history.length > 0 ? `<div class="history"><h3>本轮记录</h3>${game.history.slice(-3).map((h, i) => `<div class="history-item">${h}</div>`).join('')}</div>` : ''}`;
        return;
    }
}

function chooseTruthLevel(level) {
    GameState.truthDare.currentLevel = level;
    spinTruthDare();
}

function randomTruthDare() {
    GameState.truthDare.currentLevel = ['warm', 'flirt', 'spicy'][Math.floor(Math.random() * 3)];
    spinTruthDare();
}

function spinTruthDare() {
    const game = GameState.truthDare;
    const list = TRUTH_DARE_ITEMS.filter(t => t.level === game.currentLevel);
    const item = list[Math.floor(Math.random() * list.length)];
    const actor = Math.random() < 0.5 ? 'A' : 'B';
    __tdActorCache = actor;
    __tdTaskCache = item.text;
    renderTruthDare('task', { task: item, actor });
}

function completeTruthDare() {
    const game = GameState.truthDare;
    game.history.push(`✅ ${actorTextForTD()} 完成：${lastTaskText()}`);
    showToast('太棒了！获得奖励积分 +1');
    renderTruthDare('home');
}

function refuseTruthDare() {
    const game = GameState.truthDare;
    game.refused++;
    game.history.push(`😣 ${actorTextForTD()} 拒绝任务`);
    showToast('接受小惩罚：今晚让对方点外卖');
    renderTruthDare('home');
}

let __tdActorCache = '';
let __tdTaskCache = '';
function setTDCache(actor, task) {
    __tdActorCache = actor;
    __tdTaskCache = task.text;
}
function actorTextForTD() {
    return GameTools.getPlayerName(__tdActorCache);
}
function lastTaskText() {
    return __tdTaskCache;
}

// ====================================================
// 【免费】心有灵犀 - 默契问答（8题·描述猜词·计时·评分）
// ====================================================
const LOVE_QUIZ_BANK = {
    A: [
        { q: 'TA 的口头禅是什么？', hint: '2个字', options: ['随便', '好的', '嗯嗯', '哎呀'] },
        { q: 'TA 最讨厌的食物是？', hint: '2个字', options: ['香菜', '葱', '苦瓜', '肥肉'] },
        { q: 'TA 最喜欢什么类型的电影？', hint: '2个字', options: ['喜剧', '悬疑', '爱情', '动作'] },
        { q: 'TA 心情不好时会做什么？', hint: '3个字', options: ['睡觉', '刷手机', '吃东西', '发呆'] },
        { q: 'TA 约会时迟到会怎么办？', hint: '3个字', options: ['找借口', '撒娇', '装没事', '生气'] },
        { q: 'TA 最喜欢什么颜色？', hint: '2个字', options: ['蓝色', '粉色', '黑色', '白色'] },
        { q: 'TA 洗澡一般多久？', hint: '2个字', options: ['10分钟', '20分钟', '30分钟', '1小时'] },
        { q: 'TA 最怕什么小动物？', hint: '1个字', options: ['猫', '狗', '蛇', '蜘蛛'] }
    ],
    B: [
        { q: 'TA 生气时最常用哪种方式？', hint: '2个字', options: ['冷战', '摔东西', '哭', '讲道理'] },
        { q: 'TA 想吃宵夜会怎么说？', hint: '3个字', options: ['我饿了', '要不要吃', '宝宝饿了', '默默吃'] },
        { q: 'TA 周末赖床多久？', hint: '3个字', options: ['睡到醒', '再睡5分', '闹钟N次', '直接不起'] },
        { q: 'TA 最喜欢的娱乐方式是？', hint: '2个字', options: ['打游戏', '刷剧', '逛街', '睡觉'] },
        { q: 'TA 收到惊喜更喜欢哪种？', hint: '2个字', options: ['礼物', '拥抱', '情话', '一起玩'] },
        { q: 'TA 睡觉喜欢什么姿势？', hint: '2个字', options: ['侧躺', '仰躺', '蜷缩', '大字'] },
        { q: 'TA 吃东西的口味偏好？', hint: '2个字', options: ['清淡', '重口', '甜食', '辣'] },
        { q: 'TA 压力大时会怎么做？', hint: '3个字', options: ['吃东西', '打游戏', '倾诉', '睡觉'] }
    ]
};

function openLoveQuiz() {
    GameState.loveQuiz = { score: [0, 0], idx: 0, total: 8, history: [], currentQ: null, currentRole: null, hintShown: false, phase: 'intro', selectedOpt: null, timerRunning: false };
    showScreen('loveQuizScreen');
    renderLoveQuiz();
}

function renderLoveQuiz() {
    const game = GameState.loveQuiz;
    const nameA = GameTools.getPlayerName('A');
    const nameB = GameTools.getPlayerName('B');

    document.getElementById('loveQuizInfo').innerHTML = GameInfo.loveQuiz;

    // ---- 结束画面 ----
    if (game.phase === 'result') {
        const total = game.score[0] + game.score[1];
        let category, emoji, desc;
        if (total >= 16) { category = '💍 灵魂伴侣'; emoji = '💍'; desc = '你们默契满分，是彼此的MR.SOULMATE！'; }
        else if (total >= 12) { category = '💕 心有灵犀'; emoji = '💕'; desc = '你们的默契很好，继续保持！'; }
        else if (total >= 8) { category = '🌱 还需了解'; emoji = '🌱'; desc = '还需要更多相处来增进了解哦~'; }
        else { category = '🌸 磨合期'; emoji = '🌸'; desc = '刚开始认识彼此，慢慢来，一起加油！'; }

        document.getElementById('loveQuizScore').innerHTML = '';
        document.getElementById('loveQuizArea').innerHTML = `
          <div class="play-area">
            <div class="compat-score">${emoji}</div>
            <h2 class="compat-title">${category}</h2>
            <p class="compat-desc">${desc}</p>
            <div class="compat-bar-wrap">
              <div class="compat-bar-label"><span>${nameA}了解度</span><span>${game.score[0]}分</span></div>
              <div class="compat-bar"><div class="compat-bar-fill" style="width:${(game.score[0]/game.total)*100}%"></div></div>
              <div class="compat-bar-label"><span>${nameB}了解度</span><span>${game.score[1]}分</span></div>
              <div class="compat-bar"><div class="compat-bar-fill compat-bar-b" style="width:${(game.score[1]/game.total)*100}%"></div></div>
            </div>
            <div class="compat-history">
              ${game.history.map((h, i) => `<div class="history-item">第${i + 1}题：${h}</div>`).join('')}
            </div>
            <div class="btn-row">
              <button class="btn-primary" onclick="openLoveQuiz()">再来一轮</button>
              <button class="btn-ghost" onclick="recordGoToMenu('loveQuiz', game.score[0], game.score[1])">返回菜单</button>
            </div>
          </div>`;
        return;
    }

    // ---- 开始介绍 ----
    if (game.phase === 'intro') {
        document.getElementById('loveQuizScore').innerHTML = '';
        document.getElementById('loveQuizArea').innerHTML = `
          <div class="play-area quiz-intro">
            <div class="quiz-intro-icon">💝</div>
            <h2>心有灵犀</h2>
            <div class="quiz-intro-rules">
              <div class="quiz-rule"><span class="quiz-rule-num">①</span>一人看题目，描述给对方听（不能说出答案词）</div>
              <div class="quiz-rule"><span class="quiz-rule-num">②</span>对方在3个选项中选出答案</div>
              <div class="quiz-rule"><span class="quiz-rule-num">③</span>答对+2分，答错+0分</div>
              <div class="quiz-rule"><span class="quiz-rule-num">④</span>15秒后显示提示（关键词字数）</div>
              <div class="quiz-rule"><span class="quiz-rule-num">⑤</span>共8题，计算「了解度」</div>
            </div>
            <p class="task-sub">共 8 题 · 答对每题 +2 分</p>
            <button class="btn-primary" onclick="startLoveQuizRound()">开始挑战</button>
          </div>`;
        return;
    }

    // ---- 答题画面 ----
    if (game.phase === 'answer' || game.phase === 'timer' || game.phase === 'hint') {
        const role = game.idx % 2 === 0 ? 'A' : 'B';
        const questionTarget = role === 'A' ? 'B' : 'A';
        const bank = LOVE_QUIZ_BANK[role];
        const q = bank[game.idx % bank.length];
        game.currentQ = q;
        game.currentRole = role;

        document.getElementById('loveQuizScore').innerHTML = GameTools.renderScoreBar(game.score[0], game.score[1], nameA, nameB, game.idx + 1, game.total);
        document.getElementById('loveQuizArea').innerHTML = `
          <div class="play-area">
            <div class="task-header">
              <span class="task-level-badge">第 ${game.idx + 1} / ${game.total} 题</span>
              <span class="task-sub">${GameTools.getPlayerName(role)} 描述，${GameTools.getPlayerName(questionTarget)} 猜</span>
            </div>
            <div class="quiz-question-box">
              <div class="quiz-role-icon">${role === 'A' ? '🧑' : '👩'}</div>
              <div class="quiz-question-text">${q.q}</div>
            </div>
            ${game.hintShown ? `<div class="quiz-hint">💡 提示：${q.hint}</div>` : ''}
            <div class="opt-list">
              ${q.options.map((opt, i) => `
                <button class="opt-btn ${game.selectedOpt === i ? 'opt-selected' : ''}" onclick="selectLoveQuizOpt(${i})" ${game.selectedOpt !== null ? 'disabled' : ''}>
                  <span class="opt-letter">${String.fromCharCode(65 + i)}</span>
                  ${opt}
                </button>
              `).join('')}
            </div>
            ${game.selectedOpt !== null ? `
              <div class="quiz-answer-feedback">
                ${game.selectedOpt === 0 ? '<span class="feedback-correct">✅ 答对！+2分</span>' : `<span class="feedback-wrong">❌ 答错，正确答案是：${q.options[0]}</span>`}
              </div>
              <button class="btn-primary" onclick="nextLoveQuiz()">下一题</button>
            ` : `
              <div class="quiz-timer" id="quizTimerDisplay">⏱ 30s</div>
              <p class="task-sub">${GameTools.getPlayerName(questionTarget)} 选择答案</p>
            `}
          </div>`;

        if (game.selectedOpt === null && !game.timerRunning) {
            game.timerRunning = true;
            let timeLeft = 30;
            game.hintShown = false;
            const timerEl = document.getElementById('quizTimerDisplay');
            const timerId = setInterval(() => {
                timeLeft--;
                if (timerEl) timerEl.textContent = `⏱ ${timeLeft}s`;
                if (timeLeft === 15 && !game.hintShown) {
                    game.hintShown = true;
                    const hintEl = document.createElement('div');
                    hintEl.className = 'quiz-hint';
                    hintEl.textContent = `💡 提示：${q.hint}`;
                    hintEl.style.cssText = 'animation: screenIn 0.3s ease; margin: 10px 0;';
                    const timerWrap = document.getElementById('quizTimerDisplay');
                    if (timerWrap) timerWrap.parentNode.insertBefore(hintEl, timerWrap.nextSibling);
                }
                if (timeLeft <= 0) {
                    clearInterval(timerId);
                    game.selectedOpt = -1;
                    game.history.push(`❌ ${GameTools.getPlayerName(questionTarget)} 超时（答案是：${q.options[0]}）`);
                    renderLoveQuiz();
                }
            }, 1000);
            game._quizTimerId = timerId;
        }
        return;
    }
}

function startLoveQuizRound() {
    GameState.loveQuiz.phase = 'answer';
    renderLoveQuiz();
}

function selectLoveQuizOpt(idx) {
    const game = GameState.loveQuiz;
    if (game.selectedOpt !== null) return;
    game.selectedOpt = idx;
    game.timerRunning = false;
    if (game._quizTimerId) clearInterval(game._quizTimerId);

    const q = game.currentQ;
    const role = game.currentRole;
    const questionTarget = role === 'A' ? 'B' : 'A';
    const isCorrect = idx === 0;

    if (isCorrect) {
        if (role === 'A') game.score[1] += 2; else game.score[0] += 2;
        game.history.push(`✅ ${GameTools.getPlayerName(questionTarget)} 答对 +2`);
    } else {
        game.history.push(`❌ ${GameTools.getPlayerName(questionTarget)} 答错（答案是：${q.options[0]}）`);
    }
    renderLoveQuiz();
}

function nextLoveQuiz() {
    const game = GameState.loveQuiz;
    game.idx++;
    game.selectedOpt = null;
    game.hintShown = false;
    game.timerRunning = false;
    if (game._quizTimerId) clearInterval(game._quizTimerId);
    if (game.idx >= game.total) {
        game.phase = 'result';
    }
    renderLoveQuiz();
}

// ====================================================
// 【免费】甜蜜许愿池 - 轮盘（CSS 旋转动画·老虎机风格）
// ====================================================
const WISH_BANK = [
    { text: '一起看一场日出 🌅', cost: 10, icon: '🌅' },
    { text: '共进一顿烛光晚餐 🕯️', cost: 30, icon: '🕯️' },
    { text: '给对方手写一封情书 💌', cost: 20, icon: '💌' },
    { text: '周末一起赖床到中午 🛏️', cost: 15, icon: '🛏️' },
    { text: '一起完成一幅拼图 🧩', cost: 25, icon: '🧩' },
    { text: '为对方做一件一直想要的小事 🎁', cost: 40, icon: '🎁' },
    { text: '关掉手机，拥抱十分钟 🤗', cost: 5, icon: '🤗' },
    { text: '在雨天一起撑伞散步 🌧️', cost: 15, icon: '🌧️' },
    { text: '一起看一场深夜电影 🌃', cost: 10, icon: '🌃' },
    { text: '给对方按摩15分钟 💆', cost: 20, icon: '💆' },
    { text: '未来一周每晚一句「我爱你」 💗', cost: 35, icon: '💗' },
    { text: '互相给对方起一个专属昵称 🥰', cost: 5, icon: '🥰' },
    { text: '一起做一道双方都没做过的菜 🍳', cost: 25, icon: '🍳' },
    { text: '给对方买一个心心念念的东西 🛍️', cost: 50, icon: '🛍️' },
    { text: '复刻第一次约会的场景 📸', cost: 45, icon: '📸' },
    { text: '用24小时不说电子产品 📵', cost: 30, icon: '📵' },
    { text: '为对方拍一组专属照片 📷', cost: 25, icon: '📷' },
    { text: '一起为未来存一笔梦想基金 💰', cost: 50, icon: '💰' },
    { text: '一起在星空下说悄悄话 ✨', cost: 10, icon: '✨' },
    { text: '为对方做一次早餐 🍳', cost: 15, icon: '🍳' },
    { text: '一起看日出日落 🌅🌄', cost: 20, icon: '🌅' },
    { text: '互相给对方的父母准备礼物 🎁', cost: 40, icon: '🎁' },
    { text: '一起在家做SPA 🧖', cost: 30, icon: '🧖' },
    { text: '一起养一盆植物 🌱', cost: 15, icon: '🌱' }
];

function openWheel() {
    GameState.wheel = { spinning: false, history: [], tickets: 3, pool: WISH_BANK };
    showScreen('wheelScreen');
    renderWheel();
}

function renderWheel() {
    const game = GameState.wheel;
    document.getElementById('wheelInfo').innerHTML = GameInfo.wheel;
    document.getElementById('wheelScore').innerHTML = `<div class="score-bar" style="margin:0 20px 14px"><div class="score-center"><span class="score-round">剩余 ${game.tickets} 次抽取机会</span></div></div>`;

    if (game.tickets <= 0) {
        document.getElementById('wheelArea').innerHTML = `
          <div class="play-area">
            <div class="wish-history-section">
              <h3 class="wish-history-title">🎁 本次许愿记录</h3>
              ${game.history.length > 0 ? game.history.map((w, i) => `<div class="history-item">${w}</div>`).join('') : '<p class="task-sub">暂无记录</p>'}
            </div>
            <button class="btn-ghost" onclick="recordGoToMenu('wheel', 1, 0)">返回菜单</button>
          </div>`;
        return;
    }

    document.getElementById('wheelArea').innerHTML = `
      <div class="play-area wheel-play">
        <div class="wheel-title">🎡 甜蜜许愿池</div>
        <div class="wheel-subtitle">抽取你们的浪漫任务</div>
        <div class="wheel-frame">
          <div class="wheel-reel-container" id="wheelReelContainer">
            <div class="wheel-reel" id="wheelReel">
              <div class="wheel-cell">🌟</div>
              <div class="wheel-cell">💕</div>
              <div class="wheel-cell">🎁</div>
              <div class="wheel-cell">💝</div>
              <div class="wheel-cell">✨</div>
              <div class="wheel-cell">🌈</div>
              <div class="wheel-cell">💖</div>
              <div class="wheel-cell">🎯</div>
            </div>
          </div>
          <div class="wheel-pointer-down">▼</div>
          <div class="wheel-winning-slot" id="wheelWinningSlot" style="display:none;">
            <div class="wheel-winning-cell" id="wheelWinningCell">
              <div class="wheel-icon" id="wheelResultIcon"></div>
              <div class="wheel-text" id="wheelResultText"></div>
            </div>
          </div>
        </div>
        <p class="task-sub">点击按钮开始抽取，老虎机滚啊滚~</p>
        <button class="btn-primary wheel-spin-btn" onclick="spinWheel()" id="wheelSpinBtn">
          🎡 抽取任务
        </button>
      </div>
      ${game.history.length > 0 ? `<div class="history" style="margin:0 20px"><h3>本次已抽取</h3>${game.history.map(w => `<div class="history-item">${w}</div>`).join('')}</div>` : ''}`;
}

function spinWheel() {
    const game = GameState.wheel;
    const spinBtn = document.getElementById('wheelSpinBtn');
    const winningSlot = document.getElementById('wheelWinningSlot');
    const winningCell = document.getElementById('wheelWinningCell');
    const reel = document.getElementById('wheelReel');

    if (!reel || game.spinning || game.tickets <= 0) return;

    game.spinning = true;
    spinBtn.disabled = true;
    spinBtn.textContent = '⏳ 转动中...';

    // 准备结果
    const winner = game.pool[Math.floor(Math.random() * game.pool.length)];
    const duration = 3000 + Math.random() * 1000;
    const steps = 20;
    const spinValues = [];
    for (let i = 0; i < steps; i++) {
        spinValues.push(game.pool[Math.floor(Math.random() * game.pool.length)]);
    }
    spinValues.push(winner);

    // 构建滚动内容
    const allCells = [...spinValues, winner, winner];
    reel.innerHTML = allCells.map(w => `<div class="wheel-cell">${w.icon || ''} ${w.text}</div>`).join('');

    // 显示滚动容器
    if (winningSlot) winningSlot.style.display = 'none';

    // 应用CSS旋转动画
    reel.style.animation = 'none';
    reel.offsetHeight;
    reel.style.animation = `wheelSlotSpin ${duration}ms cubic-bezier(0.17, 0.67, 0.12, 0.99) forwards`;

    setTimeout(() => {
        game.spinning = false;
        game.tickets--;
        game.history.push(`${winner.icon || '✨'} ${winner.text}`);

        // 显示中奖结果
        if (winningSlot) winningSlot.style.display = 'flex';
        if (winningCell) {
            winningCell.classList.add('wheel-winning-cell');
            winningCell.style.animation = 'screenIn 0.5s cubic-bezier(0.22, 1, 0.36, 1)';
        }
        const iconEl = document.getElementById('wheelResultIcon');
        const textEl = document.getElementById('wheelResultText');
        if (iconEl) iconEl.textContent = winner.icon || '✨';
        if (textEl) textEl.textContent = winner.text;

        spinBtn.disabled = false;
        spinBtn.textContent = game.tickets > 0 ? `🎡 再抽一次（剩余 ${game.tickets} 次）` : '次数用完';

        // 更新剩余次数显示
        document.getElementById('wheelScore').innerHTML = `<div class="score-bar" style="margin:0 20px 14px"><div class="score-center"><span class="score-round">剩余 ${game.tickets} 次抽取机会</span></div></div>`;

        if (game.tickets <= 0) {
            setTimeout(() => {
                spinBtn.textContent = '🎁 次数用完，查看全部';
                spinBtn.onclick = () => renderWheel();
            }, 500);
        }

        showToast(`🎉 抽到：${winner.text}`);
    }, duration);
}

// ====================================================
// 【免费】爱的挑战 - Couple Dare（5轮·难度选择·评分）
// ====================================================
const COUPLE_DARE_BANK = {
    亲密向: [
        '深情对视30秒，谁先笑谁输',
        '给对方一个长达10秒的拥抱',
        '用最奶的声音叫对方3遍"宝贝"',
        '让对方在你耳边说3句情话',
        '背靠背坐30秒不说话，感受彼此呼吸',
        '给对方额头一个吻，保持10秒',
        '十指紧扣，对视并说出对方的3个优点'
    ],
    创意向: [
        '用身边的物品给对方设计一个造型并拍照',
        '即兴表演一段你们相识的场景',
        '用表情包"说"出"我爱你"',
        '一起即兴编一个30秒的浪漫小故事',
        '用筷子/吸管等工具喂对方吃东西',
        '画一幅简笔画表达你对伴侣的感情',
        '用手机拍一组创意情侣剪影照'
    ],
    信任向: [
        '蒙眼让对方引导你走10步',
        '一方闭眼，另一方轻声描述周围环境',
        '同时向后倒，让对方接住你',
        '交换手机，让对方帮你发一条朋友圈',
        '一方闭上眼，另一方喂一口食物',
        '让对方翻看你的相册3分钟',
        '背起对方在房间里走一圈'
    ],
    搞笑向: [
        '学对方最经典的表情或口头禅',
        '模仿对方走路的样子走10步',
        '一起用奇怪的声音唱一首歌',
        '给对方设计一个"丑萌"造型',
        '用对方的语气念一段绕口令',
        '一起对着镜子做鬼脸拍照',
        '模仿对方生气/撒娇的样子'
    ]
};

const DIFFICULTY_MULTIPLIER = { easy: 1, medium: 1.5, hard: 2 };

function openCoupleDare() {
    GameState.coupleDare = {
        idx: 0,
        history: [],
        score: [0, 0],
        tasks: [],
        totalRounds: 5,
        starsTotal: 0,
        difficulty: null,
        currentTask: null,
        phase: 'intro'
    };
    showScreen('coupleDareScreen');
    renderCoupleDare();
}

function renderCoupleDare() {
    const game = GameState.coupleDare;
    const nameA = GameTools.getPlayerName('A');
    const nameB = GameTools.getPlayerName('B');

    document.getElementById('coupleDareInfo').innerHTML = GameInfo.coupleDare;

    // ---- 介绍 ----
    if (game.phase === 'intro') {
        document.getElementById('coupleDareScore').innerHTML = '';
        document.getElementById('coupleDareArea').innerHTML = `
          <div class="play-area">
            <div class="dare-intro-icon">💞</div>
            <h2>爱的挑战</h2>
            <div class="dare-rules">
              <div class="dare-rule">① 选择难度（Easy/Medium/Hard）</div>
              <div class="dare-rule">② 一起完成挑战任务</div>
              <div class="dare-rule">③ 双方互相评分（1-5星）</div>
              <div class="dare-rule">④ 平均星级决定是否通过</div>
            </div>
            <p class="task-sub">5轮挑战，最终获得「挑战评级」</p>
            <button class="btn-primary" onclick="dareSelectDifficulty()">开始选择难度</button>
          </div>`;
        return;
    }

    // ---- 选难度 ----
    if (game.phase === 'difficulty') {
        document.getElementById('coupleDareScore').innerHTML = GameTools.renderScoreBar(game.score[0], game.score[1], nameA, nameB, game.idx + 1, game.totalRounds);
        document.getElementById('coupleDareArea').innerHTML = `
          <div class="play-area">
            <div class="round-announce">第 ${game.idx + 1} / ${game.totalRounds} 轮</div>
            <h3>选择本轮挑战难度</h3>
            <div class="difficulty-grid">
              <div class="difficulty-card" onclick="selectDifficulty('easy')" style="--diff-color:#10b981">
                <div class="diff-icon">😊</div>
                <div class="diff-name">Easy</div>
                <div class="diff-desc">简单甜蜜</div>
                <div class="diff-stars">⭐</div>
              </div>
              <div class="difficulty-card" onclick="selectDifficulty('medium')" style="--diff-color:#f59e0b">
                <div class="diff-icon">🔥</div>
                <div class="diff-name">Medium</div>
                <div class="diff-desc">有点刺激</div>
                <div class="diff-stars">⭐⭐⭐</div>
              </div>
              <div class="difficulty-card" onclick="selectDifficulty('hard')" style="--diff-color:#ef4444">
                <div class="diff-icon">💋</div>
                <div class="diff-name">Hard</div>
                <div class="diff-desc">非常亲密</div>
                <div class="diff-stars">⭐⭐⭐⭐⭐</div>
              </div>
            </div>
            <p class="task-sub">难度越高，完成后星级评分上限越高</p>
          </div>`;
        return;
    }

    // ---- 显示任务 ----
    if (game.phase === 'task') {
        const task = game.currentTask;
        const categories = Object.keys(COUPLE_DARE_BANK);
        const cat = categories[game.idx % categories.length];

        document.getElementById('coupleDareScore').innerHTML = GameTools.renderScoreBar(game.score[0], game.score[1], nameA, nameB, game.idx + 1, game.totalRounds, `${cat}`);
        document.getElementById('coupleDareArea').innerHTML = `
          <div class="play-area">
            <div class="task-reveal-wrap">
              <div class="task-category-badge">${cat}</div>
              <div class="task-reveal-card" id="taskRevealCard">
                <div class="task-reveal-text">${task}</div>
              </div>
            </div>
            <p class="task-sub">难度：<span style="color:${game.difficulty === 'hard' ? '#ef4444' : game.difficulty === 'medium' ? '#f59e0b' : '#10b981'}">${game.difficulty.toUpperCase()}</span></p>
            <p class="task-sub">完成后请双方互相打分（1-5星）</p>
            <div class="btn-row">
              <button class="btn-primary" onclick="rateChallenge()">开始评分</button>
            </div>
          </div>
          ${game.history.length > 0 ? `<div class="history"><h3>已完成挑战</h3>${game.history.map(h => `<div class="history-item">${h}</div>`).join('')}</div>` : ''}`;

        // 任务出现动画
        setTimeout(() => {
            document.getElementById('taskRevealCard')?.classList.add('task-revealed');
        }, 100);
        return;
    }

    // ---- 评分 ----
    if (game.phase === 'rate') {
        document.getElementById('coupleDareScore').innerHTML = GameTools.renderScoreBar(game.score[0], game.score[1], nameA, nameB, game.idx + 1, game.totalRounds);
        document.getElementById('coupleDareArea').innerHTML = `
          <div class="play-area">
            <h3>挑战评分</h3>
            <p class="task-sub">${game.currentTask}</p>
            <div class="rating-section">
              <div class="rating-player">
                <span>${nameA} 给 ${nameB} 评分：</span>
                <div class="star-row" id="starRowA">
                  ${[1,2,3,4,5].map(s => `<span class="star-btn" onclick="setDareStars('A', ${s})" id="starA${s}">☆</span>`).join('')}
                </div>
              </div>
              <div class="rating-player">
                <span>${nameB} 给 ${nameA} 评分：</span>
                <div class="star-row" id="starRowB">
                  ${[1,2,3,4,5].map(s => `<span class="star-btn" onclick="setDareStars('B', ${s})" id="starB${s}">☆</span>`).join('')}
                </div>
              </div>
            </div>
            <div id="dareRatingConfirm" style="display:none;margin-top:16px;">
              <button class="btn-primary" onclick="confirmDareRating()">确认评分</button>
            </div>
          </div>`;
        return;
    }

    // ---- 结果 ----
    if (game.phase === 'result') {
        const avgStars = game.starsTotal / game.totalRounds;
        let rating, ratingEmoji;
        if (avgStars >= 4.5) { rating = '传奇搭档'; ratingEmoji = '🏆'; }
        else if (avgStars >= 3.5) { rating = '甜蜜拍档'; ratingEmoji = '💕'; }
        else if (avgStars >= 2.5) { rating = '默契伙伴'; ratingEmoji = '🌟'; }
        else { rating = '潜力无限'; ratingEmoji = '🌱'; }

        document.getElementById('coupleDareScore').innerHTML = '';
        document.getElementById('coupleDareArea').innerHTML = `
          <div class="play-area">
            <div class="dare-result-emoji">${ratingEmoji}</div>
            <h2>挑战评级：${rating}</h2>
            <p class="dare-result-avg">平均 ⭐ ${avgStars.toFixed(1)} 星</p>
            <div class="dare-result-bar">
              ${[1,2,3,4,5].map(s => `<div class="dare-star-full">${s <= Math.round(avgStars) ? '⭐' : '☆'}</div>`).join('')}
            </div>
            <div class="history">
              <h3>挑战回顾</h3>
              ${game.history.map((h, i) => `<div class="history-item">第${i+1}轮：${h}</div>`).join('')}
            </div>
            <div class="btn-row">
              <button class="btn-primary" onclick="openCoupleDare()">再来一轮</button>
              <button class="btn-ghost" onclick="recordGoToMenu('coupleDare', Math.round(avgStars * 10), 0)">返回菜单</button>
            </div>
          </div>`;
        return;
    }
}

function dareSelectDifficulty() {
    GameState.coupleDare.phase = 'difficulty';
    renderCoupleDare();
}

function selectDifficulty(level) {
    const game = GameState.coupleDare;
    game.difficulty = level;

    // 挑选任务
    const categories = Object.keys(COUPLE_DARE_BANK);
    const cat = categories[game.idx % categories.length];
    const tasks = COUPLE_DARE_BANK[cat];
    game.currentTask = tasks[Math.floor(Math.random() * tasks.length)];
    game.currentCat = cat;
    game._starsA = 0;
    game._starsB = 0;
    game.phase = 'task';
    renderCoupleDare();
}

function rateChallenge() {
    GameState.coupleDare.phase = 'rate';
    renderCoupleDare();
}

function setDareStars(player, stars) {
    const game = GameState.coupleDare;
    if (player === 'A') game._starsA = stars;
    else game._starsB = stars;

    // 更新星星显示
    for (let i = 1; i <= 5; i++) {
        const el = document.getElementById(`star${player}${i}`);
        if (el) el.textContent = i <= stars ? '⭐' : '☆';
    }

    if (game._starsA > 0 && game._starsB > 0) {
        document.getElementById('dareRatingConfirm').style.display = 'block';
    }
}

function confirmDareRating() {
    const game = GameState.coupleDare;
    const avgStars = (game._starsA + game._starsB) / 2;
    const mult = DIFFICULTY_MULTIPLIER[game.difficulty];
    const earnedStars = Math.min(5, avgStars * mult / 1.5);
    game.starsTotal += earnedStars;

    const passed = earnedStars >= 2.5;
    game.history.push(`${game.currentTask} (${passed ? '✅ 通过' : '⚠️ '}) ⭐${earnedStars.toFixed(1)}`);

    game.idx++;
    game._starsA = 0;
    game._starsB = 0;

    if (game.idx >= game.totalRounds) {
        game.phase = 'result';
    } else {
        game.phase = 'difficulty';
    }
    renderCoupleDare();
}

// ====================================================
// 【免费】知识抢答 - Quiz Battle（10题·抢答·计时）
// ====================================================
const QUIZ_BATTLE_BANK = [
    { q: '我们的纪念日是哪一天？', options: ['记得', '不记得', '不确定', '查一下'], correct: 0 },
    { q: '对方最爱的食物是什么？', options: ['不知道', '随便', '猜一个', '他知道'], correct: 0 },
    { q: '如果中了100万，你会怎么花？', options: ['旅行', '存起来', '买礼物', '买房'], correct: 0 },
    { q: '对方最害怕什么？', options: ['蜘蛛', '蛇', '鬼', '所有选项都可能'], correct: 3 },
    { q: '你们认识多少天了？', options: ['<100天', '100-365天', '1-3年', '3年以上'], correct: 0 },
    { q: '对方最喜欢的颜色？', options: ['蓝色', '粉色', '黑色', '取决于'], correct: 3 },
    { q: '谁更容易吃醋？', options: ['对方', '我', '都不', '都很'], correct: 3 },
    { q: '对方最讨厌的事情是？', options: ['迟到', '撒谎', '不诚实', '以上都是'], correct: 3 },
    { q: '你们吵架一般谁先道歉？', options: ['他', '她', '轮流', '看情况'], correct: 3 },
    { q: '对方最想去的旅行目的地？', options: ['日本', '欧洲', '海岛', '不知道'], correct: 3 },
    { q: '对方最喜欢看什么类型的剧？', options: ['甜剧', '悬疑', '恐怖', '取决于'], correct: 3 },
    { q: '谁更爱撒娇？', options: ['他', '她', '都爱', '看心情'], correct: 3 }
];

function openQuizBattle() {
    const shuffled = GameTools.shuffle(QUIZ_BATTLE_BANK);
    GameState.quizBattle = {
        idx: 0, score: [0, 0], total: 10,
        history: [], questions: shuffled.slice(0, 10),
        buzzerLocked: false, buzzerOwner: null,
        answerPhase: false,
        buzzerTimer: null, questionTimer: null,
        showBuzzer: false,
        phase: 'intro',
        buzzerCountdown: 5,
        answerTimeLeft: 5
    };
    showScreen('quizBattleScreen');
    renderQuizBattle();
}

function renderQuizBattle() {
    const game = GameState.quizBattle;
    const nameA = GameTools.getPlayerName('A');
    const nameB = GameTools.getPlayerName('B');

    document.getElementById('quizBattleInfo').innerHTML = GameInfo.quizBattle;

    // ---- 介绍 ----
    if (game.phase === 'intro') {
        document.getElementById('quizBattleScore').innerHTML = '';
        document.getElementById('quizBattleArea').innerHTML = `
          <div class="play-area">
            <div class="battle-intro-icon">⏱</div>
            <h2>知识抢答</h2>
            <div class="battle-rules">
              <div class="battle-rule">① 10道题，每题2分</div>
              <div class="battle-rule">② 题目出现后，喊"抢答"并点击按钮</div>
              <div class="battle-rule">③ 抢到者有5秒回答时间</div>
              <div class="battle-rule">④ 答对+2分，答错/超时-1分</div>
              <div class="battle-rule">⑤ 对方答错时，另一方获得机会</div>
            </div>
            <p class="task-sub">共10题 · 最终看谁是抢答王 👑</p>
            <button class="btn-primary" onclick="startQuizBattleGame()">开始抢答</button>
          </div>`;
        return;
    }

    // ---- 结束 ----
    if (game.phase === 'result') {
        const winner = game.score[0] === game.score[1] ? null : (game.score[0] > game.score[1] ? nameA : nameB);
        document.getElementById('quizBattleScore').innerHTML = GameTools.renderScoreBar(game.score[0], game.score[1], nameA, nameB, game.total, game.total);
        document.getElementById('quizBattleArea').innerHTML = `
          <div class="play-area">
            <div class="battle-result-icon">${winner ? '🏆' : '🤝'}</div>
            <h2>${winner ? `${winner} 抢答王！` : '势均力敌！'}</h2>
            <p class="battle-final-score">最终比分 ${game.score[0]} : ${game.score[1]}</p>
            <div class="history">
              <h3>答题记录</h3>
              ${game.history.map((h, i) => `<div class="history-item">第${i + 1}题：${h}</div>`).join('')}
            </div>
            <div class="btn-row">
              <button class="btn-primary" onclick="openQuizBattle()">再来一局</button>
              <button class="btn-ghost" onclick="recordGoToMenu('quizBattle', game.score[0], game.score[1])">返回菜单</button>
            </div>
          </div>`;
        return;
    }

    // ---- 抢答等待画面 ----
    if (game.phase === 'buzzer') {
        document.getElementById('quizBattleScore').innerHTML = GameTools.renderScoreBar(game.score[0], game.score[1], nameA, nameB, game.idx + 1, game.total);
        const buzzerClass = game.showBuzzer ? 'buzzer-active' : '';
        document.getElementById('quizBattleArea').innerHTML = `
          <div class="play-area battle-buizzer-phase ${buzzerClass}">
            <div class="battle-question-box">
              <div class="battle-q-num">第 ${game.idx + 1} / ${game.total} 题</div>
              <div class="battle-q-text">${game.questions[game.idx].q}</div>
            </div>
            <div class="buzzer-countdown" id="buzzerCountdown">⏱ ${game.buzzerCountdown}s</div>
            <p class="task-sub">${game.showBuzzer ? '' : '准备好抢答了吗？'}</p>
            <button class="btn-primary buzzer-btn ${game.showBuzzer ? '' : 'buzzer-btn-glow'}" onclick="pressBuzzer()" id="buzzerBtn" ${game.buzzerLocked ? 'disabled' : ''}>
              ${game.showBuzzer ? '🔔 抢答！' : '等待抢答...'}
            </button>
            <p class="task-sub buzzer-hint">${game.showBuzzer ? '第一个按下按钮的人抢答！' : '请喊"123抢"并同时按！'}</p>
          </div>`;

        // 倒计时
        if (!game.buzzerTimer) {
            game.buzzerTimer = setInterval(() => {
                game.buzzerCountdown--;
                const el = document.getElementById('buzzerCountdown');
                if (el) el.textContent = `⏱ ${game.buzzerCountdown}s`;
                if (el) el.style.color = game.buzzerCountdown <= 2 ? '#ef4444' : '';

                if (!game.showBuzzer && game.buzzerCountdown <= 0) {
                    // 都没抢到，随机给分
                    clearInterval(game.buzzerTimer);
                    game.buzzerTimer = null;
                    game.showBuzzer = true;
                    game.buzzerCountdown = 5;
                    const randomPicker = Math.random() < 0.5 ? 0 : 1;
                    game.score[randomPicker] += 0;
                    game.history.push(`❌ 第${game.idx + 1}题：双方都未抢答，跳过`);
                    game.idx++;
                    if (game.idx >= game.total) {
                        game.phase = 'result';
                    }
                    renderQuizBattle();
                }
            }, 1000);
        }

        setTimeout(() => {
            if (!game.showBuzzer) {
                game.showBuzzer = true;
                renderQuizBattle();
            }
        }, 800);
        return;
    }

    // ---- 回答画面 ----
    if (game.phase === 'answer') {
        const q = game.questions[game.idx];
        const buzzerName = game.buzzerOwner === 0 ? nameA : nameB;

        document.getElementById('quizBattleScore').innerHTML = GameTools.renderScoreBar(game.score[0], game.score[1], nameA, nameB, game.idx + 1, game.total);
        document.getElementById('quizBattleArea').innerHTML = `
          <div class="play-area">
            <div class="buzzer-result-icon">🔔</div>
            <div class="buzzer-owner-name">${buzzerName} 抢到了！</div>
            <div class="battle-question-box">
              <div class="battle-q-text">${q.q}</div>
            </div>
            <div class="answer-timer" id="answerTimer">⏱ ${game.answerTimeLeft}s</div>
            <div class="opt-list">
              ${q.options.map((opt, i) => `
                <button class="opt-btn" onclick="answerQuizBattle(${i})">
                  <span class="opt-letter">${String.fromCharCode(65 + i)}</span>
                  ${opt}
                </button>
              `).join('')}
            </div>
          </div>`;

        if (!game.answerTimerInterval) {
            game.answerTimerInterval = setInterval(() => {
                game.answerTimeLeft--;
                const el = document.getElementById('answerTimer');
                if (el) {
                    el.textContent = `⏱ ${game.answerTimeLeft}s`;
                    el.style.color = game.answerTimeLeft <= 2 ? '#ef4444' : '';
                }
                if (game.answerTimeLeft <= 0) {
                    clearInterval(game.answerTimerInterval);
                    game.answerTimerInterval = null;
                    // 超时视为答错
                    quizBattleWrongAnswer(true);
                }
            }, 1000);
        }
        return;
    }
}

function startQuizBattleGame() {
    GameState.quizBattle.phase = 'buzzer';
    GameState.quizBattle.showBuzzer = false;
    GameState.quizBattle.buzzerCountdown = 5;
    renderQuizBattle();
}

function pressBuzzer() {
    const game = GameState.quizBattle;
    if (game.buzzerLocked || game.phase !== 'buzzer') return;

    game.buzzerLocked = true;
    if (game.buzzerTimer) {
        clearInterval(game.buzzerTimer);
        game.buzzerTimer = null;
    }

    // 随机决定谁抢到（模拟）
    game.buzzerOwner = Math.random() < 0.5 ? 0 : 1;
    game.phase = 'answer';
    game.answerTimeLeft = 5;

    const buzzerEl = document.getElementById('buzzerBtn');
    if (buzzerEl) buzzerEl.textContent = '🔔 已抢答！';

    setTimeout(() => renderQuizBattle(), 500);
}

function answerQuizBattle(idx) {
    const game = GameState.quizBattle;
    const q = game.questions[game.idx];
    clearInterval(game.answerTimerInterval);
    game.answerTimerInterval = null;

    const buzzerName = game.buzzerOwner === 0 ? GameTools.getPlayerName('A') : GameTools.getPlayerName('B');
    const isCorrect = idx === q.correct;

    if (isCorrect) {
        game.score[game.buzzerOwner] += 2;
        game.history.push(`✅ 第${game.idx + 1}题：${buzzerName} 抢答正确 +2`);
        showToast(`🎉 ${buzzerName} 答对！+2分`);
    } else {
        game.score[game.buzzerOwner] -= 1;
        game.history.push(`❌ 第${game.idx + 1}题：${buzzerName} 答错 -1（正确：${q.options[q.correct]}）`);
        showToast(`❌ 答错了，正确答案是：${q.options[q.correct]}`);
    }

    advanceQuizBattle();
}

function quizBattleWrongAnswer(isTimeout = false) {
    const game = GameState.quizBattle;
    const buzzerName = game.buzzerOwner === 0 ? GameTools.getPlayerName('A') : GameTools.getPlayerName('B');
    const q = game.questions[game.idx];

    if (!isTimeout) {
        game.score[game.buzzerOwner] -= 1;
    }
    game.history.push(`❌ 第${game.idx + 1}题：${buzzerName} ${isTimeout ? '超时' : '答错'} -1（正确：${q.options[q.correct]}）`);
    if (game.answerTimerInterval) {
        clearInterval(game.answerTimerInterval);
        game.answerTimerInterval = null;
    }
    advanceQuizBattle();
}

function advanceQuizBattle() {
    const game = GameState.quizBattle;
    game.idx++;
    game.buzzerLocked = false;
    game.buzzerOwner = null;
    game.answerTimeLeft = 5;

    if (game.idx >= game.total) {
        game.phase = 'result';
    } else {
        game.phase = 'buzzer';
        game.showBuzzer = false;
        game.buzzerCountdown = 5;
    }
    renderQuizBattle();
}

// ====================================================
// 【免费】荒岛余生 - 沙漠岛求生（3轮·积分·命运抉择）
// ====================================================
const ISLAND_SCENARIOS = [
    {
        round: 1,
        phase: '选择',
        title: '你们流落荒岛，必须做出第一个决定...',
        options: [
            { text: '🔦 一起去找水源', romance: 10, survival: 20, icon: '🔦' },
            { text: '🏕️ 先搭建一个简易庇护所', romance: 15, survival: 25, icon: '🏕️' },
            { text: '🔥 生起篝火等待救援', romance: 20, survival: 15, icon: '🔥' }
        ]
    },
    {
        round: 1,
        phase: '选择',
        title: '夜晚来临，你们发现了一个神秘洞穴...',
        options: [
            { text: '🐾 进去探险', romance: 5, survival: -10, icon: '🐾' },
            { text: '🛶 留在海边划独木舟', romance: 15, survival: 20, icon: '🛶' },
            { text: '🌴 在沙滩上数星星', romance: 30, survival: 5, icon: '🌴' }
        ]
    }
];

const RESOURCE_ITEMS = [
    { name: '急救包 💊', romance: 0, survival: 40, icon: '💊' },
    { name: '红酒一瓶 🍷', romance: 35, survival: 0, icon: '🍷' },
    { name: '帐篷 🏕️', romance: 20, survival: 35, icon: '🏕️' },
    { name: '吉他 🎸', romance: 45, survival: 0, icon: '🎸' },
    { name: '防晒霜 ☀️', romance: 10, survival: 25, icon: '☀️' },
    { name: '一本诗集 📖', romance: 40, survival: 5, icon: '📖' }
];

function openDesertIsland() {
    const shuffledScenarios = GameTools.shuffle(ISLAND_SCENARIOS);
    GameState.desertIsland = {
        phase: 'intro',
        round: 1,
        total: 3,
        romancePts: 0,
        survivalPts: 0,
        choiceHistory: [],
        scenarioIdx: 0,
        pickedA: null,
        pickedB: null,
        scenarios: shuffledScenarios,
        resourcePool: GameTools.shuffle(RESOURCE_ITEMS).slice(0, 3)
    };
    showScreen('desertIslandScreen');
    renderDesertIsland();
}

function renderDesertIsland() {
    const game = GameState.desertIsland;
    const nameA = GameTools.getPlayerName('A');
    const nameB = GameTools.getPlayerName('B');

    document.getElementById('desertIslandInfo').innerHTML = GameInfo.desertIsland;

    // ---- 介绍 ----
    if (game.phase === 'intro') {
        document.getElementById('desertIslandScore').innerHTML = '';
        document.getElementById('desertIslandArea').innerHTML = `
          <div class="play-area island-intro">
            <div class="island-intro-icon">🏝️</div>
            <h2>荒岛余生</h2>
            <p class="task-sub">你们漂流到了一座浪漫的荒岛，必须做出生存抉择...</p>
            <div class="island-journey-preview">
              <div class="journey-step"><span class="journey-step-num">1</span><span>选择挑战</span></div>
              <div class="journey-arrow">→</div>
              <div class="journey-step"><span class="journey-step-num">2</span><span>物资争夺</span></div>
              <div class="journey-arrow">→</div>
              <div class="journey-step"><span class="journey-step-num">3</span><span>命运抉择</span></div>
            </div>
            <div class="island-point-preview">
              <div class="island-point-item"><span class="island-point-icon">💕</span><span>浪漫值</span></div>
              <div class="island-point-item"><span class="island-point-icon">🏃</span><span>生存值</span></div>
            </div>
            <p class="task-sub">最终将根据综合分获得「荒岛结局」</p>
            <button class="btn-primary" onclick="startDesertRound1()">登岛！</button>
          </div>`;
        return;
    }

    // ---- 第1轮：场景选择 ----
    if (game.phase === 'round1') {
        const scenario = game.scenarios[game.scenarioIdx % game.scenarios.length];
        document.getElementById('desertIslandScore').innerHTML = `
          <div class="island-pts-bar">
            <div class="island-pts-item"><span>💕</span><span id="romancePtsDisplay">${game.romancePts}</span></div>
            <div class="island-round-label">第 ${game.round} 轮 · ${scenario.phase}</div>
            <div class="island-pts-item"><span>🏃</span><span id="survivalPtsDisplay">${game.survivalPts}</span></div>
          </div>`;
        document.getElementById('desertIslandArea').innerHTML = `
          <div class="play-area island-round-area">
            <div class="island-scenario-title">${scenario.title}</div>
            <div class="island-options-grid">
              ${scenario.options.map((opt, i) => `
                <div class="island-option-card" onclick="selectIslandOption(${i}, ${opt.romance}, ${opt.survival})" style="--opt-color:${opt.romance > opt.survival ? '#ff4d8d' : '#06b6d4'}">
                  <div class="island-opt-icon">${opt.icon}</div>
                  <div class="island-opt-text">${opt.text}</div>
                  <div class="island-opt-stats">
                    <span class="island-opt-stat romance">💕 +${opt.romance}</span>
                    <span class="island-opt-stat survival">🏃 +${opt.survival}</span>
                  </div>
                </div>
              `).join('')}
            </div>
            <p class="task-sub">两人一起讨论，选择你们共同的答案</p>
          </div>`;
        return;
    }

    // ---- 第2轮：物资争夺（同时选择） ----
    if (game.phase === 'round2') {
        document.getElementById('desertIslandScore').innerHTML = `
          <div class="island-pts-bar">
            <div class="island-pts-item"><span>💕</span><span>${game.romancePts}</span></div>
            <div class="island-round-label">第 ${game.round} 轮 · 物资争夺</div>
            <div class="island-pts-item"><span>🏃</span><span>${game.survivalPts}</span></div>
          </div>`;
        document.getElementById('desertIslandArea').innerHTML = `
          <div class="play-area">
            <div class="island-resource-title">选择你们最需要的物资</div>
            <p class="task-sub">两人同时在心里选择，然后一起展示</p>
            <div class="island-options-grid">
              ${game.resourcePool.map((item, i) => `
                <div class="island-option-card" onclick="selectResource(${i})" style="--opt-color:#a855f7">
                  <div class="island-opt-icon">${item.icon}</div>
                  <div class="island-opt-text">${item.name}</div>
                  <div class="island-opt-stats">
                    <span class="island-opt-stat romance">💕 +${item.romance}</span>
                    <span class="island-opt-stat survival">🏃 +${item.survival}</span>
                  </div>
                </div>
              `).join('')}
            </div>
            <div class="btn-row">
              <button class="btn-primary" onclick="confirmResource()">确认选择（双方同意）</button>
            </div>
          </div>`;
        return;
    }

    // ---- 第3轮：命运抉择 ----
    if (game.phase === 'round3') {
        const totalPts = game.romancePts + game.survivalPts;
        let fateTitle, fateOptions;

        if (totalPts >= 80) {
            fateTitle = '🌟 命运眷顾！救援船来了，但只能带走一个人...';
            fateOptions = [
                { text: '💕 留下来陪 TA 等下一班', effect: 'romance', desc: '浪漫至上，你们选择相依为命' },
                { text: '🚢 一起登船离开', effect: 'both', desc: '命运奖励你们的默契，一起离开' }
            ];
        } else if (totalPts >= 50) {
            fateTitle = '🌙 夜晚降临，你们发现了营火...';
            fateOptions = [
                { text: '🔥 围着篝火唱歌跳舞', effect: 'romance', desc: '最浪漫的夜晚开始了' },
                { text: '📡 尝试用篝火发求救信号', effect: 'survival', desc: '理性的选择增加了生存几率' }
            ];
        } else {
            fateTitle = '⛈️ 暴风雨即将来临！';
            fateOptions = [
                { text: '🏠 一起躲进山洞', effect: 'romance', desc: '在狭小的空间里，你们更亲密了' },
                { text: '🌊 尝试游泳到安全的地方', effect: 'survival', desc: '生存本能驱使你们行动' }
            ];
        }

        document.getElementById('desertIslandScore').innerHTML = `
          <div class="island-pts-bar">
            <div class="island-pts-item"><span>💕</span><span>${game.romancePts}</span></div>
            <div class="island-round-label">第 ${game.round} 轮 · 命运抉择</div>
            <div class="island-pts-item"><span>🏃</span><span>${game.survivalPts}</span></div>
          </div>`;
        document.getElementById('desertIslandArea').innerHTML = `
          <div class="play-area">
            <div class="fate-title">${fateTitle}</div>
            <div class="fate-options">
              ${fateOptions.map((opt, i) => `
                <div class="fate-option-card" onclick="selectFate(${i}, '${opt.effect}')">
                  <div class="fate-opt-text">${opt.text}</div>
                  <div class="fate-opt-desc">${opt.desc}</div>
                </div>
              `).join('')}
            </div>
          </div>`;
        return;
    }

    // ---- 结局 ----
    if (game.phase === 'result') {
        const total = game.romancePts + game.survivalPts;
        let ending, endingEmoji, endingDesc;
        if (total >= 100) {
            ending = '🏝️ 浪漫天堂'; endingEmoji = '🏝️';
            endingDesc = '你们不仅生存了下来，还把荒岛变成了最浪漫的回忆。救援队找到你们时，你们已经舍不得离开了。';
        } else if (total >= 70) {
            ending = '💕 甜蜜生存'; endingEmoji = '💕';
            endingDesc = '生存和浪漫兼备，你们的默契让荒岛生活变得甜蜜。虽然条件艰苦，但有彼此在身边，每一天都是幸福的。';
        } else if (total >= 40) {
            ending = '🌱 患难与共'; endingEmoji = '🌱';
            endingDesc = '虽然浪漫值不够高，但你们在困境中互相扶持，感情变得更加牢固。这段经历会成为你们最珍贵的回忆。';
        } else {
            ending = '⛺ 重新出发'; endingEmoji = '⛺';
            endingDesc = '荒岛生活比想象中艰难，但重要的是你们一起经历了这一切。回去之后，你们会更加珍惜彼此。';
        }

        document.getElementById('desertIslandScore').innerHTML = '';
        document.getElementById('desertIslandArea').innerHTML = `
          <div class="play-area island-ending">
            <div class="ending-emoji">${endingEmoji}</div>
            <h2>${ending}</h2>
            <p class="ending-desc">${endingDesc}</p>
            <div class="ending-pts-summary">
              <div class="ending-pts-card romance-card">
                <div class="ending-pts-icon">💕</div>
                <div class="ending-pts-num">${game.romancePts}</div>
                <div class="ending-pts-label">浪漫值</div>
              </div>
              <div class="ending-pts-vs">+</div>
              <div class="ending-pts-card survival-card">
                <div class="ending-pts-icon">🏃</div>
                <div class="ending-pts-num">${game.survivalPts}</div>
                <div class="ending-pts-label">生存值</div>
              </div>
              <div class="ending-pts-vs">=</div>
              <div class="ending-pts-card total-card">
                <div class="ending-pts-icon">🏆</div>
                <div class="ending-pts-num">${total}</div>
                <div class="ending-pts-label">总分</div>
              </div>
            </div>
            <div class="history">
              <h3>冒险回顾</h3>
              ${game.choiceHistory.map((h, i) => `<div class="history-item">${h}</div>`).join('')}
            </div>
            <div class="btn-row">
              <button class="btn-primary" onclick="openDesertIsland()">再来一次</button>
              <button class="btn-ghost" onclick="recordGoToMenu('desertIsland', game.romancePts, game.survivalPts)">返回菜单</button>
            </div>
          </div>`;
        return;
    }
}

function startDesertRound1() {
    GameState.desertIsland.phase = 'round1';
    GameState.desertIsland.round = 1;
    GameState.desertIsland.scenarioIdx = 0;
    renderDesertIsland();
}

function selectIslandOption(idx, romance, survival) {
    const game = GameState.desertIsland;
    const scenario = game.scenarios[game.scenarioIdx % game.scenarios.length];
    const chosen = scenario.options[idx];

    game.romancePts += romance;
    game.survivalPts += survival;
    game.choiceHistory.push(`${chosen.icon} ${chosen.text}（💕+${romance} 🏃+${survival}）`);

    // 高亮选中
    document.querySelectorAll('.island-option-card').forEach((el, i) => {
        if (i === idx) el.classList.add('island-selected');
        else el.style.opacity = '0.5';
    });

    showToast(`💕 浪漫+${romance} 🏃 生存+${survival}`);

    setTimeout(() => {
        game.round = 2;
        game.phase = 'round2';
        renderDesertIsland();
    }, 1200);
}

function selectResource(idx) {
    const game = GameState.desertIsland;
    game.pickedA = game.resourcePool[idx];

    document.querySelectorAll('.island-option-card').forEach((el, i) => {
        if (i === idx) el.classList.add('island-selected');
        else el.style.opacity = '0.5';
    });

    // 模拟对方选择（随机）
    const otherIdx = (idx + 1 + Math.floor(Math.random() * (game.resourcePool.length - 1))) % game.resourcePool.length;
    game.pickedB = game.resourcePool[otherIdx];
}

function confirmResource() {
    const game = GameState.desertIsland;
    if (!game.pickedA) {
        showToast('请先选择一个物资');
        return;
    }

    const item = game.pickedA;
    game.romancePts += item.romance;
    game.survivalPts += item.survival;
    game.choiceHistory.push(`${item.icon} ${item.name}（💕+${item.romance} 🏃+${item.survival}）`);

    showToast(`${item.icon} 获得 ${item.name}！`);
    game.pickedA = null;
    game.pickedB = null;
    game.round = 3;
    game.phase = 'round3';
    renderDesertIsland();
}

function selectFate(idx, effect) {
    const game = GameState.desertIsland;
    if (effect === 'romance') {
        game.romancePts += 25;
        game.choiceHistory.push(`命运抉择：浪漫选择 +25`);
    } else if (effect === 'survival') {
        game.survivalPts += 25;
        game.choiceHistory.push(`命运抉择：生存选择 +25`);
    } else {
        game.romancePts += 15;
        game.survivalPts += 15;
        game.choiceHistory.push(`命运抉择：完美选择 +15/+15`);
    }

    game.phase = 'result';
    renderDesertIsland();
}

// ====================================================
// 【私密】亲吻挑战
// ====================================================
const KISS_BANK = [
    { spot: '额头', icon: '🤍', level: 'warm' },
    { spot: '脸颊（左）', icon: '💋', level: 'warm' },
    { spot: '脸颊（右）', icon: '💋', level: 'warm' },
    { spot: '鼻尖', icon: '🐽', level: 'warm' },
    { spot: '嘴角', icon: '👄', level: 'flirt' },
    { spot: '耳垂', icon: '👂', level: 'flirt' },
    { spot: '锁骨', icon: '🫦', level: 'flirt' },
    { spot: '手心', icon: '🤲', level: 'warm' },
    { spot: '发梢', icon: '💁', level: 'warm' },
    { spot: '嘴唇', icon: '💏', level: 'spicy' },
    { spot: '脖子', icon: '🧣', level: 'spicy' },
    { spot: '肩膀', icon: '🦴', level: 'warm' },
    { spot: '小腹', icon: '🩹', level: 'spicy' },
    { spot: '嘴角持续 10 秒', icon: '🔥', level: 'spicy' },
    { spot: '在心口画爱心后亲一下', icon: '💘', level: 'flirt' }
];

function openKissGame() {
    GameState.kissGame = { idx: 0, used: [] };
    showScreen('kissGameScreen');
    renderKissGame('home');
}

function renderKissGame(state, data = {}) {
    const game = GameState.kissGame;
    document.getElementById('kissGameInfo').innerHTML = GameInfo.kissGame;

    if (state === 'home') {
        document.getElementById('kissGameArea').innerHTML = `
          <div class="play-area">
            <div style="font-size: 4rem;">💋</div>
            <h3>选择亲吻强度</h3>
            <div class="level-row">
              <button class="btn-primary level-chip" onclick="chooseKissLevel('warm')">💖 温柔</button>
              <button class="btn-primary level-chip" onclick="chooseKissLevel('flirt')">💋 暧昧</button>
              <button class="btn-primary level-chip" onclick="chooseKissLevel('spicy')">🔥 火热</button>
              <button class="btn-primary level-chip" onclick="chooseKissLevel('all')">🎲 全随机</button>
            </div>
            <p class="task-sub">下方点击「抽部位」，两侧头像自动交换 🎭</p>
          </div>`;
        return;
    }
    if (state === 'pick') {
        const item = data.item;
        const give = data.give;
        const target = data.target;
        const giveName = GameTools.getPlayerName(give);
        const targetName = GameTools.getPlayerName(target);
        document.getElementById('kissGameArea').innerHTML = `
          <div class="play-area">
            <div class="kiss-stage">
              <div class="kiss-avatar">🧑<div class="kiss-label">${giveName}</div></div>
              <div class="kiss-line">→ 💋 →</div>
              <div class="kiss-avatar">👩<div class="kiss-label">${targetName}</div></div>
            </div>
            <h2 style="margin: 16px 0 8px;">${item.icon} 亲吻：${item.spot}</h2>
            <p>${giveName} 亲吻 ${targetName} 的「${item.spot}」</p>
            <p class="task-sub">完成后请对方打分（0-10），平均分决定奖励 🎁</p>
            <button class="btn-primary" onclick="renderKissGame('home')">抽下一个</button>
          </div>`;
        return;
    }
}

function chooseKissLevel(level) {
    const game = GameState.kissGame;
    const candidates = level === 'all' ? KISS_BANK : KISS_BANK.filter(k => k.level === level);
    const item = candidates[Math.floor(Math.random() * candidates.length)];
    const give = Math.random() < 0.5 ? 'A' : 'B';
    const target = give === 'A' ? 'B' : 'A';
    renderKissGame('pick', { item, give, target });
}

// ====================================================
// 【私密】按摩券
// ====================================================
const MASSAGE_BANK = [
    { part: '肩颈深度放松', duration: 15, intensity: '中度', bonus: '附送 5 分钟头部按摩' },
    { part: '腰背舒缓', duration: 20, intensity: '轻度', bonus: '可让对方选择按摩精油香气' },
    { part: '足部 SPA', duration: 25, intensity: '中度', bonus: '附送热毛巾敷脚' },
    { part: '全身放松', duration: 30, intensity: '中度', bonus: '附送一杯对方泡的茶 🍵' },
    { part: '头部舒缓', duration: 10, intensity: '轻度', bonus: '附送 1 次掏耳' },
    { part: '手部精致按摩', duration: 15, intensity: '轻度', bonus: '附送 1 次手膜' },
    { part: '腿部塑形按摩', duration: 20, intensity: '中度', bonus: '附送揉捏 5 分钟' },
    { part: '眼部冷敷 + 面部按摩', duration: 15, intensity: '轻柔', bonus: '附送 1 个么么哒' },
    { part: '深度腰肌放松', duration: 25, intensity: '深度', bonus: '附送红糖姜茶' },
    { part: '香薰油压全身', duration: 40, intensity: '深度', bonus: '可让对方选香氛' }
];

function openMassage() {
    GameState.massage = { idx: 0, lastCoupon: null };
    showScreen('massageScreen');
    renderMassage();
}

function renderMassage() {
    const game = GameState.massage;
    const coupon = MASSAGE_BANK[Math.floor(Math.random() * MASSAGE_BANK.length)];
    game.lastCoupon = coupon;
    document.getElementById('massageInfo').innerHTML = GameInfo.massage;
    document.getElementById('massageArea').innerHTML = `
      <div class="play-area">
        <div class="coupon">
          <div class="coupon-title">💆 专属按摩券</div>
          <div class="coupon-part">${coupon.part}</div>
          <div class="coupon-meta">⏱ ${coupon.duration} 分钟 ｜ ${coupon.intensity}</div>
          <div class="coupon-bonus">🎁 ${coupon.bonus}</div>
          <div class="coupon-sign">—— 颁给最爱的 TA</div>
        </div>
        <button class="btn-primary" onclick="renderMassage()">🎟 再抽一张</button>
        <button class="btn-primary" onclick="recordGoToMenu('massage', 1, 0)">用券回家</button>
      </div>
      <div class="history">
        <h3>如何兑换</h3>
        <div class="history-item">1. 把页面截屏发给对方</div>
        <div class="history-item">2. 轻声说出「请给我做${coupon.part}」</div>
        <div class="history-item">3. 计时 ${coupon.duration} 分钟，输家端茶倒水 🍵</div>
      </div>`;
}

// ====================================================
// 【私密】私密任务生成器
// ====================================================
const SECRET_BANK = {
    warm: [
        { task: '让对方在你耳边说一句睡前悄悄话', time: 30 },
        { task: '和对方十指紧扣 1 分钟不说话', time: 60 },
        { task: '对方闭眼时偷偷在额头亲一口', time: 30 },
        { task: '让对方给你梳头发', time: 120 },
        { task: '让对方喂你吃一口零食', time: 20 }
    ],
    flirt: [
        { task: '让对方描述你身上最让他/她心动的部位', time: 60 },
        { task: '在你身上找到 3 个敏感点，告诉对方', time: 90 },
        { task: '让对方从脖子轻吻到耳根', time: 60 },
        { task: '抱起对方在房间里走 10 步', time: 30 },
        { task: '和对方玩「石头剪刀布」输的一方脱掉一件外衣', time: 60 }
    ],
    spicy: [
        { task: '在对方身上留下一串唇印（至少 3 个）', time: 120 },
        { task: '假装生气让对方哄你 5 分钟', time: 300 },
        { task: '用嘴喂对方一颗草莓', time: 30 },
        { task: '模仿最暧昧的声音让对方猜台词', time: 60 },
        { task: '让对方在你锁骨上画爱心', time: 60 }
    ]
};

function openSecretGenerator() {
    GameState.secretGenerator = { used: [], lastLevel: 'warm', lastTask: null, running: false, remaining: 0 };
    showScreen('secretGeneratorScreen');
    renderSecretGenerator('home');
}

function renderSecretGenerator(state) {
    const game = GameState.secretGenerator;
    document.getElementById('secretGeneratorInfo').innerHTML = GameInfo.secretGenerator;

    if (state === 'home') {
        document.getElementById('secretGeneratorArea').innerHTML = `
          <div class="play-area">
            <div style="font-size: 4rem;">🌹</div>
            <h3>私密任务生成器</h3>
            <div class="level-row">
              <button class="btn-primary level-chip" onclick="spinSecret('warm')">💖 暖心级</button>
              <button class="btn-primary level-chip" onclick="spinSecret('flirt')">💋 暧昧级</button>
              <button class="btn-primary level-chip" onclick="spinSecret('spicy')">🔥 火热级</button>
              <button class="btn-primary level-chip" onclick="spinSecret('random')">🎲 全随机</button>
            </div>
            <p class="task-sub">双方同意后才能解锁的亲密度挑战 💕</p>
          </div>`;
        return;
    }
    if (state === 'running') {
        const item = game.lastTask;
        document.getElementById('secretGeneratorArea').innerHTML = `
          <div class="play-area">
            <div class="task-header">
              <span class="task-level-badge">${item.level === 'warm' ? '暖心级' : item.level === 'flirt' ? '暧昧级' : '火热级'} · 计时任务</span>
            </div>
            <div class="task-main">${item.task}</div>
            <div class="timer" id="secretTimer">⏱ 剩余 ${formatTime(game.remaining)}</div>
            <p class="task-sub">完成后点击「完成」，超时扣掉亲密度 1 点 ⚠</p>
            <div class="btn-row">
              <button class="btn-primary" onclick="completeSecret()">✅ 完成</button>
              <button class="btn-primary btn-danger" onclick="failSecret()">⏰ 超时</button>
              <button class="btn-primary btn-ghost" onclick="renderSecretGenerator('home')">退出</button>
            </div>
          </div>`;
        GameTools.startTimer(item.time, (r) => {
            game.remaining = r;
            const el = document.getElementById('secretTimer');
            if (el) el.innerHTML = `⏱ 剩余 ${formatTime(r)}`;
        }, () => {
            showToast('时间到！任务超时 ⚠');
        });
        return;
    }
}

function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
}

function spinSecret(level) {
    const game = GameState.secretGenerator;
    const pool = level === 'random'
        ? [...SECRET_BANK.warm, ...SECRET_BANK.flirt, ...SECRET_BANK.spicy]
        : SECRET_BANK[level];
    const item = pool[Math.floor(Math.random() * pool.length)];
    item.level = level === 'random' ? item.level : level;
    game.lastTask = item;
    game.remaining = item.time;
    renderSecretGenerator('running');
}

function completeSecret() {
    GameTools.stopTimer();
    const game = GameState.secretGenerator;
    showToast(`完成「${game.lastTask.task}」，亲密度 +1 💗`);
    renderSecretGenerator('home');
}

function failSecret() {
    GameTools.stopTimer();
    showToast('亲密度 -1，下次要专心哦 💔');
    renderSecretGenerator('home');
}

// ====================================================
// 【私密】情书生成器
// ====================================================
const LETTER_TEMPLATES = [
    {
        title: '🌟 浪漫情书',
        build: ({ name, when, place, moment, wish }) =>
            `亲爱的${name}：\n\n那段在${place}的${when}，我仍记得${moment}。那一刻我只想把时间停住，让世界只剩下我们。\n\n未来的日子里，我想和你${wish}。\n\n永远爱你的，${GameTools.getPlayerName('A')}`
    },
    {
        title: '🌙 深夜情话',
        build: ({ name, when, place, moment, wish }) =>
            `${name}，夜深了。\n\n${moment} 是我现在最想和你做的事。在${place}的${when}，想起你嘴角的弧度，我的心就软得一塌糊涂。\n\n答应我，下一次让我陪你${wish}，好吗？`
    },
    {
        title: '🎉 周年纪念',
        build: ({ name, when, place, moment, wish }) =>
            `${name}：\n\n今天是我们相识的${when}。在${place}，我曾许下承诺：让你的每一个${moment}，都因我而甜。\n\n未来一年，我想和你${wish}。`
    },
    {
        title: '🍰 撒娇情书',
        build: ({ name, when, place, moment, wish }) =>
            `${name}宝宝：\n\n${when}的那天在${place}，你${moment}的样子，我能看一辈子。\n\n今天就是想你，想和你一起${wish}，抱抱我嘛～🥺`
    }
];

function openLoveLetter() {
    showScreen('loveLetterScreen');
    renderLoveLetter('form');
}

function renderLoveLetter(state, data = {}) {
    document.getElementById('loveLetterInfo').innerHTML = GameInfo.loveLetter;

    if (state === 'form') {
        document.getElementById('loveLetterArea').innerHTML = `
          <div class="play-area">
            <h3>📝 情书工坊</h3>
            <label class="input-label">对方昵称</label>
            <input type="text" id="letterName" class="input-field" placeholder="比如：宝贝 / 老婆 / 大可爱" value="${GameTools.getPlayerName('B')}">
            <label class="input-label">相识的「时刻」</label>
            <input type="text" id="letterWhen" class="input-field" placeholder="比如：春天 / 三年前的今天">
            <label class="input-label">浪漫的「地点」</label>
            <input type="text" id="letterPlace" class="input-field" placeholder="比如：海边 / 老街 / 我们第一次去的餐厅">
            <label class="input-label">一句「心动时刻」</label>
            <input type="text" id="letterMoment" class="input-field" placeholder="比如：你的笑容融化了整个夏天">
            <label class="input-label">未来的「愿望」</label>
            <input type="text" id="letterWish" class="input-field" placeholder="比如：一起走遍世界的每一个角落">
            <button class="btn-primary" onclick="generateLetter()">📮 生成情书</button>
          </div>`;
        return;
    }
    if (state === 'preview') {
        const tpl = data.tpl;
        const filled = data.filled;
        document.getElementById('loveLetterArea').innerHTML = `
          <div class="play-area">
            <div class="letter-template-switch">
              ${LETTER_TEMPLATES.map((t, i) => `<button class="btn-primary" onclick="switchLetter(${i})">${t.title}</button>`).join('')}
            </div>
            <div class="letter-preview" id="letterPreview">${tpl.build(filled).replace(/\n/g, '<br>')}</div>
            <div class="btn-row">
              <button class="btn-primary" onclick="copyLetter()">📋 复制</button>
              <button class="btn-primary" onclick="shareLetter()">📲 分享截图</button>
              <button class="btn-primary" onclick="renderLoveLetter('form')">返回编辑</button>
            </div>
          </div>`;
        return;
    }
}

function generateLetter() {
    const filled = {
        name: document.getElementById('letterName').value || '亲爱的',
        when: document.getElementById('letterWhen').value || '那一天',
        place: document.getElementById('letterPlace').value || '那个老地方',
        moment: document.getElementById('letterMoment').value || '你的笑容',
        wish: document.getElementById('letterWish').value || '走遍世界的每一个角落'
    };
    const tpl = LETTER_TEMPLATES[Math.floor(Math.random() * LETTER_TEMPLATES.length)];
    renderLoveLetter('preview', { tpl, filled });
    window.__letterCache = { tpl, filled };
}

function switchLetter(idx) {
    const cache = window.__letterCache;
    cache.tpl = LETTER_TEMPLATES[idx];
    document.getElementById('letterPreview').innerHTML = cache.tpl.build(cache.filled).replace(/\n/g, '<br>');
}

function copyLetter() {
    const text = document.getElementById('letterPreview').innerText;
    navigator.clipboard?.writeText(text);
    showToast('已复制到剪贴板 ✨');
}

function shareLetter() {
    showToast('长按预览区域即可截图保存 📸');
}

// ====================================================
// 【私密】愿望储蓄罐
// ====================================================
const DREAM_BANK = [
    '一起去看极光 🌌', '一起蹦极 🪂', '一起养一只小猫 🐱',
    '一起在阳台种满薄荷 🌿', '一起坐热气球 🎈',
    '一起给彼此过生日不告诉双方 🎂', '一起在某个城市迷路 🌆',
    '一起做一次义工 🤝', '一起拍一组搞怪情侣照 🤪',
    '一起学会做一道异国料理 🍝', '一起在雨天躲雨 🌧️',
    '一起参加朋友的婚礼变成焦点 💒', '一起在大海里浮潜 🤿',
    '一起为对方办一场小惊喜派对 🎉', '一起分享一罐蜂蜜，然后甜一整天 🍯'
];

function openDreamList() {
    GameState.dreamList = { idx: 0, list: GameTools.shuffle(DREAM_BANK).slice(0, 6) };
    showScreen('dreamListScreen');
    renderDreamList();
}

function renderDreamList() {
    const game = GameState.dreamList;
    document.getElementById('dreamListInfo').innerHTML = GameInfo.dreamList;

    if (game.idx >= game.list.length) {
        document.getElementById('dreamListArea').innerHTML = `
          <div class="play-area">
            <div style="font-size: 4rem;">💞</div>
            <h2>你们的愿望储蓄罐已装满</h2>
            <p>愿这些心愿，陪你们走到更远 ✨</p>
            <button class="btn-primary" onclick="openDreamList()">换一个储蓄罐</button>
            <button class="btn-primary" onclick="recordGoToMenu('dreamList', 0, 0)">回首页</button>
          </div>`;
        return;
    }
    const item = game.list[game.idx];
    document.getElementById('dreamListArea').innerHTML = `
      <div class="play-area">
        <div class="wish-jar">🫙</div>
        <div class="dream-tag">第 ${game.idx + 1} / ${game.list.length} 个心愿</div>
        <h2 class="wish-text">${item}</h2>
        <p class="task-sub">和 TA 一起，大声念出这个心愿 ✨</p>
        <div class="btn-row">
          <button class="btn-primary" onclick="nextDream()">🥰 收下这个心愿</button>
          <button class="btn-ghost" onclick="skipDream()">换下一个</button>
        </div>
      </div>`;
}

function nextDream() {
    GameState.dreamList.idx++;
    showToast('已收进愿望储蓄罐 💗');
    renderDreamList();
}

function skipDream() {
    GameState.dreamList.idx++;
    renderDreamList();
}

// ====================================================
// 【私密】热辣问答
// ====================================================
const HOT_SEAT_QUESTIONS = {
    warm: [
        '上一次偷看对方手机是什么时候？', '想跟对方交换身体一天吗？为什么？',
        '最想和对方在哪座城市定居？', '你觉得最尴尬的一次约会是什么时候？',
        '你们之间的「暗号」是什么？没有就现场编一个。', '让你心跳加速的瞬间是什么？'
    ],
    flirt: [
        '想让对方在哪个场景里被你扑倒？', '描述你最想让对方做的「坏事」。',
        '你最想让对方对你「霸道」一次吗？', '在你身上最想被亲的部位是？',
        '如果只能保留一种亲昵行为，你会选哪个？', '最想和对方在浴室里做的小事是？'
    ],
    spicy: [
        '你最想让对方「命令」你做的一件事？', '描述一次让你脸红心跳的对视。',
        '你最想在哪个公共场合亲对方？', '说一个只有你们懂的「暗号」并示范。',
        '你愿意为对方尝试什么样的装扮？', '你最想让对方在床上对你说什么？',
        '描述一下让你最晕的瞬间。', '如果对方现在答应一件事，你会要什么？'
    ],
    confession: [
        '你有没有偷偷为对方准备过什么惊喜？', '你最想对对方说但一直没说出口的一句话？',
        '你们之间最大的「未完成的心愿」？', '描述一件你为对方做过但 TA 不知道的事。',
        '说说对方让你最心疼的瞬间。', '你对这段感情的「未来期许」是什么？'
    ]
};

function openHotSeat() {
    GameState.hotSeat = { idx: 0, score: [0, 0], level: 'warm', answers: [] };
    showScreen('hotSeatScreen');
    renderHotSeat('home');
}

function renderHotSeat(state) {
    const game = GameState.hotSeat;
    const nameA = GameTools.getPlayerName('A');
    const nameB = GameTools.getPlayerName('B');
    document.getElementById('hotSeatInfo').innerHTML = GameInfo.hotSeat;

    if (state === 'home') {
        document.getElementById('hotSeatScore').innerHTML = '';
        document.getElementById('hotSeatArea').innerHTML = `
          <div class="play-area">
            <div style="font-size: 4rem;">🔥</div>
            <h3>选择答题强度</h3>
            <div class="level-row">
              <button class="btn-primary level-chip" onclick="hotSeatLevel('warm')">💖 暖心</button>
              <button class="btn-primary level-chip" onclick="hotSeatLevel('flirt')">💋 暧昧</button>
              <button class="btn-primary level-chip" onclick="hotSeatLevel('spicy')">🌶 火热</button>
              <button class="btn-primary level-chip" onclick="hotSeatLevel('confession')">💌 表白</button>
            </div>
            <p class="task-sub">由对方出题，答完由出题方打分（0-5 分）</p>
          </div>`;
        return;
    }
    if (state === 'asking') {
        const targetActor = game.idx % 2 === 0 ? 'A' : 'B';
        const asker = targetActor === 'A' ? 'B' : 'A';
        const q = HOT_SEAT_QUESTIONS[game.level][Math.floor(Math.random() * HOT_SEAT_QUESTIONS[game.level].length)];
        document.getElementById('hotSeatScore').innerHTML = GameTools.renderScoreBar(game.score[0], game.score[1], nameA, nameB, game.idx + 1, TOTAL_ROUNDS);
        document.getElementById('hotSeatArea').innerHTML = `
          <div class="play-area">
            <div class="task-header">
              <span class="task-level-badge">${game.level === 'warm' ? '暖心' : game.level === 'flirt' ? '暧昧' : game.level === 'spicy' ? '火热' : '表白'}级</span>
              <span class="task-sub">${GameTools.getPlayerName(asker)} 出题</span>
            </div>
            <h3 class="task-main">${q}</h3>
            <p class="task-sub">由 ${GameTools.getPlayerName(targetActor)} 回答，${GameTools.getPlayerName(asker)} 给 1-5 分</p>
            <div class="opt-list">
              ${[1, 2, 3, 4, 5].map(s => `<button class="btn-primary opt-btn" onclick="rateHotSeat(${s})">${s} 分</button>`).join('')}
            </div>
          </div>`;
        game.currentQ = q;
        game.currentTarget = targetActor;
        return;
    }
}

function hotSeatLevel(level) {
    GameState.hotSeat.level = level;
    renderHotSeat('asking');
}

function rateHotSeat(score) {
    const game = GameState.hotSeat;
    const nameA = GameTools.getPlayerName('A');
    const nameB = GameTools.getPlayerName('B');
    if (game.currentTarget === 'A') game.score[0] += score;
    else game.score[1] += score;
    game.answers.push({ q: game.currentQ, score, target: game.currentTarget });
    game.idx++;
    if (game.idx >= TOTAL_ROUNDS) {
        const totalA = game.score[0], totalB = game.score[1];
        const total = totalA + totalB;
        const win = totalA === totalB ? '💕 默契满分' : (totalA > totalB ? `${nameA} 被偏爱的更多 🌟` : `${nameB} 被偏爱的更多 🌟`);
        const percent = Math.round((total / (TOTAL_ROUNDS * 2 * 5)) * 100);
        document.getElementById('hotSeatScore').innerHTML = GameTools.renderScoreBar(game.score[0], game.score[1], nameA, nameB, TOTAL_ROUNDS, TOTAL_ROUNDS);
        document.getElementById('hotSeatArea').innerHTML = `
          <div class="play-area">
            <div style="font-size: 4rem;">💌</div>
            <h2>${win}</h2>
            <p>这一轮你们的「偏心指数」为 ${percent}%</p>
            <div class="history">
              ${game.answers.map((a, i) => `<div class="history-item">第${i+1}轮 · ${a.target === 'A' ? nameA : nameB}：${a.q}（${a.score} 分）</div>`).join('')}
            </div>
            <button class="btn-primary" onclick="openHotSeat()">再来一轮</button>
            <button class="btn-primary" onclick="recordGoToMenu('hotSeat', 0, 0)">返回菜单</button>
          </div>`;
        return;
    }
    renderHotSeat('asking');
}

// ====================================================
// 数据：玩法说明
// ====================================================
const GameInfo = {
    cardDuel: `<strong>🎴 卡牌对决</strong>｜5轮对战，每轮选择1/2/3分卡牌。<br>⚡闪电=直接获胜 🔄重赛=重来 👁偷看=偷看对方卡牌<br>三局两胜，模拟赌场氛围。`,
    truthDare: `<strong>💬 真心话大冒险</strong>｜轮流抽真心话/大冒险。<b>暖场</b> 围绕爱好与小习惯；<b>心动</b> 包括暧昧对话；<b>刺激</b> 只有情绪稳定时再尝试。可设置「拒绝」按钮，触发小惩罚。`,
    loveQuiz: `<strong>💝 心有灵犀</strong>｜8道题，一人描述一人猜。<br>30秒计时，15秒后显示提示。<br>答对+2分，最终计算「了解度」评级。`,
    wheel: `<strong>🎡 甜蜜许愿池</strong>｜CSS老虎机旋转动画，每次抽取一个浪漫任务。<br>可抽取3次，截图保存提醒对方执行。`,
    coupleDare: `<strong>💞 爱的挑战</strong>｜5轮协作挑战，先选难度（Easy/Medium/Hard）。<br>4大类别：亲密/创意/信任/搞笑。<br>双方评分，计算「挑战评级」。`,
    quizBattle: `<strong>⏱ 知识抢答</strong>｜10道题，喊"抢"后按按钮抢答。<br>抢到者5秒内作答，答对+2/答错-1。<br>最终看谁是抢答王 👑`,
    desertIsland: `<strong>🏝 荒岛余生</strong>｜3轮冒险：选择挑战→物资争夺→命运抉择。<br>分别累积「浪漫值」和「生存值」。<br>最终根据总分获得专属荒岛结局。`,
    kissGame: `<strong>💋 亲吻挑战</strong>｜随机抽部位（额头、嘴角、嘴唇、耳垂…），分<b>温柔/暧昧/火热</b>三档，两人同意后再开始。`,
    massage: `<strong>💆 按摩券</strong>｜抽取「部位+时长」按摩券，截屏发给对方，对方有义务完成。超时罚打 30 下屁股。`,
    secretGenerator: `<strong>🌹 私密任务生成器</strong>｜含计时器，<b>暖心/暧昧/火热</b>三种强度。<b>注意：</b>双方同意后再开始；任何一方可随时点击「退出」。`,
    loveLetter: `<strong>💌 情书工坊</strong>｜填写几个关键词（昵称/时刻/地点/心动/愿望），一秒生成情书，可一键复制或截图。`,
    dreamList: `<strong>🫙 愿望储蓄罐</strong>｜双向存放未来想一起完成的事。每个月打开一次，让浪漫延续。`,
    hotSeat: `<strong>🔥 热辣问答</strong>｜四档强度的快问快答；可自定义题目并由对方打分，最终得分决定当晚奖励。`,
    coupleTimer: `<strong>⏱ 情侣秒表</strong>｜设定时长（10秒 - 5分钟），由两人同时按下「开始」，看谁坚持最久，谁先松手就接受小挑战。<br><b>注意：</b> 内容会比较亲密，请先阅读玩法说明再开始。`
};
