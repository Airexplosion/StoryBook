import React, { useState, useEffect } from 'react';
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
  const [selectedChampion, setSelectedChampion] = useState('');
  const [championDescription, setChampionDescription] = useState('');

  // 获取主角名称的辅助函数
  const getFactionText = (factionId: string) => {
    const faction = customFactions.find(f => f.id === factionId);
    return faction ? faction.name : factionId;
  };

  // 获取可用卡牌（主角卡 + 中立卡 + 选中主角的专属卡）
  const availableCards = cards.filter(card => {
    // 主角卡现在也可以加入卡组
    if (card.type === 'hero') return true;
    if (card.faction === 'neutral') return true;
    
    // 移除对selectedHero的依赖，所有卡牌都可用
    return true;
  });

  // 筛选卡牌
  const filteredCards = availableCards.filter(card => {
    if (searchTerm && !card.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (filterType !== 'all' && card.type !== filterType) return false;
    if (factionFilter !== 'all' && card.faction !== factionFilter) return false;
    return true;
  });

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
    const card = cards.find(c => c._id === cardId);
    
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
      card: cards.find(c => c._id === cardId)!,
      count
    }));
    
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
                onChange={(value) => setSelectedChampion(value)}
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
                  <div className="text-xs text-gray-400 mt-1">
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                            {card.type === 'story' ? '故事牌' : 
                             card.type === 'character' ? '配角牌' : '主角牌'} - {card.category}
                          </p>
                          <p>主角: {getFactionText(card.faction)}</p>
                          {card.type === 'character' && (
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
                    const card = cards.find(c => c._id === cardId);
                    if (!card) return null;
                    
                    return (
                      <div key={cardId} className="bg-white bg-opacity-10 rounded p-3">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-white font-semibold text-sm">{card.name}</span>
                          <span className="text-yellow-400 text-sm">{card.cost}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-300 text-xs">
                            {card.type === 'story' ? '故事' : 
                             card.type === 'character' ? '配角' : '主角'} - {card.category}
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
      </div>
    </div>
  );
};

export default DeckForm;
