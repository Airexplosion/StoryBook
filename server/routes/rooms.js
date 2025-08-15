const express = require('express');
const { Room, User } = require('../models');
const { auth } = require('../middleware/auth');

const router = express.Router();

// 获取房间列表
router.get('/', async (req, res) => {
  try {
    const rooms = await Room.findAll({
      where: { isActive: true },
      include: [{
        model: User,
        as: 'creator',
        attributes: ['id', 'username']
      }],
      order: [['createdAt', 'DESC']]
    });

    // 获取server中的gameRooms实例（需要从app中传递）
    const gameRooms = req.app.get('gameRooms');

    // 转换数据格式，使用准确的实时数据
    const formattedRooms = rooms.map(room => {
      let playerCount = 0;
      let formattedPlayers = [];
      
      // 优先从内存中的gameRooms获取实际玩家数量（最准确的数据源）
      if (gameRooms && gameRooms.has(room.id.toString())) {
        const roomState = gameRooms.get(room.id.toString());
        if (roomState.players) {
          // 只计算活跃的玩家（有socketId或者不是临时离开的玩家）
          const activePlayers = roomState.players.filter(p => 
            p.isActive || p.socketId || !p.temporaryLeave
          );
          playerCount = activePlayers.length;
          
          // 构建玩家列表
          formattedPlayers = activePlayers.map(player => ({
            user: {
              _id: player.userId,
              username: player.username
            },
            deck: null,
            isReady: player.isReady || false
          }));
        }
      } else {
        // 如果内存中没有数据，从数据库的playerStates获取
        const playerStates = room.playerStates || {};
        const playerIds = Object.keys(playerStates);
        playerCount = playerIds.length;
        
        // 构建玩家列表
        formattedPlayers = playerIds.map(userId => {
          const playerState = playerStates[userId];
          return {
            user: {
              _id: userId,
              username: playerState.username || 'Unknown'
            },
            deck: null,
            isReady: playerState.isReady || false
          };
        });
      }

      // 获取观战人信息
      let spectatorCount = 0;
      let formattedSpectators = [];
      
      // 优先从内存中的gameRooms获取观战人数据
      if (gameRooms && gameRooms.has(room.id.toString())) {
        const roomState = gameRooms.get(room.id.toString());
        if (roomState.spectators) {
          spectatorCount = roomState.spectators.length;
          formattedSpectators = roomState.spectators.map(spectator => ({
            _id: spectator.userId,
            username: spectator.username
          }));
        }
      } else {
        // 如果内存中没有数据，从数据库获取
        const spectators = room.spectators || [];
        spectatorCount = spectators.length;
        formattedSpectators = spectators.map(spectator => ({
          _id: spectator.userId,
          username: spectator.username
        }));
      }

      return {
        _id: room.id,
        name: room.name,
        createdBy: {
          _id: room.creator.id,
          username: room.creator.username
        },
        players: formattedPlayers,
        spectators: formattedSpectators, // 返回完整的观战人信息
        gameState: room.gameState,
        maxPlayers: room.maxPlayers,
        isActive: room.isActive,
        createdAt: room.createdAt,
        // 添加准确的实时统计信息
        realTimeStats: {
          playerCount: playerCount,
          spectatorCount: spectatorCount, // 添加观战人数统计
          playerTurns: (() => {
            const playerTurns = {};
            // 从内存中的游戏状态获取每个玩家的回合数
            if (gameRooms && gameRooms.has(room.id.toString())) {
              const roomState = gameRooms.get(room.id.toString());
              if (roomState.players) {
                roomState.players.forEach(player => {
                  playerTurns[player.userId] = player.turnsCompleted || 0;
                });
              }
            }
            // 如果内存中没有数据，从数据库的playerStates获取
            if (Object.keys(playerTurns).length === 0) {
              const playerStates = room.playerStates || {};
              Object.keys(playerStates).forEach(userId => {
                playerTurns[userId] = playerStates[userId].turnsCompleted || 0;
              });
            }
            return playerTurns;
          })()
        }
      };
    });

    res.json(formattedRooms);
  } catch (error) {
    console.error('获取房间列表错误:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

// 创建房间
router.post('/', auth, async (req, res) => {
  try {
    // 验证用户身份
    if (!req.userId || !req.user) {
      console.error('创建房间时用户身份验证失败:', { userId: req.userId, user: req.user });
      return res.status(401).json({ message: '用户身份验证失败' });
    }

    const { name } = req.body;

    console.log(`[CREATE-ROOM] 用户 ${req.user.username}(${req.userId}) 创建房间:`, name);

    const room = await Room.create({
      name,
      createdBy: req.userId,
      players: [{
        userId: req.userId,
        username: req.user.username,
        isReady: false
      }],
      gameState: {
        currentPlayer: 0,
        currentTurn: 0,
        round: 1,
        phase: 'waiting',
        firstPlayer: -1
      }
    });

    const roomWithCreator = await Room.findByPk(room.id, {
      include: [{
        model: User,
        as: 'creator',
        attributes: ['id', 'username']
      }]
    });

    // 验证创建者信息
    if (!roomWithCreator.creator) {
      console.error('房间创建后无法找到创建者信息:', { roomId: room.id, createdBy: req.userId });
      return res.status(500).json({ message: '房间创建失败：无法关联创建者' });
    }

    // 验证创建者ID匹配
    if (roomWithCreator.creator.id !== req.userId) {
      console.error('房间创建者ID不匹配:', { 
        expectedUserId: req.userId, 
        actualCreatorId: roomWithCreator.creator.id,
        roomId: room.id 
      });
      return res.status(500).json({ message: '房间创建失败：创建者信息不匹配' });
    }

    // 格式化返回数据
    const formattedRoom = {
      _id: roomWithCreator.id,
      name: roomWithCreator.name,
      createdBy: {
        _id: roomWithCreator.creator.id,
        username: roomWithCreator.creator.username
      },
      players: roomWithCreator.players.map(player => ({
        user: {
          _id: player.userId,
          username: player.username
        },
        deck: player.deck,
        isReady: player.isReady || false
      })),
      spectators: roomWithCreator.spectators.map(spectator => ({
        _id: spectator.userId,
        username: spectator.username
      })),
      gameState: roomWithCreator.gameState,
      maxPlayers: roomWithCreator.maxPlayers,
      isActive: roomWithCreator.isActive,
      createdAt: roomWithCreator.createdAt
    };

    console.log(`[CREATE-ROOM] 房间创建成功: ${formattedRoom.name}, 创建者: ${formattedRoom.createdBy.username}(${formattedRoom.createdBy._id})`);

    res.status(201).json(formattedRoom);
  } catch (error) {
    console.error('创建房间错误:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

// 加入房间
router.post('/:id/join', auth, async (req, res) => {
  try {
    const { type = 'player' } = req.body; // player 或 spectator

    const room = await Room.findByPk(req.params.id);
    if (!room) {
      return res.status(404).json({ message: '房间不存在' });
    }

    let players = room.players || [];
    let spectators = room.spectators || [];

    if (type === 'player') {
      if (players.length >= room.maxPlayers) {
        return res.status(400).json({ message: '房间已满' });
      }

      const isAlreadyPlayer = players.some(p => p.userId === req.userId);
      
      if (!isAlreadyPlayer) {
        players.push({
          userId: req.userId,
          username: req.user.username,
          isReady: false
        });
      }
    } else {
      const isAlreadySpectator = spectators.some(s => s.userId === req.userId);
      if (!isAlreadySpectator) {
        spectators.push({
          userId: req.userId,
          username: req.user.username
        });
      }
    }

    await room.update({ players, spectators });

    // 同步更新内存中的gameRooms数据
    const gameRooms = req.app.get('gameRooms');
    if (gameRooms && gameRooms.has(room.id.toString())) {
      const roomState = gameRooms.get(room.id.toString());
      if (type === 'spectator') {
        // 更新内存中的观众列表
        const isAlreadyInMemory = roomState.spectators.some(s => s.userId === req.userId);
        if (!isAlreadyInMemory) {
          roomState.spectators.push({
            userId: req.userId,
            username: req.user.username,
            socketId: null // 将在socket连接时更新
          });
        }
      }
    }

    const roomWithCreator = await Room.findByPk(room.id, {
      include: [{
        model: User,
        as: 'creator',
        attributes: ['id', 'username']
      }]
    });

    // 格式化返回数据
    const formattedRoom = {
      _id: roomWithCreator.id,
      name: roomWithCreator.name,
      createdBy: {
        _id: roomWithCreator.creator.id,
        username: roomWithCreator.creator.username
      },
      players: roomWithCreator.players.map(player => ({
        user: {
          _id: player.userId,
          username: player.username
        },
        deck: player.deck,
        isReady: player.isReady || false
      })),
      spectators: roomWithCreator.spectators.map(spectator => ({
        _id: spectator.userId,
        username: spectator.username
      })),
      gameState: roomWithCreator.gameState,
      maxPlayers: roomWithCreator.maxPlayers,
      isActive: roomWithCreator.isActive,
      createdAt: roomWithCreator.createdAt
    };

    res.json(formattedRoom);
  } catch (error) {
    console.error('加入房间错误:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

// 离开房间
router.post('/:id/leave', auth, async (req, res) => {
  try {
    const room = await Room.findByPk(req.params.id);
    if (!room) {
      return res.status(404).json({ message: '房间不存在' });
    }

    let players = room.players || [];
    let spectators = room.spectators || [];

    // 记录用户是否是观众
    const wasSpectator = spectators.some(s => s.userId === req.userId);

    // 从玩家列表中移除
    players = players.filter(p => p.userId !== req.userId);

    // 从观众列表中移除
    spectators = spectators.filter(s => s.userId !== req.userId);

    await room.update({ players, spectators });

    // 同步更新内存中的gameRooms数据
    const gameRooms = req.app.get('gameRooms');
    if (gameRooms && gameRooms.has(room.id.toString())) {
      const roomState = gameRooms.get(room.id.toString());
      if (wasSpectator) {
        // 从内存中的观众列表移除
        roomState.spectators = roomState.spectators.filter(s => s.userId !== req.userId);
      }
    }

    const roomWithCreator = await Room.findByPk(room.id, {
      include: [{
        model: User,
        as: 'creator',
        attributes: ['id', 'username']
      }]
    });

    // 格式化返回数据
    const formattedRoom = {
      _id: roomWithCreator.id,
      name: roomWithCreator.name,
      createdBy: {
        _id: roomWithCreator.creator.id,
        username: roomWithCreator.creator.username
      },
      players: roomWithCreator.players.map(player => ({
        user: {
          _id: player.userId,
          username: player.username
        },
        deck: player.deck,
        isReady: player.isReady || false
      })),
      spectators: roomWithCreator.spectators.map(spectator => ({
        _id: spectator.userId,
        username: spectator.username
      })),
      gameState: roomWithCreator.gameState,
      maxPlayers: roomWithCreator.maxPlayers,
      isActive: roomWithCreator.isActive,
      createdAt: roomWithCreator.createdAt
    };

    res.json(formattedRoom);
  } catch (error) {
    console.error('离开房间错误:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

// 删除房间（创建者或管理员）
router.delete('/:id', auth, async (req, res) => {
  try {
    const room = await Room.findByPk(req.params.id);
    if (!room) {
      return res.status(404).json({ message: '房间不存在' });
    }

    // 检查权限
    if (room.createdBy !== req.userId && !req.user.isAdmin) {
      return res.status(403).json({ message: '无权限删除房间' });
    }

    await room.destroy();
    res.json({ message: '房间已删除' });
  } catch (error) {
    console.error('删除房间错误:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

module.exports = router;
