# AI 毛衣设计师 - 快速开始指南

## 🎯 已完成的修复

### ✅ 问题 1：验证失败 (405)
- **修复**：添加了生产环境检测，不再依赖 Vite 代理
- **文件**：`services/generationService.ts`

### ✅ 问题 2：CORS/网络错误
- **修复**：创建了 Cloudflare Pages Functions API 代理
- **文件**：`functions/api/[[path]].js`

## 📦 项目文件结构

```
AI-knit/
├── dist/                          # 构建输出（自动生成）
│   ├── index.html
│   └── assets/
│       └── index-*.js
├── functions/                     # Cloudflare Pages Functions ⭐
│   └── api/
│       └── [[path]].js            # API 代理函数
├── services/
│   └── generationService.ts       # API 调用逻辑（已更新）
├── deploy.bat                     # Windows 部署脚本
├── deploy.sh                      # Mac/Linux 部署脚本
├── test-proxy.js                  # API 代理测试脚本
├── DEPLOY.md                      # 详细部署文档
└── QUICK_START.md                 # 本文件
```

## 🚀 快速部署

### Windows 用户

1. 双击运行 `deploy.bat`
2. 按照提示操作
3. 完成！

### Mac/Linux 用户

```bash
chmod +x deploy.sh
./deploy.sh
```

### 手动部署

```bash
# 1. 安装 Wrangler CLI
npm install -g wrangler

# 2. 登录 Cloudflare
wrangler login

# 3. 构建
npm run build

# 4. 部署
wrangler pages deploy . --project-name=ai-knit-designer
```

### 使用 Cloudflare Dashboard

1. 运行 `npm run build`
2. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
3. 进入 **Workers & Pages** -> **Create Application** -> **Pages**
4. 选择 **Upload Assets**
5. **重要**：同时上传 `dist/` 和 `functions/` 文件夹
6. 点击 **Deploy Site**

## ✅ 验证部署

部署后，按照以下步骤验证：

1. 打开你的 Cloudflare Pages URL
2. 点击"高级设置"
3. 输入 Z-Image API Token（从 https://modelscope.cn/my/myaccesstoken 获取）
4. 点击"测试"按钮
5. ✅ 如果显示"已连接"（绿色），说明部署成功！

## 🧪 测试 API 代理

如果遇到问题，可以测试 API 代理是否正常工作：

1. 在浏览器中打开你的 Cloudflare Pages 网站
2. 按 F12 打开开发者工具
3. 复制 `test-proxy.js` 中的代码到控制台
4. 将 `YOUR_TOKEN` 替换为你的 ModelScope API Token
5. 运行测试

## 🔧 开发

### 本地开发

```bash
npm install
npm run dev
```

### 构建

```bash
npm run build
```

## 📚 文档

- **DEPLOY.md** - 完整的部署文档，包含详细说明和故障排除
- **QUICK_START.md** - 本文件，快速开始指南

## ❓ 常见问题

### Q: 为什么需要 functions 文件夹？
A: ModelScope API 不支持浏览器直接调用（CORS 限制）。Cloudflare Pages Functions 作为代理服务器，添加必要的 CORS 头。

### Q: 部署后仍然显示 CORS 错误？
A: 检查：
1. 是否上传了 `functions/` 文件夹
2. Functions 是否在 Cloudflare Dashboard 中显示
3. 访问 `https://your-site.pages.dev/api/v1/images/generations` 测试

### Q: 如何获取 ModelScope API Token？
A: 访问 https://modelscope.cn/my/myaccesstoken 获取

### Q: 开发环境和生产环境的区别？
A:
- 开发环境：使用 Vite 代理 (`/api/proxy`)
- 生产环境：使用 Cloudflare Pages Functions (`/api`)

## 🎉 开始使用

部署成功后，你就可以：
1. 选择毛衣的颜色、材质、领型等
2. 输入或使用随机组合生成设计提示词
3. 点击"生成设计图"
4. 等待 AI 生成你的毛衣设计！

## 📞 获取帮助

如果遇到问题：
1. 查看 `DEPLOY.md` 中的详细故障排除部分
2. 查看浏览器控制台的错误信息
3. 检查 Cloudflare Pages 的 Functions 日志

祝你使用愉快！🎨✨
