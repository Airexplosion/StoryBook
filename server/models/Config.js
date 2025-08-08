const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Config = sequelize.define('Config', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  configKey: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  configValue: {
    type: DataTypes.TEXT, // JSON 字符串存储配置值
    allowNull: false,
    get() {
      const rawValue = this.getDataValue('configValue');
      return rawValue ? JSON.parse(rawValue) : null;
    },
    set(value) {
      this.setDataValue('configValue', JSON.stringify(value));
    },
  },
}, {
  timestamps: true,
  tableName: 'configs',
});

module.exports = Config;
