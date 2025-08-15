import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store/store';
import { logout } from '../../store/slices/authSlice';

const Navbar: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isManagementOpen, setIsManagementOpen] = useState(false);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-sm shadow-lg border-b" style={{ backgroundColor: '#111111', borderColor: '#111111' }}>
        <div className="container mx-auto px-4">
          <div className="flex items-center h-16">
            {/* 移动端汉堡菜单按钮 */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="text-gray-400 hover:text-white focus:outline-none"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>

            {/* 移动端标题 - 居中显示 */}
            <div className="flex-1 flex justify-center md:hidden">
              <Link to="/" className="text-2xl font-bold transition-colors">
                <span style={{ color: '#C2B79C', fontFamily: 'HYAoDeSaiJ, sans-serif', fontWeight: '100', fontSize: '25px' }}>异域故事书</span>
                <span style={{ color: '#FBFBFB', fontFamily: 'QingNiaoHuaGuangYaoTi, sans-serif', fontWeight: '100', fontSize: '20px' }}>·对战</span>
              </Link>
            </div>

            {/* 桌面端布局 - 居中导航 */}
            <div className="hidden md:flex items-center justify-between w-full">
              {/* 左侧标题 */}
              <Link to="/" className="text-2xl font-bold transition-colors">
                <span style={{ color: '#C2B79C', fontFamily: 'HYAoDeSaiJ, sans-serif', fontWeight: '100', fontSize: '25px' }}>异域故事书</span>
                <span style={{ color: '#FBFBFB', fontFamily: 'QingNiaoHuaGuangYaoTi, sans-serif', fontWeight: '100', fontSize: '20px' }}>·对战</span>
              </Link>
              
              {/* 中间导航选项 */}
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
                to="/factions"
                className="px-3 py-2 rounded-md transition-colors duration-300"
                style={{ color: '#AEAEAE', fontFamily: 'QingNiaoHuaGuangYaoTi, sans-serif' }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#FBFBFB'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#AEAEAE'}
              >
                主角集
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
                    管理设置
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <div className="absolute left-0 mt-2 w-48 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[99999]" style={{ backgroundColor: '#111111' }}>
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
                      <>
                        <Link 
                          to="/heroes/batch-import" 
                          className="block px-4 py-2 text-sm transition-colors duration-300"
                          style={{ color: '#AEAEAE', fontFamily: 'QingNiaoHuaGuangYaoTi, sans-serif' }}
                          onMouseEnter={(e) => e.currentTarget.style.color = '#FBFBFB'}
                          onMouseLeave={(e) => e.currentTarget.style.color = '#AEAEAE'}
                        >
                          批量导入主战者
                        </Link>
                        <Link 
                          to="/cards/create" 
                          className="block px-4 py-2 text-sm transition-colors duration-300"
                          style={{ color: '#AEAEAE', fontFamily: 'QingNiaoHuaGuangYaoTi, sans-serif' }}
                          onMouseEnter={(e) => e.currentTarget.style.color = '#FBFBFB'}
                          onMouseLeave={(e) => e.currentTarget.style.color = '#AEAEAE'}
                        >
                          创建卡牌
                        </Link>
                        <Link 
                          to="/factions/manage" 
                          className="block px-4 py-2 text-sm transition-colors duration-300"
                          style={{ color: '#AEAEAE', fontFamily: 'QingNiaoHuaGuangYaoTi, sans-serif' }}
                          onMouseEnter={(e) => e.currentTarget.style.color = '#FBFBFB'}
                          onMouseLeave={(e) => e.currentTarget.style.color = '#AEAEAE'}
                        >
                          管理主战者
                        </Link>
                        <Link 
                          to="/types/manage" 
                          className="block px-4 py-2 text-sm transition-colors duration-300"
                          style={{ color: '#AEAEAE', fontFamily: 'QingNiaoHuaGuangYaoTi, sans-serif' }}
                          onMouseEnter={(e) => e.currentTarget.style.color = '#FBFBFB'}
                          onMouseLeave={(e) => e.currentTarget.style.color = '#AEAEAE'}
                        >
                          管理类型
                        </Link>
                        <Link 
                          to="/categories/manage" 
                          className="block px-4 py-2 text-sm transition-colors duration-300"
                          style={{ color: '#AEAEAE', fontFamily: 'QingNiaoHuaGuangYaoTi, sans-serif' }}
                          onMouseEnter={(e) => e.currentTarget.style.color = '#FBFBFB'}
                          onMouseLeave={(e) => e.currentTarget.style.color = '#AEAEAE'}
                        >
                          管理类别
                        </Link>
                        <Link 
                          to="/settings/export" 
                          className="block px-4 py-2 text-sm rounded-b-md transition-colors duration-300"
                          style={{ color: '#AEAEAE', fontFamily: 'QingNiaoHuaGuangYaoTi, sans-serif' }}
                          onMouseEnter={(e) => e.currentTarget.style.color = '#FBFBFB'}
                          onMouseLeave={(e) => e.currentTarget.style.color = '#AEAEAE'}
                        >
                          数据导出
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

              {/* 右侧用户信息 */}
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

            {/* 移动端占位 */}
            <div className="md:hidden w-6"></div>
          </div>
        </div>
      </nav>

      {/* 移动端侧边栏 */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* 背景遮罩 */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50"
            onClick={() => setIsMobileMenuOpen(false)}
          ></div>
          
          {/* 侧边栏 */}
          <div 
            className="fixed left-0 top-0 h-full w-80 shadow-lg flex flex-col"
            style={{ backgroundColor: '#414141' }}
          >
            <div className="p-4">
              {/* 关闭按钮 */}
              <div className="flex justify-end mb-4">
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* 导航菜单 - 可滚动区域 */}
            <div className="flex-1 overflow-y-auto px-4">
              <div className="space-y-2">
                <Link 
                  to="/rooms" 
                  className="block px-4 py-3 transition-colors duration-300 hover:bg-gray-600"
                  style={{ color: '#AEAEAE', fontFamily: 'QingNiaoHuaGuangYaoTi, sans-serif' }}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  对战房间
                </Link>
                <div style={{ height: '1px', backgroundColor: '#C2B79C' }}></div>
                
                <Link 
                  to="/decks" 
                  className="block px-4 py-3 transition-colors duration-300 hover:bg-gray-600"
                  style={{ color: '#AEAEAE', fontFamily: 'QingNiaoHuaGuangYaoTi, sans-serif' }}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  卡组构成
                </Link>
                <div style={{ height: '1px', backgroundColor: '#C2B79C' }}></div>
                
                <Link 
                  to="/cards" 
                  className="block px-4 py-3 transition-colors duration-300 hover:bg-gray-600"
                  style={{ color: '#AEAEAE', fontFamily: 'QingNiaoHuaGuangYaoTi, sans-serif' }}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  卡牌集
                </Link>
                <div style={{ height: '1px', backgroundColor: '#C2B79C' }}></div>
                
                <Link
                  to="/factions"
                  className="block px-4 py-3 transition-colors duration-300 hover:bg-gray-600"
                  style={{ color: '#AEAEAE', fontFamily: 'QingNiaoHuaGuangYaoTi, sans-serif' }}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  主角集
                </Link>
                <div style={{ height: '1px', backgroundColor: '#C2B79C' }}></div>
                
                <Link 
                  to="/rules" 
                  className="block px-4 py-3 transition-colors duration-300 hover:bg-gray-600"
                  style={{ color: '#AEAEAE', fontFamily: 'QingNiaoHuaGuangYaoTi, sans-serif' }}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  规则书
                </Link>
                
                {/* 管理设置 - 仅登录用户可见 */}
                {user && (
                  <>
                    <div style={{ height: '1px', backgroundColor: '#C2B79C' }}></div>
                    <button
                      onClick={() => setIsManagementOpen(!isManagementOpen)}
                      className="w-full px-4 py-2 flex items-center justify-between transition-colors duration-300 hover:bg-gray-600"
                      style={{ color: '#C2B79C', fontFamily: 'QingNiaoHuaGuangYaoTi, sans-serif', fontSize: '14px' }}
                    >
                      管理设置
                      <svg 
                        className={`w-4 h-4 transition-transform duration-200 ${isManagementOpen ? 'rotate-180' : ''}`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    
                    {isManagementOpen && (
                      <>
                        <Link 
                          to="/cards/batch-import" 
                          className="block px-6 py-2 transition-colors duration-300 hover:bg-gray-600"
                          style={{ color: '#AEAEAE', fontFamily: 'QingNiaoHuaGuangYaoTi, sans-serif', fontSize: '14px' }}
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          批量导入卡牌
                        </Link>
                        
                        {user.isAdmin && (
                          <>
                            <Link 
                              to="/heroes/batch-import" 
                              className="block px-6 py-2 transition-colors duration-300 hover:bg-gray-600"
                              style={{ color: '#AEAEAE', fontFamily: 'QingNiaoHuaGuangYaoTi, sans-serif', fontSize: '14px' }}
                              onClick={() => setIsMobileMenuOpen(false)}
                            >
                              批量导入主战者
                            </Link>
                            <Link 
                              to="/cards/create" 
                              className="block px-6 py-2 transition-colors duration-300 hover:bg-gray-600"
                              style={{ color: '#AEAEAE', fontFamily: 'QingNiaoHuaGuangYaoTi, sans-serif', fontSize: '14px' }}
                              onClick={() => setIsMobileMenuOpen(false)}
                            >
                              创建卡牌
                            </Link>
                            <Link 
                              to="/factions/manage" 
                              className="block px-6 py-2 transition-colors duration-300 hover:bg-gray-600"
                              style={{ color: '#AEAEAE', fontFamily: 'QingNiaoHuaGuangYaoTi, sans-serif', fontSize: '14px' }}
                              onClick={() => setIsMobileMenuOpen(false)}
                            >
                              管理主战者
                            </Link>
                            <Link 
                              to="/types/manage" 
                              className="block px-6 py-2 transition-colors duration-300 hover:bg-gray-600"
                              style={{ color: '#AEAEAE', fontFamily: 'QingNiaoHuaGuangYaoTi, sans-serif', fontSize: '14px' }}
                              onClick={() => setIsMobileMenuOpen(false)}
                            >
                              管理类型
                            </Link>
                            <Link 
                              to="/categories/manage" 
                              className="block px-6 py-2 transition-colors duration-300 hover:bg-gray-600"
                              style={{ color: '#AEAEAE', fontFamily: 'QingNiaoHuaGuangYaoTi, sans-serif', fontSize: '14px' }}
                              onClick={() => setIsMobileMenuOpen(false)}
                            >
                              管理类别
                            </Link>
                            <Link 
                              to="/settings/export" 
                              className="block px-6 py-2 transition-colors duration-300 hover:bg-gray-600"
                              style={{ color: '#AEAEAE', fontFamily: 'QingNiaoHuaGuangYaoTi, sans-serif', fontSize: '14px' }}
                              onClick={() => setIsMobileMenuOpen(false)}
                            >
                              数据导出
                            </Link>
                          </>
                        )}
                      </>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* 用户信息和登录/注册 - 固定在底部 */}
            <div className="border-t p-4" style={{ borderColor: '#C2B79C' }}>
              {user ? (
                <div>
                  <div className="mb-3" style={{ color: '#AEAEAE', fontFamily: 'QingNiaoHuaGuangYaoTi, sans-serif' }}>
                    欢迎，叙事人 {user.username}
                    {user.isAdmin && (
                      <span className="ml-2 px-2 py-1 bg-red-600 text-xs rounded-full">
                        管理员
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full px-4 py-2 rounded-md transition-colors"
                    style={{ backgroundColor: '#918273', color: '#FBFBFB', fontFamily: 'QingNiaoHuaGuangYaoTi, sans-serif' }}
                  >
                    退出登录
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Link 
                    to="/login" 
                    className="block px-4 py-2 rounded-md transition-colors text-center"
                    style={{ backgroundColor: '#918273', color: '#FBFBFB', fontFamily: 'QingNiaoHuaGuangYaoTi, sans-serif' }}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    登录
                  </Link>
                  <Link 
                    to="/register" 
                    className="block border-2 px-4 py-2 rounded-md transition-colors text-center"
                    style={{ borderColor: '#918273', color: '#918273', backgroundColor: 'transparent', fontFamily: 'QingNiaoHuaGuangYaoTi, sans-serif' }}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    注册
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
