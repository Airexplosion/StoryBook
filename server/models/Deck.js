const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Deck = sequelize.define('Deck', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  heroCardId: {
    type: DataTypes.INTEGER,
    allowNull: true, // 改为可为空，因为现在会从卡组中选择
    references: {
      model: 'cards',
      key: 'id',
    },
  },
  championCardId: {
    type: DataTypes.INTEGER,
    allowNull: true, // 主战者卡牍ID
    references: {
      model: 'cards',
      key: 'id',
    },
  },
  championName: {
    type: DataTypes.STRING,
    allowNull: true, // 主战者名称
  },
  championDescription: {
    type: DataTypes.TEXT,
    allowNull: true, // 主战者描述
  },
  cards: {
    type: DataTypes.TEXT, // JSON字符串存储卡牌列表
    allowNull: false,
    get() {
      const rawValue = this.getDataValue('cards');
      return rawValue ? JSON.parse(rawValue) : [];
    },
    set(value) {
      this.setDataValue('cards', JSON.stringify(value));
    },
  },
  totalCards: {
    type: DataTypes.INTEGER,
    defaultValue: 40,
  },
  isPublic: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
}, {
  timestamps: true,
  tableName: 'decks',
});

module.exports = Deck;