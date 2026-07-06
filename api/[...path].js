const API_TARGET = 'http://43.248.102.104:30872';

export default async function handler(req, res) {
    // req.url 格式如 /api/login.php?xxx
    // 去掉开头的 /，拼接完整的后端地址
    const pathPart = req.url.replace(/^\//, '');
    const url = API_TARGET + '/' + pathPart;

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
