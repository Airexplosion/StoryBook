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
    
    // 确保用户ID的一致性和类型安全
    const userId = parseInt(decoded.userId);
    if (isNaN(userId)) {
      console.error('无效的用户ID:', decoded.userId);
      return res.status(401).json({ message: '无效的用户ID' });
    }
    
    // 验证用户ID与数据库中的用户ID匹配
    if (user.id !== userId) {
      console.error('用户ID不匹配:', { tokenUserId: userId, dbUserId: user.id });
      return res.status(401).json({ message: '用户身份验证失败' });
    }
    
    req.userId = userId;
    req.user = user;
    
    // 添加调试日志
    console.log(`[AUTH] 用户认证成功: userId=${userId}, username=${user.username}, tokenId=${decoded.userId}`);
    
    next();
  } catch (error) {
    console.error('认证错误:', error);
    res.status(401).json({ message: '无效的访问令牌' });
  }
};

const adminAuth = (req, res, next) => {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ message: '无权限访问，需要管理员权限' });
  }
  next();
};

module.exports = { auth, adminAuth };
