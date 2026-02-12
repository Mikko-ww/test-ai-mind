# 贪吃蛇游戏

一个使用 Python 和 pygame 开发的经典贪吃蛇游戏。

## 项目说明

这是一个简单的贪吃蛇游戏实现，用于展示 Python 游戏开发的基本概念和使用 uv 工具管理 Python 项目。

## 功能特性

- 经典的贪吃蛇游戏玩法
- 使用方向键控制蛇的移动
- 实时显示分数
- 碰撞检测（撞墙、撞自己身体）
- 简洁的图形界面

## 环境要求

- Python 3.10 或更高版本
- uv 包管理工具

## 安装步骤

### 1. 安装 uv

如果还没有安装 uv，可以通过以下方式安装：

```bash
# 使用 pip 安装
pip install uv

# 或使用官方安装脚本（推荐）
curl -LsSf https://astral.sh/uv/install.sh | sh
```

### 2. 安装项目依赖

进入 game 目录并同步依赖：

```bash
cd game
uv sync
```

这将自动创建虚拟环境并安装所需的依赖（包括 pygame）。

## 运行游戏

安装完依赖后，使用以下命令启动游戏：

```bash
# 在 game 目录下
uv run python main.py
```

或者激活虚拟环境后直接运行：

```bash
source .venv/bin/activate  # Linux/macOS
# 或
.venv\Scripts\activate     # Windows

python main.py
```

## 游戏操作

- **方向键（↑↓←→）**: 控制蛇的移动方向
- **关闭窗口**: 退出游戏

## 游戏规则

1. 控制蛇吃食物（红色方块）
2. 每吃一个食物，蛇身变长，分数增加
3. 撞墙或撞到自己的身体时游戏结束
4. 游戏结束后会显示最终得分

## 项目结构

```
game/
├── main.py           # 游戏主程序（待实现）
├── pyproject.toml    # 项目配置文件
├── README.md         # 项目说明文档
└── .python-version   # Python 版本配置
```

## 开发说明

本项目使用 uv 工具管理依赖：

- `pyproject.toml`: 定义项目元数据和依赖
- `uv sync`: 同步并安装依赖
- `uv add <package>`: 添加新的依赖包
- `uv remove <package>`: 移除依赖包
- `uv run <command>`: 在项目环境中运行命令

## 常见问题

### pygame 安装失败

如果在某些系统上 pygame 安装失败，可能需要安装系统依赖：

**Ubuntu/Debian:**
```bash
sudo apt-get install python3-dev libsdl2-dev libsdl2-image-dev libsdl2-mixer-dev libsdl2-ttf-dev
```

**macOS:**
```bash
brew install sdl2 sdl2_image sdl2_mixer sdl2_ttf
```

**Windows:**
通常不需要额外的系统依赖，pygame 会自动安装所需的 DLL 文件。

### 虚拟环境位置

uv 会在项目目录下创建 `.venv` 目录作为虚拟环境。如果需要重新创建环境，可以删除 `.venv` 目录后重新运行 `uv sync`。

## 许可证

本项目仅用于学习和演示目的。

## 贡献

欢迎提交 Issue 和 Pull Request！
