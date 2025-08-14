const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const sequelize = require('sequelize');
const { Card, User, Deck } = require('../models'); // 引入 Deck 模型
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

// 获取所有卡牌（支持分页）
router.get('/', auth, async (req, res) => {
  try {
    const { Op } = require('sequelize');
    
    // 获取分页参数
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || null;
    const offset = limit ? (page - 1) * limit : 0;
    
    // 获取搜索参数
    const search = req.query.search || '';
    const type = req.query.type || '';
    const category = req.query.category || '';
    const faction = req.query.faction || '';
    const cost = req.query.cost || ''; // 添加费用筛选参数
    const createdBy = req.query.createdBy || '';
    
    // 获取排序参数
    const sortBy = req.query.sortBy || 'createdAt';
    const sortDirection = req.query.sortDirection || 'DESC';
    
    // 构建查询条件
    let conditions = [
      {
        [Op.or]: [
          { isPublic: true },
          { createdBy: req.userId }
        ]
      }
    ];
    
    // 添加搜索条件
    if (search) {
      conditions.push({
        [Op.or]: [
          { name: { [Op.like]: `%${search}%` } },
          { effect: { [Op.like]: `%${search}%` } },
          { category: { [Op.like]: `%${search}%` } }
        ]
      });
    }
    
    if (type) {
      conditions.push({ type: type });
    }
    
    if (category) {
      conditions.push({ category: { [Op.like]: `%${category}%` } });
    }
    
    if (faction) {
      conditions.push({ faction: faction });
    }
    
    if (cost) {
      conditions.push({ cost: cost });
    }
    
    if (createdBy) {
      conditions.push({ createdBy: createdBy });
    }

    let whereClause = {
      [Op.and]: conditions
    };

    // 构建排序条件
    let orderClause;
    if (sortBy && sortBy !== 'none') {
      const direction = sortDirection.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
      
      // 处理特殊的排序字段
      switch (sortBy) {
        case 'cost':
          // 费用排序：简单按字符串排序（数据库会自动处理数字排序）
          orderClause = [['cost', direction]];
          break;
        case 'name':
          orderClause = [['name', direction]];
          break;
        case 'faction':
          orderClause = [['faction', direction]];
          break;
        default:
          orderClause = [['createdAt', 'DESC']];
      }
    } else {
      orderClause = [['createdAt', 'DESC']];
    }

    // 如果有排序需求，需要先获取所有数据进行排序，再分页
    let cards, count;
    
    if (sortBy && sortBy !== 'none') {
      // 获取所有符合条件的卡牌进行排序
      const allCards = await Card.findAll({
        where: whereClause,
        include: [{
          model: User,
          as: 'creator',
          attributes: ['id', 'username']
        }],
        order: orderClause
      });
      
      count = allCards.length;
      
      // 手动分页
      if (limit) {
        cards = allCards.slice(offset, offset + limit);
      } else {
        cards = allCards;
      }
    } else {
      // 没有排序时使用原来的分页查询
      const result = await Card.findAndCountAll({
        where: whereClause,
        include: [{
          model: User,
          as: 'creator',
          attributes: ['id', 'username']
        }],
        order: orderClause,
        limit: limit,
        offset: offset
      });
      count = result.count;
      cards = result.rows;
    }


    // 转换数据格式以匹配前端期望
    const formattedCards = cards.map(card => ({
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
      tags: card.tags || [],
      createdBy: {
        _id: card.creator.id,
        username: card.creator.username
      },
      createdAt: card.createdAt
    }));

    // 计算分页信息
    const totalPages = limit ? Math.ceil(count / limit) : 1;
    const hasNextPage = limit ? page < totalPages : false;
    const hasPrevPage = page > 1;

    res.json({
      cards: formattedCards,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalItems: count,
        itemsPerPage: limit || count,
        hasNextPage: hasNextPage,
        hasPrevPage: hasPrevPage
      }
    });
  } catch (error) {
    console.error('获取卡牌错误:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

// 创建卡牌
router.post('/', auth, adminAuth, async (req, res) => {
  try {
    // 验证用户身份
    if (!req.userId || !req.user) {
      console.error('创建卡牌时用户身份验证失败:', { userId: req.userId, user: req.user });
      return res.status(401).json({ message: '用户身份验证失败' });
    }

    const cardData = {
      ...req.body,
      createdBy: req.userId
    };

    console.log(`[CREATE-CARD] 用户 ${req.user.username}(${req.userId}) 创建卡牌:`, cardData.name);

    const card = await Card.create(cardData);
    const cardWithCreator = await Card.findByPk(card.id, {
      include: [{
        model: User,
        as: 'creator',
        attributes: ['id', 'username']
      }]
    });

    // 验证创建者信息
    if (!cardWithCreator.creator) {
      console.error('卡牌创建后无法找到创建者信息:', { cardId: card.id, createdBy: req.userId });
      return res.status(500).json({ message: '卡牌创建失败：无法关联创建者' });
    }

    // 验证创建者ID匹配
    if (cardWithCreator.creator.id !== req.userId) {
      console.error('卡牌创建者ID不匹配:', { 
        expectedUserId: req.userId, 
        actualCreatorId: cardWithCreator.creator.id,
        cardId: card.id 
      });
      return res.status(500).json({ message: '卡牌创建失败：创建者信息不匹配' });
    }

    // 转换数据格式
    const formattedCard = {
      _id: cardWithCreator.id,
      name: cardWithCreator.name,
      type: cardWithCreator.type,
      category: cardWithCreator.category,
      cost: cardWithCreator.cost,
      attack: cardWithCreator.attack,
      health: cardWithCreator.health,
      effect: cardWithCreator.effect,
      flavor: cardWithCreator.flavor,
      image: cardWithCreator.image,
      faction: cardWithCreator.faction,
      isPublic: cardWithCreator.isPublic,
      tags: cardWithCreator.tags || [],
      createdBy: {
        _id: cardWithCreator.creator.id,
        username: cardWithCreator.creator.username
      },
      createdAt: cardWithCreator.createdAt
    };

    console.log(`[CREATE-CARD] 卡牌创建成功: ${formattedCard.name}, 创建者: ${formattedCard.createdBy.username}(${formattedCard.createdBy._id})`);

    res.status(201).json(formattedCard);
  } catch (error) {
    console.error('创建卡牌错误:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

// 更新卡牌
router.put('/:id', auth, async (req, res) => {
  try {
    const card = await Card.findOne({
      where: {
        id: req.params.id,
        createdBy: req.userId
      }
    });

    if (!card) {
      return res.status(404).json({ message: '卡牌不存在或无权限修改' });
    }

    await card.update(req.body);
    const updatedCard = await Card.findByPk(card.id, {
      include: [{
        model: User,
        as: 'creator',
        attributes: ['id', 'username']
      }]
    });

    // 转换数据格式
    const formattedCard = {
      _id: updatedCard.id,
      name: updatedCard.name,
      type: updatedCard.type,
      category: updatedCard.category,
      cost: updatedCard.cost,
      attack: updatedCard.attack,
      health: updatedCard.health,
      effect: updatedCard.effect,
      flavor: updatedCard.flavor,
      image: updatedCard.image,
      faction: updatedCard.faction,
      isPublic: updatedCard.isPublic,
      tags: updatedCard.tags || [],
      createdBy: {
        _id: updatedCard.creator.id,
        username: updatedCard.creator.username
      },
      createdAt: updatedCard.createdAt
    };

    res.json(formattedCard);
  } catch (error) {
    console.error('更新卡牌错误:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

// 删除卡牌
router.delete('/:id', auth, async (req, res) => {
  try {
    let whereClause = { id: req.params.id };

    // 如果用户不是管理员，则限制只能删除自己创建的卡牌
    if (!req.user.isAdmin) {
      whereClause.createdBy = req.userId;
    }

    const card = await Card.findOne({
      where: whereClause
    });

    if (!card) {
      return res.status(404).json({ message: '卡牌不存在或无权限删除' });
    }

    // 在删除卡牌之前，检查并解除所有对该卡牌的引用
    try {
      // 1. 检查 Deck 的 heroCardId - 使用安全的更新方式
      const decksWithHeroCard = await Deck.findAll({
        where: { heroCardId: req.params.id }
      });
      
      for (const deck of decksWithHeroCard) {
        await deck.update({ heroCardId: null });
      }

      // 2. 检查 Deck 的 championCardId - 使用安全的更新方式
      const decksWithChampionCard = await Deck.findAll({
        where: { championCardId: req.params.id }
      });
      
      for (const deck of decksWithChampionCard) {
        await deck.update({ championCardId: null });
      }

      // 3. 检查 Deck 的 cards 数组 (JSONB/TEXT 字段)
      // 获取所有卡组并检查其 cards 数组
      const allDecks = await Deck.findAll();
      
      for (const deck of allDecks) {
        let needsUpdate = false;
        let updatedCards = [];
        
        // 检查 cards 数组中是否包含要删除的卡牌
        if (deck.cards && Array.isArray(deck.cards)) {
          updatedCards = deck.cards.filter(cardData => {
            // 检查不同的可能字段名
            const cardId = cardData.cardId || cardData.card?._id || cardData.card?.id;
            if (cardId && cardId.toString() === req.params.id.toString()) {
              needsUpdate = true;
              return false; // 过滤掉这个卡牌
            }
            return true;
          });
          
          if (needsUpdate) {
            await deck.update({ cards: updatedCards });
          }
        }
      }
    } catch (updateError) {
      console.error('更新卡组引用时出错:', updateError);
      // 继续删除卡牌，但记录错误
    }

    await card.destroy();
    res.json({ message: '卡牌已删除' });
  } catch (error) {
    console.error('删除卡牌错误:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

// 配置文件上传
const upload = multer({ dest: 'uploads/' });

// 批量导入卡牌
router.post('/batch-import', auth, adminAuth, upload.single('csvFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: '请上传CSV文件' });
    }

    const overwriteMode = req.body.overwriteMode === 'true'; // 获取覆盖模式参数

    const results = [];
    const errors = [];
    let processedCount = 0;
    let successCount = 0;

    // 如果是覆盖模式，先删除当前用户创建的所有卡牌
    let oldCards = [];
    if (overwriteMode) {
      // 1. 获取即将被删除的卡牌ID和名称，用于后续智能替换
      oldCards = await Card.findAll({
        where: { createdBy: req.userId },
        attributes: ['id', 'name']
      });

      // 2. 删除当前用户创建的所有卡牌
      await Card.destroy({
        where: { createdBy: req.userId }
      });
    }

    // 读取CSV文件
    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on('data', (data) => {
        results.push(data);
      })
      .on('end', async () => {
        try {
          const newCardsCreated = []; // 收集新创建的卡牌

          // 处理每一行数据
          for (const row of results) {
            processedCount++;
            
            try {
              // 支持中文和英文字段名，处理BOM字符问题
              const name = row['卡牌名称'] || row['﻿卡牌名称'] || row.name;
              const type = row['类型'] || row.type;
              const category = row['类别'] || row.category;
              const cost = row['费用'] || row.cost;
              const effect = row['效果'] || row.effect;
              const attack = row['攻击力'] || row.attack;
              const health = row['生命值'] || row.health;
              const flavor = row['风味文本'] || row.flavor;
              const image = row['图片'] || row.image;
              const faction = row['主战者'] || row.faction || 'neutral';
              const isPublic = row['是否公开'] || row.isPublic;

              // 验证必填字段
              if (!name || !type || !category || !cost || !effect) {
                errors.push({
                  row: processedCount,
                  error: '缺少必填字段：卡牌名称, 类型, 类别, 费用, 效果'
                });
                continue;
              }

              // 创建卡牌数据
              const cardData = {
                name: name.trim(),
                type: type,
                category: category.trim(),
                cost: cost.trim(),
                attack: parseInt(attack) || 0,
                health: parseInt(health) || 0,
                effect: effect.trim(),
                flavor: flavor ? flavor.trim() : null,
                image: image ? image.trim() : null,
                faction: faction,
                isPublic: isPublic ? isPublic.toLowerCase() === 'true' : true, // 默认设置为公开
                createdBy: req.userId
              };

              // 创建卡牌
              const newCard = await Card.create(cardData);
              newCardsCreated.push(newCard); // 收集新创建的卡牌
              successCount++;

            } catch (error) {
              errors.push({
                row: processedCount,
                data: row,
                error: error.message
              });
            }
          }

          // 3. 如果是覆盖模式且有旧卡牌被删除，则进行智能替换
          if (overwriteMode && oldCards.length > 0) {
            try {
              // 创建旧卡牌ID到名称的映射
              const oldCardIdToNameMap = new Map(oldCards.map(card => [card.id, card.name]));
              // 创建新卡牌名称到ID的映射
              const newCardNameToIdMap = new Map(newCardsCreated.map(card => [card.name, card.id]));

              // 获取所有可能受影响的卡组（不仅仅是当前用户的卡组）
              const allDecks = await Deck.findAll();

              for (const deck of allDecks) {
                let needsUpdate = false;
                const updates = {};

                // 更新 heroCardId
                if (deck.heroCardId && oldCardIdToNameMap.has(deck.heroCardId)) {
                  const oldCardName = oldCardIdToNameMap.get(deck.heroCardId);
                  if (newCardNameToIdMap.has(oldCardName)) {
                    updates.heroCardId = newCardNameToIdMap.get(oldCardName);
                    needsUpdate = true;
                  } else {
                    updates.heroCardId = null; // 如果没有同名新卡牌，则置空
                    needsUpdate = true;
                  }
                }

                // 更新 championCardId
                if (deck.championCardId && oldCardIdToNameMap.has(deck.championCardId)) {
                  const oldCardName = oldCardIdToNameMap.get(deck.championCardId);
                  if (newCardNameToIdMap.has(oldCardName)) {
                    updates.championCardId = newCardNameToIdMap.get(oldCardName);
                    needsUpdate = true;
                  } else {
                    updates.championCardId = null; // 如果没有同名新卡牌，则置空
                    needsUpdate = true;
                  }
                }

                // 更新 cards 数组
                if (deck.cards && Array.isArray(deck.cards)) {
                  const originalCardsLength = deck.cards.length;
                  const updatedCards = deck.cards.map(cardData => {
                    const cardId = cardData.cardId || cardData.card?._id || cardData.card?.id || cardData._id;
                    if (cardId && oldCardIdToNameMap.has(parseInt(cardId))) {
                      const oldCardName = oldCardIdToNameMap.get(parseInt(cardId));
                      if (newCardNameToIdMap.has(oldCardName)) {
                        // 更新为新卡牌ID
                        return { ...cardData, cardId: newCardNameToIdMap.get(oldCardName) };
                      } else {
                        return null; // 没有同名新卡牌，标记为移除
                      }
                    }
                    return cardData;
                  }).filter(Boolean); // 过滤掉 null 值

                  if (updatedCards.length !== originalCardsLength || updatedCards.some((card, index) => 
                    deck.cards[index] && (card.cardId !== deck.cards[index].cardId))) {
                    updates.cards = updatedCards;
                    needsUpdate = true;
                  }
                }

                if (needsUpdate) {
                  try {
                    await deck.update(updates);
                  } catch (updateError) {
                    console.error(`更新卡组 ${deck.id} 时出错:`, updateError);
                  }
                }
              }
            } catch (smartReplaceError) {
              console.error('智能替换过程中出错:', smartReplaceError);
            }
          }

          // 删除临时文件
          fs.unlinkSync(req.file.path);

          // 返回结果
          res.json({
            message: '批量导入完成',
            total: processedCount,
            success: successCount,
            failed: processedCount - successCount,
            errors: errors
          });

        } catch (error) {
          // 删除临时文件
          if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
          }
          console.error('批量导入错误:', error);
          res.status(500).json({ message: '服务器错误', error: error.message });
        }
      })
      .on('error', (error) => {
        // 删除临时文件
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        console.error('CSV解析错误:', error);
        res.status(500).json({ message: 'CSV解析错误', error: error.message });
      });

  } catch (error) {
    console.error('批量导入错误:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

// 下载卡牌导入模板
router.get('/import-template', auth, (req, res) => {
  const template = `卡牌名称,类型,类别,费用,攻击力,生命值,效果,风味文本,图片,主战者,是否公开
示例卡牌1,character,战士,1,2,3,这是一个示例效果,这是风味文本,image1.jpg,champion1,true
示例卡牌2,story,法术,2,0,0,造成2点伤害,,image2.jpg,neutral,false
示例卡牌3,hero,英雄,3,4,5,英雄技能,,image3.jpg,champion2,true`;

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename=card_import_template.csv');
  res.send('\uFEFF' + template); // 添加BOM以确保Excel正确显示中文
});

module.exports = router;
