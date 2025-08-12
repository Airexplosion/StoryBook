const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const DeckFavorite = sequelize.define('DeckFavorite', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  deckId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'decks',
      key: 'id',
    },
  },
}, {
  timestamps: true,
  tableName: 'deck_favorites',
  indexes: [
    {
      unique: true,
      fields: ['userId', 'deckId']
    }
  ]
});

module.exports = DeckFavorite;
