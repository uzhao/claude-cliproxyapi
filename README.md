# Claude CLIProxyAPI Switch

一个极简 VSCode 扩展：在**透传官方**与**本地 CLIProxyAPI 模型**之间切换 Claude Code。

它不做任何格式转换、不内置代理——统一由本机 CLIProxyAPI（`http://127.0.0.1:8317`）完成。扩展只做一件事：改写项目 `.claude/settings.json`，然后重载窗口让 Claude Code 重新加载。

## ✨ 功能

- **状态栏单一入口**——点右下角 `Claude: 模型`，弹出菜单选「透传」或从 CLIProxyAPI `/v1/models` 拉到的模型列表。
- **模型列表实时取自 CLIProxyAPI**——每次打开菜单都 `GET {baseUrl}/v1/models`，取 OpenAI 格式 `data[].id`。
- **透传**——删除 `.claude/settings.json` 里的 `env.ANTHROPIC_BASE_URL`、`env.CLAUDE_CODE_DISABLE_ARTIFACT` 与 `modelOverrides`，恢复直连官方。
- **代理**——写入 `env.ANTHROPIC_BASE_URL` = CLIProxyAPI 地址与 `env.CLAUDE_CODE_DISABLE_ARTIFACT=1`（代理不支持 Artifacts，走代理时禁用），并清掉老版本写入的 `modelOverrides` 残留。

## 🚀 使用

1. 安装后点右下角 `Claude: 模型`。
2. 选一个模型（或「透传」）。
3. 扩展改写项目 `.claude/settings.json` 后自动重载窗口，Claude Code 以新设定启动。

## 🔧 配置

| 键 | 默认 | 说明 |
|---|---|---|
| `claudeCliProxy.baseUrl` | `http://127.0.0.1:8317` | 本地 CLIProxyAPI 地址（不含 `/v1`） |

## 工作原理

写入项目级 `.claude/settings.json`：

```jsonc
// 代理
{
  "env": {
    "ANTHROPIC_BASE_URL": "http://127.0.0.1:8317",
    "CLAUDE_CODE_DISABLE_ARTIFACT": "1"
  }
}

// 透传
{} // 删除 env.ANTHROPIC_BASE_URL、env.CLAUDE_CODE_DISABLE_ARTIFACT 与 modelOverrides，其余字段保留
```

项目级覆盖优先于全局 `~/.claude/settings.json`，因此透传时只需删除项目级覆盖即可回到你全局设置的默认模型。

## 🛠️ 开发

```bash
npm install
npm run compile   # 编译到 out/
npm test          # 运行纯逻辑测试（node:test）
# 在 VSCode 中按 F5 启动扩展开发宿主
```

## 📄 许可证

MIT License