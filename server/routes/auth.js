const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');

const router = express.Router();

// 注册
router.post('/register', async (req, res) => {
  try {
    const { username, password, gmPassword } = req.body;

    // 检查用户名是否已存在
    const existingUser = await User.findOne({ 
      where: { username }
    });
    
    if (existingUser) {
      return res.status(400).json({ 
        message: '用户名已存在' 
      });
    }

    // 检查GM密码
    const isAdmin = gmPassword === '649226';

    // 加密密码
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 创建用户
    const user = await User.create({
      username,
      email: `${username}@game.local`, // 自动生成默认邮箱
      password: hashedPassword,
      isAdmin
    });

    // 生成JWT
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: isAdmin ? '管理员注册成功' : '注册成功',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin
      }
    });
  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

// 登录
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // 查找用户
    const user = await User.findOne({ where: { username } });
    if (!user) {
      return res.status(400).json({ message: '用户名或密码错误' });
    }

    // 验证密码
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ message: '用户名或密码错误' });
    }

    // 生成JWT
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '7d' }
    );

    res.json({
      message: '登录成功',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin
      }
    });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

module.exports = router;