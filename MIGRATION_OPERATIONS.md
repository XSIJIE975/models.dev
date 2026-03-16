# 迁移后运维工作流

本文档汇总 models.dev 仓库迁移后的日常运维操作。

---

## 命令速查

| 场景 | 命令 |
|------|------|
| 验证配置 | `pnpm validate` |
| 开发服务器（端口 16000） | `pnpm dev` |
| 构建站点 | `pnpm build` |
| 内网服务（端口 3000） | `pnpm intranet:serve` |
| 安装依赖 | `pnpm install` |

---

## 环境要求

- Node.js 22+
- pnpm

---

## 常用命令详解

### 验证配置

验证所有 provider 和 model 配置是否符合 schema：

```bash
pnpm validate
```

### 开发服务器

启动本地开发服务器，访问 http://localhost:16000：

```bash
pnpm dev
```

底层执行的是 `packages/web/src/dev-server.ts`，使用 Vite middleware 模式。

### 构建站点

生成生产环境产物到 `packages/web/dist/`：

```bash
pnpm build
```

### 内网部署服务

启动内网服务（PM2 部署时使用）：

```bash
pnpm intranet:serve
```

服务监听端口 3000，配合 Nginx 反向代理使用。

---

## 开发调试

### 前端开发

```bash
pnpm install
cd packages/web
pnpm dev
```

开发服务器在 http://localhost:16000 运行。

### 使用 opencode 手动测试

本文档遵循 [OpenCode 官方环境变量文档](https://opencode.ai/docs/zh-cn/cli/#环境变量)。使用本地构建的模型数据进行测试时，通过 `OPENCODE_MODELS_URL` 指定自定义模型配置 URL。

**前置步骤（所有平台相同）：**

```bash
pnpm install
cd packages/web
pnpm build
```

**Linux / macOS：**

方式一：单行传递环境变量

```bash
OPENCODE_MODELS_URL="file://$(pwd)/dist/_api.json" opencode
```

方式二：先导出再启动

```bash
export OPENCODE_MODELS_URL="file://$(pwd)/dist/_api.json"
opencode
```

**Windows CMD：**

```cmd
set OPENCODE_MODELS_URL=file://%CD%/dist/_api.json
opencode
```

**Windows PowerShell：**

```powershell
$env:OPENCODE_MODELS_URL = "file://$((Get-Location).Path.Replace('\', '/'))/dist/_api.json"
opencode
```

---

## 构建与部署

### 本地构建

```bash
pnpm install
pnpm build
```

产物输出到 `packages/web/dist/`，包含：
- `_index.html` - 主页面
- `_api.json` - 模型数据 API
- `logos/` - Provider logo
- `assets/` - JS/CSS 资源

### 内网部署（PM2）

参考 `deploy/intranet/README.md` 的完整步骤：

1. 构建产物：`pnpm build`
2. 配置日志目录权限
3. 启动 PM2：`pm2 start deploy/intranet/ecosystem.config.cjs`
4. 配置 Nginx 反向代理到 127.0.0.1:3000
5. 设置开机自启：`pm2 startup && pm2 save`

---

## 添加 Provider

### 1. 创建 Provider 目录

在 `providers/` 下新建文件夹，例如 `providers/newprovider/`。

### 2. 添加 provider.toml

```toml
name = "Provider Name"
npm = "@ai-sdk/provider"
env = ["PROVIDER_API_KEY"]
doc = "https://example.com/docs/models"
```

如果是 OpenAI-compatible 端点：

```toml
name = "Provider Name"
npm = "@ai-sdk/openai-compatible"
api = "https://api.example.com/v1"
env = ["PROVIDER_API_KEY"]
doc = "https://example.com/docs/models"
```

### 3. 添加 Logo（可选）

放置 `logo.svg` 到 provider 目录，使用 `currentColor` 作为填充色：

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
  <!-- Logo paths -->
</svg>
```

### 4. 添加 Model 定义

在 `providers/<provider>/models/` 下创建 TOML 文件，文件名即 model ID。

Model ID 包含 `/` 时使用子目录，例如 `openai/gpt-5` 对应 `providers/openai/models/gpt-5.toml`。

示例：

```toml
name = "Model Display Name"
attachment = true
reasoning = false
tool_call = true
structured_output = true
temperature = true
knowledge = "2024-04"
release_date = "2025-02-19"
last_updated = "2025-02-19"
open_weights = false

[cost]
input = 3.00
output = 15.00

[limit]
context = 400_000
input = 272_000
output = 8_192

[modalities]
input = ["text", "image"]
output = ["text"]
```

### 5. 验证

```bash
pnpm validate
```

---

## Provider 数据生成命令

从外部 API 自动生成 provider model 数据：

```bash
# Helicone
pnpm helicone:generate

# Venice
pnpm venice:generate

# Vercel
pnpm vercel:generate

# Weights & Biases
pnpm wandb:generate

# Friendli
pnpm friendli:generate

# Ollama Cloud
pnpm ollama-cloud:generate
```

---

## 重要路径

| 路径 | 用途 |
|------|------|
| `providers/` | Provider 配置和 Model 定义目录 |
| `providers/<provider>/provider.toml` | Provider 元数据 |
| `providers/<provider>/logo.svg` | Provider logo（可选） |
| `providers/<provider>/models/*.toml` | Model 定义文件 |
| `packages/core/` | 核心验证和生成逻辑 |
| `packages/web/` | 前端站点和开发服务器 |
| `packages/web/src/dev-server.ts` | 开发服务器入口 |
| `packages/web/script/build.ts` | 构建脚本 |
| `deploy/intranet/` | 内网部署配置 |
| `deploy/intranet/server.ts` | 内网服务入口 |
| `deploy/intranet/ecosystem.config.cjs` | PM2 进程配置 |

---

## 端口速查

| 服务 | 端口 | 访问地址 |
|------|------|----------|
| 开发服务器 | 16000 | http://localhost:16000 |
| 内网服务 | 3000 | http://localhost:3000（需配合 Nginx） |

---

## 技术栈

- Runtime：Node.js 22+
- 构建工具：Vite
- 开发服务器：Node HTTP + Vite middleware
- 内网服务器：Hono + @hono/node-server
- 脚本执行：tsx
- 配置格式：TOML
- 校验：Zod schema
