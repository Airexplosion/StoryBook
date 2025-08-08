const express = require('express');
const { Card, Config } = require('../models');
const { auth } = require('../middleware/auth');
const { sequelize } = require('../config/database');

const router = express.Router();

// 获取卡牌类型、阵营和类别的可选值
router.get('/card-options', auth, async (req, res) => {
  try {
    // 默认配置数据
    const defaultConfig = {
      factions: [
        { id: 'neutral', name: '中立' },
        { id: 'hero1', name: '主角1专属' },
        { id: 'hero2', name: '主角2专属' },
        { id: 'hero3', name: '主角3专属' }
      ],
      types: [
        { id: 'story', name: '故事牌' },
        { id: 'character', name: '配角牌' },
        { id: 'hero', name: '主角牌' }
      ],
      categories: {
        story: [
          { id: 'event', name: '事件', description: '需要支付费用主动使用' },
          { id: 'background', name: '背景', description: '加入手中时自动使用' }
        ],
        character: [
          { id: 'character', name: '配角', description: '进入故事后才会成为实体单位' }
        ],
        hero: [
          { id: 'hero', name: '主角', description: '为主角提供持续性效果' }
        ]
      }
    };

    // 从Config表获取配置
    const config = await Config.findAll();
    const configData = {};
    
    if (config.length === 0) {
      // 如果数据库中没有配置，返回默认配置
      configData.factions = defaultConfig.factions;
      configData.types = defaultConfig.types;
      configData.categories = defaultConfig.categories;
    } else {
      config.forEach(item => {
        configData[item.configKey] = item.configValue;
      });
      
      // 如果某些配置缺失，使用默认值
      if (!configData.factions) configData.factions = defaultConfig.factions;
      if (!configData.types) configData.types = defaultConfig.types;
      if (!configData.categories) configData.categories = defaultConfig.categories;
    }

    // 提取选项值
    const typeOptions = configData.types.map(t => t.id);
    const factionOptions = configData.factions.map(f => f.id);
    
    // 构建category选项，标注属于哪个type
    const categoryOptions = {};
    Object.keys(configData.categories).forEach(typeId => {
      categoryOptions[typeId] = configData.categories[typeId].map(c => c.id);
    });

    res.json({
      types: typeOptions,
      factions: factionOptions,
      categories: categoryOptions,
      // 同时返回完整的配置信息，供前端显示名称和描述
      typeDetails: configData.types,
      factionDetails: configData.factions,
      categoryDetails: configData.categories
    });
  } catch (error) {
    console.error('获取卡牌选项错误:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

module.exports = router;
