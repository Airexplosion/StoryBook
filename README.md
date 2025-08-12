# 卡牌对战游戏

一个支持双人对战和多人观战的在线卡牌游戏，类似炉石传说的游戏机制。

## 功能特性

### 核心功能
- ✅ 用户注册和登录系统
- ✅ 房间创建和管理
- ✅ 卡牌集管理（录入、查看、编辑）
- ✅ 卡组构建系统
- ✅ 实时对战功能
- ✅ 观战系统
- ✅ 管理员权限

### 卡牌系统
支持三种类型的卡牌：

1. **故事牌**
   - 事件：主动使用，消耗费用
   - 背景：加入手牌时自动使用

2. **配角牌**
   - 拥有攻击力和生命值
   - 可以攻击敌方单位
   - 进入故事后才能攻击

3. **主角牌**
   - 为主角提供持续性效果
   - 卡组中限制1张

### 卡组构建
- 每个卡组40张卡牌
- 选择主角卡决定专属卡池
- 同名卡牌限制：配角牌和故事牌最多3张，主角牌1张
- 支持公开/私有卡组

### 对战功能
- 实时双人对战
- 支持多人观战
- 完整的游戏状态管理
- 回合制系统
- 章节进度和费用系统

## 技术架构

### 后端
- **Node.js + Express** - 服务器框架
- **MongoDB + Mongoose** - 数据库
- **Socket.io** - 实时通信
- **JWT** - 用户认证
- **bcryptjs** - 密码加密

### 前端
- **React 18 + TypeScript** - 前端框架
- **Redux Toolkit** - 状态管理
- **React Router** - 路由管理
- **Tailwind CSS** - 样式框架
- **Socket.io Client** - 实时通信

## 安装和运行

### 环境要求
- Node.js 16+
- MongoDB 4.4+
- npm 或 yarn

### 安装步骤

1. 克隆项目
```bash
git clone <repository-url>
cd gushishu
```

2. 安装依赖
```bash
npm run install-deps
```

3. 配置环境变量
在 `server/.env` 文件中配置：
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/cardgame
JWT_SECRET=your_super_secret_jwt_key_here
```

4. 启动MongoDB服务

5. 运行项目
```bash
npm run dev
```

这将同时启动前端（http://localhost:3000）和后端（http://localhost:5000）服务。

### 单独运行

#### 后端
```bash
cd server
npm run dev
```

#### 前端
```bash
cd client
npm start
```

## 游戏规则

### 基本流程
1. **准备阶段**：选择主角和卡组
2. **调度阶段**：选择起手牌
3. **对战阶段**：回合制进行游戏

### 资源系统
- **生命值**：初始25点
- **费用**：每回合+1上限，回合开始回复全部
- **章节进度**：每回合+1，达到3清零并获得1个章节指示物

### 胜负条件
- 对手生命值降至0或以下
- 对手无法继续游戏
- 双方同意的其他条件

## API接口

### 认证相关
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录

### 卡牌相关
- `GET /api/cards` - 获取卡牌列表
- `POST /api/cards` - 创建卡牌
- `PUT /api/cards/:id` - 更新卡牌
- `DELETE /api/cards/:id` - 删除卡牌

### 卡组相关
- `GET /api/decks` - 获取卡组列表
- `POST /api/decks` - 创建卡组
- `PUT /api/decks/:id` - 更新卡组
- `DELETE /api/decks/:id` - 删除卡组

### 房间相关
- `GET /api/rooms` - 获取房间列表
- `POST /api/rooms` - 创建房间
- `POST /api/rooms/:id/join` - 加入房间
- `POST /api/rooms/:id/leave` - 离开房间
- `DELETE /api/rooms/:id` - 删除房间

## Socket.io 事件

### 客户端发送
- `join-room` - 加入房间
- `leave-room` - 离开房间
- `game-action` - 游戏操作

### 服务端发送
- `user-joined` - 用户加入
- `user-left` - 用户离开
- `game-update` - 游戏状态更新

## 项目结构

```
gushishu/
├── client/                 # React前端
│   ├── public/            # 静态文件
│   ├── src/
│   │   ├── components/    # React组件
│   │   ├── store/         # Redux状态管理
│   │   ├── services/      # API和Socket服务
│   │   ├── types/         # TypeScript类型定义
│   │   └── ...
│   └── package.json
├── server/                # Node.js后端
│   ├── models/           # MongoDB数据模型
│   ├── routes/           # API路由
│   ├── middleware/       # 中间件
│   ├── server.js         # 服务器入口
│   └── package.json
├── package.json          # 根包配置
└── README.md
```

## 开发计划

- [x] 基础架构搭建
- [x] 用户认证系统
- [x] 卡牌管理系统
- [x] 卡组构建系统
- [x] 房间管理系统
- [x] 基础对战功能
- [ ] 完善游戏逻辑
- [ ] 性能优化
- [ ] 移动端适配
- [ ] 游戏音效和动画

## 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 联系方式

如有问题或建议，请通过以下方式联系：
- 创建 Issue
- 发送 Pull Request
- 联系项目维护者