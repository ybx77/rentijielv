# 暧昧实验室

情侣互动游戏平台，支持远程联机对战。

## 技术栈

- 纯 HTML + CSS + JavaScript（无框架）
- 后端：PHP + MySQL
- 部署：Vercel（前端）+ 宝塔面板（后端）

## 本地开发

直接用浏览器打开 `index.html` 即可。

## API 配置

后端地址在 `js/api.js` 中修改 `window.API_BASE_URL`。

## 部署

### 前端（Vercel）

1. GitHub 新建仓库，上传所有文件
2. Vercel 导入仓库，自动部署

### 后端（宝塔）

1. 上传 `backend/` 到宝塔网站根目录
2. 导入 `config/schema.sql` 到 MySQL
3. 配置伪静态和 PHP 版本
