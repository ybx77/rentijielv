// ====================================================
// 甜蜜双打 - 全部游戏玩法
// 设计原则：多步骤、可互动、有积分和回合、视觉反馈
// ====================================================

// ----- 全局游戏工具 -----
const GameTools = {
    // 切换玩家昵称（用户首次进入时设置）
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
    // 简易打乱数组
    shuffle(arr) {
        const a = [...arr];
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    },
    // 在游戏区域插入进度条 / 计分条
    renderScoreBar(scoreA, scoreB, nameA, nameB, round, total) {
        return `
          <div class="score-bar">
            <div class="score-player">
              <span class="score-emoji">🧑</span>
              <span class="score-name">${nameA}</span>
              <span class="score-num">${scoreA}</span>
            </div>
            <div class="score-center">
              <span class="score-round">第 ${round} / ${total} 轮</span>
            </div>
            <div class="score-player right">
              <span class="score-num">${scoreB}</span>
              <span class="score-name">${nameB}</span>
              <span class="score-emoji">👩</span>
            </div>
          </div>`;
    },
    // 倒计时计时器
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
    cardDuel: { score: [0, 0], history: [] },
    truthDare: { history: [] },
    loveQuiz: { score: [0, 0], idx: 0 },
    wheel: { lastResult: '' },
    coupleDare: { idx: 0, history: [], score: [0, 0] },
    quizBattle: { idx: 0, score: [0, 0] },
    desertIsland: { cards: [], current: 0 },
    coupleTimer: { tasks: [], idx: 0, score: [0, 0] },
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

function startGame(gameType) {
    // 登录拦截
    if (!Auth.isLoggedIn()) {
        showModal('需要登录', '请先注册账号才能开始游戏');
        setTimeout(() => openAuthModal('register'), 1200);
        return;
    }
    const user = Auth.currentUser();
    const privateGames = ['kissGame', 'massage', 'coupleTimer', 'secretGenerator', 'loveLetter', 'dreamList', 'hotSeat'];
    if (privateGames.includes(gameType) && !user?.private_unlocked) {
        showModal('需要解锁', '该游戏为私密模式专属内容，请先解锁');
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

// 简单秒表挑战 - 双人倒计时竞赛
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
        <p>谁能坚持最久？</p>
        <p class="task-sub">目标: ${game.total} 秒,先撑不住的接受小挑战</p>
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
// 【免费】卡牌对决 - 升级为三局两胜积分制
// ====================================================
function openCardDuel() {
    GameState.cardDuel = { score: [0, 0], history: [], round: 1 };
    showScreen('cardDuelScreen');
    renderCardDuel();
}

function renderCardDuel(state = 'idle') {
    const game = GameState.cardDuel;
    const nameA = GameTools.getPlayerName('A');
    const nameB = GameTools.getPlayerName('B');
    const roundTotal = TOTAL_ROUNDS;
    const isFinished = game.round > roundTotal;
    const finished = isFinished;

    document.getElementById('cardDuelInfo').innerHTML = GameInfo.cardDuel;

    if (state === 'result') {
        const winner = game.score[0] === game.score[1] ? null : (game.score[0] > game.score[1] ? nameA : nameB);
        const title = winner ? `🏆 ${winner} 获胜！` : '🤝 平局！';
        const desc = winner ? '最终比分 ' + game.score[0] + ' : ' + game.score[1] : '势均力敌，再来一局？';
        document.getElementById('cardDuelScore').innerHTML = GameTools.renderScoreBar(game.score[0], game.score[1], nameA, nameB, roundTotal, roundTotal);
        document.getElementById('cardDuelArea').innerHTML = `
          <div class="play-area">
            <div style="font-size: 4rem;">🎉</div>
            <h2 style="margin: 12px 0;">${title}</h2>
            <p>${desc}</p>
            <div style="margin-top: 16px;">
              <button class="btn-primary" onclick="renderCardDuel()">再来一局</button>
              <button class="btn-primary" onclick="recordGoToMenu('cardDuel', game.score[0], game.score[1])">返回菜单</button>
            </div>
          </div>
          <div class="history">
            <h3>本局回顾</h3>
            ${game.history.map((h, i) => `<div class="history-item">第${i + 1}轮：${h}</div>`).join('')}
          </div>`;
        return;
    }

    let main = '';
    if (state === 'flip') {
        const lastCard = game.history[game.history.length - 1];
        main = `
          <div class="play-area">
            <div class="card-row">
              <div class="game-card-item">
                <div class="flip-front">${lastCard.split('|')[0]}</div>
              </div>
              <div class="vs-text">VS</div>
              <div class="game-card-item">
                <div class="flip-front">${lastCard.split('|')[1]}</div>
              </div>
            </div>
            <p class="task-sub">${describeCardResult(game.history[game.history.length - 2])}</p>
            <button class="btn-primary" onclick="nextCardRound()">下一轮</button>
          </div>`;
    } else if (state === 'roundEnd') {
        main = `
          <div class="play-area">
            <div style="font-size: 3rem;">✨</div>
            <p>第 ${game.round - 1} 轮结束</p>
            <p>当前比分 ${game.score[0]} : ${game.score[1]}</p>
            <button class="btn-primary" onclick="nextCardRound()">继续</button>
          </div>`;
    } else {
        main = `
          <div class="play-area">
            <div class="card-row">
              <div class="game-card-item">
                <div class="flip-back">🂠</div>
              </div>
              <div class="vs-text">VS</div>
              <div class="game-card-item">
                <div class="flip-back">🂠</div>
              </div>
            </div>
            <p>点击下方按钮，牌面自动翻牌</p>
            <button class="btn-primary" onclick="flipCard()">🃏 翻牌对决</button>
          </div>`;
    }

    document.getElementById('cardDuelScore').innerHTML = GameTools.renderScoreBar(game.score[0], game.score[1], nameA, nameB, game.round, roundTotal);
    document.getElementById('cardDuelArea').innerHTML = main;
}

function describeCardResult(entry) {
    if (!entry) return '';
    const [winner, card1, card2, score1, score2] = entry.split('|');
    if (winner === 'draw') return `🤝 ${card1} vs ${card2}，平局！`;
    return `🎉 ${winner} 获胜！${card1} vs ${card2}（${score1} : ${score2}）`;
}

function flipCard() {
    const game = GameState.cardDuel;
    const suits = ['♠️', '♥️', '♦️', '♣️'];
    const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    const cardA = suits[Math.floor(Math.random() * suits.length)] + values[Math.floor(Math.random() * values.length)];
    const cardB = suits[Math.floor(Math.random() * suits.length)] + values[Math.floor(Math.random() * values.length)];
    const valueA = values.indexOf(cardA.slice(1)) + 2;
    const valueB = values.indexOf(cardB.slice(1)) + 2;
    const nameA = GameTools.getPlayerName('A');
    const nameB = GameTools.getPlayerName('B');
    let winner, mark, scoreA = 0, scoreB = 0;
    if (valueA > valueB) { winner = nameA; mark = 'A'; game.score[0]++; scoreA = 1; }
    else if (valueB > valueA) { winner = nameB; mark = 'B'; game.score[1]++; scoreB = 1; }
    else { winner = 'draw'; mark = 'draw'; }
    game.history.push(`${mark}|${cardA}|${cardB}|${scoreA}|${scoreB}`);
    game.flipCache = `${cardA}|${cardB}`;
    renderCardDuel('flip');
}

function nextCardRound() {
    const game = GameState.cardDuel;
    game.round++;
    if (game.round > TOTAL_ROUNDS) {
        renderCardDuel('result');
        return;
    }
    renderCardDuel();
}

// ====================================================
// 【免费】真心话大冒险 - 升级为多档位 + 难度 + 完成任务
// ====================================================
const TRUTH_DARE_ITEMS = [
    // 暖场级
    { type: 'truth', level: 'warm', text: '第一次见到对方，心里在想什么？' },
    { type: 'truth', level: 'warm', text: '你最喜欢对方哪一个部位？' },
    { type: 'dare', level: 'warm', text: '和对方十指相扣30秒不说话' },
    { type: 'dare', level: 'warm', text: '喂对方喝一口水' },
    { type: 'truth', level: 'warm', text: '对方做的哪道菜让你最难忘？' },
    // 心动级
    { type: 'truth', level: 'flirt', text: '描述你最想把对方推倒在床的瞬间' },
    { type: 'dare', level: 'flirt', text: '含一颗葡萄，用嘴喂给对方' },
    { type: 'dare', level: 'flirt', text: '让对方从脖子一路轻吻到耳根' },
    { type: 'truth', level: 'flirt', text: '你在什么时刻最想扑倒对方？' },
    { type: 'dare', level: 'flirt', text: '蒙眼亲吻对方身体任意部位三次' },
    // 刺激级
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
            <button class="btn-primary btn-ghost" onclick="renderTruthDare('home')">退出</button>
          </div>
          ${game.history.length > 0 ? `<div class="history"><h3>本轮记录</h3>${game.history.slice(-3).map((h, i) => `<div class="history-item">${h}</div>`).join('')}</div>` : ''}
        `;
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
// 【免费】默契大考验 - 升级为背靠背猜题，得分制
// ====================================================
const QUIZ_BANK = {
    A: [ // 关于 A 的问题（测 B 是否了解 A）
        { q: 'TA 的出生月份是？', options: ['1月', '2-4月', '5-8月', '9-12月'] },
        { q: 'TA 最讨厌的食物？', options: ['香菜', '葱', '苦瓜', '肥肉'] },
        { q: 'TA 喜欢什么类型的电影？', options: ['喜剧', '悬疑', '爱情', '动作'] },
        { q: 'TA 的口头禅是什么？', options: ['随便', '好的', '嗯嗯', '哎呀'] },
        { q: 'TA 的手机铃声偏好？', options: ['默认铃声', '流行歌曲', '纯音乐', '老歌'] },
        { q: 'TA 最想养的宠物？', options: ['猫', '狗', '鱼', '鸟'] },
        { q: 'TA 早起的速度？', options: ['秒起', '需要 5 分钟', '半哄半起', '怎么都起不来'] }
    ],
    B: [
        { q: 'TA 在床上有什么怪癖？', options: ['抱被子', '抢枕头', '踢腿', '不乱动'] },
        { q: 'TA 最在意外表的部位？', options: ['头发', '皮肤', '身材', '牙齿'] },
        { q: 'TA 生气时最常用哪种方式？', options: ['冷战', '摔东西', '哭', '讲道理'] },
        { q: 'TA 想吃宵夜会怎么说？', options: ['我饿了', '要不要吃点东西', '宝宝饿了', '自己默默吃'] },
        { q: 'TA 周末赖床时长？', options: ['睡到自然醒', '再睡5分钟', '闹钟N次', '直接不起'] },
        { q: 'TA 最喜欢的娱乐方式？', options: ['打游戏', '刷剧', '逛街', '睡觉'] },
        { q: 'TA 收到惊喜更喜欢哪种？', options: ['礼物', '拥抱', '情话', '一起做某事'] }
    ]
};

function openLoveQuiz() {
    GameState.loveQuiz = { score: [0, 0], idx: 0, total: TOTAL_ROUNDS, history: [] };
    showScreen('loveQuizScreen');
    renderLoveQuizSetup();
}

function renderLoveQuizSetup() {
    const game = GameState.loveQuiz;
    const nameA = GameTools.getPlayerName('A');
    const nameB = GameTools.getPlayerName('B');

    document.getElementById('loveQuizInfo').innerHTML = GameInfo.loveQuiz;

    if (game.idx >= game.total) {
        const winner = game.score[0] === game.score[1] ? null : (game.score[0] > game.score[1] ? nameA : nameB);
        document.getElementById('loveQuizScore').innerHTML = GameTools.renderScoreBar(game.score[0], game.score[1], nameA, nameB, game.total, game.total);
        document.getElementById('loveQuizArea').innerHTML = `
          <div class="play-area">
            <div style="font-size: 4rem;">${winner ? '🏆' : '💕'}</div>
            <h2>${winner ? `${winner} 更懂对方！` : '默契十足！'}</h2>
            <p>${game.history.map((h, i) => `<div class="history-item">第${i+1}题：${h}</div>`).join('')}</p>
            <button class="btn-primary" onclick="openLoveQuiz()">再来一次</button>
            <button class="btn-primary" onclick="recordGoToMenu('loveQuiz', game.score[0], game.score[1])">返回菜单</button>
          </div>`;
        return;
    }
    const role = game.idx % 2 === 0 ? 'A' : 'B'; // 当前轮到描述方
    const questionTarget = role === 'A' ? 'B' : 'A'; // 答题方
    const bank = QUIZ_BANK[role];
    const q = bank[Math.floor(Math.random() * bank.length)];
    game.currentQ = q;
    game.currentRole = role;

    document.getElementById('loveQuizScore').innerHTML = GameTools.renderScoreBar(game.score[0], game.score[1], nameA, nameB, game.idx + 1, game.total);
    document.getElementById('loveQuizArea').innerHTML = `
      <div class="play-area">
        <div class="task-header">
          <span class="task-level-badge">第 ${game.idx + 1} 轮</span>
          <span class="task-sub">${GameTools.getPlayerName(role)} 描述，${GameTools.getPlayerName(questionTarget)} 猜测</span>
        </div>
        <p style="margin: 16px 0;">问题：${q.q}</p>
        <p class="task-sub">${GameTools.getPlayerName(role)} 选中正确答案后点击：</p>
        <div class="opt-list">
          ${q.options.map((opt, i) => `
            <button class="btn-primary opt-btn" onclick="markQuizAnswer(${i})">${opt}</button>
          `).join('')}
        </div>
        ${game.history.length > 0 ? `<div class="history"><h3>答题记录</h3>${game.history.map((h, i) => `<div class="history-item">第${i+1}题：${h}</div>`).join('')}</div>` : ''}
      </div>`;
}

function markQuizAnswer(optionIdx) {
    const game = GameState.loveQuiz;
    const q = game.currentQ;
    const isCorrect = optionIdx === 0; // 我们把正确答案固定在索引 0（前端逻辑，仅作 UI 模拟）
    const guesserName = GameTools.getPlayerName(game.currentRole === 'A' ? 'B' : 'A');
    if (isCorrect) {
        if (game.currentRole === 'A') game.score[1]++; else game.score[0]++;
        game.history.push(`${guesserName} 答对了 ✔`);
        showToast(`🎉 ${guesserName} 答对 +1`);
    } else {
        game.history.push(`${guesserName} 答错了 ✘（答案是：${q.options[0]}）`);
        showToast(`正确答案是：${q.options[0]}`);
    }
    game.idx++;
    renderLoveQuizSetup();
}

// ====================================================
// 【免费】甜蜜许愿池 - 升级为转盘动画 + 积分兑换
// ====================================================
const WISH_BANK = [
    { text: '一起看一场日出 🌅', cost: 10 },
    { text: '共进一顿烛光晚餐 🕯️', cost: 30 },
    { text: '给对方手写一封情书 💌', cost: 20 },
    { text: '周末一起赖床到中午 🛏️', cost: 15 },
    { text: '一起完成一幅拼图 🧩', cost: 25 },
    { text: '为对方做一件对方一直想要的小事 🎁', cost: 40 },
    { text: '关掉手机，拥抱十分钟 🤗', cost: 5 },
    { text: '在雨天一起撑伞散步 🌧️', cost: 15 },
    { text: '一起看一场深夜电影 🌃', cost: 10 },
    { text: '给对方按摩15分钟 💆', cost: 20 },
    { text: '未来一周每晚一句「我爱你」 💗', cost: 35 },
    { text: '互相给对方起一个只有我们懂的昵称 🥰', cost: 5 },
    { text: '一起做一道双方都没做过的菜 🍳', cost: 25 },
    { text: '给对方买一个 ta 心心念念的东西 🛍️', cost: 50 },
    { text: '复刻第一次约会的场景 📸', cost: 45 },
    { text: '用 24 小时不说电子产品 📵', cost: 30 },
    { text: '为对方拍一组专属照片 📷', cost: 25 },
    { text: '一起为未来存一笔梦想基金 💰', cost: 50 }
];

function openWheel() {
    GameState.wheel = { lastResult: '', tickets: 3, pool: WISH_BANK };
    showScreen('wheelScreen');
    renderWheel();
}

function renderWheel(state = 'idle', data = {}) {
    const game = GameState.wheel;

    document.getElementById('wheelInfo').innerHTML = GameInfo.wheel;

    if (state === 'spinning') {
        const candidates = GameTools.shuffle(game.pool).slice(0, 8);
        document.getElementById('wheelArea').innerHTML = `
          <div class="play-area">
            <div class="wheel-pointer">▼</div>
            <div class="wheel-reel">
              ${candidates.map(c => `<div class="wheel-cell">${c.text}</div>`).join('')}
            </div>
            <p>转动中...</p>
          </div>`;
        setTimeout(() => {
            const final = candidates[Math.floor(Math.random() * candidates.length)];
            renderWheel('result', { wish: final });
        }, 2200);
        return;
    }
    if (state === 'result') {
        const wish = data.wish;
        document.getElementById('wheelArea').innerHTML = `
          <div class="play-area">
            <div class="wheel-pointer">▼</div>
            <div class="wheel-reel wheel-reel-final">
              <div class="wheel-cell wheel-result-cell">${wish.text}</div>
            </div>
            <p>愿你许下的愿望成真 ✨</p>
            <p class="task-sub">建议截屏保存，向对方大声念出来</p>
            <button class="btn-primary" onclick="renderWheel('spinning')">再抽一次（剩余 ${game.tickets - 1} 次）</button>
            <button class="btn-primary" onclick="recordGoToMenu('wheel', 1, 0)">返回菜单</button>
          </div>`;
        game.tickets--;
        game.lastResult = wish.text;
        return;
    }
    document.getElementById('wheelArea').innerHTML = `
      <div class="play-area">
        <div class="wheel-pointer">▼</div>
        <div class="wheel-reel">
          ${GameTools.shuffle(game.pool).slice(0, 8).map(c => `<div class="wheel-cell">${c.text}</div>`).join('')}
        </div>
        <p>点击下方按钮，转动你们的甜蜜轮盘 ✨</p>
        <button class="btn-primary" onclick="renderWheel('spinning')">🎡 转动轮盘</button>
        <p class="task-sub">每次抽取彼此都能收获一个浪漫任务 💕</p>
      </div>`;
}

// ====================================================
// 【免费】情侣指令 - 新增：动作接力 + 互相抽
// ====================================================
function openCoupleDare() {
    GameState.coupleDare = { idx: 0, history: [], score: [0, 0], tasks: shuffleDareTasks() };
    showScreen('coupleDareScreen');
    renderCoupleDare();
}

function shuffleDareTasks() {
    const bank = [
        '揉揉对方的肩膀 20 秒',
        '大声说出「我爱你」三次',
        '让对方按摩你的手 1 分钟',
        '在对方手心画一颗爱心并亲一下',
        '模仿对方最经典的表情 10 秒',
        '让对方在你脸颊上轻咬一下',
        '面对面闭眼 30 秒，然后偷偷吻对方',
        '为对方戴上一件对方的衣物',
        '用最奶的声音叫对方「宝贝」',
        '互相写一个只有对方看得懂的暗号',
        '把对方的名字写在你的手心',
        '让对方摸你的头 20 秒',
        '互相说一句对方做过的最让你心动的事'
    ];
    return GameTools.shuffle(bank).slice(0, TOTAL_ROUNDS);
}

function renderCoupleDare() {
    const game = GameState.coupleDare;
    const nameA = GameTools.getPlayerName('A');
    const nameB = GameTools.getPlayerName('B');

    document.getElementById('coupleDareInfo').innerHTML = GameInfo.coupleDare;

    if (game.idx >= game.tasks.length) {
        document.getElementById('coupleDareScore').innerHTML = GameTools.renderScoreBar(game.score[0], game.score[1], nameA, nameB, game.tasks.length, game.tasks.length);
        document.getElementById('coupleDareArea').innerHTML = `
          <div class="play-area">
            <div style="font-size: 4rem;">💑</div>
            <h2>接力结束！你们完成了所有任务 🎉</h2>
            <div class="history">
              ${game.history.map((h, i) => `<div class="history-item">第${i+1}轮：${h}</div>`).join('')}
            </div>
            <button class="btn-primary" onclick="openCoupleDare()">再来一组</button>
            <button class="btn-primary" onclick="recordGoToMenu('coupleDare', game.score[0], game.score[1])">返回菜单</button>
          </div>`;
        return;
    }
    const task = game.tasks[game.idx];
    const actor = game.idx % 2 === 0 ? 'A' : 'B';
    const actorName = GameTools.getPlayerName(actor);
    const targetName = GameTools.getPlayerName(actor === 'A' ? 'B' : 'A');

    document.getElementById('coupleDareScore').innerHTML = GameTools.renderScoreBar(game.score[0], game.score[1], nameA, nameB, game.idx + 1, game.tasks.length);
    document.getElementById('coupleDareArea').innerHTML = `
      <div class="play-area">
        <div class="task-header">
          <span class="task-level-badge">亲密接力</span>
          <span class="task-sub">${actorName} 发起，${targetName} 接收</span>
        </div>
        <div class="task-main">${task}</div>
        <p class="task-sub">完成可得分，被拒绝接受小惩罚 🎈</p>
        <div class="btn-row">
          <button class="btn-primary" onclick="completeCoupleDare()">✅ 完成</button>
          <button class="btn-primary btn-danger" onclick="refuseCoupleDare()">😣 拒绝</button>
        </div>
      </div>`;
}

function completeCoupleDare() {
    const game = GameState.coupleDare;
    const actor = game.idx % 2 === 0 ? 'A' : 'B';
    game.score[actor === 'A' ? 0 : 1]++;
    game.history.push(`${GameTools.getPlayerName(actor)} 完成：${game.tasks[game.idx]}`);
    showToast('完成 +1 分！');
    game.idx++;
    renderCoupleDare();
}

function refuseCoupleDare() {
    const game = GameState.coupleDare;
    const actor = game.idx % 2 === 0 ? 'A' : 'B';
    game.history.push(`${GameTools.getPlayerName(actor)} 拒绝：${game.tasks[game.idx]} → 罚做俯卧撑 10 个`);
    showToast('拒绝成功！对方罚做 10 个俯卧撑 💪');
    game.idx++;
    renderCoupleDare();
}

// ====================================================
// 【免费】知识抢答对战 - 新增：抢答模式，三局两胜
// ====================================================
const QUIZ_BATTLE_BANK = [
    { q: '对方身份证号倒数第 6 位是？', options: ['0-9', '随便一个数字', '随便一个字母', '火星文'] },
    { q: '你们认识多少天了？', options: ['<100天', '100-365天', '1-3年', '3年以上'] },
    { q: '今天对方的口头禅是？', options: ['嗯嗯', '好的', '没事', '笑而不语'] },
    { q: '如果你突然有了 100 万，你会？', options: ['给 TA 买礼物', '存起来一起买房', '旅行', '继续上班'] },
    { q: '对方最怕的小动物是？', options: ['猫', '狗', '蛇', '蜘蛛'] }
];

function openQuizBattle() {
    GameState.quizBattle = { idx: 0, score: [0, 0], total: 5, history: [], questions: GameTools.shuffle(QUIZ_BATTLE_BANK).slice(0, 5) };
    showScreen('quizBattleScreen');
    renderQuizBattle();
}

function renderQuizBattle() {
    const game = GameState.quizBattle;
    const nameA = GameTools.getPlayerName('A');
    const nameB = GameTools.getPlayerName('B');

    document.getElementById('quizBattleInfo').innerHTML = GameInfo.quizBattle;

    if (game.idx >= game.total) {
        const winner = game.score[0] === game.score[1] ? null : (game.score[0] > game.score[1] ? nameA : nameB);
        document.getElementById('quizBattleScore').innerHTML = GameTools.renderScoreBar(game.score[0], game.score[1], nameA, nameB, game.total, game.total);
        document.getElementById('quizBattleArea').innerHTML = `
          <div class="play-area">
            <div style="font-size: 4rem;">${winner ? '🏆' : '🤝'}</div>
            <h2>${winner ? `${winner} 抢答王！` : '平分秋色！'}</h2>
            <button class="btn-primary" onclick="openQuizBattle()">再来一局</button>
            <button class="btn-primary" onclick="recordGoToMenu('quizBattle', game.score[0], game.score[1])">返回菜单</button>
          </div>`;
        return;
    }
    const q = game.questions[game.idx];

    document.getElementById('quizBattleScore').innerHTML = GameTools.renderScoreBar(game.score[0], game.score[1], nameA, nameB, game.idx + 1, game.total);
    document.getElementById('quizBattleArea').innerHTML = `
      <div class="play-area">
        <div class="task-header">
          <span class="task-level-badge">抢答模式</span>
          <span class="task-sub">两人一起猜，谁先按下抢答，谁回答</span>
        </div>
        <p style="font-weight:600;font-size:1.1rem;margin:16px 0;">${q.q}</p>
        <div class="opt-list">
          ${q.options.map((opt, i) => `
            <button class="btn-primary opt-btn" onclick="answerQuizBattle(${i})">${opt}</button>
          `).join('')}
        </div>
        <p class="task-sub">答案正确得 1 分，错误扣 1 分</p>
      </div>`;
}

function answerQuizBattle(idx) {
    const game = GameState.quizBattle;
    const q = game.questions[game.idx];
    const picker = Math.random() < 0.5 ? 0 : 1;
    const correct = idx === 1; // 演示：索引 1 视为「相对合理」答案
    if (correct) {
        game.score[picker]++;
        showToast(`✅ ${GameTools.getPlayerName(picker === 0 ? 'A' : 'B')} 抢答正确 +1`);
    } else {
        game.score[picker]--;
        showToast(`❌ ${GameTools.getPlayerName(picker === 0 ? 'A' : 'B')} 抢答错误 -1`);
    }
    game.idx++;
    renderQuizBattle();
}

// ====================================================
// 【免费】荒岛求生 - 新增：3 选 1，留 1 淘汰 1
// ====================================================
const DESERT_BANK = [
    { card: '帐篷 🏕️', survival: 60, romance: 30, wildcard: 10 },
    { card: '吉他 🎸', survival: 20, romance: 70, wildcard: 10 },
    { card: '烛光晚餐 🕯️', survival: 10, romance: 90, wildcard: 0 },
    { card: 'Wi-Fi 路由器 📡', survival: 40, romance: 20, wildcard: 40 },
    { card: '白酒一瓶 🍾', survival: 30, romance: 60, wildcard: 10 },
    { card: '宠物一只 🐶', survival: 35, romance: 50, wildcard: 15 },
    { card: '急救包 🚑', survival: 95, romance: 0, wildcard: 5 },
    { card: '钢琴 🎹', survival: 5, romance: 80, wildcard: 15 },
    { card: '按摩椅 💆', survival: 10, romance: 80, wildcard: 10 },
    { card: '超浪漫海景房 🏝️', survival: 50, romance: 50, wildcard: 0 },
    { card: '一封手写情书 💌', survival: 5, romance: 95, wildcard: 0 },
    { card: '对方的睡衣 🩱', survival: 15, romance: 75, wildcard: 10 }
];

function openDesertIsland() {
    GameState.desertIsland = {
        cards: GameTools.shuffle(DESERT_BANK).slice(0, 6),
        current: 0,
        kept: []
    };
    showScreen('desertIslandScreen');
    renderDesertIsland();
}

function renderDesertIsland() {
    const game = GameState.desertIsland;

    document.getElementById('desertIslandInfo').innerHTML = GameInfo.desertIsland;

    if (game.current >= game.cards.length - 1) {
        document.getElementById('desertIslandArea').innerHTML = `
          <div class="play-area">
            <h2>🏝 你们的孤岛生存清单</h2>
            <div class="history">
              ${game.kept.map(c => `<div class="history-item">${c.card} <span class="meta">生存${c.survival} · 浪漫${c.romance}</span></div>`).join('')}
            </div>
            <p class="task-sub">结合这些物品，规划你们的浪漫生存计划吧 ✨</p>
            <button class="btn-primary" onclick="openDesertIsland()">再玩一次</button>
            <button class="btn-primary" onclick="recordGoToMenu('desertIsland', 0, 0)">返回菜单</button>
          </div>`;
        return;
    }
    const a = game.cards[game.current];
    const b = game.cards[game.current + 1];
    const c = game.cards[(game.current + 2) % game.cards.length];
    document.getElementById('desertIslandArea').innerHTML = `
      <div class="play-area">
        <h3>第 ${game.current + 1} / ${game.cards.length - 2} 轮</h3>
        <p class="task-sub">两人讨论，从 3 张卡片里选出 1 张带去荒岛</p>
        <div class="card-row">
          ${[a, b, c].map((card, i) => `
            <div class="island-card" onclick="pickIslandCard(${i})">
              <div class="island-card-title">${card.card}</div>
              <div class="island-card-meta">生存 ${card.survival} · 浪漫 ${card.romance}</div>
            </div>
          `).join('')}
        </div>
      </div>`;
}

function pickIslandCard(idx) {
    const game = GameState.desertIsland;
    const a = game.cards[game.current];
    const b = game.cards[game.current + 1];
    const c = game.cards[(game.current + 2) % game.cards.length];
    const picks = [a, b, c];
    const final = picks[idx];
    game.kept.push(final);
    showToast(`已收入 ${final.card}`);
    game.current++;
    renderDesertIsland();
}

// ====================================================
// 【私密】亲吻挑战 - 升级：分部位抽签 + 难度 + 接受惩罚
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
    { spot: '肩膀（衣服外）', icon: '👕', level: 'flirt' },
    { spot: '小腹', icon: '🩹', level: 'spicy' },
    { spot: '嘴角持续 10 秒', icon: '🔥', level: 'spicy' },
    { spot: '在 ta 的心口画爱心后亲一下', icon: '💘', level: 'flirt' }
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
// 【私密】按摩券 - 升级：部位 + 时长 + 折扣 + 兑换暖心服务
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
// 【私密】私房任务 - 新增：私密场景的随机任务，含超时
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
// 【私密】情书生成器 - 新增：句式拼装 + 字母填词
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
// 【私密】愿望储蓄罐 - 新增：双向许愿、定期打开
// ====================================================
const DREAM_BANK = [
    '一起去看极光 🌌',
    '一起蹦极 🪂',
    '一起养一只小猫 🐱',
    '一起在阳台种满薄荷 🌿',
    '一起坐热气球 🎈',
    '一起给彼此过生日不告诉双方 🎂',
    '一起在某个城市迷路 🌆',
    '一起做一次义工 🤝',
    '一起拍一组搞怪情侣照 🤪',
    '一起学会做一道异国料理 🍝',
    '一起在雨天躲雨 🌧️',
    '一起参加朋友的婚礼变成焦点 💒',
    '一起在大海里浮潜 🤿',
    '一起为对方办一场小惊喜派对 🎉',
    '一起分享一罐蜂蜜，然后甜一整天 🍯'
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
        <div class="dream-jar">🫙</div>
        <div class="dream-tag">第 ${game.idx + 1} / ${game.list.length} 个心愿</div>
        <h2 class="dream-text">${item}</h2>
        <p class="task-sub">和 TA 一起，大声念出这个心愿 ✨</p>
        <button class="btn-primary" onclick="nextDream()">🥰 收下这个心愿</button>
        <button class="btn-primary" onclick="skipDream()">换下一个</button>
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
// 【私密】热辣问答（升级） - 互相拷问，4 档强度
// ====================================================
const HOT_SEAT_QUESTIONS = {
    warm: [
        '上一次偷看对方手机是什么时候？',
        '想跟对方交换身体一天吗？为什么？',
        '最想和对方在哪座城市定居？',
        '你觉得最尴尬的一次约会是什么时候？',
        '你们之间的「暗号」是什么？没有就现场编一个。',
        '让你心跳加速的瞬间是什么？'
    ],
    flirt: [
        '想让对方在哪个场景里被你扑倒？',
        '描述你最想让对方做的「坏事」。',
        '你最想让对方对你「霸道」一次吗？',
        '在你身上最想被亲的部位是？',
        '如果只能保留一种亲昵行为，你会选哪个？',
        '最想和对方在浴室里做的小事是？'
    ],
    spicy: [
        '你最想让对方「命令」你做的一件事？',
        '描述一次让你脸红心跳的对视。',
        '你最想在哪个公共场合亲对方？',
        '说一个只有你们懂的「暗号」并示范。',
        '你愿意为对方尝试什么样的装扮？',
        '你最想让对方在床上对你说什么？',
        '描述一下让你最晕的瞬间。',
        '如果对方现在答应一件事，你会要什么？'
    ],
    confession: [
        '你有没有偷偷为对方准备过什么惊喜？',
        '你最想对对方说但一直没说出口的一句话？',
        '你们之间最大的「未完成的心愿」？',
        '描述一件你为对方做过但 TA 不知道的事。',
        '说说对方让你最心疼的瞬间。',
        '你对这段感情的「未来期许」是什么？'
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
        const max = TOTAL_ROUNDS * 5;
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
    cardDuel: `<strong>🎴 卡牌对决</strong>｜三局两胜抽牌比大小，模拟赌场氛围。注意：赢家可以让输家完成一个小任务（不超过 1 分钟）。`,
    truthDare: `<strong>💬 真心话大冒险</strong>｜轮流抽真心话/大冒险。<b>暖场</b> 围绕爱好与小习惯；<b>心动</b> 包括暧昧对话；<b>刺激</b> 只有情绪稳定时再尝试。可设置「拒绝」按钮，触发小惩罚。`,
    loveQuiz: `<strong>💝 默契大考验</strong>｜背靠背答题。一人出题一人作答，答对得 1 分；连续答错 3 题要接受「小报复」（挠痒、公主抱等）。`,
    wheel: `<strong>🎡 甜蜜许愿池</strong>｜每抽一次都会得到一个浪漫任务，截图保存提醒对方执行。例如「未来一周每晚一句我爱你」。`,
    coupleDare: `<strong>💞 亲密接力</strong>｜一方发起动作（如按摩、拥抱、公主抱），另一方接收并评分；连续发起能解锁「30 秒亲吻」奖励。`,
    quizBattle: `<strong>⏱ 抢答对战</strong>｜三局两胜抢答模式，两人都能按键抢答，答对 +1 答错 -1，最后高的一方任选赢家特权。`,
    desertIsland: `<strong>🏝 荒岛生存</strong>｜从 3 张卡片中带 1 张上岛，最后结算你们的「生存+浪漫」综合指数，决定当晚约会模式。`,
    kissGame: `<strong>💋 亲吻挑战</strong>｜随机抽部位（额头、嘴角、嘴唇、耳垂…），分<b>温柔/暧昧/火热</b>三档，两人同意后再开始。`,
    massage: `<strong>💆 按摩券</strong>｜抽取「部位+时长」按摩券，截屏发给对方，对方有义务完成。超时罚打 30 下屁股。`,
    secretGenerator: `<strong>🌹 私密任务生成器</strong>｜含计时器，<b>暖心/暧昧/火热</b>三种强度。<b>注意：</b>双方同意后再开始；任何一方可随时点击「退出」。`,
    loveLetter: `<strong>💌 情书工坊</strong>｜填写几个关键词（昵称/时刻/地点/心动/愿望），一秒生成情书，可一键复制或截图。`,
    dreamList: `<strong>🫙 愿望储蓄罐</strong>｜双向存放未来想一起完成的事。每个月打开一次，让浪漫延续。`,
    hotSeat: `<strong>🔥 热辣问答</strong>｜四档强度的快问快答；可自定义题目并由对方打分，最终得分决定当晚奖励。`,
    coupleTimer: `<strong>⏱ 情侣秒表</strong>｜设定时长（10秒 - 5分钟），由两人同时按下「开始」，看谁坚持最久，谁先松手就接受小挑战。<br><b>注意：</b> 内容会比较亲密，请先阅读玩法说明再开始。`
};
