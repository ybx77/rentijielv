// ====================================================
// 支付 + 私密模式解锁
// ====================================================
window.UnlockState = {
    pollingTimer: null,
    stop() {
        clearInterval(this.pollingTimer);
        this.pollingTimer = null;
    },
    async poll(orderNo) {
        try {
            const data = await Orders.status(orderNo);
            if (data.user_banned) {
                this.stop();
                Auth.logout();
                showModal('账号异常', '您的账号已被封禁');
                return;
            }
            if (data.private_unlocked || data.is_vip) {
                this.stop();
                await refreshAuthState();
                showToast('审核通过，私密模式已解锁！');
                showScreen('welcomeScreen');
            }
        } catch (e) {}
    }
};

async function unlockPrivateMode() {
    if (!Auth.isLoggedIn()) {
        showModal('需要登录', '请先注册账号');
        setTimeout(() => openAuthModal('register'), 1200);
        return;
    }
    const vipStatus = await Membership.getStatus();
    if (vipStatus.is_vip) {
        showToast('已是私密模式用户');
        return;
    }
    const orderNo = document.getElementById('orderInput')?.value.trim();
    if (!orderNo) return showToast('请输入订单号');
    if (!/^\d{4,32}$/.test(orderNo)) return showToast('订单号格式不正确');

    try {
        const data = await Orders.submit(orderNo);
        if (data.private_unlocked || data.is_vip) {
            await refreshAuthState();
            showToast('解锁成功！');
            setTimeout(() => showScreen('welcomeScreen'), 600);
            return;
        }
        showToast('订单已提交，审核中…');
        UnlockState.stop();
        UnlockState.pollingTimer = setInterval(() => UnlockState.poll(orderNo), 3000);
        setTimeout(() => UnlockState.stop(), 5 * 60 * 1000);
    } catch (err) {
        showToast(err.message || '提交失败');
    }
}

// 登录 / 注册 底部弹窗
function openAuthModal(mode = 'login') {
    const isLogin = mode === 'login';
    const sheet = document.getElementById('modalSheet');
    sheet.innerHTML = `
        <div class="modal-handle"></div>
        <div class="modal-title">${isLogin ? '登录账号' : '创建账号'}</div>
        <div class="modal-sub">${isLogin ? '欢迎回来，继续甜蜜游戏' : '开启你们的情侣游戏之旅'}</div>
        <input type="text" class="modal-input" id="authUsername" placeholder="账号（字母/数字/下划线）" autocomplete="username">
        <input type="password" class="modal-input" id="authPassword" placeholder="密码（至少 6 位）" autocomplete="${isLogin ? 'current-password' : 'new-password'}">
        ${!isLogin ? `
            <input type="text" class="modal-input" id="authNickname" placeholder="你的昵称（可选）" autocomplete="off">
            <input type="text" class="modal-input" id="authPartner" placeholder="TA 的昵称（可选）" autocomplete="off">
            <input type="email" class="modal-input" id="authEmail" placeholder="邮箱（用于找回账号）" autocomplete="email">
        ` : ''}
        <button class="btn-primary" onclick="submitAuth(${!isLogin})" style="margin-top:8px;">
            <i class="fas fa-${isLogin ? 'right-to-bracket' : 'user-plus'}"></i>
            ${isLogin ? '登录' : '注册'}
        </button>
        <div class="modal-divider">或者</div>
        <button class="btn-secondary" onclick="openAuthModal('${isLogin ? 'register' : 'login'}')">
            ${isLogin ? '没有账号？立即注册' : '已有账号？去登录'}
        </button>
    `;
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
            if (!email) return showToast('请填写邮箱');
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showToast('邮箱格式不正确');
            await Auth.register({ username, password, nickname, partner_name: partner, email });
            showToast('注册成功 ✨');
        }
        closeModal();
        await refreshAuthState();
        if (typeof loadMyPage === 'function') loadMyPage();
    } catch (err) {
        showToast(err.message || '操作失败');
    }
}

// ====================================================
// 全局刷新登录状态（VIP + 情侣绑定）
// ====================================================
async function refreshAuthState() {
    if (!Auth.isLoggedIn()) return;
    try {
        const [profileData, partnerData, membershipData] = await Promise.all([
            api('/api/profile.php'),
            Partner.getStatus(),
            Membership.getStatus(),
        ]);
        const user = {
            ...profileData.user,
            partner: partnerData.partner || null,
            is_vip: membershipData.is_vip,
            has_membership: membershipData.has_membership,
        };
        Auth.setSession(localStorage.getItem('couple_token'), user);
        refreshAuthUI();
        updateTopbarRight();
        if (typeof renderHomeGrids === 'function') renderHomeGrids();
    } catch (e) {}
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
            ${user.is_vip ? '<div class="avatar-badge vip">💎</div>' : '<div class="avatar-badge"></div>'}
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
                    <div class="user-status ${user.is_vip ? 'vip' : ''}">
                        ${user.is_vip ? '💎 私密模式已解锁' : '🎮 免费模式'}
                    </div>
                    ${user.partner ? `<div class="user-status" style="font-size:0.75rem;">💕 已绑定: ${user.partner.nickname || user.partner.username}</div>` : ''}
                </div>
            </div>`;
    } else {
        userSection.innerHTML = `
            <div class="login-card" id="loginCard">
                <p>登录后绑定情侣，解锁私密专属玩法</p>
                <button class="btn-primary" onclick="openAuthModal('login')">
                    <i class="fas fa-user-plus"></i> 登录 / 注册
                </button>
            </div>`;
    }
    updateTopbarRight();
    updateBottomNavPrivate();
}

function updateBottomNavPrivate() {
    const el = document.getElementById('navPrivate');
    if (!el) return;
    const user = Auth.currentUser();
    if (user?.is_vip) {
        el.innerHTML = '<i class="fas fa-lock-open"></i>私密';
    } else {
        el.innerHTML = '<i class="fas fa-gem"></i>私密';
    }
}

// ====================================================
// 我的页面
// ====================================================
const GAME_NAMES = {
    cardDuel:'🎴',coupleDare:'💞',quizBattle:'⏱',loveQuiz:'💝',
    desertIsland:'🏝',wheel:'🎡',kissGame:'💋',secretGenerator:'🌹',
    hotSeat:'🔥',massage:'💆',loveLetter:'💌',dreamList:'🫙',
    coupleTimer:'⏱',truthDare:'🎭',
};

async function loadMyPage() {
    const area = document.getElementById('myPageArea');
    const user = Auth.currentUser();
    if (!user) {
        area.innerHTML = `
            <div style="padding:60px 20px;text-align:center;">
                <div style="font-size:4rem;margin-bottom:16px;">🔐</div>
                <p style="color:var(--text2);margin-bottom:20px;">登录后查看个人数据</p>
                <button class="btn-primary" onclick="openAuthModal('login')">
                    <i class="fas fa-right-to-bracket"></i> 登录 / 注册
                </button>
            </div>`;
        return;
    }

    // 加载后端数据
    let stats = null, partnerData = null, orders = [];
    try {
        const [profileData, orderList] = await Promise.all([
            api('/api/profile.php'),
            Orders.list(),
        ]);
        stats = profileData.stats || { total_games: 0, game_stats: {} };
        orders = orderList.list || [];
        const mergedUser = { ...user, ...profileData.user };
        if (profileData.partner) mergedUser.partner = profileData.partner;
        Auth.setSession(localStorage.getItem('couple_token'), mergedUser);
    } catch (e) {
        stats = { total_games: 0, game_stats: {} };
    }
    const currentUser = Auth.currentUser();

    const gameStatsHtml = Object.entries(stats?.game_stats || {}).length
        ? Object.entries(stats.game_stats).map(([k, v]) => `
            <div class="stat-chip">
                <span class="stat-chip-icon">${GAME_NAMES[k] || '🎮'}</span>
                <span class="stat-chip-name">${GAME_NAMES[k] ? Object.values(GAME_NAMES).indexOf(GAME_NAMES[k]) >= 0 ? Object.keys(GAME_NAMES).find(key => GAME_NAMES[key] === GAME_NAMES[k]) : k : k}</span>
                <span class="stat-chip-count">${v}次</span>
            </div>`).join('')
        : '<div style="text-align:center;padding:24px;color:var(--text3);">还没有游戏记录，开始玩吧！</div>';

    const gameNameMap = GAME_NAMES;
    const gameStatsHtml2 = Object.entries(stats?.game_stats || {}).map(([k, v]) => {
        const name = Object.keys(gameNameMap).find(key => key === k) || k;
        return `<div class="stat-chip">
            <span class="stat-chip-icon">${gameNameMap[k] || '🎮'}</span>
            <span class="stat-chip-name">${name}</span>
            <span class="stat-chip-count">${v}次</span>
        </div>`;
    }).join('') || '<div style="text-align:center;padding:24px;color:var(--text3);">还没有游戏记录，开始玩吧！</div>';

    const ordersHtml = orders.length
        ? orders.map(o => `<div class="history-item">
            <div class="history-dot" style="background:${['','var(--green)','var(--pink)','var(--red)'][o.status] || 'var(--gold)'}"></div>
            <div>
                <div style="font-size:0.85rem;color:#fff;">¥${Number(o.amount).toFixed(2)} · ${['','已通过','已拒绝','已封禁'][o.status] || '待审核'}</div>
                <div style="font-size:0.75rem;color:var(--text3);">${o.order_no} · ${o.created_at?.split(' ')[0] || ''}</div>
            </div>
        </div>`).join('')
        : '<div style="text-align:center;padding:16px;color:var(--text3);">暂无订单</div>';

    area.innerHTML = `
        <div class="my-profile-card">
            <div class="my-avatar">👫</div>
            <div class="my-info">
                <div class="my-name">${currentUser.nickname || currentUser.username}</div>
                <div class="my-sub" style="color:${currentUser.is_vip ? 'var(--gold)' : 'var(--text2)'}">
                    ${currentUser.is_vip ? '💎 私密模式已解锁' : '🎮 免费模式'}
                </div>
                ${currentUser.email ? `<div class="my-sub" style="font-size:0.75rem;">${currentUser.email}</div>` : ''}
            </div>
            <button class="btn-icon" onclick="openEditProfile()" title="编辑资料"><i class="fas fa-pen"></i></button>
        </div>

        <!-- 数据概览 -->
        <div class="my-stats-row">
            <div class="my-stat-item"><div class="my-stat-num">${stats?.total_games || 0}</div><div class="my-stat-label">游戏总次数</div></div>
            <div class="my-stat-divider"></div>
            <div class="my-stat-item"><div class="my-stat-num">${Object.keys(stats?.game_stats || {}).length}</div><div class="my-stat-label">已玩种类</div></div>
            <div class="my-stat-divider"></div>
            <div class="my-stat-item"><div class="my-stat-num">${orders.length}</div><div class="my-stat-label">订单</div></div>
        </div>

        <!-- 情侣绑定 -->
        <div class="section-header"><div class="section-title">情侣绑定</div></div>
        ${currentUser.partner ? `
            <div style="margin:0 20px;padding:16px;background:rgba(168,85,247,0.1);border:1px solid rgba(168,85,247,0.2);border-radius:var(--radius);display:flex;align-items:center;gap:12px;">
                <span style="font-size:1.5rem;">💕</span>
                <div style="flex:1;">
                    <div style="font-size:0.95rem;font-weight:700;">${currentUser.partner.nickname || currentUser.partner.username}</div>
                    <div style="font-size:0.78rem;color:var(--text3);">已绑定 ${currentUser.partner.username}</div>
                </div>
                <button class="btn-ghost" style="padding:6px 14px;font-size:0.8rem;" onclick="confirmUnbindPartner()">解绑</button>
            </div>
        ` : `
            <div style="margin:0 20px;padding:16px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);">
                <p style="font-size:0.85rem;color:var(--text3);margin-bottom:10px;">
                    绑定情侣后，${currentUser.is_vip ? '对方自动成为私密模式用户' : '对方是私密模式用户时，你也将解锁私密玩法'}
                </p>
                <div style="display:flex;gap:8px;">
                    <input type="text" class="modal-input" id="bindPartnerInput" placeholder="输入对方账号" style="flex:1;margin-bottom:0;">
                    <button class="btn-primary" style="width:auto;padding:10px 16px;font-size:0.85rem;" onclick="doBindPartner()">绑定</button>
                </div>
            </div>
        `}

        <!-- 私密模式 -->
        <div class="section-header"><div class="section-title">私密模式</div></div>
        ${currentUser.is_vip ? `
            <div style="margin:0 20px;padding:16px;background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.2);border-radius:var(--radius);display:flex;align-items:center;gap:12px;">
                <span style="font-size:1.5rem;">💎</span>
                <div>
                    <div style="font-size:0.95rem;font-weight:700;color:var(--gold);">私密模式已解锁</div>
                    <div style="font-size:0.78rem;color:var(--text3);">永久使用，感谢支持</div>
                </div>
            </div>
        ` : `
            <div style="margin:0 20px;padding:16px;background:rgba(168,85,247,0.1);border:1px solid rgba(168,85,247,0.2);border-radius:var(--radius);">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
                    <span style="font-size:1.3rem;">💎</span>
                    <div>
                        <div style="font-size:0.95rem;font-weight:700;">解锁私密模式</div>
                        <div style="font-size:0.78rem;color:var(--text3);">绑定情侣后，TA 付费你也享会员权益</div>
                    </div>
                    <div style="margin-left:auto;font-size:1.2rem;font-weight:900;color:var(--gold);">¥5.20</div>
                </div>
                <div style="padding:12px;background:#fff;border-radius:10px;text-align:center;color:#07c160;font-size:0.82rem;margin-bottom:10px;">
                    微信扫码支付后，联系管理员审核
                </div>
                <input type="text" class="modal-input" id="orderInput" placeholder="输入交易订单号（纯数字）" style="margin-bottom:8px;">
                <button class="btn-primary" onclick="unlockPrivateMode()">
                    <i class="fas fa-unlock"></i> 确认解锁
                </button>
            </div>
        `}

        <!-- 游戏记录 -->
        <div class="section-header"><div class="section-title">游戏记录</div></div>
        <div class="game-stats-list">${gameStatsHtml2}</div>

        <!-- 订单记录 -->
        <div class="section-header"><div class="section-title">订单记录</div></div>
        <div class="history">${ordersHtml}</div>

        <!-- 编辑资料 -->
        <div class="section-header"><div class="section-title">账号设置</div></div>
        <div style="margin:0 20px;padding:16px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);">
            <button class="btn-secondary" style="width:100%;margin-bottom:8px;" onclick="openEditProfile()">
                <i class="fas fa-user-pen"></i> 编辑个人资料
            </button>
            <button class="btn-secondary" style="width:100%;color:var(--pink);border-color:rgba(255,77,141,0.3);" onclick="Auth.logout()">
                <i class="fas fa-right-from-bracket"></i> 退出登录
            </button>
        </div>
        <div style="height:20px;"></div>
    `;
}

async function doBindPartner() {
    const username = document.getElementById('bindPartnerInput')?.value.trim();
    if (!username) return showToast('请输入对方账号');
    try {
        await Partner.bind(username);
        await refreshAuthState();
        showToast('绑定成功 💕');
        loadMyPage();
    } catch (err) {
        showToast(err.message || '绑定失败');
    }
}

async function confirmUnbindPartner() {
    showModal('确认解绑', '确定要解除情侣绑定吗？解绑后对方将不再是私密模式用户（除非对方自己付费）', [
        { text: '取消', action: 'closeModal()', secondary: true },
        { text: '确认解绑', action: 'doUnbindPartner()', danger: true },
    ]);
}

async function doUnbindPartner() {
    closeModal();
    try {
        await Partner.unbind();
        await refreshAuthState();
        showToast('已解除绑定');
        loadMyPage();
    } catch (err) {
        showToast(err.message || '解绑失败');
    }
}

function openEditProfile() {
    const user = Auth.currentUser();
    if (!user) { openAuthModal('login'); return; }
    const sheet = document.getElementById('modalSheet');
    sheet.innerHTML = `
        <div class="modal-handle"></div>
        <div class="modal-title">编辑资料</div>
        <div class="modal-sub">修改个人信息</div>
        <label class="pay-input-label" style="display:block;margin-bottom:4px;">昵称</label>
        <input type="text" class="modal-input" id="editNickname" value="${user.nickname || ''}" placeholder="你的昵称">
        <label class="pay-input-label" style="display:block;margin-bottom:4px;">TA 的昵称</label>
        <input type="text" class="modal-input" id="editPartner" value="${user.partner?.nickname || user.partner_name || ''}" placeholder="TA 的昵称">
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
        await refreshAuthState();
        loadMyPage();
    } catch (err) {
        showToast(err.message || '保存失败');
    }
}

// ====================================================
// 游戏登录拦截
// ====================================================
function requireLoginToPlay() {
    if (!Auth.isLoggedIn()) {
        showModal('需要登录', '请先注册账号才能开始游戏');
        setTimeout(() => openAuthModal('register'), 1200);
        return false;
    }
    return true;
}

// showModal 支持按钮数组
function showModal(title, text, buttons) {
    const sheet = document.getElementById('modalSheet');
    const btnHtml = buttons ? buttons.map(b =>
        `<button class="${b.secondary ? 'btn-secondary' : b.danger ? 'btn-danger' : 'btn-primary'}" onclick="${b.action}" style="width:100%;margin-top:6px;">${b.text}</button>`
    ).join('') : `<button class="btn-primary" onclick="closeModal()" style="width:100%;margin-top:12px;">确定</button>`;
    sheet.innerHTML = `
        <div class="modal-handle"></div>
        <div class="modal-title">${title}</div>
        <div class="modal-sub">${text}</div>
        ${btnHtml}
    `;
    document.getElementById('modalOverlay').classList.add('active');
}
