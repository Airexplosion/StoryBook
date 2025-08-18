import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { RootState } from '../../store/store';
import { Card, PaginatedResponse, PaginationInfo } from '../../types';
import CardForm from './CardForm';
import SearchableSelect from '../common/SearchableSelect';
import api from '../../services/api';
import { keywords, formatEffectText, TooltipState } from '../../utils/keywords';

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
    overflow: hidden;
    transition: transform 0.3s ease;
  }
  
  .card-flip-container:hover {
    box-shadow: 0 0 20px rgba(194, 183, 156, 0.6);
  }

  @media (max-width: 768px) {
    .card-mobile-container:hover {
      transform: scale(0.8) !important;
      box-shadow: 0 0 20px rgba(194, 183, 156, 0.6);
    }
  }

  @media (max-width: 768px) {
    .card-mobile-container {
      transform: scale(0.7) !important;
      transform-origin: center !important;
      transition: none !important;
    }
    
    .card-mobile-grid {
      grid-auto-rows: calc(403px * 0.8 + 10px) !important;
      gap: 16px 10px !important;
      margin-top: 0px !important;
    }
    
    .card-detail-modal {
      transform: scale(0.7) !important;
      transform-origin: center !important;
    }
  }

  @media (min-width: 769px) {
    .card-desktop-grid {
      margin-top: 30px !important;
    }
  }

  .card-mobile-grid, .card-desktop-grid {
    overflow: visible !important;
  }

  .card-flip-container {
    overflow: visible !important;
  }

  .max-w-7xl {
    overflow: visible !important;
  }

  .card-flip-inner {
    position: relative;
    width: 100%;
    height: 100%;
    transform-style: preserve-3d;
    border-radius: 5px;
    transform: rotateY(0deg);
    transition: transform 0.8s ease-in-out;
    min-height: 403px;
  }
  
  .card-flip-inner.flipped {
    transform: rotateY(180deg);
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



  /* 自定义滚动条样式 */
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

// 注入样式到页面
if (typeof document !== 'undefined') {
  const styleElement = document.getElementById('card-animations');
  if (!styleElement) {
    const style = document.createElement('style');
    style.id = 'card-animations';
    style.textContent = animationStyles;
    document.head.appendChild(style);
  }
}





// 提示框组件
const Tooltip: React.FC<{ 
  children: React.ReactNode; 
  content: string; 
  isVisible: boolean; 
  position: { x: number; y: number } 
}> = ({ children, content, isVisible, position }) => {
  return (
    <div className="relative inline-block">
      {children}
      {isVisible && (
        <div 
          className="absolute z-50 px-3 py-2 text-sm rounded-lg shadow-lg border"
          style={{
            backgroundColor: '#2A2A2A',
            color: '#FBFBFB',
            borderColor: '#4F6A8D',
            left: position.x,
            top: position.y,
            maxWidth: '300px',
            whiteSpace: 'pre-wrap'
          }}
        >
          {content}
          <div 
            className="absolute w-2 h-2 transform rotate-45"
            style={{
              backgroundColor: '#2A2A2A',
              borderColor: '#4F6A8D',
              borderLeft: '1px solid',
              borderBottom: '1px solid',
              left: '-6px',
              top: '50%',
              marginTop: '-4px'
            }}
          />
        </div>
      )}
    </div>
  );
};

const CardCollection: React.FC = () => {
  const location = useLocation();
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);
  const [filter, setFilter] = useState({
    type: 'all',
    faction: 'all',
    cost: 'all',
    search: '',
    searchType: 'name' // 'name' 或 'effect'
  });
  
  // 添加防抖搜索状态
  const [searchInput, setSearchInput] = useState(filter.search);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  // 排序状态
  const [sortBy, setSortBy] = useState<'none' | 'cost' | 'name' | 'faction'>('none');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  
  // 筛选下拉菜单状态
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showFactionDropdown, setShowFactionDropdown] = useState(false);
  const [showCostDropdown, setShowCostDropdown] = useState(false);
  
  // 主角筛选搜索状态
  const [factionSearchTerm, setFactionSearchTerm] = useState('');
  
  // 页面跳转状态
  const [jumpToPage, setJumpToPage] = useState('');

  // 提示框状态
  const [tooltip, setTooltip] = useState<TooltipState>({
    isVisible: false,
    content: '',
    position: { x: 0, y: 0 }
  });

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12; // 固定为12，与factions页面一致
  const [cards, setCards] = useState<Card[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 管理员功能状态
  const [showFactionModal, setShowFactionModal] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [customFactions, setCustomFactions] = useState<Array<{ id: string; name: string; description?: string }>>([
    { id: 'neutral', name: '中立' },
    { id: 'hero1', name: '主角1专属' },
    { id: 'hero2', name: '主角2专属' },
    { id: 'hero3', name: '主角3专属' }
  ]);
  const [customTypes, setCustomTypes] = useState([
    { id: 'story', name: '故事牌' },
    { id: 'character', name: '配角牌' },
    { id: 'hero', name: '主角牌' }
  ]);
  const [customCategories, setCustomCategories] = useState({
    story: [
      { id: 'event', name: '事件', description: '需要支付费用主动使用' },
      { id: 'background', name: '背景', description: '加入手中时自动使用' }
    ],
    character: [
      { id: 'character', name: '配角', description: '进入故事后才会成为实体单位' }
    ],
    hero: [
      { id: 'hero', name: '主角', description: '为主角提供持续性效果' }
    ]
  });

  const { user } = useSelector((state: RootState) => state.auth);





  // 加载卡牌数据
  const loadCards = async (page: number = currentPage) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const params = {
        page,
        limit: itemsPerPage,
        search: filter.search || undefined,
        type: filter.type !== 'all' ? filter.type : undefined,
        faction: filter.faction !== 'all' ? filter.faction : undefined,
        cost: filter.cost !== 'all' ? filter.cost : undefined,
        sortBy: sortBy !== 'none' ? sortBy : undefined,
        sortDirection: sortDirection.toUpperCase(),
      };

      const response = await api.cards.getAll(params);
      const data = response.data;
      
      setCards(data.cards || []);
      setPagination(data.pagination);
    } catch (err: any) {
      setError(err.message || '加载卡牌失败');
      console.error('加载卡牌错误:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // 防抖搜索处理
  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    
    // 清除之前的定时器
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    // 设置新的定时器，延长防抖时间以避免中文输入法被打断
    const newTimeout = setTimeout(() => {
      setFilter(prev => ({ ...prev, search: value }));
    }, 1000); // 增加到1000ms防抖延迟，避免中文输入法被打断
    
    setSearchTimeout(newTimeout);
  };

  // 动画触发逻辑
  useEffect(() => {
    // 每次进入cards页面都重置并触发翻面动画
    if (location.pathname === '/cards' && cards.length > 0) {
      console.log('重置并触发翻面动画，卡片数量:', cards.length);
      
      // 重置动画状态
      setIsAnimating(false);
      setAnimationKey(prev => prev + 1);
      
      // 短暂延迟后开始动画
      const startTimer = setTimeout(() => {
        setIsAnimating(true);
      }, 200);
      
      return () => clearTimeout(startTimer);
    }
  }, [location.pathname, cards.length]);

  useEffect(() => {
    loadCards(1);
    setCurrentPage(1);
    // 加载游戏配置
    loadGameConfig();
  }, [filter]);
  
  // 清理定时器
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

  useEffect(() => {
    loadCards(currentPage);
    loadGameConfig(); // 加载游戏配置以获取主角信息
  }, [currentPage, itemsPerPage, sortBy, sortDirection]);

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.relative')) {
        setShowSortDropdown(false);
        setShowTypeDropdown(false);
        setShowFactionDropdown(false);
        setShowCostDropdown(false);
        setFactionSearchTerm(''); // 清空搜索词
      }
    };

    if (showSortDropdown || showTypeDropdown || showFactionDropdown || showCostDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showSortDropdown, showTypeDropdown, showFactionDropdown, showCostDropdown]);

  // 加载游戏配置
  const loadGameConfig = async () => {
    try {
      const response = await api.config.getConfig();
      const config = response.data;
      
      if (config.factions) {
        setCustomFactions(config.factions);
      }
      if (config.types) setCustomTypes(config.types);
      if (config.categories) setCustomCategories(config.categories);
    } catch (error) {
      console.error('加载配置失败:', error);
      // 如果加载失败，保持默认值
    }
  };

  // 保存主战者配置
  const saveFactionConfig = async (factions: Array<{ id: string; name: string; description?: string }> = customFactions) => {
    try {
      await api.config.updateFactions(factions);
      console.log('主战者配置已保存');
    } catch (error) {
      console.error('保存主战者配置失败:', error);
      alert('保存失败，请重试');
    }
  };

  // 保存类型配置
  const saveTypeConfig = async (types = customTypes) => {
    try {
      await api.config.updateTypes(types);
      console.log('类型配置已保存');
    } catch (error) {
      console.error('保存类型配置失败:', error);
      alert('保存失败，请重试');
    }
  };

  // 保存类别配置
  const saveCategoryConfig = async (categories = customCategories) => {
    try {
      await api.config.updateCategories(categories);
      console.log('类别配置已保存');
      // 保存成功后重新加载配置，确保数据同步
      await loadGameConfig();
    } catch (error) {
      console.error('保存类别配置失败:', error);
      alert('保存失败，请重试');
    }
  };

  // 获取所有可用的费用值和统计信息
  const [availableCosts, setAvailableCosts] = useState<string[]>([]);
  const [allCards, setAllCards] = useState<Card[]>([]);
  
  // 加载所有卡牌用于统计和筛选选项
  useEffect(() => {
    const loadAllCardsForStats = async () => {
      try {
        // 获取所有卡牌的信息（不分页，不应用筛选条件）
        const response = await api.cards.getAll({ limit: 10000 }); // 设置一个很大的limit来获取所有数据
        const allCardsData: Card[] = response.data.cards || [];
        setAllCards(allCardsData);
        
        // 提取费用选项
        const costs = Array.from(new Set(allCardsData.map((card: Card) => card.cost))).sort((a: string, b: string) => {
          // 数字费用排在前面，字母费用排在后面
          const aIsNumber = !isNaN(Number(a));
          const bIsNumber = !isNaN(Number(b));
          if (aIsNumber && bIsNumber) return Number(a) - Number(b);
          if (aIsNumber && !bIsNumber) return -1;
          if (!aIsNumber && bIsNumber) return 1;
          return a.localeCompare(b);
        });
        setAvailableCosts(costs as string[]);
      } catch (error) {
        console.error('加载卡牌统计信息失败:', error);
      }
    };
    
    loadAllCardsForStats();
  }, []);


  const handleUpdateCard = async (cardData: Partial<Card>) => {
    if (editingCard) {
      try {
        await api.cards.update(editingCard._id, cardData);
        setEditingCard(null);
        // 重新加载当前页
        await loadCards(currentPage);
      } catch (error) {
        console.error('更新卡牌失败:', error);
        alert('更新卡牌失败，请重试');
      }
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    if (window.confirm('确定要删除这张卡牌吗？')) {
      try {
        await api.cards.delete(cardId);
        // 重新加载当前页
        await loadCards(currentPage);
      } catch (error) {
        console.error('删除卡牌失败:', error);
        alert('删除卡牌失败，请重试');
      }
    }
  };

  const handleCardClick = (card: Card) => {
    setSelectedCard(card);
  };

  const closeCardDetail = () => {
    setSelectedCard(null);
  };

  const getCardTypeText = (type: string) => {
    switch (type) {
      case 'story': return '故事牌';
      case 'character': return '配角牌';
      case 'hero': return '主角牌';
      default: return type;
    }
  };

  const getFactionText = (faction: string) => {
    const factionData = customFactions.find(f => f.id === faction);
    return factionData ? factionData.name : faction;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingText />
      </div>
    );
  }

  // 使用服务端分页，直接显示cards数据
  const totalPages = pagination?.totalPages || 1;

  return (
    <div className="max-w-7xl mx-auto">
      {/* 全局提示框 */}
      {tooltip.isVisible && (
        <div 
          className="fixed z-[9999] px-3 py-2 text-sm rounded-lg shadow-lg border pointer-events-none"
          style={{
            backgroundColor: '#2A2A2A',
            color: '#FBFBFB',
            borderColor: '#4F6A8D',
            left: tooltip.position.x,
            top: tooltip.position.y,
            maxWidth: '300px',
            whiteSpace: 'pre-wrap',
            transform: 'translateX(-50%)'
          }}
        >
          {tooltip.content}
          <div 
            className="absolute w-2 h-2 transform rotate-45"
            style={{
              backgroundColor: '#2A2A2A',
              borderColor: '#4F6A8D',
              borderLeft: '1px solid',
              borderBottom: '1px solid',
              left: '50%',
              top: '100%',
              marginLeft: '-4px',
              marginTop: '-1px'
            }}
          />
        </div>
      )}
      {/* 页面标题和搜索栏 */}
      <div className="mb-10">
        <div className="mb-4">
          <div className="text-center">
            <h1 className="text-white text-4xl md:text-6xl" style={{ fontFamily: 'HYAoDeSaiJ, sans-serif', letterSpacing: '0.1em', lineHeight: '1.1', fontWeight: 'normal' }}>
              卡牌集
            </h1>
            <p className="italic" style={{ fontSize: '16px', marginTop: '12px', color: '#AEAEAE' }}>
              浏览所有可用的卡牌，了解它们的特色和效果
            </p>
          </div>
          <div className="flex flex-col items-end" style={{ display: 'none' }}>
            <div className="relative max-w-lg">
              <input
                type="text"
                placeholder="搜索卡牌..."
                value={searchInput}
                onChange={(e) => handleSearchChange(e.target.value)}
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
                 共找到 <span className="font-semibold" style={{ color: '#4F6A8D' }}>{pagination?.totalItems || cards.length}</span> 张卡牌
                 {totalPages > 1 && (
                   <span className="ml-2">
                     (第 {currentPage} 页，共 {totalPages} 页)
                   </span>
                 )}
               </div>
              {searchInput && (
                <button
                  onClick={() => {
                    setSearchInput('');
                    setFilter(prev => ({ ...prev, search: '' }));
                  }}
                  className="text-gray-400 hover:text-white transition-colors text-sm mt-1"
                >
                  清除搜索
                </button>
              )}
            </div>
            {/* 管理员按钮组 */}
            {user?.isAdmin && (
              <div className="flex items-center space-x-3 mt-4">
                <button
                  onClick={() => setShowTypeModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center space-x-2"
                  title="管理卡牌类型"
                >
                  <span>⚙️</span>
                  <span>管理类型</span>
                </button>
                <button
                  onClick={() => setShowCategoryModal(true)}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center space-x-2"
                  title="管理卡牌类别"
                >
                  <span>📋</span>
                  <span>管理类别</span>
                </button>
                <button
                  onClick={() => setShowFactionModal(true)}
                  className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center space-x-2"
                  title="管理卡牌主战者"
                >
                  <span>🏛️</span>
                  <span>管理主战者</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-500 bg-opacity-20 border border-red-500 text-red-100 px-4 py-3 rounded-md mb-6">
          ❌ 错误: {error}
        </div>
      )}

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
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full px-3 py-2 bg-white bg-opacity-10 border border-gray-500 text-white placeholder-gray-400 focus:outline-none"
            placeholder="输入卡牌名称或效果..."
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

        {/* 筛选和排序选项 */}
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          {/* 左侧三个筛选器 - 平均分配剩余宽度 */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 卡牌类型筛选 */}
            <div className="relative">
              <button
                onClick={() => setShowTypeDropdown(!showTypeDropdown)}
                className="w-full px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-between"
                style={{ 
                  backgroundColor: '#3F3832',
                  border: '1px solid #C2B79C'
                }}
              >
                <span>
                  {filter.type === 'all' ? '全部类型' : 
                   customTypes.find(type => type.id === filter.type)?.name || '全部类型'}
                </span>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                  <path d="M6 9L1 4h10L6 9z"/>
                </svg>
              </button>
              
              {showTypeDropdown && (
                <div 
                  className="absolute top-full left-0 right-0 border border-gray-500 z-50 overflow-y-auto"
                  style={{ backgroundColor: '#414141', maxHeight: '400px' }}
                >
                  <button
                    onClick={() => {
                      setFilter({...filter, type: 'all'});
                      setShowTypeDropdown(false);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-gray-600 transition-colors"
                    style={{ color: '#AEAEAE' }}
                  >
                    全部类型
                  </button>
                  {customTypes.map((type, index) => (
                    <React.Fragment key={type.id}>
                      <div style={{ height: '1px', backgroundColor: '#C2B79C' }}></div>
                      <button
                        onClick={() => {
                          setFilter({...filter, type: type.id});
                          setShowTypeDropdown(false);
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-gray-600 transition-colors"
                        style={{ color: '#AEAEAE' }}
                      >
                        {type.name}
                      </button>
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>

            {/* 卡牌主角筛选 */}
            <div className="relative">
              <button
                onClick={() => setShowFactionDropdown(!showFactionDropdown)}
                className="w-full px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-between"
                style={{ 
                  backgroundColor: '#3F3832',
                  border: '1px solid #C2B79C'
                }}
              >
                <span>
                  {filter.faction === 'all' ? '全部主角' : 
                   customFactions.find(faction => faction.id === filter.faction)?.name || '全部主角'}
                </span>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                  <path d="M6 9L1 4h10L6 9z"/>
                </svg>
              </button>
              
              {showFactionDropdown && (
                <div 
                  className="absolute top-full left-0 right-0 border border-gray-500 z-50 overflow-y-auto"
                  style={{ backgroundColor: '#414141', maxHeight: '400px' }}
                >
                  {/* 搜索输入框 */}
                  <div className="p-2 border-b" style={{ borderColor: '#C2B79C' }}>
                    <input
                      type="text"
                      placeholder="搜索主角..."
                      value={factionSearchTerm}
                      onChange={(e) => setFactionSearchTerm(e.target.value)}
                      className="w-full px-2 py-1 text-white placeholder-gray-400 focus:outline-none"
                      style={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid #C2B79C'
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  
                  <button
                    onClick={() => {
                      setFilter({...filter, faction: 'all'});
                      setShowFactionDropdown(false);
                      setFactionSearchTerm('');
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-gray-600 transition-colors"
                    style={{ color: '#AEAEAE' }}
                  >
                    全部主角
                  </button>
                  {customFactions
                    .filter(faction => 
                      faction.name.toLowerCase().includes(factionSearchTerm.toLowerCase())
                    )
                    .map((faction, index) => (
                    <React.Fragment key={faction.id}>
                      <div style={{ height: '1px', backgroundColor: '#C2B79C' }}></div>
                      <button
                        onClick={() => {
                          setFilter({...filter, faction: faction.id});
                          setShowFactionDropdown(false);
                          setFactionSearchTerm('');
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-gray-600 transition-colors"
                        style={{ color: '#AEAEAE' }}
                      >
                        {faction.name}
                      </button>
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>

            {/* 费用筛选 */}
            <div className="relative">
              <button
                onClick={() => setShowCostDropdown(!showCostDropdown)}
                className="w-full px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-between"
                style={{ 
                  backgroundColor: '#3F3832',
                  border: '1px solid #C2B79C'
                }}
              >
                <span>
                  {filter.cost === 'all' ? '全部费用' : filter.cost}
                </span>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                  <path d="M6 9L1 4h10L6 9z"/>
                </svg>
              </button>
              
              {showCostDropdown && (
                <div 
                  className="absolute top-full left-0 right-0 border border-gray-500 z-50 overflow-y-auto"
                  style={{ backgroundColor: '#414141', maxHeight: '400px' }}
                >
                  <button
                    onClick={() => {
                      setFilter({...filter, cost: 'all'});
                      setShowCostDropdown(false);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-gray-600 transition-colors"
                    style={{ color: '#AEAEAE' }}
                  >
                    全部费用
                  </button>
                  {availableCosts.map((cost, index) => (
                    <React.Fragment key={cost}>
                      <div style={{ height: '1px', backgroundColor: '#C2B79C' }}></div>
                      <button
                        onClick={() => {
                          setFilter({...filter, cost: cost});
                          setShowCostDropdown(false);
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-gray-600 transition-colors"
                        style={{ color: '#AEAEAE' }}
                      >
                        {cost}
                      </button>
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 右侧排序选项 - 移动端全宽，桌面端固定宽度 */}
          <div className="w-full md:w-[200px]">
            <div className="relative">
              <button
                onClick={() => setShowSortDropdown(!showSortDropdown)}
                className="w-full px-3 py-2 border border-gray-500 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-between"
                style={{ backgroundColor: '#918273' }}
              >
                <span>
                  {sortBy === 'none' ? '无排序' : 
                   sortBy === 'cost' ? `费用 ${sortDirection === 'asc' ? '↑' : '↓'}` :
                   sortBy === 'name' ? `首字母 ${sortDirection === 'asc' ? '↑' : '↓'}` :
                   sortBy === 'faction' ? `主角 ${sortDirection === 'asc' ? '↑' : '↓'}` : ''}
                </span>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                  <path d="M6 9L1 4h10L6 9z"/>
                </svg>
              </button>
              
              {showSortDropdown && (
                <div 
                  className="absolute top-full left-0 right-0 border border-gray-500 z-50 overflow-y-auto"
                  style={{ backgroundColor: '#414141', maxHeight: '400px' }}
                >
                  <button
                    onClick={() => {
                      if (sortBy === 'cost') {
                        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortBy('cost');
                        setSortDirection('asc');
                      }
                      setShowSortDropdown(false);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-gray-600 transition-colors"
                    style={{ color: '#AEAEAE' }}
                  >
                    费用 {sortBy === 'cost' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                  </button>
                  <div style={{ height: '1px', backgroundColor: '#C2B79C' }}></div>
                  <button
                    onClick={() => {
                      if (sortBy === 'name') {
                        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortBy('name');
                        setSortDirection('asc');
                      }
                      setShowSortDropdown(false);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-gray-600 transition-colors"
                    style={{ color: '#AEAEAE' }}
                  >
                    首字母 {sortBy === 'name' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                  </button>
                  <div style={{ height: '1px', backgroundColor: '#C2B79C' }}></div>
                  <button
                    onClick={() => {
                      if (sortBy === 'faction') {
                        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortBy('faction');
                        setSortDirection('asc');
                      }
                      setShowSortDropdown(false);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-gray-600 transition-colors"
                    style={{ color: '#AEAEAE' }}
                  >
                    主角 {sortBy === 'faction' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 快速重置按钮和统计信息 */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2 md:gap-0">
          {/* 卡牌统计信息 */}
          <div className="text-gray-400 text-sm">
            共找到 <span className="font-semibold" style={{ color: '#4F6A8D' }}>{pagination?.totalItems || cards.length}</span> 张卡牌
            {totalPages > 1 && (
              <span className="ml-2">
                (第 {currentPage} 页，共 {totalPages} 页)
              </span>
            )}
          </div>
          
          <button
            onClick={() => {
              setFilter({ type: 'all', faction: 'all', cost: 'all', search: '', searchType: 'name' });
              setSearchInput(''); // 同时重置搜索输入框
              setSortBy('none'); // 重置排序
              setSortDirection('asc'); // 重置排序方向
            }}
            className="text-sm text-gray-400 hover:text-white transition-colors px-3 py-1 rounded border border-gray-600 hover:border-gray-500"
          >
重置筛选
          </button>
        </div>
      </div>



      {/* 统计信息 - 只有管理员可见 */}
      {user?.isAdmin && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-blue-400">{allCards.filter(c => getCardTypeText(c.type) === '故事牌').length}</div>
          <div className="text-gray-300 text-sm">故事牌</div>
        </div>
        <div className="rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-green-400">{allCards.filter(c => getCardTypeText(c.type) === '配角牌').length}</div>
          <div className="text-gray-300 text-sm">配角牌</div>
        </div>
        <div className="rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-purple-400">{allCards.filter(c => getCardTypeText(c.type) === '主角牌').length}</div>
          <div className="text-gray-300 text-sm">主角牌</div>
        </div>
        <div className="rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-yellow-400">{allCards.length}</div>
          <div className="text-gray-300 text-sm">总卡牌数</div>
        </div>
      </div>
      )}

      {/* 卡牌网格 */}
      {cards.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-gray-400 text-2xl mb-6 italic">
            {searchInput ? '未找到匹配的卡牌' : '暂无卡牌数据'}
          </div>
          {searchInput && (
            <button
              onClick={() => {
                setSearchInput('');
                setFilter(prev => ({ ...prev, search: '' }));
              }}
              className="hover:bg-gray-600 text-white px-8 py-3 rounded-lg transition-colors text-lg"
              style={{ backgroundColor: '#918273' }}
            >
              查看所有卡牌
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 justify-items-center gap-x-4 gap-y-2.5 md:gap-[10px] card-mobile-grid card-desktop-grid" style={{ marginTop: '-10px' }}>
            {cards.map((card, index) => {
              return (
                <div
                  key={`${card._id}-${animationKey}`}
                  className="card-flip-container card-mobile-container"
                  style={{
                    width: '288px',
                    height: '403px'
                  }}
                >
                  {/* 卡片翻面动画 */}
                  <div 
                    className={`card-flip-inner ${isAnimating ? 'flipped' : ''}`}
                    style={{
                      transitionDelay: `${index * 0.15}s`
                    }}
                  >
                    {/* 卡背 */}
                    <div className="card-face card-back">
                      <div 
                        className="w-full h-full rounded-xl"
                        style={{
                          backgroundImage: 'url(/Cardborder/Cardback.png)',
                          backgroundSize: '100% 100%',
                          backgroundPosition: 'center',
                          backgroundRepeat: 'no-repeat'
                        }}
                      ></div>
                    </div>
                    
                    {/* 卡面 */}
                    <div className="card-face card-front">
                      <CardComponent 
                        card={card} 
                        onClick={() => handleCardClick(card)}
                        customFactions={customFactions}
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

      {/* 卡牌详情弹窗 */}
      {selectedCard && (
        <CardDetailModal 
          card={selectedCard} 
          onClose={closeCardDetail}
          setTooltip={setTooltip}
        />
      )}






      {/* 编辑卡牌模态框 */}
      {editingCard && (
        <CardForm
          card={editingCard}
          onSubmit={handleUpdateCard}
          onCancel={() => setEditingCard(null)}
        />
      )}

      {/* 管理员模态框 - 管理卡牌类型 */}
      {showTypeModal && user?.isAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-white mb-4">管理卡牌类型</h3>
            
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {customTypes.map((type, index) => (
                <div key={type.id} className="flex items-center justify-between bg-white bg-opacity-10 p-3 rounded">
                  <div className="flex items-center space-x-2">
                    <span className="text-white">{type.name}</span>
                  </div>
                  <button
                    onClick={async () => {
                      const newTypes = customTypes.filter((_, i) => i !== index);
                      setCustomTypes(newTypes);
                      await saveTypeConfig(newTypes); // 添加这一行来保存更改
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-sm"
                  >
                    删除
                  </button>
                </div>
              ))}
            </div>
            
            <div className="mt-4 flex space-x-2">
              <input
                type="text"
                placeholder="类型名称"
                className="flex-1 px-3 py-2 bg-white bg-opacity-10 border border-gray-500 rounded text-white placeholder-gray-400"
                id="new-type-name"
              />
              <button 
                onClick={async () => {
                  const newTypeName = (document.getElementById('new-type-name') as HTMLInputElement).value;
                  if (newTypeName) {
                    const newTypeId = newTypeName.toLowerCase().replace(/\s+/g, '_');
                    const newTypes = [...customTypes, { id: newTypeId, name: newTypeName }];
                    setCustomTypes(newTypes);
                    
                    // 为新类型创建空的类别数组
                    const newCategories = { ...customCategories };
                    if (!newCategories[newTypeId as keyof typeof customCategories]) {
                      newCategories[newTypeId as keyof typeof customCategories] = [];
                    }
                    setCustomCategories(newCategories);
                    
                    await saveTypeConfig(newTypes);
                    await saveCategoryConfig(newCategories);
                    (document.getElementById('new-type-name') as HTMLInputElement).value = '';
                  }
                }}
                className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded"
              >
                添加
              </button>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowTypeModal(false)}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 管理员模态框 - 管理卡牌阵营 */}
      {showFactionModal && user?.isAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-white mb-4">管理卡牌主战者</h3>
            
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {customFactions.map((faction, index) => (
                <div key={faction.id} className="bg-white bg-opacity-10 p-3 rounded">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-semibold">{faction.name}</span>
                    <button
                      onClick={async () => {
                        const newFactions = customFactions.filter((_, i) => i !== index);
                        setCustomFactions(newFactions);
                        await saveFactionConfig(newFactions);
                      }}
                      className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-sm"
                    >
                      删除
                    </button>
                  </div>
                  {faction.description && (
                    <div className="text-gray-300 text-sm whitespace-pre-wrap">
                      效果描述: {faction.description}
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            <div className="mt-4 space-y-3">
              <input
                type="text"
                placeholder="主战者名称"
                className="w-full px-3 py-2 bg-white bg-opacity-10 border border-gray-500 rounded text-white placeholder-gray-400"
                id="new-faction-name"
              />
              <textarea
                placeholder="主战者效果描述（可选）"
                className="w-full px-3 py-2 bg-white bg-opacity-10 border border-gray-500 rounded text-white placeholder-gray-400 resize-none"
                rows={3}
                id="new-faction-description"
              />
              <div className="flex space-x-2">
                <button 
                  onClick={async () => {
                    const newFactionName = (document.getElementById('new-faction-name') as HTMLInputElement).value;
                    const newFactionDescription = (document.getElementById('new-faction-description') as HTMLTextAreaElement).value;
                    if (newFactionName) {
                      const newFactions = [...customFactions, { 
                        id: newFactionName.toLowerCase().replace(/\s+/g, '_'), 
                        name: newFactionName,
                        description: newFactionDescription.trim() || undefined
                      }];
                      setCustomFactions(newFactions);
                      await saveFactionConfig(newFactions);
                      (document.getElementById('new-faction-name') as HTMLInputElement).value = '';
                      (document.getElementById('new-faction-description') as HTMLTextAreaElement).value = '';
                    }
                  }}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded"
                >
                  添加
                </button>
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowFactionModal(false)}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 管理员模态框 - 管理卡牌类别 */}
      {showCategoryModal && user?.isAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-6 max-w-lg w-full max-h-[90vh] flex flex-col">
            <h3 className="text-xl font-bold text-white mb-4">管理卡牌类别</h3>
            
            <div className="space-y-4 overflow-y-auto flex-1 pr-2">
              {Object.entries(customCategories)
                .filter(([typeId, categories]) => categories.length > 0) // 只显示有类别的类型
                .map(([typeId, categories]) => (
                <div key={typeId} className="bg-white bg-opacity-10 p-4 rounded">
                  <h4 className="text-white font-semibold mb-2">
                    {customTypes.find(t => t.id === typeId)?.name} 类别
                  </h4>
                  <div className="space-y-2">
                    {categories.map((category, index) => (
                      <div key={category.id} className="flex items-center justify-between bg-white bg-opacity-10 p-2 rounded">
                        <div>
                          <span className="text-white font-medium">{category.name}</span>
                          <p className="text-gray-300 text-sm">{category.description}</p>
                        </div>
                        <button
                        onClick={async () => {
                          const newCategories = { ...customCategories };
                          newCategories[typeId as keyof typeof customCategories] = 
                            newCategories[typeId as keyof typeof customCategories].filter((_, i) => i !== index);
                          setCustomCategories(newCategories);
                          // 立即保存更改
                          await saveCategoryConfig(newCategories);
                        }}
                          className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-sm"
                        >
                          删除
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 space-y-2">
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        placeholder="新类别名称"
                        className="w-32 px-3 py-2 bg-white bg-opacity-10 border border-gray-500 rounded text-white placeholder-gray-400"
                        id={`new-category-name-${typeId}`}
                      />
                      <input
                        type="text"
                        placeholder="描述"
                        className="flex-1 px-3 py-2 bg-white bg-opacity-10 border border-gray-500 rounded text-white placeholder-gray-400"
                        id={`new-category-description-${typeId}`}
                      />
                      <button
                        onClick={async () => {
                          const newCategoryName = (document.getElementById(`new-category-name-${typeId}`) as HTMLInputElement).value;
                          const newCategoryDescription = (document.getElementById(`new-category-description-${typeId}`) as HTMLInputElement).value;
                          if (newCategoryName && newCategoryDescription) {
                            const newCategories = { ...customCategories };
                            // 确保该类型的类别数组存在
                            if (!newCategories[typeId as keyof typeof customCategories]) {
                              newCategories[typeId as keyof typeof customCategories] = [];
                            }
                            newCategories[typeId as keyof typeof customCategories] = [
                              ...newCategories[typeId as keyof typeof customCategories],
                              { id: newCategoryName, name: newCategoryName, description: newCategoryDescription }
                            ];
                            setCustomCategories(newCategories);
                            await saveCategoryConfig(newCategories); // 保存更改
                            (document.getElementById(`new-category-name-${typeId}`) as HTMLInputElement).value = '';
                            (document.getElementById(`new-category-description-${typeId}`) as HTMLInputElement).value = '';
                          }
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded whitespace-nowrap"
                      >
                        添加
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* 为所有类型显示添加类别的选项，包括没有类别的类型 */}
              {customTypes.map(type => {
                const hasCategories = customCategories[type.id as keyof typeof customCategories]?.length > 0;
                if (hasCategories) return null; // 如果已经有类别，上面已经显示了
                
                return (
                  <div key={`empty-${type.id}`} className="bg-white bg-opacity-10 p-4 rounded">
                    <h4 className="text-white font-semibold mb-2">
                      {type.name} 类别 <span className="text-gray-400 text-sm">(暂无类别)</span>
                    </h4>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        placeholder="新类别名称"
                        className="w-32 px-3 py-2 bg-white bg-opacity-10 border border-gray-500 rounded text-white placeholder-gray-400"
                        id={`new-category-name-${type.id}`}
                      />
                      <input
                        type="text"
                        placeholder="描述"
                        className="flex-1 px-3 py-2 bg-white bg-opacity-10 border border-gray-500 rounded text-white placeholder-gray-400"
                        id={`new-category-description-${type.id}`}
                      />
                      <button
                        onClick={async () => {
                          const newCategoryName = (document.getElementById(`new-category-name-${type.id}`) as HTMLInputElement).value;
                          const newCategoryDescription = (document.getElementById(`new-category-description-${type.id}`) as HTMLInputElement).value;
                          if (newCategoryName && newCategoryDescription) {
                            const newCategories = { ...customCategories };
                            if (!newCategories[type.id as keyof typeof customCategories]) {
                              newCategories[type.id as keyof typeof customCategories] = [];
                            }
                            newCategories[type.id as keyof typeof customCategories] = [
                              ...newCategories[type.id as keyof typeof customCategories],
                              { id: newCategoryName, name: newCategoryName, description: newCategoryDescription }
                            ];
                            setCustomCategories(newCategories);
                            await saveCategoryConfig(newCategories);
                            (document.getElementById(`new-category-name-${type.id}`) as HTMLInputElement).value = '';
                            (document.getElementById(`new-category-description-${type.id}`) as HTMLInputElement).value = '';
                          }
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded whitespace-nowrap"
                      >
                        添加
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowCategoryModal(false);
                  // 不需要在关闭时保存，因为每次操作都会立即保存
                }}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};



// 获取卡片背景图片的辅助函数
const getCardBackground = (cardType: string) => {
  const getCardTypeText = (type: string) => {
    switch (type) {
      case 'story': return '故事牌';
      case 'character': return '配角牌';
      case 'hero': return '主角牌';
      default: return type;
    }
  };
  
  const typeText = getCardTypeText(cardType);
  switch (typeText) {
    case '主角牌':
      return '/Cardborder/MaincharC.PNG';
    case '配角牌':
      return '/Cardborder/SubcharC.png';
    case '故事牌':
      return '/Cardborder/StoryC.png';
    case '关键字效果':
      return '/Cardborder/KeyC.png';
    default:
      return '/Cardborder/defaultpic.png';
  }
};

// 卡片组件
const CardComponent: React.FC<{ 
  card: Card; 
  onClick: () => void;
  customFactions: Array<{ id: string; name: string; description?: string }>;
  setTooltip?: (tooltip: TooltipState) => void;
}> = ({ card, onClick, customFactions, setTooltip }) => {
  const cardBackground = getCardBackground(card.type);
  
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
        {/* 默认卡图层 - 最底层 */}
        <div 
          className="absolute z-0"
          style={{
            backgroundImage: 'url(/Cardborder/defaultpic.png)',
            backgroundSize: '70%',
            backgroundPosition: 'bottom right',
            backgroundRepeat: 'no-repeat',
            width: '100%',
            height: '100%',
            bottom: '60px',
            right: '15px'
          }}
        ></div>
        
        {/* 卡图背景层 */}
        <div 
          className="absolute inset-0 z-10"
          style={{
            backgroundImage: `url(${cardBackground})`,
            backgroundSize: '100% 100%',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        ></div>
        
        {/* 内容层 */}
        <div className="relative z-20">
          {/* 数值显示 - 左上角 */}
          <div className="absolute flex flex-col space-y-1" style={{ top: '-7px', left: '11px' }}>
            {/* 费用 */}
            <div 
              style={{ 
                position: 'relative',
                left: (card.type === '故事牌' || card.type === '主角牌' || card.type === '关键字效果') ? '-9px' : '-3px',
                top: (card.type === '故事牌' || card.type === '主角牌' || card.type === '关键字效果') ? '24px' : (card.type === '配角牌') ? '5px' : '2px'
              }}
            >
              {(() => {
                const cost = card.cost;
                const numbersAndOtherSymbols = cost.replace(/\*/g, ''); // 数字和非*特殊字符一起显示
                const asterisks = cost.match(/\*/g)?.join('') || ''; // 只提取*符号
                
                return (
                  <>
                    {/* 数字和其他特殊字符部分 */}
                    <span 
                      style={{ 
                        fontFamily: 'Zoika-2, sans-serif',
                        fontSize: numbersAndOtherSymbols.length >= 2 ? '23px' : '28px', // 两位数小三号字
                        fontWeight: 'bold',
                        color: (card.type === '故事牌' || card.type === '关键字效果') ? '#424453' : '#debf97',
                        textShadow: '1px 0 0 #ffffff, -1px 0 0 #ffffff, 0 1px 0 #ffffff, 0 -1px 0 #ffffff', // 白色1px描边
                        position: 'relative',
                        left: numbersAndOtherSymbols.length >= 2 ? '-5px' : '0px', // 两位数往左5px
                        top: numbersAndOtherSymbols.length >= 2 ? '3px' : '0px' // 两位数往下3px
                      }}
                    >
                      {numbersAndOtherSymbols}
                    </span>
                    {/* *符号部分 - 单独定位 */}
                    {asterisks && (
                      <span 
                        style={{ 
                          fontFamily: 'Zoika-2, sans-serif',
                          fontSize: '20px',
                          fontWeight: 'bold',
                          color: (card.type === '故事牌' || card.type === '关键字效果') ? '#424453' : '#debf97',
                          textShadow: '1px 0 0 #ffffff, -1px 0 0 #ffffff, 0 1px 0 #ffffff, 0 -1px 0 #ffffff', // 白色1px描边
                          position: 'relative',
                          top: '2px',
                          left: '4px'
                        }}
                      >
                        {asterisks}
                      </span>
                    )}
                  </>
                );
              })()}
            </div>
            
            {/* 攻击和生命（仅配角牌显示） */}
            {getCardBackground(card.type).includes('SubcharC') && (
              <>
                <div 
                  style={{ 
                    fontFamily: 'Zoika-2, sans-serif',
                    fontSize: (card.attack?.toString().length ?? 0) >= 2 ? '22px' : '24px', // 两位数下调2px
                    fontWeight: 'bold',
                    color: '#4e4a44',
                    textShadow: '1px 0 0 #ffffff, -1px 0 0 #ffffff, 0 1px 0 #ffffff, 0 -1px 0 #ffffff', // 白色1px描边
                    position: 'relative',
                    left: (card.attack?.toString().length ?? 0) >= 2 ? '-25px' : '-19px', // 两位数往左6px
                    top: (() => {
                      const costIsTwo = card.cost.replace(/\*/g, '').length >= 2; // 费用是否两位数
                      const attackIsTwo = (card.attack?.toString().length ?? 0) >= 2; // 攻击是否两位数
                      let topValue = -1; // 基础位置
                      if (costIsTwo) topValue += 5; // 费用两位数往下5px
                      if (attackIsTwo) topValue += 2; // 攻击两位数往下2px
                      return `${topValue}px`;
                    })()
                  }}
                >
                  {card.attack}
                </div>
                <div 
                  style={{ 
                    fontFamily: 'Zoika-2, sans-serif',
                    fontSize: (card.health?.toString().length ?? 0) >= 2 ? '22px' : '24px', // 两位数下调2px
                    fontWeight: 'bold',
                    color: '#c78151',
                    textShadow: '1px 0 0 #ffffff, -1px 0 0 #ffffff, 0 1px 0 #ffffff, 0 -1px 0 #ffffff', // 白色1px描边
                    position: 'relative',
                    left: (card.health?.toString().length ?? 0) >= 2 ? '-11px' : '-5px', // 两位数往左6px
                    top: (() => {
                      const costIsTwo = card.cost.replace(/\*/g, '').length >= 2; // 费用是否两位数
                      const healthIsTwo = (card.health?.toString().length ?? 0) >= 2; // 生命是否两位数
                      let topValue = -8; // 基础位置
                      if (costIsTwo) topValue += 5; // 费用两位数往下5px
                      if (healthIsTwo) topValue += 2; // 生命两位数往下2px
                      return `${topValue}px`;
                    })()
                  }}
                >
                  {card.health}
                </div>
              </>
            )}
          </div>

          {/* 卡牌名称 */}
          <div className="text-center mb-4" style={{ marginTop: '-12px', marginLeft: '55px' }}>
            {/* 主标题在上面 */}
            <h3 style={{ 
              fontFamily: 'QingNiaoHuaGuangYaoTi, sans-serif',
              fontSize: '15px',
              color: '#282A3A',
              marginTop: '0px', // 从2px改为0px，往上移动2px
              fontWeight: '550',
              textShadow: '1px 0 0 white, -1px 0 0 white, 0 1px 0 white, 0 -1px 0 white' // 1px白色描边
            }}>
              {(() => {
                let displayName = card.name.replace(/\[.*?\]/g, '').trim();
                // 如果是关键字效果牌，去掉【关键字】部分
                if (card.type === '关键字效果') {
                  displayName = displayName.replace(/【关键字】/g, '');
                }
                // 去掉【特殊机制】部分
                displayName = displayName.replace(/【特殊机制】/g, '');
                // 去掉【衍生牌】部分
                displayName = displayName.replace(/【衍生牌】/g, '');
                // 符号替换为阴角符号
                return displayName
                  .replace(/\./g, '·')  // 点号替换为·
                  .replace(/\(/g, '「')  // 左括号替换为「
                  .replace(/\)/g, '」')  // 右括号替换为」
                  .replace(/\[/g, '【')  // 左方括号替换为【
                  .replace(/\]/g, '】')  // 右方括号替换为】
                  .replace(/\{/g, '〖')  // 左大括号替换为〖
                  .replace(/\}/g, '〗')  // 右大括号替换为〗
                  .replace(/</g, '〈')   // 小于号替换为〈
                  .replace(/>/g, '〉')   // 大于号替换为〉
                  .replace(/"/g, '『')   // 双引号替换为『
                  .replace(/'/g, '『')   // 单引号替换为『
                  .replace(/:/g, '：')   // 冒号替换为：
                  .replace(/;/g, '；')   // 分号替换为；
                  .replace(/!/g, '！')   // 感叹号替换为！
                  .replace(/\?/g, '？'); // 问号替换为？
              })()}
            </h3>
            {/* 提取[]内容作为副标题 - 现在在主标题下面 */}
            <div style={{ 
              fontFamily: 'QingNiaoHuaGuangYaoTi, sans-serif',
              minHeight: '20px',
              color: '#282A3A',
              marginTop: '-7px',
              marginBottom: '7px',
              fontSize: '12px'
            }}>
              {card.name.includes('[') && card.name.includes(']') 
                ? card.name.match(/\[(.*?)\]/)?.[1] 
                : ''}
            </div>
          </div>

          {/* 卡牌类型 - 纵向显示 */}
          <div className="absolute" style={{ 
            top: card.type === '关键字效果' ? '166px' : '176px', 
            left: '-5px'
          }}>
            {(() => {
              const type = card.type as string;
              let displayText = '';
              // 如果是故事牌或关键字效果，显示详细分类
              if (type === '故事牌' || type === 'story' || type === '关键字效果') {
                displayText = card.category || (type === '关键字效果' ? '关键字' : '故事');
              } else {
                switch (type) {
                  case 'character': displayText = '配角'; break;
                  case 'hero': displayText = '主角'; break;
                  case '配角牌': displayText = '配角'; break;
                  case '主角牌': displayText = '主角'; break;
                  default: displayText = type.replace('牌', '');
                }
              }
              
              // 如果超过3个字，使用较小字体和调整位置
              const isLongText = displayText.length > 3;
              
              return (
                <div 
                  style={{ 
                    fontFamily: 'QingNiaoHuaGuangYaoTi, sans-serif',
                    fontSize: isLongText ? '13px' : '18px', // 超过3个字的字体再小2px (15px -> 13px)
                    color: '#282A3A',
                    writingMode: 'vertical-rl',
                    textOrientation: 'upright',
                    letterSpacing: '1px',
                    position: 'relative',
                    left: isLongText ? '3px' : '0px', // 超过3个字的往右3px
                    top: isLongText ? '3px' : '2px' // 3个字的往下2px，超过3个字的再往下1px (2px+1px=3px)
                  }}
                >
                  {displayText}
                </div>
              );
            })()}
          </div>

          {/* 卡牌效果描述 */}
          <div className="text-center flex justify-center" style={{ marginTop: '220px', height: '65px' }}>
                          <div 
                className="text-sm leading-relaxed"
                style={{ 
                  color: '#111111',
                  textShadow: '1px 1px 2px rgba(255,255,255,0.8)',
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  width: '200px'
                }}
              >
{formatEffectText(card.effect, setTooltip)}
              </div>
          </div>

          {/* 风味文字 - 预览时不显示 */}
          
          {/* 提取标题中【】内容显示 - 不适用于关键字牌 */}
          {(() => {
            // 排除关键字牌
            if (card.type === '关键字效果') {
              return null;
            }
            
            const bracketMatch = card.name.match(/【(.*?)】/);
            if (bracketMatch) {
              return (
                <div style={{
                  position: 'absolute',
                  left: '50%',
                  top: 'calc(50% + 85px)',
                  transform: 'translate(-50%, -50%)',
                  fontFamily: 'QingNiaoHuaGuangYaoTi, sans-serif',
                  fontSize: '12px',
                  color: '#282A3A',
                  textShadow: '1px 0 0 white, -1px 0 0 white, 0 1px 0 white, 0 -1px 0 white',
                  letterSpacing: '0px',
                  lineHeight: '1'
                }}>
                  {bracketMatch[1]}
                </div>
              );
            }
            return null;
          })()}
          
          {/* 底部卡牌信息 - 相对于整个卡片容器定位 - 只有非主角牌且非关键字效果才显示 */}
          {card.type !== '主角牌' && card.type !== '关键字效果' && card.faction && (
            <div className="absolute left-0 right-0 text-center" style={{ 
              bottom: card.faction.includes('中立') ? '-40px' : '-60px' /* 中立主角往上17px */
            }}>
              {/* 主角名字 */}
              <div style={{ 
                fontFamily: 'QingNiaoHuaGuangYaoTi, sans-serif',
                fontSize: '14px',
                color: '#FBFBFB',
                textShadow: '0 3px 0 #282A3A, 1px 0 0 #282932, -1px 0 0 #282932, 0 1px 0 #282932, 0 -1px 0 #282932',
                marginBottom: '-2px'
              }}>
                {(() => {
                  // 直接使用card.faction，去掉[]部分显示主角名
                  const factionName = card.faction.replace(/\[.*?\]/g, '').trim();
                  return factionName || card.faction || '未知主角';
                })()}
              </div>
              
              {/* faction中[]内容作为副标题 */}
              {card.faction.includes('[') && card.faction.includes(']') && (
                <div style={{ 
                  fontFamily: 'QingNiaoHuaGuangYaoTi, sans-serif',
                  fontSize: '10px',
                  color: '#FBFBFB',
                  textShadow: '0 3px 0 #282A3A, 1px 0 0 #282932, -1px 0 0 #282932, 0 1px 0 #282932, 0 -1px 0 #282932',
                  marginBottom: '2px'
                }}>
                  {card.faction.match(/\[(.*?)\]/)?.[1]}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// 卡牌详情弹窗组件
const CardDetailModal: React.FC<{ 
  card: Card; 
  onClose: () => void;
  setTooltip: (tooltip: TooltipState) => void;
}> = ({ card, onClose, setTooltip }) => {
  const cardBackground = getCardBackground(card.type);
  const [detailTooltip, setDetailTooltip] = useState<TooltipState>({
    isVisible: false,
    content: '',
    position: { x: 0, y: 0 }
  });
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      {/* 详情弹窗专用提示框 */}
      {detailTooltip.isVisible && (
        <div 
          className="fixed z-[9999] px-3 py-2 text-sm rounded-lg shadow-lg border pointer-events-none"
          style={{
            backgroundColor: '#2A2A2A',
            color: '#FBFBFB',
            borderColor: '#4F6A8D',
            left: detailTooltip.position.x,
            top: detailTooltip.position.y,
            maxWidth: '300px',
            whiteSpace: 'pre-wrap',
            transform: 'translateX(-50%)'
          }}
        >
          {detailTooltip.content}
          <div 
            className="absolute w-2 h-2 transform rotate-45"
            style={{
              backgroundColor: '#2A2A2A',
              borderColor: '#4F6A8D',
              borderLeft: '1px solid',
              borderBottom: '1px solid',
              left: '50%',
              top: '100%',
              marginLeft: '-4px',
              marginTop: '-1px'
            }}
          />
        </div>
      )}
      <div className="relative flex flex-col items-center">
        {/* 卡片容器 - 和预览卡片相同的结构，放大1.7倍 */}
        <div
          className="relative rounded-xl shadow-2xl border border-opacity-20 border-white backdrop-blur-sm overflow-hidden card-detail-modal"
          style={{
            width: '490px', // 288 * 1.7
            height: '685px', // 403 * 1.7
            padding: '54px' // 32px * 1.7
          }}
        >
          {/* 卡图背景层 */}
          <div 
            className="absolute inset-0 z-0"
            style={{
              backgroundImage: `url(${cardBackground})`,
              backgroundSize: '100% 100%',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat'
            }}
          ></div>
          
          {/* 默认卡图层 */}
          <div 
            className="absolute"
            style={{
              backgroundImage: 'url(/Cardborder/defaultpic.png)',
              backgroundSize: '70%',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              bottom: '150px', // 102px + 200px (向上移动)
              right: '-35px', // 25px + 100px (向左移动)
              width: '460px',
              height: '460px',
              zIndex: -10
            }}
          ></div>
          
          {/* 内容层 */}
          <div className="relative z-10 h-full flex flex-col">
            {/* 数值显示 - 左上角 */}
            <div className="absolute flex flex-col space-y-2" style={{ 
              top: card.type === '关键字效果' ? '25px' : '-13px', 
              left: card.type === '关键字效果' ? '11px' : '22px' 
            }}>
              {/* 费用 */}
              <div 
                style={{ 
                  position: 'relative',
                  top: card.type === '配角牌' ? '-7px' : 
                       (card.type === '主角牌' || card.type === '故事牌') ? '23px' : // 再往下5px (18px -> 23px)
                       card.type === '关键字效果' ? '-14px' : '-7px', // 往上2px (-12px -> -14px)
                  left: card.type === '配角牌' ? '-5px' : 
                        (card.type === '主角牌' || card.type === '故事牌') ? '-17px' : // 再往左5px (-12px -> -17px)
                        card.type === '关键字效果' ? '-6px' : '-2px' // 往左1px (-5px -> -6px)
                }}
              >
                {(() => {
                  const cost = card.cost;
                  const numbersAndOtherSymbols = cost.replace(/\*/g, ''); // 数字和非*特殊字符一起显示
                  const asterisks = cost.match(/\*/g)?.join('') || ''; // 只提取*符号
                  
                  return (
                    <>
                      {/* 数字和其他特殊字符部分 */}
                      <span 
                        style={{ 
                          fontFamily: 'Zoika-2, sans-serif',
                          fontSize: numbersAndOtherSymbols.length >= 2 ? '39px' : '44px', // 两位数小三号字
                          fontWeight: 'bold',
                          color: (card.type === '故事牌' || card.type === '关键字效果') ? '#424453' : '#debf97',
                          textShadow: '1px 0 0 #ffffff, -1px 0 0 #ffffff, 0 1px 0 #ffffff, 0 -1px 0 #ffffff', // 白色1px描边
                          position: 'relative',
                          left: numbersAndOtherSymbols.length >= 2 ? '-8px' : '0px', // 两位数往左8px
                          top: numbersAndOtherSymbols.length >= 2 ? '3px' : '0px' // 两位数往下3px
                        }}
                      >
                        {numbersAndOtherSymbols}
                      </span>
                      {/* *符号部分 - 单独定位 */}
                      {asterisks && (
                        <span 
                          style={{ 
                            fontFamily: 'Zoika-2, sans-serif',
                            fontSize: '32px',
                            fontWeight: 'bold',
                            color: (card.type === '故事牌' || card.type === '关键字效果') ? '#424453' : '#debf97',
                            textShadow: '1px 0 0 #ffffff, -1px 0 0 #ffffff, 0 1px 0 #ffffff, 0 -1px 0 #ffffff', // 白色1px描边
                            position: 'relative',
                            top: '-5px',
                            left: '2px'
                          }}
                        >
                          {asterisks}
                        </span>
                      )}
                    </>
                  );
                })()}
              </div>
              
              {/* 攻击和生命（仅配角牌显示） */}
              {getCardBackground(card.type).includes('SubcharC') && (
                <>
                  <div 
                    style={{ 
                      fontFamily: 'Zoika-2, sans-serif',
                      fontSize: (card.attack?.toString().length ?? 0) >= 2 ? '39px' : '41px', // 两位数下调2px
                      fontWeight: 'bold',
                      color: '#4e4a44',
                      textShadow: '1px 0 0 #ffffff, -1px 0 0 #ffffff, 0 1px 0 #ffffff, 0 -1px 0 #ffffff', // 白色1px描边
                      position: 'relative',
                      left: (card.attack?.toString().length ?? 0) >= 2 ? '-43px' : '-34px', // 两位数往左9px
                      top: (() => {
                        const costIsTwo = card.cost.replace(/\*/g, '').length >= 2; // 费用是否两位数
                        const attackIsTwo = (card.attack?.toString().length ?? 0) >= 2; // 攻击是否两位数
                        let topValue = -16; // 基础位置
                        if (costIsTwo) topValue += 5; // 费用两位数往下5px
                        if (attackIsTwo) topValue += 5; // 攻击两位数往下5px (2+3)
                        return `${topValue}px`;
                      })()
                    }}
                  >
                    {card.attack}
                  </div>
                  <div 
                    style={{ 
                      fontFamily: 'Zoika-2, sans-serif',
                      fontSize: (card.health?.toString().length ?? 0) >= 2 ? '39px' : '41px', // 两位数下调2px
                      fontWeight: 'bold',
                      color: '#c78151',
                      textShadow: '1px 0 0 #ffffff, -1px 0 0 #ffffff, 0 1px 0 #ffffff, 0 -1px 0 #ffffff', // 白色1px描边
                      position: 'relative',
                      left: (card.health?.toString().length ?? 0) >= 2 ? '-21px' : '-12px', // 两位数往左9px
                      top: (() => {
                        const costIsTwo = card.cost.replace(/\*/g, '').length >= 2; // 费用是否两位数
                        const healthIsTwo = (card.health?.toString().length ?? 0) >= 2; // 生命是否两位数
                        let topValue = -31; // 基础位置
                        if (costIsTwo) topValue += 5; // 费用两位数往下5px
                        if (healthIsTwo) topValue += 5; // 生命两位数往下5px (2+3)
                        return `${topValue}px`;
                      })()
                    }}
                  >
                    {card.health}
                  </div>
                </>
              )}
            </div>



            {/* 卡牌名称 */}
            <div className="text-center mb-4" style={{ marginTop: '-15px', marginLeft: '86px' }}>
              {/* 主标题在上面 */}
              <h3 style={{ 
                fontFamily: 'QingNiaoHuaGuangYaoTi, sans-serif',
                fontSize: '25px',
                color: '#282A3A',
                marginTop: '-2px', // 从0px改为-2px，往上移动2px
                fontWeight: '500',
                textShadow: '1px 0 0 white, -1px 0 0 white, 0 1px 0 white, 0 -1px 0 white' // 1px白色描边
              }}>
                {(() => {
                  let displayName = card.name.replace(/\[.*?\]/g, '').trim();
                  // 如果是关键字效果牌，去掉【关键字】部分
                  if (card.type === '关键字效果') {
                    displayName = displayName.replace(/【关键字】/g, '');
                  }
                  // 去掉【特殊机制】部分
                  displayName = displayName.replace(/【特殊机制】/g, '');
                  // 去掉【衍生牌】部分
                  displayName = displayName.replace(/【衍生牌】/g, '');
                  // 符号替换为阴角符号
                  return displayName
                    .replace(/\./g, '·')  // 点号替换为·
                    .replace(/\(/g, '「')  // 左括号替换为「
                    .replace(/\)/g, '」')  // 右括号替换为」
                    .replace(/\[/g, '【')  // 左方括号替换为【
                    .replace(/\]/g, '】')  // 右方括号替换为】
                    .replace(/\{/g, '〖')  // 左大括号替换为〖
                    .replace(/\}/g, '〗')  // 右大括号替换为〗
                    .replace(/</g, '〈')   // 小于号替换为〈
                    .replace(/>/g, '〉')   // 大于号替换为〉
                    .replace(/"/g, '『')   // 双引号替换为『
                    .replace(/'/g, '『')   // 单引号替换为『
                    .replace(/:/g, '：')   // 冒号替换为：
                    .replace(/;/g, '；')   // 分号替换为；
                    .replace(/!/g, '！')   // 感叹号替换为！
                    .replace(/\?/g, '？'); // 问号替换为？
                })()}
              </h3>
              {/* 提取[]内容作为副标题 - 现在在主标题下面 */}
              <div style={{ 
                fontFamily: 'QingNiaoHuaGuangYaoTi, sans-serif',
                minHeight: '24px',
                color: '#282A3A',
                marginTop: '-5px',
                marginBottom: '12px',
                fontSize: '18px' // 12px * 1.7
              }}>
                {card.name.includes('[') && card.name.includes(']') 
                  ? card.name.match(/\[(.*?)\]/)?.[1] 
                  : ''}
              </div>
            </div>

            {/* 卡牌类型 - 纵向显示 */}
            <div className="absolute" style={{ 
              top: card.type === '关键字效果' ? '264px' : '283px', 
              left: '-9px' 
            }}>
              {(() => {
                const type = card.type as string;
                let displayText = '';
                // 如果是故事牌或关键字效果，显示详细分类
                if (type === '故事牌' || type === 'story' || type === '关键字效果') {
                  displayText = card.category || (type === '关键字效果' ? '关键字' : '故事');
                } else {
                  switch (type) {
                    case 'character': displayText = '配角'; break;
                    case 'hero': displayText = '主角'; break;
                    case '配角牌': displayText = '配角'; break;
                    case '主角牌': displayText = '主角'; break;
                    default: displayText = type.replace('牌', '');
                  }
                }
                
                // 如果超过3个字，使用较小字体和调整位置
                const isLongText = displayText.length > 3;
                
                return (
                  <div 
                    style={{ 
                      fontFamily: 'QingNiaoHuaGuangYaoTi, sans-serif',
                      fontSize: isLongText ? '22px' : '31px', // 超过3个字的字体再小2px (24px -> 22px)
                      color: '#282A3A',
                      writingMode: 'vertical-rl',
                      textOrientation: 'upright',
                      letterSpacing: '2px',
                      position: 'relative',
                      left: isLongText ? '8px' : '0px', // 超过3个字的往右8px (6px + 2px)
                      top: isLongText ? '3px' : '0px' // 3个字的往上2px (2px -> 0px)，超过3个字的保持3px
                    }}
                  >
                    {displayText}
                  </div>
                );
              })()}
            </div>
            
            {/* 提取标题中【】内容显示 - 不适用于关键字牌 */}
            {(() => {
              // 排除关键字牌
              if (card.type === '关键字效果') {
                return null;
              }
              
              const bracketMatch = card.name.match(/【(.*?)】/);
              if (bracketMatch) {
                return (
                  <div style={{
                    position: 'absolute',
                    left: '50%',
                    top: 'calc(50% + 85px)',
                    transform: 'translate(-50%, -50%)',
                    fontFamily: 'QingNiaoHuaGuangYaoTi, sans-serif',
                    fontSize: '12px',
                    color: '#282A3A',
                    textShadow: '1px 0 0 white, -1px 0 0 white, 0 1px 0 white, 0 -1px 0 white',
                    letterSpacing: '0px',
                    lineHeight: '1'
                  }}>
                    {bracketMatch[1]}
                  </div>
                );
              }
              return null;
            })()}
            
            {/* 其他信息 - 隐藏 */}
            {false && (
              <div className="text-center mb-4" style={{ marginTop: '204px' }}>
                <div className="mb-2">
                  <span style={{ 
                    fontFamily: 'QingNiaoHuaGuangYaoTi, sans-serif',
                    fontSize: '16px',
                    color: '#918273',
                    fontWeight: '500'
                  }}>
                    详细信息
                  </span>
                </div>
                <div className="text-sm" style={{ color: '#918273' }}>
                  <span style={{ letterSpacing: '-0.5px' }}>{card.faction}·{card.category}</span>
                </div>
                <div className="text-xs mt-1" style={{ color: '#666' }}>
                  创建者: {card.createdBy.username}
                </div>
              </div>
            )}

            {/* 详情、风味文字、创建者信息的容器 */}
            <div className="text-center overflow-y-auto custom-scrollbar" style={{ 
              marginTop: '334px', 
              height: '150px',
              scrollbarWidth: 'thin',
              scrollbarColor: '#918273 transparent'
            }}>
              {/* 卡牌效果描述 */}
              <div className="flex justify-center" style={{ marginBottom: '10px', marginTop: '5px' }}>
                <div 
                  className="text-lg leading-relaxed"
                  style={{ 
                    color: '#111111',
                    textShadow: '1px 1px 2px rgba(255,255,255,0.8)',
                    width: '340px',
                    padding: '5px'
                  }}
                >
                  {card.effect ? (
                    <div>
                      {card.effect.split('*').map((part, index) => {
                        if (index === 0) {
                          return <span key={index}>{formatEffectText(part, setDetailTooltip)}</span>;
                        } else {
                          return (
                            <div key={index}>
                              <span style={{ fontStyle: 'italic' }}>*{formatEffectText(part, setDetailTooltip)}</span>
                            </div>
                          );
                        }
                      })}
                    </div>
                  ) : (
                    '暂无效果描述'
                  )}
                </div>
              </div>

              {/* 风味文字 */}
              {card.flavor && (
                <div style={{ marginBottom: '10px' }}>
                  <div 
                    className="italic leading-relaxed"
                    style={{ 
                      color: '#666', 
                      maxWidth: '340px', 
                      margin: '0 auto',
                      fontSize: '14px'
                    }}
                  >
                    "{card.flavor}"
                  </div>
                </div>
              )}

              {/* 创建者信息 */}
              <div>
                <div className="text-sm" style={{ color: '#918273' }}>
                  创建者: {card.createdBy.username}
                </div>
              </div>
            </div>

            {/* 底部卡牌信息 - 相对于整个卡片容器定位 - 只有非主角牌且非关键字效果才显示 */}
            {card.type !== '主角牌' && card.type !== '关键字效果' && card.faction && (
              <div className="absolute left-0 right-0 text-center" style={{ bottom: '-53px' }}>
                {/* 主角名字 */}
                <div style={{ 
                  fontFamily: 'QingNiaoHuaGuangYaoTi, sans-serif',
                  fontSize: '24px', // 14px * 1.7
                  color: '#FBFBFB',
                  textShadow: '0 5px 0 #282A3A, 1px 0 0 #282932, -1px 0 0 #282932, 0 1px 0 #282932, 0 -1px 0 #282932', // 0 3px 0 * 1.7
                  marginBottom: '-3px' // -2px * 1.7
                }}>
                  {(() => {
                    // 直接使用card.faction，去掉[]部分显示主角名
                    const factionName = card.faction.replace(/\[.*?\]/g, '').trim();
                    return factionName;
                  })()}
                </div>
                
                {/* faction中[]内容作为副标题 */}
                {card.faction.includes('[') && card.faction.includes(']') && (
                  <div style={{ 
                    fontFamily: 'QingNiaoHuaGuangYaoTi, sans-serif',
                    fontSize: '17px', // 10px * 1.7
                    color: '#FBFBFB',
                    textShadow: '0 5px 0 #282A3A, 1px 0 0 #282932, -1px 0 0 #282932, 0 1px 0 #282932, 0 -1px 0 #282932', // 0 3px 0 * 1.7
                    marginBottom: '3px' // 2px * 1.7
                  }}>
                    {card.faction.match(/\[(.*?)\]/)?.[1]}
                  </div>
                )}
              </div>
            )}
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

export default CardCollection;
