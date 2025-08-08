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
          }

          // 处理每一行数据
          for (const row of results) {
            processedCount++;
            
            try {
              // 支持中文和英文字段名，处理BOM字符问题
              const name = row['主战者名称'] || row['﻿主战者名称'] || row.name;
              const description = row['描述'] || row.description;

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
              
              // 检查faction是否已存在
              const existingFaction = factions.find(f => f.id === factionName || f.name === factionName);
              
              if (existingFaction) {
                errors.push({
                  row: processedCount,
                  data: row,
                  error: `主战者 "${factionName}" 已存在`
                });
                continue;
              }

              // 添加新的faction配置
              const newFaction = {
                id: factionName,
                name: factionName,
                description: description || ''
              };

              factions.push(newFaction);
              successCount++;

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
          res.json({
            message: '主战者配置批量导入完成',
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
  const template = `主战者名称,描述
圣光阵营,代表正义与光明的阵营
暗影阵营,代表神秘与力量的阵营
自然阵营,代表和谐与生命的阵营
中立阵营,不属于任何特定阵营`;

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename=faction_import_template.csv');
  res.send('\uFEFF' + template); // 添加BOM以确保Excel正确显示中文
});

module.exports = router;
