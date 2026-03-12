# models.dev 内网部署文档（PM2）

## 目标

本部署保持与线上相同的访问路径行为：

- `/`、`/index`、`/index.html` 返回主页
- `/api.json` 返回模型数据
- `/model-schema.json` 基于 `_api.json` 动态生成
- `/logos/{provider}.svg` 不存在时回退到 `/logos/default.svg`
- 其他路径 `302` 重定向到 `/`

## 变更清单（仅保留 PM2 必需项）

- `deploy/intranet/server.ts`：内网 Bun 服务，复刻线上 Worker 路由
- `deploy/intranet/nginx.models-dev.conf`：Nginx 反向代理到 `127.0.0.1:3000`
- `deploy/intranet/ecosystem.config.cjs`：PM2 进程配置（日志写入 `/var/log/models-dev`）
- `package.json`：新增 `intranet:serve` 脚本

## 部署步骤

1. 构建站点产物

```bash
cd /home/xsijie/workspaces/models-dev
bun install
cd packages/web && bun run build
cd ../..
```

2. 配置日志目录权限（按你的 PM2 用户）

```bash
sudo mkdir -p /var/log/models-dev
sudo chown -R xsijie:xsijie /var/log/models-dev
sudo chmod 755 /var/log/models-dev
sudo touch /var/log/models-dev/out.log /var/log/models-dev/error.log
sudo chown xsijie:xsijie /var/log/models-dev/out.log /var/log/models-dev/error.log
sudo chmod 644 /var/log/models-dev/out.log /var/log/models-dev/error.log
```

3. 启动 PM2

```bash
pm2 delete models-dev 2>/dev/null || true
pm2 start deploy/intranet/ecosystem.config.cjs
pm2 save
pm2 status
```

4. 配置 Nginx

```bash
sudo cp /home/xsijie/workspaces/models-dev/deploy/intranet/nginx.models-dev.conf /etc/nginx/conf.d/models.dev.conf
sudo nginx -t && sudo systemctl reload nginx
```

5. 配置 PM2 开机自启

```bash
pm2 startup
pm2 save
```

## 运维命令

```bash
pm2 restart models-dev
pm2 logs models-dev
pm2 stop models-dev
pm2 delete models-dev
```

## 关于 pnpm

可以用 `pnpm` 管理依赖，但当前代码运行时依赖 Bun API（如 `Bun.serve`、`Bun.file`、`Bun.build`），所以服务进程和构建仍需要 Bun 执行。
