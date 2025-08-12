import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { GamePlayer } from '../../types';
import SearchableSelect from '../common/SearchableSelect';

interface AdvancedAddCardProps {
  isOpen: boolean;
  onClose: () => void;
  onAddCard: (action: string, data: { card: any; quantity?: number; position?: number; zone?: string }) => void;
  currentPlayer: GamePlayer | undefined;
}

const AdvancedAddCard: React.FC<AdvancedAddCardProps> = ({
  isOpen,
  onClose,
  onAddCard,
  currentPlayer
}) => {
  const { cards } = useSelector((state: RootState) => state.cards);
  const [selectedAction, setSelectedAction] = useState<string>('');
  const [selectedCard, setSelectedCard] = useState<string>('');
  const [selectedPosition, setSelectedPosition] = useState<number>(-1);
  const [quantity, setQuantity] = useState<number>(1); // 新增数量状态
  const [selectedCards, setSelectedCards] = useState<{[key: string]: number}>({}); // 多卡牌选择状态
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState({
    type: 'all',
    faction: 'all',
    cost: 'all'
  });
  const [searchType, setSearchType] = useState('name'); // 'name' 或 'effect'

  // 重置状态
  const resetState = () => {
    setSelectedAction('');
    setSelectedCard('');
    setSelectedPosition(-1);
    setQuantity(1); // 重置数量
    setSelectedCards({}); // 重置多卡牌选择
    setSearchTerm('');
    setFilter({ type: 'all', faction: 'all', cost: 'all' });
    setSearchType('name');
  };

  // 关闭模态框时重置状态
  const handleClose = () => {
    resetState();
    onClose();
  };

  // 筛选卡牌
  const filteredCards = (cards && Array.isArray(cards) ? cards : []).filter(card => {
    // 只显示公开卡牌或用户自己的卡牌
    const hasPermission = card.isPublic || card.createdBy._id === currentPlayer?.userId;
    if (!hasPermission) return false;

    // 类型筛选
    if (filter.type !== 'all' && card.type !== filter.type) return false;
    
    // 主角筛选
    if (filter.faction !== 'all' && card.faction !== filter.faction) return false;
    
    // 费用筛选
    if (filter.cost !== 'all' && card.cost !== filter.cost) return false;
    
    // 搜索筛选
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      if (searchType === 'name') {
        if (!card.name.toLowerCase().includes(search)) return false;
      } else if (searchType === 'effect') {
        if (!card.effect.toLowerCase().includes(search)) return false;
      } else {
        // 默认搜索所有字段
        return (
          card.name.toLowerCase().includes(search) ||
          card.effect.toLowerCase().includes(search) ||
          card.createdBy.username.toLowerCase().includes(search)
        );
      }
    }

    return true;
  });

  // 获取所有可用的费用值 - 添加安全检查
  const availableCosts = Array.from(new Set((cards && Array.isArray(cards) ? cards : []).map(card => card.cost))).sort((a, b) => {
    // 数字费用排在前面，字母费用排在后面
    const aIsNumber = !isNaN(Number(a));
    const bIsNumber = !isNaN(Number(b));
    if (aIsNumber && bIsNumber) return Number(a) - Number(b);
    if (aIsNumber && !bIsNumber) return -1;
    if (!aIsNumber && bIsNumber) return 1;
    return a.localeCompare(b);
  });

  // 获取所有可用的卡牌类型
  const availableTypes = Array.from(new Set((cards && Array.isArray(cards) ? cards : []).map(card => card.type))).sort();

  // 获取所有可用的主角/阵营
  const availableFactions = Array.from(new Set((cards && Array.isArray(cards) ? cards : []).map(card => card.faction))).sort();

  // 获取可用位置数量
  const getAvailablePositions = (zone: 'battlefield' | 'effect') => {
    if (!currentPlayer) return [];
    
    const maxSlots = zone === 'battlefield' ? currentPlayer.battlefieldSlots || 5 : currentPlayer.effectSlots || 5;
    const currentZone = zone === 'battlefield' ? currentPlayer.battlefield : currentPlayer.effectZone;
    
    const positions = [];
    for (let i = 0; i < maxSlots; i++) {
      positions.push({
        index: i,
        occupied: currentZone && currentZone[i] ? true : false,
        cardName: currentZone && currentZone[i] ? currentZone[i].name : null
      });
    }
    return positions;
  };

  // 处理添加单张卡牌
  const handleAddSingleCard = (cardId: string, quantity: number) => {
    // 先从filteredCards中查找，如果找不到再从原始cards数组中查找
    // 确保类型匹配：将两边都转换为字符串进行比较
    let card = filteredCards.find(c => String(c._id) === String(cardId));
    if (!card && cards && Array.isArray(cards)) {
      card = cards.find(c => String(c._id) === String(cardId));
    }
    if (!card) {
      alert('未找到选中的卡牌');
      return;
    }

    let actionData: any = { card, quantity };

    switch (selectedAction) {
      case 'deck':
        if (selectedPosition >= 0) {
          if (selectedPosition === 0) {
            actionData.position = 'top';
          } else if (selectedPosition === 1) {
            actionData.position = 'bottom';
          } else if (selectedPosition === 2) {
            actionData.position = 'random';
          }
        } else {
          actionData.position = 'bottom';
        }
        onAddCard('add-card-to-deck-from-collection', actionData);
        break;

      case 'battlefield':
        if (selectedPosition >= 0) {
          actionData.position = selectedPosition;
          actionData.zone = 'battlefield';
        }
        onAddCard('add-card-to-battlefield', actionData);
        break;

      case 'effect':
        if (selectedPosition >= 0) {
          actionData.position = selectedPosition;
          actionData.zone = 'effect';
        }
        onAddCard('add-card-to-effect-zone', actionData);
        break;

      case 'hand':
        onAddCard('add-card-to-hand', actionData);
        break;

      case 'graveyard':
        onAddCard('add-card-to-graveyard', actionData);
        break;
    }
  };

  // 处理添加卡牌
  const handleAddCard = () => {
    const selectedCardsList = Object.entries(selectedCards).filter(([_, quantity]) => quantity > 0);
    
    if (selectedCardsList.length === 0) {
      alert('请至少选择一张卡牌');
      return;
    }

    // 检查牌桌和持续区是否只选择了一张卡牌
    if ((selectedAction === 'battlefield' || selectedAction === 'effect') && selectedCardsList.length > 1) {
      alert('牌桌和持续区只能选择一张卡牌');
      return;
    }

    // 检查牌桌和持续区是否选择了位置
    if ((selectedAction === 'battlefield' || selectedAction === 'effect') && selectedPosition < 0) {
      alert('请选择位置');
      return;
    }

    // 按顺序添加每张卡牌
    selectedCardsList.forEach(([cardId, quantity]) => {
      // 先从filteredCards中查找，如果找不到再从原始cards数组中查找
      // 确保类型匹配：将两边都转换为字符串进行比较
      let card = filteredCards.find(c => String(c._id) === String(cardId));
      if (!card && cards && Array.isArray(cards)) {
        card = cards.find(c => String(c._id) === String(cardId));
      }
      if (!card) {
        console.error('未找到卡牌:', cardId);
        return;
      }

      let actionData: any = { card, quantity };

      switch (selectedAction) {
        case 'deck':
          if (selectedPosition >= 0) {
            if (selectedPosition === 0) {
              actionData.position = 'top';
            } else if (selectedPosition === 1) {
              actionData.position = 'bottom';
            } else if (selectedPosition === 2) {
              actionData.position = 'random';
            }
          } else {
            actionData.position = 'bottom';
          }
          onAddCard('add-card-to-deck-from-collection', actionData);
          break;

        case 'battlefield':
          actionData.position = selectedPosition;
          actionData.zone = 'battlefield';
          onAddCard('add-card-to-battlefield', actionData);
          break;

        case 'effect':
          actionData.position = selectedPosition;
          actionData.zone = 'effect';
          onAddCard('add-card-to-effect-zone', actionData);
          break;

        case 'hand':
          onAddCard('add-card-to-hand', actionData);
          break;

        case 'graveyard':
          onAddCard('add-card-to-graveyard', actionData);
          break;
      }
    });

    handleClose();
  };

  // 更新选中卡牌的数量
  const updateCardQuantity = (cardId: string, change: number) => {
    setSelectedCards(prev => {
      const newQuantity = Math.max(0, (prev[cardId] || 0) + change);
      if (newQuantity === 0) {
        const { [cardId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [cardId]: newQuantity };
    });
  };

  // 检查是否有选中的卡牌
  const hasSelectedCards = Object.keys(selectedCards).length > 0 || (selectedCard && selectedCard !== 'selecting');
  const selectedCardsCount = Object.values(selectedCards).reduce((sum, count) => sum + count, 0);

  // 主角中文映射 - 动态处理未知主角
  const factionMap: { [key: string]: string } = {
    'neutral': '中立',
    'hero1': '主角1专属',
    'hero2': '主角2专属',
    'hero3': '主角3专属'
  };

  // 获取主角显示名称，如果没有映射则使用原始值
  const getFactionDisplayName = (faction: string) => {
    return factionMap[faction] || faction;
  };

  const getCardTypeText = (type: string) => {
    switch (type) {
      case 'story': return '故事牌';
      case 'character': return '配角牌';
      case 'hero': return '主角牌';
      default: return type;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-6 max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">高级添加卡牌</h2>
          <button
            onClick={handleClose}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded transition-colors"
          >
            ✕
          </button>
        </div>

        {/* 第一步：选择添加位置 */}
        {!selectedAction && (
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-white mb-4">选择添加位置</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <button
                onClick={() => setSelectedAction('deck')}
                className="bg-blue-600 hover:bg-blue-700 text-white p-6 rounded-lg transition-colors flex flex-col items-center space-y-2"
              >
                <span className="text-2xl">📚</span>
                <span className="font-semibold">添加到牌堆</span>
                <span className="text-sm text-gray-200">插入到牌堆顶部或底部</span>
              </button>

              <button
                onClick={() => setSelectedAction('battlefield')}
                className="bg-green-600 hover:bg-green-700 text-white p-6 rounded-lg transition-colors flex flex-col items-center space-y-2"
              >
                <span className="text-2xl">⚔️</span>
                <span className="font-semibold">添加到牌桌</span>
                <span className="text-sm text-gray-200">选择牌桌上的位置</span>
              </button>

              <button
                onClick={() => setSelectedAction('effect')}
                className="bg-purple-600 hover:bg-purple-700 text-white p-6 rounded-lg transition-colors flex flex-col items-center space-y-2"
              >
                <span className="text-2xl">✨</span>
                <span className="font-semibold">添加到持续区</span>
                <span className="text-sm text-gray-200">选择持续区上的位置</span>
              </button>

              <button
                onClick={() => setSelectedAction('hand')}
                className="bg-yellow-600 hover:bg-yellow-700 text-white p-6 rounded-lg transition-colors flex flex-col items-center space-y-2"
              >
                <span className="text-2xl">🤚</span>
                <span className="font-semibold">添加到手牌</span>
                <span className="text-sm text-gray-200">直接加入手牌</span>
              </button>

              <button
                onClick={() => setSelectedAction('graveyard')}
                className="bg-gray-600 hover:bg-gray-700 text-white p-6 rounded-lg transition-colors flex flex-col items-center space-y-2"
              >
                <span className="text-2xl">🪦</span>
                <span className="font-semibold">添加到弃牌堆</span>
                <span className="text-sm text-gray-200">直接加入弃牌堆</span>
              </button>
            </div>
          </div>
        )}

        {/* 第二步：选择位置（如果需要） */}
        {selectedAction && !selectedCard && (selectedAction === 'battlefield' || selectedAction === 'effect' || selectedAction === 'deck') && (
          <div className="flex-1">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">
                选择{selectedAction === 'deck' ? '插入位置' : selectedAction === 'battlefield' ? '牌桌位置' : '持续区位置'}
              </h3>
              <button
                onClick={() => setSelectedAction('')}
                className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm"
              >
                返回
              </button>
            </div>

            {selectedAction === 'deck' && (
              <div className="grid grid-cols-3 gap-4 mb-6">
                <button
                  onClick={() => setSelectedPosition(0)}
                  className={`p-4 rounded-lg border-2 transition-colors ${
                    selectedPosition === 0
                      ? 'bg-blue-600 border-blue-400 text-white'
                      : 'bg-white bg-opacity-10 border-gray-500 text-gray-300 hover:bg-opacity-20'
                  }`}
                >
                  <div className="text-lg font-semibold">牌堆顶部</div>
                  <div className="text-sm">下次抽卡时会抽到</div>
                </button>
                <button
                  onClick={() => setSelectedPosition(1)}
                  className={`p-4 rounded-lg border-2 transition-colors ${
                    selectedPosition === 1
                      ? 'bg-blue-600 border-blue-400 text-white'
                      : 'bg-white bg-opacity-10 border-gray-500 text-gray-300 hover:bg-opacity-20'
                  }`}
                >
                  <div className="text-lg font-semibold">牌堆底部</div>
                  <div className="text-sm">最后才会抽到</div>
                </button>
                <button
                  onClick={() => setSelectedPosition(2)}
                  className={`p-4 rounded-lg border-2 transition-colors ${
                    selectedPosition === 2
                      ? 'bg-blue-600 border-blue-400 text-white'
                      : 'bg-white bg-opacity-10 border-gray-500 text-gray-300 hover:bg-opacity-20'
                  }`}
                >
                  <div className="text-lg font-semibold">随机位置</div>
                  <div className="text-sm">随机插入到牌堆中</div>
                </button>
              </div>
            )}

            {(selectedAction === 'battlefield' || selectedAction === 'effect') && (
              <div className="mb-6">
                <div className="grid grid-cols-5 gap-2">
                  {getAvailablePositions(selectedAction as 'battlefield' | 'effect').map((pos) => (
                    <button
                      key={pos.index}
                      onClick={() => setSelectedPosition(pos.index)}
                      disabled={pos.occupied}
                      className={`aspect-square border-2 rounded-lg flex flex-col items-center justify-center text-sm font-semibold transition-all ${
                        pos.occupied
                          ? 'bg-gray-600 border-gray-500 text-gray-400 cursor-not-allowed'
                          : selectedPosition === pos.index
                          ? 'bg-blue-600 border-blue-400 text-white'
                          : 'bg-white bg-opacity-10 border-gray-500 text-gray-300 hover:bg-opacity-20'
                      }`}
                    >
                      <div>位置 {pos.index + 1}</div>
                      {pos.occupied && (
                        <div className="text-xs mt-1 text-center">
                          {pos.cardName?.slice(0, 6)}...
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  if (selectedAction === 'deck' || selectedPosition >= 0) {
                    // 跳过位置选择，直接进入卡牌选择
                    setSelectedCard('selecting');
                  }
                }}
                disabled={selectedAction !== 'deck' && selectedPosition < 0}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white py-2 px-4 rounded transition-colors"
              >
                下一步：选择卡牌
              </button>
            </div>
          </div>
        )}

        {/* 第三步：选择卡牌 */}
        {(selectedCard || (selectedAction && (selectedAction === 'hand' || selectedAction === 'graveyard'))) && (
            <div className="flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">选择卡牌</h3>
              <button
                onClick={() => {
                  if (selectedAction === 'hand' || selectedAction === 'graveyard') {
                    setSelectedAction('');
                  } else {
                    setSelectedCard('');
                    setSelectedPosition(-1);
                  }
                }}
                className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm"
              >
                返回
              </button>
            </div>


            {/* 搜索和筛选 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="搜索卡牌..."
                className="px-3 py-2 bg-white bg-opacity-10 border border-gray-500 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <SearchableSelect
                options={[
                  { value: 'all', label: '全部类型' },
                  ...availableTypes.map(type => ({ 
                    value: type, 
                    label: getCardTypeText(type) 
                  }))
                ]}
                value={filter.type}
                onChange={(value) => setFilter({ ...filter, type: value })}
                placeholder="选择卡牌类型..."
              />

              <SearchableSelect
                options={[
                  { value: 'all', label: '全部主角' },
                  ...availableFactions.map(faction => ({ 
                    value: faction, 
                    label: factionMap[faction] || faction 
                  }))
                ]}
                value={filter.faction}
                onChange={(value) => setFilter({ ...filter, faction: value })}
                placeholder="选择卡牌主角..."
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
              <SearchableSelect
                options={[
                  { value: 'all', label: '全部费用' },
                  ...availableCosts.map(cost => ({ value: cost, label: cost }))
                ]}
                value={filter.cost}
                onChange={(value) => setFilter({ ...filter, cost: value })}
                placeholder="选择费用..."
              />

              <SearchableSelect
                options={[
                  { value: 'name', label: '搜索卡牌名称' },
                  { value: 'effect', label: '搜索卡牌效果' }
                ]}
                value={searchType}
                onChange={(value) => setSearchType(value)}
                placeholder="选择搜索类型..."
              />
            </div>

            {/* 卡牌数量显示 */}
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-300 text-sm">
                找到 {filteredCards.length} 张卡牌
              </span>
              {selectedCard && selectedCard !== 'selecting' && (
                <span className="text-green-400 text-sm">
                  ✓ 已选择卡牌
                </span>
              )}
            </div>

            {/* 卡牌列表 */}
            <div className="flex-1 overflow-y-auto max-h-96 border border-gray-600 rounded-lg p-4 bg-white bg-opacity-5">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCards.map((card) => {
                  const cardQuantity = selectedCards[card._id] || 0;
                  const isSelected = cardQuantity > 0;
                  
                  return (
                    <div
                      key={card._id}
                      className={`relative cursor-pointer rounded-lg p-4 border-2 transition-all ${
                        isSelected
                          ? 'bg-blue-600 bg-opacity-50 border-blue-400'
                          : 'bg-white bg-opacity-10 border-gray-500 hover:bg-opacity-20'
                      }`}
                    >
                      {/* 数量控制按钮 - 调整位置到卡牌底部居中 */}
                      <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex items-center space-x-1 bg-black bg-opacity-70 rounded-full p-1 z-10">
                        <button
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            updateCardQuantity(card._id, -1);
                          }}
                          className="bg-red-600 hover:bg-red-700 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold"
                        >
                          -
                        </button>
                        <span className="text-white font-bold text-sm min-w-[20px] text-center">{cardQuantity}</span>
                        <button
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            updateCardQuantity(card._id, 1);
                          }}
                          className="bg-green-600 hover:bg-green-700 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold"
                        >
                          +
                        </button>
                      </div>

                      <div className="flex justify-between items-start mb-2">
                        <h4 className="text-white font-semibold">{card.name}</h4>
                        <span className="bg-yellow-600 text-white px-2 py-1 rounded text-sm">
                          {card.cost}
                        </span>
                      </div>

                      <div className="text-sm text-gray-300 mb-2">
                        <div>{getCardTypeText(card.type)} · {card.category}</div>
                        <div>{getFactionDisplayName(card.faction)}</div>
                        {card.type === '配角牌' && (
                          <div className="text-red-400">
                            攻击: {card.attack} / 生命: {card.health}
                          </div>
                        )}
                      </div>

                      <div className="text-gray-200 text-sm bg-green-600 bg-opacity-20 p-2 rounded mb-2">
                        <div className="font-semibold text-green-400 mb-1">效果:</div>
                        <div className="break-words">{card.effect}</div>
                      </div>

                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-400">
                          创建者: {card.createdBy.username}
                        </span>
                        <span className={`px-2 py-1 rounded ${
                          card.isPublic ? 'bg-green-600 text-white' : 'bg-yellow-600 text-white'
                        }`}>
                          {card.isPublic ? '公开' : '私有'}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {filteredCards.length === 0 && (
                  <div className="text-center py-8">
                    <div className="text-gray-400 text-lg">没有找到匹配的卡牌</div>
                    <div className="text-gray-500 text-sm mt-2">尝试调整搜索条件</div>
                  </div>
                )}
              </div>
            </div>

            {/* 确认按钮 */}
            <div className="flex space-x-3 mt-4">
              <button
                onClick={handleClose}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleAddCard}
                disabled={Object.keys(selectedCards).length === 0}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white py-2 px-4 rounded transition-colors"
              >
                确认添加{selectedCardsCount > 0 && `(${selectedCardsCount}张)`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdvancedAddCard;
