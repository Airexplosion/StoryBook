import React, { useState, useEffect, useMemo } from 'react';
import { Card, Deck, DeckCard } from '../../types';
import SearchableSelect from '../common/SearchableSelect';
import api from '../../services/api';
import { keywords, formatEffectText, TooltipState } from '../../utils/keywords';

interface DeckFormProps {
  deck?: Deck;
  cards: Card[];
  customFactions: Array<{ id: string; name: string; description?: string }>;
  customTypes: Array<{ id: string; name: string }>;
  customCategories: any;
  onSubmit: (deckData: { 
    name: string; 
    cards: DeckCard[]; 
    isPublic: boolean;
    championCardId?: string;
    championDescription?: string;
  }) => void;
  onCancel: () => void;
}

const DeckForm: React.FC<DeckFormProps> = ({ 
  deck, 
  cards, 
  customFactions, 
  customTypes, 
  customCategories, 
  onSubmit, 
  onCancel 
}) => {
  const [deckName, setDeckName] = useState('');
  const [selectedCards, setSelectedCards] = useState<Map<string, number>>(new Map());
  const [isPublic, setIsPublic] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [factionFilter, setFactionFilter] = useState('all');
  const [costFilter, setCostFilter] = useState('all');
  const [searchType, setSearchType] = useState('name');
  const [selectedChampion, setSelectedChampion] = useState('');
  const [championDescription, setChampionDescription] = useState('');
  const [viewingCardId, setViewingCardId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [jumpToPage, setJumpToPage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // 筛选下拉菜单状态
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showFactionDropdown, setShowFactionDropdown] = useState(false);
  const [showCostDropdown, setShowCostDropdown] = useState(false);
  const [showSearchTypeDropdown, setShowSearchTypeDropdown] = useState(false);
  const [showChampionDropdown, setShowChampionDropdown] = useState(false);
  const [championSearchTerm, setChampionSearchTerm] = useState('');
  
  // 筛选器展开状态
  const [showFilters, setShowFilters] = useState(false);
  
  // 费用分布显示状态
  const [showCostDistribution, setShowCostDistribution] = useState(false);

  const CARDS_PER_PAGE = 30;

  // 获取卡牌类型文本的辅助函数
  const getCardTypeText = (type: string) => {
    switch (type) {
      case 'story': return '故事牌';
      case 'character': return '配角牌';
      case 'hero': return '主角牌';
      default: return type;
    }
  };

  // 获取卡牌背景图片的辅助函数
  const getCardBackground = (cardType: string) => {
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

  // 获取主角名称的辅助函数
  const getFactionText = (factionId: string) => {
    const faction = customFactions.find(f => f.id === factionId);
    return faction ? faction.name : factionId;
  };

  // 获取可用卡牌（所有卡牌都可用）
  const availableCards = useMemo(() => {
    if (!Array.isArray(cards) || cards.length === 0) {
      return [];
    }
    return cards;
  }, [cards]);

  // 筛选卡牌
  const filteredCards = useMemo(() => {
    const filtered = availableCards.filter(card => {
      if (filterType !== 'all' && card.type !== filterType) return false;
      if (factionFilter !== 'all' && card.faction !== factionFilter) return false;
      if (costFilter !== 'all' && card.cost !== costFilter) return false;
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        if (searchType === 'name') {
          if (!card.name.toLowerCase().includes(searchLower)) return false;
        } else if (searchType === 'effect') {
          if (!card.effect.toLowerCase().includes(searchLower)) return false;
        }
      }
      return true;
    });
    
    // 重置到第一页当筛选条件改变时
    if (currentPage > Math.ceil(filtered.length / CARDS_PER_PAGE)) {
      setCurrentPage(1);
    }
    
    return filtered;
  }, [availableCards, filterType, factionFilter, costFilter, searchTerm, searchType, currentPage]);

  // 分页卡牌
  const paginatedCards = useMemo(() => {
    const startIndex = (currentPage - 1) * CARDS_PER_PAGE;
    const endIndex = startIndex + CARDS_PER_PAGE;
    return filteredCards.slice(startIndex, endIndex);
  }, [filteredCards, currentPage]);

  const totalPages = Math.ceil(filteredCards.length / CARDS_PER_PAGE);

  // 获取所有可用的费用值
  const availableCosts = useMemo(() => {
    return Array.from(new Set(availableCards.map(card => card.cost))).sort((a, b) => {
      const aIsNumber = !isNaN(Number(a));
      const bIsNumber = !isNaN(Number(b));
      if (aIsNumber && bIsNumber) return Number(a) - Number(b);
      if (aIsNumber && !bIsNumber) return -1;
      if (!aIsNumber && bIsNumber) return 1;
      return a.localeCompare(b);
    });
  }, [availableCards]);

  useEffect(() => {
    // 防止频闪，确保组件完全挂载后再显示
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (deck) {
      setDeckName(deck.name);
      setIsPublic(deck.isPublic);
      
      if (deck.championCardId) {
        setSelectedChampion(deck.championCardId);
      }
      if (deck.championDescription) {
        setChampionDescription(deck.championDescription);
      }
      
      const cardMap = new Map<string, number>();
      if (deck.heroCard) {
        cardMap.set(deck.heroCard._id, 1);
      }
      deck.cards.forEach(deckCard => {
        cardMap.set(deckCard.card._id, deckCard.count);
      });
      setSelectedCards(cardMap);
    }
  }, [deck]);

  const getTotalCards = () => {
    return Array.from(selectedCards.values()).reduce((sum, count) => sum + count, 0);
  };

  const addCard = (cardId: string) => {
    const currentCount = selectedCards.get(cardId) || 0;
    const newMap = new Map(selectedCards);
    newMap.set(cardId, currentCount + 1);
    setSelectedCards(newMap);
  };

  const removeCard = (cardId: string) => {
    const currentCount = selectedCards.get(cardId) || 0;
    if (currentCount <= 0) return;
    
    const newMap = new Map(selectedCards);
    if (currentCount === 1) {
      newMap.delete(cardId);
    } else {
      newMap.set(cardId, currentCount - 1);
    }
    setSelectedCards(newMap);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!deckName.trim()) {
      alert('请输入卡组名称');
      return;
    }
    
    if (!selectedChampion) {
      alert('请选择主角');
      return;
    }
    
    const deckCards: DeckCard[] = Array.from(selectedCards.entries()).map(([cardId, count]) => ({
      card: Array.isArray(cards) ? cards.find(c => c._id === cardId)! : null!,
      count
    })).filter(deckCard => deckCard.card !== null);
    
    const championFaction = selectedChampion ? customFactions.find(f => f.id === selectedChampion) : null;
    
    onSubmit({
      name: deckName.trim(),
      cards: deckCards,
      isPublic,
      championCardId: selectedChampion || undefined,
      championDescription: championDescription.trim() || 
        (championFaction ? championFaction.description : undefined)
    });
  };


  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
        <div 
          className="rounded-2xl shadow-2xl p-8 flex items-center justify-center" 
          style={{ backgroundColor: '#3F3832', width: '300px', height: '200px' }}
        >
          <div style={{ color: '#FBFBFB', fontSize: '18px' }}>加载中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div 
        className="rounded-2xl shadow-2xl p-8 max-w-full w-[98vw] h-[95vh] flex flex-col relative" 
        style={{ backgroundColor: '#3F3832' }}
      >
        {/* 关闭按钮 */}
        <button
          onClick={onCancel}
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
        <div className="flex flex-col items-center mb-4">
          <h2 className="text-3xl font-bold mb-1" style={{ color: '#FBFBFB', fontFamily: 'QingNiaoHuaGuangYaoTi, sans-serif' }}>
            {deck ? '编辑卡组' : '构建卡组'}
          </h2>
        </div>

        {/* 带星星的分割线 */}
        <div className="flex items-center justify-center mb-0">
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

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-visible">
          {/* 主体布局：左边卡牌选择，右边基本信息+已选卡牌 */}
          <div className="flex-1 grid grid-cols-3 gap-6 overflow-visible">
            {/* 左侧：卡牌选择区域 */}
            <div className="col-span-2 flex flex-col" style={{ minHeight: '650px' }}>
              {/* 筛选器展开按钮 */}
              <div className="mb-4 flex justify-between items-center relative">
                <button
                  type="button"
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center px-3 py-1.5 rounded-lg transition-colors text-sm"
                  style={{ backgroundColor: '#918273', color: '#FBFBFB' }}
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" className="mr-2" fill="currentColor">
                    <path d="M6 10.5a.5.5 0 01.5-.5h3a.5.5 0 010 1h-3a.5.5 0 01-.5-.5zM2 6.5a.5.5 0 01.5-.5h11a.5.5 0 010 1h-11a.5.5 0 01-.5-.5zM4 3.5a.5.5 0 01.5-.5h7a.5.5 0 010 1h-7a.5.5 0 01-.5-.5z"/>
                  </svg>
                  <span className="text-xs">{showFilters ? '收起筛选' : '展开筛选'}</span>
                  <svg width="10" height="10" viewBox="0 0 12 12" className="ml-2" fill="currentColor">
                    <path d={showFilters ? "M6 3L1 8h10L6 3z" : "M6 9L1 4h10L6 9z"}/>
                  </svg>
                </button>
                <div className="text-gray-400 text-xs">
                  共 {filteredCards.length} 张卡牌
                </div>
              </div>

              {/* 卡牌网格 */}
              <div 
                className="flex-1 overflow-y-auto p-4 rounded-lg custom-scrollbar relative"
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.1)',
                  maxHeight: 'calc(100vh - 350px)', // 调整为更精确的高度
                  minHeight: '500px', // 增加最小高度
                  overflowY: 'auto', // 确保垂直滚动
                  scrollBehavior: 'smooth' // 平滑滚动
                }}
              >
                {/* 筛选器覆盖层 - 移动到卡牌网格上方 */}
                {showFilters && (
                  <div 
                    className="absolute inset-0 z-[60] p-4 rounded-lg border overflow-y-auto"
                    style={{ 
                      backgroundColor: 'rgba(63, 56, 50, 0.98)',
                      backdropFilter: 'blur(15px)',
                      borderColor: '#918273',
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
                    }}
                  >
                    {/* 关闭按钮 */}
                    <div className="flex justify-end mb-2">
                      <button
                        type="button"
                        onClick={() => setShowFilters(false)}
                        className="p-1 rounded hover:bg-gray-600 transition-colors"
                        style={{ color: '#AEAEAE' }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                      </button>
                    </div>

                    {/* 搜索框 */}
                    <div className="mb-4">
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
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
                              {filterType === 'all' ? '全部类型' : 
                               customTypes.find(type => type.id === filterType)?.name || '全部类型'}
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
                                  setFilterType('all');
                                  setShowTypeDropdown(false);
                                }}
                                className="w-full text-left px-3 py-2 text-white hover:bg-gray-600"
                              >
                                全部类型
                              </button>
                              {customTypes.map(type => (
                                <button
                                  key={type.id}
                                  onClick={() => {
                                    setFilterType(type.id);
                                    setShowTypeDropdown(false);
                                  }}
                                  className="w-full text-left px-3 py-2 text-white hover:bg-gray-600"
                                >
                                  {type.name}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* 主角筛选 */}
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
                              {factionFilter === 'all' ? '全部主角' : 
                               customFactions.find(faction => faction.id === factionFilter)?.name || '全部主角'}
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
                                  setFactionFilter('all');
                                  setShowFactionDropdown(false);
                                }}
                                className="w-full text-left px-3 py-2 text-white hover:bg-gray-600"
                              >
                                全部主角
                              </button>
                              {customFactions.map(faction => (
                                <button
                                  key={faction.id}
                                  onClick={() => {
                                    setFactionFilter(faction.id);
                                    setShowFactionDropdown(false);
                                  }}
                                  className="w-full text-left px-3 py-2 text-white hover:bg-gray-600"
                                >
                                  {faction.name}
                                </button>
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
                              {costFilter === 'all' ? '全部费用' : `费用${costFilter}`}
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
                                  setCostFilter('all');
                                  setShowCostDropdown(false);
                                }}
                                className="w-full text-left px-3 py-2 text-white hover:bg-gray-600"
                              >
                                全部费用
                              </button>
                              {availableCosts.map(cost => (
                                <button
                                  key={cost}
                                  onClick={() => {
                                    setCostFilter(cost);
                                    setShowCostDropdown(false);
                                  }}
                                  className="w-full text-left px-3 py-2 text-white hover:bg-gray-600"
                                >
                                  费用{cost}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 右侧搜索类型筛选器 */}
                      <div className="relative" style={{ minWidth: '150px' }}>
                        <button
                          onClick={() => setShowSearchTypeDropdown(!showSearchTypeDropdown)}
                          className="w-full px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-between"
                          style={{ 
                            backgroundColor: '#3F3832',
                            border: '1px solid #C2B79C'
                          }}
                        >
                          <span>
                            {searchType === 'all' && '全部搜索'}
                            {searchType === 'name' && '按名称搜索'}
                            {searchType === 'effect' && '按效果搜索'}
                          </span>
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                            <path d="M6 9L1 4h10L6 9z"/>
                          </svg>
                        </button>
                        
                        {showSearchTypeDropdown && (
                          <div 
                            className="absolute top-full left-0 right-0 border border-gray-500 z-50"
                            style={{ backgroundColor: '#414141' }}
                          >
                            <button
                              onClick={() => {
                                setSearchType('all');
                                setShowSearchTypeDropdown(false);
                              }}
                              className="w-full text-left px-3 py-2 text-white hover:bg-gray-600"
                            >
                              全部搜索
                            </button>
                            <button
                              onClick={() => {
                                setSearchType('name');
                                setShowSearchTypeDropdown(false);
                              }}
                              className="w-full text-left px-3 py-2 text-white hover:bg-gray-600"
                            >
                              按名称搜索
                            </button>
                            <button
                              onClick={() => {
                                setSearchType('effect');
                                setShowSearchTypeDropdown(false);
                              }}
                              className="w-full text-left px-3 py-2 text-white hover:bg-gray-600"
                            >
                              按效果搜索
                            </button>
                          </div>
                        )}
                      </div>

                      {/* 重置筛选按钮 */}
                      <button
                        type="button"
                        onClick={() => {
                          setFilterType('all');
                          setFactionFilter('all');
                          setCostFilter('all');
                          setSearchTerm('');
                          setSearchType('all');
                          setCurrentPage(1);
                        }}
                        className="px-2 py-1 rounded transition-colors text-xs"
                        style={{ backgroundColor: '#666666', color: '#FBFBFB', minWidth: '70px' }}
                      >
                        重置筛选
                      </button>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 md:grid-cols-3 justify-items-center gap-[10px]" style={{ marginTop: '-10px' }}>
                  {paginatedCards.map(card => {
                    const count = selectedCards.get(card._id) || 0;

                    return (
                      <div key={card._id} className="relative" style={{marginBottom: '-30px', transform: 'scale(0.8)' }}>
                        <CardPreview
                          card={card}
                          onClick={() => setViewingCardId(card._id)}
                          customFactions={customFactions}
                          getCardBackground={getCardBackground}
                          getCardTypeText={getCardTypeText}
                          getFactionText={getFactionText}
                        />

                        {/* 钻石形数量控制框 */}
                        <div className="absolute -bottom-14 left-1/2 transform -translate-x-1/2">
                          <div className="relative flex items-center justify-center">
                            {/* 减号按钮 - 左侧 */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (count > 0) {
                                  const newCards = new Map(selectedCards);
                                  if (count === 1) {
                                    newCards.delete(card._id);
                                  } else {
                                    newCards.set(card._id, count - 1);
                                  }
                                  setSelectedCards(newCards);
                                }
                              }}
                              className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold hover:bg-gray-600 transition-colors mr-2"
                              style={{ 
                                backgroundColor: '#918273',
                                fontSize: '14px'
                              }}
                            >
                              -
                            </button>
                            
                            {/* 钻石背景和数字 */}
                            <div className="relative">
                              <div
                                className="transform rotate-45 shadow-md"
                                style={{
                                  width: '40px',
                                  height: '40px',
                                  backgroundColor: '#3F3832',
                                  border: '2px solid #C2B79C'
                                }}
                              ></div>
                              {/* 数字 - 绝对定位在钻石中心 */}
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span
                                  className="font-bold text-white"
                                  style={{ fontSize: '16px', textAlign: 'center' }}
                                >
                                  {count}
                                </span>
                              </div>
                            </div>
                            
                            {/* 加号按钮 - 右侧 */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const newCards = new Map(selectedCards);
                                newCards.set(card._id, count + 1);
                                setSelectedCards(newCards);
                              }}
                              className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold hover:bg-gray-600 transition-colors ml-2"
                              style={{ 
                                backgroundColor: '#C2B79C',
                                fontSize: '14px'
                              }}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {/* 分页控件 */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mb-3 px-4 py-2 rounded-lg" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}>
                  <div style={{ color: '#AEAEAE', fontSize: '12px' }}>
                    共 {filteredCards.length} 张卡牌，第 {currentPage} / {totalPages} 页
                  </div>
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="px-2 py-1 rounded text-xs transition-colors"
                      style={{
                        backgroundColor: currentPage === 1 ? '#666666' : '#C2B79C',
                        color: '#FBFBFB'
                      }}
                    >
                      上一页
                    </button>
                    <span className="px-2 py-1 text-xs" style={{ color: '#FBFBFB' }}>
                      {currentPage}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="px-2 py-1 rounded text-xs transition-colors"
                      style={{
                        backgroundColor: currentPage === totalPages ? '#666666' : '#C2B79C',
                        color: '#FBFBFB'
                      }}
                    >
                      下一页
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 右侧：基本信息+已选卡牌区域 */}
            <div className="col-span-1 flex flex-col overflow-hidden">
              {/* 基本信息 */}
              <div className="mb-4">
                {/* 卡组名称 */}
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2" style={{ color: '#AEAEAE' }}>
                    卡组名称 <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={deckName}
                    onChange={(e) => setDeckName(e.target.value)}
                    className="w-full px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.1)', 
                      border: '1px solid rgba(174, 174, 174, 0.5)', 
                      color: '#FBFBFB',
                      borderRadius: '8px'
                    }}
                    placeholder="请输入卡组名称"
                    required
                  />
                </div>
                
                {/* 主角选择 */}
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2" style={{ color: '#AEAEAE' }}>
                    主角 <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <button
                      onClick={() => setShowChampionDropdown(!showChampionDropdown)}
                      className="w-full px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-between"
                      style={{ 
                        backgroundColor: '#3F3832',
                        border: '1px solid #C2B79C'
                      }}
                    >
                      <span>
                        {selectedChampion ? 
                         customFactions.find(faction => faction.id === selectedChampion)?.name || '请选择主角' : 
                         '请选择主角'}
                      </span>
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                        <path d="M6 9L1 4h10L6 9z"/>
                      </svg>
                    </button>
                    
                    {showChampionDropdown && (
                      <div 
                        className="absolute top-full left-0 right-0 border border-gray-500 z-50 overflow-y-auto"
                        style={{ backgroundColor: '#414141', maxHeight: '400px' }}
                      >
                        {/* 搜索框 */}
                        <div className="p-2 border-b border-gray-500">
                          <input
                            type="text"
                            value={championSearchTerm}
                            onChange={(e) => setChampionSearchTerm(e.target.value)}
                            className="w-full px-2 py-1 bg-gray-700 text-white border border-gray-600 rounded focus:outline-none focus:border-blue-500"
                            placeholder="搜索主角..."
                            autoFocus
                          />
                        </div>
                        
                        <button
                          onClick={() => {
                            setSelectedChampion('');
                            setChampionDescription('');
                            setShowChampionDropdown(false);
                            setChampionSearchTerm('');
                          }}
                          className="w-full text-left px-3 py-2 text-white hover:bg-gray-600"
                        >
                          请选择主角
                        </button>
                        {customFactions
                          .filter(faction => 
                            championSearchTerm === '' || 
                            faction.name.toLowerCase().includes(championSearchTerm.toLowerCase())
                          )
                          .map(faction => (
                          <button
                            key={faction.id}
                            onClick={() => {
                              setSelectedChampion(faction.id);
                              if (faction.description) {
                                setChampionDescription(faction.description);
                              } else {
                                setChampionDescription('');
                              }
                              setShowChampionDropdown(false);
                              setChampionSearchTerm('');
                            }}
                            className="w-full text-left px-3 py-2 text-white hover:bg-gray-600"
                          >
                            {faction.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* 主角描述 */}
                {selectedChampion && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2" style={{ color: '#AEAEAE' }}>
                      主角效果描述 <span style={{ color: '#918273' }}>(可选)</span>
                    </label>
                    <textarea
                      value={championDescription}
                      onChange={(e) => setChampionDescription(e.target.value)}
                      className="w-full px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      style={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.1)', 
                        border: '1px solid rgba(174, 174, 174, 0.5)', 
                        color: '#FBFBFB',
                        borderRadius: '8px'
                      }}
                      placeholder="输入主角的效果描述或修改默认效果..."
                      rows={3}
                    />
                    {(() => {
                      const championFaction = customFactions.find(f => f.id === selectedChampion);
                      return championFaction && championFaction.description && (
                        <div className="text-xs mt-1 whitespace-pre-wrap" style={{ color: '#918273' }}>
                          默认效果: {championFaction.description}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* 已选卡牌区域 */}
              <div className="flex flex-col overflow-hidden flex-1 relative">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold" style={{ color: '#FBFBFB', fontFamily: 'QingNiaoHuaGuangYaoTi, sans-serif' }}>
                    已选卡牌 ({Array.from(selectedCards.entries()).length}种)
                  </h3>
                  {Array.from(selectedCards.entries()).length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowCostDistribution(!showCostDistribution)}
                      className="flex items-center px-3 py-1.5 rounded-lg transition-colors text-sm"
                      style={{ backgroundColor: '#918273', color: '#FBFBFB' }}
                    >
                      <svg width="14" height="14" viewBox="0 0 16 16" className="mr-2" fill="currentColor">
                        <path d="M3 3a1 1 0 000 2h10a1 1 0 100-2H3zM3 7a1 1 0 000 2h10a1 1 0 100-2H3zM3 11a1 1 0 100 2h4a1 1 0 100-2H3z"/>
                      </svg>
                      <span className="text-xs">{showCostDistribution ? '隐藏分布' : '费用分布'}</span>
                    </button>
                  )}
                </div>
                
                {/* 提示文字 */}
                <p className="text-xs mb-4" style={{ color: '#918273' }}>
                  牌堆通常为40张（可超出但建议遵循）
                </p>
                
                {/* 费用分布显示 */}
                {showCostDistribution && Array.from(selectedCards.entries()).length > 0 && (
                  <div 
                    className="absolute inset-0 z-50 p-4 rounded-lg backdrop-blur-md border border-opacity-20 border-white"
                    style={{ 
                      background: 'linear-gradient(135deg, rgba(194, 183, 156, 0.1) 0%, rgba(251, 251, 251, 0.05) 100%)',
                      backdropFilter: 'blur(10px)',
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
                    }}
                  >
                    <div className="flex justify-end mb-2">
                      <button
                        type="button"
                        onClick={() => setShowCostDistribution(false)}
                        className="p-1 rounded hover:bg-gray-600 transition-colors"
                        style={{ color: '#AEAEAE' }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                      {(() => {
                        // 计算各个费用的卡牌数量
                        const costDistribution: { [key: string]: number } = { '0': 0, '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6': 0, '7': 0, '8': 0, '9': 0, 'X': 0 };
                        Array.from(selectedCards.entries()).forEach(([cardId, count]) => {
                          const card = availableCards.find(c => c._id === cardId);
                          if (card) {
                            const cost = card.cost;
                            if (costDistribution.hasOwnProperty(cost)) {
                              costDistribution[cost] += count;
                            }
                          }
                        });
                        
                        // 找到最大值用于计算比例
                        const maxCount = Math.max(...Object.values(costDistribution));
                        
                        return Object.entries(costDistribution).map(([cost, count]) => (
                          <div key={cost} className="flex items-center justify-between">
                            <div className="flex items-center">
                              {/* 费用标签 */}
                              <div 
                                className="text-sm font-bold mr-2 flex justify-center"
                                style={{ 
                                  color: '#FBFBFB',
                                  fontFamily: 'Zoika-2, sans-serif',
                                  width: '16px'
                                }}
                              >
                                {cost}
                              </div>
                              
                              {/* 横向柱状图 */}
                              <div 
                                className="transition-all duration-500 ease-out rounded-sm"
                                style={{
                                  width: maxCount > 0 ? `${Math.max((count / maxCount) * 80, count > 0 ? 8 : 0)}px` : '0px',
                                  height: '12px',
                                  backgroundColor: count > 0 ? '#918273' : 'transparent',
                                  boxShadow: count > 0 ? '0 2px 8px rgba(145, 130, 115, 0.3)' : 'none'
                                }}
                              />
                            </div>
                            
                            {/* 数量显示 */}
                            <div 
                              className="text-xs font-bold transition-all duration-300 ml-2 flex justify-end"
                              style={{ 
                                color: count > 0 ? '#C2B79C' : 'transparent',
                                fontFamily: 'Zoika-2, sans-serif',
                                width: '20px'
                              }}
                            >
                              {count > 0 ? count : ''}
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                )}
                
                {/* 已选卡牌列表 */}
                <div className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(0, 0, 0, 0.1)', height: 'auto' }}>
                  {Array.from(selectedCards.entries()).length === 0 ? (
                    <div className="text-center py-8" style={{ color: '#AEAEAE' }}>
                      还没有选择任何卡牌
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {Array.from(selectedCards.entries()).map(([cardId, count]) => {
                        const card = availableCards.find(c => c._id === cardId);
                        if (!card) return null;
                        
                        return (
                          <div key={cardId} className="flex items-center justify-between p-2 rounded" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}>
                            <div className="flex-1">
                              <div className="text-sm font-medium" style={{ color: '#FBFBFB' }}>
                                {card.name}
                              </div>
                              <div className="text-xs" style={{ color: '#AEAEAE' }}>
                                费用{card.cost} · {card.type}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm" style={{ color: '#FBFBFB' }}>
                                ×{count}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  const newCards = new Map(selectedCards);
                                  newCards.delete(cardId);
                                  setSelectedCards(newCards);
                                }}
                                className="p-1 rounded hover:bg-gray-600 transition-colors"
                                style={{ color: '#AEAEAE' }}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                </svg>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 底部操作栏 */}
          <div className="-mt-4 mr-4 mb-2 flex justify-end items-center">
            {/* 公开选择和创建卡组按钮组合 */}
            <div className="flex items-center space-x-4">
              <label className="flex items-center" style={{ color: '#AEAEAE' }}>
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="mr-2"
                />
                公开卡组
              </label>
              
              {/* 创建卡组按钮 */}
              <button
                type="submit"
                disabled={!selectedChampion}
                className="py-3 px-6 rounded transition-colors"
                style={{ 
                  backgroundColor: selectedChampion ? '#C2B79C' : '#666666', 
                  color: '#FBFBFB' 
                }}
              >
                {deck ? '更新卡组' : '创建卡组'}
              </button>
            </div>
          </div>
        </form>

        {/* 卡牌详情模态框 */}
        {viewingCardId && (() => {
          const card = Array.isArray(cards) ? cards.find(c => c._id === viewingCardId) : null;
          if (!card) return null;
          
          return (
            <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[60] p-4">
              <div 
                className="rounded-xl p-6 max-w-md w-full"
                style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(10px)' }}
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold" style={{ color: '#FBFBFB' }}>{card.name}</h3>
                  <button
                    onClick={() => setViewingCardId(null)}
                    className="px-3 py-1 rounded transition-colors text-sm"
                    style={{ backgroundColor: '#666666', color: '#FBFBFB' }}
                  >
                    关闭
                  </button>
                </div>
                
                <div className="rounded-lg p-4 border-2" style={{
                  backgroundColor: card.type === '故事牌' ? 'rgba(79, 106, 141, 0.3)' :
                                  card.type === '配角牌' ? 'rgba(194, 183, 156, 0.3)' : 
                                  'rgba(145, 130, 115, 0.3)',
                  borderColor: card.type === '故事牌' ? '#4F6A8D' :
                               card.type === '配角牌' ? '#C2B79C' : 
                               '#918273'
                }}>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-semibold text-lg" style={{ color: '#FBFBFB' }}>{card.name}</h4>
                                              <p className="text-sm" style={{ color: '#AEAEAE' }}>
                          {card.type === '故事牌' ? '📜 故事牌' : 
                           card.type === '配角牌' ? '👥 配角牌' : '⭐ 主角牌'} - {card.category}
                      </p>
                    </div>
                    <span className="font-bold text-xl" style={{ color: '#C2B79C' }}>{card.cost}</span>
                  </div>
                  
                  <div className="text-sm mb-3" style={{ color: '#AEAEAE' }}>
                    <p><strong>主角:</strong> {getFactionText(card.faction)}</p>
                                          {card.type === '配角牌' && (
                      <p><strong>攻击/生命:</strong> <span style={{ color: '#ff6b6b' }}>{card.attack}</span>/<span style={{ color: '#51cf66' }}>{card.health}</span></p>
                    )}
                  </div>
                  
                  <div className="border-t pt-3" style={{ borderColor: '#666666' }}>
                    <p className="text-sm font-semibold mb-2" style={{ color: '#C2B79C' }}>效果:</p>
                    <p className="text-sm whitespace-pre-wrap" style={{ color: '#FBFBFB' }}>{card.effect}</p>
                  </div>
                  
                  {selectedCards.has(card._id) && (
                    <div className="border-t pt-3 mt-3" style={{ borderColor: '#666666' }}>
                      <p className="text-sm" style={{ color: '#4F6A8D' }}>
                        卡组中数量: <span className="font-bold">{selectedCards.get(card._id)}张</span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};


// 卡牌预览组件
const CardPreview: React.FC<{
  card: Card;
  onClick: () => void;
  customFactions: Array<{ id: string; name: string; description?: string }>;
  getCardBackground: (cardType: string) => string;
  getCardTypeText: (type: string) => string;
  getFactionText: (factionId: string) => string;
}> = ({ card, onClick, customFactions, getCardBackground, getCardTypeText, getFactionText }) => {
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
              if (type === '故事牌' || type === '关键字效果') {
                displayText = card.category || (type === '关键字效果' ? '关键字' : '故事');
              } else {
                switch (type) {
                  case 'character': displayText = '配角'; break;
                  case 'hero': displayText = '主角'; break;
                  case '配角牌': displayText = '配角'; break;
                  case '主角牌': displayText = '主角'; break;
                  default: displayText = type.replace('Card', '');
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
              {formatEffectText(card.effect, undefined)}
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


export default DeckForm;
