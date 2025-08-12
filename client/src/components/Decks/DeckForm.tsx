import React, { useState, useEffect, useMemo } from 'react';
import { Card, Deck, DeckCard } from '../../types';
import SearchableSelect from '../common/SearchableSelect';
import api from '../../services/api';

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
  const [factionFilter, setFactionFilter] = useState('all'); // 新增主角筛选状态
  const [costFilter, setCostFilter] = useState('all'); // 新增费用筛选状态
  const [searchType, setSearchType] = useState('name'); // 新增搜索类型状态
  const [selectedChampion, setSelectedChampion] = useState('');
  const [championDescription, setChampionDescription] = useState('');
  const [viewingCardId, setViewingCardId] = useState<string | null>(null);

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
    
    // 直接返回所有卡牌，不进行任何筛选
    return cards;
  }, [cards]);

  // 筛选卡牌
  const filteredCards = useMemo(() => {
    return availableCards.filter(card => {
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
  }, [availableCards, filterType, factionFilter, costFilter, searchTerm, searchType]);

  // 获取所有可用的费用值
  const availableCosts = useMemo(() => {
    return Array.from(new Set(availableCards.map(card => card.cost))).sort((a, b) => {
      // 数字费用排在前面，字母费用排在后面
      const aIsNumber = !isNaN(Number(a));
      const bIsNumber = !isNaN(Number(b));
      if (aIsNumber && bIsNumber) return Number(a) - Number(b);
      if (aIsNumber && !bIsNumber) return -1;
      if (!aIsNumber && bIsNumber) return 1;
      return a.localeCompare(b);
    });
  }, [availableCards]);

  useEffect(() => {
    if (deck) {
      setDeckName(deck.name);
      setIsPublic(deck.isPublic);
      
      // 初始化主战者信息
      if (deck.championCardId) {
        setSelectedChampion(deck.championCardId);
      }
      if (deck.championDescription) {
        setChampionDescription(deck.championDescription);
      }
      
      const cardMap = new Map<string, number>();
      // 将deck.heroCard也添加到selectedCards中
      if (deck.heroCard) { // 检查heroCard是否存在
        cardMap.set(deck.heroCard._id, 1); // Assuming heroCard is always 1 for existing decks
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
    const card = Array.isArray(cards) ? cards.find(c => c._id === cardId) : null;
    
    if (!card) return;
    
    // 检查数量限制
    // 移除卡牌数量限制，只做文字提醒
    // const maxCount = card.type === 'hero' ? 1 : 3;
    // if (currentCount >= maxCount) return;
    
    // 移除总卡牌数限制
    // if (getTotalCards() >= 40) return;
    
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-8 max-w-6xl w-full h-full max-h-screen overflow-hidden flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">
            {deck ? '编辑卡组' : '构建卡组'}
          </h2>
          <button
            onClick={onCancel}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded transition-colors"
          >
            取消
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          {/* 基本信息 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                卡组名称 <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={deckName}
                onChange={(e) => setDeckName(e.target.value)}
                className="w-full px-3 py-2 bg-white bg-opacity-10 border border-gray-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="请输入卡组名称"
                required
              />
            </div>

            {/* 移除主角卡选择框，主角卡现在可以像普通卡一样添加 */}
            {/* <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                主角卡 <span className="text-red-400">*</span>
              </label>
              <select
                value={selectedHero}
                onChange={(e) => setSelectedHero(e.target.value)}
                className="w-full px-3 py-2 bg-white bg-opacity-10 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">请选择主角卡</option>
                {heroCards.map(hero => (
                  <option key={hero._id} value={hero._id}>
                    {hero.name} ({hero.faction})
                  </option>
                ))}
              </select>
            </div> */}
            
            {/* 主角选择 */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                主角 <span className="text-gray-500">(选择卡组主角)</span>
              </label>
              <SearchableSelect
                options={[
                  { value: '', label: '选择主角' },
                  ...customFactions.map(faction => ({ value: faction.id, label: faction.name }))
                ]}
                value={selectedChampion}
                onChange={(value) => {
                  setSelectedChampion(value);
                  const championFaction = customFactions.find(f => f.id === value);
                  if (championFaction && championFaction.description) {
                    setChampionDescription(championFaction.description);
                  } else {
                    setChampionDescription('');
                  }
                }}
                placeholder="选择主角..."
                className="w-full"
              />
            </div>

            <div className="flex items-center space-x-4">
              <label className="flex items-center text-gray-300">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="mr-2"
                />
                公开卡组
              </label>
              <div className="text-white font-semibold">
                卡牌数: {getTotalCards()}
              </div>
              <p className="text-xs text-gray-400 mt-1">牌堆可携带卡牌总数为40张（虽然你可以超出这个数字，但通常对局规则下请遵循此规则）</p>
            </div>
          </div>
          
          {/* 主角描述 */}
          {selectedChampion && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                主角效果描述 <span className="text-gray-500">(可选，不填写则使用卡牌默认效果)</span>
              </label>
              <textarea
                value={championDescription}
                onChange={(e) => setChampionDescription(e.target.value)}
                className="w-full px-3 py-2 bg-white bg-opacity-10 border border-gray-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="输入主角的效果描述或修改默认效果..."
                rows={3}
              />
              {(() => {
                const championFaction = customFactions.find(f => f.id === selectedChampion);
                return championFaction && championFaction.description && (
                  <div className="text-xs text-gray-400 mt-1 whitespace-pre-wrap">
                    默认效果: {championFaction.description}
                  </div>
                );
              })()}
            </div>
          )}

          <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden">
            {/* 卡牌选择区域 */}
            <div className="lg:col-span-2 flex flex-col overflow-hidden">
              <div className="mb-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full px-3 py-2 bg-white bg-opacity-10 border border-gray-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="搜索卡牌..."
                    />
                  </div>
                  <div>
                    <SearchableSelect
                      options={[
                        { value: 'all', label: '全部类型' },
                        ...customTypes.map(type => ({ value: type.id, label: type.name }))
                      ]}
                      value={filterType}
                      onChange={(value) => setFilterType(value)}
                      placeholder="选择卡牌类型..."
                      className="w-full"
                    />
                  </div>
                  <div>
                    <SearchableSelect
                      options={[
                        { value: 'all', label: '全部主角' },
                        ...customFactions.map(faction => ({ value: faction.id, label: faction.name }))
                      ]}
                      value={factionFilter}
                      onChange={(value) => setFactionFilter(value)}
                      placeholder="选择卡牌主角..."
                      className="w-full"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <SearchableSelect
                      options={[
                        { value: 'all', label: '全部费用' },
                        ...availableCosts.map(cost => ({ value: cost, label: cost }))
                      ]}
                      value={costFilter}
                      onChange={(value) => setCostFilter(value)}
                      placeholder="选择费用..."
                      className="w-full"
                    />
                  </div>
                  <div>
                    <SearchableSelect
                      options={[
                        { value: 'name', label: '搜索卡牌名称' },
                        { value: 'effect', label: '搜索卡牌效果' }
                      ]}
                      value={searchType}
                      onChange={(value) => setSearchType(value)}
                      placeholder="选择搜索类型..."
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredCards.map(card => {
                    const count = selectedCards.get(card._id) || 0;
                    // const maxCount = card.type === 'hero' ? 1 : 3; // 移除硬性限制
                    
                    return (
                      <div key={card._id} className="bg-white bg-opacity-10 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold text-white">{card.name}</h4>
                          <span className="text-yellow-400 font-bold">{card.cost}</span>
                        </div>
                        
                        <div className="text-sm text-gray-300 mb-2">
                          <p>
                            {card.type === '故事牌' ? '故事牌' : 
                             card.type === '配角牌' ? '配角牌' : '主角牌'} - {card.category}
                          </p>
                          <p>主角: {getFactionText(card.faction)}</p>
                          {card.type === '配角牌' && (
                            <p>攻击/生命: {card.attack}/{card.health}</p>
                          )}
                          <p className="text-green-400 text-xs">{card.effect}</p>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <button
                              type="button"
                              onClick={() => removeCard(card._id)}
                              disabled={count === 0}
                              className="w-8 h-8 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded transition-colors"
                            >
                              -
                            </button>
                            <span className="text-white font-semibold w-8 text-center">{count}</span>
                            <button
                              type="button"
                              onClick={() => addCard(card._id)}
                              // 移除数量限制，只做文字提醒
                              // disabled={count >= maxCount || getTotalCards() >= 40}
                              className="w-8 h-8 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded transition-colors"
                            >
                              +
                            </button>
                          </div>
                          <span className="text-xs text-gray-400">同名卡通常限制3张，主角通常1张</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 已选卡牌区域 */}
            <div className="flex flex-col overflow-hidden">
              <h3 className="text-lg font-semibold text-white mb-4">
                已选卡牌 ({Array.from(selectedCards.entries()).length}种)
              </h3>
              
              <div className="flex-1 overflow-y-auto">
                <div className="space-y-2">
                  {Array.from(selectedCards.entries()).map(([cardId, count]) => {
                    const card = Array.isArray(cards) ? cards.find(c => c._id === cardId) : null;
                    if (!card) return null;
                    
                    return (
                      <div key={cardId} className="bg-white bg-opacity-10 rounded p-3">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-white font-semibold text-sm">{card.name}</span>
                          <span className="text-yellow-400 text-sm">{card.cost}</span>
                        </div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-gray-300 text-xs">
                            {card.type === '故事牌' ? '故事' : 
                             card.type === '配角牌' ? '配角' : '主角'} - {card.category}
                          </span>
                          <button
                            type="button"
                            onClick={() => setViewingCardId(cardId)}
                            className="text-blue-400 hover:text-blue-300 text-xs underline"
                          >
                            查看详情
                          </button>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400 text-xs">
                            主角: {getFactionText(card.faction)}
                          </span>
                          <div className="flex items-center space-x-1">
                            <button
                              type="button"
                              onClick={() => removeCard(cardId)}
                              className="w-6 h-6 bg-red-600 hover:bg-red-700 text-white rounded text-xs transition-colors"
                            >
                              -
                            </button>
                            <span className="text-white text-sm w-6 text-center">{count}</span>
                            <button
                              type="button"
                              onClick={() => addCard(cardId)}
                              // 移除数量限制
                              // disabled={count >= (card.type === 'hero' ? 1 : 3) || getTotalCards() >= 40}
                              className="w-6 h-6 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded text-xs transition-colors"
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

              {/* 费用分布图 - 小版本 */}
              {Array.from(selectedCards.entries()).length > 0 && (
                <div className="mt-4 bg-white bg-opacity-10 rounded-lg p-3">
                  <h4 className="text-sm font-semibold text-white mb-2">📊 费用分布</h4>
                  <div className="flex items-end justify-between space-x-1 h-16">
                    {(() => {
                      // 计算各个费用的卡牌数量，包含0-9, 10, 10+, X
                      const costDistribution: { [key: string]: number } = { 
                        '0': 0, '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6': 0, '7': 0, '8': 0, '9': 0, '10': 0, '10+': 0, 'X': 0 
                      };
                      
                      Array.from(selectedCards.entries()).forEach(([cardId, count]) => {
                        const card = Array.isArray(cards) ? cards.find(c => c._id === cardId) : null;
                        if (!card) return;
                        
                        const cost = card.cost;
                        if (cost === 'X') {
                          costDistribution['X'] += count;
                        } else {
                          const numericCost = parseInt(cost);
                          if (!isNaN(numericCost)) {
                            if (numericCost <= 9) {
                              costDistribution[cost] += count;
                            } else if (numericCost === 10) {
                              costDistribution['10'] += count;
                            } else {
                              costDistribution['10+'] += count;
                            }
                          }
                        }
                      });
                      
                      // 找到最大值用于计算比例
                      const maxCount = Math.max(...Object.values(costDistribution));
                      
                      return Object.entries(costDistribution).map(([cost, count]) => (
                        <div key={cost} className="flex flex-col items-center flex-1">
                          <div className="text-xs text-white font-semibold mb-1" style={{ minHeight: '14px' }}>
                            {count > 0 ? count : ''}
                          </div>
                          <div 
                            className="bg-gradient-to-t from-blue-500 to-purple-500 w-full rounded-t transition-all duration-300"
                            style={{ 
                              height: maxCount > 0 ? `${Math.max((count / maxCount) * 40, count > 0 ? 4 : 0)}px` : '0px',
                              minWidth: '8px'
                            }}
                          />
                          <div className="text-xs text-gray-300 mt-1" style={{ fontSize: '10px' }}>{cost}</div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 flex space-x-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-3 px-4 rounded transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              // 移除40张卡牌的硬性限制
              // disabled={getTotalCards() !== 40}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white py-3 px-4 rounded transition-colors"
            >
              {deck ? '更新卡组' : '创建卡组'}
            </button>
          </div>
        </form>

        {/* 卡牌详情模态框 */}
        {viewingCardId && (() => {
          const card = Array.isArray(cards) ? cards.find(c => c._id === viewingCardId) : null;
          if (!card) return null;
          
          return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
              <div className="bg-white bg-opacity-15 backdrop-blur-md rounded-xl p-6 max-w-md w-full">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-white">{card.name}</h3>
                  <button
                    onClick={() => setViewingCardId(null)}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded transition-colors text-sm"
                  >
                    关闭
                  </button>
                </div>
                
                <div className={`rounded-lg p-4 border-2 ${
                  card.type === '故事牌' ? 'bg-gradient-to-br from-blue-800 to-blue-900 border-blue-500' :
                  card.type === '配角牌' ? 'bg-gradient-to-br from-green-800 to-green-900 border-green-500' : 
                  'bg-gradient-to-br from-purple-800 to-purple-900 border-purple-500'
                }`}>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-semibold text-white text-lg">{card.name}</h4>
                      <p className="text-sm text-gray-300">
                        {card.type === '故事牌' ? '📜 故事牌' : 
                         card.type === '配角牌' ? '👥 配角牌' : '⭐ 主角牌'} - {card.category}
                      </p>
                    </div>
                    <span className="text-yellow-400 font-bold text-xl">{card.cost}</span>
                  </div>
                  
                  <div className="text-sm text-gray-300 mb-3">
                    <p><strong>主角:</strong> {getFactionText(card.faction)}</p>
                    {card.type === '配角牌' && (
                      <p><strong>攻击/生命:</strong> <span className="text-red-400">{card.attack}</span>/<span className="text-green-400">{card.health}</span></p>
                    )}
                  </div>
                  
                  <div className="border-t border-gray-600 pt-3">
                    <p className="text-green-400 text-sm font-semibold mb-2">效果:</p>
                    <p className="text-white text-sm whitespace-pre-wrap">{card.effect}</p>
                  </div>
                  
                  {selectedCards.has(card._id) && (
                    <div className="border-t border-gray-600 pt-3 mt-3">
                      <p className="text-blue-400 text-sm">
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

export default DeckForm;
