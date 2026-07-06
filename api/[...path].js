// Catch-all: /api/[...path]
//   /api/proxy/login   → 后端 /login.php
//   /api/login         → 后端 /login.php
//   /api/proxy/api/login → 后端 /login.php
//
// 这里本来应该用 api/proxy/login.js 这种 prefix-routing 子目录，
// 但保持一个 catch-all 文件结构最简单，所有 /api/* 都过这里。
export default async function handler(req, res) {
    const API_TARGET = 'http://43.248.102.104:30872';

    // Vercel catch-all 把所有段塞到 req.query.path（数组或字符串）
    let rawSegs = req.query.path;
    if (Array.isArray(rawSegs)) rawSegs = rawSegs.join('/');
    rawSegs = (rawSegs || '').toString().replace(/^\/+|\/+$/g, '');

    // 兜底：直接从 URL 解析（处理 /api/login 这种 catch-all 拿不到 path 的情况）
    if (!rawSegs) {
        const url = req.url || '';
        const m = url.match(/^\/?api\/(.+?)(?:\?|$)/);
        if (m) rawSegs = m[1];
    }

    if (!rawSegs) {
        return res.status(400).json({ code: 400, msg: '缺少 path 参数' });
    }

    // 去掉前缀 api/（防御性补一刀）
    let normalized = rawSegs;
    if (/^api\//i.test(normalized)) {
        normalized = normalized.replace(/^api\//i, '');
    }

    // 如果是 /proxy/login 这种，先剥掉 proxy/ 前缀 → 变成 /login
    if (/^proxy\//i.test(normalized)) {
        normalized = normalized.replace(/^proxy\//i, '');
    }

    // 自动拼 .php 后缀
    const finalPath = normalized.endsWith('.php') ? normalized : normalized + '.php';

    // 处理 query：catch-all 路径之外的 ?xxx=yyy 需要拼到后端 URL
    let queryString = '';
    const fullUrl = req.url || '';
    const qIdx = fullUrl.indexOf('?');
    if (qIdx >= 0) {
        const pairs = fullUrl.slice(qIdx + 1).split('&').filter(p => !/^path=/.test(p));
        queryString = pairs.join('&');
    }

    const targetUrl = API_TARGET + '/' + finalPath + (queryString ? '?' + queryString : '');

    const headers = { 'Content-Type': 'application/json' };
    if (req.headers.authorization) headers['Authorization'] = req.headers.authorization;

    let body;
    try {
        body = req.body && Object.keys(req.body).length > 0 ? JSON.stringify(req.body) : undefined;
    } catch { body = undefined; }

    try {
        const response = await fetch(targetUrl, { method: req.method, headers, body });
        const text = await response.text();
        res.status(response.status).setHeader('Content-Type', 'application/json').send(text);
    } catch (err) {
        res.status(502).json({ code: 502, msg: '后端服务不可用: ' + err.message });
    }
}