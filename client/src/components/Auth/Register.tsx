import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { register, clearError } from '../../store/slices/authSlice';

const Register: React.FC = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    gmPassword: ''
  });

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isLoading, error, user } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      alert('密码不匹配');
      return;
    }

    if (formData.password.length < 6) {
      alert('密码长度至少为6位');
      return;
    }

    const { confirmPassword, ...registerData } = formData;
    dispatch(register(registerData) as any);
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full space-y-8">
        <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl shadow-2xl p-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white mb-2">用户注册</h2>
            <p className="text-gray-300">创建您的游戏账户</p>
          </div>

          {error && (
            <div className="bg-red-500 bg-opacity-20 border border-red-500 text-red-100 px-4 py-3 rounded-md mt-4">
              {error}
            </div>
          )}

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
                用户名
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                value={formData.username}
                onChange={handleChange}
                className="w-full px-3 py-3 bg-white bg-opacity-10 border border-gray-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="请输入用户名"
              />
            </div>

            <div>
              <label htmlFor="gmPassword" className="block text-sm font-medium text-gray-300 mb-2">
                GM密码（可选）
              </label>
              <input
                id="gmPassword"
                name="gmPassword"
                type="password"
                value={formData.gmPassword}
                onChange={handleChange}
                className="w-full px-3 py-3 bg-white bg-opacity-10 border border-gray-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="输入GM密码可注册为管理员"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                密码
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleChange}
                className="w-full px-3 py-3 bg-white bg-opacity-10 border border-gray-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="请输入密码（至少6位）"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
                确认密码
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full px-3 py-3 bg-white bg-opacity-10 border border-gray-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="请再次输入密码"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? '注册中...' : '注册'}
            </button>

            <div className="text-center">
              <p className="text-gray-300">
                已有账户？{' '}
                <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium">
                  立即登录
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;