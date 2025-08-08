const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

// 创建SQLite数据库连接
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '../database.sqlite'),
  logging: false, // 禁用SQL日志
});

// 测试数据库连接
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ SQLite数据库连接成功');
  } catch (error) {
    console.error('❌ 数据库连接失败:', error);
  }
};

module.exports = { sequelize, testConnection };