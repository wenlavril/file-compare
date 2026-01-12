#!/bin/bash

# File Compare - 启动脚本 (Mac/Linux)
# 双击运行或在终端执行: ./start.sh

PORT=8081

echo "================================================"
echo "  📂 File Compare - 文件对比工具"
echo "================================================"
echo ""

# 检查Python是否安装
if command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
elif command -v python &> /dev/null; then
    PYTHON_CMD="python"
else
    echo "❌ 错误: 未找到 Python"
    echo "请安装 Python 3: https://www.python.org/downloads/"
    echo ""
    read -p "按回车键退出..."
    exit 1
fi

echo "✓ 使用 $PYTHON_CMD"
echo "✓ 启动服务器..."
echo ""
echo "🌐 打开浏览器访问: http://localhost:$PORT"
echo ""
echo "按 Ctrl+C 停止服务器"
echo "------------------------------------------------"
echo ""

# 切换到脚本所在目录
cd "$(dirname "$0")"

# 启动HTTP服务器
$PYTHON_CMD -m http.server $PORT

