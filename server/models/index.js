const User = require('./User');
const Card = require('./Card');
const Deck = require('./Deck');
const Room = require('./Room');
const Config = require('./Config');

// 定义模型关联
User.hasMany(Card, { foreignKey: 'createdBy', as: 'cards' });
Card.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

User.hasMany(Deck, { foreignKey: 'createdBy', as: 'decks' });
Deck.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

Card.hasMany(Deck, { foreignKey: 'heroCardId', as: 'decksAsHero' });
Deck.belongsTo(Card, { foreignKey: 'heroCardId', as: 'heroCard' });

User.hasMany(Room, { foreignKey: 'createdBy', as: 'rooms' });
Room.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

module.exports = {
  User,
  Card,
  Deck,
  Room,
  Config,
};
