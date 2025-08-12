const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const { sequelize, testConnection } = require('./config/database');
const { User, Card, Deck, Room, Config } = require('./models');

const authRoutes = require('./routes/auth');
const roomRoutes = require('./routes/rooms');
const cardRoutes = require('./routes/cards');
const deckRoutes = require('./routes/decks');
const configRoutes = require('./routes/config');
const batchImportRoutes = require('./routes/batchImport');
const optionsRoutes = require('./routes/options');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:3001", "http://localhost:3015", "http://kaigua.vip:3015", "http://story.kaigua.vip", "https://story.kaigua.vip"],
    methods: ["GET", "POST"]
  }
});

// 中间件
// 允许所有来源的CORS请求，或者更安全地指定来源
app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:3001", "http://localhost:3015", "http://kaigua.vip:3015", "http://story.kaigua.vip", "https://story.kaigua.vip"],
  methods: ["GET", "POST"]
}));
app.use(express.json());

// 存储游戏房间状态
const gameRooms = new Map();

// 设置gameRooms实例供路由使用
app.set('gameRooms', gameRooms);

// 路由
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/cards', cardRoutes);
app.use('/api/decks', deckRoutes);
app.use('/api/config', configRoutes);
app.use('/api/batch-import', batchImportRoutes);
app.use('/api/options', optionsRoutes);

// 测试路由
app.get('/api/test', (req, res) => {
  res.json({ message: '后端API正常运行！', timestamp: new Date().toISOString() });
});

// 持久化保存游戏状态到数据库
const saveGameState = async (roomId, roomState) => {
  try {
    const room = await Room.findByPk(roomId);
    if (!room) return;

    // 保存游戏状态
    room.gameState = roomState.gameState;
    
    // 保存游戏日志
    if (roomState.gameLog && roomState.gameLog.length > 0) {
      room.gameLog = roomState.gameLog;
    }
    
    // 保存每个玩家的状态
    const playerStates = room.playerStates;
    roomState.players.forEach(player => {
      // 移除不需要持久化的临时字段
      const { socketId, isActive, ...persistentPlayerState } = player;
      playerStates[player.userId] = persistentPlayerState;
    });
    
    room.playerStates = playerStates;
    await room.save();
    
    console.log(`游戏状态已保存到数据库 [房间${roomId}]`);
  } catch (error) {
    console.error('保存游戏状态失败:', error);
  }
};

// Socket.io 处理实时通信
io.on('connection', (socket) => {
  console.log('用户连接:', socket.id);

  // 加入房间
  socket.on('join-room', async (data) => {
    try {
      const { roomId, userId, username } = data;
      
      // 验证用户ID和用户名
      if (!userId || !username) {
        socket.emit('error', { message: '用户信息不完整' });
        return;
      }
      
      console.log(`[JOIN-ROOM] 用户尝试加入房间: userId=${userId}, username=${username}, socketId=${socket.id}, roomId=${roomId}`);
      
      socket.join(roomId);
      
      // 获取房间数据
      const room = await Room.findByPk(roomId, {
        include: [{ model: User, as: 'creator' }]
      });
      
      if (!room) {
        socket.emit('error', { message: '房间不存在' });
        return;
      }

      // 初始化内存中的房间状态（如果不存在）
      if (!gameRooms.has(roomId)) {
        // 从数据库恢复玩家状态到内存
        const restoredPlayers = [];
        for (const [playerId, playerData] of Object.entries(room.playerStates)) {
          // 确保恢复的玩家数据包含正确的userId
          const restoredPlayer = {
            ...playerData,
            userId: playerId, // 确保userId正确
            socketId: null, // 将在连接时更新
            isActive: false, // 将在连接时更新
            // 确保空位数量字段存在，如果没有则设置默认值
            battlefieldSlots: playerData.battlefieldSlots || 5,
            effectSlots: playerData.effectSlots || 5,
            // 确保生命值和章节上限字段存在
            maxHealth: playerData.maxHealth || 25,
            maxChapterProgress: playerData.maxChapterProgress || 3,
            // 确保备注字段存在
            notes: playerData.notes || ''
          };
          restoredPlayers.push(restoredPlayer);
          console.log(`[RESTORE] 恢复玩家: userId=${playerId}, username=${restoredPlayer.username}`);
        }

        gameRooms.set(roomId, {
          roomId,
          players: restoredPlayers,
          spectators: [],
          gameState: room.gameState,
          gameLog: room.gameLog || [] // 加载持久化的游戏日志
        });
        
        console.log(`从数据库恢复房间 ${roomId} 的游戏状态，玩家数量: ${restoredPlayers.length}`);
      }
      
      const roomState = gameRooms.get(roomId);
      const positions = room.positions;
      const playerStates = room.playerStates;
      
      // 检查是否是原有玩家重新连接
      const existingPlayer = roomState.players.find(p => p.userId === userId);
      if (existingPlayer) {
        // 更新现有玩家的socket信息
        existingPlayer.socketId = socket.id;
        existingPlayer.isActive = true;
        existingPlayer.temporaryLeave = false;
        console.log(`[RECONNECT] 玩家重新连接: userId=${userId}, username=${existingPlayer.username}, socketId=${socket.id}`);
      }
      
      // 发送房间位置信息给客户端，让玩家选择位置
      const isOriginalPlayer = playerStates[userId] !== undefined;
      socket.emit('room-positions', {
        positions,
        canJoinAsPlayer: room.isLocked ? isOriginalPlayer : Object.values(positions).some(pos => pos === null),
        playerStates: Object.keys(playerStates),
        isLocked: room.isLocked,
        isOriginalPlayer
      });
      
      socket.to(roomId).emit('user-joined', { userId, username, socketId: socket.id });
      console.log(`用户 ${username}(${userId}) 加入房间 ${roomId}, socketId: ${socket.id}`);
      
      // 发送当前房间状态
      socket.emit('game-state-update', roomState);
      
    } catch (error) {
      console.error('加入房间失败:', error);
      socket.emit('error', { message: '加入房间失败' });
    }
  });

  // 选择位置加入游戏
  socket.on('select-position', async (data) => {
    try {
      const { roomId, userId, username, position } = data; // position: 'position1' or 'position2'
      
      const room = await Room.findByPk(roomId);
      if (!room) {
        socket.emit('error', { message: '房间不存在' });
        return;
      }

      const positions = room.positions;
      const playerStates = room.playerStates;
      
      // 检查房间是否已锁定（如果游戏已开始，只允许之前的玩家重新加入）
      if (room.isLocked && !playerStates[userId]) {
        socket.emit('error', { message: '游戏已开始，房间已锁定，只允许原玩家重新加入' });
        return;
      }

      // 检查位置是否可用（对于原玩家，允许占用他们之前的位置）
      if (positions[position] !== null && positions[position].userId !== userId) {
        socket.emit('error', { message: '该位置已被其他玩家占用' });
        return;
      }

      // 占用或更新位置
      positions[position] = { userId, username, isActive: true, socketId: socket.id };
      
      const roomState = gameRooms.get(roomId);
      let player;

      // 检查是否有保存的玩家状态
      if (playerStates[userId]) {
        // 恢复之前的游戏状态
        player = {
          ...playerStates[userId],
          socketId: socket.id,
          isActive: true,
          temporaryLeave: false, // 取消离线状态
          position,
          // 确保空位数量字段存在，如果没有则设置默认值
          battlefieldSlots: playerStates[userId].battlefieldSlots || 5,
          effectSlots: playerStates[userId].effectSlots || 5,
          // 确保生命值和章节上限字段存在
          maxHealth: playerStates[userId].maxHealth || 25,
          maxChapterProgress: playerStates[userId].maxChapterProgress || 3,
          // 确保备注字段存在
          notes: playerStates[userId].notes || ''
        };
        console.log(`恢复玩家 ${username} 的游戏状态`);
      } else {
        // 创建新的玩家状态
        player = {
          userId,
          socketId: socket.id,
          username,
          position,
          heroName: '',
          deckId: null,
          deckName: '',
          health: 25,
          maxHealth: 25,
          mana: 0,
          maxMana: 0,
          handSize: 0,
          deckSize: 0,
          chapterProgress: 0,
          maxChapterProgress: 3,
          chapterTokens: 0,
          isReady: false,
          isActive: true,
          notes: '',
          customFields: [], // 初始化自定义字段
          hand: [],
          graveyard: [],
          battlefield: [],
          effectZone: [],
          deck: [],
          battlefieldSlots: 5,
          effectSlots: 5
        };
      }

      // 更新内存状态
      const existingPlayerIndex = roomState.players.findIndex(p => p.userId === userId);
      if (existingPlayerIndex >= 0) {
        // 更新现有玩家的socket信息，保留所有游戏数据
        roomState.players[existingPlayerIndex] = {
          ...roomState.players[existingPlayerIndex],
          socketId: socket.id,
          isActive: true,
          temporaryLeave: false,
          position
        };
        console.log(`玩家 ${username} 重新连接，恢复游戏状态`);
      } else {
        roomState.players.push(player);
        console.log(`新玩家 ${username} 加入游戏`);
      }

      // 保存到数据库
      room.positions = positions;
      room.playerStates = { ...playerStates, [userId]: player };
      await room.save();

      // 广播更新
      io.to(roomId).emit('game-state-update', roomState);
      
      const isReconnection = existingPlayerIndex >= 0;
      if (isReconnection) {
        io.to(roomId).emit('game-update', {
          action: `${username} 重新连接并占用了位置 (${position})`,
          playerName: username
        });
      } else {
        io.to(roomId).emit('game-update', {
          action: `${username} 加入了游戏 (${position})`,
          playerName: username
        });
      }

      console.log(`玩家 ${username} 选择了位置 ${position}`);
      
    } catch (error) {
      console.error('选择位置失败:', error);
      socket.emit('error', { message: '选择位置失败' });
    }
  });

  // 离开房间
  socket.on('leave-room', async (roomId) => {
    socket.leave(roomId);
    
    const room = await Room.findByPk(roomId);
    const roomState = gameRooms.get(roomId);
    
    if (roomState) {
      const player = roomState.players.find(p => p.socketId === socket.id);
      const spectator = roomState.spectators.find(s => s.socketId === socket.id);
      
      if (player) {
        // 对于玩家，只更新socket状态，保留所有游戏数据
        player.socketId = null;
        player.isActive = false;
        player.temporaryLeave = true;
        player.lastActiveTime = new Date().toISOString();
        
        console.log(`玩家 ${player.username} 离开房间 ${roomId}，但保留游戏数据`);
        
        // 更新数据库中的位置状态
        if (room) {
          const positions = room.positions;
          for (const [pos, posData] of Object.entries(positions)) {
            if (posData && posData.userId === player.userId) {
              positions[pos] = {
                ...posData,
                isActive: false,
                socketId: null
              };
              break;
            }
          }
          room.positions = positions;
          await room.save();
        }
        
        // 发送更新状态，但保持玩家信息在界面显示
        io.to(roomId).emit('game-state-update', roomState);
        io.to(roomId).emit('player-disconnected', {
          username: player.username,
          message: `${player.username} 离线了，但游戏数据已保存`
        });
      }
      
      if (spectator) {
        // 观众可以正常移除
        roomState.spectators = roomState.spectators.filter(s => s.socketId !== socket.id);
        console.log(`观众 ${spectator.username || '匿名'} 离开房间 ${roomId}`);
        io.to(roomId).emit('game-state-update', roomState);
      }
    }
    
    console.log(`用户 ${socket.id} 离开房间 ${roomId}`);
  });

  // 选择卡组
  socket.on('select-deck', async (data) => {
    try {
      const { roomId, userId, deckId, deckName, heroName } = data;
      const roomState = gameRooms.get(roomId);
      
      if (roomState) {
          // 获取完整的卡组信息，包括主战者
          let championCardId = data.championCardId;
          let championDescription = data.championDescription;
        
        try {
          const deck = await Deck.findByPk(deckId, {
            include: [
              {
                model: Card,
                as: 'heroCard'
              }
            ]
          });
          
          if (deck) {
            // 优先使用数据库中的主战者信息
            championCardId = deck.championCardId || data.championCardId;
            championDescription = deck.championDescription || data.championDescription;
          }
          
          console.log('从服务器获取到的主战者信息:', {
            championCardId,
            championDescription,
            fromData: { championCardId: data.championCardId, championDescription: data.championDescription },
            fromDeck: deck ? { championCardId: deck.championCardId, championDescription: deck.championDescription } : null
          });
        } catch (error) {
          console.error('获取卡组主战者信息失败:', error);
        }
        
        // 检查玩家是否已存在
        let player = roomState.players.find(p => p.userId === userId);
        let isNewPlayer = !player;
        
        if (!player && roomState.players.length < 2) {
          // 创建新玩家
          player = {
            userId,
            socketId: socket.id,
            username: data.username || `Player${roomState.players.length + 1}`,
            health: 25,
            maxHealth: 25,
            mana: 0,
            maxMana: 0,
            handSize: 0,
            deckSize: 0,
            chapterProgress: 0,
            maxChapterProgress: 3,
            chapterTokens: 0,
            isReady: false,
            notes: '',
            customFields: [], // 初始化自定义字段
            hand: [],
            graveyard: [],
            battlefield: [],
            effectZone: [],
            deck: [],
            battlefieldSlots: 5, // 默认5个空位
            effectSlots: 5 // 默认5个空位
          };
        }
        
        if (player) {
          // 更新卡组相关信息（无论是新玩家还是已存在的玩家）
          player.heroName = heroName;
          player.deckId = deckId;
          player.deckName = deckName;
          player.championCardId = championCardId; // 设置主战者ID
          player.championDescription = championDescription; // 设置主战者描述
          player.socketId = socket.id;
          player.isActive = true; // 标记为活跃状态
          player.temporaryLeave = false; // 取消离线状态
          
          // 确保空位数量字段存在
          if (player.battlefieldSlots === undefined) {
            player.battlefieldSlots = 5;
          }
          if (player.effectSlots === undefined) {
            player.effectSlots = 5;
          }
          // 确保生命值和章节上限字段存在
          if (player.maxHealth === undefined) {
            player.maxHealth = 25;
          }
          if (player.maxChapterProgress === undefined) {
            player.maxChapterProgress = 3;
          }
          
          // 获取玩家选择的卡组详情
          const selectedPlayerDeck = await Deck.findByPk(deckId, {
            include: [{ model: Card, as: 'heroCard' }]
          });

          if (selectedPlayerDeck) {
            // 从卡组的cards字段（JSON格式）中获取卡牌ID列表
            const deckCardIds = selectedPlayerDeck.cards || [];
            
            // 根据卡牌ID获取完整卡牌信息
            const playerCards = [];
            for (const cardData of deckCardIds) {
              const card = await Card.findByPk(cardData.cardId);
              if (card) {
                // 根据count添加多张相同卡牌
                for (let i = 0; i < cardData.count; i++) {
                  playerCards.push({
                    ...card.toJSON(),
                    ownerId: userId
                  });
                }
              }
            }
            
            // 只有在新玩家或者重新选择卡组时才重置卡牌
            if (isNewPlayer || !player.isDeckLocked) {
              player.deck = playerCards;
              player.originalDeck = [...playerCards]; // 保存原始完整牌库
              player.deckSize = player.deck.length;
              // 随机洗牌
              player.deck.sort(() => Math.random() - 0.5);
              
              // 如果不是游戏进行中，重置其他状态
              if (roomState.gameState.phase === 'waiting') {
                player.hand = [];
                player.handSize = 0;
                player.graveyard = [];
                player.battlefield = [];
                player.effectZone = [];
                player.health = 25;
                player.maxHealth = 25;
                player.mana = 0;
                player.maxMana = 0;
                player.chapterProgress = 0;
                player.maxChapterProgress = 3;
                player.chapterTokens = 0;
                player.isReady = false;
              }
            }
          }

          // 标记卡组已锁定
          player.isDeckLocked = true;

          // 更新内存状态
          if (isNewPlayer) {
            roomState.players.push(player);
            console.log(`新玩家 ${data.username} 选择了卡组`);
          } else {
            const existingPlayerIndex = roomState.players.findIndex(p => p.userId === userId);
            if (existingPlayerIndex >= 0) {
              // 保留现有的游戏数据，只更新卡组相关信息
              roomState.players[existingPlayerIndex] = {
                ...roomState.players[existingPlayerIndex],
                ...player,
                socketId: socket.id,
                isActive: true,
                temporaryLeave: false
              };
              console.log(`玩家 ${data.username} 重新连接并更新卡组`);
            }
          }

          // 保存到数据库
          const room = await Room.findByPk(roomId);
          if (room) {
            const playerStates = room.playerStates;
            playerStates[userId] = { ...player };
            room.playerStates = playerStates;
            await room.save();
          }

          // 如果是第二个玩家，并且两个玩家都锁定了卡组，则随机决定先后手
          const allPlayersLockedDeck = roomState.players.length === 2 && roomState.players.every(p => p.isDeckLocked);
          if (allPlayersLockedDeck && roomState.gameState.phase === 'waiting' && room) {
            // 锁定房间，只允许这两个玩家使用
            room.isLocked = true;
            
            roomState.gameState.firstPlayer = Math.floor(Math.random() * 2);
            roomState.gameState.currentPlayer = roomState.gameState.firstPlayer;
            
            // 设置初始资源并抽牌
            const firstPlayer = roomState.players[roomState.gameState.firstPlayer];
            const secondPlayer = roomState.players[1 - roomState.gameState.firstPlayer];

            // 先手抽3张牌，1当前费用，1费用上限，1/3章节进度
            for (let i = 0; i < 3; i++) {
              if (firstPlayer.deck.length > 0) {
                firstPlayer.hand.push(firstPlayer.deck.shift());
                firstPlayer.handSize++;
                firstPlayer.deckSize--;
              }
            }
            firstPlayer.health = 25;
            firstPlayer.maxHealth = 25;
            firstPlayer.mana = 1; // 先手开局当前费用为1
            firstPlayer.maxMana = 1; // 先手开局费用上限为1
            firstPlayer.chapterProgress = 1; // 先手开局章节进度为1
            firstPlayer.maxChapterProgress = 3;
            firstPlayer.showFirstPlayerDrawHint = true; // 显示先攻抽牌提示

            // 后手抽4张牌，0当前费用，0费用上限，1/3章节进度
            for (let i = 0; i < 4; i++) {
              if (secondPlayer.deck.length > 0) {
                secondPlayer.hand.push(secondPlayer.deck.shift());
                secondPlayer.handSize++;
                secondPlayer.deckSize--;
              }
            }
            secondPlayer.health = 25;
            secondPlayer.maxHealth = 25;
            secondPlayer.mana = 0; // 后手开局当前费用为0
            secondPlayer.maxMana = 0; // 后手开局费用上限为0
            secondPlayer.chapterProgress = 1; // 后手开局章节进度为1
            secondPlayer.maxChapterProgress = 3;
            
            // 直接进入游戏阶段，跳过调度
            roomState.gameState.phase = 'playing';
            
            // 保存更新后的游戏状态
            if (room) {
              room.gameState = roomState.gameState;
              const playerStates = room.playerStates;
              roomState.players.forEach(p => {
                playerStates[p.userId] = { ...p };
              });
              room.playerStates = playerStates;
              await room.save();
            }
          }
        }
        
        // 广播房间状态更新
        io.to(roomId).emit('game-state-update', roomState);
        io.to(roomId).emit('game-update', {
          action: `${data.username} 选择了卡组: ${deckName} (主角: ${heroName})`,
          playerName: data.username
        });
      }
    } catch (error) {
      console.error('选择卡组失败:', error);
    }
  });

  // 游戏操作处理
  socket.on('game-action', (data) => {
    try {
      const { roomId, action, userId } = data;
      const roomState = gameRooms.get(roomId);
      
      if (!roomState) return;
      
      const player = roomState.players.find(p => p.userId === userId);
      if (!player) return;
      
      let updateNeeded = false;
      let broadcastData = { ...data };
      
      switch (action) {
        case 'start-game':
          if (roomState.players.length === 2) {
            roomState.gameState.phase = 'playing';
            updateNeeded = true;
            broadcastData.message = '游戏开始！';
          }
          break;
          
        case 'end-turn':
          // 切换到下一个玩家
          const currentPlayerIndex = roomState.gameState.currentPlayer;
          const nextPlayerIndex = (currentPlayerIndex + 1) % roomState.players.length;
          
          // 增加当前玩家的回合数
          const currentTurnPlayer = roomState.players[currentPlayerIndex];
          currentTurnPlayer.turnsCompleted = (currentTurnPlayer.turnsCompleted || 0) + 1;
          
          roomState.gameState.currentPlayer = nextPlayerIndex;
          
          // 如果回到先手玩家，增加回合数
          if (nextPlayerIndex === roomState.gameState.firstPlayer) {
            roomState.gameState.round = (roomState.gameState.round || 1) + 1;
          }
          
          // 下一个玩家回合开始时的资源更新
          const nextPlayer = roomState.players[nextPlayerIndex];
          
          // 抽卡
          if (nextPlayer.deck && nextPlayer.deck.length > 0) {
            const drawnCard = nextPlayer.deck.shift();
            nextPlayer.hand.push(drawnCard);
            nextPlayer.handSize++;
            nextPlayer.deckSize--;
          }
          
          // 增加费用上限（最大10）
          nextPlayer.maxMana = Math.min(nextPlayer.maxMana + 1, 10);
          nextPlayer.mana = nextPlayer.maxMana; // 回合开始时费用充满
          
          // 增加章节进度
          nextPlayer.chapterProgress = (nextPlayer.chapterProgress || 0) + 1;
          
          // 如果章节进度达到上限，重置并获得章节令牌
          if (nextPlayer.chapterProgress >= (nextPlayer.maxChapterProgress || 3)) {
            nextPlayer.chapterProgress = 0;
            nextPlayer.chapterTokens = Math.min((nextPlayer.chapterTokens || 0) + 1, 3);
          }
          
          updateNeeded = true;
          broadcastData.message = `${nextPlayer.username} 的回合开始 (第${roomState.gameState.round}回合)`;
          break;

        case 'extra-turn':
          // 执行额外回合 - 不切换玩家，但按正常回合推进
          const extraTurnPlayer = roomState.players[roomState.gameState.currentPlayer];
          
          // 增加当前玩家的回合数
          extraTurnPlayer.turnsCompleted = (extraTurnPlayer.turnsCompleted || 0) + 1;
          
          // 抽卡
          if (extraTurnPlayer.deck && extraTurnPlayer.deck.length > 0) {
            const drawnCard = extraTurnPlayer.deck.shift();
            extraTurnPlayer.hand.push(drawnCard);
            extraTurnPlayer.handSize++;
            extraTurnPlayer.deckSize--;
          }
          
          // 增加费用上限（最大10）
          extraTurnPlayer.maxMana = Math.min(extraTurnPlayer.maxMana + 1, 10);
          extraTurnPlayer.mana = extraTurnPlayer.maxMana; // 回合开始时费用充满
          
          // 增加章节进度
          extraTurnPlayer.chapterProgress = (extraTurnPlayer.chapterProgress || 0) + 1;
          
          // 如果章节进度达到上限，重置并获得章节令牌
          if (extraTurnPlayer.chapterProgress >= (extraTurnPlayer.maxChapterProgress || 3)) {
            extraTurnPlayer.chapterProgress = 0;
            extraTurnPlayer.chapterTokens = Math.min((extraTurnPlayer.chapterTokens || 0) + 1, 3);
          }
          
          updateNeeded = true;
          broadcastData.message = `${extraTurnPlayer.username} 执行了额外回合`;
          break;

        case 'roll-dice':
          // 掷骰功能
          const { sides, result, message } = data;
          updateNeeded = false; // 掷骰不需要更新游戏状态，只需要记录日志
          broadcastData.message = message || `${player.username} 掷了一个${sides}面骰子，结果是：${result}`;
          break;
          
        case 'draw-card':
        case 'draw-multiple-cards':
          const drawCount = data.count || 1;
          for (let i = 0; i < drawCount; i++) {
            if (player.deck && player.deck.length > 0) {
              const drawnCard = player.deck.shift();
              player.hand.push(drawnCard);
              player.handSize++;
              player.deckSize--;
            }
          }
          
          // 如果是先攻玩家第一次抽牌，隐藏提示
          if (player.showFirstPlayerDrawHint) {
            player.showFirstPlayerDrawHint = false;
          }
          
          updateNeeded = true;
          broadcastData.message = `${player.username} 抽了 ${drawCount} 张牌`;
          break;
          
        case 'discard-card':
          const { handIndex } = data;
          if (player.hand && player.hand.length > handIndex && handIndex >= 0) {
            const discardedCard = player.hand.splice(handIndex, 1)[0];
            player.graveyard.push(discardedCard);
            player.handSize--;
            updateNeeded = true;
            broadcastData.message = `${player.username} 弃了一张牌: ${discardedCard.name}`;
            broadcastData.cardData = discardedCard; // 保存完整卡牌信息
          }
          break;

        case 'play-card':
          const { handIndex: playHandIndex, zone, position } = data;
          if (player.hand && player.hand.length > playHandIndex && playHandIndex >= 0) {
            const playedCard = player.hand[playHandIndex];
            
            // 检查费用（X费用当作0处理）
            if (playedCard.cost !== 'X') {
              const cardCost = parseInt(playedCard.cost) || 0;
              if (player.mana < cardCost) {
                // 费用不足，不执行操作
                broadcastData.message = `${player.username} 费用不足，无法使用 ${playedCard.name}（需要${cardCost}费用，当前${player.mana}费用）`;
                break;
              }
              // 扣除费用
              player.mana = Math.max(0, player.mana - cardCost);
            }
            
            // 移除手牌
            player.hand.splice(playHandIndex, 1);
            
            const targetZone = zone === 'battlefield' ? player.battlefield : player.effectZone;
            
            // 如果指定了位置，插入到指定的绝对位置
            if (typeof position === 'number' && position >= 0) {
              // 确保数组足够大，如有必要用null填充空位
              while (targetZone.length <= position) {
                targetZone.push(null);
              }
              // 将卡牌放到指定位置
              targetZone[position] = playedCard;
            } else {
              // 否则添加到末尾
              targetZone.push(playedCard);
            }
            
            // 将卡牌添加到游戏板
            if (zone === 'battlefield') {
              roomState.gameState.gameBoard.playerCards.push({
                ...playedCard,
                ownerId: userId
              });
            } else if (zone === 'effect') {
              roomState.gameState.gameBoard.effectCards.push({
                ...playedCard,
                ownerId: userId
              });
            }
            
            player.handSize--;
            updateNeeded = true;
            const costMessage = playedCard.cost === 'X' ? '(X费用)' : `(消耗${playedCard.cost}费用)`;
            const positionMessage = typeof position === 'number' ? `到位置${position + 1}` : '';
            broadcastData.message = `${player.username} 使用了卡牌: ${playedCard.name} ${costMessage} ${positionMessage}`;
            broadcastData.cardData = playedCard; // 保存完整卡牌信息
          }
          break;

        case 'remove-from-battlefield':
          const { cardId: removeCardId, index } = data;
          if (removeCardId) {
            // 根据卡牌ID移除
            const cardIndex = player.battlefield.findIndex(card => card._id === removeCardId);
            if (cardIndex >= 0) {
              const removedCard = player.battlefield.splice(cardIndex, 1)[0];
              player.graveyard.push(removedCard);
              
              // 从游戏板移除
              roomState.gameState.gameBoard.playerCards = roomState.gameState.gameBoard.playerCards.filter(
                card => !(card._id === removeCardId && card.ownerId === userId)
              );
              
              updateNeeded = true;
              broadcastData.message = `${player.username} 移除了战场上的卡牌: ${removedCard.name}`;
            }
          } else if (typeof index === 'number') {
            // 根据索引移除
            if (player.battlefield.length > index && index >= 0) {
              const removedCard = player.battlefield.splice(index, 1)[0];
              player.graveyard.push(removedCard);
              updateNeeded = true;
              broadcastData.message = `${player.username} 移除了战场上的卡牌: ${removedCard.name}`;
            }
          }
          break;
          
        case 'shuffle-deck':
          if (player.deck) {
            player.deck.sort(() => Math.random() - 0.5);
          }
          updateNeeded = true;
          broadcastData.message = `${player.username} 洗了牌库`;
          break;

        case 'view-graveyard':
          // 发送弃牌堆信息给请求的玩家
          socket.emit('graveyard-info', {
            playerName: player.username,
            graveyard: player.graveyard
          });
          broadcastData.message = `${player.username} 查看了弃牌堆`;
          break;

        case 'mulligan-complete':
          player.isReady = true;
          updateNeeded = true;
          
          // 检查是否所有玩家都完成了调度
          const allReady = roomState.players.every(p => p.isReady);
          if (allReady) {
            roomState.gameState.phase = 'playing';
            broadcastData.message = '所有玩家调度完成，游戏开始！';
          } else {
            broadcastData.message = `${player.username} 完成了调度`;
          }
          break;
          
        case 'modify-player-stats':
          const { type, change } = data;
          console.log(`[DEBUG] 修改玩家状态: ${player.username}, type: ${type}, change: ${change}`);
          switch (type) {
            case 'health':
              player.health = Math.max(0, Math.min(player.maxHealth, player.health + change));
              break;
            case 'maxHealth':
              player.maxHealth = Math.max(1, Math.min(500, player.maxHealth + change));
              // 确保当前生命值不超过新的上限
              player.health = Math.min(player.health, player.maxHealth);
              break;
            case 'mana':
              player.mana = Math.max(0, Math.min(player.maxMana, player.mana + change));
              break;
            case 'maxMana':
              player.maxMana = Math.max(0, Math.min(99, player.maxMana + change));
              // 确保当前费用不超过新的上限
              player.mana = Math.min(player.mana, player.maxMana);
              break;
            case 'mana':
              player.mana = Math.max(0, Math.min(99, player.mana + change));
              break;
            case 'chapter':
              const newChapterProgress = Math.max(0, Math.min(player.maxChapterProgress || 3, player.chapterProgress + change));
              player.chapterProgress = newChapterProgress;
              
              // 检查章节进度是否达到上限，如果是则自动处理
              if (player.chapterProgress >= (player.maxChapterProgress || 3)) {
                player.chapterProgress = 0;
                player.chapterTokens = Math.min((player.chapterTokens || 0) + 1, 10);
                broadcastData.message = `${player.username} 章节进度达到上限，获得1点章节指示物并重置章节进度`;
              }
              break;
            case 'maxChapter':
              player.maxChapterProgress = Math.max(1, Math.min(30, (player.maxChapterProgress || 3) + change));
              // 确保当前章节进度不超过新的上限
              player.chapterProgress = Math.min(player.chapterProgress, player.maxChapterProgress);
              break;
            case 'chapterTokens':
              player.chapterTokens = Math.max(0, Math.min(50, (player.chapterTokens || 0) + change));
              break;
          }
          updateNeeded = true;
          broadcastData.message = `${player.username} 调整了 ${type}: ${change > 0 ? '+' : ''}${change}`;
          break;
          
        case 'add-card-to-deck':
          if (data.cardData) {
            // 添加完整的卡牌数据
            const newCard = {
              ...data.cardData,
              _id: `temp_${Date.now()}`,
              ownerId: userId,
              createdBy: { _id: userId, username: player.username }
            };
            if (player.deck) {
              player.deck.push(newCard);
            }
            player.deckSize++;
            updateNeeded = true;
            broadcastData.message = `${player.username} 向牌库添加了卡牌: ${data.cardData.name}`;
            broadcastData.cardData = newCard; // 保存完整卡牌信息
          } else if (data.cardName) {
            player.deckSize++;
            updateNeeded = true;
            broadcastData.message = `${player.username} 向牌库添加了卡牌: ${data.cardName}`;
          }
          break;

        case 'add-card-to-deck-from-collection':
          if (data.card) {
            const quantity = data.quantity || 1; // 获取数量，默认为1
            const addedCards = [];
            
            // 批量添加卡牌
            for (let i = 0; i < quantity; i++) {
              const cardToAdd = {
                ...data.card,
                _id: `temp_${Date.now()}_${data.card._id}_${i}`,
                ownerId: userId
              };
              
              if (player.deck) {
                if (data.position === 'top') {
                  player.deck.unshift(cardToAdd); // 添加到顶部
                } else if (data.position === 'random') {
                  // 随机插入到牌堆中的任意位置
                  const randomIndex = Math.floor(Math.random() * (player.deck.length + 1));
                  player.deck.splice(randomIndex, 0, cardToAdd);
                } else {
                  player.deck.push(cardToAdd); // 添加到底部
                }
              }
              player.deckSize++;
              addedCards.push(cardToAdd);
            }
            
            updateNeeded = true;
            const positionText = data.position === 'top' ? '顶部' : 
                                data.position === 'random' ? '随机位置' : '底部';
            const quantityText = quantity > 1 ? ` ${quantity}张` : '';
            broadcastData.message = `${player.username} 向牌库${positionText}添加了${quantityText}卡牌: ${data.card.name}`;
            broadcastData.cardData = addedCards[0]; // 保存第一张卡牌信息用于日志显示
          }
          break;

        case 'add-card-to-battlefield':
          if (data.card) {
            const quantity = data.quantity || 1; // 获取数量，默认为1
            
            // 对于牌桌，只能添加一张到指定位置，如果数量大于1则提示错误
            if (quantity > 1) {
              broadcastData.message = `${player.username} 无法在牌桌同一位置添加多张卡牌，只添加了1张: ${data.card.name}`;
            }
            
            // 从卡牌集中添加卡牌到牌桌
            const cardToAdd = {
              ...data.card,
              _id: `temp_${Date.now()}_${data.card._id}`,
              ownerId: userId
            };
            
            // 确保牌桌数组足够大
            while (player.battlefield.length <= data.position) {
              player.battlefield.push(null);
            }
            player.battlefield[data.position] = cardToAdd;
            
            // 添加到游戏板
            roomState.gameState.gameBoard.playerCards.push({
              ...cardToAdd,
              ownerId: userId
            });
            
            updateNeeded = true;
            if (quantity <= 1) {
              broadcastData.message = `${player.username} 在牌桌位置${data.position + 1}添加了卡牌: ${data.card.name}`;
            }
            broadcastData.cardData = cardToAdd; // 保存完整卡牌信息
          }
          break;

        case 'add-card-to-effect-zone':
          if (data.card) {
            const quantity = data.quantity || 1; // 获取数量，默认为1
            
            // 对于持续区，只能添加一张到指定位置，如果数量大于1则提示错误
            if (quantity > 1) {
              broadcastData.message = `${player.username} 无法在持续区同一位置添加多张卡牌，只添加了1张: ${data.card.name}`;
            }
            
            // 从卡牌集中添加卡牌到持续区
            const cardToAdd = {
              ...data.card,
              _id: `temp_${Date.now()}_${data.card._id}`,
              ownerId: userId
            };
            
            // 确保持续区数组足够大
            while (player.effectZone.length <= data.position) {
              player.effectZone.push(null);
            }
            player.effectZone[data.position] = cardToAdd;
            
            // 添加到游戏板
            roomState.gameState.gameBoard.effectCards.push({
              ...cardToAdd,
              ownerId: userId
            });
            
            updateNeeded = true;
            if (quantity <= 1) {
              broadcastData.message = `${player.username} 在持续区位置${data.position + 1}添加了卡牌: ${data.card.name}`;
            }
            broadcastData.cardData = cardToAdd; // 保存完整卡牌信息
          }
          break;

        case 'add-card-to-hand':
          if (data.card) {
            const quantity = data.quantity || 1; // 获取数量，默认为1
            const addedCards = [];
            
            // 批量添加卡牌到手牌
            for (let i = 0; i < quantity; i++) {
              const cardToAdd = {
                ...data.card,
                _id: `temp_${Date.now()}_${data.card._id}_${i}`,
                ownerId: userId
              };
              
              player.hand.push(cardToAdd);
              player.handSize++;
              addedCards.push(cardToAdd);
            }
            
            updateNeeded = true;
            const quantityText = quantity > 1 ? ` ${quantity}张` : '';
            broadcastData.message = `${player.username} 向手牌添加了${quantityText}卡牌: ${data.card.name}`;
            broadcastData.cardData = addedCards[0]; // 保存第一张卡牌信息用于日志显示
          }
          break;

        case 'add-card-to-graveyard':
          if (data.card) {
            const quantity = data.quantity || 1; // 获取数量，默认为1
            const addedCards = [];
            
            // 批量添加卡牌到弃牌堆
            for (let i = 0; i < quantity; i++) {
              const cardToAdd = {
                ...data.card,
                _id: `temp_${Date.now()}_${data.card._id}_${i}`,
                ownerId: userId
              };
              
              player.graveyard.push(cardToAdd);
              addedCards.push(cardToAdd);
            }
            
            updateNeeded = true;
            const quantityText = quantity > 1 ? ` ${quantity}张` : '';
            broadcastData.message = `${player.username} 向弃牌堆添加了${quantityText}卡牌: ${data.card.name}`;
            broadcastData.cardData = addedCards[0]; // 保存第一张卡牌信息用于日志显示
          }
          break;
          
        case 'return-to-deck':
          const { handIndex: returnHandIndex, position: deckPosition } = data;
          if (player.hand && player.hand.length > returnHandIndex && returnHandIndex >= 0) {
            const returnedCard = player.hand.splice(returnHandIndex, 1)[0];
            if (player.deck) {
              if (deckPosition === 'top') {
                player.deck.unshift(returnedCard); // 添加到牌堆顶部
              } else {
                player.deck.push(returnedCard); // 添加到牌堆底部
              }
            }
            player.handSize--;
            player.deckSize++;
            updateNeeded = true;
            const positionText = deckPosition === 'top' ? '顶部' : '底部';
            broadcastData.message = `${player.username} 将手牌返回牌库${positionText}: ${returnedCard.name}`;
          }
          break;

        case 'remove-card':
          const { handIndex: removeHandIndex } = data;
          if (player.hand && player.hand.length > removeHandIndex && removeHandIndex >= 0) {
            const removedCard = player.hand.splice(removeHandIndex, 1)[0];
            player.handSize--;
            updateNeeded = true;
            broadcastData.message = `${player.username} 从本局游戏中完全移除了卡牌: ${removedCard.name}`;
          }
          break;

        case 'search-deck':
          // 搜索牌堆，返回牌堆中的卡牌列表
          if (player.deck) {
            socket.emit('deck-cards', { cards: player.deck });
            broadcastData.message = `${player.username} 正在搜索牌堆`;
          }
          break;

        case 'draw-specific-card':
          const { deckIndex } = data;
          if (player.deck && player.deck.length > deckIndex && deckIndex >= 0) {
            const drawnCard = player.deck.splice(deckIndex, 1)[0];
            player.hand.push(drawnCard);
            player.handSize++;
            player.deckSize--;
            updateNeeded = true;
            broadcastData.message = `${player.username} 从牌堆抽取了: ${drawnCard.name}`;
            
            // 抽取指定卡牌后洗牌
            player.deck.sort(() => Math.random() - 0.5);
          }
          break;

        case 'return-from-graveyard':
          const { graveyardIndex } = data;
          if (player.graveyard && player.graveyard.length > graveyardIndex && graveyardIndex >= 0) {
            const returnedGraveyardCard = player.graveyard.splice(graveyardIndex, 1)[0];
            player.hand.push(returnedGraveyardCard);
            player.handSize++;
            updateNeeded = true;
            broadcastData.message = `${player.username} 将弃牌堆中的卡牌返回手牌: ${returnedGraveyardCard.name}`;
          }
          break;

        case 'bulk-discard-graveyard-cards':
          const { cardIds } = data;
          if (cardIds && Array.isArray(cardIds) && cardIds.length > 0) {
            const removedCards = [];
            // 从后往前遍历，避免索引变化问题
            for (let i = player.graveyard.length - 1; i >= 0; i--) {
              const card = player.graveyard[i];
              if (cardIds.includes(card._id)) {
                const removedCard = player.graveyard.splice(i, 1)[0];
                removedCards.push(removedCard);
              }
            }
            if (removedCards.length > 0) {
              updateNeeded = true;
              const cardNames = removedCards.map(card => card.name).join(', ');
              broadcastData.message = `${player.username} 从弃牌堆中彻底移除了 ${removedCards.length} 张卡牌: ${cardNames}`;
            }
          }
          break;

        case 'bulk-modify-graveyard-card-cost':
          const { cardIds: modifyCardIds, costChange } = data;
          if (modifyCardIds && Array.isArray(modifyCardIds) && modifyCardIds.length > 0 && typeof costChange === 'number') {
            const modifiedCards = [];
            player.graveyard.forEach(card => {
              if (modifyCardIds.includes(card._id)) {
                const originalCost = card.cost;
                // 处理X费用和数字费用
                if (originalCost === 'X') {
                  // X费用保持不变
                  card.cost = 'X';
                } else {
                  const currentCost = parseInt(originalCost) || 0;
                  const newCost = Math.max(0, currentCost + costChange);
                  card.cost = newCost.toString();
                  if (!card.originalCost) {
                    card.originalCost = originalCost; // 保存原始费用
                  }
                }
                modifiedCards.push(card);
              }
            });
            if (modifiedCards.length > 0) {
              updateNeeded = true;
              const cardNames = modifiedCards.map(card => card.name).join(', ');
              const changeText = costChange > 0 ? `+${costChange}` : `${costChange}`;
              broadcastData.message = `${player.username} 将弃牌堆中 ${modifiedCards.length} 张卡牌的费用修改了 ${changeText}: ${cardNames}`;
            }
          }
          break;

        case 'return-card-from-field':
          const { cardIndex: returnFieldIndex, zone: returnZone } = data;
          let returnedFieldCard;
          if (returnZone === 'battlefield' && player.battlefield.length > returnFieldIndex && returnFieldIndex >= 0 && player.battlefield[returnFieldIndex]) {
            returnedFieldCard = player.battlefield[returnFieldIndex];
            player.battlefield[returnFieldIndex] = null; // 设置为null而不是删除，保持位置
            roomState.gameState.gameBoard.playerCards = roomState.gameState.gameBoard.playerCards.filter(
              (card, idx) => !(idx === returnFieldIndex && card.ownerId === userId)
            );
          } else if (returnZone === 'effect' && player.effectZone.length > returnFieldIndex && returnFieldIndex >= 0 && player.effectZone[returnFieldIndex]) {
            returnedFieldCard = player.effectZone[returnFieldIndex];
            player.effectZone[returnFieldIndex] = null; // 设置为null而不是删除，保持位置
            roomState.gameState.gameBoard.effectCards = roomState.gameState.gameBoard.effectCards.filter(
              (card, idx) => !(idx === returnFieldIndex && card.ownerId === userId)
            );
          }
          if (returnedFieldCard) {
            player.hand.push(returnedFieldCard);
            player.handSize++;
            updateNeeded = true;
            broadcastData.message = `${player.username} 将场上的卡牌返回手牌: ${returnedFieldCard.name}`;
          }
          break;
          
        case 'pause-game':
          roomState.gameState.phase = 'paused';
          updateNeeded = true;
          broadcastData.message = '游戏已暂停';
          break;
          
        case 'resume-game':
          roomState.gameState.phase = 'playing';
          updateNeeded = true;
          broadcastData.message = '游戏继续';
          break;
          
        case 'end-game':
          roomState.gameState.phase = 'ended';
          updateNeeded = true;
          broadcastData.message = '游戏结束';
          break;

        case 'discard-from-field':
          const { cardIndex: discardFieldIndex, zone: discardZone } = data;
          let discardedFieldCard;
          if (discardZone === 'battlefield' && player.battlefield.length > discardFieldIndex && discardFieldIndex >= 0 && player.battlefield[discardFieldIndex]) {
            discardedFieldCard = player.battlefield[discardFieldIndex];
            player.battlefield[discardFieldIndex] = null; // 设置为null而不是删除，保持位置
            roomState.gameState.gameBoard.playerCards = roomState.gameState.gameBoard.playerCards.filter(
              (card, idx) => !(idx === discardFieldIndex && card.ownerId === userId)
            );
          } else if (discardZone === 'effect' && player.effectZone.length > discardFieldIndex && discardFieldIndex >= 0 && player.effectZone[discardFieldIndex]) {
            discardedFieldCard = player.effectZone[discardFieldIndex];
            player.effectZone[discardFieldIndex] = null; // 设置为null而不是删除，保持位置
            roomState.gameState.gameBoard.effectCards = roomState.gameState.gameBoard.effectCards.filter(
              (card, idx) => !(idx === discardFieldIndex && card.ownerId === userId)
            );
          }
          if (discardedFieldCard) {
            player.graveyard.push(discardedFieldCard);
            updateNeeded = true;
            broadcastData.message = `${player.username} 弃掉了场上的卡牌: ${discardedFieldCard.name}`;
            broadcastData.cardData = discardedFieldCard; // 保存完整卡牌信息
          }
          break;

        case 'modify-card-stats':
          const { cardIndex: modifyCardIndex, zone: modifyZone, newAttack, newHealth, originalAttack, originalHealth } = data;
          let targetCard;
          if (modifyZone === 'battlefield' && player.battlefield.length > modifyCardIndex && modifyCardIndex >= 0) {
            targetCard = player.battlefield[modifyCardIndex];
          } else if (modifyZone === 'effect' && player.effectZone.length > modifyCardIndex && modifyCardIndex >= 0) {
            targetCard = player.effectZone[modifyCardIndex];
          }

          if (targetCard) {
            targetCard.modifiedAttack = newAttack;
            targetCard.modifiedHealth = newHealth;
            targetCard.originalAttack = originalAttack;
            targetCard.originalHealth = originalHealth;
            updateNeeded = true;
            broadcastData.message = `${player.username} 修改了 ${targetCard.name} 的攻防为 ${newAttack}/${newHealth}`;
          }
          break;

        case 'temporary-leave':
          player.temporaryLeave = true;
          player.lastActiveTime = new Date().toISOString();
          updateNeeded = true;
          broadcastData.message = `${player.username} 暂时离开了房间。`;
          break;

        case 'agree-to-end':
          player.isReady = true; // 复用isReady表示同意
          updateNeeded = true;
          const allAgreedToEnd = roomState.players.every(p => p.isReady);
          if (allAgreedToEnd) {
            roomState.gameState.phase = 'ended';
            broadcastData.message = '双方玩家同意，游戏结束。';
          } else {
            broadcastData.message = `${player.username} 同意结束游戏。`;
          }
          break;

        case 'request-restart':
          // 请求重新开始游戏或取消重新开始
          (async () => {
            if (player.restartRequest) {
              // 如果已经请求了重新开始，则取消请求
              player.restartRequest = false;
              updateNeeded = true;
              broadcastData.message = `${player.username} 取消了重新开始游戏的请求。`;
            } else {
              // 请求重新开始游戏
              player.restartRequest = true;
              updateNeeded = true;
              
              const allRequestRestart = roomState.players.every(p => p.restartRequest);
              if (allRequestRestart && roomState.players.length >= 2) {
                // 双方都同意重新开始，重置游戏状态
                console.log('双方都同意重新开始，开始重置游戏状态');
                
                try {
                  // 解锁房间，重置位置信息
                  const roomToUpdate = await Room.findByPk(roomId);
                  if (roomToUpdate) {
                    roomToUpdate.isLocked = false;
                    const resetPositions = {
                      position1: null,
                      position2: null
                    };
                    roomToUpdate.positions = resetPositions;
                    roomToUpdate.playerStates = {};
                    await roomToUpdate.save();
                  }
                } catch (error) {
                  console.error('重置房间状态失败:', error);
                }
                
                roomState.players.forEach(p => {
                  // 完全重置玩家状态，包括卡组选择
                  p.health = 25;
                  p.maxHealth = 25;
                  p.mana = 0;
                  p.maxMana = 0;
                  p.chapterProgress = 0;
                  p.maxChapterProgress = 3;
                  p.chapterTokens = 0;
                  p.hand = [];
                  p.handSize = 0;
                  p.graveyard = [];
                  p.battlefield = [];
                  p.effectZone = [];
                  p.deck = [];
                  p.deckSize = 0;
                  p.isReady = false;
                  p.hasCompletedTurn = false;
                  p.restartRequest = false;
                  p.isDeckLocked = false; // 允许重新选择卡组
                  
                  // 清除卡组相关信息，需要重新选择
                  p.deckId = null;
                  p.deckName = null;
                  p.heroName = null;
                  p.championCard = null;
                  p.championDescription = null;
                  p.originalDeck = null;
                });
                
                // 重置游戏状态到等待选择卡组阶段
                roomState.gameState.currentPlayer = 0;
                roomState.gameState.round = 1;
                roomState.gameState.phase = 'waiting'; // 等待重新选择卡组
                roomState.gameState.firstPlayer = -1;
                roomState.gameState.gameBoard = {
                  playerCards: [],
                  effectCards: []
                };
                
                broadcastData.message = '双方玩家同意重新开始！请重新选择位置和卡组。';
                console.log('游戏状态已重置，等待重新选择位置和卡组');
              } else {
                broadcastData.message = `${player.username} 请求重新开始游戏，等待对手确认。`;
              }
            }
          })();
          break;

        case 'update-slots':
          console.log(`[DEBUG] update-slots: ${player.username}, zone: ${data.zone}, slots: ${data.slots}`);
          const { zone: slotZone, slots } = data;
          if (slotZone === 'battlefield') {
            player.battlefieldSlots = Math.max(1, Math.min(10, slots));
            updateNeeded = true;
            broadcastData.message = `${player.username} 调整了牌桌区域空位数量为 ${player.battlefieldSlots}`;
            console.log(`[DEBUG] ${player.username} battlefieldSlots updated to: ${player.battlefieldSlots}`);
          } else if (slotZone === 'effect') {
            player.effectSlots = Math.max(1, Math.min(10, slots));
            updateNeeded = true;
            broadcastData.message = `${player.username} 调整了效果区域空位数量为 ${player.effectSlots}`;
            console.log(`[DEBUG] ${player.username} effectSlots updated to: ${player.effectSlots}`);
          }
          break;
          
        case 'update-notes':
          const { type: noteType, notes } = data;
          if (noteType === 'my-notes') {
            // 限制备注长度
            const trimmedNotes = (notes || '').substring(0, 1000);
            player.notes = trimmedNotes;
            updateNeeded = true;
            console.log(`[DEBUG] ${player.username} 更新了备注: ${trimmedNotes.length} 字符`);
            // 不在游戏日志中显示备注更新，保持隐私
            // 不设置 broadcastData.message，保持静默同步
            broadcastData = {}; // 清空消息
          }
          break;

        case 'update-custom-fields':
          const { type: fieldType, fields } = data;
          if (fieldType === 'my-fields') {
            // 更新玩家的自定义字段
            player.customFields = fields || [];
            updateNeeded = true;
            console.log(`[DEBUG] ${player.username} 更新了自定义字段: ${fields.length} 个字段`);
            // 不在游戏日志中显示字段更新，保持静默同步
            broadcastData = {}; // 清空消息
          }
          break;

        case 'modify-hand-card-cost':
          const { handIndex: modifyHandIndex, newCost } = data;
          if (player.hand && player.hand.length > modifyHandIndex && modifyHandIndex >= 0) {
            const targetHandCard = player.hand[modifyHandIndex];
            const originalCost = targetHandCard.cost;
            targetHandCard.cost = newCost;
            targetHandCard.originalCost = originalCost; // 保存原始费用
            updateNeeded = true;
            broadcastData.message = `${player.username} 将手牌 ${targetHandCard.name} 的费用从 ${originalCost} 调整为 ${newCost}`;
          }
          break;

        case 'update-card-note':
          const { cardIndex: noteCardIndex, zone: noteZone, note } = data;
          let targetNoteCard;
          if (noteZone === 'battlefield' && player.battlefield.length > noteCardIndex && noteCardIndex >= 0) {
            targetNoteCard = player.battlefield[noteCardIndex];
          } else if (noteZone === 'effect' && player.effectZone.length > noteCardIndex && noteCardIndex >= 0) {
            targetNoteCard = player.effectZone[noteCardIndex];
          } else if (noteZone === 'graveyard' && player.graveyard.length > noteCardIndex && noteCardIndex >= 0) {
            targetNoteCard = player.graveyard[noteCardIndex];
          } else if (noteZone === 'hand' && player.hand.length > noteCardIndex && noteCardIndex >= 0) {
            targetNoteCard = player.hand[noteCardIndex];
          } else if (noteZone === 'deck' && player.deck.length > noteCardIndex && noteCardIndex >= 0) {
            targetNoteCard = player.deck[noteCardIndex];
          }

          if (targetNoteCard) {
            const trimmedNote = (note || '').substring(0, 200); // 限制备注长度为200字符
            targetNoteCard.cardNote = trimmedNote;
            updateNeeded = true;
            if (trimmedNote) {
              broadcastData.message = `${player.username} 为 ${targetNoteCard.name} 添加了备注`;
            } else {
              broadcastData.message = `${player.username} 清除了 ${targetNoteCard.name} 的备注`;
            }
          }
          break;

        case 'display-all-hand':
          // 展示全部手牌
          if (data.cards && Array.isArray(data.cards)) {
            player.displayedHandCards = [...data.cards]; // 保存展示的手牌
            player.isDisplayingAllHand = true;
            player.isDisplayingSelectedHand = false;
            updateNeeded = true;
            broadcastData.message = data.message || `${player.username} 展示了全部手牌 (${data.cards.length} 张)`;
          }
          break;

        case 'display-selected-hand':
          // 展示选中的手牌
          if (data.cards && Array.isArray(data.cards)) {
            player.displayedHandCards = [...data.cards]; // 保存展示的手牌
            player.isDisplayingSelectedHand = true;
            player.isDisplayingAllHand = false;
            updateNeeded = true;
            broadcastData.message = data.message || `${player.username} 展示了 ${data.cards.length} 张手牌`;
          }
          break;

        case 'hide-all-hand':
        case 'hide-selected-hand':
          // 取消展示手牌
          player.displayedHandCards = [];
          player.isDisplayingAllHand = false;
          player.isDisplayingSelectedHand = false;
          updateNeeded = true;
          broadcastData.message = data.message || `${player.username} 取消展示手牌`;
          break;

      }
      
      // 发送游戏更新（如果有消息的话）
      if (broadcastData.message || broadcastData.action) {
        io.to(roomId).emit('game-update', broadcastData);
      }
      
      // 如果有消息，添加到游戏日志并持久化
      if (broadcastData.message) {
        const logEntry = {
          timestamp: new Date().toISOString(),
          message: broadcastData.message,
          playerName: broadcastData.playerName || player.username,
          action: action,
          cardData: broadcastData.cardData || null // 保存卡牌数据到日志
        };
        
        // 添加到内存中的房间状态（用于即时显示）
        if (!roomState.gameLog) {
          roomState.gameLog = [];
        }
        roomState.gameLog.push(logEntry);
        
        // 限制日志长度，只保留最近100条
        if (roomState.gameLog.length > 100) {
          roomState.gameLog = roomState.gameLog.slice(-100);
        }
      }
      
      // 如果需要，发送完整的状态更新并持久化保存
      if (updateNeeded) {
        console.log(`[DEBUG] 即将发送的roomState.players:`, JSON.stringify(roomState.players.map(p => ({
          userId: p.userId,
          username: p.username,
          battlefieldSlots: p.battlefieldSlots,
          effectSlots: p.effectSlots,
          allKeys: Object.keys(p)
        })), null, 2));
        console.log(`[DEBUG] 发送游戏状态更新，房间玩家空位信息:`, roomState.players.map(p => ({
          username: p.username,
          battlefieldSlots: p.battlefieldSlots,
          effectSlots: p.effectSlots
        })));
        io.to(roomId).emit('game-state-update', roomState);
        
        // 持久化保存游戏状态到数据库
        saveGameState(roomId, roomState).catch(error => {
          console.error('保存游戏状态失败:', error);
        });
      }
      
      console.log(`游戏操作 [${roomId}]: ${action} by ${player.username}`);
      
    } catch (error) {
      console.error('处理游戏操作失败:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log('用户断开连接:', socket.id);
    
    // 从所有房间中更新该玩家的socket信息，但不移除玩家数据
    for (const [roomId, roomState] of gameRooms.entries()) {
      const playerInRoom = roomState.players.find(p => p.socketId === socket.id);
      const spectatorInRoom = roomState.spectators.find(s => s.socketId === socket.id);
      
      if (playerInRoom) {
        // 更新玩家的socket状态，但保留所有游戏数据
        playerInRoom.socketId = null;
        playerInRoom.isActive = false;
        playerInRoom.temporaryLeave = true;
        playerInRoom.lastActiveTime = new Date().toISOString();
        
        console.log(`玩家 ${playerInRoom.username} 在房间 ${roomId} 中离线（保留游戏数据）`);
        
        // 发送更新状态，但不移除玩家信息
        io.to(roomId).emit('game-state-update', roomState);
        io.to(roomId).emit('user-disconnected', {
          socketId: socket.id,
          username: playerInRoom.username,
          message: `${playerInRoom.username} 离线了，但游戏数据已保存`
        });
      }
      
      if (spectatorInRoom) {
        // 观众可以正常移除
        roomState.spectators = roomState.spectators.filter(s => s.socketId !== socket.id);
        io.to(roomId).emit('game-state-update', roomState);
      }
    }
  });
});

// 初始化数据库并启动服务器
const initializeApp = async () => {
  try {
    // 测试数据库连接
    await testConnection();
    
    // 同步数据库模型（创建表）
    await sequelize.sync({ force: false }); // force: false 表示不会删除现有数据，只创建新表
    console.log('✅ 数据库表同步完成');
    
    // 创建一些示例数据
    await createSampleData();
    
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      console.log(`✅ 服务器运行在端口 ${PORT}`);
      console.log(`🌐 前端地址: http://localhost:3000`);
      console.log(`🔧 API地址: http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('❌ 应用初始化失败:', error);
    process.exit(1);
  }
};

// 创建示例数据
const createSampleData = async () => {
  try {
    // 检查是否已有用户数据
    const userCount = await User.count();
    if (userCount > 0) {
      console.log('数据库已有数据，跳过示例数据创建');
      return;
    }

    console.log('创建示例数据...');
    
    // 创建示例用户
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('123456', 10);
    
    const admin = await User.create({
      username: 'admin',
      email: 'admin@example.com',
      password: hashedPassword,
      isAdmin: true,
    });

    const user1 = await User.create({
      username: 'player1',
      email: 'player1@example.com',
      password: hashedPassword,
    });

    console.log('✅ 示例用户创建完成');

    // 创建示例卡牌
    const heroCard = await Card.create({
      name: '圣光骑士',
      type: 'hero',
      category: '主角',
      cost: '0',
      effect: '你的所有配角获得+1生命值',
      flavor: '正义与荣耀的化身',
      faction: 'hero1',
      isPublic: true,
      createdBy: admin.id,
    });

    await Card.create({
      name: '火球术',
      type: 'story',
      category: '事件',
      cost: '3',
      effect: '对任意目标造成4点伤害',
      flavor: '魔法的力量在于精准的控制',
      faction: 'neutral',
      isPublic: true,
      createdBy: admin.id,
    });

    await Card.create({
      name: '精灵射手',
      type: 'character',
      category: '配角',
      cost: '2',
      attack: 3,
      health: 2,
      effect: '快攻。这个配角可以在进入故事的当回合攻击',
      flavor: '箭无虚发，百步穿杨',
      faction: 'neutral',
      isPublic: true,
      createdBy: admin.id,
    });

    console.log('✅ 示例卡牌创建完成');
    console.log('🎮 可以使用以下账户登录测试:');
    console.log('   管理员: admin / 123456');
    console.log('   玩家: player1 / 123456');
    
  } catch (error) {
    console.error('创建示例数据失败:', error);
  }
};

// 启动应用
initializeApp();
