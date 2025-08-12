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

    // 转换数据格式，使用实时数据
    const formattedRooms = rooms.map(room => {
      // 从positions字段获取实际玩家数量
      const positions = room.positions || {};
      const activePositions = Object.values(positions).filter(pos => pos !== null);
      const playerCount = activePositions.length;

      // 从内存中的gameRooms获取观众数量（如果有的话）
      let spectatorCount = 0;
      if (gameRooms && gameRooms.has(room.id.toString())) {
        const roomState = gameRooms.get(room.id.toString());
        spectatorCount = roomState.spectators ? roomState.spectators.length : 0;
      }

      return {
        _id: room.id,
        name: room.name,
        createdBy: {
          _id: room.creator.id,
          username: room.creator.username
        },
        players: activePositions.map(pos => ({
          user: {
            _id: pos.userId,
            username: pos.username
          },
          deck: null, // 不在列表中显示具体卡组信息
          isReady: false
        })),
        spectators: [], // 观众信息在列表中不显示具体用户
        gameState: room.gameState,
        maxPlayers: room.maxPlayers,
        isActive: room.isActive,
        createdAt: room.createdAt,
        // 添加实时统计信息
        realTimeStats: {
          playerCount: playerCount,
          spectatorCount: spectatorCount
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
      }]
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

    // 从玩家列表中移除
    players = players.filter(p => p.userId !== req.userId);

    // 从观众列表中移除
    spectators = spectators.filter(s => s.userId !== req.userId);

    await room.update({ players, spectators });

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
