import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
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
  const [showInsufficientManaModal, setShowInsufficientManaModal] = useState(false); // 新增：费用不足模态框
  const [insufficientManaInfo, setInsufficientManaInfo] = useState<{ required: number; current: number; cardName: string } | null>(null); // 费用不足信息
  
  // 展示手牌确认模态框相关状态
  const [showDisplayHandConfirmModal, setShowDisplayHandConfirmModal] = useState(false);
  const [displayHandConfirmData, setDisplayHandConfirmData] = useState<{
    type: 'all' | 'selected';
    cards: Card[];
    count: number;
  } | null>(null);
  
  // 右键菜单相关状态
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [contextMenuZone, setContextMenuZone] = useState<'battlefield' | 'effect' | null>(null);
  const [contextMenuPosition_slot, setContextMenuPosition_slot] = useState<number | null>(null);
  
  // 卡牌右键菜单相关状态
  const [showCardContextMenu, setShowCardContextMenu] = useState(false);
  const [cardContextMenuPosition, setCardContextMenuPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [cardContextMenuData, setCardContextMenuData] = useState<{
    card: Card | ModifiedCard;
    index: number;
    zone: 'hand' | 'battlefield' | 'effect';
  } | null>(null);
  
  // 战斗相关状态
  const [showBattleModal, setShowBattleModal] = useState(false);
  const [battleData, setBattleData] = useState<{
    attacker: { card: ModifiedCard; index: number; zone: 'battlefield' | 'effect' };
    defender: { card: ModifiedCard; index: number; zone: 'battlefield' | 'effect' };
    attackerDamage: number;
    defenderDamage: number;
    attackerWillDie: boolean;
    defenderWillDie: boolean;
  } | null>(null);
  
  // 攻击玩家相关状态
  const [showAttackPlayerModal, setShowAttackPlayerModal] = useState(false);
  const [attackPlayerData, setAttackPlayerData] = useState<{
    attacker: { card: ModifiedCard; index: number; zone: 'battlefield' | 'effect' };
    damage: number;
  } | null>(null);
  
  // 拖拽相关状态
  const [draggedCard, setDraggedCard] = useState<{
    card: Card | ModifiedCard;
    sourceIndex: number;
    sourceZone: 'hand' | 'battlefield' | 'effect';
  } | null>(null);
  const [dragOverZone, setDragOverZone] = useState<{
    zone: 'battlefield' | 'effect' | 'graveyard' | 'deck-top' | 'deck-bottom' | 'deck-random' | 'hand';
    position?: number;
  } | null>(null);
  const [showRemoveCardModal, setShowRemoveCardModal] = useState(false);
  const [pendingRemoveCard, setPendingRemoveCard] = useState<{
    card: Card | ModifiedCard;
    sourceIndex: number;
    sourceZone: 'hand' | 'battlefield' | 'effect';
  } | null>(null);
  
  // 拖拽动画相关状态
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
  const [dragStartPosition, setDragStartPosition] = useState<{ x: number; y: number } | null>(null);
  
  
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
        setInsufficientManaInfo({
          required: cardCost,
          current: currentPlayer.mana,
          cardName: card.name
        });
        setShowInsufficientManaModal(true);
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

  const openCardDetailModal = (card: Card, index?: number, zone?: 'battlefield' | 'effect' | 'graveyard' | 'hand' | 'deck') => {
    setViewingCard(card);
    // 如果提供了位置信息，设置editingCardNote以便在详情模态框中显示备注按钮
    if (index !== undefined && zone && !isSpectator) {
      setEditingCardNote({ card: card as ModifiedCard, index, zone });
    } else {
      setEditingCardNote(null);
    }
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

  // 拖拽事件处理函数
  const handleDragStart = (e: React.DragEvent, card: Card | ModifiedCard, index: number, zone: 'hand' | 'battlefield' | 'effect') => {
    if (isSpectator) return; // 观战模式下不允许拖拽
    
    setDraggedCard({ card, sourceIndex: index, sourceZone: zone });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', ''); // 为了兼容性
    
    // 记录拖拽开始位置
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setDragStartPosition({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
    
    // 设置拖拽时的鼠标样式为抓取
    const dragElement = e.currentTarget as HTMLElement;
    dragElement.style.cursor = 'grabbing';
    
    // 创建自定义拖拽图像（透明的，这样我们可以用自己的动画）
    const dragImage = new Image();
    dragImage.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=';
    e.dataTransfer.setDragImage(dragImage, 0, 0);
  };

  const handleDragOver = (e: React.DragEvent, zone: 'battlefield' | 'effect', position: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverZone({ zone, position });
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // 只有当鼠标真正离开目标区域时才清除高亮
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverZone(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetZone: 'battlefield' | 'effect', targetPosition: number) => {
    e.preventDefault();
    setDragOverZone(null);
    
    if (!draggedCard) return;

    const { card, sourceIndex, sourceZone } = draggedCard;

    // 检查目标位置是否已被占用
    const targetArea = targetZone === 'battlefield' ? currentPlayer?.battlefield : currentPlayer?.effectZone;
    
    // 修复：正确检查目标位置是否被占用
    // 如果目标位置超出数组长度，或者位置为null/undefined，则认为是空位
    const isTargetOccupied = targetArea && targetPosition < targetArea.length && 
                            targetArea[targetPosition] !== null && targetArea[targetPosition] !== undefined;
    
    // 特殊情况：如果是同区域内移动，且目标位置就是源位置，则允许（实际上不会有任何变化）
    const isSamePosition = sourceZone === targetZone && sourceIndex === targetPosition;
    
    if (isTargetOccupied && !isSamePosition) {
      alert('目标位置已被占用！');
      setDraggedCard(null);
      return;
    }

    // 处理不同的拖拽情况
    if (sourceZone === 'hand') {
      // 手牌拖拽到牌桌/效果区域
      // 检查费用
      if (currentPlayer && card.cost !== 'X') {
        const cardCost = parseInt(card.cost);
        if (currentPlayer.mana < cardCost) {
          setInsufficientManaInfo({
            required: cardCost,
            current: currentPlayer.mana,
            cardName: card.name
          });
          setShowInsufficientManaModal(true);
          setDraggedCard(null);
          return;
        }
      }
      
      onGameAction('play-card', { 
        card, 
        handIndex: sourceIndex, 
        zone: targetZone,
        position: targetPosition 
      });
    } else if (sourceZone === targetZone) {
      // 同区域内移动卡牌
      // 如果是拖拽到同一位置，则不执行任何操作
      if (sourceIndex !== targetPosition) {
        onGameAction('move-card-in-zone', {
          zone: sourceZone,
          fromPosition: sourceIndex,
          toPosition: targetPosition
        });
      }
    } else {
      // 不同区域间移动（牌桌 <-> 效果区域）
      onGameAction('move-card-between-zones', {
        fromZone: sourceZone,
        toZone: targetZone,
        fromPosition: sourceIndex,
        toPosition: targetPosition
      });
    }

    setDraggedCard(null);
  };

  // 处理拖拽到对方卡牌上的战斗
  const handleDropOnOpponentCard = (e: React.DragEvent, targetCard: ModifiedCard, targetIndex: number, targetZone: 'battlefield' | 'effect') => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedCard || isSpectator) return;

    const { card: attackerCard, sourceIndex, sourceZone } = draggedCard;
    
    // 只有配角牌可以攻击
    if (attackerCard.type !== '配角牌') {
      alert('只有配角牌可以进行攻击！');
      setDraggedCard(null);
      return;
    }

    // 只有对方的配角牌可以被攻击
    if (targetCard.type !== '配角牌') {
      alert('只能攻击对方的配角牌！');
      setDraggedCard(null);
      return;
    }

    // 计算战斗伤害
    const attackerAttack = (attackerCard as ModifiedCard).modifiedAttack !== undefined ? 
                          (attackerCard as ModifiedCard).modifiedAttack : (attackerCard.attack || 0);
    const attackerHealth = (attackerCard as ModifiedCard).modifiedHealth !== undefined ? 
                          (attackerCard as ModifiedCard).modifiedHealth : (attackerCard.health || 0);
    const defenderAttack = targetCard.modifiedAttack !== undefined ? 
                          targetCard.modifiedAttack : (targetCard.attack || 0);
    const defenderHealth = targetCard.modifiedHealth !== undefined ? 
                          targetCard.modifiedHealth : (targetCard.health || 0);

    const attackerDamage = Math.max(0, defenderAttack || 0); // 攻击者受到的伤害
    const defenderDamage = Math.max(0, attackerAttack || 0); // 防御者受到的伤害

    const attackerWillDie = (attackerHealth || 0) <= attackerDamage;
    const defenderWillDie = (defenderHealth || 0) <= defenderDamage;

    setBattleData({
      attacker: { card: attackerCard as ModifiedCard, index: sourceIndex, zone: sourceZone as 'battlefield' | 'effect' },
      defender: { card: targetCard, index: targetIndex, zone: targetZone },
      attackerDamage,
      defenderDamage,
      attackerWillDie,
      defenderWillDie
    });
    setShowBattleModal(true);
    setDraggedCard(null);
  };

  // 处理拖拽到对方玩家信息上的攻击
  const handleDropOnOpponentPlayer = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedCard || isSpectator) return;

    const { card: attackerCard, sourceIndex, sourceZone } = draggedCard;
    
    // 只有配角牌可以攻击玩家
    if (attackerCard.type !== '配角牌') {
      alert('只有配角牌可以攻击玩家！');
      setDraggedCard(null);
      return;
    }

    // 计算攻击伤害
    const attackerAttack = (attackerCard as ModifiedCard).modifiedAttack !== undefined ? 
                          (attackerCard as ModifiedCard).modifiedAttack : (attackerCard.attack || 0);

    setAttackPlayerData({
      attacker: { card: attackerCard as ModifiedCard, index: sourceIndex, zone: sourceZone as 'battlefield' | 'effect' },
      damage: attackerAttack || 0
    });
    setShowAttackPlayerModal(true);
    setDraggedCard(null);
  };

  // 确认战斗结果
  const handleConfirmBattle = () => {
    if (!battleData) return;

    onGameAction('card-battle', {
      attacker: battleData.attacker,
      defender: battleData.defender,
      attackerDamage: battleData.attackerDamage,
      defenderDamage: battleData.defenderDamage,
      attackerWillDie: battleData.attackerWillDie,
      defenderWillDie: battleData.defenderWillDie
    });

    setShowBattleModal(false);
    setBattleData(null);
  };

  // 确认攻击玩家
  const handleConfirmAttackPlayer = () => {
    if (!attackPlayerData) return;

    onGameAction('attack-player', {
      attacker: attackPlayerData.attacker,
      damage: attackPlayerData.damage
    });

    setShowAttackPlayerModal(false);
    setAttackPlayerData(null);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    // 检查是否拖拽到牌桌区域外
    if (draggedCard) {
      const x = e.clientX;
      const y = e.clientY;
      
      // 获取游戏区域的边界
      const gameArea = document.querySelector('.space-y-4') as HTMLElement;
      if (gameArea) {
        const rect = gameArea.getBoundingClientRect();
        
        // 如果拖拽位置超出了游戏区域边界，视为要删除卡牌
        if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
          setPendingRemoveCard({
            card: draggedCard.card,
            sourceIndex: draggedCard.sourceIndex,
            sourceZone: draggedCard.sourceZone
          });
          setShowRemoveCardModal(true);
        }
      }
    }
    
    // 清理拖拽状态和动画
    setDraggedCard(null);
    setDragOverZone(null);
    setDragPosition(null);
    setDragStartPosition(null);
    
    // 移除全局鼠标移动监听器
    document.removeEventListener('dragover', handleGlobalDragOver);
  };

  // 全局拖拽移动处理
  const handleGlobalDragOver = (e: DragEvent) => {
    if (draggedCard && dragStartPosition) {
      setDragPosition({ x: e.clientX, y: e.clientY });
    }
  };

  // 添加和移除全局拖拽监听器
  React.useEffect(() => {
    if (draggedCard) {
      document.addEventListener('dragover', handleGlobalDragOver);
      return () => {
        document.removeEventListener('dragover', handleGlobalDragOver);
      };
    }
  }, [draggedCard, dragStartPosition]);

  // 处理右键菜单
  const handleContextMenu = (e: React.MouseEvent, zone: 'battlefield' | 'effect', position?: number) => {
    if (isSpectator) return; // 观战模式下不显示右键菜单
    
    e.preventDefault();
    e.stopPropagation();
    
    // 先关闭所有其他菜单
    closeCardContextMenu();
    
    // 检查是否点击的是空位置
    const targetArea = zone === 'battlefield' ? currentPlayer?.battlefield : currentPlayer?.effectZone;
    const isEmptySlot = position !== undefined && (!targetArea || !targetArea[position]);
    
    if (isEmptySlot) {
      setContextMenuPosition({ x: e.clientX, y: e.clientY });
      setContextMenuZone(zone);
      setContextMenuPosition_slot(position);
      setShowContextMenu(true);
    }
  };

  // 关闭右键菜单
  const closeContextMenu = () => {
    setShowContextMenu(false);
    setContextMenuZone(null);
    setContextMenuPosition_slot(null);
  };

  // 处理右键菜单中的添加卡牌
  const handleContextMenuAddCard = () => {
    setShowAdvancedAddCardModal(true);
    closeContextMenu();
  };

  // 处理卡牌右键菜单
  const handleCardContextMenu = (e: React.MouseEvent, card: Card | ModifiedCard, index: number, zone: 'hand' | 'battlefield' | 'effect') => {
    if (isSpectator) return; // 观战模式下不显示右键菜单
    
    e.preventDefault();
    e.stopPropagation();
    
    // 先关闭所有其他菜单
    closeContextMenu();
    
    setCardContextMenuPosition({ x: e.clientX, y: e.clientY });
    setCardContextMenuData({ card, index, zone });
    setShowCardContextMenu(true);
  };

  // 关闭卡牌右键菜单
  const closeCardContextMenu = () => {
    setShowCardContextMenu(false);
    setCardContextMenuData(null);
  };

  // 点击其他地方关闭右键菜单
  React.useEffect(() => {
    const handleClickOutside = () => {
      if (showContextMenu) {
        closeContextMenu();
      }
      if (showCardContextMenu) {
        closeCardContextMenu();
      }
    };

    document.addEventListener('click', handleClickOutside);
    document.addEventListener('contextmenu', handleClickOutside);
    
    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('contextmenu', handleClickOutside);
    };
  }, [showContextMenu, showCardContextMenu]);

  // 处理卡牌右键菜单中的复制
  const handleCardContextMenuCopy = () => {
    if (!cardContextMenuData) return;
    
    const { index, zone } = cardContextMenuData;
    
    if (zone === 'hand') {
      onGameAction('copy-hand-card', { handIndex: index });
    } else if (zone === 'battlefield') {
      onGameAction('copy-battlefield-card', { cardIndex: index });
    } else if (zone === 'effect') {
      onGameAction('copy-effect-card', { cardIndex: index });
    }
    
    closeCardContextMenu();
  };

  // 处理卡牌右键菜单中的多选（仅手牌）
  const handleCardContextMenuMultiSelect = () => {
    if (!cardContextMenuData) return;
    
    setShowMultiSelectModal(true);
    closeCardContextMenu();
  };

  // 处理删除卡牌确认
  const handleConfirmRemoveCard = () => {
    if (pendingRemoveCard) {
      if (pendingRemoveCard.sourceZone === 'hand') {
        handleRemoveCard(pendingRemoveCard.card as Card, pendingRemoveCard.sourceIndex);
      } else {
        // 对于场上的卡牌，也可以删除
        onGameAction('remove-card-from-field', { 
          cardIndex: pendingRemoveCard.sourceIndex, 
          zone: pendingRemoveCard.sourceZone 
        });
      }
    }
    setShowRemoveCardModal(false);
    setPendingRemoveCard(null);
  };

  const handleCancelRemoveCard = () => {
    setShowRemoveCardModal(false);
    setPendingRemoveCard(null);
  };

  const renderCard = (card: ModifiedCard | null, isHandCard: boolean = false, index?: number, isOpponentCard: boolean = false, zone?: 'battlefield' | 'effect') => {
    if (!card) return null;
    
    // 检查是否正在拖拽这张卡牌
    const isBeingDragged = draggedCard && 
                          draggedCard.sourceIndex === index && 
                          draggedCard.sourceZone === (zone || (isHandCard ? 'hand' : 'battlefield')) &&
                          draggedCard.card._id === card._id;
    
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

    // 根据区域和是否为对手卡牌决定尺寸
    let cardSizeClass = '';
    if (isHandCard) {
      cardSizeClass = 'w-20 h-28';
    } else if (isOpponentCard) {
      // 对手区域的卡牌使用与空位置相同的尺寸
      if (zone === 'battlefield') {
        cardSizeClass = 'w-full min-h-32';
      } else if (zone === 'effect') {
        cardSizeClass = 'w-full min-h-20';
      }
    } else {
      // 自己区域的卡牌保持原有尺寸
      cardSizeClass = '';
    }

    // 处理左键点击查看详情
    const handleLeftClick = (e: React.MouseEvent) => {
      // 只有在不是右键点击时才处理
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      openCardDetailModal(card, index, zone || (isHandCard ? 'hand' : 'battlefield'));
    };

    // 处理右键点击显示菜单
    const handleRightClick = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (isSpectator || isOpponentCard) {
        e.preventDefault(); // 确保阻止默认菜单
        return;
      }
      
      // 显示卡牌右键菜单
      if (index !== undefined) {
        handleCardContextMenu(e, card, index, zone || (isHandCard ? 'hand' : 'battlefield'));
      }
      
      // 确保阻止默认右键菜单
      return false;
    };

    return (
      <div 
        key={card._id || index} 
        className={`group relative rounded-lg p-2 text-white text-xs shadow-md border ${cardColorClass} ${hasModification ? 'ring-1 ring-yellow-300' : ''} ${displayHighlight} ${cardSizeClass} ${!isSpectator && !isOpponentCard ? 'cursor-pointer hover:cursor-grab active:cursor-grabbing' : 'cursor-pointer'} ${isBeingDragged ? 'opacity-30' : ''} ${isOpponentCard ? 'flex flex-col justify-between' : ''}`}
        style={cardColorClass === '' ? { ...cardBgStyle, ...cardBorderStyle } : {}}
        draggable={!isSpectator && !isOpponentCard}
        onDragStart={(e) => !isSpectator && !isOpponentCard && index !== undefined && handleDragStart(e, card, index, zone || (isHandCard ? 'hand' : 'battlefield'))}
        onDragEnd={handleDragEnd}
        onClick={handleLeftClick}
        onContextMenu={handleRightClick}
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
        <div className="text-xs text-center mt-1 truncate whitespace-pre-wrap">{card.effect || '无效果'}</div>



        {/* 观战模式下场上卡牌只显示查看按钮 */}
        {!isHandCard && !isOpponentCard && isSpectator && (
          <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">

          </div>
        )}

        {/* 对手牌桌区域的查看按钮 */}
        {!isHandCard && isOpponentCard && (
          <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">

          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* 拖拽中的卡牌动画 - 使用 Portal 渲染到 body */}
      {draggedCard && dragPosition && dragStartPosition && ReactDOM.createPortal(
        <div 
          className="fixed pointer-events-none z-[10001]"
          style={{
            left: dragPosition.x - 40, // 卡牌宽度的一半
            top: dragPosition.y - 56,  // 卡牌高度的一半
            transform: `rotate(${Math.sin((dragPosition.x - dragStartPosition.x) * 0.01) * 5}deg) scale(1.1)`,
            transition: 'transform 0.1s ease-out',
          }}
        >
          <div className="w-20 h-28 bg-gradient-to-b from-blue-600 to-blue-800 border-2 border-blue-400 rounded-lg p-2 text-white text-xs shadow-2xl animate-pulse">
            <div className="font-semibold text-center mb-1 truncate">{draggedCard.card.name}</div>
            <div className="text-center text-xs mb-1">费用: {draggedCard.card.cost}</div>
            {draggedCard.card.type === '配角牌' && (
              <div className="text-center text-xs">
                攻: {draggedCard.card.attack} / 生命: {draggedCard.card.health}
              </div>
            )}
            <div className="text-xs text-center mt-1 truncate">{draggedCard.card.effect || '无效果'}</div>
            
            {/* 拖拽轨迹效果 */}
            <div className="absolute inset-0 bg-blue-400 opacity-20 rounded-lg animate-ping"></div>
          </div>
          
          {/* 拖拽方向指示器 */}
          <div 
            className="absolute -bottom-2 -right-2 w-4 h-4 bg-yellow-400 rounded-full animate-bounce"
            style={{
              transform: `translate(${(dragPosition.x - dragStartPosition.x) * 0.1}px, ${(dragPosition.y - dragStartPosition.y) * 0.1}px)`,
            }}
          ></div>
        </div>,
        document.body
      )}
      
      <div className="space-y-4">
      {/* 对手区域 */}
      <div className={`${opponentColorClasses.bgOpacity} border ${opponentColorClasses.border} backdrop-blur-md rounded-xl p-4 mb-4`}
           style={opponentColorClasses.customStyle && typeof opponentColorClasses.customStyle === 'object' ? { backgroundColor: opponentColorClasses.customStyle.backgroundColor, borderColor: opponentColorClasses.customStyle.borderColor } : {}}
           onDragOver={(e) => {
             if (draggedCard && draggedCard.card.type === '配角牌') {
               e.preventDefault();
               e.dataTransfer.dropEffect = 'move';
             }
           }}
           onDrop={handleDropOnOpponentPlayer}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            {/* 对手头像 */}
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center shadow-lg border-2 border-red-400">
              <span className="text-white font-bold text-lg">
                {(opponent?.username || '对手').charAt(0).toUpperCase()}
              </span>
            </div>
            <h3 className={`${opponentColorClasses.text} font-semibold text-lg`}
                style={opponentColorClasses.customStyle && typeof opponentColorClasses.customStyle === 'object' ? { color: opponentColorClasses.customStyle.color } : {}}>
              {opponent?.username || '对手'} 的牌桌区域
            </h3>
          </div>
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
                  <div className="text-xs text-center mt-1 truncate whitespace-pre-wrap">{card.effect || '无效果'}</div>
                  
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
          <div className="grid gap-2 min-h-20" style={{ gridTemplateColumns: `repeat(${opponentEffectSlots}, minmax(0, 1fr))` }}>
            {Array.from({ length: opponentEffectSlots }).map((_, index) => {
              const card = opponent?.effectZone?.[index];
              if (card && card !== null) {
                return (
                  <div
                    key={`opponent-effect-${index}`}
                    className="min-h-20 flex items-stretch"
                  >
                    <div className="w-full">
                      {renderCard(card, false, index, true, 'effect')}
                    </div>
                  </div>
                );
              } else {
                return (
                  <div key={`empty-opponent-effect-${index}`} className={`${opponentColorClasses.bgOpacityHigh} border ${opponentColorClasses.borderDashed} rounded-lg min-h-20 flex items-center justify-center`}
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
          <div className="grid gap-2 min-h-32" style={{ gridTemplateColumns: `repeat(${opponentBattlefieldSlots}, minmax(0, 1fr))` }}>
            {Array.from({ length: opponentBattlefieldSlots }).map((_, index) => {
              const card = opponent?.battlefield?.[index];
              if (card && card !== null) {
                return (
                  <div
                    key={`opponent-battlefield-${index}`}
                    className="min-h-32 flex items-stretch"
                    onDragOver={(e) => {
                      if (draggedCard && draggedCard.card.type === '配角牌') {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                      }
                    }}
                    onDrop={(e) => handleDropOnOpponentCard(e, card, index, 'battlefield')}
                  >
                    <div className="w-full">
                      {renderCard(card, false, index, true, 'battlefield')}
                    </div>
                  </div>
                );
              } else {
                return (
                  <div key={`empty-opponent-battlefield-${index}`} className={`${opponentColorClasses.bgOpacityHigh} border ${opponentColorClasses.borderDashed} rounded-lg min-h-32 flex items-center justify-center`}
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

            </div>
          )}
        </div>
        
        <div className={`grid gap-2 min-h-32 mb-4`} style={{ gridTemplateColumns: `repeat(${currentBattlefieldSlots}, minmax(0, 1fr))` }}>
          {Array.from({ length: currentBattlefieldSlots }).map((_, index) => {
            const card = currentPlayer?.battlefield[index];
            if (card && card !== null) {
              return renderCard(card, false, index, false, 'battlefield');
            } else {
              const isDragOver = dragOverZone?.zone === 'battlefield' && dragOverZone?.position === index;
                return (
                  <div 
                    key={`empty-battlefield-${index}`} 
                    className={`bg-white bg-opacity-5 border border-dashed border-gray-500 rounded-lg min-h-24 flex items-center justify-center transition-colors ${
                      isDragOver ? 'bg-blue-500 bg-opacity-30 border-blue-400' : ''
                    } ${!isSpectator ? 'hover:bg-white hover:bg-opacity-10' : ''}`}
                    onDragOver={(e) => !isSpectator && handleDragOver(e, 'battlefield', index)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => !isSpectator && handleDrop(e, 'battlefield', index)}
                    onContextMenu={(e) => handleContextMenu(e, 'battlefield', index)}
                  >
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
                const isDragOver = dragOverZone?.zone === 'effect' && dragOverZone?.position === index;
                return (
                  <div 
                    key={`empty-effect-${index}`} 
                    className={`bg-white bg-opacity-5 border border-dashed border-purple-500 rounded-lg min-h-20 flex items-center justify-center transition-colors ${
                      isDragOver ? 'bg-purple-500 bg-opacity-30 border-purple-400' : ''
                    } ${!isSpectator ? 'hover:bg-white hover:bg-opacity-10' : ''}`}
                    onDragOver={(e) => !isSpectator && handleDragOver(e, 'effect', index)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => !isSpectator && handleDrop(e, 'effect', index)}
                    onContextMenu={(e) => handleContextMenu(e, 'effect', index)}
                  >
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
          </div>
          
          {/* 手牌区域布局：左侧弃牌区 + 中间手牌 + 右侧牌堆区 */}
          <div className="flex gap-2 relative z-50">
            {/* 左侧弃牌区域 */}
            {!isSpectator && (
              <div 
                className={`w-20 h-28 border-2 border-dashed border-red-500 rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors ${
                  dragOverZone?.zone === 'graveyard' ? 'bg-red-500 bg-opacity-30 border-red-400' : 'bg-red-600 bg-opacity-20 hover:bg-red-500 hover:bg-opacity-30'
                }`}
                onClick={() => setShowGraveyardModal(true)}
                onDragOver={(e) => {
                  if (!isSpectator && draggedCard && (draggedCard.sourceZone === 'hand' || draggedCard.sourceZone === 'battlefield' || draggedCard.sourceZone === 'effect')) {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    setDragOverZone({ zone: 'graveyard' });
                  }
                }}
                onDragLeave={(e) => {
                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  const x = e.clientX;
                  const y = e.clientY;
                  if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
                    setDragOverZone(null);
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverZone(null);
                  if (draggedCard) {
                    if (draggedCard.sourceZone === 'hand') {
                      handleCardDiscard(draggedCard.card as Card, draggedCard.sourceIndex);
                    } else if (draggedCard.sourceZone === 'battlefield' || draggedCard.sourceZone === 'effect') {
                      // 从场上直接弃牌
                      onGameAction('discard-from-field', { 
                        cardIndex: draggedCard.sourceIndex, 
                        zone: draggedCard.sourceZone 
                      });
                    }
                    setDraggedCard(null);
                  }
                }}
              >
                <div className="text-red-300 text-xs font-bold mb-1">弃牌区</div>
                <div className="text-red-200 text-xs">({currentPlayer?.graveyard?.length || 0})</div>
                <div className="text-red-200 text-xs mt-1">拖拽弃牌</div>
              </div>
            )}
            
            {/* 中间手牌区域 */}
            <div 
              className={`flex-1 grid grid-cols-10 gap-1 min-h-28 border-2 border-dashed border-transparent rounded-lg transition-colors ${
                dragOverZone?.zone === 'hand' ? 'border-green-400 bg-green-500 bg-opacity-20' : ''
              } ${!isSpectator ? 'hover:border-green-300 hover:border-opacity-50' : ''}`}
              onDragOver={(e) => {
                if (!isSpectator && draggedCard && (draggedCard.sourceZone === 'battlefield' || draggedCard.sourceZone === 'effect')) {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  setDragOverZone({ zone: 'hand' });
                }
              }}
              onDragLeave={(e) => {
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                const x = e.clientX;
                const y = e.clientY;
                if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
                  setDragOverZone(null);
                }
              }}
              onDrop={(e) => {
                if (!isSpectator && draggedCard && (draggedCard.sourceZone === 'battlefield' || draggedCard.sourceZone === 'effect')) {
                  e.preventDefault();
                  setDragOverZone(null);
                  onGameAction('return-card-from-field', { 
                    cardIndex: draggedCard.sourceIndex, 
                    zone: draggedCard.sourceZone 
                  });
                  setDraggedCard(null);
                }
              }}
            >
              {currentPlayer?.hand.map((card: any, index: number) => renderCard(card, true, index, isSpectator))}
              {/* 当手牌为空且有卡牌拖拽到此区域时显示提示 */}
              {(!currentPlayer?.hand || currentPlayer.hand.length === 0) && dragOverZone?.zone === 'hand' && (
                <div className="col-span-10 flex items-center justify-center text-green-300 text-sm font-semibold">
                  松开鼠标将卡牌返回手牌
                </div>
              )}
            </div>
            
            {/* 右侧牌堆区域 */}
            {!isSpectator && (
              <div className="flex gap-2">
                {/* 牌堆随机插入区域 */}
                <div 
                  className={`w-20 h-28 border-2 border-dashed border-purple-500 rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors ${
                    dragOverZone?.zone === 'deck-random' ? 'bg-purple-500 bg-opacity-30 border-purple-400' : 'bg-purple-600 bg-opacity-20 hover:bg-purple-500 hover:bg-opacity-30'
                  }`}
                  onClick={handleDrawCard}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleShuffle();
                  }}
                  onDragOver={(e) => {
                    if (!isSpectator && draggedCard && (draggedCard.sourceZone === 'hand' || draggedCard.sourceZone === 'battlefield' || draggedCard.sourceZone === 'effect')) {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      setDragOverZone({ zone: 'deck-random' });
                    }
                  }}
                  onDragLeave={(e) => {
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                    const x = e.clientX;
                    const y = e.clientY;
                    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
                      setDragOverZone(null);
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOverZone(null);
                    if (draggedCard) {
                      if (draggedCard.sourceZone === 'hand') {
                        // 手牌随机插入牌堆
                        onGameAction('return-to-deck', { 
                          card: draggedCard.card, 
                          handIndex: draggedCard.sourceIndex, 
                          position: 'random' 
                        });
                      } else if (draggedCard.sourceZone === 'battlefield' || draggedCard.sourceZone === 'effect') {
                        // 从场上随机插入牌堆
                        onGameAction('return-card-from-field-to-deck', { 
                          cardIndex: draggedCard.sourceIndex, 
                          zone: draggedCard.sourceZone,
                          position: 'random'
                        });
                      }
                      setDraggedCard(null);
                    }
                  }}
                >
                  <div className="text-purple-300 text-xs font-bold mb-1">牌堆</div>
                  <div className="text-purple-200 text-xs">({currentPlayer?.deckSize || 0})</div>
                  <div className="text-purple-200 text-xs mt-1">点击抽牌</div>
                  <div className="text-purple-200 text-xs mt-1">右键洗牌</div>
                  <div className="text-purple-200 text-xs mt-1">拖拽插入</div>
                </div>

                <div className="flex flex-col gap-2">
                  {/* 牌堆顶部区域 */}
                  <div 
                    className={`w-20 h-14 border-2 border-dashed border-blue-500 rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors ${
                      dragOverZone?.zone === 'deck-top' ? 'bg-blue-500 bg-opacity-30 border-blue-400' : 'bg-blue-600 bg-opacity-20 hover:bg-blue-500 hover:bg-opacity-30'
                    }`}
                    onClick={handleSearchDeck}
                    onDragOver={(e) => {
                      if (!isSpectator && draggedCard && (draggedCard.sourceZone === 'hand' || draggedCard.sourceZone === 'battlefield' || draggedCard.sourceZone === 'effect')) {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        setDragOverZone({ zone: 'deck-top' });
                      }
                    }}
                    onDragLeave={(e) => {
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                      const x = e.clientX;
                      const y = e.clientY;
                      if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
                        setDragOverZone(null);
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOverZone(null);
                      if (draggedCard) {
                        if (draggedCard.sourceZone === 'hand') {
                          handleReturnToDeck(draggedCard.card as Card, draggedCard.sourceIndex, 'top');
                        } else if (draggedCard.sourceZone === 'battlefield' || draggedCard.sourceZone === 'effect') {
                          // 从场上直接加入牌堆顶部
                          onGameAction('return-card-from-field-to-deck', { 
                            cardIndex: draggedCard.sourceIndex, 
                            zone: draggedCard.sourceZone,
                            position: 'top'
                          });
                        }
                        setDraggedCard(null);
                      }
                    }}
                  >
                    <div className="text-blue-300 text-xs font-bold">牌堆顶</div>
                    <div className="text-blue-200 text-xs">拖拽插入</div>
                  </div>
                  
                  {/* 牌堆底部区域 */}
                  <div 
                    className={`w-20 h-14 border-2 border-dashed border-green-500 rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors ${
                      dragOverZone?.zone === 'deck-bottom' ? 'bg-green-500 bg-opacity-30 border-green-400' : 'bg-green-600 bg-opacity-20 hover:bg-green-500 hover:bg-green-opacity-30'
                    }`}
                    onClick={handleSearchDeck}
                    onDragOver={(e) => {
                      if (!isSpectator && draggedCard && (draggedCard.sourceZone === 'hand' || draggedCard.sourceZone === 'battlefield' || draggedCard.sourceZone === 'effect')) {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        setDragOverZone({ zone: 'deck-bottom' });
                      }
                    }}
                    onDragLeave={(e) => {
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                      const x = e.clientX;
                      const y = e.clientY;
                      if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
                        setDragOverZone(null);
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOverZone(null);
                      if (draggedCard) {
                        if (draggedCard.sourceZone === 'hand') {
                          handleReturnToDeck(draggedCard.card as Card, draggedCard.sourceIndex, 'bottom');
                        } else if (draggedCard.sourceZone === 'effect') {
                          // 从场上直接加入牌堆底部
                          onGameAction('return-card-from-field-to-deck', { 
                            cardIndex: draggedCard.sourceIndex, 
                            zone: draggedCard.sourceZone,
                            position: 'bottom'
                          });
                        }
                        setDraggedCard(null);
                      }
                    }}
                  >
                    <div className="text-green-300 text-xs font-bold">牌堆底</div>
                    <div className="text-green-200 text-xs">拖拽插入</div>
                  </div>
                </div>
              </div>
            )}
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
                    <div className="text-red-400">攻击: {(viewingCard as ModifiedCard).modifiedAttack !== undefined ? (viewingCard as ModifiedCard).modifiedAttack : viewingCard.attack}</div>
                    <div className="text-green-400">生命: {(viewingCard as ModifiedCard).modifiedHealth !== undefined ? (viewingCard as ModifiedCard).modifiedHealth : viewingCard.health}</div>
                  </div>
                )}
                
                {/* 配角牌修改攻防区域 - 只在场上卡牌且非观战模式下显示 */}
                {viewingCard.type === '配角牌' && !isSpectator && editingCardNote && (editingCardNote.zone === 'battlefield' || editingCardNote.zone === 'effect') && (
                  <div className="bg-yellow-900 bg-opacity-30 border border-yellow-500 rounded-lg p-3">
                    <div className="text-yellow-300 text-sm font-semibold mb-2 text-center">⚔️ 修改攻防值</div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-white text-xs mb-1">新攻击力</label>
                        <input
                          type="number"
                          defaultValue={(viewingCard as ModifiedCard).modifiedAttack !== undefined ? (viewingCard as ModifiedCard).modifiedAttack : viewingCard.attack}
                          id="detail-new-attack"
                          className="w-full px-2 py-1 bg-white bg-opacity-10 border border-gray-500 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-yellow-500"
                        />
                      </div>
                      <div>
                        <label className="block text-white text-xs mb-1">新生命值</label>
                        <input
                          type="number"
                          defaultValue={(viewingCard as ModifiedCard).modifiedHealth !== undefined ? (viewingCard as ModifiedCard).modifiedHealth : viewingCard.health}
                          id="detail-new-health"
                          className="w-full px-2 py-1 bg-white bg-opacity-10 border border-gray-500 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-yellow-500"
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const newAttack = parseInt((document.getElementById('detail-new-attack') as HTMLInputElement).value) || 0;
                        const newHealth = parseInt((document.getElementById('detail-new-health') as HTMLInputElement).value) || 0;
                        handleModifyCard(viewingCard as ModifiedCard, editingCardNote.index, editingCardNote.zone as 'battlefield' | 'effect', newAttack, newHealth);
                        setShowCardDetailModal(false);
                      }}
                      className="w-full mt-2 bg-yellow-600 hover:bg-yellow-700 text-white py-1 px-3 rounded text-sm transition-colors"
                    >
                      确认修改
                    </button>
                    {((viewingCard as ModifiedCard).originalAttack || (viewingCard as ModifiedCard).originalHealth) && (
                      <div className="text-center text-gray-400 text-xs mt-1">
                        原始: 攻击 {(viewingCard as ModifiedCard).originalAttack || viewingCard.attack} / 生命 {(viewingCard as ModifiedCard).originalHealth || viewingCard.health}
                      </div>
                    )}
                  </div>
                )}
                
                <div className="bg-gray-700 rounded p-3">
                  <div className="text-white text-sm font-semibold mb-1">效果描述:</div>
                  <div className="text-gray-300 text-sm whitespace-pre-wrap">{viewingCard.effect || '无特殊效果'}</div>
                </div>
                
                {viewingCard.flavor && (
                  <div className="bg-gray-700 rounded p-3">
                    <div className="text-white text-sm font-semibold mb-1">背景故事:</div>
                    <div className="text-gray-300 text-sm italic whitespace-pre-wrap">{viewingCard.flavor}</div>
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
            
            <div className="flex space-x-3">
              {/* 只有在非观战模式下且卡牌有位置信息时才显示备注按钮 */}
              {!isSpectator && editingCardNote && (
                <button
                  onClick={() => {
                    setShowCardDetailModal(false);
                    openCardNoteModal(viewingCard as ModifiedCard, editingCardNote.index, editingCardNote.zone);
                  }}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded transition-colors"
                >
                  编辑备注
                </button>
              )}
              <button
                onClick={() => setShowCardDetailModal(false)}
                className={`${!isSpectator && editingCardNote ? 'flex-1' : 'w-full'} bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded transition-colors`}
              >
                关闭
              </button>
            </div>
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
                  <div className="text-xs text-center mt-1 truncate whitespace-pre-wrap">{card.effect || '无效果'}</div>
                  
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
                .map((card, originalIndex) => ({
                  card,
                  originalIndex,
                  matchesSearch: card.name.toLowerCase().includes(deckSearchKeyword.toLowerCase())
                }))
                .filter(item => item.matchesSearch)
                .map(({ card, originalIndex }, displayIndex) => (
                  <div 
                    key={originalIndex} 
                    className="bg-blue-600 bg-opacity-70 border border-blue-400 rounded-lg p-3 text-white text-xs shadow-lg cursor-pointer hover:bg-blue-500 group relative"
                  >
                    <div className="font-semibold text-center mb-1">{card.name}</div>
                    <div className="text-center text-xs mb-1">费用: {card.cost}</div>
                    {card.type === '配角牌' && (
                      <div className="text-center text-xs">
                        攻: {card.attack} / 生命: {card.health}
                      </div>
                    )}
                    <div className="text-xs text-center mt-1 truncate whitespace-pre-wrap">{card.effect || '无效果'}</div>
                    
                    {/* 选择按钮 */}
                    <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-wrap items-center justify-center gap-1 p-1">
                      <button
                        onClick={() => openCardDetailModal(card)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-1 py-1 rounded text-xs"
                      >
                        查看详情
                      </button>
                      <button
                        onClick={() => openCardNoteModal(card as ModifiedCard, originalIndex, 'deck')}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-1 py-1 rounded text-xs"
                        title="添加/编辑备注"
                      >
                        备注
                      </button>
                      <button
                        onClick={() => handleDrawSpecificCard(card, originalIndex)}
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
                  <div className="text-xs text-center mt-1 truncate whitespace-pre-wrap">{card.effect || '无效果'}</div>
                  
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
                  <div className="text-xs text-center mt-1 truncate whitespace-pre-wrap">{card.effect || '无效果'}</div>
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
                    setDisplayHandConfirmData({
                      type: 'all',
                      cards: currentPlayer.hand,
                      count: currentPlayer.hand.length
                    });
                    setShowDisplayHandConfirmModal(true);
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
                    setDisplayHandConfirmData({
                      type: 'selected',
                      cards: selectedCards,
                      count: selectedHandCards.length
                    });
                    setShowDisplayHandConfirmModal(true);
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

      {/* 删除卡牌确认模态框 */}
      {showRemoveCardModal && pendingRemoveCard && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[10000]">
          <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-white mb-4 text-center">⚠️ 删除卡牌确认</h3>
            
            <div className="mb-4 p-3 bg-gray-800 bg-opacity-50 rounded-lg">
              <div className="text-center text-white font-semibold mb-2">{pendingRemoveCard.card.name}</div>
              <div className="text-center text-gray-300 text-sm">
                {pendingRemoveCard.sourceZone === 'hand' ? '手牌' : 
                 pendingRemoveCard.sourceZone === 'battlefield' ? '牌桌区域' : '效果区域'}
              </div>
            </div>

            <div className="bg-red-900 bg-opacity-30 border border-red-500 rounded-lg p-4 mb-4">
              <div className="text-red-300 text-sm text-center">
                <div className="font-semibold mb-2">🗑️ 您将卡牌拖拽到了界面外</div>
                <div>确定要从本局游戏中完全移除这张卡牌吗？</div>
                <div className="text-red-400 text-xs mt-2">此操作不可撤销！</div>
              </div>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={handleCancelRemoveCard}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleConfirmRemoveCard}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded transition-colors"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 费用不足模态框 */}
      {showInsufficientManaModal && insufficientManaInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[10000]">
          <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-white mb-4 text-center">💰 费用不足</h3>
            
            <div className="bg-red-900 bg-opacity-30 border border-red-500 rounded-lg p-4 mb-4">
              <div className="text-center mb-4">
                <div className="text-red-300 text-lg font-semibold mb-2">无法打出卡牌</div>
                <div className="text-white font-bold text-lg mb-2">"{insufficientManaInfo.cardName}"</div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="bg-red-800 bg-opacity-50 rounded-lg p-3">
                  <div className="text-red-200 text-sm mb-1">需要费用</div>
                  <div className="text-red-100 text-2xl font-bold">{insufficientManaInfo.required}</div>
                </div>
                <div className="bg-gray-800 bg-opacity-50 rounded-lg p-3">
                  <div className="text-gray-300 text-sm mb-1">当前费用</div>
                  <div className="text-gray-100 text-2xl font-bold">{insufficientManaInfo.current}</div>
                </div>
              </div>
              
              <div className="text-center mt-4">
                <div className="text-red-300 text-sm">
                  还需要 <span className="font-bold text-red-200">{insufficientManaInfo.required - insufficientManaInfo.current}</span> 点费用
                </div>
              </div>
            </div>
            
            <div className="flex justify-center">
              <button
                onClick={() => {
                  setShowInsufficientManaModal(false);
                  setInsufficientManaInfo(null);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 rounded transition-colors"
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 空位置右键菜单 */}
      {showContextMenu && (
        <div 
          className="fixed bg-white bg-opacity-90 backdrop-blur-md rounded-lg shadow-lg border border-gray-300 py-2 z-[10001]"
          style={{
            left: contextMenuPosition.x,
            top: contextMenuPosition.y,
            transform: 'translate(-50%, -10px)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleContextMenuAddCard}
            className="w-full px-4 py-2 text-left text-gray-800 hover:bg-blue-100 transition-colors flex items-center space-x-2"
          >
            <span className="text-green-600">➕</span>
            <span>添加卡牌</span>
          </button>
          <div className="px-4 py-1 text-xs text-gray-500 border-t border-gray-200 mt-1">
            {contextMenuZone === 'battlefield' ? '牌桌区域' : '持续效果区域'} - 位置 {(contextMenuPosition_slot || 0) + 1}
          </div>
        </div>
      )}

      {/* 卡牌右键菜单 */}
      {showCardContextMenu && cardContextMenuData && (
        <div 
          className="fixed bg-white bg-opacity-90 backdrop-blur-md rounded-lg shadow-lg border border-gray-300 py-2 z-[10001]"
          style={{
            left: cardContextMenuPosition.x,
            top: cardContextMenuPosition.y,
            transform: 'translate(-50%, -10px)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 手牌区域显示多选、复制和调整费用 */}
          {cardContextMenuData.zone === 'hand' && (
            <>
              <button
                onClick={handleCardContextMenuMultiSelect}
                className="w-full px-4 py-2 text-left text-gray-800 hover:bg-blue-100 transition-colors flex items-center space-x-2"
              >
                <span className="text-blue-600"></span>
                <span>多选操作</span>
              </button>
              <button
                onClick={() => {
                  setModifyingHandCard({ 
                    card: cardContextMenuData.card as Card, 
                    index: cardContextMenuData.index 
                  });
                  closeCardContextMenu();
                }}
                className="w-full px-4 py-2 text-left text-gray-800 hover:bg-blue-100 transition-colors flex items-center space-x-2"
              >
                <span className="text-orange-600"></span>
                <span>调整费用</span>
              </button>
              <button
                onClick={handleCardContextMenuCopy}
                className="w-full px-4 py-2 text-left text-gray-800 hover:bg-blue-100 transition-colors flex items-center space-x-2"
              >
                <span className="text-purple-600"></span>
                <span>复制卡牌</span>
              </button>
            </>
          )}
          
          {/* 牌桌/持续效果区域只显示复制 */}
          {(cardContextMenuData.zone === 'battlefield' || cardContextMenuData.zone === 'effect') && (
            <button
              onClick={handleCardContextMenuCopy}
              className="w-full px-4 py-2 text-left text-gray-800 hover:bg-blue-100 transition-colors flex items-center space-x-2"
            >
              <span className="text-purple-600"></span>
              <span>复制卡牌</span>
            </button>
          )}
          
          <div className="px-4 py-1 text-xs text-gray-500 border-t border-gray-200 mt-1">
            {cardContextMenuData.card.name} - {
              cardContextMenuData.zone === 'hand' ? '手牌' : 
              cardContextMenuData.zone === 'battlefield' ? '牌桌区域' : '持续效果区域'
            }
          </div>
        </div>
      )}

      {/* 战斗模态框 */}
      {showBattleModal && battleData && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[10000]">
          <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-6 max-w-2xl w-full mx-4">
            <h3 className="text-xl font-bold text-white mb-4 text-center">⚔️ 卡牌战斗</h3>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              {/* 攻击者信息 */}
              <div className="bg-blue-900 bg-opacity-30 border border-blue-500 rounded-lg p-4">
                <div className="text-blue-300 text-sm font-semibold mb-2 text-center">攻击者</div>
                <div className="text-white font-bold text-center mb-2">{battleData.attacker.card.name}</div>
                <div className="text-center text-sm mb-2">
                  <div className="text-red-400">攻击: {battleData.attacker.card.modifiedAttack !== undefined ? battleData.attacker.card.modifiedAttack : battleData.attacker.card.attack}</div>
                  <div className="text-green-400">生命: {battleData.attacker.card.modifiedHealth !== undefined ? battleData.attacker.card.modifiedHealth : battleData.attacker.card.health}</div>
                </div>
                <div className="text-center">
                  <div className="text-orange-300 text-sm mb-2">受到伤害:</div>
                  <input
                    type="number"
                    min="0"
                    value={battleData.attackerDamage}
                    onChange={(e) => {
                      const newDamage = Math.max(0, parseInt(e.target.value) || 0);
                      const currentHealth = battleData.attacker.card.modifiedHealth !== undefined ? 
                                          battleData.attacker.card.modifiedHealth : (battleData.attacker.card.health || 0);
                      setBattleData({
                        ...battleData,
                        attackerDamage: newDamage,
                        attackerWillDie: currentHealth <= newDamage
                      });
                    }}
                    className="w-16 px-2 py-1 bg-white bg-opacity-20 border border-gray-500 rounded text-white text-center text-sm focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                  <div className="mt-2">
                    <label className="flex items-center justify-center space-x-2">
                      <input
                        type="checkbox"
                        checked={battleData.attackerWillDie}
                        onChange={(e) => setBattleData({
                          ...battleData,
                          attackerWillDie: e.target.checked
                        })}
                        className="form-checkbox text-red-500"
                      />
                      <span className="text-red-300 text-sm">💀 将被摧毁</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* 防御者信息 */}
              <div className="bg-red-900 bg-opacity-30 border border-red-500 rounded-lg p-4">
                <div className="text-red-300 text-sm font-semibold mb-2 text-center">防御者</div>
                <div className="text-white font-bold text-center mb-2">{battleData.defender.card.name}</div>
                <div className="text-center text-sm mb-2">
                  <div className="text-red-400">攻击: {battleData.defender.card.modifiedAttack !== undefined ? battleData.defender.card.modifiedAttack : battleData.defender.card.attack}</div>
                  <div className="text-green-400">生命: {battleData.defender.card.modifiedHealth !== undefined ? battleData.defender.card.modifiedHealth : battleData.defender.card.health}</div>
                </div>
                <div className="text-center">
                  <div className="text-orange-300 text-sm mb-2">受到伤害:</div>
                  <input
                    type="number"
                    min="0"
                    value={battleData.defenderDamage}
                    onChange={(e) => {
                      const newDamage = Math.max(0, parseInt(e.target.value) || 0);
                      const currentHealth = battleData.defender.card.modifiedHealth !== undefined ? 
                                          battleData.defender.card.modifiedHealth : (battleData.defender.card.health || 0);
                      setBattleData({
                        ...battleData,
                        defenderDamage: newDamage,
                        defenderWillDie: currentHealth <= newDamage
                      });
                    }}
                    className="w-16 px-2 py-1 bg-white bg-opacity-20 border border-gray-500 rounded text-white text-center text-sm focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                  <div className="mt-2">
                    <label className="flex items-center justify-center space-x-2">
                      <input
                        type="checkbox"
                        checked={battleData.defenderWillDie}
                        onChange={(e) => setBattleData({
                          ...battleData,
                          defenderWillDie: e.target.checked
                        })}
                        className="form-checkbox text-red-500"
                      />
                      <span className="text-red-300 text-sm">💀 将被摧毁</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* 战斗结果预览 */}
            <div className="bg-gray-800 bg-opacity-50 rounded-lg p-4 mb-4">
              <div className="text-white text-sm font-semibold mb-2 text-center">战斗结果预览</div>
              <div className="text-gray-300 text-sm text-center">
                {battleData.attackerWillDie && battleData.defenderWillDie ? (
                  "双方卡牌都将被摧毁"
                ) : battleData.attackerWillDie ? (
                  "攻击者将被摧毁"
                ) : battleData.defenderWillDie ? (
                  "防御者将被摧毁"
                ) : (
                  "双方卡牌都将存活"
                )}
              </div>
              <div className="text-yellow-300 text-xs text-center mt-2">
                💡 提示：可以修改伤害值和摧毁状态来自定义战斗结果
              </div>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowBattleModal(false);
                  setBattleData(null);
                }}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded transition-colors"
              >
                取消战斗
              </button>
              <button
                onClick={handleConfirmBattle}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded transition-colors"
              >
                确认战斗
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 攻击玩家模态框 */}
      {showAttackPlayerModal && attackPlayerData && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[10000]">
          <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-white mb-4 text-center">🗡️ 攻击玩家</h3>
            
            <div className="bg-blue-900 bg-opacity-30 border border-blue-500 rounded-lg p-4 mb-4">
              <div className="text-blue-300 text-sm font-semibold mb-2 text-center">攻击卡牌</div>
              <div className="text-white font-bold text-center mb-2">{attackPlayerData.attacker.card.name}</div>
              <div className="text-center text-sm">
                <div className="text-red-400">基础攻击力: {attackPlayerData.attacker.card.modifiedAttack !== undefined ? attackPlayerData.attacker.card.modifiedAttack : attackPlayerData.attacker.card.attack}</div>
              </div>
            </div>

            <div className="bg-red-900 bg-opacity-30 border border-red-500 rounded-lg p-4 mb-4">
              <div className="text-red-300 text-sm font-semibold mb-2 text-center">伤害设置</div>
              <div className="text-center">
                <div className="text-orange-300 text-sm mb-2">造成伤害:</div>
                <input
                  type="number"
                  min="0"
                  value={attackPlayerData.damage}
                  onChange={(e) => {
                    const newDamage = Math.max(0, parseInt(e.target.value) || 0);
                    setAttackPlayerData({
                      ...attackPlayerData,
                      damage: newDamage
                    });
                  }}
                  className="w-20 px-2 py-1 bg-white bg-opacity-20 border border-gray-500 rounded text-white text-center text-lg font-bold focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
                <div className="text-gray-300 text-sm mt-2">点伤害将对 {opponent?.username || '对手'} 造成</div>
              </div>
            </div>

            <div className="bg-gray-800 bg-opacity-50 rounded-lg p-3 mb-4">
              <div className="text-yellow-300 text-xs text-center">
                💡 提示：可以修改伤害值来自定义攻击结果
              </div>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowAttackPlayerModal(false);
                  setAttackPlayerData(null);
                }}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded transition-colors"
              >
                取消攻击
              </button>
              <button
                onClick={handleConfirmAttackPlayer}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded transition-colors"
              >
                确认攻击
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 展示手牌确认模态框 */}
      {showDisplayHandConfirmModal && displayHandConfirmData && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[10000]">
          <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-6 max-w-lg w-full mx-4">
            <h3 className="text-xl font-bold text-white mb-4 text-center">🔍 展示手牌确认</h3>
            
            <div className="bg-yellow-900 bg-opacity-30 border border-yellow-500 rounded-lg p-4 mb-4">
              <div className="text-yellow-300 text-sm font-semibold mb-2 text-center">
                {displayHandConfirmData.type === 'all' ? '展示全部手牌' : '展示选中手牌'}
              </div>
              <div className="text-center">
                <div className="text-white text-2xl font-bold mb-2">{displayHandConfirmData.count}</div>
                <div className="text-gray-300 text-sm">张手牌将向对手展示</div>
              </div>
            </div>

            <div className="bg-gray-800 bg-opacity-50 rounded-lg p-4 mb-4">
              <div className="text-white text-sm font-semibold mb-2 text-center">将要展示的卡牌</div>
              <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                {displayHandConfirmData.cards.map((card: Card, index: number) => (
                  <div key={index} className="bg-blue-600 bg-opacity-50 rounded p-2 text-white text-xs text-center">
                    <div className="font-semibold mb-1">{card.name}</div>
                    <div>费用: {card.cost}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-800 bg-opacity-50 rounded-lg p-3 mb-4">
              <div className="text-yellow-300 text-xs text-center">
                ⚠️ 展示的手牌将对对手可见，确定要继续吗？
              </div>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowDisplayHandConfirmModal(false);
                  setDisplayHandConfirmData(null);
                }}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => {
                  if (displayHandConfirmData.type === 'all') {
                    onGameAction('display-all-hand', { 
                      cards: displayHandConfirmData.cards,
                      message: `展示了全部手牌 (${displayHandConfirmData.count} 张)`
                    });
                  } else {
                    onGameAction('display-selected-hand', { 
                      cards: displayHandConfirmData.cards,
                      message: `展示了 ${displayHandConfirmData.count} 张手牌`
                    });
                  }
                  setShowDisplayHandConfirmModal(false);
                  setDisplayHandConfirmData(null);
                }}
                className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white py-2 px-4 rounded transition-colors"
              >
                确认展示
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
};

export default GameBoard;
