const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Room = sequelize.define('Room', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  players: {
    type: DataTypes.TEXT, // JSON字符串存储玩家列表
    defaultValue: '[]',
    get() {
      const rawValue = this.getDataValue('players');
      return rawValue ? JSON.parse(rawValue) : [];
    },
    set(value) {
      this.setDataValue('players', JSON.stringify(value));
    },
  },
  spectators: {
    type: DataTypes.TEXT, // JSON字符串存储观众列表
    defaultValue: '[]',
    get() {
      const rawValue = this.getDataValue('spectators');
      return rawValue ? JSON.parse(rawValue) : [];
    },
    set(value) {
      this.setDataValue('spectators', JSON.stringify(value));
    },
  },
  gameState: {
    type: DataTypes.TEXT, // JSON字符串存储游戏状态
    defaultValue: JSON.stringify({
      currentPlayer: 0,
      currentTurn: 0,
      round: 1,
      phase: 'waiting',
      firstPlayer: -1,
      gameBoard: {
        playerCards: [],
        effectCards: []
      }
    }),
    get() {
      const rawValue = this.getDataValue('gameState');
      return rawValue ? JSON.parse(rawValue) : {
        currentPlayer: 0,
        currentTurn: 0,
        round: 1,
        phase: 'waiting',
        firstPlayer: -1,
        gameBoard: {
          playerCards: [],
          effectCards: []
        }
      };
    },
    set(value) {
      this.setDataValue('gameState', JSON.stringify(value));
    },
  },
  // 玩家游戏状态持久化
  playerStates: {
    type: DataTypes.TEXT, // JSON字符串存储所有玩家的详细游戏状态
    defaultValue: JSON.stringify({}),
    get() {
      const rawValue = this.getDataValue('playerStates');
      return rawValue ? JSON.parse(rawValue) : {};
    },
    set(value) {
      this.setDataValue('playerStates', JSON.stringify(value));
    },
  },
  // 房间位置状态
  positions: {
    type: DataTypes.TEXT, // JSON字符串存储位置信息
    defaultValue: JSON.stringify({ 
      position1: null, // { userId, username, isActive }
      position2: null 
    }),
    get() {
      const rawValue = this.getDataValue('positions');
      return rawValue ? JSON.parse(rawValue) : { 
        position1: null, 
        position2: null 
      };
    },
    set(value) {
      this.setDataValue('positions', JSON.stringify(value));
    },
  },
  // 游戏日志持久化存储
  gameLog: {
    type: DataTypes.TEXT, // JSON字符串存储游戏日志数组
    defaultValue: JSON.stringify([]),
    get() {
      const rawValue = this.getDataValue('gameLog');
      return rawValue ? JSON.parse(rawValue) : [];
    },
    set(value) {
      this.setDataValue('gameLog', JSON.stringify(value));
    },
  },
  maxPlayers: {
    type: DataTypes.INTEGER,
    defaultValue: 2,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  isLocked: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  timestamps: true,
  tableName: 'rooms',
});

module.exports = Room;
