const { sequelize } = require('./config/database');

async function fixDeckConstraints() {
  try {
    console.log('开始修复 Deck 表约束...');
    
    // 修改 heroCardId 字段，允许为 NULL
    await sequelize.query(`
      PRAGMA foreign_keys=off;
      
      CREATE TABLE decks_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(255) NOT NULL,
        heroCardId INTEGER,
        championCardId INTEGER,
        championName VARCHAR(255),
        championDescription TEXT,
        cards TEXT NOT NULL,
        totalCards INTEGER DEFAULT 40,
        isPublic BOOLEAN DEFAULT 0,
        createdBy INTEGER NOT NULL,
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL,
        FOREIGN KEY (heroCardId) REFERENCES cards(id),
        FOREIGN KEY (championCardId) REFERENCES cards(id),
        FOREIGN KEY (createdBy) REFERENCES users(id)
      );
      
      INSERT INTO decks_new SELECT * FROM decks;
      
      DROP TABLE decks;
      
      ALTER TABLE decks_new RENAME TO decks;
      
      PRAGMA foreign_keys=on;
    `);
    
    console.log('Deck 表约束修复完成！');
    console.log('heroCardId 和 championCardId 现在都允许为 NULL');
    
  } catch (error) {
    console.error('修复约束时出错:', error);
  } finally {
    await sequelize.close();
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  fixDeckConstraints();
}

module.exports = fixDeckConstraints;
