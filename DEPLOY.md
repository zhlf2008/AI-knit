# Cloudflare Pages 部署完整指南

## 问题背景

### 问题 1：验证失败 (405)
- **原因**：原代码依赖 Vite 开发服务器的代理功能（`/api/proxy`），但 Cloudflare Pages 上没有这个代理
- **现象**：部署后显示"验证失败 (405): API 响应异常"

### 问题 2：连接被拒绝 (CORS/网络错误)
- **原因**：ModelScope API 不支持浏览器端直接调用（CORS 限制）
- **现象**：部署后显示"连接被拒绝 (CORS/网络错误)"

## 解决方案

使用 **Cloudflare Pages Functions** 创建 API 代理，解决 CORS 问题。

### 架构说明

```
浏览器应用 (Cloudflare Pages)
    ↓
Cloudflare Pages Functions (/api/*)
    ↓ (添加 CORS 头)
ModelScope API (https://api-inference.modelscope.cn)
```

## 部署步骤

### 第一步：准备项目文件

确保你的项目包含以下文件：

```
AI-knit/
├── dist/                          # 构建输出
│   ├── index.html
│   └── assets/
│       └── index-*.js
├── functions/                     # Cloudflare Pages Functions ⭐ 新增
│   └── api/
│       └── [[path]].js            # API 代理函数
├── services/
│   └── generationService.ts       # 已更新
├── package.json
└── vite.config.ts
```

### 第二步：构建项目

```bash
npm run build
```

### 第三步：部署到 Cloudflare Pages

#### 方式 A：使用 Cloudflare Pages Dashboard（推荐）

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 **Workers & Pages** -> **Create Application** -> **Pages**
3. 选择 **Upload Assets**
4. **上传以下内容**：
   - `dist/` 文件夹中的所有内容
   - `functions/` 文件夹（包含 `functions/api/[[path]].js`）
   
   **重要**：必须同时上传 `dist/` 和 `functions/` 文件夹！

5. 点击 **Deploy Site**
6. 等待部署完成（通常需要 1-2 分钟）

#### 方式 B：使用 Wrangler CLI

1. 安装 Wrangler CLI：
```bash
npm install -g wrangler
```

2. 登录 Cloudflare：
```bash
wrangler login
```

3. 部署：
```bash
cd c:/Users/KH/Desktop/AI-knit
wrangler pages deploy . --project-name=ai-knit-designer
```

#### 方式 C：使用 Git 自动部署

1. 将代码推送到 GitHub/GitLab
2. 在 Cloudflare Pages 中连接仓库
3. 配置构建设置：
   - **构建命令**：`npm run build`
   - **输出目录**：`dist`
   - **根目录**：`/`（这样能包含 functions 文件夹）

### 第四步：验证部署

1. 打开你的 Cloudflare Pages URL
2. 点击"高级设置"
3. 输入 Z-Image API Token（从 https://modelscope.cn/my/myaccesstoken 获取）
4. 点击"测试"按钮
5. ✅ 如果显示"已连接"（绿色），说明部署成功！

## 文件说明

### 1. `functions/api/[[path]].js` - API 代理函数

这个文件创建了 Cloudflare Pages Function，它会：
- 拦截所有 `/api/*` 请求
- 转发到 ModelScope API
- 添加 CORS 头，允许浏览器调用

关键代码：
```javascript
const MODELSCOPE_API_BASE = 'https://api-inference.modelscope.cn';

export async function onRequest(context) {
  // ... 代理逻辑
  // 添加 CORS 头：
  // 'Access-Control-Allow-Origin': '*'
  // 'Access-Control-Allow-Methods': 'GET, POST, ...'
  // 'Access-Control-Allow-Headers': 'Content-Type, Authorization, ...'
}
```

### 2. `services/generationService.ts` - API 调用逻辑

已更新为使用 Cloudflare Pages Functions 代理：

```typescript
const isProduction = !import.meta.env.DEV;

const apiBaseUrl = isProduction
  ? '/api'              // 生产环境：使用 Cloudflare Pages Functions
  : '/api/proxy';       // 开发环境：使用 Vite 代理
```

## 开发环境 vs 生产环境

| 环境 | API 调用方式 | 代理实现 | 用途 |
|------|------------|---------|------|
| 开发环境 (`npm run dev`) | `/api/proxy/*` | Vite 代理 (vite.config.ts) | 本地开发 |
| 生产环境 (Cloudflare Pages) | `/api/*` | Pages Functions (functions/api/[[path]].js) | 生产部署 |

## 常见问题排查

### 问题 1：部署后仍然显示 CORS 错误

**原因**：`functions/` 文件夹没有正确部署

**解决**：
1. 确认上传时包含了 `functions/` 文件夹
2. 在 Cloudflare Pages Dashboard 中，查看 Functions 是否已部署
3. 访问 `https://your-site.pages.dev/api/v1/images/generations` 测试代理是否工作

### 问题 2：Functions 部署失败

**原因**：文件路径或命名不正确

**解决**：
- 确保路径是 `functions/api/[[path]].js`（注意是 `[[path]]`，不是 `[path]`）
- 文件名必须完全匹配

### 问题 3：验证仍然失败

**检查步骤**：
1. 打开浏览器开发者工具（F12）
2. 查看 Network 标签
3. 找到失败的请求，查看：
   - 请求 URL 是否正确（应该是 `/api/v1/...`）
   - 响应头是否包含 `Access-Control-Allow-Origin: *`
   - 错误状态码

### 问题 4：上传后 Functions 不工作

**原因**：使用 Git 部署时，根目录配置不正确

**解决**：
在 Cloudflare Pages 设置中，确保：
- **构建命令**：`npm run build`
- **输出目录**：`dist`
- **根目录**：`/`（留空或 `/`）

## 技术细节

### Cloudflare Pages Functions 工作原理

1. 当访问 `https://your-site.pages.dev/api/...` 时
2. Cloudflare 自动路由到 `functions/api/[[path]].js`
3. 该函数将请求转发到 `https://api-inference.modelscope.cn/...`
4. 添加 CORS 头后返回给浏览器

### CORS 头说明

```javascript
'Access-Control-Allow-Origin': '*'          // 允许所有域名
'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-ModelScope-Async-Mode, X-ModelScope-Task-Type'
'Access-Control-Max-Age': '86400'         // 预检请求缓存 24 小时
```

### 支持的 API 路径

代理支持以下 ModelScope API 路径：
- `/api/v1/images/generations` - 创建图像生成任务
- `/api/v1/tasks/{task_id}` - 查询任务状态

## 下一步

部署成功后，你可以：
1. 开始使用 AI 毛衣设计师生成图像
2. 根据需要自定义配置
3. 优化性能和用户体验

## 获取帮助

如果遇到问题：
1. 查看 [Cloudflare Pages Functions 文档](https://developers.cloudflare.com/pages/functions/)
2. 查看 [ModelScope API 文档](https://www.modelscope.cn/docs/model-service/API-Inference/intro)
3. 在 Cloudflare Dashboard 中查看 Functions 日志
