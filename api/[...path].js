export default async function handler(req, res) {
    const API_TARGET = 'http://43.248.102.104:30872';

    // catch-all：把整个 /api/* 后面的路径作为入口
    let rawSegs = req.query.path;
    if (Array.isArray(rawSegs)) rawSegs = rawSegs.join('/');
    rawSegs = (rawSegs || '').toString().replace(/^\/+|\/+$/g, '');

    let normalized = rawSegs;
    if (/^api\//i.test(normalized)) {
        normalized = normalized.replace(/^api\//i, '');
    }
    const finalPath = normalized.endsWith('.php') ? normalized : normalized + '.php';

    const fullUrl = req.url || '';
    const qIdx = fullUrl.indexOf('?');
    let queryString = '';
    if (qIdx >= 0) {
        // 去掉 path=xxx 这一对（catch-all 已经在 req.query.path 里了）
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
