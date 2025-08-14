const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Card = sequelize.define('Card', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  category: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  cost: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  attack: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  health: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  effect: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  flavor: {
    type: DataTypes.TEXT,
  },
  image: {
    type: DataTypes.STRING,
  },
  faction: {
    type: DataTypes.STRING,
    defaultValue: 'neutral',
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
  tags: {
    type: DataTypes.JSON,
    defaultValue: [],
    allowNull: true,
  },
}, {
  timestamps: true,
  tableName: 'cards',
});

module.exports = Card;
