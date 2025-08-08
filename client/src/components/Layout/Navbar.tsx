import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store/store';
import { logout } from '../../store/slices/authSlice';

const Navbar: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <nav className="bg-gray-900 bg-opacity-95 backdrop-blur-sm shadow-lg border-b border-purple-500">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link to="/" className="text-2xl font-bold text-white hover:text-purple-300 transition-colors">
              故事书对战
            </Link>
            
            {user && (
              <div className="flex items-center space-x-6">
                <Link 
                  to="/cards" 
                  className="text-gray-300 hover:text-white px-3 py-2 rounded-md transition-colors"
                >
                  卡牌集
                </Link>
                <div className="relative group">
                  <button className="text-gray-300 hover:text-white px-3 py-2 rounded-md transition-colors flex items-center">
                    批量导入
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <div className="absolute left-0 mt-2 w-48 bg-gray-800 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    <Link 
                      to="/cards/batch-import" 
                      className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white rounded-t-md"
                    >
                      批量导入卡牌
                    </Link>
                    {user.isAdmin && (
                      <Link 
                        to="/heroes/batch-import" 
                        className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white rounded-b-md"
                      >
                        批量导入主战者
                      </Link>
                    )}
                  </div>
                </div>
                <Link 
                  to="/decks" 
                  className="text-gray-300 hover:text-white px-3 py-2 rounded-md transition-colors"
                >
                  卡组
                </Link>
                <Link 
                  to="/rooms" 
                  className="text-gray-300 hover:text-white px-3 py-2 rounded-md transition-colors"
                >
                  房间
                </Link>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <span className="text-gray-300">
                  欢迎, <span className="text-white font-semibold">{user.username}</span>
                  {user.isAdmin && (
                    <span className="ml-2 px-2 py-1 bg-red-600 text-white text-xs rounded-full">
                      管理员
                    </span>
                  )}
                </span>
                <button
                  onClick={handleLogout}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition-colors"
                >
                  退出
                </button>
              </>
            ) : (
              <div className="flex space-x-2">
                <Link
                  to="/login"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
                >
                  登录
                </Link>
                <Link
                  to="/register"
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md transition-colors"
                >
                  注册
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
