import React, { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { RootState, AppDispatch } from '../../store/store';
import { fetchConfig } from '../../store/slices/configSlice';
import { Faction } from '../../types';

// 添加CSS动画样式 - 卡背翻面效果
const animationStyles = `
  @keyframes cardFlip {
    0% {
      transform: rotateY(0deg);
    }
    100% {
      transform: rotateY(180deg);
    }
  }
  
  .card-flip-container {
    perspective: 1000px;
    border-radius: 15px;
    overflow: visible !important;
    transition: transform 0.3s ease;
  }
  
  .card-flip-container:hover {
    box-shadow: 0 0 20px rgba(194, 183, 156, 0.6);
  }

  /* 移动端缩放 */
  @media (max-width: 768px) {
    .faction-mobile-container {
      transform: scale(0.7) !important;
      transform-origin: center !important;
      transition: none !important;
    }
    .faction-mobile-container:hover {
      transform: scale(0.7) !important;
      box-shadow: 0 0 20px rgba(194, 183, 156, 0.6);
    }
    
    .faction-detail-modal {
      transform: scale(0.7) !important;
      transform-origin: center !important;
    }
    
    .faction-mobile-grid {
      grid-auto-rows: calc(403px * 0.7 + 10px) !important;
      gap: 16px 10px !important;
      margin-top: -40px !important; /* -10px (原有) + (-30px) = -40px */
    }
  }
  
  .card-flip-inner {
    position: relative;
    width: 100%;
    height: 100%;
    transform-style: preserve-3d;
    border-radius: 5px;
    transform: rotateY(0deg);
    transition: transform 0.8s ease-in-out;
    min-height: 403px; /* 确保有高度 */
  }
  
  .card-flip-inner.flipped {
    transform: rotateY(180deg);
  }
  
  .card-flip-inner.animate-flip {
    animation: cardFlip 0.8s ease-in-out forwards;
  }
  
  .card-face {
    position: absolute;
    width: 100%;
    height: 100%;
    backface-visibility: hidden;
    border-radius: 5px;
    overflow: hidden;
    top: 0;
    left: 0;
  }
  
  .card-back {
    background-image: url('/Cardborder/cardback.png');
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    transform: rotateY(0deg);
  }
  
  .card-front {
    transform: rotateY(180deg);
  }
  
  .animate-card-flip {
    animation: cardFlip 0.8s ease-in-out forwards;
    animation-delay: var(--flip-delay, 0s);
  }

  .faction-mobile-grid, .faction-desktop-grid {
    overflow: visible !important;
  }

  @media (min-width: 769px) {
    .faction-desktop-grid {
      margin-top: 10px !important;
    }
  }

  .max-w-7xl {
    overflow: visible !important;
  }
`;

// 注入样式到页面
if (typeof document !== 'undefined') {
  const styleElement = document.getElementById('faction-animations');
  if (!styleElement) {
    const style = document.createElement('style');
    style.id = 'faction-animations';
    style.textContent = animationStyles;
    document.head.appendChild(style);
  }
}

const FactionCollection: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();

  // 添加自定义滚动条样式
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .custom-scrollbar::-webkit-scrollbar {
        width: 8px;
      }
      .custom-scrollbar::-webkit-scrollbar-track {
        background: transparent;
      }
      .custom-scrollbar::-webkit-scrollbar-thumb {
        background-color: #918273;
        border-radius: 4px;
      }
      .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background-color: #7a6f5f;
      }
      .custom-scrollbar::-webkit-scrollbar-button {
        display: none;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);
  const location = useLocation();
  const { config, isLoading, error } = useSelector((state: RootState) => state.config);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredFactions, setFilteredFactions] = useState<Faction[]>([]);
  const [selectedFaction, setSelectedFaction] = useState<Faction | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);
  
  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  
  // 页面跳转状态
  const [jumpToPage, setJumpToPage] = useState('');
  
  // 动画状态 - 暂时注释掉
  /*
  const [showAnimation, setShowAnimation] = useState(false);
  const [animationCompleted, setAnimationCompleted] = useState(false);
  const hasEnteredRef = useRef(false);
  const locationKeyRef = useRef(location.key);
  */

  useEffect(() => {
    dispatch(fetchConfig());
  }, [dispatch]);

  // 动画触发逻辑
  useEffect(() => {
    // 每次进入factions页面都重置并触发翻面动画
    if (location.pathname === '/factions' && config?.factions) {
      console.log('重置并触发翻面动画，卡片数量:', filteredFactions.length);
      
      // 重置动画状态
      setIsAnimating(false);
      setAnimationKey(prev => prev + 1);
      
      // 短暂延迟后开始动画
      const startTimer = setTimeout(() => {
        setIsAnimating(true);
      }, 200);
      
      return () => clearTimeout(startTimer);
    }
  }, [location.pathname, config?.factions]);

  useEffect(() => {
    if (config?.factions) {
      const filtered = config.factions.filter(faction =>
        faction.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (faction.description && faction.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredFactions(filtered);
      setCurrentPage(1); // 重置到第一页
      
      // 如果数据刚加载完成且应该显示动画，触发动画 - 暂时注释掉
      /*
      if (filtered.length > 0 && location.pathname === '/factions' && !hasEnteredRef.current) {
        console.log('Data loaded, triggering animation');
        setShowAnimation(true);
        setAnimationCompleted(false);
        hasEnteredRef.current = true;
        
        const timer = setTimeout(() => {
          setAnimationCompleted(true);
          console.log('Animation completed');
        }, 2000);
        
        return () => clearTimeout(timer);
      }
      */
    }
  }, [config?.factions, searchTerm, location.pathname]);

  // 计算分页数据
  const totalPages = Math.ceil(filteredFactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentFactions = filteredFactions.slice(startIndex, endIndex);

  const handleFactionClick = (faction: Faction) => {
    setSelectedFaction(faction);
  };

  const closeFactionDetail = () => {
    setSelectedFaction(null);
  };

  // 测试动画的函数 - 暂时注释掉
  /*
  const testAnimation = () => {
    console.log('Manual animation trigger');
    setShowAnimation(true);
    setAnimationCompleted(false);
    
    setTimeout(() => {
      setAnimationCompleted(true);
      console.log('Manual animation completed');
    }, 2000);
  };
  */

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingText />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-red-900 bg-opacity-50 border border-red-500 rounded-lg p-8 max-w-md">
          <h2 className="text-red-300 text-2xl font-bold mb-4">加载失败</h2>
          <p className="text-red-200 text-lg">{error}</p>
          <button
            onClick={() => dispatch(fetchConfig())}
            className="mt-6 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-md transition-colors text-lg"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* 页面标题和搜索栏 */}
      <div className="mb-10">
        <div className="mb-4">
          <div className="text-center">
            <h1 className="text-white" style={{ fontFamily: 'HYAoDeSaiJ, sans-serif', letterSpacing: '0.1em', fontSize: '60px', lineHeight: '1.1', fontWeight: 'normal' }}>
              主角集
            </h1>
            <p className="italic" style={{ fontSize: '16px', marginTop: '12px', color: '#AEAEAE' }}>
              浏览所有可用的主战者阵营，了解它们的特色和效果
            </p>
          </div>
          <div className="flex flex-col items-end" style={{ display: 'none' }}>
            <div className="relative max-w-lg">
              <input
                type="text"
                placeholder="搜索主战者..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-6 py-2 pl-14 bg-gray-800 bg-opacity-50 border border-gray-600 rounded-lg text-white text-lg placeholder-gray-400 focus:outline-none focus:border-transparent backdrop-blur-sm"
                onFocus={(e) => {
                  e.target.style.boxShadow = '0 0 0 2px #C2B79C';
                }}
                onBlur={(e) => {
                  e.target.style.boxShadow = 'none';
                }}
              />
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            {/* 统计信息紧贴搜索框 */}
            <div className="text-right mt-2">
                          <div className="text-gray-400 text-sm">
              共找到 <span className="font-semibold" style={{ color: '#4F6A8D' }}>{filteredFactions.length}</span> 个主战者
                {totalPages > 1 && (
                  <span className="ml-2">
                    (第 {currentPage} 页，共 {totalPages} 页)
                  </span>
                )}
              </div>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="text-gray-400 hover:text-white transition-colors text-sm mt-1"
                >
                  清除搜索
                </button>
              )}
            </div>
          </div>
        </div>
      </div>



      {/* 装饰分割线 */}
      <div className="flex items-center justify-center mb-8">
        <div className="flex-1 h-px" style={{ backgroundColor: '#C2B79C' }}></div>
        <div className="flex items-center px-6">
          {/* 左边小星星 */}
          <svg width="16" height="18" viewBox="0 0 9.27 10.17" className="mx-2">
            <path fill="#C2B79C" d="M0,5.29c1.52.02,3.22.12,3.38.17.36.1.63.3.79.62s.24.79.24,1.44l.02,2.66h.39s-.02-2.66-.02-2.66c0-.88.14-1.46.45-1.77.32-.3,2.99-.48,4.02-.49v-.41c-1.03,0-3.7-.11-4.03-.41-.32-.3-.48-.89-.48-1.77l-.02-2.65h-.39s.02,2.66.02,2.66c0,.88-.14,1.48-.45,1.78-.15.15-2.12.37-3.91.44"/>
          </svg>
          {/* 中间大星星 */}
          <svg width="24" height="26" viewBox="0 0 9.27 10.17" className="mx-2">
            <path fill="#C2B79C" d="M0,5.29c1.52.02,3.22.12,3.38.17.36.1.63.3.79.62s.24.79.24,1.44l.02,2.66h.39s-.02-2.66-.02-2.66c0-.88.14-1.46.45-1.77.32-.3,2.99-.48,4.02-.49v-.41c-1.03,0-3.7-.11-4.03-.41-.32-.3-.48-.89-.48-1.77l-.02-2.65h-.39s.02,2.66.02,2.66c0,.88-.14,1.48-.45,1.78-.15.15-2.12.37-3.91.44"/>
          </svg>
          {/* 右边小星星 */}
          <svg width="16" height="18" viewBox="0 0 9.27 10.17" className="mx-2">
            <path fill="#C2B79C" d="M0,5.29c1.52.02,3.22.12,3.38.17.36.1.63.3.79.62s.24.79.24,1.44l.02,2.66h.39s-.02-2.66-.02-2.66c0-.88.14-1.46.45-1.77.32-.3,2.99-.48,4.02-.49v-.41c-1.03,0-3.7-.11-4.03-.41-.32-.3-.48-.89-.48-1.77l-.02-2.65h-.39s.02,2.66.02,2.66c0,.88-.14,1.48-.45,1.78-.15.15-2.12.37-3.91.44"/>
          </svg>
        </div>
        <div className="flex-1 h-px" style={{ backgroundColor: '#C2B79C' }}></div>
      </div>

      {/* 筛选器 */}
      <div className="relative z-10">
        {/* 搜索框 */}
        <div className="mb-4">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 bg-white bg-opacity-10 border border-gray-500 placeholder-gray-400 focus:outline-none"
            style={{ color: '#FBFBFB' }}
            placeholder="输入主角名称或描述..."
            onFocus={(e) => {
              e.target.style.borderColor = '#918273';
              e.target.style.boxShadow = '0 0 0 2px #918273';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#6B7280';
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>

        {/* 统计信息和重置按钮 */}
        <div className="flex justify-between items-center mb-4">
          {/* 统计信息 */}
          <div className="text-gray-400 text-sm">
            共找到 <span className="font-semibold" style={{ color: '#4F6A8D' }}>{filteredFactions.length}</span> 个主角
            {totalPages > 1 && (
              <span className="ml-2">
                (第 {currentPage} 页，共 {totalPages} 页)
              </span>
            )}
          </div>
          
          <button
            onClick={() => {
              setSearchTerm('');
              setCurrentPage(1);
            }}
            className="text-sm text-gray-400 hover:text-white transition-colors px-3 py-1 rounded border border-gray-600 hover:border-gray-500"
          >
            重置筛选
          </button>
        </div>
      </div>

      {/* 主战者网格 */}
      {filteredFactions.length > 0 && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 justify-items-center gap-x-4 gap-y-2.5 md:gap-[10px] faction-mobile-grid faction-desktop-grid" style={{ marginTop: '-10px' }}>
            {currentFactions.map((faction, index) => {
              return (
                <div
                  key={`${faction.id}-${animationKey}`}
                  className="card-flip-container faction-mobile-container"
                  style={{
                    width: '288px',
                    height: '403px'
                  }}
                >
                  <div 
                    className="card-flip-inner"
                    style={{
                      transform: isAnimating ? 'rotateY(180deg)' : 'rotateY(0deg)',
                      transitionDelay: `${index * 0.1}s`
                    } as React.CSSProperties}
                  >
                    {/* 卡背 - 默认显示 */}
                    <div 
                      className="card-face card-back"
                      style={{
                        backgroundImage: `url(${process.env.PUBLIC_URL || ''}/Cardborder/cardback.png)`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat'
                      }}
                    ></div>
                    
                    {/* 卡面 - 翻转后显示 */}
                    <div className="card-face card-front">
                      <FactionCard 
                        faction={faction} 
                        onClick={() => handleFactionClick(faction)}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* 分页控件 */}
          {totalPages > 1 && (
            <div className="mt-12 flex flex-col md:flex-row justify-center items-center space-y-4 md:space-y-0 md:space-x-2">
              {/* 页码按钮容器 */}
              <div className="flex justify-center items-center space-x-1 md:space-x-2 flex-wrap">
                {/* 上一页 */}
                <button
                  onClick={() => {
                    setCurrentPage(prev => Math.max(1, prev - 1));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  disabled={currentPage === 1}
                  className="px-2 md:px-4 py-2 text-sm md:text-base transition-colors border-b-2"
                style={{
                  backgroundColor: 'transparent',
                  color: currentPage === 1 ? '#6B7280' : '#C2B79C',
                  borderBottomColor: currentPage === 1 ? 'transparent' : 'rgba(194, 183, 156, 0.3)',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                }}
                onMouseEnter={(e) => {
                  if (currentPage !== 1) {
                    e.currentTarget.style.backgroundColor = 'rgba(194, 183, 156, 0.1)';
                    e.currentTarget.style.borderBottomColor = '#C2B79C';
                  }
                }}
                onMouseLeave={(e) => {
                  if (currentPage !== 1) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.borderBottomColor = 'rgba(194, 183, 156, 0.3)';
                  }
                }}
              >
                上一页
              </button>
              
              {/* 页码 */}
              {(() => {
                const pages = [];
                const showPages = 5; // 显示的页码数量
                let startPage = Math.max(1, currentPage - Math.floor(showPages / 2));
                let endPage = Math.min(totalPages, startPage + showPages - 1);
                
                // 调整起始页，确保显示足够的页码
                if (endPage - startPage + 1 < showPages) {
                  startPage = Math.max(1, endPage - showPages + 1);
                }
                
                // 如果起始页不是1，显示第1页和省略号
                if (startPage > 1) {
                  pages.push(
                    <button
                      key={1}
                      onClick={() => {
                        setCurrentPage(1);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="px-2 md:px-4 py-2 text-sm md:text-base transition-colors border-b-2"
                      style={{
                        backgroundColor: 'transparent',
                        color: currentPage === 1 ? '#FBFBFB' : '#C2B79C',
                        borderBottomColor: currentPage === 1 ? '#FBFBFB' : 'rgba(194, 183, 156, 0.3)'
                      }}
                      onMouseEnter={(e) => {
                        if (currentPage !== 1) {
                          e.currentTarget.style.backgroundColor = 'rgba(194, 183, 156, 0.1)';
                          e.currentTarget.style.borderBottomColor = '#C2B79C';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (currentPage !== 1) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.borderBottomColor = 'rgba(194, 183, 156, 0.3)';
                        }
                      }}
                    >
                      1
                    </button>
                  );
                  
                  if (startPage > 2) {
                    pages.push(
                      <span key="start-ellipsis" className="px-1 md:px-2 py-2 text-sm md:text-base text-gray-400">
                        ...
                      </span>
                    );
                  }
                }
                
                // 显示中间页码
                for (let i = startPage; i <= endPage; i++) {
                  // 如果首页已经单独显示了，就跳过；如果尾页会单独显示，也跳过
                  if ((startPage > 1 && i === 1) || (endPage < totalPages && i === totalPages)) continue;
                  
                  pages.push(
                    <button
                      key={i}
                      onClick={() => {
                        setCurrentPage(i);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="px-2 md:px-4 py-2 text-sm md:text-base transition-colors border-b-2"
                      style={{
                        backgroundColor: 'transparent',
                        color: currentPage === i ? '#FBFBFB' : '#C2B79C',
                        borderBottomColor: currentPage === i ? '#FBFBFB' : 'rgba(194, 183, 156, 0.3)'
                      }}
                      onMouseEnter={(e) => {
                        if (currentPage !== i) {
                          e.currentTarget.style.backgroundColor = 'rgba(194, 183, 156, 0.1)';
                          e.currentTarget.style.borderBottomColor = '#C2B79C';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (currentPage !== i) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.borderBottomColor = 'rgba(194, 183, 156, 0.3)';
                        }
                      }}
                    >
                      {i}
                    </button>
                  );
                }
                
                // 如果结束页不是最后一页，显示省略号和最后一页
                if (endPage < totalPages) {
                  if (endPage < totalPages - 1) {
                    pages.push(
                      <span key="end-ellipsis" className="px-1 md:px-2 py-2 text-sm md:text-base text-gray-400">
                        ...
                      </span>
                    );
                  }
                  
                  pages.push(
                    <button
                      key={totalPages}
                      onClick={() => {
                        setCurrentPage(totalPages);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="px-2 md:px-4 py-2 text-sm md:text-base transition-colors border-b-2"
                      style={{
                        backgroundColor: 'transparent',
                        color: currentPage === totalPages ? '#FBFBFB' : '#C2B79C',
                        borderBottomColor: currentPage === totalPages ? '#FBFBFB' : 'rgba(194, 183, 156, 0.3)'
                      }}
                      onMouseEnter={(e) => {
                        if (currentPage !== totalPages) {
                          e.currentTarget.style.backgroundColor = 'rgba(194, 183, 156, 0.1)';
                          e.currentTarget.style.borderBottomColor = '#C2B79C';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (currentPage !== totalPages) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.borderBottomColor = 'rgba(194, 183, 156, 0.3)';
                        }
                      }}
                    >
                      {totalPages}
                    </button>
                  );
                }
                
                return pages;
              })()}
              
                {/* 下一页 */}
                <button
                  onClick={() => {
                    setCurrentPage(prev => Math.min(totalPages, prev + 1));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  disabled={currentPage === totalPages}
                  className="px-2 md:px-4 py-2 text-sm md:text-base transition-colors border-b-2"
                  style={{
                    backgroundColor: 'transparent',
                    color: currentPage === totalPages ? '#6B7280' : '#C2B79C',
                    borderBottomColor: currentPage === totalPages ? 'transparent' : 'rgba(194, 183, 156, 0.3)',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    if (currentPage !== totalPages) {
                      e.currentTarget.style.backgroundColor = 'rgba(194, 183, 156, 0.1)';
                      e.currentTarget.style.borderBottomColor = '#C2B79C';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (currentPage !== totalPages) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.borderBottomColor = 'rgba(194, 183, 156, 0.3)';
                    }
                  }}
                >
                  下一页
                </button>
              </div>
              
              {/* 跳转到指定页面 */}
              <div className="flex items-center justify-center space-x-2">
                <span className="text-gray-400 text-xs md:text-sm">跳转到</span>
                <input
                  type="text"
                  value={jumpToPage}
                  onChange={(e) => {
                    // 只允许输入数字
                    const value = e.target.value.replace(/[^0-9]/g, '');
                    setJumpToPage(value);
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      const pageNum = parseInt(jumpToPage);
                      if (pageNum >= 1 && pageNum <= totalPages) {
                        setCurrentPage(pageNum);
                        setJumpToPage('');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }
                    }
                  }}
                  className="w-12 md:w-16 px-1 md:px-2 py-1 text-sm md:text-base text-center bg-transparent border focus:outline-none"
                  style={{
                    // 移除数字输入框的上下箭头
                    WebkitAppearance: 'none',
                    MozAppearance: 'textfield',
                    borderColor: '#AEAEAE',
                    color: '#AEAEAE'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#C2B79C';
                    e.target.style.color = '#C2B79C';
                    e.target.style.boxShadow = '0 0 0 1px #C2B79C';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#AEAEAE';
                    e.target.style.color = '#AEAEAE';
                    e.target.style.boxShadow = 'none';
                  }}
                  placeholder={currentPage.toString()}
                />
                <span className="text-gray-400 text-xs md:text-sm">页</span>
                <button
                  onClick={() => {
                    const pageNum = parseInt(jumpToPage);
                    if (pageNum >= 1 && pageNum <= totalPages) {
                      setCurrentPage(pageNum);
                      setJumpToPage('');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                  }}
                  disabled={!jumpToPage || parseInt(jumpToPage) < 1 || parseInt(jumpToPage) > totalPages}
                  className="px-2 md:px-3 py-1 text-xs md:text-sm transition-colors border"
                  style={{
                    backgroundColor: 'transparent',
                    color: (!jumpToPage || parseInt(jumpToPage) < 1 || parseInt(jumpToPage) > totalPages) ? '#6B7280' : '#C2B79C',
                    borderColor: (!jumpToPage || parseInt(jumpToPage) < 1 || parseInt(jumpToPage) > totalPages) ? '#6B7280' : '#C2B79C',
                    cursor: (!jumpToPage || parseInt(jumpToPage) < 1 || parseInt(jumpToPage) > totalPages) ? 'not-allowed' : 'pointer'
                  }}
                >
                  跳转
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* 主战者详情弹窗 */}
      {selectedFaction && (
        <FactionDetailModal 
          faction={selectedFaction} 
          onClose={closeFactionDetail}
        />
      )}
    </div>
  );
};

// 主战者卡片组件
const FactionCard: React.FC<{ 
  faction: Faction; 
  onClick: () => void; 
}> = ({ faction, onClick }) => {
  const getFactionColor = (factionId: string) => {
    const colors = {
      neutral: 'from-gray-600 to-gray-800',
      hero1: 'from-blue-600 to-blue-800',
      hero2: 'from-red-600 to-red-800',
      hero3: 'from-green-600 to-green-800',
    };
    return colors[factionId as keyof typeof colors] || 'from-purple-600 to-purple-800';
  };

  return (
    <div 
      className="relative cursor-pointer"
      onClick={onClick}
    >
                  <div
              className="relative rounded-xl p-8 shadow-lg border border-opacity-20 border-white backdrop-blur-sm overflow-hidden"
              style={{
                width: '288px',
                height: '403px'
              }}
            >
              {/* 卡图背景层 */}
              <div 
                className="absolute inset-0 z-0"
                style={{
                  backgroundImage: 'url(/Cardborder/defaultpic.png)',
                  backgroundSize: '100% 100%',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat'
                }}
              ></div>
              
              {/* 边框层 */}
              <div 
                className="absolute inset-0 z-5"
                style={{
                  backgroundImage: 'url(/Cardborder/factionsborder.png)',
                  backgroundSize: '100% 100%',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat'
                }}
              ></div>
              
              {/* 内容层 */}
              <div className="relative z-10">
          {/* 主战者名称 */}
          <div className="text-center mb-4">
            {/* 主标题在上面 */}
            <h3 style={{ 
                  fontFamily: 'QingNiaoHuaGuangYaoTi, sans-serif',
                  fontSize: '18px', // 20px减少2px变成18px
                  color: '#918273',
                  marginTop: '2px', // 主标题再往上1px (3px - 1px = 2px)
                  fontWeight: '550' // 使用数字或 'normal', 'bold', 'lighter' 等
                }}>
              {faction.name.replace(/\[.*?\]/g, '').trim()}
            </h3>
            {/* 提取[]内容作为副标题 - 现在在主标题下面 */}
            <div style={{ 
                   fontFamily: 'QingNiaoHuaGuangYaoTi, sans-serif',
                   minHeight: '20px', // 确保即使没有内容也占据空间
                   color: '#282A3A',
                   marginTop: '-7px', // 副标题往下1px（-8px + 1px = -7px）
                   marginBottom: '7px',
                   fontSize: '12px' // text-sm是14px，减少2px变成12px
                 }}>
              {faction.name.includes('[') && faction.name.includes(']') 
                ? faction.name.match(/\[(.*?)\]/)?.[1] 
                : ''}
            </div>
          </div>

          {/* 标签显示 */}
          {faction.tags && faction.tags.length > 0 && (
            <div className="text-center mb-2" style={{ marginTop: '140px' }}>
              <div className="flex flex-wrap justify-center gap-1">
                {faction.tags.slice(0, 3).map((tag, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 text-xs rounded-full"
                    style={{
                      backgroundColor: 'rgba(145, 130, 115, 0.2)',
                      color: '#918273',
                      border: '1px solid rgba(145, 130, 115, 0.3)'
                    }}
                  >
                    {tag}
                  </span>
                ))}
                {faction.tags.length > 3 && (
                  <span
                    className="px-2 py-1 text-xs rounded-full"
                    style={{
                      backgroundColor: 'rgba(145, 130, 115, 0.2)',
                      color: '#918273',
                      border: '1px solid rgba(145, 130, 115, 0.3)'
                    }}
                  >
                    +{faction.tags.length - 3}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* 主战者效果描述 */}
          <div className="text-center flex justify-center" style={{ marginTop: faction.tags && faction.tags.length > 0 ? '20px' : '180px' }}>
            <div 
              className="text-sm leading-relaxed overflow-hidden"
              style={{ 
                color: '#111111',
                textShadow: '1px 1px 2px rgba(255,255,255,0.8)',
                height: faction.tags && faction.tags.length > 0 ? '70px' : '90px',
                display: '-webkit-box',
                WebkitLineClamp: faction.tags && faction.tags.length > 0 ? 2 : 3,
                WebkitBoxOrient: 'vertical',
                textOverflow: 'ellipsis',
                width: '200px'
              }}
            >
              {faction.description || '暂无详细描述'}
            </div>
          </div>


        </div>
      </div>
    </div>
  );
};

// 主战者详情弹窗组件
const FactionDetailModal: React.FC<{ faction: Faction; onClose: () => void }> = ({ faction, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="relative flex flex-col items-center">
        {/* 关闭按钮移到下方 */}

        {/* 卡片容器 - 和预览卡片相同的结构，放大1.7倍 */}
        <div
          className="relative rounded-xl shadow-2xl border border-opacity-20 border-white backdrop-blur-sm overflow-hidden faction-detail-modal"
          style={{
            width: '490px', // 288 * 1.7 = 489.6
            height: '685px', // 403 * 1.7 = 685.1
            padding: '54px' // 32px * 1.7 = 54.4 (原来p-8是32px)
          }}
        >
          {/* 卡图背景层 */}
          <div 
            className="absolute inset-0 z-0"
            style={{
              backgroundImage: 'url(/Cardborder/defaultpic.png)',
              backgroundSize: '100% 100%',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat'
            }}
          ></div>
          
          {/* 边框层 */}
          <div 
            className="absolute inset-0 z-5"
            style={{
              backgroundImage: 'url(/Cardborder/factionsborder.png)',
              backgroundSize: '100% 100%',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat'
            }}
          ></div>
          
          {/* 内容层 */}
          <div className="relative z-10 h-full flex flex-col">
            {/* 主战者名称 */}
            <div className="text-center mb-4">
              {/* 主标题在上面 */}
              <h3 style={{ 
                    fontFamily: 'QingNiaoHuaGuangYaoTi, sans-serif',
                    fontSize: '28px', // 18px * 1.7 = 30.6px，约28px
                    color: '#918273',
                    marginTop: '6px', // 主标题往上2px（8px - 2px = 6px，1px * 1.7 ≈ 2px）
                    fontWeight: '500' // 详情弹窗主标题字重
                  }}>
                {faction.name.replace(/\[.*?\]/g, '').trim()}
              </h3>
              {/* 提取[]内容作为副标题 - 现在在主标题下面 */}
              <div style={{ 
                     fontFamily: 'QingNiaoHuaGuangYaoTi, sans-serif',
                     minHeight: '24px', // 按1.7倍放大：20px * 1.7 = 34px，但保持合理尺寸
                     color: '#282A3A',
                     marginTop: '-5px', // 副标题往上5px（3px * 1.7 ≈ 5px）
                     marginBottom: '12px', // 7px * 1.7 ≈ 12px，使用marginBottom方式
                     fontSize: '18px' // 12px * 1.7 = 20.4px，约18px
                   }}>
                {faction.name.includes('[') && faction.name.includes(']') 
                  ? faction.name.match(/\[(.*?)\]/)?.[1] 
                  : ''}
              </div>
            </div>

            {/* 标签显示 - 详情弹窗中显示所有标签 */}
            {faction.tags && faction.tags.length > 0 && (
              <div className="text-center mb-4" style={{ marginTop: '200px' }}>
                <div className="mb-2">
                  <span style={{ 
                    fontFamily: 'QingNiaoHuaGuangYaoTi, sans-serif',
                    fontSize: '16px',
                    color: '#918273',
                    fontWeight: '500'
                  }}>
                    标签
                  </span>
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  {faction.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 text-sm rounded-full"
                      style={{
                        backgroundColor: 'rgba(145, 130, 115, 0.2)',
                        color: '#918273',
                        border: '1px solid rgba(145, 130, 115, 0.3)'
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 图片显示 */}
            {faction.image && (
              <div className="text-center mb-4" style={{ marginTop: faction.tags && faction.tags.length > 0 ? '20px' : '220px' }}>
                <div className="mb-2">
                  <span style={{ 
                    fontFamily: 'QingNiaoHuaGuangYaoTi, sans-serif',
                    fontSize: '16px',
                    color: '#918273',
                    fontWeight: '500'
                  }}>
                    图片
                  </span>
                </div>
                <div className="flex justify-center">
                  <div
                    className="w-20 h-20 rounded border border-gray-300 overflow-hidden"
                    style={{
                      backgroundColor: 'rgba(145, 130, 115, 0.1)'
                    }}
                  >
                    <img
                      src={faction.image}
                      alt={`${faction.name} 图片`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // 图片加载失败时显示占位符
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          parent.innerHTML = `
                            <div class="w-full h-full flex items-center justify-center text-xs text-gray-500">
                              图片
                            </div>
                          `;
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 主战者效果描述 - 完整显示 */}
            <div className="text-center flex justify-center" style={{ 
              marginTop: (() => {
                let baseMargin = 280; // 从240增加到260，向下移动20px
                if (faction.tags && faction.tags.length > 0) baseMargin -= 40;
                if (faction.image) baseMargin -= 60;
                return `${Math.max(baseMargin, 40)}px`; // 最小值也从20增加到40
              })()
            }}>
              <div 
                className="text-lg leading-relaxed overflow-y-auto custom-scrollbar"
                style={{ 
                  color: '#111111',
                  textShadow: '1px 1px 2px rgba(255,255,255,0.8)',
                  height: (() => {
                    let baseHeight = 153;
                    if (faction.tags && faction.tags.length > 0) baseHeight -= 40;
                    if (faction.image) baseHeight -= 60;
                    return `${Math.max(baseHeight, 60)}px`;
                  })(),
                  width: '340px',
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#918273 transparent',
                  padding: '5px'
                }}
              >
                {faction.description ? (
                  <div>
                    {faction.description.split('*').map((part, index) => {
                      if (index === 0) {
                        // 第一部分，*之前的内容
                        return <span key={index}>{part}</span>;
                      } else {
                        // *之后的内容，换行并斜体显示
                        return (
                          <div key={index}>
                            <span style={{ fontStyle: 'italic' }}>*{part}</span>
                          </div>
                        );
                      }
                    })}
                  </div>
                ) : (
                  '暂无详细描述'
                )}
              </div>
            </div>


          </div>
        </div>
        
        {/* 关闭按钮 - 位于卡片下方30px，居中 */}
        <button
          onClick={onClose}
          className="mt-8 rounded-full p-2 transition-colors shadow-lg hover:bg-gray-800 hover:bg-opacity-20"
          style={{
            backgroundColor: 'transparent'
          }}
        >
          <svg 
            className="w-8 h-8" 
            viewBox="0 0 1024 1024" 
            fill="#FBFBFB"
          >
            <path d="M589.824 501.76L998.4 93.184c20.48-20.48 20.48-54.784 0-75.264l-2.048-2.048c-20.48-20.48-54.784-20.48-75.264 0L512.512 424.96 103.936 15.36c-20.48-20.48-54.784-20.48-75.264 0l-2.56 2.56C5.12 38.4 5.12 72.192 26.112 93.184L434.688 501.76 26.112 910.336c-20.48 20.48-20.48 54.784 0 75.264l2.048 2.048c20.48 20.48 54.784 20.48 75.264 0l408.576-408.576 408.576 408.576c20.48 20.48 54.784 20.48 75.264 0l2.048-2.048c20.48-20.48 20.48-54.784 0-75.264L589.824 501.76z" />
          </svg>
        </button>
      </div>
    </div>
  );
};

// 加载文字组件
const LoadingText: React.FC = () => {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => {
        if (prev === '...') return '';
        return prev + '.';
      });
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div 
      className="text-white text-2xl"
      style={{ 
        fontFamily: 'QingNiaoHuaGuangYaoTi, sans-serif',
        color: '#C2B79C'
      }}
    >
      加载中{dots}
    </div>
  );
};

export default FactionCollection;
