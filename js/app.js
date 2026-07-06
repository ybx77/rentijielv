// 粒子背景
function createParticles() {
    const container = document.getElementById('particles');
    if (!container) return;
    const colors = ['#ff4d8d', '#ff79ab', '#a855f7', '#f59e0b', '#06b6d4'];
    for (let i = 0; i < 20; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        const size = Math.random() * 6 + 3;
        p.style.width = size + 'px';
        p.style.height = size + 'px';
        p.style.left = Math.random() * 100 + '%';
        p.style.background = colors[Math.floor(Math.random() * colors.length)];
        p.style.animationDuration = (Math.random() * 8 + 8) + 's';
        p.style.animationDelay = (Math.random() * 10) + 's';
        container.appendChild(p);
    }
}

// 屏幕切换
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(screenId);
    if (target) target.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    updateBottomNav(screenId);
}

// 底部导航
function navTo(screenId) {
    if (screenId === 'welcomeScreen') {
        showScreen(screenId);
        return;
    }
    if (screenId === 'myScreen') {
        loadMyPage();
        showScreen(screenId);
        updateBottomNavActive('myScreen');
        return;
    }
    if (screenId === 'paymentScreen') {
        showScreen(screenId);
        updateBottomNavActive('paymentScreen');
        return;
    }
    showScreen(screenId);
}

function updateBottomNavActive(screenId) {
    const nav = document.getElementById('bottomNav');
    if (!nav) return;
    const labels = { welcomeScreen: 0, welcomeScreen: 0, paymentScreen: 2, myScreen: 3 };
    nav.querySelectorAll('.nav-item').forEach((item, i) => {
        const screens = ['welcomeScreen', 'welcomeScreen', 'paymentScreen', 'myScreen'];
        item.classList.toggle('active', screens[i] === screenId);
    });
}

function updateBottomNav(screenId) {
    const nav = document.getElementById('bottomNav');
    if (!nav) return;
    const screens = ['welcomeScreen', 'welcomeScreen', 'paymentScreen', 'myScreen'];
    nav.querySelectorAll('.nav-item').forEach((item, i) => {
        item.classList.toggle('active', screens[i] === screenId);
    });
}

// Toast
function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
}

// 模态框
function showModal(title, text) {
    const sheet = document.getElementById('modalSheet');
    sheet.innerHTML = `
        <div class="modal-handle"></div>
        <div class="modal-title">${title}</div>
        <div class="modal-sub">${text}</div>
        <button class="btn-primary" onclick="closeModal()">确定</button>
    `;
    document.getElementById('modalOverlay').classList.add('active');
}

function closeModal() {
    document.getElementById('modalOverlay').classList.remove('active');
}

// 进入免费模式
function enterFreeMode() {
    showScreen('freeMenuScreen');
}

// 返回菜单
function goToMenu(toWelcome = false) {
    if (toWelcome) {
        showScreen('welcomeScreen');
        return;
    }
    showScreen('welcomeScreen');
}

// ====================================================
// 首页菜单渲染
// ====================================================
const FREE_GAMES = [
    { id: 'cardDuel',    icon: '🎴', name: '卡牌对决',   desc: '三局两胜' },
    { id: 'coupleDare',  icon: '💞', name: '亲密接力',   desc: '轮流发起' },
    { id: 'quizBattle',  icon: '⏱',  name: '抢答对战',   desc: '谁抢谁答' },
    { id: 'loveQuiz',    icon: '💝', name: '默契考验',   desc: '背靠背' },
    { id: 'desertIsland',icon: '🏝', name: '荒岛生存',   desc: '决策挑战' },
    { id: 'wheel',       icon: '🎡', name: '甜蜜许愿池',  desc: '抽浪漫任务' },
];

const PRIVATE_GAMES = [
    { id: 'kissGame',         icon: '💋', name: '亲吻挑战',    desc: '三档强度' },
    { id: 'secretGenerator',  icon: '🌹', name: '私密任务',    desc: '计时挑战' },
    { id: 'hotSeat',          icon: '🔥', name: '热辣问答',    desc: '互相打分' },
    { id: 'massage',          icon: '💆', name: '按摩券',      desc: '部位时长' },
    { id: 'loveLetter',       icon: '💌', name: '情书工坊',    desc: '秒生成' },
    { id: 'dreamList',         icon: '🫙', name: '愿望储蓄罐',  desc: '双向许愿' },
];

function renderHomeGrids() {
    const freeGrid = document.getElementById('freeGameGrid');
    const privGrid = document.getElementById('privateGameGrid');

    freeGrid.innerHTML = FREE_GAMES.map(g => `
        <div class="game-card" onclick="startGame('${g.id}')">
            <span class="game-card-icon">${g.icon}</span>
            <div class="game-card-name">${g.name}</div>
        </div>
    `).join('');

    privGrid.innerHTML = PRIVATE_GAMES.map(g => `
        <div class="game-card-lg" onclick="handlePrivateGame('${g.id}')">
            <span class="game-card-lg-icon">${g.icon}</span>
            <div class="game-card-lg-name">${g.name}</div>
            <div class="game-card-lg-desc">${g.desc}</div>
        </div>
    `).join('');

    // 更新私密区提示
    const more = document.getElementById('privateSectionMore');
    const user = typeof Auth !== 'undefined' ? Auth.currentUser() : null;
    if (user && user.private_unlocked) {
        more.textContent = '已解锁';
        more.style.color = 'var(--gold)';
    } else {
        more.textContent = '¥19.9 解锁';
        more.onclick = () => showScreen('paymentScreen');
    }
}

function handlePrivateGame(gameId) {
    if (typeof Auth !== 'undefined' && Auth.currentUser()?.private_unlocked) {
        startGame(gameId);
    } else {
        showModal('需要解锁', '私密模式专属内容，请先解锁');
        setTimeout(() => showScreen('paymentScreen'), 1200);
    }
}

// 情侣昵称设置（现在跳转到我的页面）
function openProfile() {
    navTo('myScreen');
}

// 旧 profileScreen 兼容：跳到我的页面
function goToMenu(toWelcome = false) {
    showScreen('welcomeScreen');
}

// ====================================================
// 初始化
// ====================================================
window.onload = function() {
    createParticles();
    renderHomeGrids();
    if (typeof refreshAuthUI === 'function') refreshAuthUI();
    if (typeof updateTopbarRight === 'function') updateTopbarRight();
};