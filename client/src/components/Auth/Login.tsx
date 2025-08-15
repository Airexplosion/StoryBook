import React, { useState, useEffect } from 'react';
// 使用 public 目录中的静态资源
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { login, clearError } from '../../store/slices/authSlice';

const Login: React.FC = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
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
    dispatch(login(formData) as any);
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full space-y-8" style={{ marginTop: '-150px' }}>
        <div className="p-8">
          <div className="text-center">
            {/* Logo */}
            <div className="mb-6 flex justify-center">
              <img src="/SVG/logo.svg" alt="logo" className="w-80 h-auto" />
            </div>
            <h2 className="text-4xl font-regular" style={{ color: '#FBFBFB', fontFamily: 'QingNiaoHuaGuangYaoTi, sans-serif', marginTop: '0px', marginBottom: '0px' }}>叙事人登录</h2>
          </div>

          {error && (
            <div className="bg-red-500 bg-opacity-20 border border-red-500 text-red-100 px-4 py-3 rounded-md mt-4">
              {error}
            </div>
          )}

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="username" className="block text-sm font-medium mb-2" style={{ color: '#AEAEAE' }}>
                用户名
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                value={formData.username}
                onChange={handleChange}
                className="w-full px-3 py-3 bg-white bg-opacity-10 border border-gray-500 rounded-md placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent focus:ring-[#4F6A8D]"
                style={{ color: '#AEAEAE' }}
                placeholder="请输入用户名"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2" style={{ color: '#AEAEAE' }}>
                密码
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleChange}
                className="w-full px-3 py-3 bg-white bg-opacity-10 border border-gray-500 rounded-md placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent focus:ring-[#4F6A8D]"
                style={{ color: '#AEAEAE' }}
                placeholder="请输入密码"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center items-center py-3 px-4 border-2 rounded-md shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
              style={{ 
                backgroundColor: 'transparent', 
                color: '#C2B79C',
                borderColor: '#C2B79C',
                transition: 'color 0.4s ease'
              }}
            >
              {/* 向右推进的背景填充 */}
              <div 
                className="absolute inset-0 transition-transform duration-500 ease-out transform -translate-x-full group-hover:translate-x-0"
                style={{ backgroundColor: '#C2B79C' }}
              ></div>
              
              {/* 文字内容 - 在同一位置切换 */}
              <span className="relative z-10 transition-colors duration-300 group-hover:text-[#FBFBFB] whitespace-nowrap">
                <span className="transition-opacity duration-300 group-hover:opacity-0">
                  {isLoading ? '登录中...' : '登录'}
                </span>
                <span className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  开始阅读
                </span>
              </span>
            </button>

            <div className="text-center">
              <p style={{ color: '#AEAEAE' }}>
                还没有账户？{' '}
                <Link to="/register" className="font-medium" style={{ color: '#FBFBFB' }}>
                  立即注册
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;