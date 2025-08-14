const express = require('express');
const { Card, User, Config } = require('../models');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

// 导出所有卡牌数据（CSV格式）
router.get('/cards', auth, adminAuth, async (req, res) => {
  try {
    // 获取所有卡牌数据
    const cards = await Card.findAll({
      include: [{
        model: User,
        as: 'creator',
        attributes: ['id', 'username']
      }],
      order: [['createdAt', 'ASC']]
    });

    // 构建CSV内容
    const csvHeader = '卡牌名称,类型,类别,费用,攻击力,生命值,效果,风味文本,图片,主战者,是否公开';
    const csvRows = cards.map(card => {
      // 处理可能包含逗号或换行的字段
      const escapeCSVField = (field) => {
        if (!field) return '';
        const str = String(field);
        if (str.includes(',') || str.includes('\n') || str.includes('"')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      return [
        escapeCSVField(card.name),
        escapeCSVField(card.type),
        escapeCSVField(card.category),
        escapeCSVField(card.cost),
        card.attack || 0,
        card.health || 0,
        escapeCSVField(card.effect),
        escapeCSVField(card.flavor || ''),
        escapeCSVField(card.image || ''),
        escapeCSVField(card.faction || 'neutral'),
        card.isPublic ? 'true' : 'false'
      ].join(',');
    });

    const csvContent = [csvHeader, ...csvRows].join('\n');

    // 设置响应头
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=cards_export.csv');
    
    // 添加BOM以确保Excel正确显示中文
    res.send('\uFEFF' + csvContent);

  } catch (error) {
    console.error('导出卡牌错误:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

// 导出主战者配置数据（CSV格式）
router.get('/heroes', auth, adminAuth, async (req, res) => {
  try {
    // 获取主战者配置
    const factionConfig = await Config.findOne({
      where: { configKey: 'factions' }
    });

    let factions = [];
    if (factionConfig && factionConfig.configValue) {
      factions = factionConfig.configValue;
    }

    // 构建CSV内容
    const csvHeader = '主战者名称,描述,标签,图片';
    const csvRows = factions.map(faction => {
      // 处理可能包含逗号或换行的字段
      const escapeCSVField = (field) => {
        if (!field) return '';
        const str = String(field);
        if (str.includes(',') || str.includes('\n') || str.includes('"')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      // 处理标签数组
      const tagsString = Array.isArray(faction.tags) ? faction.tags.join(',') : '';

      return [
        escapeCSVField(faction.name || faction.id),
        escapeCSVField(faction.description || ''),
        escapeCSVField(tagsString),
        escapeCSVField(faction.image || '')
      ].join(',');
    });

    const csvContent = [csvHeader, ...csvRows].join('\n');

    // 设置响应头
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=heroes_export.csv');
    
    // 添加BOM以确保Excel正确显示中文
    res.send('\uFEFF' + csvContent);

  } catch (error) {
    console.error('导出主战者错误:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

// 导出所有数据（JSON格式，包含完整的数据库信息）
router.get('/all', auth, adminAuth, async (req, res) => {
  try {
    // 获取所有卡牌数据
    const cards = await Card.findAll({
      include: [{
        model: User,
        as: 'creator',
        attributes: ['id', 'username']
      }],
      order: [['createdAt', 'ASC']]
    });

    // 获取主战者配置
    const factionConfig = await Config.findOne({
      where: { configKey: 'factions' }
    });

    let factions = [];
    if (factionConfig && factionConfig.configValue) {
      factions = factionConfig.configValue;
    }

    // 构建导出数据
    const exportData = {
      exportInfo: {
        exportTime: new Date().toISOString(),
        version: '1.0',
        totalCards: cards.length,
        totalHeroes: factions.length
      },
      cards: cards.map(card => ({
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
        createdBy: card.creator.username,
        createdAt: card.createdAt
      })),
      heroes: factions.map(faction => ({
        name: faction.name || faction.id,
        description: faction.description || '',
        tags: faction.tags || [],
        image: faction.image || ''
      }))
    };

    // 设置响应头
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=database_export.json');
    
    res.json(exportData);

  } catch (error) {
    console.error('导出所有数据错误:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

module.exports = router;
