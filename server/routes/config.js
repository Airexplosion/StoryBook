const express = require('express');
const { auth } = require('../middleware/auth');
const Config = require('../models/Config');

const router = express.Router();

// 默认配置数据
const defaultConfig = {
  factions: [
    { id: '中立', name: '中立', description: '不属于任何特定主角的通用卡牌，所有玩家都可以使用' }
  ],
  types: [
    { id: '故事牌', name: '故事牌' },
    { id: '配角牌', name: '配角牌' },
    { id: '主角牌', name: '主角牌' }
  ],
  categories: {
    story: [
      { id: '事件', name: '事件', description: '需要支付费用主动使用' },
      { id: '背景', name: '背景', description: '加入手中时自动使用' }
    ],
    character: [
      { id: '配角', name: '配角', description: '进入故事后才会成为实体单位' }
    ],
    hero: [
      { id: '主角', name: '主角', description: '为主角提供持续性效果' }
    ]
  }
};

// 初始化配置数据
const initializeConfig = async () => {
  try {
    const configCount = await Config.count();
    if (configCount === 0) {
      // 如果数据库中没有配置，插入默认配置
      await Config.bulkCreate([
        { configKey: 'factions', configValue: defaultConfig.factions },
        { configKey: 'types', configValue: defaultConfig.types },
        { configKey: 'categories', configValue: defaultConfig.categories }
      ]);
      console.log('默认配置已初始化到数据库');
    }
  } catch (error) {
    console.error('初始化配置失败:', error);
  }
};

// 启动时初始化配置
initializeConfig();

// 检查管理员权限的中间件
const adminAuth = (req, res, next) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ message: '权限不足，需要管理员权限' });
  }
  next();
};

// 获取游戏配置
router.get('/', async (req, res) => {
  try {
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
    }
    
    res.json(configData);
  } catch (error) {
    console.error('获取游戏配置错误:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

// 更新阵营配置
router.put('/factions', auth, adminAuth, async (req, res) => {
  try {
    const { factions } = req.body;
    
    // 确保每个faction都有必要的字段
    const processedFactions = factions.map(faction => ({
      id: faction.id,
      name: faction.name,
      description: faction.description || '',
      tags: faction.tags || [],
      image: faction.image || ''
    }));
    
    // 保存到数据库
    const [config, created] = await Config.findOrCreate({
      where: { configKey: 'factions' },
      defaults: { configValue: processedFactions }
    });
    
    if (!created) {
      config.configValue = processedFactions;
      await config.save();
    }
    
    res.json({ message: '阵营配置更新成功', factions: processedFactions });
  } catch (error) {
    console.error('更新阵营配置错误:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

// 更新类型配置
router.put('/types', auth, adminAuth, async (req, res) => {
  try {
    const { types } = req.body;
    
    // 保存到数据库
    const [config, created] = await Config.findOrCreate({
      where: { configKey: 'types' },
      defaults: { configValue: types }
    });
    
    if (!created) {
      config.configValue = types;
      await config.save();
    }
    
    res.json({ message: '类型配置更新成功', types });
  } catch (error) {
    console.error('更新类型配置错误:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

// 更新类别配置
router.put('/categories', auth, adminAuth, async (req, res) => {
  try {
    const { categories } = req.body;
    
    // 保存到数据库
    const [config, created] = await Config.findOrCreate({
      where: { configKey: 'categories' },
      defaults: { configValue: categories }
    });
    
    if (!created) {
      config.configValue = categories;
      await config.save();
    }
    
    res.json({ message: '类别配置更新成功', categories });
  } catch (error) {
    console.error('更新类别配置错误:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

module.exports = router;
