import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { Card, PaginatedResponse, PaginationInfo } from '../../types';
import CardForm from './CardForm';
import SearchableSelect from '../common/SearchableSelect';
import api from '../../services/api';

const CardCollection: React.FC = () => {
  const [editingCard, setEditingCard] = useState<Card | null>(null);
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

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(() => {
    const saved = localStorage.getItem('cardCollection_itemsPerPage');
    return saved ? parseInt(saved) : 8;
  });
  const [cards, setCards] = useState<Card[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jumpToPage, setJumpToPage] = useState('');

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
  }, [currentPage, itemsPerPage, sortBy, sortDirection]);

  // 加载游戏配置
  const loadGameConfig = async () => {
    try {
      const response = await api.config.getConfig();
      const config = response.data;
      
      if (config.factions) setCustomFactions(config.factions);
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

  const CardComponent: React.FC<{ card: Card }> = ({ card }) => (
    <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-4 hover:bg-opacity-20 transition-all">
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-lg font-bold text-white">{card.name}</h3>
        <span className="text-yellow-400 font-bold text-xl bg-yellow-600 bg-opacity-30 px-2 py-1 rounded-full">
          {card.cost}
        </span>
      </div>

      {/* 插画显示 */}
      {card.image && (
        <div className="mb-3">
          <img
            src={card.image}
            alt={card.name}
            className="w-full h-32 object-cover rounded border border-gray-500"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
        </div>
      )}

      <div className="text-sm text-gray-300 mb-3">
        <p><span className="text-blue-400">类型:</span> {getCardTypeText(card.type)}</p>
        <p><span className="text-blue-400">类别:</span> {card.category}</p>
        <p><span className="text-blue-400">主角:</span> {getFactionText(card.faction)}</p>
        {card.type === '配角牌' && (
          <p><span className="text-blue-400">攻击/生命:</span> 
            <span className="text-red-400 font-bold ml-1">{card.attack}</span>/
            <span className="text-green-400 font-bold">{card.health}</span>
          </p>
        )}
        <p><span className="text-blue-400">创建者:</span> {card.createdBy.username}</p>
      </div>

      <div className="text-gray-200 text-sm mb-3 bg-green-600 bg-opacity-20 p-2 rounded">
        <p className="font-semibold text-green-400">效果:</p>
        <p className="break-words whitespace-pre-wrap">{card.effect}</p>
      </div>

      {card.flavor && (
        <div className="text-gray-400 text-xs italic mb-3 bg-gray-600 bg-opacity-30 p-2 rounded whitespace-pre-wrap">
          {card.flavor}
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className={`px-2 py-1 rounded-full text-xs ${
          card.isPublic ? 'bg-green-600 text-white' : 'bg-yellow-600 text-white'
        }`}>
          {card.isPublic ? '公开' : '私有'}
        </span>

        {card.createdBy._id === user?.id && (
          <div className="flex space-x-2">
            <button
              onClick={() => setEditingCard(card)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs transition-colors"
            >
              编辑
            </button>
            <button
              onClick={() => handleDeleteCard(card._id)}
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs transition-colors"
            >
              删除
            </button>
          </div>
        )}
      </div>
    </div>
  );

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

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold text-white">🃏 卡牌集</h1>
        <div className="flex items-center space-x-3">
          {/* 管理员按钮组 */}
          {user?.isAdmin && (
            <>
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
            </>
          )}
          
        </div>
      </div>

      {error && (
        <div className="bg-red-500 bg-opacity-20 border border-red-500 text-red-100 px-4 py-3 rounded-md mb-6">
          ❌ 错误: {error}
        </div>
      )}

      {/* 筛选器 */}
      <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-6 mb-8 relative z-10">
        <h3 className="text-white font-semibold mb-4 flex items-center">
          <span className="mr-2">🔍</span>
          卡牌筛选
        </h3>
        
        {/* 第一行：搜索框和搜索类型 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">🔎 搜索卡牌</label>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full px-3 py-2 bg-white bg-opacity-10 border border-gray-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="输入卡牌名称或效果..."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">🎯 搜索类型</label>
            <SearchableSelect
              options={[
                { value: 'name', label: '搜索卡牌名称' },
                { value: 'effect', label: '搜索卡牌效果' }
              ]}
              value={filter.searchType}
              onChange={(value) => setFilter({...filter, searchType: value})}
              placeholder="选择搜索类型..."
              className="w-full"
            />
          </div>
        </div>

        {/* 第二行：筛选选项 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">📋 卡牌类型</label>
            <SearchableSelect
              options={[
                { value: 'all', label: '全部类型' },
                ...customTypes.map(type => ({ value: type.id, label: type.name }))
              ]}
              value={filter.type}
              onChange={(value) => setFilter({...filter, type: value})}
              placeholder="选择卡牌类型..."
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">⭐ 卡牌主角</label>
            <SearchableSelect
              options={[
                { value: 'all', label: '全部主角' },
                ...customFactions.map(faction => ({ value: faction.id, label: faction.name }))
              ]}
              value={filter.faction}
              onChange={(value) => setFilter({...filter, faction: value})}
              placeholder="选择卡牌主角..."
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">💰 费用筛选</label>
            <SearchableSelect
              options={[
                { value: 'all', label: '全部费用' },
                ...availableCosts.map(cost => ({ value: cost, label: cost }))
              ]}
              value={filter.cost}
              onChange={(value) => setFilter({...filter, cost: value})}
              placeholder="选择费用..."
              className="w-full"
            />
          </div>
        </div>

        {/* 快速重置按钮 */}
        <div className="flex justify-end">
          <button
            onClick={() => {
              setFilter({ type: 'all', faction: 'all', cost: 'all', search: '', searchType: 'name' });
              setSearchInput(''); // 同时重置搜索输入框
              setSortBy('none'); // 重置排序
              setSortDirection('asc'); // 重置排序方向
            }}
            className="text-sm text-gray-400 hover:text-white transition-colors px-3 py-1 rounded border border-gray-600 hover:border-gray-500"
          >
            🔄 重置筛选
          </button>
        </div>
      </div>

      {/* 排序选项 */}
      <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-6 mb-8 relative z-10">
        <h3 className="text-white font-semibold mb-4 flex items-center">
          <span className="mr-2">⬆️⬇️</span>
          卡牌排序
        </h3>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => {
              if (sortBy === 'cost') {
                setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
              } else {
                setSortBy('cost');
                setSortDirection('asc');
              }
            }}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors flex items-center space-x-2 ${
              sortBy === 'cost' ? 'bg-blue-600 text-white' : 'bg-gray-600 hover:bg-gray-700 text-gray-200'
            }`}
          >
            <span>💰 费用</span>
            {sortBy === 'cost' && (
              <span>{sortDirection === 'asc' ? '⬆️' : '⬇️'}</span>
            )}
          </button>
          <button
            onClick={() => {
              if (sortBy === 'name') {
                setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
              } else {
                setSortBy('name');
                setSortDirection('asc');
              }
            }}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors flex items-center space-x-2 ${
              sortBy === 'name' ? 'bg-blue-600 text-white' : 'bg-gray-600 hover:bg-gray-700 text-gray-200'
            }`}
          >
            <span>🅰️ 首字母</span>
            {sortBy === 'name' && (
              <span>{sortDirection === 'asc' ? '⬆️' : '⬇️'}</span>
            )}
          </button>
          <button
            onClick={() => {
              if (sortBy === 'faction') {
                setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
              } else {
                setSortBy('faction');
                setSortDirection('asc');
              }
            }}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors flex items-center space-x-2 ${
              sortBy === 'faction' ? 'bg-blue-600 text-white' : 'bg-gray-600 hover:bg-gray-700 text-gray-200'
            }`}
          >
            <span>🦸 主角</span>
            {sortBy === 'faction' && (
              <span>{sortDirection === 'asc' ? '⬆️' : '⬇️'}</span>
            )}
          </button>
          {sortBy !== 'none' && (
            <button
              onClick={() => {
                setSortBy('none');
                setSortDirection('asc');
              }}
              className="px-4 py-2 rounded-lg font-semibold transition-colors bg-red-600 hover:bg-red-700 text-white"
            >
              清除排序
            </button>
          )}
        </div>
      </div>

      {/* 统计信息 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-blue-400">{allCards.filter(c => getCardTypeText(c.type) === '故事牌').length}</div>
          <div className="text-gray-300 text-sm">故事牌</div>
        </div>
        <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-green-400">{allCards.filter(c => getCardTypeText(c.type) === '配角牌').length}</div>
          <div className="text-gray-300 text-sm">配角牌</div>
        </div>
        <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-purple-400">{allCards.filter(c => getCardTypeText(c.type) === '主角牌').length}</div>
          <div className="text-gray-300 text-sm">主角牌</div>
        </div>
        <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-yellow-400">{allCards.length}</div>
          <div className="text-gray-300 text-sm">总卡牌数</div>
        </div>
      </div>

      {/* 卡牌列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
        {cards.map((card) => (
          <CardComponent key={card._id} card={card} />
        ))}
      </div>

      {/* 分页控件 */}
      {pagination && pagination.totalPages > 1 && (
        <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-6 mb-8">
          {/* 分页设置行 */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <div className="text-gray-300 text-sm">
                显示第 {((pagination.currentPage - 1) * pagination.itemsPerPage) + 1} - {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} 项，共 {pagination.totalItems} 项
              </div>
              
              {/* 每页显示数量选择 */}
              <div className="flex items-center space-x-2">
                <span className="text-gray-300 text-sm">每页显示:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    const newItemsPerPage = parseInt(e.target.value);
                    setItemsPerPage(newItemsPerPage);
                    setCurrentPage(1); // 重置到第一页
                    // 保存到本地存储
                    localStorage.setItem('cardCollection_itemsPerPage', newItemsPerPage.toString());
                    // 滚动到页面顶部
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="bg-white bg-opacity-10 border border-gray-500 rounded px-2 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={8} className="bg-gray-800">8</option>
                  <option value={12} className="bg-gray-800">12</option>
                  <option value={16} className="bg-gray-800">16</option>
                  <option value={20} className="bg-gray-800">20</option>
                  <option value={24} className="bg-gray-800">24</option>
                  <option value={28} className="bg-gray-800">28</option>
                </select>
              </div>
            </div>
            
            {/* 页码跳转 */}
            <div className="flex items-center space-x-2">
              <span className="text-gray-300 text-sm">跳转到:</span>
              <input
                type="number"
                min="1"
                max={pagination.totalPages}
                value={jumpToPage}
                onChange={(e) => setJumpToPage(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    const page = parseInt(jumpToPage);
                    if (page >= 1 && page <= pagination.totalPages) {
                      setCurrentPage(page);
                      setJumpToPage('');
                      // 滚动到页面顶部
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                  }
                }}
                className="w-16 px-2 py-1 bg-white bg-opacity-10 border border-gray-500 rounded text-white text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={pagination.currentPage.toString()}
              />
              <button
                onClick={() => {
                  const page = parseInt(jumpToPage);
                  if (page >= 1 && page <= pagination.totalPages) {
                    setCurrentPage(page);
                    setJumpToPage('');
                    // 滚动到页面顶部
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }}
                disabled={!jumpToPage || parseInt(jumpToPage) < 1 || parseInt(jumpToPage) > pagination.totalPages}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  jumpToPage && parseInt(jumpToPage) >= 1 && parseInt(jumpToPage) <= pagination.totalPages
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                }`}
              >
                跳转
              </button>
            </div>
          </div>
          
          {/* 分页按钮行 */}
          <div className="flex items-center justify-center space-x-2">
            {/* 上一页按钮 */}
            <button
              onClick={() => {
                const newPage = Math.max(1, currentPage - 1);
                setCurrentPage(newPage);
                // 滚动到页面顶部
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              disabled={currentPage <= 1}
              className={`px-3 py-2 rounded transition-colors ${
                currentPage > 1
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
            >
              上一页
            </button>

            {/* 页码按钮 */}
            <div className="flex items-center space-x-1">
              {(() => {
                const pages = [];
                const totalPages = pagination.totalPages;
                const current = pagination.currentPage;
                
                // 显示逻辑：始终显示第1页，当前页附近的页码，和最后一页
                let startPage = Math.max(1, current - 2);
                let endPage = Math.min(totalPages, current + 2);
                
                // 如果当前页靠近开始，显示更多后面的页码
                if (current <= 3) {
                  endPage = Math.min(totalPages, 5);
                }
                
                // 如果当前页靠近结束，显示更多前面的页码
                if (current >= totalPages - 2) {
                  startPage = Math.max(1, totalPages - 4);
                }
                
                // 添加第一页
                if (startPage > 1) {
                  pages.push(
                    <button
                      key={1}
                      onClick={() => {
                        setCurrentPage(1);
                        // 滚动到页面顶部
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className={`px-3 py-2 rounded transition-colors ${
                        current === 1
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-600 hover:bg-gray-500 text-gray-300'
                      }`}
                    >
                      1
                    </button>
                  );
                  
                  if (startPage > 2) {
                    pages.push(
                      <span key="ellipsis1" className="text-gray-400 px-2">...</span>
                    );
                  }
                }
                
                // 添加中间页码
                for (let i = startPage; i <= endPage; i++) {
                  pages.push(
                    <button
                      key={i}
                      onClick={() => {
                        setCurrentPage(i);
                        // 滚动到页面顶部
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className={`px-3 py-2 rounded transition-colors ${
                        current === i
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-600 hover:bg-gray-500 text-gray-300'
                      }`}
                    >
                      {i}
                    </button>
                  );
                }
                
                // 添加最后一页
                if (endPage < totalPages) {
                  if (endPage < totalPages - 1) {
                    pages.push(
                      <span key="ellipsis2" className="text-gray-400 px-2">...</span>
                    );
                  }
                  
                  pages.push(
                    <button
                      key={totalPages}
                      onClick={() => {
                        setCurrentPage(totalPages);
                        // 滚动到页面顶部
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className={`px-3 py-2 rounded transition-colors ${
                        current === totalPages
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-600 hover:bg-gray-500 text-gray-300'
                      }`}
                    >
                      {totalPages}
                    </button>
                  );
                }
                
                return pages;
              })()}
            </div>

            {/* 下一页按钮 */}
            <button
              onClick={() => {
                const newPage = Math.min(pagination.totalPages, currentPage + 1);
                setCurrentPage(newPage);
                // 滚动到页面顶部
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              disabled={currentPage >= pagination.totalPages}
              className={`px-3 py-2 rounded transition-colors ${
                currentPage < pagination.totalPages
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
            >
              下一页
            </button>
          </div>
        </div>
      )}

      {cards.length === 0 && !isLoading && (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">🃏</div>
          <h3 className="text-2xl font-bold text-white mb-4">
            {filter.search || filter.type !== 'all' || filter.faction !== 'all' 
              ? '未找到匹配的卡牌' 
              : '暂无卡牌'
            }
          </h3>
          <p className="text-gray-300 mb-8">
            {filter.search || filter.type !== 'all' || filter.faction !== 'all'
              ? '尝试调整筛选条件或创建新的卡牌'
              : '创建第一张卡牌开始游戏吧！'
            }
          </p>
        </div>
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
