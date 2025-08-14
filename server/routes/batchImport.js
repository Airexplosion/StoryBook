const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const { User, Card, Config } = require('../models');
const { auth } = require('../middleware/auth');

const router = express.Router();

// 配置文件上传
const upload = multer({ dest: 'uploads/' });

// 批量导入主战者（导入faction字段配置）
router.post('/heroes', auth, upload.single('csvFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: '请上传CSV文件' });
    }

    if (!req.user.isAdmin) {
      return res.status(403).json({ message: '只有管理员可以批量导入主战者' });
    }

    // 获取覆盖模式参数
    const overwriteMode = req.body.overwriteMode === 'true';

    const results = [];
    const errors = [];
    let processedCount = 0;
    let successCount = 0;

    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on('data', (data) => {
        results.push(data);
      })
      .on('end', async () => {
        try {
          // 获取现有的faction配置
          let factionConfig = await Config.findOne({
            where: { configKey: 'factions' }
          });

          let factions = [];
          if (factionConfig) {
            factions = factionConfig.configValue || [];
            
            // 自动扩展数据库字段：检查现有数据是否包含新字段，如果没有则自动添加
            let needsUpdate = false;
            factions = factions.map(faction => {
              const updatedFaction = { ...faction };
              
              // 如果没有tags字段，添加空数组
              if (!updatedFaction.hasOwnProperty('tags')) {
                updatedFaction.tags = [];
                needsUpdate = true;
              }
              
              // 如果没有image字段，添加空字符串
              if (!updatedFaction.hasOwnProperty('image')) {
                updatedFaction.image = '';
                needsUpdate = true;
              }
              
              return updatedFaction;
            });
            
            // 如果有字段更新，保存到数据库
            if (needsUpdate) {
              factionConfig.configValue = factions;
              await factionConfig.save();
              console.log('自动扩展faction字段完成');
            }
          }

          // 处理每一行数据
          for (const row of results) {
            processedCount++;
            
            try {
              // 支持中文和英文字段名，处理BOM字符问题
              const name = row['主战者名称'] || row['﻿主战者名称'] || row.name;
              const description = row['描述'] || row.description;
              const tags = row['标签'] || row.tags;
              const image = row['图片'] || row.image;

              // 验证必填字段：name
              if (!name) {
                errors.push({
                  row: processedCount,
                  data: row,
                  error: '缺少必填字段：主战者名称'
                });
                continue;
              }

              const factionName = name.trim();
              
              // 处理tags字段 - 支持逗号分隔的字符串
              let tagsArray = [];
              if (tags) {
                if (typeof tags === 'string') {
                  tagsArray = tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
                } else if (Array.isArray(tags)) {
                  tagsArray = tags.filter(tag => tag && tag.trim().length > 0);
                }
              }

              // 处理image字段 - 单个图片URL
              let imageUrl = '';
              if (image && typeof image === 'string') {
                imageUrl = image.trim();
              }
              
              // 检查faction是否已存在
              const existingFactionIndex = factions.findIndex(f => f.id === factionName || f.name === factionName);
              
              const newFaction = {
                id: factionName,
                name: factionName,
                description: description || '',
                tags: tagsArray,
                image: imageUrl
              };

              if (existingFactionIndex !== -1) {
                if (overwriteMode) {
                  // 覆盖模式：覆盖现有的faction配置
                  factions[existingFactionIndex] = newFaction;
                  successCount++;
                } else {
                  // 添加模式：如果已存在则报错
                  errors.push({
                    row: processedCount,
                    data: row,
                    error: `主战者 "${factionName}" 已存在，请启用覆盖模式或使用不同的名称`
                  });
                  continue;
                }
              } else {
                // 添加新的faction配置
                factions.push(newFaction);
                successCount++;
              }

            } catch (error) {
              errors.push({
                row: processedCount,
                data: row,
                error: error.message
              });
            }
          }

          // 保存更新后的faction配置
          if (successCount > 0) {
            if (factionConfig) {
              factionConfig.configValue = factions;
              await factionConfig.save();
            } else {
              await Config.create({
                configKey: 'factions',
                configValue: factions
              });
            }
          }

          // 删除临时文件
          fs.unlinkSync(req.file.path);

          // 返回结果
          const modeText = overwriteMode ? '覆盖模式' : '添加模式';
          res.json({
            message: `主战者配置批量导入完成（${modeText}）`,
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
          console.error('主战者配置批量导入错误:', error);
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
    console.error('主战者配置批量导入错误:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

// 下载主战者配置导入模板
router.get('/hero-template', auth, (req, res) => {
  const template = `主战者名称,描述,标签,图片
圣光阵营,代表正义与光明的阵营,"正义,光明,治疗",https://example.com/holy.jpg
暗影阵营,代表神秘与力量的阵营,"神秘,暗影,魔法",https://example.com/shadow.jpg
自然阵营,代表和谐与生命的阵营,"自然,生命,成长",
中立阵营,不属于任何特定阵营,中立,`;

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename=faction_import_template.csv');
  res.send('\uFEFF' + template); // 添加BOM以确保Excel正确显示中文
});

module.exports = router;
