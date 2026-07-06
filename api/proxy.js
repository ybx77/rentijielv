const API_TARGET = 'http://43.248.102.104:30872';

// 显式单入口代理：GET /api/proxy?path=login  → 后端 /login.php
// 显式单入口代理：POST /api/proxy?path=login  → 后端 /login.php
// 这样文件路径里没有 [ ] 特殊字符，部署 100% 不会被 Vercel 吞掉
export default async function handler(req, res) {
    const rawPath = (req.query.path || '').toString().replace(/^\/+|\/+$/g, '');
    if (!rawPath) {
        return res.status(400).json({ code: 400, msg: '缺少 path 参数' });
    }
    // 自动拼 .php 后缀（如果调用方已经带了就不重复拼）
    const finalPath = rawPath.endsWith('.php') ? rawPath : rawPath + '.php';
    const url = API_TARGET + '/' + finalPath;

    const headers = { 'Content-Type': 'application/json' };
    if (req.headers.authorization) {
        headers['Authorization'] = req.headers.authorization;
    }

    let body;
    try {
        body = req.body && Object.keys(req.body).length > 0 ? JSON.stringify(req.body) : undefined;
    } catch {
        body = undefined;
    }

    try {
        const response = await fetch(url, {
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
