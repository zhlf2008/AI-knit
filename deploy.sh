#!/bin/bash

# AI 毛衣设计师 - Cloudflare Pages 部署脚本

echo "================================"
echo "AI 毛衣设计师 - 部署到 Cloudflare Pages"
echo "================================"
echo ""

# 检查是否安装了 wrangler
if ! command -v wrangler &> /dev/null
then
    echo "❌ Wrangler CLI 未安装"
    echo "正在安装 Wrangler CLI..."
    npm install -g wrangler
fi

# 构建
echo "📦 正在构建项目..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ 构建失败"
    exit 1
fi

echo "✅ 构建成功"
echo ""

# 检查必要的文件
echo "🔍 检查必要的文件..."

if [ ! -d "dist" ]; then
    echo "❌ dist 文件夹不存在"
    exit 1
fi

if [ ! -d "functions" ]; then
    echo "❌ functions 文件夹不存在"
    exit 1
fi

if [ ! -f "functions/api/[[path]].js" ]; then
    echo "❌ functions/api/[[path]].js 不存在"
    exit 1
fi

echo "✅ 所有必要文件存在"
echo ""

# 部署
echo "🚀 开始部署到 Cloudflare Pages..."
echo ""
echo "如果这是第一次部署，Wrangler 会提示你输入项目名称"
echo ""

wrangler pages deploy . --project-name=ai-knit-designer

echo ""
echo "================================"
echo "✅ 部署完成！"
echo "================================"
echo ""
echo "下一步："
echo "1. 打开你的 Cloudflare Pages URL"
echo "2. 点击'高级设置'"
echo "3. 输入 Z-Image API Token"
echo "4. 点击'测试'验证连接"
echo ""
