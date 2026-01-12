# 📂 File Compare

一个现代化的 Web 文件对比工具，类似 Beyond Compare，支持文本对比、语法高亮、差异导航等功能。


## ✨ 功能特性

- 🔍 **智能差异对比** - 基于 jsdiff 的行级和字符级差异检测
- 🎨 **语法高亮** - 使用 highlight.js 自动检测语言并高亮
- 📁 **多种输入方式** - 支持文件拖拽、粘贴、文件选择
- 🔄 **同步滚动** - 左右面板自动同步滚动
- ⌨️ **快捷键支持** - F7/F8 快速跳转上/下一个差异
- 📊 **差异统计** - 实时显示差异数量和行数
- 💾 **导出功能** - 导出为统一 diff 格式的 patch 文件
- 🌙 **现代 UI** - VS Code 风格的深色主题

## 🚀 快速开始

### 方法一：一键启动（推荐）

**Mac / Linux:**
```bash
# 双击 start.sh 或在终端运行
./start.sh
```

**Windows:**
```bash
# 双击 start.bat
start.bat
```

然后在浏览器打开 http://localhost:8081

### 方法二：手动启动

确保已安装 Python 3，然后运行：

```bash
cd file-compare
python3 -m http.server 8081
```

打开浏览器访问 http://localhost:8081

### 方法三：直接打开

直接用浏览器打开 `index.html` 文件（部分功能可能受限）

## 📖 使用说明

### 基本操作

1. **加载文件**
   - 点击 "📂 打开" 按钮选择文件
   - 直接将文件拖拽到编辑区
   - 使用 Ctrl+V 粘贴文本内容

2. **查看差异**
   - 红色背景：删除的行
   - 绿色背景：新增的行
   - 黄色背景：修改的行

3. **导航差异**
   - 点击工具栏的 "◀ 差别" / "差别 ▶" 按钮
   - 使用快捷键 F7（上一个）/ F8（下一个）
   - 使用 Ctrl+↑ / Ctrl+↓

4. **其他功能**
   - 点击 "⇄" 交换左右内容
   - 点击 "💾 导出" 导出差异文件

### 快捷键

| 快捷键 | 功能 |
|--------|------|
| `F7` | 跳转到上一个差异 |
| `F8` | 跳转到下一个差异 |
| `Ctrl + ↑` | 跳转到上一个差异 |
| `Ctrl + ↓` | 跳转到下一个差异 |
| `Ctrl + S` | 导出差异文件 |

## 🛠️ 技术栈

- **前端框架**: 原生 JavaScript (ES6+)
- **差异算法**: [jsdiff](https://github.com/kpdecker/jsdiff)
- **语法高亮**: [highlight.js](https://highlightjs.org/)
- **样式**: CSS3 (CSS Variables, Flexbox, Grid)

## 📁 项目结构

```
file-compare/
├── index.html          # 主页面
├── start.sh           # Mac/Linux 启动脚本
├── start.bat          # Windows 启动脚本
├── README.md          # 说明文档
├── css/
│   └── style.css      # 样式文件
└── js/
    ├── app.js         # 主应用逻辑
    ├── diff-engine.js # 差异计算引擎
    ├── syntax.js      # 语法高亮模块
    └── folder-compare.js # 文件夹对比模块
```

## 🌐 浏览器支持

- ✅ Chrome (推荐)
- ✅ Firefox
- ✅ Edge
- ✅ Safari

## 📄 License

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 📮 反馈

如有问题或建议，请提交 [Issue](../../issues)。
