const express = require('express');
const { Deck, Card, User } = require('../models');
const { auth } = require('../middleware/auth');

const router = express.Router();

// 获取卡组
router.get('/', auth, async (req, res) => {
  try {
    const { Op } = require('sequelize');
    const decks = await Deck.findAll({
      where: {
        [Op.or]: [
          { isPublic: true },
          { createdBy: req.userId }
        ]
      },
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username']
        },
        {
          model: Card,
          as: 'heroCard',
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    // 转换数据格式以匹配前端期望
    const formattedDecks = await Promise.all(decks.map(async deck => {
      // 获取卡组中的卡牌详情
      const deckCards = deck.cards || [];
      const cardDetails = await Promise.all(
        deckCards.map(async item => {
          const card = await Card.findByPk(item.cardId, {
            include: [{
              model: User,
              as: 'creator',
              attributes: ['id', 'username']
            }]
          });
          return {
            card: {
              _id: card.id,
              name: card.name,
              type: card.type,
              category: card.category,
              cost: card.cost,
              attack: card.attack,
              health: card.health,
              effect: card.effect,
              flavor: card.flavor,
              image: card.image,
              faction: card.faction,
              isPublic: card.isPublic,
              createdBy: {
                _id: card.creator.id,
                username: card.creator.username
              },
              createdAt: card.createdAt
            },
            count: item.count
          };
        })
      );

      return {
        _id: deck.id,
        name: deck.name,
        heroCard: deck.heroCard ? {
          _id: deck.heroCard.id,
          name: deck.heroCard.name,
          type: deck.heroCard.type,
          category: deck.heroCard.category,
          cost: deck.heroCard.cost,
          attack: deck.heroCard.attack,
          health: deck.heroCard.health,
          effect: deck.heroCard.effect,
          flavor: deck.heroCard.flavor,
          image: deck.heroCard.image,
          faction: deck.heroCard.faction,
          isPublic: deck.heroCard.isPublic,
          createdBy: {
            _id: deck.creator.id,
            username: deck.creator.username
          },
          createdAt: deck.heroCard.createdAt
        } : null,
        championCardId: deck.championCardId || deck.championName, // 如果没有championCardId，使用championName
        championDescription: deck.championDescription,
        cards: cardDetails,
        totalCards: deck.totalCards,
        isPublic: deck.isPublic,
        createdBy: {
          _id: deck.creator.id,
          username: deck.creator.username
        },
        createdAt: deck.createdAt
      };
    }));

    // 将用户自己的卡组置顶
    const userDecks = formattedDecks.filter(deck => deck.createdBy._id === req.userId);
    const otherDecks = formattedDecks.filter(deck => deck.createdBy._id !== req.userId);

    res.json([...userDecks, ...otherDecks]);
  } catch (error) {
    console.error('获取卡组错误:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

// 创建卡组
router.post('/', auth, async (req, res) => {
  try {
    const { name, cards } = req.body;

    // 验证传入的卡牌ID是否有效，并获取完整的卡牌对象
    const validCards = [];
    for (const item of cards) {
      const card = await Card.findByPk(parseInt(item.card._id));
      if (!card) {
        return res.status(400).json({ message: `卡牌ID ${item.card._id} 无效或不存在` });
      }
      validCards.push({ card: card, count: item.count });
    }

    // 处理卡牌数据，使用已验证的卡牌ID
    const processedCards = validCards.map(item => ({
      cardId: item.card.id,
      count: item.count
    }));

    // 计算卡组总数
    const totalCards = processedCards.reduce((sum, item) => sum + item.count, 0);

    // 找到第一张卡作为heroCard（为了兼容现有数据结构）
    let heroCardId = null;
    
    // 首先尝试找主角卡
    for (const item of validCards) { // 使用 validCards
      if (item.card.type === 'hero') { // 直接访问 item.card.type
        heroCardId = item.card.id;
        break;
      }
    }
    
    // 如果没有主角卡，使用第一张卡作为默认
    if (!heroCardId && validCards.length > 0) { // 使用 validCards.length
      heroCardId = validCards[0].card.id; // 直接访问 item.card.id
    }
    
    // 如果还是没有卡牌，返回错误
    if (!heroCardId) {
      return res.status(400).json({ message: '卡组中必须至少包含一张卡牌' });
    }

    // 验证 championCardId 是否有效（如果提供了的话）
    let validChampionCardId = null;
    let championName = null;
    
    if (req.body.championCardId) {
      // 检查是否是有效的卡牌ID
      const championCard = await Card.findByPk(req.body.championCardId);
      if (championCard) {
        validChampionCardId = req.body.championCardId;
      } else {
        // 如果不是卡牌ID，可能是主战者阵营ID，存储在championName字段中
        console.log(`主战者ID ${req.body.championCardId} 不是有效的卡牌ID，作为阵营ID存储在championName字段`);
        championName = req.body.championCardId;
        validChampionCardId = null;
      }
    }
    
    const deck = await Deck.create({
      name,
      heroCardId: heroCardId,
      championCardId: validChampionCardId,
      championName: championName,
      championDescription: req.body.championDescription || null,
      cards: processedCards,
      totalCards,
      createdBy: req.userId,
      isPublic: req.body.isPublic || false
    });

    // 获取完整的卡组信息返回
    const fullDeck = await Deck.findByPk(deck.id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username']
        },
        {
          model: Card,
          as: 'heroCard',
        }
      ]
    });

    // 格式化返回数据
    const cardDetails = await Promise.all(
      fullDeck.cards.map(async item => {
        const card = await Card.findByPk(item.cardId, {
          include: [{
            model: User,
            as: 'creator',
            attributes: ['id', 'username']
          }]
        });
        return {
          card: {
            _id: card.id,
            name: card.name,
            type: card.type,
            category: card.category,
            cost: card.cost,
            attack: card.attack,
            health: card.health,
            effect: card.effect,
            flavor: card.flavor,
            image: card.image,
            faction: card.faction,
            isPublic: card.isPublic,
            createdBy: {
              _id: card.creator.id,
              username: card.creator.username
            },
            createdAt: card.createdAt
          },
          count: item.count
        };
      })
    );

    const formattedDeck = {
      _id: fullDeck.id,
      name: fullDeck.name,
      heroCard: fullDeck.heroCard ? {
        _id: fullDeck.heroCard.id,
        name: fullDeck.heroCard.name,
        type: fullDeck.heroCard.type,
        category: fullDeck.heroCard.category,
        cost: fullDeck.heroCard.cost,
        attack: fullDeck.heroCard.attack,
        health: fullDeck.heroCard.health,
        effect: fullDeck.heroCard.effect,
        flavor: fullDeck.heroCard.flavor,
        image: fullDeck.heroCard.image,
        faction: fullDeck.heroCard.faction,
        isPublic: fullDeck.heroCard.isPublic,
        createdBy: {
          _id: fullDeck.creator.id,
          username: fullDeck.creator.username
        },
        createdAt: fullDeck.heroCard.createdAt
      } : null,
      championCardId: fullDeck.championCardId || fullDeck.championName, // 如果没有championCardId，使用championName
      championDescription: fullDeck.championDescription,
      cards: cardDetails,
      totalCards: fullDeck.totalCards,
      isPublic: fullDeck.isPublic,
      createdBy: {
        _id: fullDeck.creator.id,
        username: fullDeck.creator.username
      },
      createdAt: fullDeck.createdAt
    };

    res.status(201).json(formattedDeck);
  } catch (error) {
    console.error('创建卡组错误:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

// 更新卡组
router.put('/:id', auth, async (req, res) => {
  try {
    const deck = await Deck.findOne({
      where: {
        id: req.params.id,
        createdBy: req.userId
      }
    });

    if (!deck) {
      return res.status(404).json({ message: '卡组不存在或无权限修改' });
    }

    const { name, heroCard, cards, isPublic, championCardId, championDescription } = req.body;
    
    // 处理卡牌数据
    let processedCards = cards;
    if (cards && Array.isArray(cards)) {
      processedCards = cards.map(item => ({
        cardId: parseInt(item.card._id),
        count: item.count
      }));
    }

    const updateData = {
      name,
      isPublic
    };

    if (heroCard) {
      updateData.heroCardId = parseInt(heroCard);
    }

    if (championCardId !== undefined) {
      // 验证 championCardId 是否有效（如果提供了的话）
      let validChampionCardId = null;
      let championName = null;
      
      if (championCardId) {
        // 检查是否是有效的卡牌ID
        const championCard = await Card.findByPk(championCardId);
        if (championCard) {
          validChampionCardId = championCardId;
        } else {
          // 如果不是卡牌ID，可能是主战者阵营ID，存储在championName字段中
          console.log(`更新卡组时，主战者ID ${championCardId} 不是有效的卡牌ID，作为阵营ID存储在championName字段`);
          championName = championCardId;
          validChampionCardId = null;
        }
      }
      
      updateData.championCardId = validChampionCardId;
      updateData.championName = championName;
    }

    if (championDescription !== undefined) { // 确保这里是正确的检查
      updateData.championDescription = championDescription;
    }

    if (processedCards) {
      updateData.cards = processedCards;
      updateData.totalCards = processedCards.reduce((sum, item) => sum + item.count, 0);
    }

    await deck.update(updateData);
    
    // 返回更新后的卡组
    const updatedDeck = await Deck.findByPk(deck.id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username']
        },
        {
          model: Card,
          as: 'heroCard',
        }
      ]
    });

    res.json({ message: '卡组更新成功', deck: updatedDeck });
  } catch (error) {
    console.error('更新卡组错误:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

// 删除卡组
router.delete('/:id', auth, async (req, res) => {
  try {
    let whereClause = { id: req.params.id };

    // 如果用户不是管理员，则限制只能删除自己创建的卡组
    if (!req.user.isAdmin) {
      whereClause.createdBy = req.userId;
    }

    const deck = await Deck.findOne({
      where: whereClause
    });

    if (!deck) {
      return res.status(404).json({ message: '卡组不存在或无权限删除' });
    }

    await deck.destroy();
    res.json({ message: '卡组已删除' });
  } catch (error) {
    console.error('删除卡组错误:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

module.exports = router;
