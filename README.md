# 故事书对战 - 卡牌对战游戏

一个支持双人对战和多人观战的在线卡牌游戏，具有完整的卡牌管理系统、动态配置功能和批量导入工具。

## 🎮 功能特性

### 核心功能
- ✅ 用户注册和登录系统
- ✅ 房间创建和管理
- ✅ 卡牌集管理（录入、查看、编辑）
- ✅ 卡组构建系统
- ✅ 实时对战功能
- ✅ 观战系统
- ✅ 管理员权限
- ✅ 批量导入系统
- ✅ 动态配置管理

### 🃏 卡牌系统
支持多种类型的卡牌，可自定义编辑，预设为三种：

1. **故事牌 (Story Cards)**
   - **事件 (Event)**: 需要支付费用主动使用
   - **背景 (Background)**: 加入手中时自动使用

2. **配角牌 (Character Cards)**
   - **配角 (Character)**: 进入故事后才会成为实体单位
   - 拥有攻击力和生命值
   - 可以攻击敌方单位

3. **主角牌 (Hero Cards)**
   - **主角 (Hero)**: 为主角提供持续性效果
   - 卡组中限制1张

### 🏗️ 卡组构建
- 每个卡组40张卡牌
- 选择主角卡决定专属卡池
- 同名卡牌限制：配角牌和故事牌最多3张，主角牌1张
- 支持公开/私有卡组

### ⚔️ 对战功能
- 实时双人对战
- 支持多人观战
- 完整的游戏状态管理
- 回合制系统
- 章节进度和费用系统

### 🔧 管理功能
- **动态配置管理**: 支持动态添加/删除卡牌类型、主战者、类别
- **批量导入**: 支持CSV格式批量导入卡牌和主战者配置
- **中文化界面**: 完全中文化的用户界面和CSV模板
- **实时同步**: 配置更改实时反映到所有相关界面

## 🎨 UI设计系统 *(全新 - 2025-01-22)*

### 设计理念
- **暗色主题**: 统一的 `#111111` 深色背景，提供舒适的视觉体验
- **金色点缀**: 使用 `#C2B79C` 作为主要强调色，营造优雅的视觉层次
- **现代排版**: 集成专业中文字体，提升阅读体验

### 字体系统
- **HYAoDeSaiJ**: 用于标题和品牌文字，具有独特的设计感
- **QingNiaoHuaGuangYaoTi**: 用于界面文字，支持多种字重（thin, semi-bold）
- **系统字体**: 作为后备字体确保兼容性

### 颜色规范
```css
/* 主要颜色 */
--bg-primary: #111111;      /* 主背景色 */
--text-primary: #FBFBFB;    /* 主文字色 */
--text-secondary: #AEAEAE;  /* 次要文字色 */
--accent-gold: #C2B79C;     /* 金色强调 */
--accent-blue: #4F6A8D;     /* 蓝色强调 */
--accent-green: #679C7A;    /* 绿色状态 */
--accent-brown: #918273;    /* 棕色辅助 */
--danger: #F07272;          /* 危险/删除 */
```

### 组件特色
- **动态按钮**: 复杂的hover动画，背景从左到右填充
- **SVG图标**: 完整的矢量图标系统，支持颜色动态切换
- **模态框**: 自定义设计的弹窗组件，支持背景模糊
- **房间卡片**: 精心设计的信息展示卡片，支持状态指示

## 🛠️ 技术架构

### 后端技术栈
- **Node.js + Express** - 服务器框架
- **SQLite + Sequelize** - 数据库和ORM
- **Socket.io** - 实时通信
- **JWT** - 用户认证
- **bcryptjs** - 密码加密
- **multer** - 文件上传处理
- **csv-parser** - CSV文件解析

### 前端技术栈
- **React 18 + TypeScript** - 前端框架
- **Redux Toolkit** - 状态管理
- **React Router** - 路由管理
- **Tailwind CSS** - 样式框架
- **Socket.io Client** - 实时通信
- **自定义字体系统** - HYAoDeSaiJ & QingNiaoHuaGuangYaoTi
- **SVG图标库** - 完整的矢量图标系统

### 数据库设计
- **Users** - 用户信息
- **Cards** - 卡牌数据
- **Decks** - 卡组信息
- **Rooms** - 房间管理
- **Config** - 动态配置存储

## 🚀 安装和运行

### 环境要求
- Node.js 16+
- npm 或 yarn

### 快速开始

1. **克隆项目**
```bash
git clone https://github.com/Airexplosion/StoryBook.git
cd gushishu
```

2. **安装依赖**
```bash
# 安装根目录依赖
npm install

# 安装前端依赖
cd client && npm install

# 安装后端依赖
cd ../server && npm install
```

3. **配置环境变量**
在 `server/.env` 文件中配置：
```env
PORT=5000
JWT_SECRET=your_super_secret_jwt_key_here
NODE_ENV=development
```

4. **初始化数据库**
```bash
cd server
npm run init-db
```

5. **启动项目**
```bash
# 从根目录启动（推荐）
npm run dev

# 或者分别启动
# 后端
cd server && npm run dev

# 前端
cd client && npm start
```

访问 http://localhost:3000 开始使用

## 🎯 游戏规则

### 基本流程
1. **准备阶段**: 选择主角和卡组
2. **调度阶段**: 选择起手牌
3. **对战阶段**: 回合制进行游戏

### 资源系统
- **生命值**: 初始25点
- **费用**: 每回合+1上限，回合开始回复全部
- **章节进度**: 每回合+1，达到3清零并获得1个章节指示物

### 胜负条件
- 对手生命值降至0或以下
- 对手无法继续游戏

## 📊 批量导入功能

### 卡牌批量导入
支持CSV格式批量导入卡牌，模板包含以下字段：
- **必填字段**: 卡牌名称、类型、类别、费用、效果
- **可选字段**: 攻击力、生命值、风味文本、图片、主战者、是否公开

### 主战者批量导入
支持CSV格式批量导入主战者配置：
- **必填字段**: 主战者名称
- **可选字段**: 描述

### 使用方法
1. 进入对应的批量导入页面
2. 下载CSV模板
3. 填写数据（支持Excel编辑）
4. 上传CSV文件进行导入

## 🔧 管理员功能

### 动态配置管理
- **卡牌类型管理**: 添加/删除卡牌类型（故事牌、配角牌、主角牌等）
- **主战者管理**: 管理可选的主战者配置
- **类别管理**: 为不同类型的卡牌管理子类别

### 权限控制
- 只有管理员可以访问配置管理功能
- 支持批量导入主战者配置
- 实时配置更新和同步

## 📡 API接口

### 认证相关
```
POST /api/auth/register     # 用户注册
POST /api/auth/login        # 用户登录
GET  /api/auth/me          # 获取当前用户信息
```

### 卡牌相关
```
GET    /api/cards                    # 获取卡牌列表
POST   /api/cards                    # 创建卡牌
PUT    /api/cards/:id               # 更新卡牌
DELETE /api/cards/:id               # 删除卡牌
POST   /api/cards/batch-import      # 批量导入卡牌
GET    /api/cards/import-template   # 下载导入模板
```

### 卡组相关
```
GET    /api/decks          # 获取卡组列表
POST   /api/decks          # 创建卡组
PUT    /api/decks/:id      # 更新卡组
DELETE /api/decks/:id      # 删除卡组
```

### 配置相关
```
GET /api/options/card-options    # 获取卡牌选项配置
GET /api/config                  # 获取系统配置
PUT /api/config/factions        # 更新主战者配置
PUT /api/config/types           # 更新类型配置
PUT /api/config/categories      # 更新类别配置
```

### 批量导入相关
```
POST /api/batch-import/heroes        # 批量导入主战者
GET  /api/batch-import/hero-template # 下载主战者模板
```

## 🌐 Socket.io 事件

### 客户端发送
```javascript
'join-room'     // 加入房间
'leave-room'    // 离开房间
'game-action'   // 游戏操作
'ready'         // 准备状态
```

### 服务端发送
```javascript
'user-joined'   // 用户加入
'user-left'     // 用户离开
'game-update'   // 游戏状态更新
'room-update'   // 房间状态更新
```

## 📁 项目结构

```
gushishu/
├── client/                     # React前端应用
│   ├── public/                # 静态资源
│   ├── src/
│   │   ├── components/        # React组件
│   │   │   ├── Auth/         # 认证相关组件
│   │   │   ├── Cards/        # 卡牌相关组件
│   │   │   ├── Decks/        # 卡组相关组件
│   │   │   ├── Game/         # 游戏相关组件
│   │   │   ├── Layout/       # 布局组件
│   │   │   └── ...
│   │   ├── store/            # Redux状态管理
│   │   ├── services/         # API和Socket服务
│   │   ├── types/            # TypeScript类型定义
│   │   └── utils/            # 工具函数
│   └── package.json
├── server/                     # Node.js后端应用
│   ├── models/                # Sequelize数据模型
│   │   ├── Card.js           # 卡牌模型
│   │   ├── User.js           # 用户模型
│   │   ├── Deck.js           # 卡组模型
│   │   ├── Config.js         # 配置模型
│   │   └── index.js          # 模型入口
│   ├── routes/               # API路由
│   │   ├── auth.js           # 认证路由
│   │   ├── cards.js          # 卡牌路由
│   │   ├── decks.js          # 卡组路由
│   │   ├── options.js        # 选项配置路由
│   │   ├── config.js         # 系统配置路由
│   │   └── batchImport.js    # 批量导入路由
│   ├── middleware/           # 中间件
│   │   └── auth.js           # 认证中间件
│   ├── config/               # 配置文件
│   │   └── database.js       # 数据库配置
│   ├── uploads/              # 文件上传目录
│   ├── server.js             # 服务器入口
│   └── package.json
├── package.json               # 根包配置
└── README.md                 # 项目说明
```

## 🔄 开发状态

### 已完成功能
- [x] 基础架构搭建
- [x] 用户认证系统
- [x] 卡牌管理系统
- [x] 卡组构建系统
- [x] 房间管理系统
- [x] 基础对战功能
- [x] 批量导入功能
- [x] 动态配置管理
- [x] 中文化界面
- [x] CSV模板优化
- [x] **全新UI设计系统** *(2025-01-22)*
  - 自定义字体集成 (HYAoDeSaiJ, QingNiaoHuaGuangYaoTi)
  - SVG图标系统和logo集成
  - 统一的暗色主题 (#111111背景)
  - 复杂动画效果 (按钮hover动画)
  - 响应式布局优化

### 开发计划
- [ ] 性能优化和缓存
- [ ] 移动端适配

### 开发规范
- 使用 TypeScript 进行类型检查
- 遵循 ESLint 代码规范
- 编写单元测试
- 更新相关文档

## 🐛 问题反馈

如遇到问题或有改进建议，请通过以下方式反馈：
- 创建 GitHub Issue
- 发送 Pull Request
- 联系项目维护者

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

感谢所有为这个项目做出贡献的开发者和用户。
- 神奇残光
- 超级水槽
---
