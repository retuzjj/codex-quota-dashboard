# Codex Quota Dashboard

[English](README.md) | 简体中文

[![CI](https://github.com/retuzjj/codex-quota-dashboard/actions/workflows/ci.yml/badge.svg)](https://github.com/retuzjj/codex-quota-dashboard/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

跨平台 Codex 额度桌面仪表盘，用于显示 5 小时和 7 天额度窗口的已用比例、剩余比例及重置时间。

> [!IMPORTANT]
> 这是一个非官方社区项目，与 OpenAI 不存在隶属、授权或背书关系。Codex 和 OpenAI 是其各自权利人的商标。

## 功能

- 每分钟自动刷新，也可以手动刷新。
- 显示额度使用比例、剩余比例和重置倒计时。
- 实时查询失败时，显示最近一次本地额度快照并明确标记为缓存数据。
- 支持登录后自动启动。
- 单实例运行，使用隔离的 Electron 渲染进程。

## 运行要求

- Node.js 22.12 或更高版本
- 已安装并登录 Codex CLI

```bash
codex --version
codex login
```

## 从源码运行

```bash
git clone https://github.com/retuzjj/codex-quota-dashboard.git
cd codex-quota-dashboard
npm ci
npm run dev
```

当前仓库主要提供源码构建。二进制安装包只有在 GitHub Releases 中明确发布时才视为官方项目产物，不要从不明来源下载。

## 测试与构建

```bash
npm test
npm run build
```

生成当前平台的安装包：

```bash
npm run dist
```

也可以显式选择目标平台：

```bash
npm run dist:linux
npm run dist:windows
npm run dist:mac
```

项目配置了以下构建目标：

- Windows 10/11 x64：NSIS
- macOS Intel 与 Apple Silicon：Universal DMG
- Linux x64：AppImage 和 DEB

Windows 安装包应在 Windows 上构建，macOS DMG 应在 macOS 上构建。目前 CI 只验证 Linux 环境中的源码构建和测试；其他平台配置需要在对应系统上实际验证后再发布。

## 数据来源与隐私

应用首先启动本机 `codex app-server`，通过只读的 `account/rateLimits/read` 方法获取最新额度。

实时查询失败时，应用会从 `$CODEX_HOME/sessions`（默认 `~/.codex/sessions`）中查找最近一次额度快照。读取仅在本机进行，只解析最近 20 个会话日志各自末尾最多 1 MiB 的内容，不会将会话内容发送到其他服务。

应用不会读取 `auth.json`，不会保存账号或令牌，也不会直接调用第三方统计服务。

## 自动启动

在应用底部打开“登录后启动”：

- Windows、macOS 使用 Electron 登录项接口。
- Linux 写入当前用户的 `~/.config/autostart/codex-quota-dashboard.desktop`。

关闭开关会移除相应登录项。

## 常见问题

### 显示“未找到 Codex CLI”

确认 `codex` 已加入桌面会话的 `PATH`。从桌面启动的应用可能不会继承交互式 Shell 配置。

### 显示缓存数据

实时查询失败，但本地存在最近一次额度记录。运行 `codex` 确认登录和网络正常，然后点击刷新。

### 旧版 Codex 无法查询

升级 Codex CLI 后重试。额度查询依赖 Codex app-server 协议，并保留会话日志回退以兼容无法实时查询的环境。

## 参与贡献

提交问题或 Pull Request 前，请阅读 [CONTRIBUTING.md](CONTRIBUTING.md)。报告问题时不要附带令牌、`auth.json`、完整会话日志或其他私人信息。

## 许可证

本项目使用 [MIT License](LICENSE)。
