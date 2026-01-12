@echo off
chcp 65001 >nul
title File Compare - 文件对比工具

set PORT=8081

echo ================================================
echo   📂 File Compare - 文件对比工具
echo ================================================
echo.

REM 检查Python是否安装
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ 错误: 未找到 Python
    echo 请安装 Python 3: https://www.python.org/downloads/
    echo.
    pause
    exit /b 1
)

echo ✓ 启动服务器...
echo.
echo 🌐 打开浏览器访问: http://localhost:%PORT%
echo.
echo 按 Ctrl+C 停止服务器
echo ------------------------------------------------
echo.

REM 切换到脚本所在目录
cd /d "%~dp0"

REM 启动HTTP服务器
python -m http.server %PORT%

pause
