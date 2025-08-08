const jwt = require('jsonwebtoken');
const { User } = require('../models');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: '没有提供访问令牌' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    
    // 验证用户是否存在
    const user = await User.findByPk(decoded.userId);
    if (!user) {
      return res.status(401).json({ message: '用户不存在' });
    }
    
    req.userId = decoded.userId;
    req.user = user;
    next();
  } catch (error) {
    console.error('认证错误:', error);
    res.status(401).json({ message: '无效的访问令牌' });
  }
};

module.exports = { auth };
