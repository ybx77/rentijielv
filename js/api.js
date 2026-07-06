// ========================
// 暧昧实验室 - API 配置
// 所有 /api/* 请求走 Vercel 服务端代理 → 绕过 HTTPS/MixedContent 限制
// 后端 IP / 端口变更只需改 api/index.js 中的 API_TARGET
// ========================
// 前端直接用相对路径，Vercel 服务端代理转发
window.API_BASE_URL = '';

// 通用请求封装
async function api(path, options = {}) {
    const token = localStorage.getItem('couple_token') || '';
    const opts = {
        method: options.method || 'GET',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': 'Bearer ' + token } : {}),
            ...(options.headers || {})
        }
    };
    // 走显式代理 /api/proxy?path=xxx，彻底绕开 .php 与 catch-all
    // 兼容：api('/api/login.php') / api('login.php') / api('login') / api('/api/partner.php?action=bind')
    const trimmed = path.replace(/^\/+|\/+$/g, '');
    const cleanPath = trimmed.replace(/^api\//, '').replace(/\.php(\?|$)/, '$1');
    // 把原始查询串合到代理 URL 上，避免和 path= 冲突
    let url = '/api/proxy?path=' + encodeURIComponent(cleanPath);
    // 取出原始调用方 path 里自带的 ?xxx，拼到 url 后
    const qIdx = cleanPath.indexOf('?');
    if (qIdx >= 0) {
        url += '&' + cleanPath.slice(qIdx + 1);
    }
    if (options.body) opts.body = JSON.stringify(options.body);
    try {
        const r = await fetch(url, opts);
        const j = await r.json().catch(() => ({ code: r.status, msg: '服务异常' }));
        if (j.code !== 200) {
            if (j.code === 401) {
                localStorage.removeItem('couple_token');
                localStorage.removeItem('couple_user');
            }
            throw new Error(j.msg || '请求失败');
        }
        return j.data;
    } catch (err) {
        if (err.message === 'Failed to fetch') {
            throw new Error('无法连接后端服务，请稍后再试');
        }
        throw err;
    }
}

// ====================================================
// 鉴权
// ====================================================
const Auth = {
    isLoggedIn() {
        return !!localStorage.getItem('couple_token');
    },
    currentUser() {
        try { return JSON.parse(localStorage.getItem('couple_user') || 'null'); }
        catch { return null; }
    },
    setSession(token, user) {
        localStorage.setItem('couple_token', token);
        localStorage.setItem('couple_user', JSON.stringify(user));
    },
    logout() {
        localStorage.removeItem('couple_token');
        localStorage.removeItem('couple_user');
        showToast('已退出登录');
        refreshAuthUI();
        renderHomeGrids();
        showScreen('welcomeScreen');
    },
    async register({ username, password, nickname, partner_name, email }) {
        const data = await api('/api/register.php', {
            method: 'POST',
            body: { username, password, nickname, partner_name, email }
        });
        Auth.setSession(data.token, data.user);
        return data.user;
    },
    async login({ username, password }) {
        const data = await api('/api/login.php', {
            method: 'POST',
            body: { username, password }
        });
        Auth.setSession(data.token, data.user);
        return data.user;
    },
    async updateProfile({ nickname, partner_name, email }) {
        const data = await api('/api/profile.php', {
            method: 'POST',
            body: { nickname, partner_name, email }
        });
        const cur = Auth.currentUser() || {};
        Auth.setSession(localStorage.getItem('couple_token'), { ...cur, ...data.user });
        return data.user;
    }
};

// ====================================================
// 订单
// ====================================================
const Orders = {
    async submit(orderNo) {
        return api('/api/submit_order.php', { method: 'POST', body: { order_no: orderNo, amount: 5.20 } });
    },
    async status(orderNo) {
        return api('/api/order_status.php?order_no=' + encodeURIComponent(orderNo));
    },
    async list() {
        return api('/api/orders.php');
    }
};

// Partner / VIP
const Partner = {
    async getStatus() {
        return api('/api/partner.php');
    },
    async bind(username) {
        return api('/api/partner.php?action=bind', {
            method: 'POST',
            body: { partner_username: username }
        });
    },
    async unbind() {
        return api('/api/partner.php?action=unbind', { method: 'POST' });
    }
};

const Membership = {
    async getStatus() {
        return api('/api/membership.php');
    }
};

// ====================================================
// 游戏记录（同步到后端）
// ====================================================
const GameRecord = {
    async save({ gameType, score, partnerScore, meta }) {
        try {
            await api('/api/record_game.php', {
                method: 'POST',
                body: { game_type: gameType, score, partner_score: partnerScore, meta }
            });
        } catch (e) {
            // 后端未部署时静默失败，不影响游戏体验
        }
    }
};