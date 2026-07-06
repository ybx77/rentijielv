const API_TARGET = 'http://43.248.102.104:30872';

export default async function handler(req, res) {
    const url = API_TARGET + req.url;

    let body;
    try {
        body = req.body ? JSON.stringify(req.body) : undefined;
    } catch {
        body = undefined;
    }

    const headers = { 'Content-Type': 'application/json' };
    if (req.headers.authorization) {
        headers['Authorization'] = req.headers.authorization;
    }

    try {
        const response = await fetch(url, {
            method: req.method,
            headers,
            body: body
        });
        const text = await response.text();
        res.status(response.status).setHeader('Content-Type', 'application/json').send(text);
    } catch (err) {
        res.status(502).json({ code: 502, msg: '后端服务不可用' });
    }
}
