import React, { useState } from 'react';
import { GameState, Card, ModifiedCard } from '../../types';
import { useColor } from '../../contexts/ColorContext';
import { getDynamicClassName } from '../../utils/colorUtils';
import AdvancedAddCard from './AdvancedAddCard';

interface GameBoardProps {
  gameState: GameState;
  currentUserId?: string;
  onGameAction: (action: string, data?: any) => void;
  deckSearchResults?: Card[];
}

const GameBoard: React.FC<GameBoardProps> = ({ gameState, currentUserId, onGameAction, deckSearchResults = [] }) => {
  const { playerColorClasses, opponentColorClasses } = useColor();
  
  // 检查是否为观战模式
  const isSpectator = !gameState.players.some(p => p.userId === currentUserId);
  
  let currentPlayer: any, opponent: any;
  
  if (isSpectator) {
    // 观战模式：显示所有玩家信息
    currentPlayer = gameState.players[0]; // 第一个玩家作为"当前玩家"显示
    opponent = gameState.players[1]; // 第二个玩家作为"对手"显示
  } else {
    // 正常游戏模式
    currentPlayer = gameState.players.find(p => p.userId === currentUserId);
    opponent = gameState.players.find(p => p.userId !== currentUserId);
  }
  
  const [showGraveyardModal, setShowGraveyardModal] = useState(false);
  const [showAdvancedAddCardModal, setShowAdvancedAddCardModal] = useState(false);
  const [showModifyCardModal, setShowModifyCardModal] = useState(false);
  const [showCardDetailModal, setShowCardDetailModal] = useState(false);
  const [viewingCard, setViewingCard] = useState<Card | null>(null);
  const [modifyingCard, setModifyingCard] = useState<{ card: ModifiedCard; index: number; zone: 'battlefield' | 'effect' } | null>(null);
  const [showPositionSelection, setShowPositionSelection] = useState(false);
  const [pendingCardPlay, setPendingCardPlay] = useState<{ card: Card; handIndex: number; zone: 'battlefield' | 'effect' } | null>(null);
  const [showSearchDeckModal, setShowSearchDeckModal] = useState(false);
  const [deckSearchKeyword, setDeckSearchKeyword] = useState(''); // 新增：牌堆搜索关键词
  const [showHandCardCostModal, setShowHandCardCostModal] = useState(false);
  const [modifyingHandCard, setModifyingHandCard] = useState<{ card: Card; index: number } | null>(null);
  const [showCardNoteModal, setShowCardNoteModal] = useState(false);
  const [editingCardNote, setEditingCardNote] = useState<{ card: ModifiedCard; index: number; zone: 'battlefield' | 'effect' | 'graveyard' | 'hand' | 'deck' } | null>(null);
  const [cardNoteText, setCardNoteText] = useState('');
  const [selectedHandCards, setSelectedHandCards] = useState<number[]>([]); // 新增：选中的手牌索引
  const [showMultiSelectModal, setShowMultiSelectModal] = useState(false); // 新增：多选模态框
  const [showBulkDiscardModal, setShowBulkDiscardModal] = useState(false); // 新增：批量弃牌模态框
  const [showBulkModifyCostModal, setShowBulkModifyCostModal] = useState(false); // 新增：批量修改费用模态框
  const [bulkCostChange, setBulkCostChange] = useState(''); // 新增：批量费用修改值
  
  // 直接使用服务器的空位数量，确保同步
  const currentBattlefieldSlots = currentPlayer?.battlefieldSlots ?? 5;
  const currentEffectSlots = currentPlayer?.effectSlots ?? 5;
  const opponentBattlefieldSlots = opponent?.battlefieldSlots ?? 5;
  const opponentEffectSlots = opponent?.effectSlots ?? 5;
  
  // 移除重复的调试日志以减少控制台输出
  const [newCardData, setNewCardData] = useState<Partial<Card>>({
    name: '',
    type: '故事牌',
    cost: '1',
    attack: 0,
    health: 0,
    effect: '',
    category: '普通',
    faction: 'neutral',
    isPublic: false,
  });

  // 主角中文映射
  const factionMap: { [key: string]: string } = {
    'neutral': '中立',
  };

  const handleCardPlay = (card: Card, handIndex: number, zone: 'battlefield' | 'effect') => {
    // 检查费用
    if (currentPlayer && card.cost !== 'X') {
      const cardCost = parseInt(card.cost);
      if (currentPlayer.mana < cardCost) {
        alert(`费用不足！需要 ${cardCost} 点费用，当前只有 ${currentPlayer.mana} 点。`);
        return;
      }
    }
    
    // 检查区域是否有空位
    const targetZone = zone === 'battlefield' ? currentPlayer?.battlefield : currentPlayer?.effectZone;
    const maxSlots = zone === 'battlefield' ? currentBattlefieldSlots : currentEffectSlots;
    
    // 正确检查空位：计算非null的卡牌数量，而不是数组长度
    const occupiedSlots = targetZone ? targetZone.filter((card: any) => card !== null).length : 0;
    
    if (occupiedSlots >= maxSlots) {
      alert(`${zone === 'battlefield' ? '牌桌' : '效果'}区域已满！`);
      return;
    }
    
    // 如果区域有空位，显示位置选择
    setPendingCardPlay({ card, handIndex, zone });
    setShowPositionSelection(true);
  };

  const handlePositionSelect = (position: number) => {
    if (pendingCardPlay) {
      onGameAction('play-card', { 
        card: pendingCardPlay.card, 
        handIndex: pendingCardPlay.handIndex, 
        zone: pendingCardPlay.zone,
        position 
      });
      setPendingCardPlay(null);
      setShowPositionSelection(false);
    }
  };

  const handleCardDiscard = (card: Card, handIndex: number) => {
    onGameAction('discard-card', { card, handIndex });
  };

  const handleDrawCard = () => {
    onGameAction('draw-card');
  };

  const handleShuffle = () => {
    onGameAction('shuffle-deck');
  };

  const handleAddCardToDeck = () => {
    if (newCardData.name && newCardData.type && newCardData.cost) {
      onGameAction('add-card-to-deck', { cardData: newCardData });
      setNewCardData({
        name: '',
        type: '故事牌',
        cost: '1',
        attack: 0,
        health: 0,
        effect: '',
        category: '普通',
        faction: 'neutral',
        isPublic: false,
      });
      setShowAdvancedAddCardModal(false);
    } else {
      alert('请填写卡牌名称、类型和费用。');
    }
  };

  const handleSearchDeck = () => {
    onGameAction('search-deck');
    setShowSearchDeckModal(true);
  };

  const handleDrawSpecificCard = (card: Card, deckIndex: number) => {
    onGameAction('draw-specific-card', { card, deckIndex });
    setShowSearchDeckModal(false);
  };

  const handleReturnToDeck = (card: Card, handIndex: number, position: 'top' | 'bottom') => {
    onGameAction('return-to-deck', { card, handIndex, position });
  };

  const handleReturnFromGraveyard = (card: Card, graveyardIndex: number) => {
    onGameAction('return-from-graveyard', { card, graveyardIndex });
  };

  const handleRemoveCard = (card: Card, handIndex: number) => {
    if (window.confirm(`确定要从本局游戏中完全移除 "${card.name}" 吗？此操作不可撤销。`)) {
      onGameAction('remove-card', { card, handIndex });
    }
  };

  const handleBattlefieldSlotsChange = (newSlots: number) => {
    // 直接同步到服务器，不更新本地状态
    onGameAction('update-slots', { 
      zone: 'battlefield', 
      slots: newSlots 
    });
  };

  const handleEffectSlotsChange = (newSlots: number) => {
    // 直接同步到服务器，不更新本地状态
    onGameAction('update-slots', { 
      zone: 'effect', 
      slots: newSlots 
    });
  };

  const handleModifyCard = (card: ModifiedCard, index: number, zone: 'battlefield' | 'effect', newAttack: number, newHealth: number) => {
    onGameAction('modify-card-stats', { 
      cardIndex: index, 
      zone, 
      newAttack, 
      newHealth,
      originalAttack: card.originalAttack || card.attack,
      originalHealth: card.originalHealth || card.health
    });
    setShowModifyCardModal(false);
    setModifyingCard(null);
  };

  const openModifyModal = (card: ModifiedCard, index: number, zone: 'battlefield' | 'effect') => {
    setModifyingCard({ card, index, zone });
    setShowModifyCardModal(true);
  };

  const openCardDetailModal = (card: Card) => {
    setViewingCard(card);
    setShowCardDetailModal(true);
  };

  const openCardNoteModal = (card: ModifiedCard, index: number, zone: 'battlefield' | 'effect' | 'graveyard' | 'hand' | 'deck') => {
    setEditingCardNote({ card, index, zone });
    setCardNoteText(card.cardNote || '');
    setShowCardNoteModal(true);
  };

  const handleSaveCardNote = () => {
    if (editingCardNote) {
      // 为特定区域和位置的卡牌添加备注，每张卡牌实例独立备注
      onGameAction('update-card-note', {
        cardIndex: editingCardNote.index,
        zone: editingCardNote.zone,
        note: cardNoteText
      });
      setShowCardNoteModal(false);
      setEditingCardNote(null);
      setCardNoteText('');
    }
  };

  // 处理手牌选择/取择
  const handleToggleHandCardSelection = (index: number) => {
    setSelectedHandCards(prevSelected => {
      if (prevSelected.includes(index)) {
        return prevSelected.filter(i => i !== index);
      } else {
        return [...prevSelected, index];
      }
    });
  };

  // 批量弃牌
  const handleBulkHandDiscard = () => {
    if (selectedHandCards.length === 0) {
      alert('请选择至少一张手牌进行批量弃牌。');
      return;
    }
    if (window.confirm(`确定要弃掉选中的 ${selectedHandCards.length} 张手牌吗？`)) {
      // 从后往前删除，避免索引变化问题
      const sortedIndices = selectedHandCards.sort((a, b) => b - a);
      sortedIndices.forEach(index => {
        const card = currentPlayer?.hand[index];
        if (card) {
          onGameAction('discard-card', { card, handIndex: index });
        }
      });
      setSelectedHandCards([]);
    }
  };

  // 批量修改手牌费用
  const handleBulkHandModifyCost = () => {
    if (selectedHandCards.length === 0) {
      alert('请选择至少一张手牌进行批量修改费用。');
      return;
    }
    const costChange = prompt(`请输入费用修改值 (例如: -1, +2):`);
    if (costChange === null || isNaN(parseInt(costChange))) {
      alert('请输入有效的数字。');
      return;
    }
    const parsedCostChange = parseInt(costChange);
    if (window.confirm(`确定要将选中的 ${selectedHandCards.length} 张手牌费用修改 ${parsedCostChange} 吗？`)) {
      selectedHandCards.forEach(index => {
        const card = currentPlayer?.hand[index];
        if (card) {
          const currentCost = parseInt(card.cost) || 0;
          const newCost = Math.max(0, currentCost + parsedCostChange);
          onGameAction('modify-hand-card-cost', { handIndex: index, newCost: newCost.toString() });
        }
      });
      setSelectedHandCards([]);
    }
  };

  const renderCard = (card: ModifiedCard | null, isHandCard: boolean = false, index?: number, isOpponentCard: boolean = false, zone?: 'battlefield' | 'effect') => {
    if (!card) return null;
    
    const displayAttack = card.modifiedAttack !== undefined ? card.modifiedAttack : (card.attack !== undefined ? card.attack : '?');
    const displayHealth = card.modifiedHealth !== undefined ? card.modifiedHealth : (card.health !== undefined ? card.health : '?');
    const hasModification = card.modifiedAttack !== undefined || card.modifiedHealth !== undefined;

    // 检查卡牌是否被展示
    let isDisplayed = false;
    if (isHandCard) {
      if (isOpponentCard) {
        // 检查对手的展示手牌
        isDisplayed = opponent?.displayedHandCards?.some((displayedCard: Card) => displayedCard._id === card._id) || false;
      } else {
        // 检查当前玩家的展示手牌
        isDisplayed = currentPlayer?.displayedHandCards?.some((displayedCard: Card) => displayedCard._id === card._id) || false;
      }
    }

    // 动态获取卡牌颜色类
    let cardColorClass = '';
    let cardBgStyle = {};
    let cardBorderStyle = {};

    if (isHandCard) {
      if (playerColorClasses.customStyleFull && typeof playerColorClasses.customStyleFull === 'object') {
        cardBgStyle = { background: `linear-gradient(to bottom, ${playerColorClasses.customStyleFull.backgroundColor} 60%, ${playerColorClasses.customStyleFull.backgroundColor}CC)` };
        cardBorderStyle = { borderColor: playerColorClasses.customStyleFull.backgroundColor };
      } else {
        cardColorClass = `bg-gradient-to-b from-blue-600 to-blue-800 border-blue-400`;
      }
    } else if (isOpponentCard) {
      if (opponentColorClasses.customStyleFull && typeof opponentColorClasses.customStyleFull === 'object') {
        cardBgStyle = { backgroundColor: opponentColorClasses.customStyleFull.backgroundColor + 'B3' }; // 70% opacity
        cardBorderStyle = { borderColor: opponentColorClasses.customStyleFull.backgroundColor + '66' }; // 40% opacity
      } else {
        cardColorClass = `${opponentColorClasses.cardBg} ${opponentColorClasses.cardBorder}`;
      }
    } else if (card.type === '配角牌') {
      if (playerColorClasses.customStyleFull && typeof playerColorClasses.customStyleFull === 'object') {
        cardBgStyle = { backgroundColor: playerColorClasses.customStyleFull.backgroundColor + 'B3' }; // 70% opacity
        cardBorderStyle = { borderColor: playerColorClasses.customStyleFull.backgroundColor + '66' }; // 40% opacity
      } else {
        cardColorClass = `${playerColorClasses.cardBg} ${playerColorClasses.cardBorder}`;
      }
    } else {
      cardColorClass = 'bg-purple-600 bg-opacity-70 border-purple-400';
    }

    // 如果卡牌被展示，添加高亮效果
    const displayHighlight = isDisplayed ? 'ring-2 ring-yellow-400 ring-opacity-75 shadow-lg shadow-yellow-400/50' : '';

    return (
      <div 
        key={card._id || index} 
        className={`group relative rounded-lg p-2 text-white text-xs shadow-md border ${cardColorClass} ${hasModification ? 'ring-1 ring-yellow-300' : ''} ${displayHighlight} ${isHandCard ? 'w-20 h-28' : ''}`}
        style={cardColorClass === '' ? { ...cardBgStyle, ...cardBorderStyle } : {}}
      >
        {/* 展示标识 */}
        {isDisplayed && (
          <div className="absolute -top-1 -right-1 bg-yellow-400 text-black text-xs px-1 py-0.5 rounded-full font-bold z-10">
            展示
          </div>
        )}
        <div className="font-semibold text-center mb-1">{card.name}</div>
        <div className="text-center text-xs mb-1">费用: {card.cost}</div>
        {card.type === '配角牌' && (
          <div className="text-center text-xs">
            <span className={hasModification ? 'text-yellow-300' : ''}>
              攻: {displayAttack} / 生命: {displayHealth}
            </span>
            {hasModification && (
              <div className="text-gray-300 text-xs">
                (原: {card.originalAttack || card.attack}/{card.originalHealth || card.health})
              </div>
            )}
          </div>
        )}
        <div className="text-xs text-center mt-1 truncate">{card.effect || '无效果'}</div>

        {/* 手牌上的按钮 - 直接显示在卡牌上 */}
        {isHandCard && !isSpectator && (
          <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center space-y-1 z-[9999]">
            <button
              onClick={(e) => { 
                e.stopPropagation(); 
                handleCardPlay(card, index!, 'battlefield'); 
              }}
              className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs"
            >
              牌桌
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleCardPlay(card, index!, 'effect'); }}
              className="bg-purple-600 hover:bg-purple-700 text-white px-2 py-1 rounded text-xs"
            >
              效果区
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleCardDiscard(card, index!); }}
              className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs"
            >
              弃牌
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleRemoveCard(card, index!); }}
              className="bg-red-800 hover:bg-red-900 text-white px-2 py-1 rounded text-xs"
              title="从本局游戏中完全移除"
            >
              删除
            </button>
            <div className="flex space-x-1">
              <button
                onClick={(e) => { e.stopPropagation(); handleReturnToDeck(card, index!, 'top'); }}
                className="bg-gray-600 hover:bg-gray-700 text-white px-1 py-1 rounded text-xs"
                title="返回牌堆顶"
              >
                顶部
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleReturnToDeck(card, index!, 'bottom'); }}
                className="bg-gray-500 hover:bg-gray-600 text-white px-1 py-1 rounded text-xs"
                title="返回牌堆底"
              >
                底部
              </button>
            </div>
            <div className="flex space-x-1">
              <button
                onClick={(e) => { 
                  e.stopPropagation(); 
                  openCardDetailModal(card);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-1 py-1 rounded text-xs"
              >
                查看
              </button>
              <button
                onClick={(e) => { 
                  e.stopPropagation(); 
                  openCardNoteModal(card, index!, 'hand');
                }}
                className="bg-purple-600 hover:bg-purple-700 text-white px-1 py-1 rounded text-xs"
                title="添加/编辑备注"
              >
                备注
              </button>
            </div>
          </div>
        )}

        {/* 观战模式下手牌只显示查看按钮 */}
        {isHandCard && isSpectator && (
          <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-[9999]">
            <button
              onClick={(e) => { 
                e.stopPropagation(); 
                openCardDetailModal(card);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs"
            >
              查看
            </button>
          </div>
        )}

        {/* 牌桌区域和效果区域的按钮 */}
        {!isHandCard && !isOpponentCard && !isSpectator && (
          <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-wrap items-center justify-center gap-1 p-1">
            <button
              onClick={(e) => { 
                e.stopPropagation(); 
                openCardDetailModal(card);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-1 py-1 rounded text-xs"
            >
              查看
            </button>
            {card.type === '配角牌' && zone && (
              <button
                onClick={() => openModifyModal(card, index!, zone)}
                className="bg-yellow-600 hover:bg-yellow-700 text-white px-1 py-1 rounded text-xs"
              >
                修改
              </button>
            )}
            <button
              onClick={() => openCardNoteModal(card, index!, zone!)}
              className="bg-purple-600 hover:bg-purple-700 text-white px-1 py-1 rounded text-xs"
              title="添加/编辑备注"
            >
              备注
            </button>
            <button
              onClick={() => onGameAction('discard-from-field', { cardIndex: index, zone })}
              className="bg-red-600 hover:bg-red-700 text-white px-1 py-1 rounded text-xs"
            >
              弃牌
            </button>
            <button
              onClick={() => onGameAction('return-card-from-field', { cardIndex: index, zone })}
              className="bg-gray-600 hover:bg-gray-700 text-white px-1 py-1 rounded text-xs"
            >
              回手牌
            </button>
          </div>
        )}

        {/* 观战模式下场上卡牌只显示查看按钮 */}
        {!isHandCard && !isOpponentCard && isSpectator && (
          <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <button
              onClick={(e) => { 
                e.stopPropagation(); 
                openCardDetailModal(card);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs"
            >
              查看
            </button>
          </div>
        )}

        {/* 对手牌桌区域的查看按钮 */}
        {!isHandCard && isOpponentCard && (
          <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <button
              onClick={(e) => { 
                e.stopPropagation(); 
                openCardDetailModal(card);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs"
            >
              查看
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* 对手区域 */}
      <div className={`${opponentColorClasses.bgOpacity} border ${opponentColorClasses.border} backdrop-blur-md rounded-xl p-4 mb-4`}
           style={opponentColorClasses.customStyle && typeof opponentColorClasses.customStyle === 'object' ? { backgroundColor: opponentColorClasses.customStyle.backgroundColor, borderColor: opponentColorClasses.customStyle.borderColor } : {}}>
        <div className="flex items-center justify-between mb-3">
          <h3 className={`${opponentColorClasses.text} font-semibold text-lg`}
              style={opponentColorClasses.customStyle && typeof opponentColorClasses.customStyle === 'object' ? { color: opponentColorClasses.customStyle.color } : {}}>
            🔴 {opponent?.username || '对手'} 的牌桌区域
          </h3>
          <div className="text-sm"
               style={opponentColorClasses.customStyle && typeof opponentColorClasses.customStyle === 'object' ? { color: opponentColorClasses.customStyle.color } : {}}>
            牌桌: {opponent?.battlefield?.filter((card: any) => card !== null).length || 0}/{opponentBattlefieldSlots} | 效果区: {opponent?.effectZone?.filter((card: any) => card !== null).length || 0}/{opponentEffectSlots}
          </div>
        </div>
        
        {/* 对手手牌区域 - 只在观战模式下显示，放在持续效果区域上方 */}
        {isSpectator && opponent && (
          <div className={`${opponentColorClasses.bgOpacityHigh} rounded-lg p-3 mb-3`}
               style={opponentColorClasses.customStyle && typeof opponentColorClasses.customStyle === 'object' ? { backgroundColor: opponentColorClasses.customStyle.backgroundColor } : {}}>
            <div className={`${opponentColorClasses.text} text-sm mb-2 text-center`}
                 style={opponentColorClasses.customStyle && typeof opponentColorClasses.customStyle === 'object' ? { color: opponentColorClasses.customStyle.color } : {}}>
              {opponent.username || '玩家2'} 的手牌区域 ({opponent.hand?.length || 0} 张)
            </div>
            <div className="grid grid-cols-10 gap-1 min-h-28">
              {opponent.hand && opponent.hand.length > 0 ? (
                opponent.hand.map((card: any, index: number) => renderCard(card, true, index, true))
              ) : (
                <div className="col-span-10 text-center text-gray-400 py-4">
                  暂无手牌
                </div>
              )}
            </div>
          </div>
        )}



        {/* 对手展示手牌区域 */}
        {opponent?.displayedHandCards && opponent.displayedHandCards.length > 0 && (
          <div className={`${opponentColorClasses.bgOpacityHigh} rounded-lg p-3 mb-3 border-2 border-yellow-400`}
               style={opponentColorClasses.customStyle && typeof opponentColorClasses.customStyle === 'object' ? { backgroundColor: opponentColorClasses.customStyle.backgroundColor } : {}}>
            <div className={`${opponentColorClasses.text} text-sm mb-2 text-center font-bold`}
                 style={opponentColorClasses.customStyle && typeof opponentColorClasses.customStyle === 'object' ? { color: opponentColorClasses.customStyle.color } : {}}>
              🔍 {opponent.username || '对手'} 展示的手牌 ({opponent.displayedHandCards.length} 张)
            </div>
            <div className="grid grid-cols-6 gap-2 min-h-28">
              {opponent.displayedHandCards.map((card: any, index: number) => (
                <div 
                  key={`displayed-${index}`} 
                  className="bg-yellow-600 bg-opacity-80 border-2 border-yellow-400 rounded-lg p-2 text-white text-xs shadow-lg ring-2 ring-yellow-300 ring-opacity-75 relative"
                >
                  <div className="font-semibold text-center mb-1">{card.name}</div>
                  <div className="text-center text-xs mb-1">费用: {card.cost}</div>
                  {card.type === '配角牌' && (
                    <div className="text-center text-xs">
                      攻: {card.attack} / 生命: {card.health}
                    </div>
                  )}
                  <div className="text-xs text-center mt-1 truncate">{card.effect || '无效果'}</div>
                  
                  {/* 查看按钮 */}
                  <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        openCardDetailModal(card);
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs"
                    >
                      查看
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 对手持续效果区域 */}
        <div className={`${opponentColorClasses.bgOpacityHigh} rounded-lg p-3 mb-3`}
             style={opponentColorClasses.customStyle && typeof opponentColorClasses.customStyle === 'object' ? { backgroundColor: opponentColorClasses.customStyle.backgroundColor } : {}}>
          <div className={`${opponentColorClasses.text} text-sm mb-2 text-center`}
               style={opponentColorClasses.customStyle && typeof opponentColorClasses.customStyle === 'object' ? { color: opponentColorClasses.customStyle.color } : {}}>对手持续效果区域</div>
          <div className="grid grid-cols-6 gap-2 min-h-20" style={{ gridTemplateColumns: `repeat(${opponentEffectSlots}, minmax(0, 1fr))` }}>
            {Array.from({ length: opponentEffectSlots }).map((_, index) => {
              const card = opponent?.effectZone?.[index];
              if (card && card !== null) {
                return renderCard(card, false, index, true, 'effect');
              } else {
                return (
                  <div key={`empty-opponent-effect-${index}`} className={`${opponentColorClasses.bgOpacityHigh} border ${opponentColorClasses.borderDashed} rounded-lg min-h-16 flex items-center justify-center`}
                       style={opponentColorClasses.customStyle && typeof opponentColorClasses.customStyle === 'object' ? { backgroundColor: opponentColorClasses.customStyle.backgroundColor, borderColor: opponentColorClasses.customStyle.borderColor } : {}}>
                    <span className={`${opponentColorClasses.textTertiary} text-xs`}
                          style={opponentColorClasses.customStyle && typeof opponentColorClasses.customStyle === 'object' ? { color: opponentColorClasses.customStyle.color } : {}}>位置 {index + 1}</span>
                  </div>
                );
              }
            })}
          </div>
        </div>
        
        {/* 对手牌桌区域 */}
        <div className={`${opponentColorClasses.bgOpacityHigh} rounded-lg p-3 mb-3`}
             style={opponentColorClasses.customStyle && typeof opponentColorClasses.customStyle === 'object' ? { backgroundColor: opponentColorClasses.customStyle.backgroundColor } : {}}>
          <div className={`${opponentColorClasses.text} text-sm mb-2 text-center`}
               style={opponentColorClasses.customStyle && typeof opponentColorClasses.customStyle === 'object' ? { color: opponentColorClasses.customStyle.color } : {}}>对手牌桌区域</div>
          <div className="grid grid-cols-5 gap-2 min-h-32" style={{ gridTemplateColumns: `repeat(${opponentBattlefieldSlots}, minmax(0, 1fr))` }}>
            {Array.from({ length: opponentBattlefieldSlots }).map((_, index) => {
              const card = opponent?.battlefield?.[index];
              if (card && card !== null) {
                return renderCard(card, false, index, true, 'battlefield');
              } else {
                return (
                  <div key={`empty-opponent-battlefield-${index}`} className={`${opponentColorClasses.bgOpacityHigh} border ${opponentColorClasses.borderDashed} rounded-lg min-h-24 flex items-center justify-center`}
                       style={opponentColorClasses.customStyle && typeof opponentColorClasses.customStyle === 'object' ? { backgroundColor: opponentColorClasses.customStyle.backgroundColor, borderColor: opponentColorClasses.customStyle.borderColor } : {}}>
                    <span className={`${opponentColorClasses.textTertiary} text-xs`}
                          style={opponentColorClasses.customStyle && typeof opponentColorClasses.customStyle === 'object' ? { color: opponentColorClasses.customStyle.color } : {}}>位置 {index + 1}</span>
                  </div>
                );
              }
            })}
          </div>
        </div>

      </div>

      {/* 玩家区域 */}
      <div className={`${playerColorClasses.bgOpacity} backdrop-blur-md rounded-xl p-4`}
           style={playerColorClasses.customStyle && typeof playerColorClasses.customStyle === 'object' ? { backgroundColor: playerColorClasses.customStyle.backgroundColor, borderColor: playerColorClasses.customStyle.borderColor } : {}}>
        <div className="flex justify-between items-center mb-3">
          <h3 className={`${playerColorClasses.text} font-semibold`}
              style={playerColorClasses.customStyle && typeof playerColorClasses.customStyle === 'object' ? { color: playerColorClasses.customStyle.color } : {}}>
            {isSpectator ? `${currentPlayer?.username || '玩家1'} 的牌桌区域` : '我的牌桌区域'}
          </h3>
          {!isSpectator && (
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1 bg-white bg-opacity-10 rounded px-2 py-1">
                <span className="text-white text-xs">空位:</span>
                <button
                  onClick={() => handleBattlefieldSlotsChange(Math.max(1, currentBattlefieldSlots - 1))}
                  className="bg-red-600 hover:bg-red-700 text-white w-4 h-4 rounded text-xs flex items-center justify-center"
                >
                  -
                </button>
                <span className="text-white text-xs font-semibold">{currentBattlefieldSlots}</span>
                <button
                  onClick={() => handleBattlefieldSlotsChange(Math.min(10, currentBattlefieldSlots + 1))}
                  className="bg-green-600 hover:bg-green-700 text-white w-4 h-4 rounded text-xs flex items-center justify-center"
                >
                  +
                </button>
              </div>
              <button
                onClick={handleDrawCard}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
              >
                抽卡
              </button>
              <button
                onClick={handleShuffle}
                className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-sm transition-colors"
              >
                洗牌
              </button>
              <button
                onClick={() => setShowAdvancedAddCardModal(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm transition-colors"
              >
                添加卡牌
              </button>
              <button
                onClick={handleSearchDeck}
                className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded text-sm transition-colors"
              >
                查看牌堆
              </button>
              <button
                onClick={() => setShowHandCardCostModal(true)}
                className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1 rounded text-sm transition-colors"
              >
                调整手牌费用
              </button>
              <button
                onClick={() => setShowGraveyardModal(true)}
                className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm transition-colors"
              >
                弃牌堆 ({currentPlayer?.graveyard?.length || 0})
              </button>
            </div>
          )}
        </div>
        
        <div className={`grid gap-2 min-h-32 mb-4`} style={{ gridTemplateColumns: `repeat(${currentBattlefieldSlots}, minmax(0, 1fr))` }}>
          {Array.from({ length: currentBattlefieldSlots }).map((_, index) => {
            const card = currentPlayer?.battlefield[index];
            if (card && card !== null) {
              return renderCard(card, false, index, false, 'battlefield');
            } else {
              return (
                <div key={`empty-battlefield-${index}`} className="bg-white bg-opacity-5 border border-dashed border-gray-500 rounded-lg min-h-24 flex items-center justify-center">
                  <span className="text-gray-400 text-xs">位置 {index + 1}</span>
                </div>
              );
            }
          })}
        </div>

        {/* 我的持续效果区域 */}
        <div className={`border-t ${playerColorClasses.border} pt-4 mb-4`}
             style={playerColorClasses.customStyle && typeof playerColorClasses.customStyle === 'object' ? { borderColor: playerColorClasses.customStyle.borderColor } : {}}>
          <div className="flex justify-between items-center mb-2">
            <h4 className={`${playerColorClasses.text} font-semibold`}
                style={playerColorClasses.customStyle && typeof playerColorClasses.customStyle === 'object' ? { color: playerColorClasses.customStyle.color } : {}}>
              {isSpectator ? `${currentPlayer?.username || '玩家1'} 的持续效果区域` : '我的持续效果区域'}
            </h4>
            {!isSpectator && (
              <div className="flex items-center space-x-1 bg-white bg-opacity-10 rounded px-2 py-1">
                <span className="text-white text-xs">空位:</span>
                <button
                  onClick={() => handleEffectSlotsChange(Math.max(1, currentEffectSlots - 1))}
                  className="bg-red-600 hover:bg-red-700 text-white w-4 h-4 rounded text-xs flex items-center justify-center"
                >
                  -
                </button>
                <span className="text-white text-xs font-semibold">{currentEffectSlots}</span>
                <button
                  onClick={() => handleEffectSlotsChange(Math.min(10, currentEffectSlots + 1))}
                  className="bg-green-600 hover:bg-green-700 text-white w-4 h-4 rounded text-xs flex items-center justify-center"
                >
                  +
                </button>
              </div>
            )}
          </div>
          <div className={`grid gap-2 min-h-24`} style={{ gridTemplateColumns: `repeat(${currentEffectSlots}, minmax(0, 1fr))` }}>
            {Array.from({ length: currentEffectSlots }).map((_, index) => {
              const card = currentPlayer?.effectZone?.[index];
              if (card && card !== null) {
                return renderCard(card, false, index, false, 'effect');
              } else {
                return (
                  <div key={`empty-effect-${index}`} className="bg-white bg-opacity-5 border border-dashed border-purple-500 rounded-lg min-h-20 flex items-center justify-center">
                    <span className="text-gray-400 text-xs">位置 {index + 1}</span>
                  </div>
                );
              }
            })}
          </div>
        </div>

        {/* 手牌区域 */}
        <div className={`border-t ${playerColorClasses.border} pt-4 relative z-50`}
             style={playerColorClasses.customStyle && typeof playerColorClasses.customStyle === 'object' ? { borderColor: playerColorClasses.customStyle.borderColor } : {}}>
          <div className="flex justify-between items-center mb-2">
            <h4 className={`${playerColorClasses.text} font-semibold`}
                style={playerColorClasses.customStyle && typeof playerColorClasses.customStyle === 'object' ? { color: playerColorClasses.customStyle.color } : {}}>
              {isSpectator ? `${currentPlayer?.username || '玩家1'} 的手牌区域` : '手牌区域'}
            </h4>
            {!isSpectator && (
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowMultiSelectModal(true)}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-sm transition-colors"
                >
                  多选
                </button>
              </div>
            )}
          </div>
          <div className="grid grid-cols-10 gap-1 relative z-50">
            {currentPlayer?.hand.map((card: any, index: number) => renderCard(card, true, index, isSpectator))}
          </div>
        </div>
      </div>

      {/* 数值调整模块 - 替换原来的弃牌堆位置 */}
      {currentPlayer && !isSpectator && (
        <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-4">
          <h3 className="text-lg font-semibold text-white mb-3">数值调整</h3>
          
          {/* 第一行：当前数值调整 */}
          <div className="grid grid-cols-3 gap-4 mb-3">
            {/* 生命值调整 */}
            <div className="flex items-center space-x-2">
              <span className="text-gray-300 text-sm">生命值</span>
              <div className="flex space-x-1">
                <button
                  onClick={() => onGameAction('modify-player-stats', { type: 'health', change: -5 })}
                  className="bg-red-600 hover:bg-red-700 text-white w-5 h-5 rounded text-xs transition-colors"
                >
                  -5
                </button>
                <button
                  onClick={() => onGameAction('modify-player-stats', { type: 'health', change: -1 })}
                  className="bg-red-600 hover:bg-red-700 text-white w-5 h-5 rounded text-xs transition-colors"
                >
                  -1
                </button>
                <button
                  onClick={() => onGameAction('modify-player-stats', { type: 'health', change: 1 })}
                  className="bg-green-600 hover:bg-green-700 text-white w-5 h-5 rounded text-xs transition-colors"
                >
                  +1
                </button>
                <button
                  onClick={() => onGameAction('modify-player-stats', { type: 'health', change: 5 })}
                  className="bg-green-600 hover:bg-green-700 text-white w-5 h-5 rounded text-xs transition-colors"
                >
                  +5
                </button>
              </div>
            </div>

            {/* 当前费用调整 */}
            <div className="flex items-center space-x-2">
              <span className="text-gray-300 text-sm">当前费用</span>
              <div className="flex space-x-1">
                <button
                  onClick={() => onGameAction('modify-player-stats', { type: 'mana', change: -1 })}
                  className="bg-red-600 hover:bg-red-700 text-white w-5 h-5 rounded text-xs transition-colors"
                >
                  -1
                </button>
                <button
                  onClick={() => onGameAction('modify-player-stats', { type: 'mana', change: 1 })}
                  className="bg-green-600 hover:bg-green-700 text-white w-5 h-5 rounded text-xs transition-colors"
                >
                  +1
                </button>
              </div>
            </div>

            {/* 章节进度调整 */}
            <div className="flex items-center space-x-2">
              <span className="text-gray-300 text-sm">章节进度</span>
              <div className="flex space-x-1">
                <button
                  onClick={() => onGameAction('modify-player-stats', { type: 'chapter', change: -1 })}
                  className="bg-red-600 hover:bg-red-700 text-white w-5 h-5 rounded text-xs transition-colors"
                >
                  -1
                </button>
                <button
                  onClick={() => onGameAction('modify-player-stats', { type: 'chapter', change: 1 })}
                  className="bg-green-600 hover:bg-green-700 text-white w-5 h-5 rounded text-xs transition-colors"
                >
                  +1
                </button>
              </div>
            </div>
          </div>

          {/* 第二行：上限数值调整 */}
          <div className="grid grid-cols-3 gap-4">
            {/* 生命上限调整 */}
            <div className="flex items-center space-x-2">
              <span className="text-gray-300 text-sm">生命上限</span>
              <div className="flex space-x-1">
                <button
                  onClick={() => onGameAction('modify-player-stats', { type: 'maxHealth', change: -5 })}
                  className="bg-red-600 hover:bg-red-700 text-white w-5 h-5 rounded text-xs transition-colors"
                >
                  -5
                </button>
                <button
                  onClick={() => onGameAction('modify-player-stats', { type: 'maxHealth', change: -1 })}
                  className="bg-red-600 hover:bg-red-700 text-white w-5 h-5 rounded text-xs transition-colors"
                >
                  -1
                </button>
                <button
                  onClick={() => onGameAction('modify-player-stats', { type: 'maxHealth', change: 1 })}
                  className="bg-green-600 hover:bg-green-700 text-white w-5 h-5 rounded text-xs transition-colors"
                >
                  +1
                </button>
                <button
                  onClick={() => onGameAction('modify-player-stats', { type: 'maxHealth', change: 5 })}
                  className="bg-green-600 hover:bg-green-700 text-white w-5 h-5 rounded text-xs transition-colors"
                >
                  +5
                </button>
              </div>
            </div>

            {/* 费用上限调整 */}
            <div className="flex items-center space-x-2">
              <span className="text-gray-300 text-sm">费用上限</span>
              <div className="flex space-x-1">
                <button
                  onClick={() => onGameAction('modify-player-stats', { type: 'maxMana', change: -1 })}
                  className="bg-red-600 hover:bg-red-700 text-white w-5 h-5 rounded text-xs transition-colors"
                >
                  -1
                </button>
                <button
                  onClick={() => onGameAction('modify-player-stats', { type: 'maxMana', change: 1 })}
                  className="bg-green-600 hover:bg-green-700 text-white w-5 h-5 rounded text-xs transition-colors"
                >
                  +1
                </button>
              </div>
            </div>

            {/* 章节上限调整 */}
            <div className="flex items-center space-x-2">
              <span className="text-gray-300 text-sm">章节上限</span>
              <div className="flex space-x-1">
                <button
                  onClick={() => onGameAction('modify-player-stats', { type: 'maxChapter', change: -1 })}
                  className="bg-red-600 hover:bg-red-700 text-white w-5 h-5 rounded text-xs transition-colors"
                >
                  -1
                </button>
                <button
                  onClick={() => onGameAction('modify-player-stats', { type: 'maxChapter', change: 1 })}
                  className="bg-green-600 hover:bg-green-700 text-white w-5 h-5 rounded text-xs transition-colors"
                >
                  +1
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 卡牌详情模态框 */}
      {showCardDetailModal && viewingCard && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[10000]">
          <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-white mb-4 text-center">卡牌详情</h3>
            
            <div className="bg-gray-800 bg-opacity-50 rounded-lg p-4 mb-4">
              {/* 卡牌图片区域 */}
              <div className="w-full h-32 bg-gray-700 rounded-lg mb-4 flex items-center justify-center">
                {viewingCard.image ? (
                  <img 
                    src={viewingCard.image} 
                    alt={viewingCard.name}
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <div className="text-gray-400 text-center">
                    <div className="text-lg font-semibold">{viewingCard.name}</div>
                    <div className="text-sm">暂无卡图</div>
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <div className="text-center">
                  <div className="text-white font-bold text-lg">{viewingCard.name}</div>
                  <div className="text-gray-300 text-sm">{viewingCard.category} · {viewingCard.type}</div>
                </div>
                
                <div className="flex justify-between text-sm">
                  <div className="text-yellow-400">费用: {viewingCard.cost}</div>
                  <div className="text-blue-400">主角: {factionMap[viewingCard.faction] || viewingCard.faction}</div>
                </div>
                
                {viewingCard.type === '配角牌' && (
                  <div className="flex justify-center space-x-4 text-sm">
                    <div className="text-red-400">攻击: {viewingCard.attack}</div>
                    <div className="text-green-400">生命: {viewingCard.health}</div>
                  </div>
                )}
                
                <div className="bg-gray-700 rounded p-3">
                  <div className="text-white text-sm font-semibold mb-1">效果描述:</div>
                  <div className="text-gray-300 text-sm">{viewingCard.effect || '无特殊效果'}</div>
                </div>
                
                {viewingCard.flavor && (
                  <div className="bg-gray-700 rounded p-3">
                    <div className="text-white text-sm font-semibold mb-1">背景故事:</div>
                    <div className="text-gray-300 text-sm italic">{viewingCard.flavor}</div>
                  </div>
                )}
                
                {/* 显示卡牌备注 */}
                {(viewingCard as ModifiedCard).cardNote && (
                  <div className="bg-purple-700 bg-opacity-50 rounded p-3">
                    <div className="text-white text-sm font-semibold mb-1">📝 备注:</div>
                    <div className="text-gray-300 text-sm">{(viewingCard as ModifiedCard).cardNote}</div>
                  </div>
                )}
                
                <div className="flex justify-between text-xs text-gray-400">
                  <div>创建者: {viewingCard.createdBy?.username || '未知'}</div>
                  <div>{viewingCard.isPublic ? '公开' : '私有'}</div>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => setShowCardDetailModal(false)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded transition-colors"
            >
              关闭
            </button>
          </div>
        </div>
      )}

      {/* 弃牌堆模态框 */}
      {showGraveyardModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-40">
          <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-6 max-w-3xl w-full mx-4">
            <h3 className="text-xl font-bold text-white mb-4">
              {currentPlayer?.username} 的弃牌堆 ({currentPlayer?.graveyard.length} 张)
            </h3>
            <div className="grid grid-cols-4 gap-4 max-h-96 overflow-y-auto mb-4">
              {currentPlayer?.graveyard.map((card: any, index: number) => (
                <div 
                  key={index} 
                  className="bg-gray-700 rounded-lg p-3 text-white text-xs shadow-lg border border-gray-500 cursor-pointer hover:bg-gray-600 group relative"
                >
                  <div className="font-semibold text-center mb-1">{card.name}</div>
                  <div className="text-center text-xs mb-1">费用: {card.cost}</div>
                  {card.type === '配角牌' && (
                    <div className="text-center text-xs">
                      攻: {card.attack} / 生命: {card.health}
                    </div>
                  )}
                  <div className="text-xs text-center mt-1 truncate">{card.effect || '无效果'}</div>
                  
                  {/* 弃牌堆卡牌的按钮 */}
                  <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-1">
                    <button
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        openCardDetailModal(card);
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs"
                    >
                      查看
                    </button>
                    <button
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        // 为弃牌堆卡牌添加备注功能
                        openCardNoteModal(card, index, 'graveyard');
                      }}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-2 py-1 rounded text-xs"
                    >
                      备注
                    </button>
                    <button
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        handleReturnFromGraveyard(card, index);
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs"
                    >
                      回手牌
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowGraveyardModal(false)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded transition-colors"
            >
              关闭
            </button>
          </div>
        </div>
      )}

      {/* 高级添加卡牌组件 */}
      <AdvancedAddCard
        isOpen={showAdvancedAddCardModal}
        onClose={() => setShowAdvancedAddCardModal(false)}
        onAddCard={onGameAction}
        currentPlayer={currentPlayer}
      />

      {/* 修改卡牌攻防模态框 */}
      {showModifyCardModal && modifyingCard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-xl font-bold text-white mb-4">修改卡牌属性</h3>
            
            <div className="mb-4 p-3 bg-gray-800 bg-opacity-50 rounded-lg">
              <div className="text-center text-white font-semibold mb-2">{modifyingCard.card.name}</div>
              <div className="text-center text-gray-300 text-sm">
                当前: 攻击 {modifyingCard.card.modifiedAttack ?? modifyingCard.card.attack} / 
                生命 {modifyingCard.card.modifiedHealth ?? modifyingCard.card.health}
              </div>
              {(modifyingCard.card.originalAttack || modifyingCard.card.originalHealth) && (
                <div className="text-center text-gray-400 text-xs">
                  原始: 攻击 {modifyingCard.card.originalAttack || modifyingCard.card.attack} / 
                  生命 {modifyingCard.card.originalHealth || modifyingCard.card.health}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-white text-sm mb-2">新攻击力</label>
                <input
                  type="number"
                  defaultValue={modifyingCard.card.modifiedAttack ?? modifyingCard.card.attack}
                  id="new-attack"
                  className="w-full px-3 py-2 bg-white bg-opacity-10 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-white text-sm mb-2">新生命值</label>
                <input
                  type="number"
                  defaultValue={modifyingCard.card.modifiedHealth ?? modifyingCard.card.health}
                  id="new-health"
                  className="w-full px-3 py-2 bg-white bg-opacity-10 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowModifyCardModal(false);
                  setModifyingCard(null);
                }}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => {
                  const newAttack = parseInt((document.getElementById('new-attack') as HTMLInputElement).value) || 0;
                  const newHealth = parseInt((document.getElementById('new-health') as HTMLInputElement).value) || 0;
                  handleModifyCard(modifyingCard.card, modifyingCard.index, modifyingCard.zone, newAttack, newHealth);
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded transition-colors"
              >
                确认修改
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 位置选择模态框 */}
      {showPositionSelection && pendingCardPlay && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[9999]">
          <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-6 max-w-lg w-full mx-4">
            <h3 className="text-xl font-bold text-white mb-4 text-center">选择打出位置</h3>
            <p className="text-gray-300 text-center mb-6">
              将 "{pendingCardPlay.card.name}" 打出到 {pendingCardPlay.zone === 'battlefield' ? '牌桌区域' : '效果区域'}
            </p>
            
            <div className="grid grid-cols-5 gap-2 mb-6">
              {Array.from({ length: pendingCardPlay.zone === 'battlefield' ? currentBattlefieldSlots : currentEffectSlots }).map((_, position) => {
                const targetZone = pendingCardPlay.zone === 'battlefield' ? currentPlayer?.battlefield : currentPlayer?.effectZone;
                // 检查这个特定位置是否有卡牌
                const cardAtPosition = targetZone && targetZone[position];
                const isOccupied = !!cardAtPosition;
                
                return (
                  <button
                    key={position}
                    onClick={() => handlePositionSelect(position)}
                    disabled={isOccupied}
                    className={`aspect-square border-2 rounded-lg flex items-center justify-center text-sm font-semibold transition-all ${
                      isOccupied 
                        ? 'bg-gray-600 border-gray-500 text-gray-400 cursor-not-allowed' 
                        : 'bg-blue-600 hover:bg-blue-700 border-blue-400 text-white hover:scale-105'
                    }`}
                  >
                    {isOccupied ? `${cardAtPosition.name.slice(0, 4)}...` : `位置 ${position + 1}`}
                  </button>
                );
              })}
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowPositionSelection(false);
                  setPendingCardPlay(null);
                }}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 搜索牌堆模态框 */}
      {showSearchDeckModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[9999]">
          <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-6 max-w-4xl w-full mx-4">
            <h3 className="text-xl font-bold text-white mb-4 text-center">查看牌堆</h3>
            <p className="text-gray-300 text-center mb-4">从牌堆中选择一张卡牌加入手牌</p>
            
            {/* 搜索输入框 */}
            <div className="mb-4">
              <input
                type="text"
                placeholder="搜索卡牌名称..."
                className="w-full px-3 py-2 bg-white bg-opacity-10 border border-gray-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={deckSearchKeyword}
                onChange={(e) => setDeckSearchKeyword(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-4 gap-4 max-h-96 overflow-y-auto mb-4">
              {deckSearchResults
                .filter(card => card.name.toLowerCase().includes(deckSearchKeyword.toLowerCase()))
                .map((card, index) => (
                  <div 
                    key={index} 
                    className="bg-blue-600 bg-opacity-70 border border-blue-400 rounded-lg p-3 text-white text-xs shadow-lg cursor-pointer hover:bg-blue-500 group relative"
                  >
                    <div className="font-semibold text-center mb-1">{card.name}</div>
                    <div className="text-center text-xs mb-1">费用: {card.cost}</div>
                    {card.type === '配角牌' && (
                      <div className="text-center text-xs">
                        攻: {card.attack} / 生命: {card.health}
                      </div>
                    )}
                    <div className="text-xs text-center mt-1 truncate">{card.effect || '无效果'}</div>
                    
                    {/* 选择按钮 */}
                    <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-wrap items-center justify-center gap-1 p-1">
                      <button
                        onClick={() => openCardDetailModal(card)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-1 py-1 rounded text-xs"
                      >
                        查看详情
                      </button>
                      <button
                        onClick={() => openCardNoteModal(card as ModifiedCard, index, 'deck')}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-1 py-1 rounded text-xs"
                        title="添加/编辑备注"
                      >
                        备注
                      </button>
                      <button
                        onClick={() => handleDrawSpecificCard(card, index)}
                        className="bg-green-600 hover:bg-green-700 text-white px-1 py-1 rounded text-xs"
                      >
                        抽取此牌
                      </button>
                    </div>
                  </div>
                ))}
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowSearchDeckModal(false);
                  setDeckSearchKeyword(''); // 关闭时清空搜索关键词
                }}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded transition-colors"
              >
                关闭
              </button>
              <button
                onClick={handleShuffle}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded transition-colors"
              >
                重新洗牌
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 调整手牌费用模态框 */}
      {showHandCardCostModal && currentPlayer && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[9999]">
          <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-6 max-w-2xl w-full mx-4">
            <h3 className="text-xl font-bold text-white mb-4 text-center">调整手牌费用</h3>
            <p className="text-gray-300 text-center mb-6">选择一张手牌并调整其费用</p>
            
            <div className="grid grid-cols-5 gap-4 max-h-96 overflow-y-auto mb-4">
              {currentPlayer.hand.map((card: any, index: number) => (
                <div 
                  key={index} 
                  className="bg-blue-600 bg-opacity-70 border border-blue-400 rounded-lg p-3 text-white text-xs shadow-lg cursor-pointer hover:bg-blue-500 group relative"
                >
                  <div className="font-semibold text-center mb-1">{card.name}</div>
                  <div className="text-center text-xs mb-1">
                    当前费用: {card.cost}
                    {card.originalCost && card.originalCost !== card.cost && (
                      <div className="text-gray-300 text-xs">(原: {card.originalCost})</div>
                    )}
                  </div>
                  {card.type === '配角牌' && (
                    <div className="text-center text-xs">
                      攻: {card.attack} / 生命: {card.health}
                    </div>
                  )}
                  <div className="text-xs text-center mt-1 truncate">{card.effect || '无效果'}</div>
                  
                  {/* 选择按钮 */}
                  <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      onClick={() => {
                        setModifyingHandCard({ card, index });
                      }}
                      className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-2 rounded text-sm"
                    >
                      调整费用
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setShowHandCardCostModal(false)}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 修改手牌费用确认模态框 */}
      {modifyingHandCard && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[9999]">
          <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-xl font-bold text-white mb-4 text-center">修改手牌费用</h3>
            
            <div className="mb-4 p-3 bg-gray-800 bg-opacity-50 rounded-lg">
              <div className="text-center text-white font-semibold mb-2">{modifyingHandCard.card.name}</div>
              <div className="text-center text-gray-300 text-sm">
                当前费用: {modifyingHandCard.card.cost}
                {modifyingHandCard.card.originalCost && modifyingHandCard.card.originalCost !== modifyingHandCard.card.cost && (
                  <div className="text-gray-400 text-xs">(原始费用: {modifyingHandCard.card.originalCost})</div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-white text-sm mb-2">新费用</label>
                <input
                  type="text"
                  defaultValue={modifyingHandCard.card.cost}
                  id="new-cost"
                  placeholder="输入新费用 (如: 3, X, 0)"
                  className="w-full px-3 py-2 bg-white bg-opacity-10 border border-gray-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <div className="text-gray-400 text-xs mt-1">
                  支持数字费用 (如: 0, 1, 2...) 或特殊费用 (如: X)
                </div>
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setModifyingHandCard(null);
                }}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => {
                  const newCost = (document.getElementById('new-cost') as HTMLInputElement).value.trim();
                  if (newCost) {
                    onGameAction('modify-hand-card-cost', { 
                      handIndex: modifyingHandCard.index, 
                      newCost: newCost 
                    });
                    setModifyingHandCard(null);
                    setShowHandCardCostModal(false);
                  } else {
                    alert('请输入有效的费用值');
                  }
                }}
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white py-2 px-4 rounded transition-colors"
              >
                确认修改
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 多选手牌模态框 */}
      {showMultiSelectModal && currentPlayer && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[9999]">
          <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-6 max-w-3xl w-full mx-4">
            <h3 className="text-xl font-bold text-white mb-4 text-center">多选手牌</h3>
            <p className="text-gray-300 text-center mb-6">选择多张手牌进行批量操作</p>
            
            <div className="grid grid-cols-5 gap-4 max-h-96 overflow-y-auto mb-4">
              {currentPlayer.hand.map((card: any, index: number) => (
                <div 
                  key={index} 
                  className={`cursor-pointer rounded-lg p-3 text-white text-xs shadow-lg border transition-colors ${
                    selectedHandCards.includes(index) 
                      ? 'bg-green-600 border-green-400' 
                      : 'bg-blue-600 bg-opacity-70 border-blue-400 hover:bg-blue-500'
                  }`}
                  onClick={() => handleToggleHandCardSelection(index)}
                >
                  <div className="font-semibold text-center mb-1">{card.name}</div>
                  <div className="text-center text-xs mb-1">费用: {card.cost}</div>
                  {card.type === '配角牌' && (
                    <div className="text-center text-xs">
                      攻: {card.attack} / 生命: {card.health}
                    </div>
                  )}
                  <div className="text-xs text-center mt-1 truncate">{card.effect || '无效果'}</div>
                  {selectedHandCards.includes(index) && (
                    <div className="text-center mt-2">
                      <span className="bg-white text-green-600 px-2 py-1 rounded text-xs font-semibold">已选中</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            <div className="flex justify-between items-center mb-4">
              <div className="text-white">
                已选中 {selectedHandCards.length} 张卡牌
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setSelectedHandCards([])}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm transition-colors"
                >
                  清空
                </button>
                <button
                  onClick={() => {
                    const allIndices = currentPlayer.hand.map((_: any, index: number) => index);
                    setSelectedHandCards(allIndices);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
                >
                  全选
                </button>
              </div>
            </div>
            
            {/* 手牌展示操作区域 */}
            <div className="bg-white bg-opacity-5 rounded-lg p-4 mb-4">
              <h4 className="text-white font-semibold mb-3 text-center">手牌展示操作</h4>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <button
                  onClick={() => {
                    // 展示全部手牌
                    if (!currentPlayer?.hand || currentPlayer.hand.length === 0) {
                      alert('手牌为空，无法展示。');
                      return;
                    }
                    if (window.confirm(`确定要向对手展示全部手牌 (${currentPlayer.hand.length} 张) 吗？`)) {
                      onGameAction('display-all-hand', { 
                        cards: currentPlayer.hand,
                        message: `展示了全部手牌 (${currentPlayer.hand.length} 张)`
                      });
                    }
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded text-sm transition-colors"
                >
                  展示全部手牌
                </button>
                <button
                  onClick={() => {
                    // 展示选中的手牌
                    if (selectedHandCards.length === 0) {
                      alert('请选择至少一张手牌进行展示。');
                      return;
                    }
                    const selectedCards = selectedHandCards.map(index => currentPlayer.hand[index]);
                    if (window.confirm(`确定要向对手展示选中的 ${selectedHandCards.length} 张手牌吗？`)) {
                      onGameAction('display-selected-hand', { 
                        cards: selectedCards,
                        message: `展示了 ${selectedHandCards.length} 张手牌`
                      });
                    }
                  }}
                  disabled={selectedHandCards.length === 0}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-500 text-white py-2 px-4 rounded text-sm transition-colors"
                >
                  展示选中手牌 ({selectedHandCards.length})
                </button>
              </div>
              <button
                onClick={() => {
                  // 结束展示手牌
                  if (window.confirm('确定要结束展示手牌吗？')) {
                    onGameAction('hide-all-hand', { 
                      message: '结束展示手牌'
                    });
                  }
                }}
                className="w-full bg-yellow-600 hover:bg-yellow-700 text-white py-2 px-4 rounded text-sm transition-colors"
              >
                结束展示手牌
              </button>
            </div>
            
            {/* 批量操作区域 */}
            <div className="bg-white bg-opacity-5 rounded-lg p-4 mb-4">
              <h4 className="text-white font-semibold mb-3 text-center">批量操作</h4>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    if (selectedHandCards.length > 0) {
                      setShowBulkDiscardModal(true);
                    }
                  }}
                  disabled={selectedHandCards.length === 0}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-500 text-white py-2 px-4 rounded transition-colors"
                >
                  批量弃牌
                </button>
                <button
                  onClick={() => {
                    if (selectedHandCards.length > 0) {
                      setShowBulkModifyCostModal(true);
                    }
                  }}
                  disabled={selectedHandCards.length === 0}
                  className="flex-1 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-500 text-white py-2 px-4 rounded transition-colors"
                >
                  批量修改费用
                </button>
              </div>
            </div>
            
            {/* 关闭按钮 */}
            <div className="flex justify-center">
              <button
                onClick={() => {
                  setShowMultiSelectModal(false);
                  setSelectedHandCards([]);
                }}
                className="bg-gray-600 hover:bg-gray-700 text-white py-2 px-6 rounded transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 批量弃牌确认模态框 */}
      {showBulkDiscardModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[10000]">
          <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-white mb-4 text-center">批量弃牌确认</h3>
            <p className="text-gray-300 text-center mb-6">
              确定要弃掉选中的 {selectedHandCards.length} 张手牌吗？
            </p>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setShowBulkDiscardModal(false)}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => {
                  // 从后往前删除，避免索引变化问题
                  const sortedIndices = selectedHandCards.sort((a, b) => b - a);
                  sortedIndices.forEach(index => {
                    const card = currentPlayer?.hand[index];
                    if (card) {
                      onGameAction('discard-card', { card, handIndex: index });
                    }
                  });
                  setSelectedHandCards([]);
                  setShowBulkDiscardModal(false);
                  setShowMultiSelectModal(false);
                }}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded transition-colors"
              >
                确认弃牌
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 批量修改费用模态框 */}
      {showBulkModifyCostModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[10000]">
          <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-white mb-4 text-center">批量修改费用</h3>
            <p className="text-gray-300 text-center mb-6">
              为选中的 {selectedHandCards.length} 张手牌修改费用
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-white text-sm mb-2">费用修改值</label>
                <input
                  type="text"
                  value={bulkCostChange}
                  onChange={(e) => setBulkCostChange(e.target.value)}
                  placeholder="例如: -1, +2"
                  className="w-full px-3 py-2 bg-white bg-opacity-10 border border-gray-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <div className="text-gray-400 text-xs mt-1">
                  输入正数增加费用，负数减少费用
                </div>
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowBulkModifyCostModal(false);
                  setBulkCostChange('');
                }}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => {
                  const costChange = parseInt(bulkCostChange);
                  if (isNaN(costChange)) {
                    alert('请输入有效的数字');
                    return;
                  }
                  selectedHandCards.forEach(index => {
                    const card = currentPlayer?.hand[index];
                    if (card) {
                      const currentCost = parseInt(card.cost) || 0;
                      const newCost = Math.max(0, currentCost + costChange);
                      onGameAction('modify-hand-card-cost', { handIndex: index, newCost: newCost.toString() });
                    }
                  });
                  setSelectedHandCards([]);
                  setBulkCostChange('');
                  setShowBulkModifyCostModal(false);
                  setShowMultiSelectModal(false);
                }}
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white py-2 px-4 rounded transition-colors"
              >
                确认修改
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 卡牌备注模态框 */}
      {showCardNoteModal && editingCardNote && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[9999]">
          <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-white mb-4 text-center">编辑卡牌备注</h3>
            
            <div className="mb-4 p-3 bg-gray-800 bg-opacity-50 rounded-lg">
              <div className="text-center text-white font-semibold mb-2">{editingCardNote.card.name}</div>
              <div className="text-center text-gray-300 text-sm">
                {editingCardNote.zone === 'battlefield' ? '牌桌区域' : '效果区域'} - 位置 {editingCardNote.index + 1}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-white text-sm mb-2">备注内容 ({cardNoteText.length}/200)</label>
                <textarea
                  value={cardNoteText}
                  onChange={(e) => setCardNoteText(e.target.value.substring(0, 200))}
                  placeholder="为这张卡牌添加备注..."
                  className="w-full h-24 px-3 py-2 bg-white bg-opacity-10 border border-gray-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
                <div className="text-gray-400 text-xs mt-1">
                  备注将对双方玩家可见，用于记录卡牌状态、效果等信息
                </div>
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowCardNoteModal(false);
                  setEditingCardNote(null);
                  setCardNoteText('');
                }}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveCardNote}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded transition-colors"
              >
                保存备注
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameBoard;
