// ====================================================
// 支付 + 私密模式解锁流程
// ====================================================
window.UnlockState = {
    pollingTimer: null,
    pollIntervalMs: 3000,
    stop() {
        clearInterval(UnlockState.pollingTimer);
        UnlockState.pollingTimer = null;
    },
    async poll(orderNo) {
        try {
            const data = await Orders.status(orderNo);
            if (data.user_banned) {
                UnlockState.stop();
                Auth.logout();
                showModal('账号异常', '您的账号已被封禁，请联系客服');
                return;
            }
            if (data.private_unlocked) {
                UnlockState.stop();
                showToast('审核通过，私密模式已解锁！');
                const cur = Auth.currentUser() || {};
                Auth.setSession(localStorage.getItem('couple_token'), { ...cur, private_unlocked: 1 });
                renderHomeGrids();
                showScreen('welcomeScreen');
            }
        } catch (e) { /* 忽略轮询错误 */ }
    }
};

async function unlockPrivateMode() {
    if (!Auth.isLoggedIn()) {
        showModal('需要登录', '请先注册账号，再解锁私密模式');
        setTimeout(() => openAuthModal('register'), 1200);
        return;
    }
    const user = Auth.currentUser();
    if (user.private_unlocked) {
        showToast('已是私密模式用户');
        return;
    }
    const orderNo = document.getElementById('orderInput')?.value.trim();
    if (!orderNo) return showToast('请输入订单号');
    if (!/^\d{4,32}$/.test(orderNo)) return showToast('订单号格式不正确（纯数字 4-32 位）');

    try {
        const data = await Orders.submit(orderNo);
        if (data.private_unlocked) {
            Auth.setSession(localStorage.getItem('couple_token'), { ...user, private_unlocked: 1 });
            showToast('解锁成功！');
            renderHomeGrids();
            setTimeout(() => showScreen('welcomeScreen'), 600);
            return;
        }
        showToast('订单已提交，审核中…');
        UnlockState.stop();
        UnlockState.pollingTimer = setInterval(() => UnlockState.poll(orderNo), UnlockState.pollIntervalMs);
        setTimeout(() => UnlockState.stop(), 5 * 60 * 1000);
    } catch (err) {
        showToast(err.message || '提交失败');
    }
}

// ====================================================
// 登录 / 注册 底部弹窗
// ====================================================
function openAuthModal(mode = 'login') {
    const isLogin = mode === 'login';
    const sheet = document.getElementById('modalSheet');
    sheet.innerHTML = `
        <div class="modal-handle"></div>
        <div class="modal-title">${isLogin ? '登录账号' : '创建账号'}</div>
        <div class="modal-sub">${isLogin ? '欢迎回来，继续甜蜜游戏' : '开启你们的情侣游戏之旅'}</div>

        ${!isLogin ? `
            <input type="text" class="modal-input" id="authNickname" placeholder="你的昵称（可选）" autocomplete="off">
            <input type="text" class="modal-input" id="authPartner" placeholder="TA 的昵称（可选）" autocomplete="off">
            <input type="email" class="modal-input" id="authEmail" placeholder="邮箱（用于找回账号）" autocomplete="email" required>
        ` : `
            <input type="text" class="modal-input" id="authUsername" placeholder="账号" autocomplete="username">
            <input type="password" class="modal-input" id="authPassword" placeholder="密码" autocomplete="current-password">
            <button class="btn-primary" onclick="submitAuth(true)" style="margin-top:8px;">
                <i class="fas fa-right-to-bracket"></i> 登录
            </button>
            <div class="modal-divider">或者</div>
            <button class="btn-secondary" onclick="openAuthModal('register')">
                没有账号？立即注册
            </button>
        `}
        ${!isLogin ? `
            <button class="btn-primary" onclick="submitAuth(false)" style="margin-top:8px;">
                <i class="fas fa-user-plus"></i> 注册
            </button>
            <div class="modal-divider">或者</div>
            <button class="btn-secondary" onclick="openAuthModal('login')">
                已有账号？去登录
            </button>
        ` : ''}
    `;
    if (isLogin) {
        // 登录时显示用户名输入框
        sheet.querySelector('.modal-title').insertAdjacentHTML('afterend',
            '<input type="text" class="modal-input" id="authUsername" placeholder="账号" autocomplete="username" style="margin-top:12px;">');
    }
    document.getElementById('modalOverlay').classList.add('active');
}

async function submitAuth(wantLogin) {
    const username = document.getElementById('authUsername')?.value.trim() || '';
    const password = document.getElementById('authPassword')?.value || '';
    if (!username || !password) return showToast('请填写账号和密码');

    try {
        if (wantLogin) {
            await Auth.login({ username, password });
            showToast('登录成功 ✨');
        } else {
            const nickname = document.getElementById('authNickname')?.value.trim() || '';
            const partner  = document.getElementById('authPartner')?.value.trim() || '';
            const email    = document.getElementById('authEmail')?.value.trim() || '';
            if (!email) return showToast('请填写邮箱，用于找回账号');
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showToast('请填写正确的邮箱格式');
            await Auth.register({ username, password, nickname, partner_name: partner, email });
            showToast('注册成功 ✨');
        }
        closeModal();
        refreshAuthUI();
        updateTopbarRight();
        renderHomeGrids();
        loadMyPage();
    } catch (err) {
        showToast(err.message || '操作失败');
    }
}

// ====================================================
// 顶部右侧 & 用户区
// ====================================================
function updateTopbarRight() {
    const el = document.getElementById('topbarRight');
    if (!el) return;
    const user = Auth.currentUser();
    if (user) {
        el.innerHTML = `<div class="topbar-avatar" onclick="navTo('myScreen')">
            👤
            ${user.private_unlocked ? '<div class="avatar-badge vip">💎</div>' : '<div class="avatar-badge"></div>'}
        </div>`;
    } else {
        el.innerHTML = `<button class="topbar-btn" onclick="openAuthModal('login')"><i class="fas fa-user"></i></button>`;
    }
}

function refreshAuthUI() {
    const userSection = document.getElementById('userSection');
    if (!userSection) return;
    const user = Auth.currentUser();
    if (user) {
        userSection.innerHTML = `
            <div class="user-card">
                <div class="user-avatar-lg">👫</div>
                <div class="user-info">
                    <div class="user-name">${user.nickname || user.username}</div>
                    <div class="user-status ${user.private_unlocked ? 'vip' : ''}">
                        ${user.private_unlocked ? '💎 私密模式已解锁' : '🎮 免费模式'}
                    </div>
                </div>
            </div>`;
    } else {
        userSection.innerHTML = `
            <div class="login-card" id="loginCard">
                <p>登录后数据自动同步，解锁私密专属玩法</p>
                <button class="btn-primary" onclick="openAuthModal('login')">
                    <i class="fas fa-user-plus"></i> 登录 / 注册
                </button>
            </div>`;
    }
    updateTopbarRight();
    updateBottomNavForAuth();
}

function updateBottomNavForAuth() {
    const user = Auth.currentUser();
    const privNav = document.getElementById('navPrivate');
    if (privNav) {
        if (user && user.private_unlocked) {
            privNav.innerHTML = '<i class="fas fa-lock-open"></i>私密';
        } else {
            privNav.innerHTML = '<i class="fas fa-gem"></i>私密';
        }
    }
}

// ====================================================
// 我的页面（"我的"标签）
// ====================================================
const GAME_NAMES = {
    cardDuel: '卡牌对决',
    coupleDare: '亲密接力',
    quizBattle: '抢答对战',
    loveQuiz: '默契考验',
    desertIsland: '荒岛生存',
    wheel: '甜蜜许愿池',
    kissGame: '亲吻挑战',
    secretGenerator: '私密任务',
    hotSeat: '热辣问答',
    massage: '按摩券',
    loveLetter: '情书工坊',
    dreamList: '愿望储蓄罐',
    coupleTimer: '情侣秒表',
    truthDare: '真心话大冒险',
};

async function loadMyPage() {
    const area = document.getElementById('myPageArea');
    const user = Auth.currentUser();

    if (!user) {
        area.innerHTML = `
            <div class="empty-state">
                <span class="empty-state-icon">🔐</span>
                <p>登录后查看个人数据</p>
                <button class="btn-primary" onclick="openAuthModal('login')" style="margin-top:16px;">
                    <i class="fas fa-right-to-bracket"></i> 登录 / 注册
                </button>
            </div>`;
        return;
    }

    // 加载后端统计
    let stats = null;
    let orders = null;
    try {
        const [profileData, orderList] = await Promise.all([
            api('/api/profile.php'),
            api('/api/orders.php'),
        ]);
        stats = profileData.stats;
        orders = orderList.list || [];

        // 同步更新本地用户数据
        Auth.setSession(localStorage.getItem('couple_token'), {
            ...user,
            ...profileData.user,
            uid: user.uid || user.id,
        });
    } catch (e) {
        // 后端未连接时用本地数据
        stats = { total_games: 0, game_stats: {} };
        orders = [];
    }

    const gameStatsHtml = Object.entries(stats?.game_stats || {})
        .map(([key, cnt]) => `
            <div class="stat-chip">
                <span class="stat-chip-icon">${getGameIcon(key)}</span>
                <span class="stat-chip-name">${GAME_NAMES[key] || key}</span>
                <span class="stat-chip-count">${cnt}次</span>
            </div>`).join('') || '<div class="empty-state" style="padding:20px 0;"><span style="font-size:2rem;">🎮</span><p style="margin-top:8px;">还没有游戏记录，开始玩吧！</p></div>';

    const ordersHtml = orders.length ? orders.map(o => `
        <div class="history-item">
            <div class="history-dot" style="background:${o.status === 1 ? 'var(--green)' : o.status === 2 ? 'var(--pink)' : 'var(--gold)'}"></div>
            <div>
                <div style="font-size:0.82rem;color:#fff;">${o.order_no}</div>
                <div style="font-size:0.75rem;color:var(--text3);">
                    ¥${Number(o.amount).toFixed(2)} · ${statusLabel(o.status)} · ${o.created_at?.split(' ')[0] || ''}
                </div>
            </div>
        </div>`).join('') : '<div class="empty-state" style="padding:16px 0;"><p>暂无订单记录</p></div>';

    area.innerHTML = `
        <!-- 用户信息卡 -->
        <div class="my-profile-card">
            <div class="my-avatar">👫</div>
            <div class="my-info">
                <div class="my-name">${user.nickname || user.username}</div>
                <div class="my-sub">${user.private_unlocked ? '💎 私密模式已解锁' : '🎮 免费模式'}</div>
                ${user.email ? `<div class="my-sub" style="font-size:0.75rem;color:var(--text3);">${user.email}</div>` : ''}
            </div>
            <button class="btn-icon" onclick="openEditProfile()" title="编辑资料">
                <i class="fas fa-pen"></i>
            </button>
        </div>

        <!-- 数据概览 -->
        <div class="my-stats-row">
            <div class="my-stat-item">
                <div class="my-stat-num">${stats?.total_games || 0}</div>
                <div class="my-stat-label">游戏总次数</div>
            </div>
            <div class="my-stat-divider"></div>
            <div class="my-stat-item">
                <div class="my-stat-num">${Object.keys(stats?.game_stats || {}).length}</div>
                <div class="my-stat-label">已玩游戏数</div>
            </div>
            <div class="my-stat-divider"></div>
            <div class="my-stat-item">
                <div class="my-stat-num">${orders.length}</div>
                <div class="my-stat-label">订单记录</div>
            </div>
        </div>

        <!-- 各游戏统计 -->
        <div class="section-header" style="margin-top:20px;">
            <div class="section-title">游戏记录</div>
        </div>
        <div class="game-stats-list">
            ${gameStatsHtml}
        </div>

        <!-- 订单记录 -->
        <div class="section-header" style="margin-top:20px;">
            <div class="section-title">订单记录</div>
        </div>
        <div class="history">
            ${ordersHtml}
        </div>

        <!-- 私密解锁区 -->
        <div class="section-header" style="margin-top:20px;">
            <div class="section-title">私密模式</div>
        </div>
        ${user.private_unlocked ? `
            <div style="margin:0 20px;padding:16px;background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.2);border-radius:var(--radius);display:flex;align-items:center;gap:12px;">
                <span style="font-size:1.5rem;">💎</span>
                <div>
                    <div style="font-size:0.95rem;font-weight:700;color:var(--gold);">已解锁全部私密玩法</div>
                    <div style="font-size:0.78rem;color:var(--text3);">感谢支持，随时享用</div>
                </div>
            </div>` : `
            <div style="margin:0 20px;padding:16px;background:rgba(168,85,247,0.1);border:1px solid rgba(168,85,247,0.2);border-radius:var(--radius);display:flex;align-items:center;gap:12px;">
                <span style="font-size:1.5rem;">🔒</span>
                <div style="flex:1;">
                    <div style="font-size:0.95rem;font-weight:700;">解锁私密模式</div>
                    <div style="font-size:0.78rem;color:var(--text3);">¥19.9 一次性付费，永久使用</div>
                </div>
                <button class="btn-primary" style="width:auto;padding:8px 16px;font-size:0.85rem;" onclick="showScreen('paymentScreen')">
                    解锁
                </button>
            </div>`}

        <!-- 退出登录 -->
        <button class="btn-secondary" onclick="Auth.logout()" style="margin:20px;color:var(--pink);border-color:rgba(255,77,141,0.3);">
            <i class="fas fa-right-from-bracket"></i> 退出登录
        </button>
        <div style="height:20px;"></div>
    `;
}

function statusLabel(s) {
    return ['', '已通过', '已拒绝', '已封禁'][s] || '待审核';
}

function getGameIcon(key) {
    const icons = { cardDuel:'🎴',coupleDare:'💞',quizBattle:'⏱',loveQuiz:'💝',desertIsland:'🏝',wheel:'🎡',kissGame:'💋',secretGenerator:'🌹',hotSeat:'🔥',massage:'💆',loveLetter:'💌',dreamList:'🫙',coupleTimer:'⏱',truthDare:'🎭' };
    return icons[key] || '🎮';
}

function openEditProfile() {
    const user = Auth.currentUser();
    if (!user) { openAuthModal('login'); return; }
    const sheet = document.getElementById('modalSheet');
    sheet.innerHTML = `
        <div class="modal-handle"></div>
        <div class="modal-title">编辑资料</div>
        <div class="modal-sub">修改您的个人信息</div>
        <label class="pay-input-label" style="display:block;margin-bottom:4px;">昵称</label>
        <input type="text" class="modal-input" id="editNickname" value="${user.nickname || ''}" placeholder="你的昵称">
        <label class="pay-input-label" style="display:block;margin-bottom:4px;">TA 的昵称</label>
        <input type="text" class="modal-input" id="editPartner" value="${user.partner_name || ''}" placeholder="TA 的昵称">
        <label class="pay-input-label" style="display:block;margin-bottom:4px;">邮箱</label>
        <input type="email" class="modal-input" id="editEmail" value="${user.email || ''}" placeholder="用于找回账号">
        <button class="btn-primary" onclick="saveEditProfile()" style="margin-top:8px;">
            <i class="fas fa-check"></i> 保存修改
        </button>
    `;
    document.getElementById('modalOverlay').classList.add('active');
}

async function saveEditProfile() {
    const nickname = document.getElementById('editNickname')?.value.trim() || '';
    const partner  = document.getElementById('editPartner')?.value.trim() || '';
    const email    = document.getElementById('editEmail')?.value.trim() || '';
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showToast('邮箱格式不正确');
    try {
        await Auth.updateProfile({ nickname, partner_name: partner, email });
        closeModal();
        showToast('资料已更新 ✨');
        loadMyPage();
        refreshAuthUI();
        renderHomeGrids();
    } catch (err) {
        showToast(err.message || '保存失败');
    }
}

// ====================================================
// 游戏记录上报（游戏结束时调用一次）
// ====================================================
function recordGameEnd(gameId, scoreA, scoreB, meta) {
    try {
        GameRecord.save({
            gameType: gameId,
            score: scoreA || 0,
            partnerScore: scoreB || 0,
            meta: meta || {}
        });
    } catch (e) { /* silent */ }
}

// ====================================================
// 游戏前登录拦截
// ====================================================
function requireLoginToPlay(gameId) {
    if (!Auth.isLoggedIn()) {
        showModal('需要登录', '请先注册账号才能开始游戏');
        setTimeout(() => openAuthModal('register'), 1200);
        return false;
    }
    return true;
}