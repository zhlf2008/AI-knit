# Cloudflare Pages 部署修复说明

## 问题描述
在 Cloudflare Pages 上部署后，验证连接功能显示"验证失败 (405): API 响应异常"。

## 问题原因
原代码依赖 Vite 开发服务器的代理功能（`/api/proxy`），但在生产环境（Cloudflare Pages）中，Vite 代理服务器不存在，导致 API 请求失败。

## 修复方案
修改了 `services/generationService.ts`，添加了生产环境检测逻辑：

1. **开发环境**：继续使用 Vite 代理（`/api/proxy`）
2. **生产环境**：直接调用 ModelScope API（`https://api-inference.modelscope.cn`）

关键修改：
```typescript
const isProduction = !import.meta.env.DEV;

const apiBaseUrl = isProduction
  ? 'https://api-inference.modelscope.cn'
  : '/api/proxy';
```

## 部署步骤

### 方法一：使用 Cloudflare Pages CLI（推荐）

1. 安装 Wrangler CLI：
```bash
npm install -g wrangler
```

2. 登录 Cloudflare：
```bash
wrangler login
```

3. 构建项目：
```bash
npm run build
```

4. 部署到 Cloudflare Pages：
```bash
cd dist
wrangler pages deploy . --project-name=ai-knit-designer
```

### 方法二：使用 Cloudflare Pages Dashboard

1. 构建项目：
```bash
npm run build
```

2. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)

3. 进入 **Workers & Pages** -> **Create Application** -> **Pages**

4. 选择 **Upload Assets**，上传 `dist` 文件夹中的所有内容

5. 部署完成后，访问生成的 URL

### 方法三：使用 Git 连接（自动部署）

1. 将代码推送到 GitHub/GitLab

2. 在 Cloudflare Pages 中连接仓库

3. 配置构建设置：
   - **构建命令**：`npm run build`
   - **输出目录**：`dist`

4. 每次推送代码后自动部署

## 验证修复

部署后，请验证以下功能：

1. 打开应用，点击"高级设置"
2. 输入 Z-Image API Token（从 https://modelscope.cn/my/myaccesstoken 获取）
3. 点击"测试"按钮
4. 如果显示"已连接"（绿色），说明修复成功

## 注意事项

- Z-Image API（ModelScope）支持 CORS，所以生产环境可以直接调用
- 确保在 Cloudflare Pages 的设置中没有添加额外的重写规则，可能会影响 API 调用
- 如果遇到网络问题，请检查是否需要配置 Cloudflare Pages 的网络访问策略

## 开发环境 vs 生产环境

| 环境 | API 调用方式 | 原因 |
|------|------------|------|
| 开发环境 (`npm run dev`) | 通过 Vite 代理 `/api/proxy` | 解决开发时的 CORS 问题 |
| 生产环境 (Cloudflare Pages) | 直接调用 `https://api-inference.modelscope.cn` | ModelScope API 支持 CORS，无需代理 |

## 技术细节

修复涉及的文件：
- `services/generationService.ts` - `verifyConnection` 函数和 `generateWithZImage` 函数

关键变更：
- 使用 `import.meta.env.DEV` 检测运行环境
- 生产环境直接调用完整的 API URL
- 保持向后兼容，不影响开发环境的代理功能
