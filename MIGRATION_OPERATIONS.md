# 迁移后运维工作流

本文档汇总 models.dev 仓库迁移后的日常运维操作。

---

## 命令速查

| 场景 | 命令 |
|------|------|
| 验证配置 | `pnpm validate` |
| 开发服务器（端口 16000） | `pnpm dev` |
| 子路径开发服务器 | `MODELS_DEV_BASE_PATH=/models-dev-mirror pnpm dev` |
| 构建站点 | `pnpm build` |
| 子路径构建 | `MODELS_DEV_BASE_PATH=/models-dev-mirror pnpm build` |
| 内网服务（端口 3000） | `pnpm intranet:serve` |
| 子路径内网服务 | `MODELS_DEV_BASE_PATH=/models-dev-mirror pnpm intranet:serve` |
| 安装依赖 | `pnpm install` |

---

## 环境要求

- Node.js 22+
- pnpm

### 可选环境变量

| 变量 | 用途 | 默认值 |
|------|------|--------|
| `MODELS_DEV_BASE_PATH` | 配置站点部署子路径，例如 `/models-dev-mirror` | `/` |
| `PORT` | 内网服务监听端口 | `3000` |
| `HOST` | 内网服务监听地址 | `0.0.0.0` |
| `DIST_DIR` | 指定内网服务读取的构建产物目录 | `packages/web/dist` |

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

如果需要模拟 `/models-dev-mirror` 这类子路径部署，需要在启动开发服务器时传入 `MODELS_DEV_BASE_PATH`：

**Linux / macOS：**

```bash
MODELS_DEV_BASE_PATH=/models-dev-mirror pnpm dev
```

**Windows CMD：**

```cmd
set MODELS_DEV_BASE_PATH=/models-dev-mirror
pnpm dev
```

**Windows PowerShell：**

```powershell
$env:MODELS_DEV_BASE_PATH = "/models-dev-mirror"
pnpm dev
```

此时开发访问地址为：

- `http://localhost:16000/models-dev-mirror`
- `http://localhost:16000/models-dev-mirror/`

### 构建站点

生成生产环境产物到 `packages/web/dist/`：

```bash
pnpm build
```

如果部署目标不是站点根路径，而是类似 `/models-dev-mirror` 的子路径，构建时必须传入相同的 `MODELS_DEV_BASE_PATH`：

**Linux / macOS：**

```bash
MODELS_DEV_BASE_PATH=/models-dev-mirror pnpm build
```

**Windows CMD：**

```cmd
set MODELS_DEV_BASE_PATH=/models-dev-mirror
pnpm build
```

**Windows PowerShell：**

```powershell
$env:MODELS_DEV_BASE_PATH = "/models-dev-mirror"
pnpm build
```

> 注意：如果使用子路径部署，`pnpm build` 和后续 `pnpm intranet:serve` / PM2 启动时必须使用同一个 `MODELS_DEV_BASE_PATH` 值，否则生成的资源路径与运行时路由会不一致。

### 内网部署服务

启动内网服务（PM2 部署时使用）：

```bash
pnpm intranet:serve
```

服务监听端口 3000，配合 Nginx 反向代理使用。

如果要以子路径方式运行，需要在启动时传入同样的 `MODELS_DEV_BASE_PATH`：

**Linux / macOS：**

```bash
MODELS_DEV_BASE_PATH=/models-dev-mirror pnpm intranet:serve
```

**Windows CMD：**

```cmd
set MODELS_DEV_BASE_PATH=/models-dev-mirror
pnpm intranet:serve
```

**Windows PowerShell：**

```powershell
$env:MODELS_DEV_BASE_PATH = "/models-dev-mirror"
pnpm intranet:serve
```

---

## 开发调试

### 前端开发

```bash
pnpm install
pnpm dev
```

开发服务器在 http://localhost:16000 运行。

如果需要本地模拟子路径部署：

```bash
MODELS_DEV_BASE_PATH=/models-dev-mirror pnpm dev
```

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
- `fonts/` - 本地字体资源
- `social-share.png` - 本地社交分享图片

### 子路径构建

如果最终通过 Nginx 暴露在 `/models-dev-mirror` 之类的子路径下，构建时需要显式传入子路径：

```bash
MODELS_DEV_BASE_PATH=/models-dev-mirror pnpm build
```

构建后的 `_index.html` 会引用：

- `/models-dev-mirror/assets/...`
- `/models-dev-mirror/social-share.png`
- `/models-dev-mirror/api.json`
- `/models-dev-mirror/logos/...`

### 内网部署（PM2）

参考 `deploy/intranet/README.md` 的完整步骤：

1. 构建产物：

   - 根路径部署：`pnpm build`
   - 子路径部署：`MODELS_DEV_BASE_PATH=/models-dev-mirror pnpm build`

2. 配置日志目录权限
3. 启动 PM2：`pm2 start deploy/intranet/ecosystem.config.cjs`
4. 如果是子路径部署，需要在 PM2 的 `env` 中也设置同样的 `MODELS_DEV_BASE_PATH`
5. 配置 Nginx 反向代理到 127.0.0.1:3000
6. 设置开机自启：`pm2 startup && pm2 save`

#### PM2 环境变量示例

如果使用子路径部署，需要在 `deploy/intranet/ecosystem.config.cjs` 的 `env` 中加入：

```js
env: {
  PORT: "3000",
  MODELS_DEV_BASE_PATH: "/models-dev-mirror",
}
```

#### Nginx 子路径反代示例

根目录提供了最小关键配置示例 `nginx.models-dev-mirror.conf`。使用时需要至少同步两处：

1. 将 `/models-dev-mirror` 替换为你的真实部署子路径
2. 将 `http://127.0.0.1:3066` 替换为你的实际上游地址

示例的关键点是：

- `location = /models-dev-mirror` 重定向到 `/models-dev-mirror/`
- `location /models-dev-mirror/` 使用 **不带尾部斜杠** 的 `proxy_pass`

这样可以避免 Nginx 在代理时错误剥离子路径前缀。

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
