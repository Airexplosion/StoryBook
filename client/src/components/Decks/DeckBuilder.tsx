import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { fetchDecks, createDeck, updateDeck, deleteDeck, favoriteDeck, unfavoriteDeck, copyDeck } from '../../store/slices/decksSlice';
import { fetchCards } from '../../store/slices/cardsSlice';
import { Card, Deck, DeckCard } from '../../types';
import DeckForm from './DeckForm';
import api from '../../services/api'; // Import api
import SearchableSelect from '../common/SearchableSelect'; // Import SearchableSelect

const DeckBuilder: React.FC = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingDeck, setEditingDeck] = useState<Deck | null>(null);
  const [viewingDeck, setViewingDeck] = useState<Deck | null>(null);
  const [filter, setFilter] = useState({
    search: '',
    showPublic: true,
    showPrivate: true,
    showFavorites: false,
    championFaction: '' // 添加主角筛选
  });

  // 排序状态
  const [sortBy, setSortBy] = useState<'none' | 'name' | 'createdAt' | 'totalCards'>('none');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  
  // 筛选下拉菜单状态
  const [showFactionDropdown, setShowFactionDropdown] = useState(false);
  const [showVisibilityDropdown, setShowVisibilityDropdown] = useState(false);
  const [showFavoriteDropdown, setShowFavoriteDropdown] = useState(false);
  
  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12; // 与卡牌集和主角集保持一致
  const [jumpToPage, setJumpToPage] = useState('');

  // State for custom types, factions, categories (loaded from config)
  const [customFactions, setCustomFactions] = useState<Array<{ id: string; name: string; description?: string }>>([]);
  const [customTypes, setCustomTypes] = useState<Array<{ id: string; name: string }>>([]);
  const [customCategories, setCustomCategories] = useState<any>({});

  const dispatch = useDispatch();
  const { decks, isLoading: decksLoading, error } = useSelector((state: RootState) => state.decks);
  const { cards, isLoading: cardsLoading } = useSelector((state: RootState) => state.cards);
  const { user } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    dispatch(fetchDecks() as any);
    dispatch(fetchCards({}) as any); // 获取所有卡牌用于卡组构建
    loadGameConfig(); // Load game config on mount
  }, [dispatch]);

  // 当筛选条件改变时重置到第一页
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, sortBy, sortDirection]);

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.relative')) {
        setShowSortDropdown(false);
        setShowFactionDropdown(false);
        setShowVisibilityDropdown(false);
        setShowFavoriteDropdown(false);
      }
    };

    if (showSortDropdown || showFactionDropdown || showVisibilityDropdown || showFavoriteDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showSortDropdown, showFactionDropdown, showVisibilityDropdown, showFavoriteDropdown]);


  // Load game config
  const loadGameConfig = async () => {
    try {
      const response = await api.config.getConfig();
      const config = response.data;
      
      if (config.factions) setCustomFactions(config.factions);
      if (config.types) setCustomTypes(config.types);
      if (config.categories) setCustomCategories(config.categories);
    } catch (error) {
      console.error('加载配置失败:', error);
    }
  };

  const filteredDecks = decks.filter(deck => {
    if (filter.search && !deck.name.toLowerCase().includes(filter.search.toLowerCase())) return false;
    if (!filter.showPublic && deck.isPublic) return false;
    if (!filter.showPrivate && !deck.isPublic) return false;
    if (filter.showFavorites && !deck.isFavorited) return false;
    if (filter.championFaction && deck.championCardId !== filter.championFaction) return false;
    return true;
  });

  // 排序卡组
  const sortedDecks = [...filteredDecks].sort((a, b) => {
    // 首先按用户排序（用户自己的卡组优先）
    if (a.createdBy._id === user?.id && b.createdBy._id !== user?.id) return -1;
    if (a.createdBy._id !== user?.id && b.createdBy._id === user?.id) return 1;
    
    // 然后按选择的排序方式排序
    if (sortBy === 'none') return 0;
    
    let comparison = 0;
    switch (sortBy) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'createdAt':
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
      case 'totalCards':
        comparison = a.totalCards - b.totalCards;
        break;
      default:
    return 0;
    }
    
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  // 分页计算
  const totalPages = Math.ceil(sortedDecks.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedDecks = sortedDecks.slice(startIndex, endIndex);

  const handleCreateDeck = async (deckData: { 
    name: string; 
    cards: DeckCard[]; 
    isPublic: boolean;
    championCardId?: string;
    championDescription?: string;
  }) => {
    await dispatch(createDeck(deckData as any) as any);
    // 重新获取卡组列表以确保界面更新
    await dispatch(fetchDecks() as any);
    setShowCreateModal(false);
  };

  const handleUpdateDeck = async (deckData: { 
    name: string; 
    cards: DeckCard[]; 
    isPublic: boolean;
    championCardId?: string;
    championDescription?: string;
  }) => {
    if (editingDeck) {
      await dispatch(updateDeck({ id: editingDeck._id, deckData: deckData as any }) as any);
      // 重新获取卡组列表以确保界面更新
      await dispatch(fetchDecks() as any);
      setEditingDeck(null);
    }
  };

  const handleDeleteDeck = async (deckId: string) => {
    if (window.confirm('确定要删除这个卡组吗？')) {
      dispatch(deleteDeck(deckId) as any);
    }
  };

  const handleFavoriteDeck = async (deckId: string) => {
    dispatch(favoriteDeck(deckId) as any);
  };

  const handleUnfavoriteDeck = async (deckId: string) => {
    dispatch(unfavoriteDeck(deckId) as any);
  };

  const handleCopyDeck = async (deckId: string) => {
    if (window.confirm('确定要复制这个卡组为私有卡组吗？')) {
      dispatch(copyDeck(deckId) as any);
    }
  };

  const getFactionText = (factionId: string) => {
    const faction = customFactions.find(f => f.id === factionId);
    return faction ? faction.name : factionId;
  };

  const getChampionName = (championId: string) => {
    const champion = customFactions.find(f => f.id === championId);
    return champion ? champion.name : championId;
  };

  // 优化后的卡组卡片组件
  const DeckComponent: React.FC<{ deck: Deck }> = ({ deck }) => {
    const [isHovered, setIsHovered] = useState(false);
    const [showChampionEffect, setShowChampionEffect] = useState(false);
    const isOwned = deck.createdBy._id === user?.id;
    
    // 计算统计数据
    const storyCards = deck.cards.filter(dc => dc.card.type === '故事牌').reduce((sum, dc) => sum + dc.count, 0);
    const supportCards = deck.cards.filter(dc => dc.card.type === '配角牌').reduce((sum, dc) => sum + dc.count, 0);
    const heroCards = deck.cards.filter(dc => dc.card.type === '主角牌').reduce((sum, dc) => sum + dc.count, 0);
    const neutralCards = deck.cards.filter(dc => dc.card.faction.includes('中立')).reduce((sum, dc) => sum + dc.count, 0);
    const exclusiveCards = deck.cards.filter(dc => !dc.card.faction.includes('中立')).reduce((sum, dc) => sum + dc.count, 0);

    // 计算平均费用
    const totalCards = deck.cards.reduce((sum, dc) => sum + dc.count, 0);
    const totalCost = deck.cards.reduce((sum, dc) => {
      const cost = dc.card.cost;
      const numericCost = cost === 'X' ? 0 : parseInt(cost) || 0;
      return sum + (numericCost * dc.count);
    }, 0);
    const averageCost = totalCards > 0 ? (totalCost / totalCards).toFixed(1) : '0.0';

    return (
      <div 
        className="relative group cursor-pointer transition-all duration-500 ease-out"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{ perspective: '1000px' }}
      >
        {/* 主卡片容器 */}
        <div 
          className="relative w-full h-full rounded-2xl transition-all duration-500 ease-out transform-gpu"
          style={{
            background: isOwned 
              ? 'linear-gradient(135deg, rgba(79, 106, 141, 0.25) 0%, rgba(174, 174, 174, 0.15) 50%, rgba(145, 130, 115, 0.25) 100%)'
              : 'linear-gradient(135deg, rgba(174, 174, 174, 0.12) 0%, rgba(194, 183, 156, 0.08) 50%, rgba(145, 130, 115, 0.12) 100%)',
            backdropFilter: 'blur(20px)',
            border: isOwned 
              ? '2px solid rgba(79, 106, 141, 0.6)'
              : '1px solid rgba(194, 183, 156, 0.3)',
            boxShadow: isHovered 
              ? '0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 30px rgba(79, 106, 141, 0.3)'
              : '0 10px 25px -5px rgba(0, 0, 0, 0.4)',
            minHeight: '420px'
          }}
        >
          {/* 背景装饰纹理 */}
          <div 
            className="absolute inset-0 rounded-2xl opacity-20"
            style={{
              background: `
                radial-gradient(circle at 20% 80%, rgba(194, 183, 156, 0.2) 0%, transparent 50%),
                radial-gradient(circle at 80% 20%, rgba(145, 130, 115, 0.2) 0%, transparent 50%),
                radial-gradient(circle at 40% 40%, rgba(79, 106, 141, 0.15) 0%, transparent 50%)
              `
            }}
          />

          {/* 顶部发光效果 */}
          <div 
            className="absolute top-0 left-1/2 transform -translate-x-1/2 w-3/4 h-1 rounded-full"
            style={{
              background: isOwned 
                ? 'linear-gradient(90deg, transparent, rgba(79, 106, 141, 0.8), transparent)'
                : 'linear-gradient(90deg, transparent, rgba(194, 183, 156, 0.6), transparent)',
              filter: 'blur(2px)'
            }}
          />

          {/* 主要内容 */}
          <div className="relative z-10 p-6 h-full flex flex-col">
            {/* 头部信息 */}
            <div className="flex justify-between items-start mb-6">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-3">
                  {isOwned && (
                    <div className="flex items-center space-x-1">
                      <div 
                        className="w-2 h-2 rounded-full animate-pulse" 
                        style={{ backgroundColor: '#4F6A8D' }}
                      />
                      <span style={{ color: '#4F6A8D' }} className="text-sm font-medium">我的</span>
                    </div>
                  )}
                  <div className={`px-3 py-1 rounded-full text-xs font-bold transition-all duration-300 border border-opacity-40`}
                  style={{
                    backgroundColor: deck.isPublic ? 'rgba(145, 130, 115, 0.2)' : 'rgba(247, 119, 114, 0.2)',
                    color: deck.isPublic ? '#91827B' : '#F07772',
                    borderColor: deck.isPublic ? 'rgba(145, 130, 115, 0.4)' : 'rgba(247, 119, 114, 0.4)'
                  }}>
                    {deck.isPublic ? '公开' : '私有'}
                  </div>
                </div>
                
                <h3 
                  className="text-xl font-bold mb-2 transition-all duration-300"
                  style={{ 
                    fontFamily: 'QingNiaoHuaGuangYaoTi, sans-serif',
                    textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)',
                    color: isHovered ? '#C2B79C' : '#FBFBFB'
                  }}
                >
          {deck.name}
        </h3>
              </div>

              {/* 复制和收藏按钮 */}
        <div className="flex space-x-2">
                <button 
                  onClick={() => handleCopyDeck(deck._id)}
                  className="p-2 rounded-full transition-all duration-300 hover:bg-opacity-50"
                  style={{
                    backgroundColor: 'rgba(194, 183, 156, 0.2)'
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C2B79C" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                  </svg>
                </button>
                <button 
                  onClick={() => deck.isFavorited ? handleUnfavoriteDeck(deck._id) : handleFavoriteDeck(deck._id)}
                  className={`p-2 rounded-full transition-all duration-300 hover:bg-opacity-50`}
                  style={{
                    backgroundColor: deck.isFavorited ? 'rgba(194, 183, 156, 0.3)' : 'rgba(174, 174, 174, 0.2)'
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill={deck.isFavorited ? "#C2B79C" : "none"} 
                       stroke={deck.isFavorited ? "#C2B79C" : "#AEAEAE"} strokeWidth="2">
                    <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
                  </svg>
                </button>
        </div>
      </div>

            {/* 主角信息卡片 */}
            {deck.championCardId && (
              <div className="relative mb-6">
                <div 
                  className="rounded-xl p-4 border border-opacity-30 transition-all duration-300 hover:border-opacity-60"
                  style={{ 
                    background: 'linear-gradient(135deg, rgba(43, 42, 58, 0.4) 0%, rgba(51, 51, 51, 0.4) 100%)',
                    borderColor: 'rgba(79, 106, 141, 0.3)',
                    boxShadow: '0 8px 16px rgba(43, 42, 58, 0.3)' 
                  }}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <div 
                          className="w-3 h-3 rounded-full animate-pulse" 
                          style={{ backgroundColor: '#4F6A8D' }}
                        />
                        <span style={{ color: '#4F6A8D' }} className="text-sm font-medium">主角</span>
                      </div>
                      <h4 className="font-bold text-lg" style={{ color: '#FBFBFB' }}>
                        {getChampionName(deck.championCardId)}
                      </h4>
                    </div>
                    
            <button
                      onClick={() => setShowChampionEffect(!showChampionEffect)}
                      className="px-3 py-1 rounded-lg text-xs transition-all duration-300 flex items-center space-x-1"
                      style={{
                        backgroundColor: 'rgba(79, 106, 141, 0.3)',
                        color: '#4F6A8D'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(79, 106, 141, 0.5)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(79, 106, 141, 0.3)';
                      }}
                    >
                      <span>效果</span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="6,9 12,15 18,9"/>
                      </svg>
            </button>
                  </div>

                  {/* 主角效果展开 */}
                  {showChampionEffect && deck.championDescription && (
                    <div 
                      className="mt-3 p-3 rounded-lg border border-opacity-20"
                      style={{
                        backgroundColor: 'rgba(0, 0, 0, 0.2)',
                        borderColor: 'rgba(79, 106, 141, 0.2)'
                      }}
                    >
                      <p className="text-sm leading-relaxed" style={{ color: '#AEAEAE' }}>
                        {deck.championDescription}
                      </p>
      </div>
                  )}
                </div>
              </div>
            )}

            {/* 统计数据网格 */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div 
                className="rounded-xl p-3 text-center border border-opacity-30 transition-all duration-300"
                style={{
                  background: 'linear-gradient(135deg, rgba(79, 106, 141, 0.2) 0%, rgba(79, 106, 141, 0.3) 100%)',
                  borderColor: 'rgba(79, 106, 141, 0.3)'
                }}
              >
                <div className="text-2xl font-bold" style={{ color: '#FBFBFB' }}>{deck.totalCards}</div>
                <div className="text-xs mt-1" style={{ color: '#AEAEAE' }}>总卡牌</div>
          </div>
              <div 
                className="rounded-xl p-3 text-center border border-opacity-30 transition-all duration-300"
                style={{
                  background: 'linear-gradient(135deg, rgba(145, 130, 115, 0.2) 0%, rgba(145, 130, 115, 0.3) 100%)',
                  borderColor: 'rgba(145, 130, 115, 0.3)'
                }}
              >
                <div className="text-2xl font-bold" style={{ color: '#FBFBFB' }}>{deck.cards.length}</div>
                <div className="text-xs mt-1" style={{ color: '#AEAEAE' }}>卡牌种类</div>
        </div>
              <div 
                className="rounded-xl p-3 text-center border border-opacity-30 transition-all duration-300"
                style={{
                  background: 'linear-gradient(135deg, rgba(194, 183, 156, 0.2) 0%, rgba(194, 183, 156, 0.3) 100%)',
                  borderColor: 'rgba(194, 183, 156, 0.3)'
                }}
              >
                <div className="text-2xl font-bold" style={{ color: '#FBFBFB' }}>{averageCost}</div>
                <div className="text-xs mt-1" style={{ color: '#AEAEAE' }}>平均费用</div>
          </div>
        </div>

                        {/* 卡牌类型分布 - 在 DeckComponent 中的修改部分 */}
            <div className="grid grid-cols-5 gap-2 mb-6">
              <div className="text-center">
                {/* 添加背景条 */}
                <div className="relative w-full h-2 rounded-full mb-1" style={{ backgroundColor: '#AEAEAE' }}>
                  <div 
                    className="absolute top-0 left-0 h-full rounded-full transition-all duration-500"
                    style={{ 
                      background: 'linear-gradient(90deg, #4F6A8D, #4F6A8D)',
                      width: `${Math.max((storyCards / deck.totalCards) * 100, storyCards > 0 ? 10 : 0)}%`
                    }} 
                  />
                </div>
                <div className="text-xs font-bold" style={{ color: '#FBFBFB' }}>{storyCards}</div>
                <div className="text-xs" style={{ color: '#AEAEAE' }}>故事</div>
              </div>
              
              <div className="text-center">
                {/* 添加背景条 */}
                <div className="relative w-full h-2 rounded-full mb-1" style={{ backgroundColor: '#AEAEAE' }}>
                  <div 
                    className="absolute top-0 left-0 h-full rounded-full transition-all duration-500"
                    style={{ 
                      background: 'linear-gradient(90deg, #91827B, #91827B)',
                      width: `${Math.max((supportCards / deck.totalCards) * 100, supportCards > 0 ? 10 : 0)}%`
                    }}
                  />
                </div>
                <div className="text-xs font-bold" style={{ color: '#FBFBFB' }}>{supportCards}</div>
                <div className="text-xs" style={{ color: '#AEAEAE' }}>配角</div>
              </div>
              
              <div className="text-center">
                {/* 添加背景条 */}
                <div className="relative w-full h-2 rounded-full mb-1" style={{ backgroundColor: '#AEAEAE' }}>
                  <div 
                    className="absolute top-0 left-0 h-full rounded-full transition-all duration-500"
                    style={{ 
                      background: 'linear-gradient(90deg, #2B2A3A, #2B2A3A)',
                      width: `${Math.max((heroCards / deck.totalCards) * 100, heroCards > 0 ? 10 : 0)}%`
                    }}
                  />
                </div>
                <div className="text-xs font-bold" style={{ color: '#FBFBFB' }}>{heroCards}</div>
                <div className="text-xs" style={{ color: '#AEAEAE' }}>主角</div>
              </div>
              
              <div className="text-center">
                {/* 添加背景条 */}
                <div className="relative w-full h-2 rounded-full mb-1" style={{ backgroundColor: '#AEAEAE' }}>
                  <div 
                    className="absolute top-0 left-0 h-full rounded-full transition-all duration-500"
                    style={{ 
                      background: 'linear-gradient(90deg, #C2B79C, #C2B79C)',
                      width: `${Math.max((neutralCards / deck.totalCards) * 100, neutralCards > 0 ? 10 : 0)}%`
                    }}
                  />
                </div>
                <div className="text-xs font-bold" style={{ color: '#FBFBFB' }}>{neutralCards}</div>
                <div className="text-xs" style={{ color: '#AEAEAE' }}>中立</div>
              </div>
              
              <div className="text-center">
                {/* 添加背景条 */}
                <div className="relative w-full h-2 rounded-full mb-1" style={{ backgroundColor: '#AEAEAE' }}>
                  <div 
                    className="absolute top-0 left-0 h-full rounded-full transition-all duration-500"
                    style={{ 
                      background: 'linear-gradient(90deg, #F07772, #F07772)',
                      width: `${Math.max((exclusiveCards / deck.totalCards) * 100, exclusiveCards > 0 ? 10 : 0)}%`
                    }}
                  />
                </div>
                <div className="text-xs font-bold" style={{ color: '#FBFBFB' }}>{exclusiveCards}</div>
                <div className="text-xs" style={{ color: '#AEAEAE' }}>专属</div>
              </div>
            </div>

            {/* 底部信息和操作按钮 */}
            <div className="mt-auto">
              <div className="flex justify-between items-center text-xs mb-4" style={{ color: '#AEAEAE' }}>
                <span>创建者: <span style={{ color: '#C2B79C' }}>{deck.createdBy.username}</span></span>
                <span>{new Date(deck.createdAt).toLocaleDateString()}</span>
      </div>

              {/* 操作按钮组 */}
        <div className="flex space-x-2">
          <button
            onClick={() => setViewingDeck(deck)}
                  className="flex-1 py-3 px-4 rounded-xl transition-all duration-300 font-medium text-sm shadow-lg transform"
                  style={{
                    background: 'linear-gradient(135deg, #4F6A8D, #4F6A8D)',
                    color: '#FBFBFB'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #5A7BA0, #5A7BA0)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #4F6A8D, #4F6A8D)';
                  }}
          >
            查看详情
          </button>

                {isOwned ? (
              <button
                onClick={() => setEditingDeck(deck)}
                    className="py-3 px-4 rounded-xl transition-all duration-300 font-medium text-sm shadow-lg transform"
                    style={{
                      background: 'linear-gradient(135deg, #91827B, #91827B)',
                      color: '#FBFBFB'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, #A19388, #A19388)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, #91827B, #91827B)';
                    }}
              >
                编辑
              </button>
                ) : (
              <button
                    onClick={() => handleCopyDeck(deck._id)}
                    className="py-3 px-4 rounded-xl transition-all duration-300 font-medium text-sm shadow-lg transform"
                    style={{
                      background: 'linear-gradient(135deg, #C2B79C, #C2B79C)',
                      color: '#2B2A3A'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, #D2C7AC, #D2C7AC)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, #C2B79C, #C2B79C)';
                    }}
                  >
                    复制
              </button>
          )}
        </div>

              {/* 删除按钮 - 仅对拥有者显示 */}
              {isOwned && (
                <div className="mt-2">
          <button
                    onClick={() => handleDeleteDeck(deck._id)}
                    className="w-full py-2 px-4 rounded-xl transition-all duration-300 font-medium text-sm"
                    style={{
                      background: 'linear-gradient(135deg, rgba(247, 119, 114, 0.2), rgba(247, 119, 114, 0.3))',
                      color: '#F07772',
                      border: '1px solid rgba(247, 119, 114, 0.3)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, rgba(247, 119, 114, 0.3), rgba(247, 119, 114, 0.4))';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, rgba(247, 119, 114, 0.2), rgba(247, 119, 114, 0.3))';
                    }}
                  >
                    删除
          </button>
        </div>
              )}
            </div>
          </div>

          {/* 悬浮时的边框发光效果 */}
          {isHovered && (
            <div 
              className="absolute inset-0 rounded-2xl pointer-events-none"
              style={{
                background: 'linear-gradient(135deg, rgba(194, 183, 156, 0.2), rgba(79, 106, 141, 0.2), rgba(145, 130, 115, 0.2))',
                filter: 'blur(1px)',
                zIndex: -1
              }}
            />
          )}
      </div>
    </div>
  );
  };

  if (decksLoading || cardsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingText />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-semibold" style={{ color: '#FBFBFB', fontFamily: 'QingNiaoHuaGuangYaoTi, sans-serif' }}>卡牌构筑</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-6 py-3 rounded-lg transition-all duration-500 ease-out relative overflow-hidden group border-2 text-xl"
          style={{ 
            backgroundColor: 'transparent',
            color: '#C2B79C',
            borderColor: '#C2B79C',
            fontFamily: 'QingNiaoHuaGuangYaoTi, sans-serif',
            fontWeight: '100'
          }}
        >
          {/* 背景滑动效果 */}
          <div
            className="absolute inset-0 transition-transform duration-500 ease-out transform -translate-x-full group-hover:translate-x-0"
            style={{ backgroundColor: '#C2B79C' }}
          ></div>
          
          {/* 文字内容 */}
          <span className="relative z-10 transition-colors duration-300 group-hover:text-white whitespace-nowrap">
            构筑卡组
          </span>
        </button>
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

      {error && (
        <div className="bg-red-500 bg-opacity-20 border border-red-500 text-red-100 px-4 py-3 rounded-md mb-6">
          错误: {error}
        </div>
      )}

      {/* 筛选器 - 采用卡牌集风格 */}
      <div className="relative z-10 mb-8">
        {/* 搜索框 */}
        <div className="mb-6">
            <input
              type="text"
              value={filter.search}
              onChange={(e) => setFilter({...filter, search: e.target.value})}
            className="w-full px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{ 
              backgroundColor: '#3F3832',
              border: '1px solid #C2B79C'
            }}
            placeholder="搜索卡组名称..."
            />
          </div>
          
        {/* 筛选选项和排序 */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          {/* 左侧筛选选项 */}
          <div className="flex flex-col md:flex-row gap-4 flex-1">
            {/* 主角筛选 */}
            <div className="relative flex-1">
              <button
                onClick={() => setShowFactionDropdown(!showFactionDropdown)}
                className="w-full px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-between"
                style={{ 
                  backgroundColor: '#3F3832',
                  border: '1px solid #C2B79C'
                }}
              >
                <span>
                  {filter.championFaction === '' ? '全部主角' : 
                   customFactions.find(f => f.id === filter.championFaction)?.name || filter.championFaction}
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
                  <button
                    onClick={() => {
                      setFilter({...filter, championFaction: ''});
                      setShowFactionDropdown(false);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-gray-600 transition-colors"
                    style={{ color: '#AEAEAE' }}
                  >
                    全部主角
                  </button>
                  {customFactions.map((faction, index) => (
                    <React.Fragment key={faction.id}>
                      <div style={{ height: '1px', backgroundColor: '#C2B79C' }}></div>
                      <button
                        onClick={() => {
                          setFilter({...filter, championFaction: faction.id});
                          setShowFactionDropdown(false);
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

            {/* 可见性筛选 */}
            <div className="relative flex-1">
              <button
                onClick={() => setShowVisibilityDropdown(!showVisibilityDropdown)}
                className="w-full px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-between"
                style={{ 
                  backgroundColor: '#3F3832',
                  border: '1px solid #C2B79C'
                }}
              >
                <span>
                  {filter.showPublic && filter.showPrivate ? '全部可见性' :
                   filter.showPublic ? '仅公开' : '仅私有'}
                </span>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                  <path d="M6 9L1 4h10L6 9z"/>
                </svg>
              </button>
              
              {showVisibilityDropdown && (
                <div 
                  className="absolute top-full left-0 right-0 border border-gray-500 z-50 overflow-y-auto"
                  style={{ backgroundColor: '#414141', maxHeight: '400px' }}
                >
                  <button
                    onClick={() => {
                      setFilter({...filter, showPublic: true, showPrivate: true});
                      setShowVisibilityDropdown(false);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-gray-600 transition-colors"
                    style={{ color: '#AEAEAE' }}
                  >
                    全部可见性
                  </button>
                  <div style={{ height: '1px', backgroundColor: '#C2B79C' }}></div>
                  <button
                    onClick={() => {
                      setFilter({...filter, showPublic: true, showPrivate: false});
                      setShowVisibilityDropdown(false);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-gray-600 transition-colors"
                    style={{ color: '#AEAEAE' }}
                  >
                    仅公开
                  </button>
                  <div style={{ height: '1px', backgroundColor: '#C2B79C' }}></div>
                  <button
                    onClick={() => {
                      setFilter({...filter, showPublic: false, showPrivate: true});
                      setShowVisibilityDropdown(false);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-gray-600 transition-colors"
                    style={{ color: '#AEAEAE' }}
                  >
                    仅私有
                  </button>
                </div>
              )}
            </div>

            {/* 收藏状态筛选 */}
            <div className="relative flex-1">
              <button
                onClick={() => setShowFavoriteDropdown(!showFavoriteDropdown)}
                className="w-full px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-between"
                style={{ 
                  backgroundColor: '#3F3832',
                  border: '1px solid #C2B79C'
                }}
              >
                <span>
                  {filter.showFavorites ? '仅已收藏' : '全部收藏状态'}
                </span>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                  <path d="M6 9L1 4h10L6 9z"/>
                </svg>
              </button>
              
              {showFavoriteDropdown && (
                <div 
                  className="absolute top-full left-0 right-0 border border-gray-500 z-50 overflow-y-auto"
                  style={{ backgroundColor: '#414141', maxHeight: '400px' }}
                >
                  <button
                    onClick={() => {
                      setFilter({...filter, showFavorites: false});
                      setShowFavoriteDropdown(false);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-gray-600 transition-colors"
                    style={{ color: '#AEAEAE' }}
                  >
                    全部收藏状态
                  </button>
                  <div style={{ height: '1px', backgroundColor: '#C2B79C' }}></div>
                  <button
                    onClick={() => {
                      setFilter({...filter, showFavorites: true});
                      setShowFavoriteDropdown(false);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-gray-600 transition-colors"
                    style={{ color: '#AEAEAE' }}
                  >
                    仅已收藏
                  </button>
                </div>
              )}
          </div>
        </div>

          {/* 右侧排序选项 */}
          <div className="w-full md:w-[200px]">
            <div className="relative">
          <button
                onClick={() => setShowSortDropdown(!showSortDropdown)}
                className="w-full px-3 py-2 border border-gray-500 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-between"
                style={{ backgroundColor: '#918273' }}
              >
                <span>
                  {sortBy === 'none' ? '无排序' : 
                   sortBy === 'name' ? `名称 ${sortDirection === 'asc' ? '↑' : '↓'}` :
                   sortBy === 'createdAt' ? `创建时间 ${sortDirection === 'asc' ? '↑' : '↓'}` :
                   sortBy === 'totalCards' ? `卡牌数 ${sortDirection === 'asc' ? '↑' : '↓'}` : ''}
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
                    名称 {sortBy === 'name' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                  </button>
                  <div style={{ height: '1px', backgroundColor: '#C2B79C' }}></div>
                  <button
                    onClick={() => {
                      if (sortBy === 'createdAt') {
                        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortBy('createdAt');
                        setSortDirection('asc');
                      }
                      setShowSortDropdown(false);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-gray-600 transition-colors"
                    style={{ color: '#AEAEAE' }}
                  >
                    创建时间 {sortBy === 'createdAt' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                  </button>
                  <div style={{ height: '1px', backgroundColor: '#C2B79C' }}></div>
                  <button
                    onClick={() => {
                      if (sortBy === 'totalCards') {
                        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortBy('totalCards');
                        setSortDirection('asc');
                      }
                      setShowSortDropdown(false);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-gray-600 transition-colors"
                    style={{ color: '#AEAEAE' }}
                  >
                    卡牌数 {sortBy === 'totalCards' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 快速重置按钮和统计信息 */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2 md:gap-0">
          {/* 卡组统计信息 */}
          <div className="text-gray-400 text-sm">
            共找到 <span className="font-semibold" style={{ color: '#4F6A8D' }}>{sortedDecks.length}</span> 个卡组
            {totalPages > 1 && (
              <span className="ml-2">
                (第 {currentPage} 页，共 {totalPages} 页)
              </span>
            )}
          </div>
          
          <button
            onClick={() => {
              setFilter({
              search: '',
              showPublic: true,
              showPrivate: true,
              showFavorites: false,
              championFaction: ''
              });
              setSortBy('none');
              setSortDirection('asc');
            }}
            className="text-sm text-gray-400 hover:text-white transition-colors px-3 py-1 rounded border border-gray-600 hover:border-gray-500"
          >
            重置筛选
          </button>
        </div>
      </div>

      {/* 统计信息 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-blue-400">{decks.filter(d => d.createdBy._id === user?.id).length}</div>
          <div className="text-gray-300 text-sm">我的卡组</div>
        </div>
        <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-green-400">{decks.filter(d => d.isPublic).length}</div>
          <div className="text-gray-300 text-sm">公开卡组</div>
        </div>
        <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-purple-400">{decks.filter(d => !d.isPublic).length}</div>
          <div className="text-gray-300 text-sm">私有卡组</div>
        </div>
        <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-orange-400">{decks.filter(d => d.isFavorited).length}</div>
          <div className="text-gray-300 text-sm">已收藏</div>
        </div>
        <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-yellow-400">{decks.length}</div>
          <div className="text-gray-300 text-sm">总卡组数</div>
        </div>
      </div>

      {/* 卡组列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {paginatedDecks.map((deck) => (
          <DeckComponent key={deck._id} deck={deck} />
        ))}
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

      {filteredDecks.length === 0 && !decksLoading && (
        <div className="text-center py-20">
          <h3 className="text-2xl font-bold text-white mb-4">
            {filter.search ? '未找到匹配的卡组' : '暂无卡组'}
          </h3>
          <p className="text-gray-300 mb-8">
            {filter.search ? '尝试调整搜索条件' : '构建你的第一个卡组开始游戏吧！'}
          </p>
          <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-6 max-w-2xl mx-auto">
            <h4 className="text-white font-semibold mb-3">卡组构建提示</h4>
            <div className="text-left text-gray-300 space-y-2 text-sm">
              <p>• 牌堆可携带卡牌总数为<strong className="text-yellow-400">40张卡牌</strong>（虽然你可以超出这个数字，但通常对局规则下请遵循此规则）</p>
              <p>• 同名卡牌数量<strong className="text-green-400">3张</strong></p>
              <p>• 可以选择<strong className="text-blue-400">中立卡</strong>和<strong className="text-orange-400">主角专属卡</strong></p>
              <p>• 主角牌<strong className="text-purple-400">通常限制一张</strong>，特殊情况除外</p>
            </div>
          </div>
        </div>
      )}

      {/* 创建卡组模态框 */}
      {showCreateModal && (
        <DeckForm
          cards={cards}
          customFactions={customFactions}
          customTypes={customTypes}
          customCategories={customCategories}
          onSubmit={handleCreateDeck}
          onCancel={() => setShowCreateModal(false)}
        />
      )}

      {/* 编辑卡组模态框 */}
      {editingDeck && (
        <DeckForm
          deck={editingDeck}
          cards={cards}
          customFactions={customFactions}
          customTypes={customTypes}
          customCategories={customCategories}
          onSubmit={handleUpdateDeck}
          onCancel={() => setEditingDeck(null)}
        />
      )}

      {/* 查看卡组详情模态框 */}
      {viewingDeck && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-8 max-w-6xl w-full h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">卡组详情: {viewingDeck.name}</h2>
              <button
                onClick={() => setViewingDeck(null)}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded transition-colors"
              >
                关闭
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
              {/* 左侧：主角和基本信息 */}
              <div className="space-y-6 overflow-y-auto">
                {viewingDeck.championCardId && (
                  <div className="bg-white bg-opacity-10 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-white mb-3">主角</h3>
                    <div className="bg-gradient-to-br from-purple-800 to-purple-900 rounded-lg p-4 border-2 border-purple-500">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-white">
                          {(() => {
                            const championFaction = customFactions.find(f => f.id === viewingDeck.championCardId);
                            return championFaction ? championFaction.name : viewingDeck.championCardId;
                          })()}
                        </h4>
                      </div>
                      <div className="text-green-400 text-sm">
                        <p className="font-semibold">效果:</p>
                        <p className="whitespace-pre-wrap">
                          {(() => {
                            const championFaction = customFactions.find(f => f.id === viewingDeck.championCardId);
                            return viewingDeck.championDescription || 
                                   (championFaction ? championFaction.description : null) || 
                                   '无效果描述';
                          })()}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-white bg-opacity-10 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-3">卡组信息</h3>
                  <div className="text-gray-300 space-y-2">
                    <p>总卡牌数: <span className="text-yellow-400 font-bold">{viewingDeck.totalCards}</span></p>
                    <p>创建者: <span className="text-blue-400">{viewingDeck.createdBy.username}</span></p>
                    <p>可见性: <span className={viewingDeck.isPublic ? 'text-green-400' : 'text-yellow-400'}>
                      {viewingDeck.isPublic ? '公开' : '私有'}
                    </span></p>
                    <p>创建时间: <span className="text-gray-400">{new Date(viewingDeck.createdAt).toLocaleDateString()}</span></p>
                    <p>平均费用: <span className="text-purple-400 font-bold">
                      {(() => {
                        const totalCards = viewingDeck.cards.reduce((sum, dc) => sum + dc.count, 0);
                        const totalCost = viewingDeck.cards.reduce((sum, dc) => {
                          const cost = dc.card.cost;
                          const numericCost = cost === 'X' ? 0 : parseInt(cost) || 0;
                          return sum + (numericCost * dc.count);
                        }, 0);
                        return totalCards > 0 ? (totalCost / totalCards).toFixed(2) : '0.00';
                      })()}
                    </span></p>
                  </div>
                </div>

                {/* 卡组统计 */}
                <div className="bg-white bg-opacity-10 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-3">卡牌统计</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-blue-400">故事牌:</span>
                      <span className="text-white font-bold">
                        {viewingDeck.cards.filter(dc => dc.card.type === '故事牌').reduce((sum, dc) => sum + dc.count, 0)}张
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-400">配角牌:</span>
                      <span className="text-white font-bold">
                        {viewingDeck.cards.filter(dc => dc.card.type === '配角牌').reduce((sum, dc) => sum + dc.count, 0)}张
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-yellow-400">中立卡:</span>
                      <span className="text-white font-bold">
                        {viewingDeck.cards.filter(dc => dc.card.faction.includes('中立')).reduce((sum, dc) => sum + dc.count, 0)}张
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-orange-400">专属卡:</span>
                      <span className="text-white font-bold">
                        {viewingDeck.cards.filter(dc => !dc.card.faction.includes('中立')).reduce((sum, dc) => sum + dc.count, 0)}张
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 右侧：卡牌列表和费用分布 */}
              <div className="lg:col-span-2 flex flex-col min-h-0">
                <h3 className="text-lg font-semibold text-white mb-4">卡牌列表 ({viewingDeck.cards.length}种卡牌)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto flex-1 mb-6">
                  {viewingDeck.cards.map((deckCard, index) => (
                    <div key={index} className="bg-white bg-opacity-10 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-white">{deckCard.card.name}</h4>
                        <div className="flex items-center space-x-2">
                          <span className="text-yellow-400 font-bold">{deckCard.card.cost}</span>
                          <span className="bg-blue-600 text-white px-2 py-1 rounded-full text-xs font-semibold">
                            x{deckCard.count}
                          </span>
                        </div>
                      </div>
                      
                      <div className="text-sm text-gray-300 mb-2">
                        <p>
                          {deckCard.card.type === '故事牌' ? '故事牌' : 
                           deckCard.card.type === '配角牌' ? '配角牌' : '主角牌'} 
                          - {deckCard.card.category}
                        </p>
                        <p>主角: {getFactionText(deckCard.card.faction)}</p>
                        {deckCard.card.type === '配角牌' && (
                          <p>攻击/生命: <span className="text-red-400">{deckCard.card.attack}</span>/<span className="text-green-400">{deckCard.card.health}</span></p>
                        )}
                      </div>
                      
                      <div className="text-green-400 text-xs">
                        <p className="font-semibold">效果:</p>
                        <p className="whitespace-pre-wrap">{deckCard.card.effect}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 费用分布图 - 横版 */}
                <div className="bg-white bg-opacity-10 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-3">费用分布</h3>
                  <div className="flex items-end justify-between space-x-2 h-32">
                    {(() => {
                      // 计算各个费用的卡牌数量
                      const costDistribution: { [key: string]: number } = { '0': 0, '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6': 0, '7': 0, '8': 0, '9': 0, 'X': 0 };
                      viewingDeck.cards.forEach(dc => {
                        const cost = dc.card.cost;
                        if (costDistribution.hasOwnProperty(cost)) {
                          costDistribution[cost] += dc.count;
                        }
                      });
                      
                      // 找到最大值用于计算比例
                      const maxCount = Math.max(...Object.values(costDistribution));
                      
                      return Object.entries(costDistribution).map(([cost, count]) => (
                        <div key={cost} className="flex flex-col items-center flex-1">
                          <div className="text-xs text-white font-semibold mb-1">{count > 0 ? count : ''}</div>
                          <div 
                            className="bg-gradient-to-t from-blue-500 to-purple-500 w-full rounded-t transition-all duration-300 relative"
                            style={{ 
                              height: maxCount > 0 ? `${Math.max((count / maxCount) * 100, count > 0 ? 8 : 0)}px` : '0px'
                            }}
                          />
                          <div className="text-xs text-gray-300 mt-1">{cost}</div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              </div>
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

export default DeckBuilder;
