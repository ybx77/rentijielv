// 本文件保留作为兼容占位：所有解锁流程已迁移到 js/auth.js 中的 unlockPrivateMode()
// 这里仅暴露一个 window.unlockPrivateMode 引用，确保旧 HTML 中 onclick 仍能生效
window.unlockPrivateMode = window.unlockPrivateMode || function() {};
// 真正的实现见 auth.js