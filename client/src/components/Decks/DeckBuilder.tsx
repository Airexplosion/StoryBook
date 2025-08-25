import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store/store';
import { fetchDecks, createDeck, updateDeck, deleteDeck, favoriteDeck, unfavoriteDeck, copyDeck, recommendDeck, unrecommendDeck } from '../../store/slices/decksSlice';
import { fetchCards } from '../../store/slices/cardsSlice';
import { fetchConfig } from '../../store/slices/configSlice';
import { Card, Deck, DeckCard } from '../../types';
import DeckForm from './DeckForm';
import api from '../../services/api'; // Import api
import SearchableSelect from '../common/SearchableSelect'; // Import SearchableSelect
import { formatEffectText, TooltipState } from '../../utils/keywords';

const DeckBuilder: React.FC = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingDeck, setEditingDeck] = useState<Deck | null>(null);
  const [viewingDeck, setViewingDeck] = useState<Deck | null>(null);
  const [showRecommendModal, setShowRecommendModal] = useState(false);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [recommendingDeck, setRecommendingDeck] = useState<Deck | null>(null);
  const [recommendReason, setRecommendReason] = useState('');
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

  // 主角详情弹窗状态
  const [selectedChampion, setSelectedChampion] = useState<any>(null);

  const dispatch = useDispatch<AppDispatch>();
  const { decks, isLoading: decksLoading, error } = useSelector((state: RootState) => state.decks);
  const { cards, isLoading: cardsLoading } = useSelector((state: RootState) => state.cards);
  const { user } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    dispatch(fetchDecks() as any);
    dispatch(fetchCards({}) as any); // 获取所有卡牌用于卡组构建
    loadGameConfig(); // Load game config on mount
  }, [dispatch]);

  // 调试：监听decks变化
  useEffect(() => {
    console.log('Decks updated:', decks);
    const recommendedDecks = decks.filter(deck => deck.isRecommended);
    console.log('Recommended decks:', recommendedDecks);
  }, [decks]);

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
    // 首先按推荐状态排序（推荐卡组置顶）
    if (a.isRecommended && !b.isRecommended) {
      return -1;
    }
    if (!a.isRecommended && b.isRecommended) {
      return 1;
    }
    
    // 然后按用户排序（用户自己的卡组优先）
    if (a.createdBy._id === user?.id && b.createdBy._id !== user?.id) return -1;
    if (a.createdBy._id !== user?.id && b.createdBy._id === user?.id) return 1;
    
    // 最后按选择的排序方式排序
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

  const handleRecommendDeck = async (deck: Deck) => {
    setRecommendingDeck(deck);
    setRecommendReason('');
    setShowRecommendModal(true);
  };

  const handleConfirmRecommend = async () => {
    if (recommendingDeck && recommendReason.trim()) {
      console.log('Confirming recommend for deck:', recommendingDeck._id, 'with reason:', recommendReason.trim());
      try {
        await dispatch(recommendDeck({ id: recommendingDeck._id, reason: recommendReason.trim() }) as any);
        console.log('Recommend action dispatched successfully');
        // 注释掉重新获取数据，因为后端还没有实现推荐功能，重新获取会丢失前端状态
        // await dispatch(fetchDecks() as any);
        setShowRecommendModal(false);
        setRecommendingDeck(null);
        setRecommendReason('');
      } catch (error) {
        console.error('Failed to recommend deck:', error);
      }
    }
  };

  const handleUnrecommendDeck = async (deckId: string) => {
    console.log('Unrecommending deck:', deckId);
    try {
      await dispatch(unrecommendDeck(deckId) as any);
      console.log('Unrecommend action dispatched successfully');
      // 注释掉重新获取数据，因为后端还没有实现推荐功能，重新获取会丢失前端状态
      // await dispatch(fetchDecks() as any);
    } catch (error) {
      console.error('Failed to unrecommend deck:', error);
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
            background: 'linear-gradient(135deg, rgba(145, 130, 115, 0.25) 0%, rgba(63, 56, 50, 0.35) 50%, rgba(145, 130, 115, 0.25) 100%)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(194, 183, 156, 0.3)',
            boxShadow: isHovered 
              ? 'inset 0 0 25px rgba(194, 183, 156, 0.12), 0 6px 20px rgba(0,0,0,0.3)'
              : 'inset 0 0 20px rgba(194, 183, 156, 0.08), 0 4px 15px rgba(0,0,0,0.2)',
            minHeight: '420px'
          }}
        >
          {/* 噪点纹理层 */}
          <div 
            className="absolute inset-0 rounded-2xl opacity-20 pointer-events-none"
            style={{
              backgroundImage: `
                radial-gradient(circle at 2px 1px, rgba(194, 183, 156, 0.1) 1px, transparent 0),
                radial-gradient(circle at 5px 7px, rgba(194, 183, 156, 0.08) 1px, transparent 0),
                radial-gradient(circle at 9px 3px, rgba(194, 183, 156, 0.06) 1px, transparent 0)
              `,
              backgroundSize: '12px 12px, 16px 16px, 20px 20px',
              backgroundPosition: '0 0, 3px 3px, 6px 6px'
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
                  {deck.isRecommended && (
                    <div className="flex items-center space-x-2">
                      <div className="px-3 py-1 rounded-full text-xs font-bold transition-all duration-300 border border-opacity-40"
                      style={{
                        backgroundColor: 'rgba(240, 119, 114, 0.2)',
                        color: '#F07772',
                        borderColor: 'rgba(240, 119, 114, 0.4)'
                      }}>
                        官方推荐
                      </div>
                      {deck.recommendReason && (
                        <div className="px-3 py-1 rounded-full text-xs transition-all duration-300 border border-opacity-40 max-w-xs"
                        style={{
                          backgroundColor: 'rgba(194, 183, 156, 0.2)',
                          color: '#C2B79C',
                          borderColor: 'rgba(194, 183, 156, 0.4)'
                        }}>
                          <span className="truncate" title={deck.recommendReason}>
                            {deck.recommendReason}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
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

              {/* 管理员推荐按钮 */}
              {user?.isAdmin && (
                <div className="mt-2">
                  <button
                    onClick={() => deck.isRecommended ? handleUnrecommendDeck(deck._id) : handleRecommendDeck(deck)}
                    className="w-full py-2 px-4 rounded-xl transition-all duration-300 font-medium text-sm"
                    style={{
                      background: deck.isRecommended 
                        ? 'linear-gradient(135deg, rgba(240, 119, 114, 0.2), rgba(240, 119, 114, 0.3))'
                        : 'linear-gradient(135deg, rgba(194, 183, 156, 0.2), rgba(194, 183, 156, 0.3))',
                      color: deck.isRecommended ? '#F07772' : '#C2B79C',
                      border: `1px solid ${deck.isRecommended ? 'rgba(240, 119, 114, 0.3)' : 'rgba(194, 183, 156, 0.3)'}`
                    }}
                    onMouseEnter={(e) => {
                      if (deck.isRecommended) {
                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(240, 119, 114, 0.3), rgba(240, 119, 114, 0.4))';
                      } else {
                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(194, 183, 156, 0.3), rgba(194, 183, 156, 0.4))';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (deck.isRecommended) {
                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(240, 119, 114, 0.2), rgba(240, 119, 114, 0.3))';
                      } else {
                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(194, 183, 156, 0.2), rgba(194, 183, 156, 0.3))';
                      }
                    }}
                  >
                    {deck.isRecommended ? '取消推荐' : '设为推荐'}
                  </button>
                </div>
              )}

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
      {/* 隐藏滚动条的样式 */}
      <style>{`
        .deck-card-list-scroll::-webkit-scrollbar {
          display: none;
        }
      `}</style>
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
         <div 
           className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4"
                onClick={() => setViewingDeck(null)}
         >
           <div 
             className="rounded-2xl shadow-2xl p-8 max-w-full w-[98vw] h-[95vh] flex flex-col relative" 
             style={{ backgroundColor: '#3F3832' }}
             onClick={(e) => e.stopPropagation()}
           >
             {/* 关闭按钮 */}
             <button
               onClick={() => setViewingDeck(null)}
               className="absolute top-6 right-6 z-30 hover:scale-110 transition-transform duration-200"
               style={{
                 width: '28px',
                 height: '28px',
                 background: 'none',
                 border: 'none',
                 cursor: 'pointer'
               }}
             >
               <svg 
                 width="28" 
                 height="28" 
                 viewBox="0 0 1024 1024" 
                 xmlns="http://www.w3.org/2000/svg"
                 style={{
                   fill: '#FBFBFB'
                 }}
               >
                 <path d="M589.824 501.76L998.4 93.184c20.48-20.48 20.48-54.784 0-75.264l-2.048-2.048c-20.48-20.48-54.784-20.48-75.264 0L512.512 424.96 103.936 15.36c-20.48-20.48-54.784-20.48-75.264 0l-2.56 2.56C5.12 38.4 5.12 72.192 26.112 93.184L434.688 501.76 26.112 910.336c-20.48 20.48-20.48 54.784 0 75.264l2.048 2.048c20.48 20.48 54.784 20.48 75.264 0l408.576-408.576 408.576 408.576c20.48 20.48 54.784 20.48 75.264 0l2.048-2.048c20.48-20.48 20.48-54.784 0-75.264L589.824 501.76z" />
               </svg>
             </button>

             {/* 居中标题栏 */}
             <div className="flex flex-col items-center mb-6">
               <h2 className="text-3xl font-bold mb-2" style={{ color: '#FBFBFB', fontFamily: 'QingNiaoHuaGuangYaoTi, sans-serif' }}>
                 {viewingDeck.name}
               </h2>
               <p className="text-sm mb-3" style={{ color: '#AEAEAE' }}>
                 创建者: {viewingDeck.createdBy.username}
               </p>
               
               {/* 推荐标签 */}
               {viewingDeck.isRecommended && (
                 <div className="flex items-center space-x-2 px-3 py-1 rounded-lg" style={{ backgroundColor: '#4F6A8D', color: '#FBFBFB' }}>
                   <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: '#C2B79C' }}></div>
                   <span className="text-sm font-medium">官方推荐</span>
                 </div>
               )}
            </div>

            {/* 带星星的分割线 */}
            <div className="flex items-center justify-center mb-8">
              <div className="flex items-center">
                <div className="h-px bg-gradient-to-r from-transparent via-[#C2B79C] to-transparent w-32"></div>
                <img src="/Icon/Star.svg" width="20" height="20" className="mx-3" style={{ filter: 'brightness(0) saturate(100%) invert(73%) sepia(13%) saturate(346%) hue-rotate(8deg) brightness(89%) contrast(89%)' }} alt="star" />
                <div className="h-px bg-gradient-to-r from-transparent via-[#C2B79C] to-transparent w-32"></div>
                <img src="/Icon/Star.svg" width="20" height="20" className="mx-3" style={{ filter: 'brightness(0) saturate(100%) invert(73%) sepia(13%) saturate(346%) hue-rotate(8deg) brightness(89%) contrast(89%)' }} alt="star" />
                <div className="h-px bg-gradient-to-r from-transparent via-[#C2B79C] to-transparent w-32"></div>
                <img src="/Icon/Star.svg" width="20" height="20" className="mx-3" style={{ filter: 'brightness(0) saturate(100%) invert(73%) sepia(13%) saturate(346%) hue-rotate(8deg) brightness(89%) contrast(89%)' }} alt="star" />
                <div className="h-px bg-gradient-to-r from-transparent via-[#C2B79C] to-transparent w-32"></div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
              {/* 左侧：主角和基本信息 */}
              <div 
                className="flex flex-col space-y-4 overflow-y-auto pr-2 p-4 rounded-lg"
                style={{ backgroundColor: 'rgba(0, 0, 0, 0.1)' }}
              >
                {viewingDeck.championCardId && (
                  <div>
                    <div className="w-full">
                      <div
                        className="relative rounded-xl p-8 shadow-lg border border-opacity-20 border-white backdrop-blur-sm overflow-hidden cursor-pointer hover:border-opacity-40 transition-all duration-300 w-full"
                        style={{
                          height: '500px'
                        }}
                        onClick={() => {
                          const championFaction = customFactions.find(f => f.id === viewingDeck.championCardId);
                          if (championFaction) {
                            setSelectedChampion(championFaction);
                          } else if (viewingDeck.championCardId) {
                            // 如果找不到customFactions中的数据，创建一个临时对象用于显示
                            setSelectedChampion({
                              id: viewingDeck.championCardId,
                              name: viewingDeck.championCardId,
                              description: viewingDeck.championDescription || '暂无详细描述'
                            });
                          }
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
                        <div className="relative z-10" style={{ transform: 'translateY(10px)' }}>
                          {/* 主战者名称 */}
                          <div className="text-center mb-6">
                            {/* 主标题在上面 */}
                            <h3 style={{ 
                                  fontFamily: 'QingNiaoHuaGuangYaoTi, sans-serif',
                                  fontSize: '22px',
                                  color: '#918273',
                                  marginTop: '4px',
                                  fontWeight: '550'
                                }}>
                          {(() => {
                            const championFaction = customFactions.find(f => f.id === viewingDeck.championCardId);
                                const name = championFaction ? championFaction.name : (viewingDeck.championCardId || '未知主角');
                                return name.replace(/\[.*?\]/g, '').trim();
                          })()}
                            </h3>
                            {/* 提取[]内容作为副标题 */}
                            <div style={{ 
                                   fontFamily: 'QingNiaoHuaGuangYaoTi, sans-serif',
                                   minHeight: '20px',
                                   color: '#282A3A',
                                   marginTop: '-7px',
                                   marginBottom: '7px',
                                   fontSize: '12px'
                                 }}>
                              {(() => {
                                const championFaction = customFactions.find(f => f.id === viewingDeck.championCardId);
                                const name = championFaction ? championFaction.name : (viewingDeck.championCardId || '');
                                return name.includes('[') && name.includes(']') 
                                  ? name.match(/\[(.*?)\]/)?.[1] 
                                  : '';
                              })()}
                      </div>
                          </div>

                          {/* 主战者效果描述 */}
                          <div className="text-center flex justify-center" style={{ marginTop: '220px' }}>
                            <div 
                              className="text-base leading-relaxed overflow-hidden whitespace-pre-wrap"
                              style={{ 
                                color: '#111111',
                                textShadow: '1px 1px 2px rgba(255,255,255,0.8)',
                                height: '110px',
                                display: '-webkit-box',
                                WebkitLineClamp: 4,
                                WebkitBoxOrient: 'vertical',
                                textOverflow: 'ellipsis',
                                width: '260px'
                              }}
                            >
                          {(() => {
                            const championFaction = customFactions.find(f => f.id === viewingDeck.championCardId);
                            return viewingDeck.championDescription || 
                                   (championFaction?.description) || 
                                       '暂无详细描述';
                          })()}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 卡组信息和统计容器 */}
                <div className="flex-1 flex flex-col justify-end space-y-4">
                  <div 
                    className="p-4 rounded-lg backdrop-blur-md border border-opacity-20 border-white"
                  style={{
                    background: 'linear-gradient(135deg, rgba(194, 183, 156, 0.1) 0%, rgba(251, 251, 251, 0.05) 100%)',
                    backdropFilter: 'blur(10px)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
                  }}
                >
                  <h3 className="text-lg font-bold mb-3" style={{ color: '#FBFBFB', fontFamily: 'QingNiaoHuaGuangYaoTi, sans-serif' }}>
                    卡组信息
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <div className="text-xs mb-1" style={{ color: '#AEAEAE' }}>总卡牌数</div>
                      <div className="font-bold text-lg" style={{ color: '#C2B79C' }}>{viewingDeck.totalCards}</div>
                    </div>
                    <div>
                      <div className="text-xs mb-1" style={{ color: '#AEAEAE' }}>平均费用</div>
                      <div className="font-bold text-lg" style={{ color: '#4F6A8D' }}>
                      {(() => {
                        const totalCards = viewingDeck.cards.reduce((sum, dc) => sum + dc.count, 0);
                        const totalCost = viewingDeck.cards.reduce((sum, dc) => {
                          const cost = dc.card.cost;
                          const numericCost = cost === 'X' ? 0 : parseInt(cost) || 0;
                          return sum + (numericCost * dc.count);
                        }, 0);
                          return totalCards > 0 ? (totalCost / totalCards).toFixed(1) : '0.0';
                      })()}
                  </div>
                    </div>
                    <div>
                      <div className="text-xs mb-1" style={{ color: '#AEAEAE' }}>可见性</div>
                      <div className="font-bold text-lg" style={{ color: viewingDeck.isPublic ? '#C2B79C' : '#918273' }}>
                        <div className="flex items-center">
                          <div className={`w-2 h-2 rounded-full mr-2`} style={{ backgroundColor: viewingDeck.isPublic ? '#C2B79C' : '#918273' }}></div>
                          {viewingDeck.isPublic ? '公开' : '私有'}
                        </div>
                      </div>
                    </div>
                  </div>
                  {viewingDeck.recommendReason && (
                    <div className="mt-4 p-3 rounded-lg" style={{ backgroundColor: '#4F6A8D' }}>
                      <div className="text-xs mb-1" style={{ color: '#C2B79C' }}>推荐理由</div>
                      <div className="text-sm" style={{ color: '#FBFBFB' }}>{viewingDeck.recommendReason}</div>
                    </div>
                  )}
                </div>

                {/* 卡组统计 */}
                <div 
                  className="p-4 rounded-lg backdrop-blur-md border border-opacity-20 border-white"
                  style={{
                    background: 'linear-gradient(135deg, rgba(194, 183, 156, 0.1) 0%, rgba(251, 251, 251, 0.05) 100%)',
                    backdropFilter: 'blur(10px)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
                  }}
                >
                  <h3 className="text-lg font-bold mb-3" style={{ color: '#FBFBFB', fontFamily: 'QingNiaoHuaGuangYaoTi, sans-serif' }}>
                    卡牌统计
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full mr-3" style={{ backgroundColor: '#4F6A8D' }}></div>
                        <span className="font-medium" style={{ color: '#FBFBFB' }}>故事牌</span>
                      </div>
                      <span className="font-bold text-lg" style={{ color: '#C2B79C' }}>
                        {viewingDeck.cards.filter(dc => dc.card.type === '故事牌').reduce((sum, dc) => sum + dc.count, 0)}张
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full mr-3" style={{ backgroundColor: '#C2B79C' }}></div>
                        <span className="font-medium" style={{ color: '#FBFBFB' }}>配角牌</span>
                      </div>
                      <span className="font-bold text-lg" style={{ color: '#C2B79C' }}>
                        {viewingDeck.cards.filter(dc => dc.card.type === '配角牌').reduce((sum, dc) => sum + dc.count, 0)}张
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full mr-3" style={{ backgroundColor: '#918273' }}></div>
                        <span className="font-medium" style={{ color: '#FBFBFB' }}>中立卡</span>
                      </div>
                      <span className="font-bold text-lg" style={{ color: '#C2B79C' }}>
                        {viewingDeck.cards.filter(dc => dc.card.faction.includes('中立')).reduce((sum, dc) => sum + dc.count, 0)}张
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full mr-3" style={{ backgroundColor: '#AEAEAE' }}></div>
                        <span className="font-medium" style={{ color: '#FBFBFB' }}>专属卡</span>
                      </div>
                      <span className="font-bold text-lg" style={{ color: '#C2B79C' }}>
                        {viewingDeck.cards.filter(dc => !dc.card.faction.includes('中立')).reduce((sum, dc) => sum + dc.count, 0)}张
                      </span>
                    </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 右侧：卡牌列表和费用分布 */}
              <div className="lg:col-span-2 flex min-h-0 gap-6">
                {/* 卡牌列表部分 */}
                <div className="flex-1 flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold" style={{ color: '#FBFBFB', fontFamily: 'QingNiaoHuaGuangYaoTi, sans-serif' }}>
                      卡牌列表
                    </h3>
                    <div className="px-3 py-1 rounded-lg" style={{ backgroundColor: '#4F6A8D', transform: 'translateY(-5px)' }}>
                      <span className="font-medium text-sm" style={{ color: '#FBFBFB' }}>{viewingDeck.cards.length}种卡牌</span>
                    </div>
                  </div>
                  
                  {/* 简单分割线 */}
                  <div className="h-px bg-gradient-to-r from-transparent via-[#C2B79C] to-transparent mb-6"></div>
                <div 
                  className="grid grid-cols-2 justify-items-center gap-x-4 overflow-y-auto deck-card-list-scroll p-4 rounded-lg"
                  style={{ 
                    height: '585px',
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                    backgroundColor: 'rgba(0, 0, 0, 0.1)'
                  }}
                >
                  {viewingDeck.cards.map((deckCard, index) => (
                    <div key={index} className="relative cursor-pointer group" style={{ marginBottom: '-20px' }} onClick={() => setSelectedCard(deckCard.card)}>
                      <div
                        className="relative rounded-xl p-8 shadow-lg border border-opacity-20 border-white backdrop-blur-sm overflow-hidden hover:shadow-xl hover:border-opacity-40 transition-all duration-300"
                        style={{
                          width: '288px',
                          height: '403px',
                          transform: 'scale(0.8)',
                          transformOrigin: 'center'
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
                            backgroundImage: `url(${getCardBackground(deckCard.card.type)})`,
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
                                left: (deckCard.card.type === '故事牌' || deckCard.card.type === '主角牌' || deckCard.card.type === '关键字效果') ? '-9px' : '-3px',
                                top: (deckCard.card.type === '故事牌' || deckCard.card.type === '主角牌' || deckCard.card.type === '关键字效果') ? '24px' : (deckCard.card.type === '配角牌') ? '5px' : '2px'
                              }}
                            >
                              {(() => {
                                const cost = deckCard.card.cost;
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
                                        color: (deckCard.card.type === '故事牌' || deckCard.card.type === '关键字效果') ? '#424453' : '#debf97',
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
                                          color: (deckCard.card.type === '故事牌' || deckCard.card.type === '关键字效果') ? '#424453' : '#debf97',
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
                            {getCardBackground(deckCard.card.type).includes('SubcharC') && (
                              <>
                                <div 
                                  style={{ 
                                    fontFamily: 'Zoika-2, sans-serif',
                                    fontSize: (deckCard.card.attack?.toString().length ?? 0) >= 2 ? '22px' : '24px', // 两位数下调2px
                                    fontWeight: 'bold',
                                    color: '#4e4a44',
                                    textShadow: '1px 0 0 #ffffff, -1px 0 0 #ffffff, 0 1px 0 #ffffff, 0 -1px 0 #ffffff', // 白色1px描边
                                    position: 'relative',
                                    left: (deckCard.card.attack?.toString().length ?? 0) >= 2 ? '-25px' : '-19px', // 两位数往左6px
                                    top: (() => {
                                      const costIsTwo = deckCard.card.cost.replace(/\*/g, '').length >= 2; // 费用是否两位数
                                      const attackIsTwo = (deckCard.card.attack?.toString().length ?? 0) >= 2; // 攻击是否两位数
                                      let topValue = -1; // 基础位置
                                      if (costIsTwo) topValue += 5; // 费用两位数往下5px
                                      if (attackIsTwo) topValue += 2; // 攻击两位数往下2px
                                      return `${topValue}px`;
                                    })()
                                  }}
                                >
                                  {deckCard.card.attack}
                                </div>
                                <div 
                                  style={{ 
                                    fontFamily: 'Zoika-2, sans-serif',
                                    fontSize: (deckCard.card.health?.toString().length ?? 0) >= 2 ? '22px' : '24px', // 两位数下调2px
                                    fontWeight: 'bold',
                                    color: '#c78151',
                                    textShadow: '1px 0 0 #ffffff, -1px 0 0 #ffffff, 0 1px 0 #ffffff, 0 -1px 0 #ffffff', // 白色1px描边
                                    position: 'relative',
                                    left: (deckCard.card.health?.toString().length ?? 0) >= 2 ? '-11px' : '-5px', // 两位数往左6px
                                    top: (() => {
                                      const costIsTwo = deckCard.card.cost.replace(/\*/g, '').length >= 2; // 费用是否两位数
                                      const healthIsTwo = (deckCard.card.health?.toString().length ?? 0) >= 2; // 生命是否两位数
                                      let topValue = -8; // 基础位置
                                      if (costIsTwo) topValue += 5; // 费用两位数往下5px
                                      if (healthIsTwo) topValue += 2; // 生命两位数往下2px
                                      return `${topValue}px`;
                                    })()
                                  }}
                                >
                                  {deckCard.card.health}
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
                                let displayName = deckCard.card.name.replace(/\[.*?\]/g, '').trim();
                                // 如果是关键字效果牌，去掉【关键字】部分
                                if (deckCard.card.type === '关键字效果') {
                                  displayName = displayName.replace(/【关键字】/g, '');
                                }
                                return displayName.split('').map((char, i) => (
                                  <span key={i}>{char}</span>
                                ));
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
                              {deckCard.card.name.includes('[') && deckCard.card.name.includes(']') 
                                ? deckCard.card.name.match(/\[(.*?)\]/)?.[1] 
                                : ''}
                            </div>
                          </div>

                          {/* 卡牌类型 - 纵向显示 */}
                          <div className="absolute" style={{ 
                            top: deckCard.card.type === '关键字效果' ? '166px' : '176px', 
                            left: '-5px'
                          }}>
                            {(() => {
                              const type = deckCard.card.type as string;
                              let displayText = '';
                              // 如果是故事牌或关键字效果，显示详细分类
                              if (type === '故事牌' || type === 'story' || type === '关键字效果') {
                                displayText = deckCard.card.category || (type === '关键字效果' ? '关键字' : '故事');
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
                              className="text-sm leading-relaxed whitespace-pre-wrap"
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
                              {deckCard.card.effect || '无效果'}
                            </div>
                          </div>

                          {/* 提取标题中【】内容显示 - 不适用于关键字牌 */}
                          {(() => {
                            // 排除关键字牌
                            if (deckCard.card.type === '关键字效果') {
                              return null;
                            }
                            
                            const bracketMatch = deckCard.card.name.match(/【(.*?)】/);
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
                                  textAlign: 'center',
                                  maxWidth: '180px',
                                  lineHeight: '1.2'
                                }}>
                                  {bracketMatch[1]}
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>

                        {/* 底部卡牌信息 - 相对于整个卡片容器定位 - 只有非主角牌且非关键字效果才显示 */}
                        {deckCard.card.type !== '主角牌' && deckCard.card.type !== '关键字效果' && deckCard.card.faction && (
                          <div className="absolute left-0 right-0 text-center" style={{ 
                            bottom: deckCard.card.faction.includes('中立') ? '-40px' : '-60px'
                          }}>
                            {/* 主角名字 */}
                            <div style={{ 
                              fontFamily: 'QingNiaoHuaGuangYaoTi, sans-serif',
                              fontSize: '14px',
                              color: '#FBFBFB',
                              textShadow: '0 3px 0 #282A3A, 1px 0 0 #282932, -1px 0 0 #282932, 0 1px 0 #282932, 0 -1px 0 #282932',
                              marginBottom: '-2px'
                            }}>
                              {getFactionText(deckCard.card.faction)}
                            </div>
                            
                            {/* 类别名字 */}
                            <div style={{ 
                              fontFamily: 'QingNiaoHuaGuangYaoTi, sans-serif',
                              fontSize: '12px',
                              color: '#C2B79C',
                              textShadow: '0 2px 0 #282A3A, 1px 0 0 #282932, -1px 0 0 #282932, 0 1px 0 #282932, 0 -1px 0 #282932'
                            }}>
                              {deckCard.card.category}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* 卡牌数量菱形显示 */}
                      <div className="flex items-center justify-center" style={{ marginTop: '-30px' }}>
                        {/* 左侧装饰线 */}
                        <div 
                          style={{
                            width: '30px',
                            height: '1px',
                            backgroundColor: '#C2B79C',
                            marginRight: '8px'
                          }}
                        ></div>
                        
                        {/* 菱形 */}
                        <div 
                          className="relative flex items-center justify-center"
                          style={{
                            width: '24px',
                            height: '24px',
                            backgroundColor: '#C2B79C',
                            transform: 'rotate(45deg)',
                            borderRadius: '2px'
                          }}
                        >
                          <span 
                            style={{
                              color: '#FBFBFB',
                              fontSize: '20px',
                              fontWeight: 'normal',
                              transform: 'rotate(-45deg)',
                              fontFamily: 'Zoika-2, sans-serif'
                            }}
                          >
                            {deckCard.count}
                          </span>
                        </div>
                        
                        {/* 右侧装饰线 */}
                        <div 
                          style={{
                            width: '30px',
                            height: '1px',
                            backgroundColor: '#C2B79C',
                            marginLeft: '8px'
                          }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
                </div>

                {/* 费用分布部分 */}
                <div className="w-80 flex-shrink-0">
                  <div 
                    className="p-6 rounded-lg backdrop-blur-md border border-opacity-20 border-white h-full"
                    style={{
                      background: 'linear-gradient(135deg, rgba(194, 183, 156, 0.1) 0%, rgba(251, 251, 251, 0.05) 100%)',
                      backdropFilter: 'blur(10px)',
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
                    }}
                  >
                    <h3 className="text-xl font-bold mb-3" style={{ color: '#FBFBFB', fontFamily: 'QingNiaoHuaGuangYaoTi, sans-serif' }}>
                      费用分布
                    </h3>
                    
                    {/* 装饰线 */}
                    <div className="flex items-center justify-center mb-4">
                      <div className="h-px bg-gradient-to-r from-transparent via-[#C2B79C] to-transparent w-full"></div>
                    </div>
                    
                    <div className="space-y-2">
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
                        <div key={cost} className="flex items-center justify-between">
                          <div className="flex items-center">
                            {/* 费用标签 */}
                            <div 
                              className="text-lg font-bold mr-3 flex justify-center"
                              style={{ 
                                color: '#FBFBFB',
                                fontFamily: 'Zoika-2, sans-serif',
                                width: '24px'
                              }}
                            >
                              {cost}
                            </div>
                            
                            {/* 横向柱状图 */}
                            <div 
                              className="transition-all duration-500 ease-out rounded-sm"
                              style={{
                                width: maxCount > 0 ? `${Math.max((count / maxCount) * 180, count > 0 ? 16 : 0)}px` : '0px',
                                height: '18px',
                                backgroundColor: count > 0 ? '#918273' : 'transparent',
                                boxShadow: count > 0 ? '0 2px 8px rgba(145, 130, 115, 0.3)' : 'none'
                              }}
                            />
                          </div>
                          
                          {/* 数量显示 */}
                          <div 
                            className="text-sm font-bold transition-all duration-300 ml-3 flex justify-end"
                            style={{ 
                              color: count > 0 ? '#C2B79C' : 'transparent',
                              fontFamily: 'Zoika-2, sans-serif',
                              width: '32px'
                            }}
                          >
                            {count > 0 ? count : ''}
                          </div>
                        </div>
                      ));
                    })()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 推荐理由输入弹窗 */}
      {showRecommendModal && recommendingDeck && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold" style={{ color: '#FBFBFB', fontFamily: 'QingNiaoHuaGuangYaoTi, sans-serif' }}>
                推荐卡组
              </h2>
              <button
                onClick={() => setShowRecommendModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-sm mb-2" style={{ color: '#AEAEAE' }}>
                卡组名称: <span style={{ color: '#C2B79C' }}>{recommendingDeck.name}</span>
              </p>
              <p className="text-sm mb-4" style={{ color: '#AEAEAE' }}>
                请输入推荐理由，这将显示在卡组标签旁边：
              </p>
              
              <textarea
                value={recommendReason}
                onChange={(e) => setRecommendReason(e.target.value)}
                placeholder="例如：平衡性强，适合新手学习..."
                className="w-full h-24 p-3 rounded-lg border border-opacity-30 bg-black bg-opacity-20 text-white placeholder-gray-400 resize-none focus:outline-none focus:border-opacity-60"
                style={{
                  borderColor: 'rgba(194, 183, 156, 0.3)',
                  fontFamily: 'QingNiaoHuaGuangYaoTi, sans-serif'
                }}
                maxLength={50}
              />
              <div className="text-xs mt-1" style={{ color: '#AEAEAE' }}>
                {recommendReason.length}/50 字符
              </div>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setShowRecommendModal(false)}
                className="flex-1 py-2 px-4 rounded-lg transition-all duration-300 border"
                style={{
                  backgroundColor: 'transparent',
                  color: '#AEAEAE',
                  borderColor: 'rgba(174, 174, 174, 0.3)'
                }}
              >
                取消
              </button>
              <button
                onClick={handleConfirmRecommend}
                disabled={!recommendReason.trim()}
                className="flex-1 py-2 px-4 rounded-lg transition-all duration-300"
                style={{
                  backgroundColor: recommendReason.trim() ? '#C2B79C' : 'rgba(194, 183, 156, 0.3)',
                  color: recommendReason.trim() ? '#2B2A3A' : '#AEAEAE',
                  cursor: recommendReason.trim() ? 'pointer' : 'not-allowed'
                }}
              >
                确认推荐
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 主角详情弹窗 */}
      {selectedChampion && (
        <ChampionDetailModal 
          champion={selectedChampion} 
          onClose={() => setSelectedChampion(null)}
        />
      )}

      {/* 卡牌详情弹窗 */}
      {selectedCard && (
        <CardDetailModal 
          card={selectedCard} 
          onClose={() => setSelectedCard(null)}
        />
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

// 主角详情弹窗组件
const ChampionDetailModal: React.FC<{ champion: any; onClose: () => void }> = ({ champion, onClose }) => {
  const { user } = useSelector((state: RootState) => state.auth);
  const { config } = useSelector((state: RootState) => state.config);
  const dispatch = useDispatch<AppDispatch>();
  const [isEditingStoryLink, setIsEditingStoryLink] = useState(false);
  const [storyLinkInput, setStoryLinkInput] = useState(champion.storyLink || '');

  // 保存故事链接
  const handleSaveStoryLink = async () => {
    try {
      if (!config?.factions) return;

      const updatedFactions = config.factions.map(f => 
        f.id === champion.id 
          ? { ...f, storyLink: storyLinkInput.trim() }
          : f
      );

      await api.config.updateFactions(updatedFactions);
      await dispatch(fetchConfig());
      setIsEditingStoryLink(false);
    } catch (error) {
      console.error('保存故事链接失败:', error);
      alert('保存失败，请重试');
    }
  };

  // 取消编辑
  const handleCancelEdit = () => {
    setStoryLinkInput(champion.storyLink || '');
    setIsEditingStoryLink(false);
  };

  // 打开故事链接
  const handleOpenStoryLink = () => {
    if (champion.storyLink) {
      let url = champion.storyLink.trim();
      // 如果链接不是以 http:// 或 https:// 开头，则添加 https://
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      window.open(url, '_blank');
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="relative flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
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
                {champion.name.replace(/\[.*?\]/g, '').trim()}
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
                {champion.name.includes('[') && champion.name.includes(']') 
                  ? champion.name.match(/\[(.*?)\]/)?.[1] 
                  : ''}
              </div>
            </div>

            {/* 图片显示 */}
            {champion.image && (
              <div className="text-center mb-4" style={{ marginTop: '220px' }}>
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
                      src={champion.image}
                      alt={`${champion.name} 图片`}
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
                let baseMargin = 280;
                if (champion.image) baseMargin -= 60;
                return `${Math.max(baseMargin, 40)}px`;
              })()
            }}>
              <div 
                className="text-lg leading-relaxed overflow-y-auto custom-scrollbar whitespace-pre-wrap"
                style={{ 
                  color: '#111111',
                  textShadow: '1px 1px 2px rgba(255,255,255,0.8)',
                  height: (() => {
                    let baseHeight = 153;
                    if (champion.image) baseHeight -= 60;
                    return `${Math.max(baseHeight, 60)}px`;
                  })(),
                  width: '340px',
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#918273 transparent',
                  padding: '5px'
                }}
              >
                {champion.description || '暂无详细描述'}
              </div>
            </div>
          </div>
        </div>
        
        {/* 故事链接按钮区域 */}
        <div className="mt-6 flex flex-col items-center space-y-3">
          {/* 管理员配置故事链接按钮 */}
          {user?.isAdmin && (
            <div className="flex flex-col items-center space-y-2">
              {!isEditingStoryLink ? (
                <button
                  onClick={() => setIsEditingStoryLink(true)}
                  className="px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                  style={{
                    backgroundColor: 'rgba(79, 106, 141, 0.8)',
                    color: '#FBFBFB',
                    border: '1px solid rgba(79, 106, 141, 0.6)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(79, 106, 141, 1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(79, 106, 141, 0.8)';
                  }}
                >
                  配置故事链接
                </button>
              ) : (
                <div className="flex flex-col items-center space-y-2">
                  <input
                    type="text"
                    value={storyLinkInput}
                    onChange={(e) => setStoryLinkInput(e.target.value)}
                    placeholder="输入故事链接..."
                    className="px-3 py-2 rounded border text-sm"
                    style={{
                      backgroundColor: 'rgba(0, 0, 0, 0.3)',
                      borderColor: 'rgba(79, 106, 141, 0.6)',
                      color: '#FBFBFB'
                    }}
                  />
                  <div className="flex space-x-2">
                    <button
                      onClick={handleSaveStoryLink}
                      className="px-3 py-1 rounded text-xs transition-colors"
                      style={{
                        backgroundColor: 'rgba(34, 197, 94, 0.8)',
                        color: '#FBFBFB'
                      }}
                    >
                      保存
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="px-3 py-1 rounded text-xs transition-colors"
                      style={{
                        backgroundColor: 'rgba(239, 68, 68, 0.8)',
                        color: '#FBFBFB'
                      }}
                    >
                      取消
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 查看故事链接按钮 */}
          {champion.storyLink && (
            <button
              onClick={handleOpenStoryLink}
              className="px-4 py-2 rounded-lg transition-colors text-sm font-medium"
              style={{
                backgroundColor: 'rgba(194, 183, 156, 0.8)',
                color: '#2A2A2A',
                border: '1px solid rgba(194, 183, 156, 0.6)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(194, 183, 156, 1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(194, 183, 156, 0.8)';
              }}
            >
              查看故事
            </button>
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
}> = ({ card, onClose }) => {
  const cardBackground = getCardBackground(card.type);
  const [detailTooltip, setDetailTooltip] = useState<TooltipState>({
    isVisible: false,
    content: '',
    position: { x: 0, y: 0 }
  });
  
  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
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
      <div 
        className="relative flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-center gap-8">
          {/* 卡片容器 - 和预览卡片相同的结构，放大1.7倍 */}
        <div
          className="relative rounded-xl shadow-2xl border border-opacity-20 border-white backdrop-blur-sm overflow-hidden card-detail-modal"
          style={{
            width: '490px', // 288 * 1.7
            height: '685px', // 403 * 1.7
            padding: '54px' // 32px * 1.7
          }}
        >
          {/* 关闭按钮 */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-30 hover:scale-110 transition-transform duration-200"
            style={{
              width: '24px',
              height: '24px',
              background: 'none',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            <svg 
              width="24" 
              height="24" 
              viewBox="0 0 1024 1024" 
              xmlns="http://www.w3.org/2000/svg"
              style={{
                fill: '#FBFBFB'
              }}
            >
              <path d="M589.824 501.76L998.4 93.184c20.48-20.48 20.48-54.784 0-75.264l-2.048-2.048c-20.48-20.48-54.784-20.48-75.264 0L512.512 424.96 103.936 15.36c-20.48-20.48-54.784-20.48-75.264 0l-2.56 2.56C5.12 38.4 5.12 72.192 26.112 93.184L434.688 501.76 26.112 910.336c-20.48 20.48-20.48 54.784 0 75.264l2.048 2.048c20.48 20.48 54.784 20.48 75.264 0l408.576-408.576 408.576 408.576c20.48 20.48 54.784 20.48 75.264 0l2.048-2.048c20.48-20.48 20.48-54.784 0-75.264L589.824 501.76z" />
            </svg>
          </button>
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

            {/* 详情、风味文字、创建者信息的容器 */}
            <div className="text-center overflow-y-auto" style={{ 
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
                    <div className="whitespace-pre-wrap">
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
        
        {/* 右侧风味文字区域 */}
        {card.flavor && (
          <div className="flex flex-col justify-center" style={{ width: '300px', height: '685px' }}>
            <div className="p-6" style={{ 
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              {/* 上分割线 */}
              <div style={{
                width: '100%',
                height: '1px',
                backgroundColor: '#C2B79C',
                marginBottom: '16px'
              }}></div>
              
              <div 
                className="leading-relaxed text-center whitespace-pre-wrap"
                style={{ 
                  color: '#FBFBFB', 
                  fontSize: '16px',
                  lineHeight: '1.8',
                  fontFamily: 'KaiTi, STKaiti, "华文楷体", serif'
                }}
              >
                {card.flavor || '没有风味文字'}
              </div>
              
              {/* 下分割线 */}
              <div style={{
                width: '100%',
                height: '1px',
                backgroundColor: '#C2B79C',
                marginTop: '16px'
              }}></div>
            </div>
          </div>
        )}
        </div>

      </div>
    </div>
  );
};

export default DeckBuilder;
