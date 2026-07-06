// 把 [...path].js 改成 [[...slug]]/[[...all]] 兼容多种调用形式
// 同时支持：
//   POST /api/proxy/login              → 后端 /login.php
//   POST /api/proxy/login.php          → 后端 /login.php
//   POST /api/proxy/api/login          → 后端 /login.php（去掉 api/ 前缀）
//   POST /api/proxy/api/login.php      → 后端 /login.php
//   POST /api/login（auth.js 老调用）  → 后端 /login.php（去掉 .php 后缀）
export default async function handler(req, res) {
    const API_TARGET = 'http://43.248.102.104:30872';

    // Vercel catch-all 把所有段塞到 req.query.path（数组或字符串）
    let rawSegs = req.query.path;
    if (Array.isArray(rawSegs)) rawSegs = rawSegs.join('/');
    rawSegs = (rawSegs || '').toString().replace(/^\/+|\/+$/g, '');

    // 如果 req.query.path 不存在（直接请求 /api/proxy），可走 query 形式兜底
    if (!rawSegs && req.query.q) {
        rawSegs = req.query.q.toString().replace(/^\/+|\/+$/g, '');
    }

    // POST /api/login 这种 direct 调用：把 /api/<name> 形式视为走代理
    if (!rawSegs) {
        const url = req.url || '';
        const m = url.match(/^\/api\/([^\/\?]+)/);
        if (m) rawSegs = m[1];
    }

    if (!rawSegs) {
        return res.status(400).json({ code: 400, msg: '缺少 path 参数' });
    }

    // 去掉前缀 api/（如果有，防御性补一刀）
    let normalized = rawSegs;
    if (/^api\//i.test(normalized)) {
        normalized = normalized.replace(/^api\//i, '');
    }

    // 自动拼 .php 后缀
    const finalPath = normalized.endsWith('.php') ? normalized : normalized + '.php';

    // 处理 query：catch-all 路径之外的 ?xxx=yyy 需要拼到后端 URL
    // req.url 形如 "/api/proxy/login?foo=1&bar=2"，剥掉前缀取 ? 后的部分
    let queryString = '';
    const fullUrl = req.url || '';
    const qIdx = fullUrl.indexOf('?');
    if (qIdx >= 0) queryString = fullUrl.slice(qIdx + 1);

    const targetUrl = API_TARGET + '/' + finalPath + (queryString ? '?' + queryString : '');

    const headers = { 'Content-Type': 'application/json' };
    if (req.headers.authorization) headers['Authorization'] = req.headers.authorization;

    let body;
    try {
        body = req.body && Object.keys(req.body).length > 0 ? JSON.stringify(req.body) : undefined;
    } catch {
        body = undefined;
    }

    try {
        const response = await fetch(targetUrl, {
            method: req.method,
            headers,
            body
        });
        const text = await response.text();
        res.status(response.status).setHeader('Content-Type', 'application/json').send(text);
    } catch (err) {
        res.status(502).json({ code: 502, msg: '后端服务不可用: ' + err.message });
    }
}
