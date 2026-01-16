@echo off
chcp 65001 > nul
echo ================================
echo AI 毛衣设计师 - Cloudflare Pages 部署
echo ================================
echo.

REM 检查是否安装了 wrangler
where wrangler >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Wrangler CLI 未安装
    echo 正在安装 Wrangler CLI...
    call npm install -g wrangler
)

REM 构建
echo 📦 正在构建项目...
call npm run build

if %ERRORLEVEL% NEQ 0 (
    echo ❌ 构建失败
    pause
    exit /b 1
)

echo ✅ 构建成功
echo.

REM 检查必要的文件
echo 🔍 检查必要的文件...

if not exist "dist" (
    echo ❌ dist 文件夹不存在
    pause
    exit /b 1
)

if not exist "functions" (
    echo ❌ functions 文件夹不存在
    pause
    exit /b 1
)

if not exist "functions\api\[[path]].js" (
    echo ❌ functions\api\[[path]].js 不存在
    pause
    exit /b 1
)

echo ✅ 所有必要文件存在
echo.

REM 部署
echo 🚀 开始部署到 Cloudflare Pages...
echo.
echo 如果这是第一次部署，Wrangler 会提示你输入项目名称
echo.

call wrangler pages deploy . --project-name=ai-knit-designer

echo.
echo ================================
echo ✅ 部署完成！
echo ================================
echo.
echo 下一步：
echo 1. 打开你的 Cloudflare Pages URL
echo 2. 点击"高级设置"
echo 3. 输入 Z-Image API Token
echo 4. 点击"测试"验证连接
echo.
pause
