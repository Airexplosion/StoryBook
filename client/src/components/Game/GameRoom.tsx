import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { setGameState, updatePlayer, nextTurn, setPhase } from '../../store/slices/gameSlice';
import { fetchDecks } from '../../store/slices/decksSlice';
import { fetchCards } from '../../store/slices/cardsSlice';
import socketService from '../../services/socket';
import GameBoard from './GameBoard';
import PlayerInfo from './PlayerInfo';
import GameControls from './GameControls';
import ColorSettings from '../Settings/ColorSettings';
import { useColor } from '../../contexts/ColorContext';
import { GamePlayer, Card } from '../../types';
import api from '../../services/api';

const GameRoom: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const { user } = useSelector((state: RootState) => state.auth);
  const { decks } = useSelector((state: RootState) => state.decks);
  const gameState = useSelector((state: RootState) => state.game);
  
  // 使用颜色上下文
  const { 
    playerColor, 
    opponentColor, 
    playerColorClasses, 
    opponentColorClasses, 
    updateColors, 
    showColorSettings, 
    toggleColorSettings 
  } = useColor();
  
  const [selectedDeck, setSelectedDeck] = useState('');
  const [showDeckSelection, setShowDeckSelection] = useState(false);
  const [isDeckLocked, setIsDeckLocked] = useState(false);
  const [gameLog, setGameLog] = useState<(string | { message: string; cardData: Card | null; timestamp: number })[]>([]);
  const [graveyardCards, setGraveyardCards] = useState<Card[]>([]);
  const [showGraveyardModal, setShowGraveyardModal] = useState(false);
  const [selectedGraveyardCards, setSelectedGraveyardCards] = useState<Card[]>([]); // 新增：选中弃牌堆卡牌
  const [myNotes, setMyNotes] = useState('');
  const [opponentNotes, setOpponentNotes] = useState('');
  const [isSpectator, setIsSpectator] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notesDebounceTimer, setNotesDebounceTimer] = useState<NodeJS.Timeout | null>(null);
  const [deckFilter, setDeckFilter] = useState<'all' | 'own' | 'public'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [roomPositions, setRoomPositions] = useState<{ [key: string]: any }>({});
  const [canJoinAsPlayer, setCanJoinAsPlayer] = useState(false);
  const [existingPlayerIds, setExistingPlayerIds] = useState<string[]>([]);
  const [showPositionSelection, setShowPositionSelection] = useState(false);
  const [deckSearchResults, setDeckSearchResults] = useState<Card[]>([]);
  const [showChampionDetailModal, setShowChampionDetailModal] = useState(false);
  const [championDetail, setChampionDetail] = useState<{ name: string; effect: string } | null>(null);
  const [customFactions, setCustomFactions] = useState<Array<{ id: string; name: string; description?: string }>>([]);
  const [showLogCardDetailModal, setShowLogCardDetailModal] = useState(false);
  const [logCardDetail, setLogCardDetail] = useState<Card | null>(null);
  const [showQuickReferenceModal, setShowQuickReferenceModal] = useState(false);
  const [quickRefSearchTerm, setQuickRefSearchTerm] = useState('');
  const [quickRefSearchField, setQuickRefSearchField] = useState<'name' | 'effect'>('name');
  const [quickRefCategoryFilter, setQuickRefCategoryFilter] = useState<'all' | '关键字' | '特殊机制' | '状态' | '指示物'>('all');
  const [keywordCards, setKeywordCards] = useState<Card[]>([]);
  const [selectedKeywordCard, setSelectedKeywordCard] = useState<Card | null>(null);
  const [diceValue, setDiceValue] = useState<number | null>(null);
  const [diceSides, setDiceSides] = useState(6);
  const [showDiceResult, setShowDiceResult] = useState(false);
  const location = useLocation();
  
  // 手牌展示相关状态
  const [selectedHandCards, setSelectedHandCards] = useState<Card[]>([]);
  const [isDisplayingAllHand, setIsDisplayingAllHand] = useState(false);
  const [isDisplayingSelectedHand, setIsDisplayingSelectedHand] = useState(false);
  const [showHandSelectionModal, setShowHandSelectionModal] = useState(false); // New state for multi-select modal
  
  // 自定义字段状态
  const [customFields, setCustomFields] = useState<Array<{ id: string; name: string; value: number }>>([]);
  const [opponentCustomFields, setOpponentCustomFields] = useState<Array<{ id: string; name: string; value: number }>>([]);
  const [newFieldName, setNewFieldName] = useState('');

  useEffect(() => {
    if (!roomId || !user) {
      return;
    }

    const queryParams = new URLSearchParams(location.search);
    const spectateMode = queryParams.get('spectate') === 'true';
    setIsSpectator(spectateMode);
    
    if (spectateMode) {
      setShowDeckSelection(false); // 观战模式下不显示卡组选择
    }

  // 获取用户的卡组和卡牌
  Promise.all([
    dispatch(fetchDecks() as any),
    dispatch(fetchCards({}) as any)
  ])
    .then(() => {
      setIsLoading(false);
    })
    .catch((err: any) => {
      console.error('Error fetching decks or cards:', err);
      setError('获取卡组或卡牌失败');
      setIsLoading(false);
    });

    // 连接Socket.io
    const token = localStorage.getItem('token');
    if (token) {
      socketService.connect(token);
      socketService.joinRoom(roomId, user.id, user.username, spectateMode);
    } else {
      setError('未找到认证令牌或用户未登录');
      setIsLoading(false);
    }

    // 监听房间位置信息
    socketService.on('room-positions', (data: { positions: { [key: string]: any }, canJoinAsPlayer: boolean, playerStates: string[] }) => {
      setRoomPositions(data.positions);
      setCanJoinAsPlayer(data.canJoinAsPlayer);
      setExistingPlayerIds(data.playerStates);
      if (!data.canJoinAsPlayer && !isSpectator) {
        setError('房间已满，无法加入为玩家。您可以选择观战。');
      }
    });

    // 监听游戏状态更新
    socketService.onGameStateUpdate((roomState) => {
      dispatch(setGameState({
        players: roomState.players,
        currentPlayer: roomState.gameState.currentPlayer,
        round: roomState.gameState.round,
        phase: roomState.gameState.phase,
        firstPlayer: roomState.gameState.firstPlayer,
        gameBoard: roomState.gameState.gameBoard
      }));
      
      // 如果房间状态包含游戏日志，加载它
      if (roomState.gameLog && Array.isArray(roomState.gameLog)) {
        const formattedLogs = roomState.gameLog.map((log: any) => {
          if (typeof log === 'string') {
            return log;
          }
          // 保持完整的日志对象结构，包括卡牌数据
          return {
            message: log.message || `${log.playerName}: ${log.action}`,
            cardData: log.cardData || null,
            timestamp: log.timestamp || Date.now()
          };
        });
        setGameLog(formattedLogs);
      }
      
      // 检查当前玩家是否需要选择卡组
      if (!isSpectator && user) {
        const currentPlayer = roomState.players.find((p: any) => p.userId === user.id);
        if (!currentPlayer || !currentPlayer.isDeckLocked || !currentPlayer.deckName) {
          setShowDeckSelection(true);
        } else {
          setShowDeckSelection(false);
        }
        
        // 同步备注信息
        if (currentPlayer && currentPlayer.notes !== undefined) {
          setMyNotes(currentPlayer.notes);
        }
      }
      
      // 获取对手备注（包括观战者也能看到）
      if (user) {
        const opponent = roomState.players.find((p: any) => p.userId !== user.id);
        if (opponent && opponent.notes !== undefined) {
          setOpponentNotes(opponent.notes);
        }
        
        // 同步对手的自定义字段
        if (opponent && opponent.customFields) {
          setOpponentCustomFields(opponent.customFields);
        }
      }
      
      // 同步当前玩家的自定义字段
      if (!isSpectator && user) {
        const currentPlayer = roomState.players.find((p: any) => p.userId === user.id);
        if (currentPlayer && currentPlayer.customFields) {
          setCustomFields(currentPlayer.customFields);
        }
      }
    });

    // 监听游戏更新消息
    socketService.onGameUpdate((data) => {
      console.log('Game update:', data);
      
      // 检查是否是重开游戏成功的消息
      if (data.message && data.message.includes('双方玩家同意重新开始')) {
        // 延迟一点时间再刷新，让玨家看到消息
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      }
      
      if (data.action || data.message) {
        const newLogEntry = {
          message: data.message || `${data.playerName}: ${data.action}`,
          cardData: data.cardData || null,
          timestamp: Date.now()
        };
        setGameLog(prev => {
          // 避免重复添加相同的日志消息
          const existingEntry = prev.find(entry => 
            (typeof entry === 'string' ? entry : entry.message) === newLogEntry.message
          );
          if (!existingEntry) {
            return [...prev, newLogEntry];
          }
          return prev;
        });
      }
    });

    // 监听弃牌堆信息
    socketService.onGraveyardInfo((data) => {
      setGraveyardCards(data.graveyard);
      setSelectedGraveyardCards([]); // 打开模态框时清空选中
      setShowGraveyardModal(true);
    });

    // 监听牌堆搜索结果
    socketService.on('deck-cards', (data) => {
      setDeckSearchResults(data.cards);
    });

    socketService.onUserJoined((userId) => {
      setGameLog(prev => [...prev, `用户 ${userId} 加入了房间`]);
    });

    socketService.onUserLeft((userId) => {
      setGameLog(prev => [...prev, `用户 ${userId} 离开了房间`]);
    });

    return () => {
      socketService.leaveRoom(roomId);
      socketService.off('game-update');
      socketService.off('user-joined');
      socketService.off('user-left');
      socketService.off('graveyard-info');
      socketService.off('room-positions');
      socketService.off('deck-cards');
    };
  }, [roomId, user, dispatch, location.search, isSpectator]);

  useEffect(() => {
    // 如果不是观战模式，并且还没有选择位置，则显示位置选择界面
    if (!isSpectator && !roomPositions[`position1`]?.userId && !roomPositions[`position2`]?.userId) {
      setShowPositionSelection(true);
    } else {
      setShowPositionSelection(false);
    }
  }, [roomPositions, isSpectator]);

  // 加载游戏配置
  useEffect(() => {
    const loadGameConfig = async () => {
      try {
        const response = await api.config.getConfig();
        const config = response.data;
        
        if (config.factions) setCustomFactions(config.factions);
      } catch (error) {
        console.error('加载配置失败:', error);
      }
    };

    loadGameConfig();
  }, []);

  // 加载关键字效果卡牌
  useEffect(() => {
    const loadKeywordCards = async () => {
      try {
        const response = await api.cards.getAll();
        
        // 检查响应数据格式
        let allCards = response.data;
        if (!Array.isArray(allCards)) {
          // 如果数据被包装在其他属性中，尝试提取
          if (allCards && allCards.cards && Array.isArray(allCards.cards)) {
            allCards = allCards.cards;
          } else if (allCards && allCards.data && Array.isArray(allCards.data)) {
            allCards = allCards.data;
          } else {
            console.error('无法从API响应中提取卡牌数组，响应格式:', typeof allCards);
            return;
          }
        }
        
        // 筛选出类型为"关键字效果"的卡牌
        const keywordEffectCards = allCards.filter((card: Card) => 
          card.type === '关键字效果'
        );
        
        setKeywordCards(keywordEffectCards);
      } catch (error) {
        console.error('加载关键字效果卡牌失败:', error);
      }
    };

    loadKeywordCards();
  }, []);

  const handleSelectPosition = (position: string) => {
    if (!user || !roomId) return;
    socketService.selectPosition({
      roomId,
      userId: user.id,
      username: user.username,
      position
    });
    setShowPositionSelection(false);
  };

  const handleDeckSelection = () => {
    console.log('Handle deck selection triggered');
    console.log('Selected deck:', selectedDeck);
    console.log('Available decks:', decks);
    
    if (!selectedDeck) {
      alert('请选择一个卡组');
      return;
    }

    // 在全部卡组中查找
    const deck = decks.find(d => String(d._id) === selectedDeck);
    console.log('Found deck:', deck);
    console.log('Deck championCardId:', deck?.championCardId);
    console.log('Deck championDescription:', deck?.championDescription);
    
    if (!deck) {
      console.error('Deck not found!');
      console.error('Looking for deck ID:', selectedDeck);
      console.error('Available deck IDs:', decks.map(d => d._id));
      alert('卡组未找到，请重新选择');
      return;
    }

    // 允许没有主角牌的卡组使用，但给出提示
    if (!deck.heroCard) {
      console.warn('Deck has no hero card, but allowing usage');
      console.warn('Deck structure:', deck);
      // 不再阻止使用，只是给出警告
    }

    try {
      console.log('Sending deck selection to socket');
      // 发送选择卡组的事件
      socketService.selectDeck({
        roomId,
        userId: user?.id,
        username: user?.username,
        deckId: selectedDeck,
        deckName: deck.name,
        heroName: deck.heroCard?.name || '无主角牌',
        championCardId: deck.championCardId, // 添加主战者ID
        championDescription: deck.championDescription // 添加主战者描述
      });

      // 锁定卡组选择
      setIsDeckLocked(true);
      console.log('Deck selection locked');
    } catch (error) {
      console.error('Error in deck selection:', error);
      alert('选择卡组时出错，请重试');
    }
  };

  const handleGameAction = (action: string, data?: any) => {
    // 确保 data 是一个对象，即使它可能包含 quantity
    const payload = {
      roomId,
      action,
      userId: user?.id,
      playerName: user?.username,
      ...data
    };
    socketService.sendGameAction(payload);
  };

  // 处理备注更新 - 添加1000ms防抖
  const handleMyNotesChange = (notes: string) => {
    const trimmedNotes = notes.substring(0, 1000); // 限制字符数
    setMyNotes(trimmedNotes);
    
    // 清除之前的定时器
    if (notesDebounceTimer) {
      clearTimeout(notesDebounceTimer);
    }
    
    // 设置新的防抖定时器
    const timer = setTimeout(() => {
      handleGameAction('update-notes', { 
        type: 'my-notes', 
        notes: trimmedNotes 
      });
    }, 1000);
    
    setNotesDebounceTimer(timer);
  };

  // 处理弃牌堆卡牌选中/取消选中
  const handleToggleGraveyardCardSelection = (card: Card) => {
    setSelectedGraveyardCards(prevSelected => {
      if (prevSelected.some(c => c._id === card._id)) {
        return prevSelected.filter(c => c._id !== card._id);
      } else {
        return [...prevSelected, card];
      }
    });
  };

  // 处理手牌选中/取消选中
  const handleToggleHandCardSelection = (card: Card) => {
    setSelectedHandCards(prevSelected => {
      if (prevSelected.some(c => c._id === card._id)) {
        return prevSelected.filter(c => c._id !== card._id);
      } else {
        return [...prevSelected, card];
      }
    });
  };

  // 批量弃牌
  const handleBulkDiscard = () => {
    if (selectedGraveyardCards.length === 0) {
      alert('请选择至少一张卡牌进行批量弃牌。');
      return;
    }
    if (window.confirm(`确定要弃掉选中的 ${selectedGraveyardCards.length} 张卡牌吗？`)) {
      const cardIds = selectedGraveyardCards.map(card => card._id);
      handleGameAction('bulk-discard-graveyard-cards', { cardIds });
      setShowGraveyardModal(false); // 关闭模态框
      setSelectedGraveyardCards([]); // 清空选中
    }
  };

  // 批量修改费用
  const handleBulkModifyCost = () => {
    if (selectedGraveyardCards.length === 0) {
      alert('请选择至少一张卡牌进行批量修改费用。');
      return;
    }
    const costChange = prompt(`请输入费用修改值 (例如: -1, +2):`);
    if (costChange === null || isNaN(parseInt(costChange))) {
      alert('请输入有效的数字。');
      return;
    }
    const parsedCostChange = parseInt(costChange);
    if (window.confirm(`确定要将选中的 ${selectedGraveyardCards.length} 张卡牌费用修改 ${parsedCostChange} 吗？`)) {
      const cardIds = selectedGraveyardCards.map(card => card._id);
      handleGameAction('bulk-modify-graveyard-card-cost', { cardIds, costChange: parsedCostChange });
      setShowGraveyardModal(false); // 关闭模态框
      setSelectedGraveyardCards([]); // 清空选中
    }
  };

  // 处理自定义字段
  const handleAddCustomField = () => {
    const trimmedName = newFieldName.trim();
    if (!trimmedName) return;
    
    // 在提交时限制字段名长度为5个字符
    if (trimmedName.length > 5) {
      alert('字段名不能超过5个字符');
      return;
    }
    
    const newField = {
      id: `field_${Date.now()}`,
      name: trimmedName,
      value: 0
    };
    
    const updatedFields = [...customFields, newField];
    setCustomFields(updatedFields);
    setNewFieldName('');
    
    // 保存到服务器
    handleGameAction('update-custom-fields', { 
      type: 'my-fields', 
      fields: updatedFields 
    });
  };

  const handleUpdateCustomField = (fieldId: string, change: number) => {
    const updatedFields = customFields.map(field => 
      field.id === fieldId 
        ? { ...field, value: field.value + change }
        : field
    );
    setCustomFields(updatedFields);
    
    // 保存到服务器
    handleGameAction('update-custom-fields', { 
      type: 'my-fields', 
      fields: updatedFields 
    });
  };

  const handleRemoveCustomField = (fieldId: string) => {
    const field = customFields.find(f => f.id === fieldId);
    if (field && window.confirm(`确定要删除字段"${field.name}"吗？`)) {
      const updatedFields = customFields.filter(field => field.id !== fieldId);
      setCustomFields(updatedFields);
      
      // 保存到服务器
      handleGameAction('update-custom-fields', { 
        type: 'my-fields', 
        fields: updatedFields 
      });
    }
  };


  // 展示全部手牌
  const handleDisplayAllHand = () => {
    if (!currentPlayer?.hand || currentPlayer.hand.length === 0) {
      alert('手牌为空，无法展示。');
      return;
    }
    if (window.confirm(`确定要向对手展示全部手牌 (${currentPlayer.hand.length} 张) 吗？`)) {
      handleGameAction('display-all-hand', { 
        cards: currentPlayer.hand,
        message: `${user?.username} 展示了全部手牌 (${currentPlayer.hand.length} 张)`
      });
    }
  };

  // 展示选中的手牌
  const handleDisplaySelectedHand = (display: boolean) => {
    if (selectedHandCards.length === 0 && display) {
      alert('请选择至少一张手牌进行展示。');
      return;
    }

    if (display) {
      if (window.confirm(`确定要向对手展示选中的 ${selectedHandCards.length} 张手牌吗？`)) {
        handleGameAction('display-selected-hand', { 
          cards: selectedHandCards,
          message: `${user?.username} 展示了 ${selectedHandCards.length} 张手牌`
        });
        setIsDisplayingSelectedHand(true);
        setIsDisplayingAllHand(false); // 如果多选展示，取消全部展示状态
      }
    } else {
      handleGameAction('hide-selected-hand', { 
        cards: selectedHandCards,
        message: `${user?.username} 取消展示选中的 ${selectedHandCards.length} 张手牌`
      });
      setIsDisplayingSelectedHand(false);
    }
    setSelectedHandCards([]); // 清空选中
  };

  const handleLeaveRoom = () => {
    if (window.confirm('确定要离开房间吗？')) {
      // 确保在离开前发送leave-room事件
      if (roomId) {
        socketService.leaveRoom(roomId);
      }
      navigate('/rooms');
    }
  };

  // 掷骰功能
  const handleRollDice = () => {
    if (diceSides < 2 || diceSides > 100) {
      alert('骰子面数必须在2-100之间');
      return;
    }
    
    const result = Math.floor(Math.random() * diceSides) + 1;
    setDiceValue(result);
    setShowDiceResult(true);
    
    // 将掷骰结果添加到游戏日志
    handleGameAction('roll-dice', { 
      sides: diceSides, 
      result: result,
      message: `${user?.username} 掷了一个${diceSides}面骰子，结果是：${result}`
    });
    
    // 3秒后自动隐藏结果
    setTimeout(() => {
      setShowDiceResult(false);
      setDiceValue(null);
    }, 3000);
  };

  // 获取当前玩家信息
  const currentPlayer = gameState.players.find(p => p.userId === user?.id);
  
  // 对于观战者，需要获取所有玩家信息
  let opponent;
  let player1, player2;
  
  if (isSpectator) {
    // 观战模式下，获取所有玩家
    player1 = gameState.players[0];
    player2 = gameState.players[1];
    opponent = null; // 观战者没有对手概念
  } else {
    // 正常游戏模式
    opponent = gameState.players.find(p => p.userId !== user?.id);
  }

  // 显示加载状态
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-8 max-w-md w-full text-center">
          <div className="text-white text-xl mb-4">加载中...</div>
          <div className="text-gray-300 text-sm">正在连接游戏房间</div>
        </div>
      </div>
    );
  }

  // 显示错误状态
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-8 max-w-md w-full text-center">
          <div className="text-red-400 text-xl mb-4">错误</div>
          <div className="text-gray-300 text-sm mb-4">{error}</div>
          <button
            onClick={() => navigate('/rooms')}
            className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded transition-colors"
          >
            返回房间列表
          </button>
        </div>
      </div>
    );
  }

  // 显示调试信息
  if (!roomId || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-8 max-w-md w-full text-center">
          <div className="text-yellow-400 text-xl mb-4">调试信息</div>
          <div className="text-gray-300 text-sm mb-2">房间ID: {roomId || '未找到'}</div>
          <div className="text-gray-300 text-sm mb-2">用户: {user?.username || '未登录'}</div>
          <div className="text-gray-300 text-sm mb-4">卡组数量: {decks.length}</div>
          <button
            onClick={() => navigate('/rooms')}
            className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded transition-colors"
          >
            返回房间列表
          </button>
        </div>
      </div>
    );
  }

  // 筛选和搜索卡组
  const filteredDecks = decks.filter(deck => {
    // 权限筛选
    const hasPermission = deck.isPublic || deck.createdBy._id === user?.id;
    if (!hasPermission) return false;

    // 类型筛选
    switch (deckFilter) {
      case 'own':
        if (deck.createdBy._id !== user?.id) return false;
        break;
      case 'public':
        if (!deck.isPublic || deck.createdBy._id === user?.id) return false;
        break;
      case 'all':
      default:
        break;
    }

    // 搜索筛选
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        deck.name.toLowerCase().includes(search) ||
        (deck.heroCard?.name && deck.heroCard.name.toLowerCase().includes(search)) ||
        deck.createdBy.username.toLowerCase().includes(search)
      );
    }

    return true;
  });

  if (showDeckSelection && decks.length > 0 && !isSpectator && gameState.phase !== 'playing') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-8 max-w-2xl w-full">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">选择卡组</h2>
          
          {/* 搜索和筛选 */}
          <div className="mb-6 space-y-4">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索卡组名称、主角或创建者..."
              className="w-full px-4 py-2 bg-white bg-opacity-10 border border-gray-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            
            <div className="flex space-x-2">
              <button
                onClick={() => setDeckFilter('all')}
                className={`px-4 py-2 rounded text-sm transition-colors ${
                  deckFilter === 'all' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                }`}
              >
                全部卡组
              </button>
              <button
                onClick={() => setDeckFilter('own')}
                className={`px-4 py-2 rounded text-sm transition-colors ${
                  deckFilter === 'own' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                }`}
              >
                我的卡组
              </button>
              <button
                onClick={() => setDeckFilter('public')}
                className={`px-4 py-2 rounded text-sm transition-colors ${
                  deckFilter === 'public' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                }`}
              >
                公开卡组
              </button>
            </div>
          </div>
          
          {/* 卡组列表 */}
          <div className="max-h-96 overflow-y-auto space-y-3 mb-6">
            {filteredDecks.length > 0 ? (
              filteredDecks.map(deck => (
                <label key={deck._id} className="flex items-center p-4 bg-white bg-opacity-10 rounded-lg hover:bg-opacity-20 transition-all cursor-pointer">
                  <input
                    type="radio"
                    name="deck"
                    value={deck._id}
                    checked={selectedDeck === deck._id}
                    onChange={(e) => setSelectedDeck(e.target.value)}
                    className="mr-4 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 focus:ring-2"
                  />
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="text-white font-semibold">{deck.name}</h3>
                      {deck.isPublic && deck.createdBy._id !== user?.id && (
                        <span className="bg-green-600 text-white px-2 py-1 rounded text-xs">公开</span>
                      )}
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <p className="text-gray-300 text-sm">
                          主角: {deck.championCardId ? (() => {
                            const championFaction = customFactions.find(f => f.id === deck.championCardId);
                            return championFaction ? championFaction.name : deck.championCardId;
                          })() : '未指定'}
                        </p>
                      </div>
                      {deck.championCardId && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            const championFaction = customFactions.find(f => f.id === deck.championCardId);
                            const effectText = deck.championDescription || 
                                             (championFaction ? championFaction.description : null) || 
                                             '无效果描述';
                            alert(effectText);
                          }}
                          className="ml-2 text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded transition-colors"
                          title="查看主战者效果"
                        >
                          查看效果
                        </button>
                      )}
                    </div>
                    <p className="text-gray-300 text-sm">卡牌数: {deck.totalCards}</p>
                    <p className="text-gray-400 text-xs">创建者: {deck.createdBy.username}</p>
                  </div>
                </label>
              ))
            ) : (
              <div className="text-center text-gray-400 py-8">
                {searchTerm ? '没有找到匹配的卡组' : '没有可用的卡组'}
              </div>
            )}
          </div>

          <div className="flex space-x-4">
            <button
              onClick={handleLeaveRoom}
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-3 px-4 rounded transition-colors"
            >
              离开房间
            </button>
            <button
              onClick={handleDeckSelection}
              disabled={!selectedDeck}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white py-3 px-4 rounded transition-colors"
            >
              确认选择
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen game-board">
      <div className="container mx-auto px-4 py-4">
        {/* 顶部信息栏 */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-white">对战房间</h1>
            {isSpectator && (
              <span className="bg-purple-600 text-white px-3 py-1 rounded-full text-sm">
                观战模式
              </span>
            )}
            <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm">
              {gameState.players.length === 2 ? (
                `${gameState.players[0]?.username || '玩家1'}: ${gameState.players[0]?.turnsCompleted || 0}回合 | ${gameState.players[1]?.username || '玩家2'}: ${gameState.players[1]?.turnsCompleted || 0}回合`
              ) : (
                `第 ${gameState.round} 回合`
              )}
            </span>
            <span className={`px-3 py-1 rounded-full text-sm ${
              gameState.phase === 'playing' ? 'bg-green-600 text-white' :
              gameState.phase === 'waiting' ? 'bg-yellow-600 text-white' :
              gameState.phase === 'mulliganing' ? 'bg-purple-600 text-white' :
              gameState.phase === 'paused' ? 'bg-orange-600 text-white' :
              gameState.phase === 'ended' ? 'bg-red-600 text-white' :
              'bg-gray-600 text-white'
            }`}>
              {gameState.phase === 'playing' ? '对战中' : 
               gameState.phase === 'waiting' ? '等待中' : 
               gameState.phase === 'mulliganing' ? '调度中' : 
               gameState.phase === 'paused' ? '已暂停' :
               gameState.phase === 'ended' ? '已结束' : '未知'}
            </span>
            {gameState.firstPlayer >= 0 && gameState.players.length === 2 && (
              <span className="bg-yellow-500 text-white px-3 py-1 rounded-full text-sm">
                先手: {gameState.players[gameState.firstPlayer]?.username}
              </span>
            )}
          </div>
                            {/* 掷骰功能 */}

                    <div className="flex items-center space-x-2 mb-2 justify-start">
                      <span className="text-white text-sm">掷骰:</span>
                      <input
                        type="number"
                        value={diceSides}
                        onChange={(e) => setDiceSides(Math.max(2, Math.min(100, parseInt(e.target.value) || 6)))}
                        className="w-16 px-2 py-1 bg-white bg-opacity-10 border border-gray-500 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        min="2"
                        max="100"
                      />
                      <span className="text-gray-300 text-sm">面</span>
                      <button
                        onClick={handleRollDice}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-sm transition-colors"
                      >
                        掷骰
                      </button>
                    </div>
                   {/* 掷骰结果 - 常显 */}
                   <div className="rounded p-2 text-left bg-opacity-50 bg-yellow-600"> 
                     {diceValue ? (
                       <div className="text-white font-bold">🎲={diceValue}</div>
                     ) : (
                       <div className="text-white text-opacity-70 font-bold">🎲🎲</div>
                     )}
                   </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowQuickReferenceModal(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded transition-colors flex items-center space-x-2"
            >
              <span>📖</span>
              <span>基础速查</span>
            </button>
            <button
              onClick={toggleColorSettings}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded transition-colors flex items-center space-x-2"
            >
              <span>🎨</span>
              <span>配色设置</span>
            </button>
            <button
              onClick={handleLeaveRoom}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition-colors"
            >
              离开房间
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* 游戏区域 */}
          <div className="lg:col-span-3">
            <GameBoard 
              gameState={gameState}
              currentUserId={user?.id}
              onGameAction={handleGameAction}
              deckSearchResults={deckSearchResults}
            />
          </div>

          {/* 右侧 - 对手信息、玩家信息和控制 */}
          <div className="lg:col-span-1 space-y-4">
            {/* 对手信息栏 - 移到右侧上方 */}
            {(() => {
              const displayOpponent = isSpectator ? player2 : opponent;
              return displayOpponent && (
                <div className={`${opponentColorClasses.bg} ${opponentColorClasses.bgOpacity} border ${opponentColorClasses.border} rounded-xl p-4`}
                     style={opponentColorClasses.customStyle && typeof opponentColorClasses.customStyle === 'object' ? { backgroundColor: opponentColorClasses.customStyle.backgroundColor, borderColor: opponentColorClasses.customStyle.borderColor } : {}}>
                  <div className="flex items-center space-x-3 mb-4">
                    <div className={`w-10 h-10 ${opponentColorClasses.avatar} rounded-full flex items-center justify-center`}
                         style={opponentColorClasses.customStyle && typeof opponentColorClasses.customStyle === 'object' ? { backgroundColor: opponentColorClasses.customStyle.backgroundColor } : {}}>
                      <span className="text-white font-bold">
                        {displayOpponent.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1">
                      <h3 className={`${opponentColorClasses.text} font-bold text-sm`}
                          style={opponentColorClasses.customStyle && typeof opponentColorClasses.customStyle === 'object' ? { color: opponentColorClasses.customStyle.color } : {}}>
                        {displayOpponent.username} {isSpectator ? '(玩家2)' : '(对手)'}
                      </h3>
                      {displayOpponent.deckName && (
                        <p className={`${opponentColorClasses.textSecondary} text-xs`}
                           style={opponentColorClasses.customStyle && typeof opponentColorClasses.customStyle === 'object' ? { color: opponentColorClasses.customStyle.color } : {}}>
                          {displayOpponent.deckName} - {(() => {
                            if (displayOpponent.championCardId) {
                              const championFaction = customFactions.find(f => f.id === displayOpponent.championCardId);
                              return championFaction ? championFaction.name : displayOpponent.championCardId;
                            }
                            return displayOpponent.heroName || '未知主战者';
                          })()}
                        </p>
                      )}
                      {/* 对手主战者详情按钮 */}
                      <button
                        onClick={() => {
                          console.log('Opponent data:', displayOpponent); // 调试日志
                          
                          let championName = '未知主战者';
                          let championEffect = '无效果描述';
                          
                          // 优先使用 championDescription
                          if (displayOpponent.championDescription) {
                            championEffect = displayOpponent.championDescription;
                          }
                          
                          // 尝试通过 championCardId 查找主战者名称
                          if (displayOpponent.championCardId) {
                            const championFaction = customFactions.find(f => f.id === displayOpponent.championCardId);
                            if (championFaction) {
                              championName = championFaction.name;
                              // 如果没有自定义描述，使用默认描述
                              if (!displayOpponent.championDescription && championFaction.description) {
                                championEffect = championFaction.description;
                              }
                            }
                          }
                          
                          // 兜底逻辑：使用 championCard
                          if (displayOpponent.championCard) {
                            championName = displayOpponent.championCard.name || championName;
                            if (!displayOpponent.championDescription) {
                              championEffect = displayOpponent.championCard.effect || championEffect;
                            }
                          }
                          
                          setChampionDetail({ name: `${isSpectator ? '玩家2' : '对手'}主战者: ${championName}`, effect: championEffect });
                          setShowChampionDetailModal(true);
                        }}
                        className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded transition-colors mt-1"
                        title="查看主战者详情"
                      >
                        主战详情
                      </button>
                    </div>
                    {gameState.currentPlayer === gameState.players.findIndex(p => p.userId === displayOpponent.userId) && (
                      <div className="bg-yellow-600 rounded px-2 py-1 text-center">
                        <div className="text-white font-bold text-xs">🎯</div>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    {/* 对手生命值 */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className={`${opponentColorClasses.textSecondary} text-xs`}
                              style={opponentColorClasses.customStyle && typeof opponentColorClasses.customStyle === 'object' ? { color: opponentColorClasses.customStyle.color } : {}}>生命值</span>
                        <span className="text-white font-bold text-xs">
                          {displayOpponent.health}/{displayOpponent.maxHealth}
                        </span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-red-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.max(0, (displayOpponent.health / displayOpponent.maxHealth) * 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* 对手费用 */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className={`${opponentColorClasses.textSecondary} text-xs`}
                              style={opponentColorClasses.customStyle && typeof opponentColorClasses.customStyle === 'object' ? { color: opponentColorClasses.customStyle.color } : {}}>费用</span>
                        <span className="text-white font-bold text-xs">
                          {displayOpponent.mana}/{displayOpponent.maxMana}
                        </span>
                      </div>
                      <div className="flex space-x-1">
                        {Array.from({ length: Math.max(displayOpponent.maxMana, 10) }, (_, index) => (
                          <div
                            key={index}
                            className={`w-2 h-2 rounded-full ${
                              index < displayOpponent.mana ? 'bg-blue-500' : 'bg-gray-600'
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    {/* 对手章节进度 */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className={`${opponentColorClasses.textSecondary} text-xs`}
                              style={opponentColorClasses.customStyle && typeof opponentColorClasses.customStyle === 'object' ? { color: opponentColorClasses.customStyle.color } : {}}>章节进度</span>
                        <span className="text-white font-bold text-xs">
                          {displayOpponent.chapterProgress || 0}/{displayOpponent.maxChapterProgress || 3}
                        </span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${((displayOpponent.chapterProgress || 0) / (displayOpponent.maxChapterProgress || 3)) * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* 对手章节指示物 */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className={`${opponentColorClasses.textSecondary} text-xs`}
                              style={opponentColorClasses.customStyle && typeof opponentColorClasses.customStyle === 'object' ? { color: opponentColorClasses.customStyle.color } : {}}>章节指示物</span>
                        <span className="text-white font-bold text-xs">
                          {displayOpponent.chapterTokens || 0}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-between text-xs">
                      <div className={`${opponentColorClasses.stats} rounded px-2 py-1 text-center`}
                           style={opponentColorClasses.customStyle && typeof opponentColorClasses.customStyle === 'object' ? { backgroundColor: opponentColorClasses.customStyle.backgroundColor + 'CC' } : {}}>
                        <div className={`${opponentColorClasses.textSecondary}`}
                             style={opponentColorClasses.customStyle && typeof opponentColorClasses.customStyle === 'object' ? { color: opponentColorClasses.customStyle.color } : {}}>手牌</div>
                        <div className="text-white font-bold">{displayOpponent.handSize}</div>
                      </div>
                      <div className={`${opponentColorClasses.stats} rounded px-2 py-1 text-center`}
                           style={opponentColorClasses.customStyle && typeof opponentColorClasses.customStyle === 'object' ? { backgroundColor: opponentColorClasses.customStyle.backgroundColor + 'CC' } : {}}>
                        <div className={`${opponentColorClasses.textSecondary}`}
                             style={opponentColorClasses.customStyle && typeof opponentColorClasses.customStyle === 'object' ? { color: opponentColorClasses.customStyle.color } : {}}>牌库</div>
                        <div className="text-white font-bold">{displayOpponent.deckSize}</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
            
            {/* 游戏控制 - 放在对手信息下方，我方信息上方 */}
            {!isSpectator && (
              <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-4">
                <div className="space-y-3">
                  {/* 回合控制 */}
                  {gameState.phase === 'playing' && (
                    <>
                      <button
                        onClick={() => handleGameAction('end-turn')}
                        disabled={!(currentPlayer && gameState.currentPlayer === gameState.players.findIndex(p => p.userId === currentPlayer.userId))}
                        className={`w-full py-3 px-4 rounded font-semibold transition-colors ${
                          currentPlayer && gameState.currentPlayer === gameState.players.findIndex(p => p.userId === currentPlayer.userId)
                            ? 'bg-green-600 hover:bg-green-700 text-white' 
                            : 'bg-gray-600 text-gray-300 cursor-not-allowed'
                        }`}
                      >
                        {currentPlayer && gameState.currentPlayer === gameState.players.findIndex(p => p.userId === currentPlayer.userId) ? '结束回合' : '等待对手'}
                      </button>
                      
                      {/* 执行额外回合按钮 */}
                      <button
                        onClick={() => handleGameAction('extra-turn')}
                        disabled={!(currentPlayer && gameState.currentPlayer === gameState.players.findIndex(p => p.userId === currentPlayer.userId))}
                        className={`w-full py-2 px-4 rounded font-semibold transition-colors ${
                          currentPlayer && gameState.currentPlayer === gameState.players.findIndex(p => p.userId === currentPlayer.userId)
                            ? 'bg-yellow-600 hover:bg-yellow-700 text-white' 
                            : 'bg-gray-600 text-gray-300 cursor-not-allowed'
                        }`}
                      >
                        执行额外回合
                      </button>
                    </>
                  )}



                  {/* 重新开始游戏按钮 */}
                  <button
                    onClick={() => handleGameAction('request-restart')}
                    className={`w-full py-2 px-4 rounded font-semibold transition-colors ${
                      currentPlayer?.restartRequest 
                        ? 'bg-orange-600 hover:bg-orange-700 text-white' 
                        : 'bg-purple-600 hover:bg-purple-700 text-white'
                    }`}
                  >
                    {currentPlayer?.restartRequest ? '取消重开' : '重新开始游戏'}
                  </button>
                </div>
              </div>
            )}
            
            {/* 玩家1信息 - 观战模式下显示玩家1，正常模式下显示我的信息 */}
            {(() => {
              const displayPlayer = isSpectator ? player1 : currentPlayer;
              return displayPlayer && (
                <div className={`${playerColorClasses.bg} ${playerColorClasses.bgOpacity} border ${playerColorClasses.border} rounded-xl p-4`}
                     style={playerColorClasses.customStyle && typeof playerColorClasses.customStyle === 'object' ? { backgroundColor: playerColorClasses.customStyle.backgroundColor, borderColor: playerColorClasses.customStyle.borderColor } : {}}>
                  <div className="flex items-center space-x-3 mb-4">
                    <div className={`w-10 h-10 ${playerColorClasses.avatar} rounded-full flex items-center justify-center`}
                         style={playerColorClasses.customStyle && typeof playerColorClasses.customStyle === 'object' ? { backgroundColor: playerColorClasses.customStyle.backgroundColor } : {}}>
                      <span className="text-white font-bold">
                        {displayPlayer.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h3 className={`${playerColorClasses.text} font-bold`}
                          style={playerColorClasses.customStyle && typeof playerColorClasses.customStyle === 'object' ? { color: playerColorClasses.customStyle.color } : {}}>
                        {displayPlayer.username} {isSpectator ? '(玩家1)' : '(我)'}
                      </h3>
                      {displayPlayer.deckName && (
                        <p className={`${playerColorClasses.textSecondary} text-sm`}
                           style={playerColorClasses.customStyle && typeof playerColorClasses.customStyle === 'object' ? { color: playerColorClasses.customStyle.color } : {}}>
                          卡组: {displayPlayer.deckName} - 主角: {(() => {
                            if (displayPlayer.championCardId) {
                              const championFaction = customFactions.find(f => f.id === displayPlayer.championCardId);
                              return championFaction ? championFaction.name : displayPlayer.championCardId;
                            }
                            return displayPlayer.heroName || '未知主战者';
                          })()}
                        </p>
                      )}
                      {/* 主战者效果查看 */}
                      <div className="mt-2">
                        <button
                          onClick={() => {
                            console.log('Current player data:', displayPlayer); // 调试日志
                            
                            let championName = '未知主战者';
                            let championEffect = '无效果描述';
                            
                            // 优先使用 championDescription
                            if (displayPlayer.championDescription) {
                              championEffect = displayPlayer.championDescription;
                            }
                            
                            // 尝试通过 championCardId 查找主战者名称
                            if (displayPlayer.championCardId) {
                              const championFaction = customFactions.find(f => f.id === displayPlayer.championCardId);
                              if (championFaction) {
                                championName = championFaction.name;
                                // 如果没有自定义描述，使用默认描述
                                if (!displayPlayer.championDescription && championFaction.description) {
                                  championEffect = championFaction.description;
                                }
                              }
                            }
                            
                            // 兜底逻辑：使用 championCard
                            if (displayPlayer.championCard) {
                              championName = displayPlayer.championCard.name || championName;
                              if (!displayPlayer.championDescription) {
                                championEffect = displayPlayer.championCard.effect || championEffect;
                              }
                            }
                            
                            setChampionDetail({ name: `${isSpectator ? '玩家1' : '我的'}主战者: ${championName}`, effect: championEffect });
                            setShowChampionDetailModal(true);
                          }}
                          className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded transition-colors"
                          title="查看主战者详情"
                        >
                          主战详情
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* 生命值 */}
                  <div className="mb-3">
                    <div className="flex justify-between items-center mb-1">
                      <span className={`${playerColorClasses.textSecondary} text-xs`}
                            style={playerColorClasses.customStyle && typeof playerColorClasses.customStyle === 'object' ? { color: playerColorClasses.customStyle.color } : {}}>生命值</span>
                      <span className="text-white font-bold text-sm">
                        {displayPlayer.health}/{displayPlayer.maxHealth}
                      </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-red-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${Math.max(0, (displayPlayer.health / displayPlayer.maxHealth) * 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* 费用 */}
                  <div className="mb-3">
                    <div className="flex justify-between items-center mb-1">
                      <span className={`${playerColorClasses.textSecondary} text-xs`}
                            style={playerColorClasses.customStyle && typeof playerColorClasses.customStyle === 'object' ? { color: playerColorClasses.customStyle.color } : {}}>费用</span>
                      <span className="text-white font-bold text-sm">
                        {displayPlayer.mana}/{displayPlayer.maxMana}
                      </span>
                    </div>
                    <div className="flex space-x-1">
                      {Array.from({ length: Math.max(displayPlayer.maxMana, 10) }, (_, index) => (
                        <div
                          key={index}
                          className={`w-3 h-3 rounded-full ${
                            index < displayPlayer.mana ? 'bg-blue-500' : 'bg-gray-600'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* 章节进度 */}
                  <div className="mb-3">
                    <div className="flex justify-between items-center mb-1">
                      <span className={`${playerColorClasses.textSecondary} text-xs`}
                            style={playerColorClasses.customStyle && typeof playerColorClasses.customStyle === 'object' ? { color: playerColorClasses.customStyle.color } : {}}>章节进度</span>
                      <span className="text-white font-bold text-sm">
                        {displayPlayer.chapterProgress || 0}/{displayPlayer.maxChapterProgress || 3}
                      </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${((displayPlayer.chapterProgress || 0) / (displayPlayer.maxChapterProgress || 3)) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* 章节指示物 */}
                  <div className="mb-3">
                    <div className="flex justify-between items-center mb-1">
                      <span className={`${playerColorClasses.textSecondary} text-xs`}
                            style={playerColorClasses.customStyle && typeof playerColorClasses.customStyle === 'object' ? { color: playerColorClasses.customStyle.color } : {}}>章节指示物</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-white font-bold text-sm">
                          {displayPlayer.chapterTokens || 0}
                        </span>
                        {!isSpectator && displayPlayer.userId === user?.id && (
                          <div className="flex space-x-1">
                            <button
                              onClick={() => handleGameAction('modify-player-stats', { type: 'chapterTokens', change: -1 })}
                              className="bg-red-600 hover:bg-red-700 text-white w-5 h-5 rounded text-xs flex items-center justify-center transition-colors"
                              title="减少章节指示物"
                            >
                              -
                            </button>
                            <button
                              onClick={() => handleGameAction('modify-player-stats', { type: 'chapterTokens', change: 1 })}
                              className="bg-green-600 hover:bg-green-700 text-white w-5 h-5 rounded text-xs flex items-center justify-center transition-colors"
                              title="增加章节指示物"
                            >
                              +
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className={`${playerColorClasses.stats} rounded-lg px-2 py-1`}
                         style={playerColorClasses.customStyle && typeof playerColorClasses.customStyle === 'object' ? { backgroundColor: playerColorClasses.customStyle.backgroundColor + 'CC' } : {}}>
                      <div className={`${playerColorClasses.textSecondary} text-xs`}
                           style={playerColorClasses.customStyle && typeof playerColorClasses.customStyle === 'object' ? { color: playerColorClasses.customStyle.color } : {}}>手牌</div>
                      <div className="text-white font-bold">{displayPlayer.handSize}</div>
                    </div>
                    <div className={`${playerColorClasses.stats} rounded-lg px-2 py-1`}
                         style={playerColorClasses.customStyle && typeof playerColorClasses.customStyle === 'object' ? { backgroundColor: playerColorClasses.customStyle.backgroundColor + 'CC' } : {}}>
                      <div className={`${playerColorClasses.textSecondary} text-xs`}
                           style={playerColorClasses.customStyle && typeof playerColorClasses.customStyle === 'object' ? { color: playerColorClasses.customStyle.color } : {}}>牌库</div>
                      <div className="text-white font-bold">{displayPlayer.deckSize}</div>
                    </div>
                  </div>
                  
                  {gameState.currentPlayer === gameState.players.findIndex(p => p.userId === displayPlayer.userId) && (
                    <div className="mt-3 bg-yellow-600 rounded-lg p-2 text-center">
                      <div className="text-white font-bold">🎯 {isSpectator ? '当前回合' : '您的回合'}</div>
                    </div>
                  )}
                  
                  {/* 先攻抽牌提示 */}
                  {displayPlayer.showFirstPlayerDrawHint && gameState.firstPlayer >= 0 && gameState.players[gameState.firstPlayer]?.userId === displayPlayer.userId && (
                    <div className="mt-3 bg-blue-600 rounded-lg p-2 text-center">
                      <div className="text-white font-bold text-sm">💡 结束调度后请自行抽1张牌</div>
                    </div>
                  )}
                </div>
              );
            })()}
            
            {/* 观战模式提示 */}
            {isSpectator && (
              <div className={`${playerColorClasses.bg} bg-opacity-10 backdrop-blur-md rounded-xl p-4`}>
                <h3 className="text-lg font-semibold text-white mb-3 text-center">观战模式</h3>
                <p className="text-gray-300 text-center text-sm">
                  您正在观看这场对战，无法进行游戏操作
                </p>
              </div>
            )}
            
            {/* 自定义字段区域 */}
            <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 玩家1自定义字段 */}
                <div className="bg-white bg-opacity-5 rounded-lg p-3">
                  
                  {/* 现有字段列表 - 两行布局 */}
                  <div className="space-y-2 mb-3">
                    {customFields.map((field) => (
                      <div key={field.id} className="bg-white bg-opacity-10 rounded p-2">
                        {/* 第一行：计数器名称 */}
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-white text-xs font-medium">{field.name}</span>
                          {!isSpectator && (
                            <button
                              onClick={() => handleRemoveCustomField(field.id)}
                              className="bg-gray-600 hover:bg-gray-700 text-white w-4 h-4 rounded text-xs flex items-center justify-center transition-colors"
                              title="删除字段"
                            >
                              ×
                            </button>
                          )}
                        </div>
                        {/* 第二行：数值和操作按钮 */}
                        <div className="flex items-center justify-center space-x-2">
                          {!isSpectator && (
                            <>
                              <button
                                onClick={() => handleUpdateCustomField(field.id, -1)}
                                className="bg-red-600 hover:bg-red-700 text-white w-6 h-6 rounded text-sm flex items-center justify-center transition-colors"
                                title="减少"
                              >
                                -
                              </button>
                              <span className={`text-white font-bold text-sm min-w-[2rem] text-center px-2 py-1 rounded ${
                                field.value > 0 ? 'text-green-400 bg-green-900 bg-opacity-30' : 
                                field.value < 0 ? 'text-red-400 bg-red-900 bg-opacity-30' : 'text-white bg-gray-700'
                              }`}>
                                {field.value}
                              </span>
                              <button
                                onClick={() => handleUpdateCustomField(field.id, 1)}
                                className="bg-green-600 hover:bg-green-700 text-white w-6 h-6 rounded text-sm flex items-center justify-center transition-colors"
                                title="增加"
                              >
                                +
                              </button>
                            </>
                          )}
                          {isSpectator && (
                            <span className={`text-white font-bold text-sm min-w-[2rem] text-center px-2 py-1 rounded ${
                              field.value > 0 ? 'text-green-400 bg-green-900 bg-opacity-30' : 
                              field.value < 0 ? 'text-red-400 bg-red-900 bg-opacity-30' : 'text-white bg-gray-700'
                            }`}>
                              {field.value}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* 添加新字段 */}
                  {!isSpectator && (
                    <div className="relative">
                      <input
                        type="text"
                        value={newFieldName}
                        onChange={(e) => setNewFieldName(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleAddCustomField();
                          }
                        }}
                        placeholder="字段名(最多5字)"
                        className="w-full pr-12 px-2 py-1 bg-white bg-opacity-10 border border-gray-500 rounded text-white placeholder-gray-400 text-xs focus:outline-none focus:ring-1 focus:ring-green-500"
                      />
                      <button
                        onClick={handleAddCustomField}
                        disabled={!newFieldName.trim()}
                        className={`absolute right-1 top-1/2 transform -translate-y-1/2 w-8 h-6 rounded text-xs font-medium transition-colors ${
                          newFieldName.trim()
                            ? 'bg-green-600 hover:bg-green-700 text-white'
                            : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        }`}
                        title="添加字段"
                      >
                        +
                      </button>
                    </div>
                  )}
                  
                </div>
                
                {/* 玩家2自定义字段 */}
                <div className="bg-white bg-opacity-5 rounded-lg p-3">
                  
                  {/* 对手字段列表 */}
                  <div className="space-y-2 mb-3">
                    {opponentCustomFields.map((field) => (
                      <div key={field.id} className="flex items-center justify-between bg-white bg-opacity-10 rounded p-2">
                        <span className="text-white text-sm font-medium">{field.name}</span>
                        <span className={`text-white font-bold text-sm min-w-[2rem] text-center ${
                          field.value > 0 ? 'text-green-400' : 
                          field.value < 0 ? 'text-red-400' : 'text-white'
                        }`}>
                          {field.value}
                        </span>
                      </div>
                    ))}
                  </div>
                  
                  {opponentCustomFields.length === 0 && (
                    <div className="text-center text-gray-400 text-sm py-4">
                      {!isSpectator ? '对手' : '玩家2'}暂无自定义字段
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* 备注区域 */}
            <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 玩家1备注 */}
                <div className="bg-white bg-opacity-5 rounded-lg p-3">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-sm font-medium text-blue-300">
                      {!isSpectator ? '我的备注' : `${player1?.username || '玩家1'}的备注`}
                    </h4>
                    <span className="text-xs text-gray-400">
                      {myNotes.length}/1000
                    </span>
                  </div>
                  <textarea
                    value={myNotes}
                    onChange={(e) => !isSpectator && handleMyNotesChange(e.target.value)}
                    disabled={isSpectator}
                    className={`w-full h-32 bg-white bg-opacity-10 border border-gray-500 rounded text-white placeholder-gray-400 p-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent resize-none ${
                      isSpectator ? 'cursor-not-allowed opacity-75' : ''
                    }`}
                    placeholder={isSpectator ? '观战者无法编辑备注' : '记录游戏策略、对手信息等...'}
                  />
                </div>
                
                {/* 玩家2备注 */}
                <div className="bg-white bg-opacity-5 rounded-lg p-3">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-sm font-medium text-red-300">
                      {!isSpectator ? '对手备注' : `${player2?.username || '玩家2'}的备注`}
                    </h4>
                    <span className="text-xs text-gray-400">
                      {opponentNotes.length}/1000
                    </span>
                  </div>
                  <div 
                    className="w-full h-32 bg-white bg-opacity-10 border border-gray-500 rounded text-white p-2 text-sm overflow-y-auto"
                  >
                    {opponentNotes || <span className="text-gray-500 italic">{isSpectator ? '玩家2' : '对手'}暂无备注</span>}
                  </div>
                </div>
              </div>
            </div>
            
            {/* 弃牌堆查看 */}
            <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-white font-semibold">弃牌堆</h3>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleGameAction('view-graveyard')}
                        className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm transition-colors"
                      >
                        查看弃牌堆
                      </button>
                      {selectedGraveyardCards.length > 0 && (
                        <>
                          <button
                            onClick={() => handleBulkDiscard()}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors"
                          >
                            批量弃牌 ({selectedGraveyardCards.length})
                          </button>
                          <button
                            onClick={() => handleBulkModifyCost()}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
                          >
                            批量修改费用 ({selectedGraveyardCards.length})
                          </button>
                        </>
                      )}
                    </div>
                  </div>
            </div>


            {/* 游戏日志 */}
            <div className={`${opponentColorClasses.bg} bg-opacity-10 backdrop-blur-md rounded-xl p-4`}>
              <h3 className="text-lg font-semibold text-white mb-3">游戏日志</h3>
              <div className="max-h-60 overflow-y-auto space-y-1">
                {gameLog.slice(0).reverse().map((log, index) => {
                  // 获取日志消息文本
                  const logMessage = typeof log === 'string' ? log : log.message;
                  const cardData = typeof log === 'object' ? log.cardData : null;
                  
                  // 检查日志是否包含卡牌操作 - 更宽泛的匹配
                  const cardActionRegex = /(弃了一张牌|使用了卡牌|向.*添加了卡牌|弃掉了场上的卡牌|添加了卡牌|在.*位置.*添加了卡牌|在牌桌位置.*添加了卡牌):\s*(.+?)(?:\s*\(|$)/;
                  const match = logMessage.match(cardActionRegex);
                  
                  if (match) {
                    const [, action, cardName] = match;
                    return (
                      <div key={index} className="text-sm text-gray-300 flex items-center justify-between">
                        <span>{logMessage}</span>
                        <button
                          onClick={() => {
                            if (cardData) {
                              // 如果有完整的卡牌数据，显示详细信息
                              setLogCardDetail(cardData);
                              setShowLogCardDetailModal(true);
                            } else {
                              // 如果没有卡牌数据，创建一个基本的卡牌对象用于显示
                              const basicCardData = {
                                _id: `temp_${Date.now()}`,
                                name: cardName.trim(),
                                type: '故事牌' as const,
                                category: '未知',
                                cost: '?',
                                effect: '暂无详细信息',
                                faction: 'neutral' as const,
                                isPublic: true,
                                createdBy: { _id: 'system', username: '系统' },
                                createdAt: new Date().toISOString()
                              };
                              setLogCardDetail(basicCardData);
                              setShowLogCardDetailModal(true);
                            }
                          }}
                          className="ml-2 bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs transition-colors flex-shrink-0"
                          title="查看卡牌详情"
                        >
                          查看
                        </button>
                      </div>
                    );
                  }
                  
                  return (
                    <div key={index} className="text-sm text-gray-300">
                      {logMessage}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* 弃牌堆模态框 */}
      {showGraveyardModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-40">
          <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-6 max-w-3xl w-full mx-4">
            <h3 className="text-xl font-bold text-white mb-4">
              {currentPlayer?.username} 的弃牌堆 ({graveyardCards.length} 张)
            </h3>
            <div className="grid grid-cols-4 gap-4 max-h-96 overflow-y-auto mb-4">
              {graveyardCards.map((card, index) => (
                <div 
                  key={index} 
                  className={`bg-gray-700 rounded-lg p-3 text-white text-xs shadow-lg border ${selectedGraveyardCards.some(c => c._id === card._id) ? 'border-green-500' : 'border-gray-500'} cursor-pointer hover:bg-gray-600 group relative`}
                  onClick={() => handleToggleGraveyardCardSelection(card)} // 点击卡牌进行选中/取消选中
                >
                  <div className="absolute top-1 right-1">
                    <input
                      type="checkbox"
                      checked={selectedGraveyardCards.some(c => c._id === card._id)}
                      onChange={() => handleToggleGraveyardCardSelection(card)}
                      className="form-checkbox h-4 w-4 text-green-600 rounded"
                    />
                  </div>
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
                        // 这里可以添加查看卡牌详情的功能
                        alert(`${card.name}\n费用: ${card.cost}\n效果: ${card.effect || '无效果'}`);
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs"
                    >
                      查看
                    </button>
                    <button
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        handleGameAction('return-from-graveyard', { card, graveyardIndex: index });
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs"
                    >
                      回手牌
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between space-x-2 mt-4">
              <button
                onClick={() => setSelectedGraveyardCards([])}
                disabled={selectedGraveyardCards.length === 0}
                className="flex-1 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 text-white py-2 px-4 rounded transition-colors"
              >
                清空选择
              </button>
              <button
                onClick={() => setShowGraveyardModal(false)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 主战者详情弹窗 */}
      {showChampionDetailModal && championDetail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-6 max-w-md w-full border border-gray-600">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">{championDetail.name}</h2>
              <button
                onClick={() => {
                  setShowChampionDetailModal(false);
                  setChampionDetail(null);
                }}
                className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="bg-white bg-opacity-5 rounded-lg p-4 mb-4">
              <h3 className="text-sm font-semibold text-gray-300 mb-2">效果描述:</h3>
              <p className="text-white text-sm leading-relaxed whitespace-pre-wrap">{championDetail.effect}</p>
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={() => {
                  setShowChampionDetailModal(false);
                  setChampionDetail(null);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded transition-colors"
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 手牌选择模态框 */}
      {showHandSelectionModal && currentPlayer && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-40">
          <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-6 max-w-3xl w-full mx-4">
            <h3 className="text-xl font-bold text-white mb-4">
              选择要展示的手牌 ({selectedHandCards.length} 张已选)
            </h3>
            <div className="grid grid-cols-4 gap-4 max-h-96 overflow-y-auto mb-4">
              {currentPlayer.hand?.map((card: Card, index: number) => (
                <div 
                  key={index} 
                  className={`bg-gray-700 rounded-lg p-3 text-white text-xs shadow-lg border ${selectedHandCards.some(c => c._id === card._id) ? 'border-green-500' : 'border-gray-500'} cursor-pointer hover:bg-gray-600 group relative`}
                  onClick={() => handleToggleHandCardSelection(card)}
                >
                  <div className="absolute top-1 right-1">
                    <input
                      type="checkbox"
                      checked={selectedHandCards.some(c => c._id === card._id)}
                      onChange={() => handleToggleHandCardSelection(card)}
                      className="form-checkbox h-4 w-4 text-green-600 rounded"
                    />
                  </div>
                  <div className="font-semibold text-center mb-1">{card.name}</div>
                  <div className="text-center text-xs mb-1">费用: {card.cost}</div>
                  {card.type === '配角牌' && (
                    <div className="text-center text-xs">
                      攻: {card.attack} / 生命: {card.health}
                    </div>
                  )}
                  <div className="text-xs text-center mt-1 truncate">{card.effect || '无效果'}</div>
                </div>
              ))}
            </div>
            <div className="flex justify-between space-x-2 mt-4">
              <button
                onClick={() => {
                  handleDisplaySelectedHand(true);
                  setShowHandSelectionModal(false);
                }}
                disabled={selectedHandCards.length === 0}
                className={`flex-1 ${isDisplayingSelectedHand ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} disabled:bg-gray-600 text-white py-2 px-4 rounded transition-colors`}
              >
                {isDisplayingSelectedHand ? `取消展示选中手牌 (${selectedHandCards.length})` : `展示选中手牌 (${selectedHandCards.length})`}
              </button>
              <button
                onClick={() => setSelectedHandCards([])}
                disabled={selectedHandCards.length === 0}
                className="flex-1 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 text-white py-2 px-4 rounded transition-colors"
              >
                清空选择
              </button>
              <button
                onClick={() => setShowHandSelectionModal(false)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 游戏日志卡牌详情模态框 */}
      {showLogCardDetailModal && logCardDetail && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[9999]">
          <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-white mb-4 text-center">卡牌详情</h3>
            
            <div className="bg-gray-800 bg-opacity-50 rounded-lg p-4 mb-4">
              {/* 卡牌图片区域 */}
              <div className="w-full h-32 bg-gray-700 rounded-lg mb-4 flex items-center justify-center">
                {logCardDetail.image ? (
                  <img 
                    src={logCardDetail.image} 
                    alt={logCardDetail.name}
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <div className="text-gray-400 text-center">
                    <div className="text-lg font-semibold">{logCardDetail.name}</div>
                    <div className="text-sm">暂无卡图</div>
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <div className="text-center">
                  <div className="text-white font-bold text-lg">{logCardDetail.name}</div>
                  <div className="text-gray-300 text-sm">{logCardDetail.category} · {logCardDetail.type}</div>
                </div>
                
                <div className="flex justify-between text-sm">
                  <div className="text-yellow-400">费用: {logCardDetail.cost}</div>
                  <div className="text-blue-400">主角: {(() => {
                    const factionMap: { [key: string]: string } = {
                      'neutral': '中立',
                      'hero1': '正义',
                      'hero2': '智慧',
                      'hero3': '力量'
                    };
                    return factionMap[logCardDetail.faction] || logCardDetail.faction;
                  })()}</div>
                </div>
                
                {logCardDetail.type === '配角牌' && (
                  <div className="flex justify-center space-x-4 text-sm">
                    <div className="text-red-400">攻击: {logCardDetail.attack}</div>
                    <div className="text-green-400">生命: {logCardDetail.health}</div>
                  </div>
                )}
                
                <div className="bg-gray-700 rounded p-3">
                  <div className="text-white text-sm font-semibold mb-1">效果描述:</div>
                  <div className="text-gray-300 text-sm">{logCardDetail.effect || '无特殊效果'}</div>
                </div>
                
                {logCardDetail.flavor && (
                  <div className="bg-gray-700 rounded p-3">
                    <div className="text-white text-sm font-semibold mb-1">背景故事:</div>
                    <div className="text-gray-300 text-sm italic">{logCardDetail.flavor}</div>
                  </div>
                )}
                
                <div className="flex justify-between text-xs text-gray-400">
                  <div>创建者: {logCardDetail.createdBy?.username || '未知'}</div>
                  <div>{logCardDetail.isPublic ? '公开' : '私有'}</div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={() => {
                  setShowLogCardDetailModal(false);
                  setLogCardDetail(null);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 基础速查模态框 */}
      {showQuickReferenceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[9999]">
          <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">基础速查</h3>
              <button
                onClick={() => setShowQuickReferenceModal(false)}
                className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded transition-colors"
              >
                ✕
              </button>
            </div>
            
            {/* 搜索和筛选区域 */}
            <div className="mb-4 space-y-3">
              <div className="flex space-x-3">
                <input
                  type="text"
                  value={quickRefSearchTerm}
                  onChange={(e) => setQuickRefSearchTerm(e.target.value)}
                  placeholder="搜索关键字效果..."
                  className="flex-1 px-4 py-2 bg-white bg-opacity-10 border border-gray-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <select
                  value={quickRefSearchField}
                  onChange={(e) => setQuickRefSearchField(e.target.value as 'name' | 'effect')}
                  className="px-4 py-2 bg-white bg-opacity-10 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="name" className="bg-gray-800">搜索标题</option>
                  <option value="effect" className="bg-gray-800">搜索效果</option>
                </select>
              </div>
              
              {/* 类别筛选按钮 */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setQuickRefCategoryFilter('all')}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    quickRefCategoryFilter === 'all' 
                      ? 'bg-green-600 text-white' 
                      : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                  }`}
                >
                  全部
                </button>
                <button
                  onClick={() => setQuickRefCategoryFilter('关键字')}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    quickRefCategoryFilter === '关键字' 
                      ? 'bg-green-600 text-white' 
                      : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                  }`}
                >
                  关键字
                </button>
                <button
                  onClick={() => setQuickRefCategoryFilter('特殊机制')}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    quickRefCategoryFilter === '特殊机制' 
                      ? 'bg-green-600 text-white' 
                      : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                  }`}
                >
                  特殊机制
                </button>
                <button
                  onClick={() => setQuickRefCategoryFilter('状态')}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    quickRefCategoryFilter === '状态' 
                      ? 'bg-green-600 text-white' 
                      : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                  }`}
                >
                  状态
                </button>
                <button
                  onClick={() => setQuickRefCategoryFilter('指示物')}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    quickRefCategoryFilter === '指示物' 
                      ? 'bg-green-600 text-white' 
                      : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                  }`}
                >
                  指示物
                </button>
              </div>
            </div>
            
            {/* 关键字效果卡牌列表 */}
            <div className="max-h-[60vh] overflow-y-auto">
              {(() => {
                // 筛选关键字效果卡牌
                const filteredCards = keywordCards.filter(card => {
                  // 类别筛选 - 基于卡牌的category字段进行精确匹配
                  if (quickRefCategoryFilter !== 'all') {
                    // 直接匹配卡牌的category字段
                    if (card.category !== quickRefCategoryFilter) {
                      return false;
                    }
                  }
                  
                  // 搜索词筛选
                  if (quickRefSearchTerm) {
                    const searchLower = quickRefSearchTerm.toLowerCase();
                    if (quickRefSearchField === 'name') {
                      return card.name.toLowerCase().includes(searchLower);
                    } else {
                      return card.effect.toLowerCase().includes(searchLower) || 
                             card.name.toLowerCase().includes(searchLower) ||
                             card.category.toLowerCase().includes(searchLower);
                    }
                  }
                  
                  return true;
                });
                
                if (filteredCards.length === 0) {
                  return (
                    <div className="text-center text-gray-400 py-8">
                      {keywordCards.length === 0 ? '暂无关键字效果卡牌' : '没有找到匹配的关键字效果'}
                    </div>
                  );
                }
                
                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredCards.map((card) => (
                      <div 
                        key={card._id}
                        className="bg-gray-800 bg-opacity-50 rounded-lg p-4 border border-gray-600 hover:border-green-500 transition-colors"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="text-white font-bold text-lg">{card.name}</h4>
                            <p className="text-gray-300 text-sm">{card.category}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-yellow-400 text-sm">费用: {card.cost}</div>
                            <div className="text-blue-400 text-xs">
                              {(() => {
                                const factionMap: { [key: string]: string } = {
                                  'neutral': '中立',
                                  'hero1': '正义',
                                  'hero2': '智慧',
                                  'hero3': '力量'
                                };
                                return factionMap[card.faction] || card.faction;
                              })()}
                            </div>
                          </div>
                        </div>
                        
                        <div className="bg-gray-700 rounded p-3 mb-3">
                          <div className="text-white text-sm font-semibold mb-1">效果描述:</div>
                          <div className="text-gray-300 text-sm">{card.effect || '无特殊效果'}</div>
                        </div>
                        
                        {card.flavor && (
                          <div className="bg-gray-700 rounded p-3 mb-3">
                            <div className="text-white text-sm font-semibold mb-1">背景故事:</div>
                            <div className="text-gray-300 text-sm italic">{card.flavor}</div>
                          </div>
                        )}
                        
                        <div className="flex justify-between items-center">
                          <div className="text-xs text-gray-400">
                            创建者: {card.createdBy?.username || '未知'}
                          </div>
                          <button
                            onClick={() => {
                              setSelectedKeywordCard(card);
                              // 这里可以添加查看详情的逻辑，或者直接在当前界面显示
                              alert(`${card.name}\n\n效果: ${card.effect}\n\n${card.flavor ? `背景: ${card.flavor}` : ''}`);
                            }}
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs transition-colors"
                          >
                            查看详情
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
            
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowQuickReferenceModal(false)}
                className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 rounded transition-colors"
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

export default GameRoom;
