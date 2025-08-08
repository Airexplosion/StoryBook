import React, { useState } from 'react';
import { GameState, Card, ModifiedCard } from '../../types';
import { useColor } from '../../contexts/ColorContext';
import { getDynamicClassName } from '../../utils/colorUtils';

interface GameBoardProps {
  gameState: GameState;
  currentUserId?: string;
  onGameAction: (action: string, data?: any) => void;
  deckSearchResults?: Card[];
}

const GameBoard: React.FC<GameBoardProps> = ({ gameState, currentUserId, onGameAction, deckSearchResults = [] }) => {
  const { playerColorClasses, opponentColorClasses } = useColor();
  
  const currentPlayer = gameState.players.find(p => p.userId === currentUserId);
  const opponent = gameState.players.find(p => p.userId !== currentUserId);
  
  const [showGraveyardModal, setShowGraveyardModal] = useState(false);
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [showModifyCardModal, setShowModifyCardModal] = useState(false);
  const [showCardDetailModal, setShowCardDetailModal] = useState(false);
  const [viewingCard, setViewingCard] = useState<Card | null>(null);
  const [modifyingCard, setModifyingCard] = useState<{ card: ModifiedCard; index: number; zone: 'battlefield' | 'effect' } | null>(null);
  const [showPositionSelection, setShowPositionSelection] = useState(false);
  const [pendingCardPlay, setPendingCardPlay] = useState<{ card: Card; handIndex: number; zone: 'battlefield' | 'effect' } | null>(null);
  const [showSearchDeckModal, setShowSearchDeckModal] = useState(false);
  
  // 直接使用服务器的空位数量，确保同步
  const currentBattlefieldSlots = currentPlayer?.battlefieldSlots ?? 5;
  const currentEffectSlots = currentPlayer?.effectSlots ?? 5;
  const opponentBattlefieldSlots = opponent?.battlefieldSlots ?? 5;
  const opponentEffectSlots = opponent?.effectSlots ?? 5;
  
  // 临时调试信息
  console.log('GameBoard 空位信息:', {
    currentPlayer: currentPlayer?.username,
    currentBattlefield: currentPlayer?.battlefieldSlots,
    currentEffect: currentPlayer?.effectSlots,
    opponent: opponent?.username, 
    opponentBattlefield: opponent?.battlefieldSlots,
    opponentEffect: opponent?.effectSlots,
    calculatedOpponentBattlefield: opponentBattlefieldSlots,
    calculatedOpponentEffect: opponentEffectSlots,
    // 显示完整的游戏状态用于调试
    gameStatePlayers: gameState.players.map(p => ({
      username: p.username,
      battlefieldSlots: p.battlefieldSlots,
      effectSlots: p.effectSlots
    }))
  });
  const [newCardData, setNewCardData] = useState<Partial<Card>>({
    name: '',
    type: 'story',
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
    'hero1': '正义',
    'hero2': '智慧',
    'hero3': '力量'
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
    
    if (targetZone && targetZone.length >= maxSlots) {
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
        type: 'story',
        cost: '1',
        attack: 0,
        health: 0,
        effect: '',
        category: '普通',
        faction: 'neutral',
        isPublic: false,
      });
      setShowAddCardModal(false);
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

  const renderCard = (card: ModifiedCard | null, isHandCard: boolean = false, index?: number, isOpponentCard: boolean = false, zone?: 'battlefield' | 'effect') => {
    if (!card) return null;
    
    const displayAttack = card.modifiedAttack !== undefined ? card.modifiedAttack : (card.attack !== undefined ? card.attack : '?');
    const displayHealth = card.modifiedHealth !== undefined ? card.modifiedHealth : (card.health !== undefined ? card.health : '?');
    const hasModification = card.modifiedAttack !== undefined || card.modifiedHealth !== undefined;

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
    } else if (card.type === 'character') {
      if (playerColorClasses.customStyleFull && typeof playerColorClasses.customStyleFull === 'object') {
        cardBgStyle = { backgroundColor: playerColorClasses.customStyleFull.backgroundColor + 'B3' }; // 70% opacity
        cardBorderStyle = { borderColor: playerColorClasses.customStyleFull.backgroundColor + '66' }; // 40% opacity
      } else {
        cardColorClass = `${playerColorClasses.cardBg} ${playerColorClasses.cardBorder}`;
      }
    } else {
      cardColorClass = 'bg-purple-600 bg-opacity-70 border-purple-400';
    }

    return (
      <div 
        key={card._id || index} 
        className={`group relative rounded-lg p-2 text-white text-xs shadow-md border ${cardColorClass} ${hasModification ? 'ring-1 ring-yellow-300' : ''} ${isHandCard ? 'w-20 h-28' : ''}`}
        style={cardColorClass === '' ? { ...cardBgStyle, ...cardBorderStyle } : {}}
      >
        <div className="font-semibold text-center mb-1">{card.name}</div>
        <div className="text-center text-xs mb-1">费用: {card.cost}</div>
        {card.type === 'character' && (
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
        {isHandCard && (
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
        {!isHandCard && !isOpponentCard && (
          <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-1">
            <button
              onClick={(e) => { 
                e.stopPropagation(); 
                openCardDetailModal(card);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-1 py-1 rounded text-xs"
            >
              查看
            </button>
            {card.type === 'character' && zone && (
              <button
                onClick={() => openModifyModal(card, index!, zone)}
                className="bg-yellow-600 hover:bg-yellow-700 text-white px-1 py-1 rounded text-xs"
              >
                修改
              </button>
            )}
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
          <div className={`${opponentColorClasses.textSecondary} text-sm`}
               style={opponentColorClasses.customStyle && typeof opponentColorClasses.customStyle === 'object' ? { color: opponentColorClasses.customStyle.color } : {}}>
            牌桌: {opponent?.battlefield?.length || 0}/{opponentBattlefieldSlots} | 效果区: {opponent?.effectZone?.length || 0}/{opponentEffectSlots}
          </div>
        </div>
        
        {/* 对手持续效果区域 - 移到牌桌上方 */}
        <div className={`${opponentColorClasses.bgOpacityHigh} rounded-lg p-3 mb-3`}
             style={opponentColorClasses.customStyle && typeof opponentColorClasses.customStyle === 'object' ? { backgroundColor: opponentColorClasses.customStyle.backgroundColor } : {}}>
          <div className={`${opponentColorClasses.text} text-sm mb-2 text-center`}
               style={opponentColorClasses.customStyle && typeof opponentColorClasses.customStyle === 'object' ? { color: opponentColorClasses.customStyle.color } : {}}>对手持续效果区域</div>
          <div className="grid grid-cols-6 gap-2 min-h-20" style={{ gridTemplateColumns: `repeat(${opponentEffectSlots}, minmax(0, 1fr))` }}>
            {Array.from({ length: opponentEffectSlots }).map((_, index) => {
              const card = opponent?.effectZone?.[index];
              if (card) {
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
              if (card) {
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
              style={playerColorClasses.customStyle && typeof playerColorClasses.customStyle === 'object' ? { color: playerColorClasses.customStyle.color } : {}}>我的牌桌区域</h3>
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
              onClick={() => setShowAddCardModal(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm transition-colors"
            >
              添加卡牌
            </button>
            <button
              onClick={handleSearchDeck}
              className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded text-sm transition-colors"
            >
              搜索牌堆
            </button>
          </div>
        </div>
        
        <div className={`grid gap-2 min-h-32 mb-4`} style={{ gridTemplateColumns: `repeat(${currentBattlefieldSlots}, minmax(0, 1fr))` }}>
          {Array.from({ length: currentBattlefieldSlots }).map((_, index) => {
            const card = currentPlayer?.battlefield[index];
            if (card) {
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
                style={playerColorClasses.customStyle && typeof playerColorClasses.customStyle === 'object' ? { color: playerColorClasses.customStyle.color } : {}}>我的持续效果区域</h4>
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
          </div>
          <div className={`grid gap-2 min-h-24`} style={{ gridTemplateColumns: `repeat(${currentEffectSlots}, minmax(0, 1fr))` }}>
            {Array.from({ length: currentEffectSlots }).map((_, index) => {
              const card = currentPlayer?.effectZone?.[index];
              if (card) {
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
          <h4 className={`${playerColorClasses.text} font-semibold mb-2`}
              style={playerColorClasses.customStyle && typeof playerColorClasses.customStyle === 'object' ? { color: playerColorClasses.customStyle.color } : {}}>手牌区域</h4>
          <div className="grid grid-cols-10 gap-1 relative z-50">
            {currentPlayer?.hand.map((card, index) => renderCard(card, true, index))}
          </div>
        </div>
      </div>

      {/* 弃牌堆查看 */}
      <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-4">
        <div className="flex justify-between items-center">
          <h3 className="text-white font-semibold">弃牌堆</h3>
          <button
            onClick={() => setShowGraveyardModal(true)}
            className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm transition-colors"
          >
            查看弃牌堆
          </button>
        </div>
      </div>

      {/* 卡牌详情模态框 */}
      {showCardDetailModal && viewingCard && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[9999]">
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
                
                {viewingCard.type === 'character' && (
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
              {currentPlayer?.graveyard.map((card, index) => (
                <div 
                  key={index} 
                  className="bg-gray-700 rounded-lg p-3 text-white text-xs shadow-lg border border-gray-500 cursor-pointer hover:bg-gray-600 group relative"
                >
                  <div className="font-semibold text-center mb-1">{card.name}</div>
                  <div className="text-center text-xs mb-1">费用: {card.cost}</div>
                  {card.type === 'character' && (
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

      {/* 添加卡牌模态框 */}
      {showAddCardModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-xl font-bold text-white mb-4">添加卡牌到牌堆</h3>
            
            <input
              type="text"
              value={newCardData.name}
              onChange={(e) => setNewCardData({ ...newCardData, name: e.target.value })}
              className="w-full px-3 py-2 bg-white bg-opacity-10 border border-gray-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
              placeholder="卡牌名称"
            />
            <select
              value={newCardData.type}
              onChange={(e) => setNewCardData({ ...newCardData, type: e.target.value as 'story' | 'character' | 'hero' })}
              className="w-full px-3 py-2 bg-white bg-opacity-10 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
            >
              <option value="story" style={{ backgroundColor: '#374151', color: 'white' }}>故事牌</option>
              <option value="character" style={{ backgroundColor: '#374151', color: 'white' }}>配角牌</option>
              <option value="hero" style={{ backgroundColor: '#374151', color: 'white' }}>主角牌</option>
            </select>
            <input
              type="text"
              value={newCardData.cost}
              onChange={(e) => setNewCardData({ ...newCardData, cost: e.target.value })}
              className="w-full px-3 py-2 bg-white bg-opacity-10 border border-gray-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
              placeholder="费用"
            />
            {newCardData.type === 'character' && (
              <>
                <input
                  type="number"
                  value={newCardData.attack}
                  onChange={(e) => setNewCardData({ ...newCardData, attack: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-white bg-opacity-10 border border-gray-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                  placeholder="攻击力"
                />
                <input
                  type="number"
                  value={newCardData.health}
                  onChange={(e) => setNewCardData({ ...newCardData, health: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-white bg-opacity-10 border border-gray-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                  placeholder="生命值"
                />
              </>
            )}
            <textarea
              value={newCardData.effect}
              onChange={(e) => setNewCardData({ ...newCardData, effect: e.target.value })}
              className="w-full px-3 py-2 bg-white bg-opacity-10 border border-gray-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4 resize-none"
              placeholder="卡牌效果"
              rows={3}
            />
            
            <div className="flex space-x-3">
              <button
                onClick={() => setShowAddCardModal(false)}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleAddCardToDeck}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded transition-colors"
              >
                添加
              </button>
            </div>
          </div>
        </div>
      )}

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
            <h3 className="text-xl font-bold text-white mb-4 text-center">搜索牌堆</h3>
            <p className="text-gray-300 text-center mb-6">从牌堆中选择一张卡牌加入手牌</p>
            
            <div className="grid grid-cols-4 gap-4 max-h-96 overflow-y-auto mb-4">
              {deckSearchResults.map((card, index) => (
                <div 
                  key={index} 
                  className="bg-blue-600 bg-opacity-70 border border-blue-400 rounded-lg p-3 text-white text-xs shadow-lg cursor-pointer hover:bg-blue-500 group relative"
                >
                  <div className="font-semibold text-center mb-1">{card.name}</div>
                  <div className="text-center text-xs mb-1">费用: {card.cost}</div>
                  {card.type === 'character' && (
                    <div className="text-center text-xs">
                      攻: {card.attack} / 生命: {card.health}
                    </div>
                  )}
                  <div className="text-xs text-center mt-1 truncate">{card.effect || '无效果'}</div>
                  
                  {/* 选择按钮 */}
                  <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      onClick={() => handleDrawSpecificCard(card, index)}
                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-sm"
                    >
                      抽取此牌
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setShowSearchDeckModal(false)}
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
    </div>
  );
};

export default GameBoard;
