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
    <nav className="backdrop-blur-sm shadow-lg border-b" style={{ backgroundColor: '#111111', borderColor: '#111111' }}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link to="/" className="text-2xl font-bold transition-colors">
              <span style={{ color: '#C2B79C', fontFamily: 'HYAoDeSaiJ, sans-serif', fontWeight: '100', fontSize: '25px' }}>异域故事书</span>
              <span style={{ color: '#FBFBFB', fontFamily: 'QingNiaoHuaGuangYaoTi, sans-serif', fontWeight: '100', fontSize: '20px' }}>·对战</span>
            </Link>
            
            {/* 主导航选项 - 所有用户可见 */}
            <div className="flex items-center space-x-6">
              <Link 
                to="/rooms" 
                className="px-3 py-2 rounded-md transition-colors duration-300"
                style={{ color: '#AEAEAE', fontFamily: 'QingNiaoHuaGuangYaoTi, sans-serif' }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#FBFBFB'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#AEAEAE'}
              >
                对战房间
              </Link>
              <Link 
                to="/decks" 
                className="px-3 py-2 rounded-md transition-colors duration-300"
                style={{ color: '#AEAEAE', fontFamily: 'QingNiaoHuaGuangYaoTi, sans-serif' }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#FBFBFB'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#AEAEAE'}
              >
                卡组构成
              </Link>
              <Link 
                to="/cards" 
                className="px-3 py-2 rounded-md transition-colors duration-300"
                style={{ color: '#AEAEAE', fontFamily: 'QingNiaoHuaGuangYaoTi, sans-serif' }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#FBFBFB'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#AEAEAE'}
              >
                卡牌集
              </Link>
              <Link 
                to="/rules" 
                className="px-3 py-2 rounded-md transition-colors duration-300"
                style={{ color: '#AEAEAE', fontFamily: 'QingNiaoHuaGuangYaoTi, sans-serif' }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#FBFBFB'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#AEAEAE'}
              >
                规则书
              </Link>
              
              {/* 批量导入 - 仅登录用户可见 */}
              {user && (
                <div className="relative group">
                  <button 
                    className="px-3 py-2 rounded-md transition-colors duration-300 flex items-center" 
                    style={{ color: '#AEAEAE', fontFamily: 'QingNiaoHuaGuangYaoTi, sans-serif' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#FBFBFB'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#AEAEAE'}
                  >
                    批量导入
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <div className="absolute left-0 mt-2 w-48 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50" style={{ backgroundColor: '#111111' }}>
                    <Link 
                      to="/cards/batch-import" 
                      className="block px-4 py-2 text-sm rounded-t-md transition-colors duration-300"
                      style={{ color: '#AEAEAE', fontFamily: 'QingNiaoHuaGuangYaoTi, sans-serif' }}
                      onMouseEnter={(e) => e.currentTarget.style.color = '#FBFBFB'}
                      onMouseLeave={(e) => e.currentTarget.style.color = '#AEAEAE'}
                    >
                      批量导入卡牌
                    </Link>
                    {user.isAdmin && (
                      <Link 
                        to="/heroes/batch-import" 
                        className="block px-4 py-2 text-sm rounded-b-md transition-colors duration-300"
                        style={{ color: '#AEAEAE', fontFamily: 'QingNiaoHuaGuangYaoTi, sans-serif' }}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#FBFBFB'}
                        onMouseLeave={(e) => e.currentTarget.style.color = '#AEAEAE'}
                      >
                        批量导入主战者
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-1">
            {user ? (
              <>
                                  <span style={{ color: '#AEAEAE' }}>
                    欢迎,<span className="">叙事人</span> <span className="font-semibold italic" style={{ color: '#AEAEAE' }}>{user.username}</span>
                  {user.isAdmin && (
                    <span className="ml-2 px-2 py-1 bg-red-600 text-xs rounded-full" style={{ color: '#AEAEAE' }}>
                      管理员
                    </span>
                  )}
                </span>
                <button
                  onClick={handleLogout}
                  className="px-3 py-2 rounded-md transition-colors flex items-center justify-center group"
                  style={{ color: '#AEAEAE' }}
                  title="退出"
                >
                  <svg className="w-5 h-5 transition-colors duration-300 group-hover:text-[#F07272]" viewBox="0 0 1024 1024" fill="currentColor">
                    <path d="M184.552727 768l0-512c0-38.539636 31.278545-69.818182 69.818182-69.818182l302.545455 0L556.916364 139.636364l-325.818182 0c-51.432727 0-93.090909 41.658182-93.090909 93.090909l0 558.545455c0 51.432727 41.658182 93.090909 93.090909 93.090909l325.818182 0 0-46.545455-302.545455 0C215.784727 837.818182 184.552727 806.539636 184.552727 768zM924.113455 495.522909l-164.584727-164.584727c-9.076364-9.076364-23.831273-9.076364-32.907636 0-9.076364 9.076364-9.076364 23.831273 0 32.907636l124.834909 124.834909L394.007273 488.680727c-12.846545 0-23.272727 10.426182-23.272727 23.272727s10.426182 23.272727 23.272727 23.272727l457.448727 0-124.834909 124.834909c-9.076364 9.076364-9.076364 23.831273 0 32.907636 9.076364 9.076364 23.831273 9.076364 32.907636 0l164.584727-164.584727C933.189818 519.354182 933.189818 504.645818 924.113455 495.522909z"/>
                  </svg>
                </button>
              </>
            ) : (
              <div className="flex space-x-2">
                <Link to="/login" className="px-4 rounded-md transition-colors" style={{ backgroundColor: '#918273', color: '#FBFBFB', fontFamily: 'QingNiaoHuaGuangYaoTi, sans-serif', fontWeight: '100', paddingTop: '3px', paddingBottom: '3px' }}>
                  登录
                </Link>
                <Link to="/register" className="border-2 px-4 rounded-md transition-colors hover:bg-opacity-10" style={{ borderColor: '#918273', color: '#918273', backgroundColor: 'transparent', fontFamily: 'QingNiaoHuaGuangYaoTi, sans-serif', fontWeight: '100', paddingTop: '3px', paddingBottom: '3px' }}>
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
