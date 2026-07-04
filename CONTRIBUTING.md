# Contributing

感谢你参与 Codex Quota Dashboard。

## 开发环境

- Node.js 22.12 或更高版本
- npm
- 已安装并登录的 Codex CLI（只有手动验证实时额度时需要）

```bash
npm ci
npm test
npm run dev
```

提交 Pull Request 前请确保 `npm test` 通过。功能变更应同时增加或更新相应测试，并在说明中列出手动验证步骤。

## 提交问题

请提供：

- 操作系统及版本
- Node.js、Codex CLI 和应用版本
- 可复现步骤
- 预期行为与实际行为
- 已去除敏感信息的错误输出

不要公开提交 API 密钥、访问令牌、`auth.json`、完整会话日志、账号信息或个人路径。如果问题无法在隐去这些信息后描述，请先提交不含敏感数据的最小问题说明。

## Pull Request

- 每个 Pull Request 聚焦一个明确问题。
- 保持现有 TypeScript 风格，不提交生成目录或安装包。
- 不要提交 `node_modules/`、`dist/`、`release/` 或本机配置。
- 对用户可见的变化需要同步更新 README。
- 确保新增依赖确有必要，并提交更新后的 `package-lock.json`。

项目维护者可能要求调整实现、测试或文档后再合并。
