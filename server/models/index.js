const User = require('./User');
const Card = require('./Card');
const Deck = require('./Deck');
const Room = require('./Room');
const Config = require('./Config');
const DeckFavorite = require('./DeckFavorite');

// 定义模型关联
User.hasMany(Card, { foreignKey: 'createdBy', as: 'cards' });
Card.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

User.hasMany(Deck, { foreignKey: 'createdBy', as: 'decks' });
Deck.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

Card.hasMany(Deck, { foreignKey: 'heroCardId', as: 'decksAsHero' });
Deck.belongsTo(Card, { foreignKey: 'heroCardId', as: 'heroCard' });

User.hasMany(Room, { foreignKey: 'createdBy', as: 'rooms' });
Room.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

// 收藏关联
User.hasMany(DeckFavorite, { foreignKey: 'userId', as: 'favorites' });
DeckFavorite.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Deck.hasMany(DeckFavorite, { foreignKey: 'deckId', as: 'favorites' });
DeckFavorite.belongsTo(Deck, { foreignKey: 'deckId', as: 'deck' });

module.exports = {
  User,
  Card,
  Deck,
  Room,
  Config,
  DeckFavorite,
};
