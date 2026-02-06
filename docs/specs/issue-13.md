# 需求规格说明书

> **Issue**: #13
> **创建时间**: 2026-02-06
> **状态**: 待审批

## 背景与目标

### 业务背景

当前项目缺少实践性的Python游戏开发示例，这对于想要学习Python游戏开发的开发者来说是一个遗憾。同时，项目还未采用uv这样的现代Python包管理工具，而uv以其快速、简单的特点正在成为Python社区的新选择。

通过在项目中添加一个简单的贪吃蛇游戏，可以：
- **提供学习价值**：为Python初学者提供一个经典且易于理解的游戏开发示例
- **展示工具使用**：演示如何使用uv管理Python项目
- **丰富项目内容**：为项目增加趣味性和实用性
- **建立基础结构**：为未来添加更多Python小游戏奠定基础

### 目标

本需求的核心目标是创建一个简单但完整的贪吃蛇游戏项目，使用现代Python工具链，代码简洁易懂，适合学习和参考。

**主要目标：**
- 在项目根目录下建立规范的game目录结构
- 实现一个功能完整但代码简洁的贪吃蛇游戏（≤300行代码）
- 使用uv作为Python包管理工具，展示其基本用法
- 提供清晰的文档，使用户能够快速运行和理解游戏

**成功指标：**
- ✅ 用户能在5分钟内完成游戏的安装和运行
- ✅ 游戏核心功能完整（移动、吃食物、碰撞检测、计分）
- ✅ 代码行数控制在300行以内，易于阅读和学习
- ✅ 在Windows、macOS、Linux三大平台上都能正常运行

## 范围（包含/不包含）

### 包含在本需求中

以下功能和特性将在本需求中实现：

- ✅ **项目结构**：创建game目录，使用uv初始化Python项目
- ✅ **项目配置**：配置pyproject.toml文件，包含项目元数据和依赖
- ✅ **核心游戏逻辑**：
  - 游戏窗口初始化（600x600像素）
  - 蛇的移动控制（方向键：↑↓←→）
  - 食物随机生成系统
  - 蛇吃食物后身体增长
  - 碰撞检测（边界和自身）
  - 分数统计和显示
  - 游戏结束判定和显示
- ✅ **用户界面**：简单的2D图形界面（使用pygame）
- ✅ **文档**：README.md包含安装说明、运行方法、游戏玩法
- ✅ **Python版本规范**：.python-version文件指定Python 3.9+

### 不包含在本需求中

以下内容明确不在本需求范围内，避免范围蔓延：

- ❌ **高级图形效果**：渐变、阴影、粒子效果、平滑动画
- ❌ **音频系统**：背景音乐、音效
- ❌ **高级游戏功能**：
  - 多人游戏模式
  - 难度等级选择
  - 关卡系统
  - 道具系统（加速、减速等）
  - AI对手
- ❌ **数据持久化**：排行榜、历史记录保存
- ❌ **网络功能**：在线排行榜、多人对战
- ❌ **高级UI**：菜单系统、设置界面、暂停功能
- ❌ **单元测试**：由于游戏逻辑简单且主要是学习用途，不要求测试代码
- ❌ **打包分发**：不需要创建可执行文件或安装包

## 用户故事/使用场景

### 用户故事1：快速运行游戏

**作为** Python学习者  
**我想要** 能够快速克隆项目并运行贪吃蛇游戏  
**以便** 体验游戏效果并为学习代码做准备

**验收标准：**
- [ ] README文档清晰说明前置条件（Python 3.9+和uv）
- [ ] 安装步骤不超过3个命令
- [ ] 从克隆仓库到游戏运行，整个过程不超过5分钟
- [ ] 游戏窗口能正常打开并显示初始状态

**具体步骤示例：**
```bash
# 1. 进入game目录
cd game

# 2. 使用uv安装依赖
uv sync

# 3. 运行游戏
uv run python snake.py
```

### 用户故事2：游玩贪吃蛇游戏

**作为** 游戏玩家  
**我想要** 使用键盘方向键控制蛇的移动，吃食物获得分数  
**以便** 享受经典的贪吃蛇游戏体验

**验收标准：**
- [ ] 使用方向键（↑↓←→）可以流畅控制蛇的方向
- [ ] 不能直接反向移动（如向右移动时按左键无效）
- [ ] 蛇吃到食物后身体立即增长一节
- [ ] 分数在屏幕上实时显示
- [ ] 撞到边界墙壁时游戏结束
- [ ] 蛇头撞到自己身体时游戏结束
- [ ] 游戏结束后显示"Game Over"和最终分数
- [ ] 游戏结束后可以按ESC退出或关闭窗口

### 用户故事3：学习游戏开发

**作为** Python开发者  
**我想要** 阅读简洁清晰的游戏代码  
**以便** 学习游戏开发的基本原理和实现方法

**验收标准：**
- [ ] 代码总行数不超过300行
- [ ] 变量和函数命名清晰，见名知意
- [ ] 关键逻辑有适当的注释说明
- [ ] 代码结构清晰，主要功能划分明确
- [ ] 不使用过于复杂的语法或技巧，便于理解

### 用户故事4：学习uv工具

**作为** Python开发者  
**我想要** 通过实际项目了解uv的使用方法  
**以便** 在自己的项目中使用这个现代化的包管理工具

**验收标准：**
- [ ] pyproject.toml配置文件格式规范
- [ ] 依赖声明简洁明确
- [ ] README中说明uv的基本命令
- [ ] 可以通过`uv sync`安装依赖
- [ ] 可以通过`uv run`运行程序

## 功能需求

### 功能1：项目结构和配置

**描述：** 创建规范的Python游戏项目结构，使用uv进行项目管理和依赖配置。

**输入：** 无（从头创建）

**处理：** 
1. 在项目根目录创建game目录
2. 在game目录下创建以下文件：
   - `pyproject.toml`: 项目配置文件
   - `snake.py`: 主游戏文件
   - `README.md`: 项目说明文档
   - `.python-version`: Python版本指定（3.9或更高）
3. 配置pyproject.toml，包含：
   - 项目元数据（名称、版本、描述）
   - Python版本要求（>=3.9）
   - 依赖包（pygame）
4. 配置README.md，包含：
   - 项目简介
   - 前置条件
   - 安装步骤
   - 运行方法
   - 游戏玩法说明

**输出：** 完整的项目结构和配置文件

**边界条件：**
- game目录必须在项目根目录下
- Python版本必须是3.9或更高（3.8已于2024年10月EOL）
- pyproject.toml必须符合PEP 518规范

**技术规格：**

```toml
# pyproject.toml 示例结构
[project]
name = "snake-game"
version = "1.0.0"
description = "简单的贪吃蛇游戏"
requires-python = ">=3.9"
dependencies = [
    "pygame>=2.5.0",
]
```

### 功能2：游戏窗口和初始化

**描述：** 创建游戏窗口，初始化pygame环境和游戏初始状态。

**输入：** 游戏配置常量

**处理：**
1. 初始化pygame库
2. 创建游戏窗口（600x600像素）
3. 设置窗口标题（"贪吃蛇游戏"）
4. 创建游戏时钟，控制帧率（10 FPS，即蛇每秒移动10格）
5. 初始化游戏状态：
   - 蛇的初始位置（屏幕中央）
   - 蛇的初始长度（3节）
   - 蛇的初始方向（向右）
   - 初始分数（0）
   - 游戏状态（运行中）
6. 生成第一个食物

**输出：** 显示游戏窗口和初始游戏画面

**边界条件：**
- 窗口大小固定为600x600像素
- 使用网格系统，每个格子20x20像素（30x30网格）
- 蛇初始位置在屏幕中央（15, 15）
- 蛇初始长度为3节
- 帧率固定为10 FPS

**技术规格：**

```python
# 游戏常量
WINDOW_WIDTH = 600
WINDOW_HEIGHT = 600
CELL_SIZE = 20
GRID_WIDTH = WINDOW_WIDTH // CELL_SIZE  # 30
GRID_HEIGHT = WINDOW_HEIGHT // CELL_SIZE  # 30

# 颜色定义（RGB）
COLOR_BG = (0, 0, 0)  # 黑色背景
COLOR_SNAKE = (0, 255, 0)  # 绿色蛇身
COLOR_FOOD = (255, 0, 0)  # 红色食物
COLOR_TEXT = (255, 255, 255)  # 白色文字

# 方向定义
DIR_UP = (0, -1)
DIR_DOWN = (0, 1)
DIR_LEFT = (-1, 0)
DIR_RIGHT = (1, 0)

# 初始状态
snake_positions = [(15, 15), (14, 15), (13, 15)]  # 头部在前
snake_direction = DIR_RIGHT
score = 0
game_over = False
```

### 功能3：蛇的移动和方向控制

**描述：** 响应键盘输入，控制蛇的移动方向，并实现蛇的持续移动。

**输入：** 
- 键盘事件（方向键：↑↓←→）
- 当前蛇的位置和方向

**处理：**
1. **方向控制**：
   - 监听pygame的键盘事件
   - 响应方向键输入
   - 更新蛇的移动方向
   - 防止反向移动（如向右时不能直接向左）
2. **移动逻辑**：
   - 根据当前方向计算新的蛇头位置
   - 将新蛇头位置添加到蛇身列表前端
   - 如果没有吃到食物，移除蛇尾（保持长度）
   - 如果吃到食物，保留蛇尾（身体增长）

**输出：** 蛇在屏幕上按指定方向移动

**边界条件：**
- 不能直接反向移动（如当前向右，按左键无效）
- 移动速度固定（10格/秒，即0.1秒移动一格）
- 蛇的移动是离散的（按格子移动，不是像素移动）

**技术规格：**

```python
# 方向控制逻辑
def handle_input(event, current_direction):
    """处理键盘输入，返回新方向"""
    if event.type == pygame.KEYDOWN:
        if event.key == pygame.K_UP and current_direction != DIR_DOWN:
            return DIR_UP
        elif event.key == pygame.K_DOWN and current_direction != DIR_UP:
            return DIR_DOWN
        elif event.key == pygame.K_LEFT and current_direction != DIR_RIGHT:
            return DIR_LEFT
        elif event.key == pygame.K_RIGHT and current_direction != DIR_LEFT:
            return DIR_RIGHT
    return current_direction

# 移动逻辑
def move_snake(snake_positions, direction, ate_food):
    """移动蛇，返回新的蛇身位置列表"""
    head_x, head_y = snake_positions[0]
    new_head = (head_x + direction[0], head_y + direction[1])
    
    new_snake = [new_head] + snake_positions
    if not ate_food:
        new_snake = new_snake[:-1]  # 没吃食物，去掉蛇尾
    
    return new_snake
```

### 功能4：食物系统

**描述：** 在随机位置生成食物，检测蛇是否吃到食物，处理吃食物的逻辑。

**输入：** 
- 蛇的当前位置
- 当前食物位置

**处理：**
1. **食物生成**：
   - 在网格中随机选择一个位置
   - 确保食物不在蛇身上
   - 如果随机位置在蛇身上，重新生成
2. **碰撞检测**：
   - 检查蛇头位置是否与食物位置相同
   - 如果相同，触发吃食物逻辑
3. **吃食物逻辑**：
   - 分数增加（+10分）
   - 标记需要增长蛇身
   - 生成新的食物

**输出：** 
- 食物在屏幕上显示（红色方块）
- 蛇吃到食物后变长
- 分数增加
- 新食物出现

**边界条件：**
- 食物位置必须在网格范围内（0-29, 0-29）
- 食物不能生成在蛇身上
- 每次只有一个食物存在
- 每吃一个食物增加10分

**技术规格：**

```python
def generate_food(snake_positions):
    """生成食物位置，确保不在蛇身上"""
    while True:
        food_x = random.randint(0, GRID_WIDTH - 1)
        food_y = random.randint(0, GRID_HEIGHT - 1)
        food_pos = (food_x, food_y)
        
        if food_pos not in snake_positions:
            return food_pos

def check_food_collision(snake_head, food_pos):
    """检查是否吃到食物"""
    return snake_head == food_pos
```

### 功能5：碰撞检测和游戏结束

**描述：** 检测蛇是否撞墙或撞到自己，如果发生碰撞则游戏结束。

**输入：** 
- 蛇的当前位置（特别是蛇头位置）
- 游戏边界

**处理：**
1. **边界碰撞检测**：
   - 检查蛇头的x坐标是否超出范围（< 0 或 >= 30）
   - 检查蛇头的y坐标是否超出范围（< 0 或 >= 30）
2. **自身碰撞检测**：
   - 检查蛇头位置是否与蛇身任一节重叠
   - 注意：蛇头不能与自己比较
3. **游戏结束处理**：
   - 设置游戏状态为结束
   - 停止游戏主循环
   - 显示"Game Over"消息
   - 显示最终分数
   - 等待用户按ESC退出或关闭窗口

**输出：** 
- 碰撞发生时游戏停止
- 显示游戏结束画面
- 显示最终得分

**边界条件：**
- 边界为游戏窗口的四条边（x: 0-29, y: 0-29）
- 蛇身长度 >= 4时才可能撞到自己（头+3节身体）
- 游戏结束后不接受移动输入，只接受退出操作

**技术规格：**

```python
def check_wall_collision(head_pos):
    """检查是否撞墙"""
    x, y = head_pos
    return x < 0 or x >= GRID_WIDTH or y < 0 or y >= GRID_HEIGHT

def check_self_collision(snake_positions):
    """检查是否撞到自己"""
    head = snake_positions[0]
    body = snake_positions[1:]  # 蛇身（不包括头）
    return head in body

def is_game_over(snake_positions):
    """判断游戏是否结束"""
    return check_wall_collision(snake_positions[0]) or check_self_collision(snake_positions)
```

### 功能6：游戏渲染和显示

**描述：** 在每一帧绘制游戏画面，包括蛇、食物、分数等元素。

**输入：** 游戏当前状态（蛇位置、食物位置、分数、游戏状态）

**处理：**
1. **清空屏幕**：用背景色填充整个窗口
2. **绘制食物**：在食物位置绘制红色方块
3. **绘制蛇**：
   - 遍历蛇身所有位置
   - 在每个位置绘制绿色方块
   - 可选：蛇头使用稍微不同的颜色区分
4. **绘制分数**：
   - 在屏幕顶部显示当前分数
   - 使用白色文字
   - 字体大小适中（如32号）
5. **游戏结束画面**：
   - 显示"Game Over"文字（居中）
   - 显示最终分数
   - 显示提示信息（"按ESC退出"）
6. **刷新显示**：调用pygame.display.flip()更新屏幕

**输出：** 屏幕上显示完整的游戏画面

**边界条件：**
- 绘制顺序：背景 → 食物 → 蛇 → UI文字
- 每个格子大小固定为20x20像素
- 帧率固定为10 FPS
- 游戏结束画面覆盖在游戏画面上

**技术规格：**

```python
def draw_game(screen, snake_positions, food_pos, score, game_over):
    """绘制游戏画面"""
    # 清空屏幕
    screen.fill(COLOR_BG)
    
    if not game_over:
        # 绘制食物
        food_rect = pygame.Rect(
            food_pos[0] * CELL_SIZE,
            food_pos[1] * CELL_SIZE,
            CELL_SIZE,
            CELL_SIZE
        )
        pygame.draw.rect(screen, COLOR_FOOD, food_rect)
        
        # 绘制蛇
        for pos in snake_positions:
            snake_rect = pygame.Rect(
                pos[0] * CELL_SIZE,
                pos[1] * CELL_SIZE,
                CELL_SIZE,
                CELL_SIZE
            )
            pygame.draw.rect(screen, COLOR_SNAKE, snake_rect)
        
        # 绘制分数
        font = pygame.font.Font(None, 36)
        score_text = font.render(f'Score: {score}', True, COLOR_TEXT)
        screen.blit(score_text, (10, 10))
    else:
        # 游戏结束画面
        font_large = pygame.font.Font(None, 72)
        font_small = pygame.font.Font(None, 36)
        
        game_over_text = font_large.render('Game Over', True, COLOR_TEXT)
        score_text = font_small.render(f'Final Score: {score}', True, COLOR_TEXT)
        hint_text = font_small.render('Press ESC to quit', True, COLOR_TEXT)
        
        # 居中显示
        screen.blit(game_over_text, 
                   (WINDOW_WIDTH//2 - game_over_text.get_width()//2, 200))
        screen.blit(score_text,
                   (WINDOW_WIDTH//2 - score_text.get_width()//2, 300))
        screen.blit(hint_text,
                   (WINDOW_WIDTH//2 - hint_text.get_width()//2, 400))
    
    pygame.display.flip()
```

### 功能7：游戏主循环

**描述：** 实现游戏的主循环，协调各个功能模块，控制游戏流程。

**输入：** 无（从游戏初始化开始）

**处理：**
1. 初始化游戏状态
2. 进入主循环（while循环）
3. 在每一帧：
   - 处理pygame事件（键盘输入、窗口关闭）
   - 如果游戏未结束：
     - 移动蛇
     - 检查是否吃到食物
     - 检查碰撞（墙壁和自身）
     - 更新游戏状态
   - 绘制游戏画面
   - 控制帧率（10 FPS）
4. 游戏结束后等待用户退出
5. 清理资源，退出pygame

**输出：** 完整的游戏体验流程

**边界条件：**
- 主循环运行直到用户退出或关闭窗口
- 帧率稳定在10 FPS
- 游戏结束后停止更新游戏逻辑，但继续显示结束画面

**技术规格：**

```python
def main():
    """主函数"""
    # 初始化pygame
    pygame.init()
    screen = pygame.display.set_mode((WINDOW_WIDTH, WINDOW_HEIGHT))
    pygame.display.set_caption('贪吃蛇游戏')
    clock = pygame.time.Clock()
    
    # 初始化游戏状态
    snake_positions = [(15, 15), (14, 15), (13, 15)]
    snake_direction = DIR_RIGHT
    food_pos = generate_food(snake_positions)
    score = 0
    game_over = False
    
    # 游戏主循环
    running = True
    while running:
        # 处理事件
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            elif event.type == pygame.KEYDOWN:
                if event.key == pygame.K_ESCAPE:
                    running = False
                elif not game_over:
                    snake_direction = handle_input(event, snake_direction)
        
        # 更新游戏逻辑
        if not game_over:
            # 移动蛇
            ate_food = check_food_collision(snake_positions[0], food_pos)
            snake_positions = move_snake(snake_positions, snake_direction, ate_food)
            
            # 处理食物
            if ate_food:
                score += 10
                food_pos = generate_food(snake_positions)
            
            # 检查碰撞
            game_over = is_game_over(snake_positions)
        
        # 绘制画面
        draw_game(screen, snake_positions, food_pos, score, game_over)
        
        # 控制帧率
        clock.tick(10)  # 10 FPS
    
    # 清理并退出
    pygame.quit()

if __name__ == '__main__':
    main()
```

## 非功能需求

### 性能要求

- **帧率稳定性**：游戏运行帧率稳定在10 FPS，无明显波动
- **响应延迟**：键盘输入到蛇改变方向的延迟 < 50ms
- **内存占用**：游戏运行时内存占用 < 100MB
- **CPU占用**：单核CPU占用 < 5%（在现代处理器上）
- **启动时间**：游戏从启动到窗口显示 < 2秒

**验证方法：**
- 使用系统监控工具（如htop、任务管理器）观察资源占用
- 通过游玩体验验证流畅性和响应性
- 在不同性能的机器上测试

### 安全要求

由于这是一个本地单机游戏，安全要求相对简单：

- **无网络通信**：游戏不访问网络，无安全风险
- **无数据收集**：不收集、存储或传输任何用户数据
- **文件系统访问**：仅访问游戏本身的代码文件，不读写其他文件
- **依赖安全**：使用的pygame库是成熟、广泛使用的开源库
- **代码透明**：代码完全开源，可审计

**安全检查点：**
- [ ] 确认代码中无网络请求相关代码
- [ ] 确认无文件读写操作（除导入模块）
- [ ] 确认pygame版本为最新稳定版本

### 可用性要求

- **易于安装**：
  - 安装步骤清晰，不超过3个命令
  - README提供详细的前置条件说明
  - 常见问题有解决方案
  
- **易于使用**：
  - 游戏操作直观，无需阅读说明即可上手
  - 使用标准的方向键控制，符合用户习惯
  - 游戏结束后有明确的提示信息
  
- **易于学习**：
  - 代码结构清晰，主要功能划分明确
  - 关键逻辑有适当注释
  - 变量和函数命名有意义
  - 代码行数控制在300行以内
  
- **错误提示友好**：
  - 如果依赖未安装，给出清晰的错误信息和解决方案
  - 如果Python版本不符，给出版本要求提示

### 兼容性要求

- **Python版本**：
  - 支持Python 3.9+（必需，3.8已于2024年10月终止支持）
  - 推荐使用Python 3.11或3.12（性能更好）
  
- **操作系统**：
  - ✅ Windows 10/11
  - ✅ macOS 11+（Big Sur及更高版本）
  - ✅ Linux（主流发行版：Ubuntu 20.04+, Fedora 35+等）
  
- **包管理工具**：
  - 必需：uv（项目使用的包管理工具）
  - 兼容：pip（用户也可以使用pip安装依赖）
  
- **依赖库**：
  - pygame >= 2.5.0（2023年7月发布，支持Python 3.11+）
  
- **硬件要求**：
  - CPU：任何现代处理器（2010年后）
  - 内存：最低512MB可用内存
  - 显示：最低分辨率800x600
  - 输入：标准键盘

**兼容性验证：**
- [ ] 在Windows上测试运行
- [ ] 在macOS上测试运行
- [ ] 在Linux上测试运行
- [ ] 测试Python 3.9、3.10、3.11、3.12版本

### 可维护性要求

- **代码质量**：
  - 代码简洁，避免过度设计
  - 函数单一职责，每个函数只做一件事
  - 避免使用全局变量（除常量）
  - 代码格式统一，建议使用black格式化
  
- **文档完整性**：
  - README包含所有必要信息
  - 关键函数有docstring
  - 复杂逻辑有注释说明
  
- **易于扩展**：
  - 颜色、尺寸等参数定义为常量，易于修改
  - 游戏逻辑模块化，便于添加新功能
  - 如果未来要添加更多游戏，结构设计应便于复用

## 技术方案（概要）

### 架构设计

本项目采用简单的单文件架构，适合小型游戏和学习用途：

```
game/
├── pyproject.toml          # uv项目配置文件（依赖、元数据）
├── .python-version         # Python版本指定（3.9）
├── README.md               # 项目说明文档
├── snake.py                # 主游戏文件（约200-300行）
└── uv.lock                 # uv依赖锁定文件（自动生成）
```

**设计原则：**
- **简单优先**：单文件实现，避免过度设计
- **易于理解**：线性流程，清晰的代码结构
- **便于学习**：代码量适中，注释恰当

**代码组织：**

```
snake.py 文件结构：
├── 导入模块（pygame, random等）
├── 常量定义（颜色、尺寸、方向等）
├── 辅助函数
│   ├── generate_food()      # 生成食物
│   ├── check_food_collision() # 检测吃食物
│   ├── check_wall_collision() # 检测撞墙
│   ├── check_self_collision() # 检测撞到自己
│   ├── is_game_over()       # 判断游戏结束
│   ├── handle_input()       # 处理键盘输入
│   ├── move_snake()         # 移动蛇
│   └── draw_game()          # 绘制游戏画面
├── main()                   # 主函数（游戏主循环）
└── if __name__ == '__main__' # 程序入口
```

### 关键技术选型

#### Python 3.9+

**选择理由：**
- Python 3.9在2020年10月发布，已非常成熟稳定
- Python 3.8已于2024年10月终止支持，不建议使用
- Python 3.9+支持改进的字典合并操作符（|）和类型提示
- 向后兼容性好，支持Python 3.10、3.11、3.12

**技术特性：**
- 标准库功能完善，无需额外依赖
- random模块用于生成随机食物位置
- 简洁的语法，易于学习

#### uv包管理工具

**选择理由：**
- uv是用Rust编写的现代Python包管理工具
- 安装速度比pip快10-100倍
- 自动管理虚拟环境
- 使用pyproject.toml标准配置
- 命令简单易用

**核心命令：**
```bash
uv init          # 初始化项目
uv add pygame    # 添加依赖
uv sync          # 安装依赖
uv run python snake.py  # 运行程序
```

#### pygame游戏库

**选择理由：**
- pygame是Python游戏开发的事实标准库
- 社区活跃，文档丰富，学习资源多
- 跨平台支持良好（Windows/macOS/Linux）
- API简单易懂，适合初学者
- 2D游戏开发功能完善

**核心功能使用：**
- `pygame.init()`: 初始化
- `pygame.display`: 窗口管理
- `pygame.draw`: 绘图功能
- `pygame.event`: 事件处理
- `pygame.time.Clock`: 帧率控制
- `pygame.font`: 字体渲染

**版本要求：** pygame >= 2.5.0
- 2.5.0于2023年7月发布
- 完整支持Python 3.11和3.12
- 修复了多个已知bug
- 改进了跨平台兼容性

### 数据结构设计

#### 蛇的表示

```python
# 蛇身使用列表存储位置坐标
# 第一个元素是蛇头，最后一个元素是蛇尾
snake_positions = [
    (15, 15),  # 蛇头
    (14, 15),  # 身体
    (13, 15),  # 蛇尾
]
```

**特点：**
- 使用元组(x, y)表示位置
- 列表有序，便于绘制和移动
- 蛇头始终在索引0位置

#### 方向的表示

```python
# 方向使用元组表示偏移量
DIR_UP = (0, -1)     # y减1，向上
DIR_DOWN = (0, 1)    # y加1，向下
DIR_LEFT = (-1, 0)   # x减1，向左
DIR_RIGHT = (1, 0)   # x加1，向右
```

**特点：**
- 直接表示坐标变化
- 便于计算新位置
- 易于判断反向（如UP和DOWN的y值相反）

#### 食物的表示

```python
# 食物使用单个元组表示位置
food_pos = (20, 10)
```

**特点：**
- 简单的坐标表示
- 每次只有一个食物

#### 游戏状态

```python
# 使用简单的变量存储游戏状态
score = 0          # 整数，当前分数
game_over = False  # 布尔值，游戏是否结束
```

### 核心算法

#### 移动算法

```python
def move_snake(snake_positions, direction, ate_food):
    """
    移动蛇的算法：
    1. 计算新蛇头位置：当前蛇头 + 方向偏移
    2. 将新蛇头插入到列表开头
    3. 如果没吃食物，删除蛇尾（保持长度）
    4. 如果吃了食物，保留蛇尾（增长）
    """
    head_x, head_y = snake_positions[0]
    new_head = (head_x + direction[0], head_y + direction[1])
    
    new_snake = [new_head] + snake_positions
    if not ate_food:
        new_snake = new_snake[:-1]
    
    return new_snake
```

**时间复杂度：** O(n)，n为蛇的长度
**空间复杂度：** O(n)

#### 食物生成算法

```python
def generate_food(snake_positions):
    """
    生成食物算法：
    1. 随机生成一个位置
    2. 检查是否在蛇身上
    3. 如果在，重新生成
    4. 返回有效位置
    """
    while True:
        food_x = random.randint(0, GRID_WIDTH - 1)
        food_y = random.randint(0, GRID_HEIGHT - 1)
        food_pos = (food_x, food_y)
        
        if food_pos not in snake_positions:
            return food_pos
```

**时间复杂度：** 平均O(1)，最坏O(∞)（但实际不会发生）
**空间复杂度：** O(1)

#### 碰撞检测算法

```python
def is_game_over(snake_positions):
    """
    碰撞检测算法：
    1. 检查蛇头是否超出边界
    2. 检查蛇头是否在蛇身上
    3. 任一条件满足则游戏结束
    """
    head = snake_positions[0]
    
    # 检查边界
    if (head[0] < 0 or head[0] >= GRID_WIDTH or
        head[1] < 0 or head[1] >= GRID_HEIGHT):
        return True
    
    # 检查自身
    if head in snake_positions[1:]:
        return True
    
    return False
```

**时间复杂度：** O(n)，n为蛇的长度
**空间复杂度：** O(1)

### 游戏循环流程

```
游戏启动
    ↓
初始化pygame和游戏状态
    ↓
┌─────────────────────────────┐
│      游戏主循环（10 FPS）    │
├─────────────────────────────┤
│ 1. 处理事件                 │
│    - 窗口关闭事件           │
│    - 键盘输入（方向键、ESC）│
│                             │
│ 2. 更新游戏逻辑（如未结束） │
│    - 移动蛇                 │
│    - 检测吃食物             │
│    - 更新分数               │
│    - 生成新食物             │
│    - 检测碰撞               │
│                             │
│ 3. 绘制游戏画面             │
│    - 清空屏幕               │
│    - 绘制食物和蛇           │
│    - 显示分数/结束画面      │
│                             │
│ 4. 控制帧率（10 FPS）       │
└─────────────────────────────┘
    ↓
退出循环（用户关闭窗口）
    ↓
清理资源，退出pygame
    ↓
程序结束
```

### 项目配置文件

#### pyproject.toml

```toml
[project]
name = "snake-game"
version = "1.0.0"
description = "一个简单的贪吃蛇游戏，用于学习Python游戏开发和uv工具"
readme = "README.md"
requires-python = ">=3.9"
dependencies = [
    "pygame>=2.5.0",
]

[project.optional-dependencies]
dev = []

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"
```

#### .python-version

```
3.9
```

### README.md结构

```markdown
# 贪吃蛇游戏

简单的Python贪吃蛇游戏，使用pygame库开发。

## 前置条件

- Python 3.9或更高版本
- uv包管理工具

## 安装步骤

1. 进入game目录
2. 使用uv安装依赖：`uv sync`

## 运行游戏

```bash
uv run python snake.py
```

## 游戏玩法

- 使用方向键（↑↓←→）控制蛇的方向
- 吃到红色食物后蛇会变长，分数增加
- 撞到墙壁或自己的身体游戏结束
- 按ESC键退出游戏

## 技术栈

- Python 3.9+
- pygame 2.5.0+
- uv包管理工具

## 学习资源

[添加相关学习资源链接]
```

## 验收标准

### 功能验收

- [ ] **项目结构**：game目录存在，包含所有必需文件
- [ ] **配置文件**：pyproject.toml配置正确，包含项目元数据和依赖
- [ ] **依赖安装**：执行`uv sync`能成功安装pygame
- [ ] **游戏启动**：执行`uv run python snake.py`能正常启动游戏窗口
- [ ] **方向控制**：方向键能控制蛇的移动方向
- [ ] **反向限制**：不能直接反向移动（如向右时按左键无效）
- [ ] **食物生成**：食物在随机位置显示，不在蛇身上
- [ ] **吃食物**：蛇吃到食物后身体增长一节
- [ ] **分数统计**：吃食物后分数增加10分，屏幕显示当前分数
- [ ] **撞墙检测**：蛇头超出边界时游戏结束
- [ ] **撞自己检测**：蛇头碰到蛇身时游戏结束
- [ ] **游戏结束画面**：显示"Game Over"和最终分数
- [ ] **退出游戏**：按ESC键或关闭窗口能正常退出
- [ ] **文档完整**：README包含安装、运行、玩法说明

### 性能验收

- [ ] **运行流畅**：游戏运行无明显卡顿，帧率稳定
- [ ] **响应及时**：键盘操作响应迅速，无延迟感
- [ ] **资源占用**：内存占用 < 100MB，CPU占用 < 5%（单核）
- [ ] **启动速度**：从运行命令到窗口显示 < 2秒

### 代码质量验收

- [ ] **代码行数**：snake.py文件总行数 ≤ 300行
- [ ] **代码结构**：函数划分合理，职责清晰
- [ ] **命名规范**：变量和函数名称有意义，遵循Python命名规范
- [ ] **注释适当**：关键逻辑有注释说明，不过度注释
- [ ] **无硬编码**：颜色、尺寸等参数定义为常量

### 兼容性验收

- [ ] **Python版本**：在Python 3.9、3.10、3.11上测试通过
- [ ] **操作系统**：在Windows、macOS、Linux上测试通过
- [ ] **依赖版本**：pygame 2.5.0+正常工作

### 用户体验验收

- [ ] **易于安装**：按照README能在5分钟内完成安装
- [ ] **操作直观**：无需阅读文档即可开始游戏
- [ ] **视觉清晰**：蛇、食物、分数显示清晰易辨
- [ ] **易于学习**：代码易读，适合作为学习材料

## 约束与限制

### 技术约束

- **必须使用uv**：项目必须使用uv作为包管理工具，不使用传统的requirements.txt
- **单文件实现**：游戏逻辑必须在单个snake.py文件中实现
- **Python版本**：必须支持Python 3.9+（不支持3.8及更早版本）
- **依赖最小化**：只能依赖pygame，不添加其他第三方库
- **代码行数**：snake.py文件总行数不超过300行（包括注释和空行）
- **游戏库选择**：必须使用pygame，不使用其他游戏库（如pyglet、arcade等）

### 时间约束

- **开发时间**：预计1-2天完成开发和测试
- **不设截止日期**：作为学习项目，质量优先于速度

### 资源约束

- **单人开发**：此项目适合单人完成
- **无预算限制**：所有工具和库都是免费开源的
- **无特殊环境**：普通开发环境即可，无需特殊硬件或软件

### 范围约束

- **不添加复杂功能**：严格控制功能范围，保持简单
- **不过度优化**：代码清晰优先，不追求极致性能
- **不考虑移动平台**：只支持桌面操作系统，不支持iOS/Android

## 风险与回滚

### 潜在风险

| 风险 | 影响程度 | 发生概率 | 缓解措施 |
|------|---------|---------|---------|
| uv工具不熟悉导致配置错误 | 中 | 中 | 参考uv官方文档，提供详细的配置示例和说明 |
| pygame在某些系统上安装失败 | 中 | 低 | 在README中提供常见安装问题解决方案，测试多个平台 |
| 游戏逻辑bug（如碰撞检测不准确） | 低 | 中 | 充分测试各种边界情况，使用网格坐标简化逻辑 |
| 代码复杂度超出预期 | 中 | 低 | 严格控制功能范围，定期检查代码行数 |
| 跨平台兼容性问题 | 低 | 低 | pygame本身跨平台，避免使用平台特定API |
| Python版本兼容性问题 | 低 | 低 | 使用Python 3.9+通用特性，避免使用太新的语法 |
| 性能问题（游戏卡顿） | 低 | 极低 | 游戏逻辑简单，现代电脑性能足够 |

### 回滚方案

由于这是一个新增功能，不涉及修改现有代码，回滚方案非常简单：

**回滚步骤：**
1. 删除game目录
2. 恢复仓库到添加game目录之前的状态

**回滚条件：**
- 发现严重的技术问题无法在合理时间内解决
- 需求变更，决定不实现此功能
- 发现更好的替代方案

**回滚验证：**
- [ ] game目录已删除
- [ ] 仓库恢复到之前的干净状态
- [ ] 其他部分未受影响

**注意事项：**
- 此项目是独立的新增功能，回滚不会影响其他部分
- 如果已有用户基于此项目学习，需要考虑向后兼容性
- 建议在删除前做好备份或归档

## 非目标

以下内容明确不在本需求的目标范围内，避免产生误解或范围蔓延：

### 功能方面
- ❌ **不实现高级游戏功能**：不添加暂停、重新开始、难度选择、关卡系统等功能
- ❌ **不实现数据持久化**：不保存游戏进度、历史最高分、统计数据等
- ❌ **不实现多人游戏**：只支持单人游戏，不实现双人对战或合作模式
- ❌ **不实现AI功能**：不添加AI自动游玩或AI对手
- ❌ **不实现音效音乐**：游戏保持静音，不添加任何声音效果

### 技术方面
- ❌ **不使用复杂架构**：不采用MVC、ECS等架构模式，保持简单
- ❌ **不编写单元测试**：作为学习项目，不要求完整的测试覆盖
- ❌ **不使用配置文件**：不使用JSON/YAML等配置文件，使用代码常量
- ❌ **不实现插件系统**：不设计可扩展的插件架构
- ❌ **不优化到极致**：不追求极致的性能优化或代码压缩

### 分发方面
- ❌ **不打包成可执行文件**：不使用PyInstaller等工具打包
- ❌ **不发布到PyPI**：不将项目发布为Python包
- ❌ **不创建安装程序**：不制作Windows安装器或macOS dmg
- ❌ **不支持移动平台**：不适配iOS、Android等移动平台

### 文档方面
- ❌ **不编写详细API文档**：代码简单，不需要详细的API文档
- ❌ **不制作视频教程**：只提供文本README，不制作视频
- ❌ **不翻译多语言**：文档和代码注释只使用中文，不翻译其他语言

### 其他方面
- ❌ **不修复Python或pygame的bug**：只使用这些工具，不修改它们
- ❌ **不解决所有平台问题**：只保证主流平台，不处理冷门系统
- ❌ **不提供商业支持**：这是开源学习项目，不提供付费技术支持

## 依赖关系

### 依赖的其他需求/系统

此项目作为一个独立的新增功能，依赖关系较少：

**外部依赖：**
- **Python环境**：需要Python 3.9+已安装在系统上
- **uv工具**：需要用户预先安装uv包管理工具
- **pygame库**：通过uv自动安装，版本 >= 2.5.0
- **操作系统图形环境**：需要操作系统支持图形界面（非命令行环境）

**项目内部依赖：**
- 无（此项目不依赖仓库中的其他代码）

### 被依赖的需求/系统

目前没有其他功能依赖于此项目，但未来可能的依赖关系：

**潜在被依赖项：**
- **未来的游戏项目**：如果在game目录下添加更多游戏，可能会参考本项目的结构和配置
- **学习文档**：如果创建Python游戏开发教程，可能会引用本项目作为示例
- **项目模板**：本项目可能成为创建其他简单游戏的模板

**依赖风险：**
- 低风险：作为独立项目，即使失败也不影响其他部分
- 如果本项目成功，future项目可能复用其结构

## 参考资料

### 官方文档

- **uv官方文档**：https://github.com/astral-sh/uv
  - 安装指南：https://docs.astral.sh/uv/getting-started/installation/
  - 快速开始：https://docs.astral.sh/uv/getting-started/
  - 项目配置：https://docs.astral.sh/uv/concepts/projects/
  
- **pygame官方文档**：https://www.pygame.org/docs/
  - 新手教程：https://www.pygame.org/wiki/tutorials
  - API参考：https://www.pygame.org/docs/ref/
  
- **Python官方文档**：https://docs.python.org/3/
  - random模块：https://docs.python.org/3/library/random.html

### 技术教程

- **贪吃蛇游戏算法**：
  - Wikipedia：https://en.wikipedia.org/wiki/Snake_(video_game_genre)
  - 游戏逻辑讲解：多个在线教程
  
- **pygame教程**：
  - Real Python pygame教程：https://realpython.com/pygame-a-primer/
  - pygame中文教程：多个在线资源

### 相关项目示例

- **经典贪吃蛇实现**：GitHub上的各种开源实现可供参考
- **其他Python小游戏**：pygame官方示例

### 本项目相关

- **当前Issue**：#13
- **需求文档**：docs/requirements/issue-13.md
- **关联PR**：（待创建）

### 工具安装

- **Python安装**：https://www.python.org/downloads/
- **uv安装**：
  - macOS/Linux: `curl -LsSf https://astral.sh/uv/install.sh | sh`
  - Windows: `powershell -c "irm https://astral.sh/uv/install.ps1 | iex"`
  - pip安装: `pip install uv`

---

## 审批说明

**请审查以下内容：**

1. ✅ **技术方案是否可行**：uv + pygame组合是否合适，技术选型是否合理
2. ✅ **功能范围是否明确**：包含和不包含的功能是否清晰
3. ✅ **技术规格是否详细**：代码结构、数据结构、核心算法是否说明充分
4. ✅ **验收标准是否可测**：是否有明确的标准判断需求是否完成
5. ✅ **风险评估是否充分**：是否识别了主要风险并有缓解措施
6. ✅ **非目标是否清晰**：是否明确了不做什么，避免范围蔓延

**审批操作：**

- **通过**：合并此PR，系统将自动生成Plan（执行计划）
- **修改**：在PR中提出修改意见，Copilot会根据反馈调整
- **拒绝**：关闭PR并在原Issue中说明原因

---

**文档版本历史**

| 版本 | 日期 | 修改说明 | 修改人 |
|------|------|---------|--------|
| 1.0  | 2026-02-06 | 初始版本，创建详细的技术规格说明 | Copilot |

---

**注意**: 本规格说明书基于已审批的需求文档（docs/requirements/issue-13.md）编写，提供了详细的技术实现方案和规格。审批通过后将进入Plan → Implementation阶段。
