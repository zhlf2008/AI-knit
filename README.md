<div align="center">
  <h1>🧶 AI 毛衣设计师</h1>
  <p>使用 AI 生成精美毛衣设计的 Web 应用</p>
</div>

## ✨ 特性

- 🎨 **智能设计**：使用 AI 生成个性化毛衣设计
- 🎯 **多种定制**：颜色、材质、领型、风格等多维度配置
- 📐 **多种画幅**：支持 1:1、3:4、4:3、16:9 等多种比例
- 🔄 **随机灵感**：一键生成随机设计组合
- 📚 **创作历史**：本地保存所有生成的作品
- 💾 **本地存储**：配置和历史记录自动保存到浏览器
- 🚀 **快速部署**：支持一键部署到 Cloudflare Pages

## 🚀 快速开始

### 本地运行

**前置要求：** Node.js

1. 安装依赖：
   ```bash
   npm install
   ```

2. 启动开发服务器：
   ```bash
   npm run dev
   ```

3. 在浏览器中打开 `http://localhost:3000`

### 部署到 Cloudflare Pages

**⭐ 推荐方式：使用部署脚本**

Windows:
```bash
deploy.bat
```

Mac/Linux:
```bash
chmod +x deploy.sh
./deploy.sh
```

**手动部署：**

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

4. 部署：
   ```bash
   wrangler pages deploy . --project-name=ai-knit-designer
   ```

**📖 详细部署文档：** 查看 [DEPLOY.md](DEPLOY.md) 了解完整说明和故障排除

## 📝 使用说明

### 1. 配置 API Key

首次使用需要配置 Z-Image API Token：

1. 点击"高级设置"按钮
2. 在"接口配置"标签页中
3. 输入 Z-Image API Token（从 https://modelscope.cn/my/myaccesstoken 获取）
4. 点击"测试"验证连接
5. 确认显示"已连接"即可

### 2. 设计毛衣

- **选择参数**：在左侧面板选择颜色、材质、领型、剪裁风格等
- **随机组合**：点击"随机灵感组合"按钮快速生成设计
- **调整画幅**：选择合适的图片尺寸（1024x1024、864x1152 等）
- **设置种子**：固定种子值可复现相同结果

### 3. 生成图像

1. 在底部提示词框中查看或编辑设计提示词
2. 点击"生成设计图"按钮
3. 等待 AI 生成（通常需要 10-30 秒）
4. 生成完成后可以下载图片

### 4. 查看历史

点击"创作历史"标签页查看所有生成的作品：
- 查看历史记录的详细信息
- 点击图片放大查看
- 点击"使用此配置"恢复参数
- 删除不需要的历史记录

## 🛠️ 技术栈

- **React 18** - UI 框架
- **TypeScript** - 类型安全
- **Vite** - 构建工具
- **Tailwind CSS** - 样式框架
- **Lucide React** - 图标库
- **ModelScope Z-Image API** - AI 图像生成
- **Cloudflare Pages** - 部署平台
- **Cloudflare Pages Functions** - API 代理

## 📁 项目结构

```
AI-knit/
├── components/           # React 组件
│   └── ConfigModal.tsx # 配置弹窗
├── services/            # API 服务
│   └── generationService.ts
├── functions/           # Cloudflare Pages Functions
│   └── api/
│       └── [[path]].js # API 代理
├── App.tsx            # 主应用组件
├── constants.ts       # 常量配置
├── types.ts          # TypeScript 类型定义
└── vite.config.ts    # Vite 配置
```

## 🔧 开发脚本

```bash
npm run dev          # 启动开发服务器
npm run build        # 构建生产版本
npm run preview      # 预览生产构建
npm run electron:dev # 启动 Electron 应用
npm run electron:build # 构建 Electron 应用
```

## 📚 更多文档

- **[QUICK_START.md](QUICK_START.md)** - 快速开始指南
- **[DEPLOY.md](DEPLOY.md)** - 完整部署文档
- **[test-proxy.js](test-proxy.js)** - API 代理测试脚本

## ❓ 常见问题

### Q: 为什么需要 ModelScope API Token？

A: Z-Image API 是免费的，但需要 API Token 进行身份验证和配额管理。访问 https://modelscope.cn/my/myaccesstoken 获取。

### Q: 可以部署到其他平台吗？

A: 可以。由于使用了 Cloudflare Pages Functions 作为 API 代理，部署到其他平台需要：
- 配置自己的后端服务器作为 API 代理
- 或使用其他支持 Edge Functions 的平台（如 Vercel、Netlify）

### Q: 本地开发和生产环境的区别？

A:
- 本地开发：使用 Vite 代理（`/api/proxy`）
- 生产环境：使用 Cloudflare Pages Functions（`/api`）

### Q: 生成的图片保存到哪里？

A:
- 浏览器会自动保存到下载文件夹
- 应用也会在本地存储历史记录（最多 100 条）

### Q: 如何调整生成速度或质量？

A: 在"高级设置"中可以调整：
- **迭代步数**：影响图片质量（1-50）
- **时间偏移**：影响生成速度

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

## 🙏 致谢

- [ModelScope](https://modelscope.cn/) - 提供 Z-Image API
- [Cloudflare](https://www.cloudflare.com/) - 提供 Pages 和 Functions 服务
- [Tailwind CSS](https://tailwindcss.com/) - UI 样式框架
- [Lucide](https://lucide.dev/) - 图标库

---

**⭐ 如果这个项目对你有帮助，请给个 Star！**
