const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const { Card, User, Deck } = require('../models'); // 引入 Deck 模型
const { auth } = require('../middleware/auth');

const router = express.Router();

// 获取所有卡牌
router.get('/', auth, async (req, res) => {
  try {
    const { Op } = require('sequelize');
    const cards = await Card.findAll({
      where: {
        [Op.or]: [
          { isPublic: true },
          { createdBy: req.userId }
        ]
      },
      include: [{
        model: User,
        as: 'creator',
        attributes: ['id', 'username']
      }],
      order: [['createdAt', 'DESC']]
    });

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
      createdBy: {
        _id: card.creator.id,
        username: card.creator.username
      },
      createdAt: card.createdAt
    }));

    res.json(formattedCards);
  } catch (error) {
    console.error('获取卡牌错误:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

// 创建卡牌
router.post('/', auth, async (req, res) => {
  try {
    const cardData = {
      ...req.body,
      createdBy: req.userId
    };

    const card = await Card.create(cardData);
    const cardWithCreator = await Card.findByPk(card.id, {
      include: [{
        model: User,
        as: 'creator',
        attributes: ['id', 'username']
      }]
    });

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
      createdBy: {
        _id: cardWithCreator.creator.id,
        username: cardWithCreator.creator.username
      },
      createdAt: cardWithCreator.createdAt
    };

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
router.post('/batch-import', auth, upload.single('csvFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: '请上传CSV文件' });
    }

    const results = [];
    const errors = [];
    let processedCount = 0;
    let successCount = 0;

    // 读取CSV文件
    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on('data', (data) => {
        results.push(data);
      })
      .on('end', async () => {
        try {
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
                  data: row,
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
                isPublic: isPublic ? isPublic.toLowerCase() === 'true' : false,
                createdBy: req.userId
              };

              // 创建卡牌
              await Card.create(cardData);
              successCount++;

            } catch (error) {
              errors.push({
                row: processedCount,
                data: row,
                error: error.message
              });
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
