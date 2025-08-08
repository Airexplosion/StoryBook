import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { setGameState, updatePlayer, nextTurn, setPhase } from '../../store/slices/gameSlice';
import { fetchDecks } from '../../store/slices/decksSlice';
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
  const [gameLog, setGameLog] = useState<string[]>([]);
  const [graveyardCards, setGraveyardCards] = useState<Card[]>([]);
  const [showGraveyardModal, setShowGraveyardModal] = useState(false);
  const [myNotes, setMyNotes] = useState('');
  const [opponentNotes, setOpponentNotes] = useState('');
  const [isSpectator, setIsSpectator] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
  const location = useLocation();

  useEffect(() => {
    console.log('GameRoom useEffect triggered.');
    console.log('Current roomId:', roomId);
    console.log('Current user:', user);

    if (!roomId || !user) {
      console.log('Missing roomId or user, returning.');
      return;
    }

    const queryParams = new URLSearchParams(location.search);
    const spectateMode = queryParams.get('spectate') === 'true';
    setIsSpectator(spectateMode);
    console.log('Is spectator mode:', spectateMode);
    
    if (spectateMode) {
      setShowDeckSelection(false); // 观战模式下不显示卡组选择
    }

    // 获取用户的卡组
    dispatch(fetchDecks() as any)
      .then(() => {
        console.log('Decks fetched successfully');
        setIsLoading(false);
      })
      .catch((err: any) => {
        console.error('Error fetching decks:', err);
        setError('获取卡组失败');
        setIsLoading(false);
      });

    // 连接Socket.io
    const token = localStorage.getItem('token');
    if (token) {
      console.log('Connecting to socket.io and joining room:', roomId);
      socketService.connect(token);
      socketService.joinRoom(roomId, user.id, user.username);
    } else {
      console.log('No token found or user not logged in, cannot connect to socket.io.');
      setError('未找到认证令牌或用户未登录');
      setIsLoading(false);
    }

    // 监听房间位置信息
    socketService.on('room-positions', (data: { positions: { [key: string]: any }, canJoinAsPlayer: boolean, playerStates: string[] }) => {
      console.log('Received room positions:', data);
      setRoomPositions(data.positions);
      setCanJoinAsPlayer(data.canJoinAsPlayer);
      setExistingPlayerIds(data.playerStates);
      if (!data.canJoinAsPlayer && !isSpectator) {
        setError('房间已满，无法加入为玩家。您可以选择观战。');
      }
    });

    // 监听游戏状态更新
    socketService.onGameStateUpdate((roomState) => {
      console.log('Game state update:', roomState);
      console.log('玩家空位信息:', roomState.players.map((p: any) => ({
        username: p.username,
        battlefieldSlots: p.battlefieldSlots,
        effectSlots: p.effectSlots
      })));
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
          return log.message || `${log.playerName}: ${log.action}`;
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
        const newLogEntry = data.message || `${data.playerName}: ${data.action}`;
        setGameLog(prev => {
          // 避免重复添加相同的日志消息
          if (!prev.includes(newLogEntry)) {
            return [...prev, newLogEntry];
          }
          return prev;
        });
      }
    });

    // 监听弃牌堆信息
    socketService.onGraveyardInfo((data) => {
      setGraveyardCards(data.graveyard);
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
    
    if (!deck) {
      console.error('Deck not found!');
      console.error('Looking for deck ID:', selectedDeck);
      console.error('Available deck IDs:', decks.map(d => d._id));
      alert('卡组未找到，请重新选择');
      return;
    }

    if (!deck.heroCard) {
      console.error('Deck has no hero card!');
      console.error('Deck structure:', deck);
      alert('卡组缺少主角牌，请选择其他卡组');
      return;
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
        heroName: deck.heroCard.name,
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
    socketService.sendGameAction({
      roomId,
      action,
      userId: user?.id,
      playerName: user?.username,
      ...data
    });
  };

  // 处理备注更新
  const handleMyNotesChange = (notes: string) => {
    const trimmedNotes = notes.substring(0, 1000); // 限制字符数
    setMyNotes(trimmedNotes);
    // 实时保存到服务器
    handleGameAction('update-notes', { 
      type: 'my-notes', 
      notes: trimmedNotes 
    });
  };

  const handleLeaveRoom = () => {
    if (window.confirm('确定要离开房间吗？')) {
      navigate('/rooms');
    }
  };

  // 获取当前玩家信息
  const currentPlayer = gameState.players.find(p => p.userId === user?.id);
  const opponent = gameState.players.find(p => p.userId !== user?.id);

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
        deck.heroCard.name.toLowerCase().includes(search) ||
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
              第 {gameState.round} 回合
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
          
          <div className="flex items-center space-x-2">
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
            {opponent && (
              <div className={`${opponentColorClasses.bg} ${opponentColorClasses.bgOpacity} border ${opponentColorClasses.border} rounded-xl p-4`}
                   style={opponentColorClasses.customStyle && typeof opponentColorClasses.customStyle === 'object' ? { backgroundColor: opponentColorClasses.customStyle.backgroundColor, borderColor: opponentColorClasses.customStyle.borderColor } : {}}>
                <div className="flex items-center space-x-3 mb-4">
                  <div className={`w-10 h-10 ${opponentColorClasses.avatar} rounded-full flex items-center justify-center`}
                       style={opponentColorClasses.customStyle && typeof opponentColorClasses.customStyle === 'object' ? { backgroundColor: opponentColorClasses.customStyle.backgroundColor } : {}}>
                    <span className="text-white font-bold">
                      {opponent.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h3 className={`${opponentColorClasses.text} font-bold text-sm`}
                        style={opponentColorClasses.customStyle && typeof opponentColorClasses.customStyle === 'object' ? { color: opponentColorClasses.customStyle.color } : {}}>
                      {opponent.username} (对手)
                    </h3>
                    {opponent.deckName && (
                      <p className={`${opponentColorClasses.textSecondary} text-xs`}
                         style={opponentColorClasses.customStyle && typeof opponentColorClasses.customStyle === 'object' ? { color: opponentColorClasses.customStyle.color } : {}}>
                        {opponent.deckName} - {opponent.heroName}
                      </p>
                    )}
                    {/* 对手主战者详情按钮 */}
                    <button
                      onClick={() => {
                        if (opponent.championCard || opponent.championDescription) {
                          const championName = opponent.championCard?.name || '未知主战者';
                          const championEffect = opponent.championDescription || opponent.championCard?.effect || '无效果描述';
                          setChampionDetail({ name: `对手主战者: ${championName}`, effect: championEffect });
                        } else {
                          setChampionDetail({ name: '对手主战者', effect: '无' });
                        }
                        setShowChampionDetailModal(true);
                      }}
                      className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded transition-colors mt-1"
                      title="查看对手主战者详情"
                    >
                      主战详情
                    </button>
                  </div>
                  {gameState.currentPlayer === gameState.players.findIndex(p => p.userId === opponent.userId) && (
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
                        {opponent.health}/{opponent.maxHealth}
                      </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-red-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${Math.max(0, (opponent.health / opponent.maxHealth) * 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* 对手费用 */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className={`${opponentColorClasses.textSecondary} text-xs`}
                            style={opponentColorClasses.customStyle && typeof opponentColorClasses.customStyle === 'object' ? { color: opponentColorClasses.customStyle.color } : {}}>费用</span>
                      <span className="text-white font-bold text-xs">
                        {opponent.mana}/{opponent.maxMana}
                      </span>
                    </div>
                    <div className="flex space-x-1">
                      {Array.from({ length: Math.max(opponent.maxMana, 10) }, (_, index) => (
                        <div
                          key={index}
                          className={`w-2 h-2 rounded-full ${
                            index < opponent.mana ? 'bg-blue-500' : 'bg-gray-600'
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
                        {opponent.chapterProgress || 0}/{opponent.maxChapterProgress || 3}
                      </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${((opponent.chapterProgress || 0) / (opponent.maxChapterProgress || 3)) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex justify-between text-xs">
                    <div className={`${opponentColorClasses.stats} rounded px-2 py-1 text-center`}
                         style={opponentColorClasses.customStyle && typeof opponentColorClasses.customStyle === 'object' ? { backgroundColor: opponentColorClasses.customStyle.backgroundColor + 'CC' } : {}}>
                      <div className={`${opponentColorClasses.textSecondary}`}
                           style={opponentColorClasses.customStyle && typeof opponentColorClasses.customStyle === 'object' ? { color: opponentColorClasses.customStyle.color } : {}}>手牌</div>
                      <div className="text-white font-bold">{opponent.handSize}</div>
                    </div>
                    <div className={`${opponentColorClasses.stats} rounded px-2 py-1 text-center`}
                         style={opponentColorClasses.customStyle && typeof opponentColorClasses.customStyle === 'object' ? { backgroundColor: opponentColorClasses.customStyle.backgroundColor + 'CC' } : {}}>
                      <div className={`${opponentColorClasses.textSecondary}`}
                           style={opponentColorClasses.customStyle && typeof opponentColorClasses.customStyle === 'object' ? { color: opponentColorClasses.customStyle.color } : {}}>牌库</div>
                      <div className="text-white font-bold">{opponent.deckSize}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* 游戏控制 - 放在对手信息下方，我方信息上方 */}
            {!isSpectator && (
              <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-4">
                <h3 className="text-lg font-semibold text-white mb-4">游戏控制</h3>
                
                <div className="space-y-3">
                  {/* 回合控制 */}
                  {gameState.phase === 'playing' && (
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
            
            {/* 我的信息 */}
            {currentPlayer && !isSpectator && (
              <div className={`${playerColorClasses.bg} ${playerColorClasses.bgOpacity} border ${playerColorClasses.border} rounded-xl p-4`}
                   style={playerColorClasses.customStyle && typeof playerColorClasses.customStyle === 'object' ? { backgroundColor: playerColorClasses.customStyle.backgroundColor, borderColor: playerColorClasses.customStyle.borderColor } : {}}>
                <div className="flex items-center space-x-3 mb-4">
                  <div className={`w-10 h-10 ${playerColorClasses.avatar} rounded-full flex items-center justify-center`}
                       style={playerColorClasses.customStyle && typeof playerColorClasses.customStyle === 'object' ? { backgroundColor: playerColorClasses.customStyle.backgroundColor } : {}}>
                    <span className="text-white font-bold">
                      {currentPlayer.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h3 className={`${playerColorClasses.text} font-bold`}
                        style={playerColorClasses.customStyle && typeof playerColorClasses.customStyle === 'object' ? { color: playerColorClasses.customStyle.color } : {}}>
                      {currentPlayer.username} (我)
                    </h3>
                    {currentPlayer.deckName && (
                      <p className={`${playerColorClasses.textSecondary} text-sm`}
                         style={playerColorClasses.customStyle && typeof playerColorClasses.customStyle === 'object' ? { color: playerColorClasses.customStyle.color } : {}}>
                        卡组: {currentPlayer.deckName} - 主角: {currentPlayer.heroName}
                      </p>
                    )}
                    {/* 主战者效果查看 */}
                    <div className="mt-2">
                      <button
                        onClick={() => {
                          if (currentPlayer.championCard || currentPlayer.championDescription) {
                            const championName = currentPlayer.championCard?.name || '未知主战者';
                            const championEffect = currentPlayer.championDescription || currentPlayer.championCard?.effect || '无效果描述';
                            setChampionDetail({ name: `我的主战者: ${championName}`, effect: championEffect });
                          } else {
                            setChampionDetail({ name: '我的主战者', effect: '无' });
                          }
                          setShowChampionDetailModal(true);
                        }}
                        className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded transition-colors"
                        title="查看我的主战者详情"
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
                      {currentPlayer.health}/{currentPlayer.maxHealth}
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-red-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.max(0, (currentPlayer.health / currentPlayer.maxHealth) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* 费用 */}
                <div className="mb-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className={`${playerColorClasses.textSecondary} text-xs`}
                          style={playerColorClasses.customStyle && typeof playerColorClasses.customStyle === 'object' ? { color: playerColorClasses.customStyle.color } : {}}>费用</span>
                    <span className="text-white font-bold text-sm">
                      {currentPlayer.mana}/{currentPlayer.maxMana}
                    </span>
                  </div>
                  <div className="flex space-x-1">
                    {Array.from({ length: Math.max(currentPlayer.maxMana, 10) }, (_, index) => (
                      <div
                        key={index}
                        className={`w-3 h-3 rounded-full ${
                          index < currentPlayer.mana ? 'bg-blue-500' : 'bg-gray-600'
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
                      {currentPlayer.chapterProgress || 0}/{currentPlayer.maxChapterProgress || 3}
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${((currentPlayer.chapterProgress || 0) / (currentPlayer.maxChapterProgress || 3)) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className={`${playerColorClasses.stats} rounded-lg px-2 py-1`}
                       style={playerColorClasses.customStyle && typeof playerColorClasses.customStyle === 'object' ? { backgroundColor: playerColorClasses.customStyle.backgroundColor + 'CC' } : {}}>
                    <div className={`${playerColorClasses.textSecondary} text-xs`}
                         style={playerColorClasses.customStyle && typeof playerColorClasses.customStyle === 'object' ? { color: playerColorClasses.customStyle.color } : {}}>手牌</div>
                    <div className="text-white font-bold">{currentPlayer.handSize}</div>
                  </div>
                  <div className={`${playerColorClasses.stats} rounded-lg px-2 py-1`}
                       style={playerColorClasses.customStyle && typeof playerColorClasses.customStyle === 'object' ? { backgroundColor: playerColorClasses.customStyle.backgroundColor + 'CC' } : {}}>
                    <div className={`${playerColorClasses.textSecondary} text-xs`}
                         style={playerColorClasses.customStyle && typeof playerColorClasses.customStyle === 'object' ? { color: playerColorClasses.customStyle.color } : {}}>牌库</div>
                    <div className="text-white font-bold">{currentPlayer.deckSize}</div>
                  </div>
                </div>
                
                {gameState.currentPlayer === gameState.players.findIndex(p => p.userId === currentPlayer.userId) && (
                  <div className="mt-3 bg-yellow-600 rounded-lg p-2 text-center">
                    <div className="text-white font-bold">🎯 您的回合</div>
                  </div>
                )}
              </div>
            )}
            
            {/* 备注区域 - 放在弃牌堆上方，我的信息下方 */}
            <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-4">
              <h3 className="text-lg font-semibold text-white mb-4 text-center">对战备注</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 我的备注 */}
                <div className="bg-white bg-opacity-5 rounded-lg p-3">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-sm font-medium text-blue-300">
                      {!isSpectator ? '我的备注' : `${currentPlayer?.username || '玩家1'}的备注`}
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
                
                {/* 对手备注 */}
                <div className="bg-white bg-opacity-5 rounded-lg p-3">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-sm font-medium text-red-300">
                      {!isSpectator ? '对手备注' : `${gameState.players.find(p => p.userId !== user?.id)?.username || '玩家2'}的备注`}
                    </h4>
                    <span className="text-xs text-gray-400">
                      {opponentNotes.length}/1000
                    </span>
                  </div>
                  <div 
                    className="w-full h-32 bg-white bg-opacity-10 border border-gray-500 rounded text-white p-2 text-sm overflow-y-auto"
                  >
                    {opponentNotes || <span className="text-gray-500 italic">对手暂无备注</span>}
                  </div>
                </div>
              </div>
            </div>
            
            {/* 数值调整模块 - 放在我的信息下面 */}
            {currentPlayer && !isSpectator && (
              <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-4">
                <h3 className="text-lg font-semibold text-white mb-4">数值调整</h3>
                
                <div className="space-y-3">
                  {/* 生命值调整 */}
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300 text-sm">生命值</span>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleGameAction('modify-player-stats', { type: 'health', change: -5 })}
                        className="bg-red-600 hover:bg-red-700 text-white w-8 h-8 rounded text-sm transition-colors"
                      >
                        -5
                      </button>
                      <button
                        onClick={() => handleGameAction('modify-player-stats', { type: 'health', change: -1 })}
                        className="bg-red-600 hover:bg-red-700 text-white w-8 h-8 rounded text-sm transition-colors"
                      >
                        -1
                      </button>
                      <button
                        onClick={() => handleGameAction('modify-player-stats', { type: 'health', change: 1 })}
                        className="bg-green-600 hover:bg-green-700 text-white w-8 h-8 rounded text-sm transition-colors"
                      >
                        +1
                      </button>
                      <button
                        onClick={() => handleGameAction('modify-player-stats', { type: 'health', change: 5 })}
                        className="bg-green-600 hover:bg-green-700 text-white w-8 h-8 rounded text-sm transition-colors"
                      >
                        +5
                      </button>
                    </div>
                  </div>

                  {/* 生命值上限调整 */}
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300 text-sm">生命上限</span>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleGameAction('modify-player-stats', { type: 'maxHealth', change: -5 })}
                        className="bg-red-600 hover:bg-red-700 text-white w-8 h-8 rounded text-sm transition-colors"
                      >
                        -5
                      </button>
                      <button
                        onClick={() => handleGameAction('modify-player-stats', { type: 'maxHealth', change: -1 })}
                        className="bg-red-600 hover:bg-red-700 text-white w-8 h-8 rounded text-sm transition-colors"
                      >
                        -1
                      </button>
                      <button
                        onClick={() => handleGameAction('modify-player-stats', { type: 'maxHealth', change: 1 })}
                        className="bg-green-600 hover:bg-green-700 text-white w-8 h-8 rounded text-sm transition-colors"
                      >
                        +1
                      </button>
                      <button
                        onClick={() => handleGameAction('modify-player-stats', { type: 'maxHealth', change: 5 })}
                        className="bg-green-600 hover:bg-green-700 text-white w-8 h-8 rounded text-sm transition-colors"
                      >
                        +5
                      </button>
                    </div>
                  </div>

                  {/* 费用调整 */}
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300 text-sm">当前费用</span>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleGameAction('modify-player-stats', { type: 'mana', change: -1 })}
                        className="bg-red-600 hover:bg-red-700 text-white w-8 h-8 rounded text-sm transition-colors"
                      >
                        -1
                      </button>
                      <button
                        onClick={() => handleGameAction('modify-player-stats', { type: 'mana', change: 1 })}
                        className="bg-green-600 hover:bg-green-700 text-white w-8 h-8 rounded text-sm transition-colors"
                      >
                        +1
                      </button>
                    </div>
                  </div>

                  {/* 费用上限调整 */}
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300 text-sm">费用上限</span>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleGameAction('modify-player-stats', { type: 'maxMana', change: -1 })}
                        className="bg-red-600 hover:bg-red-700 text-white w-8 h-8 rounded text-sm transition-colors"
                      >
                        -1
                      </button>
                      <button
                        onClick={() => handleGameAction('modify-player-stats', { type: 'maxMana', change: 1 })}
                        className="bg-green-600 hover:bg-green-700 text-white w-8 h-8 rounded text-sm transition-colors"
                      >
                        +1
                      </button>
                    </div>
                  </div>

                  {/* 章节进度调整 */}
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300 text-sm">章节进度</span>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleGameAction('modify-player-stats', { type: 'chapter', change: -1 })}
                        className="bg-red-600 hover:bg-red-700 text-white w-8 h-8 rounded text-sm transition-colors"
                      >
                        -1
                      </button>
                      <button
                        onClick={() => handleGameAction('modify-player-stats', { type: 'chapter', change: 1 })}
                        className="bg-green-600 hover:bg-green-700 text-white w-8 h-8 rounded text-sm transition-colors"
                      >
                        +1
                      </button>
                    </div>
                  </div>

                  {/* 章节进度上限调整 */}
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300 text-sm">章节上限</span>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleGameAction('modify-player-stats', { type: 'maxChapter', change: -1 })}
                        className="bg-red-600 hover:bg-red-700 text-white w-8 h-8 rounded text-sm transition-colors"
                      >
                        -1
                      </button>
                      <button
                        onClick={() => handleGameAction('modify-player-stats', { type: 'maxChapter', change: 1 })}
                        className="bg-green-600 hover:bg-green-700 text-white w-8 h-8 rounded text-sm transition-colors"
                      >
                        +1
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {isSpectator && (
              <div className={`${playerColorClasses.bg} bg-opacity-10 backdrop-blur-md rounded-xl p-4`}>
                <h3 className="text-lg font-semibold text-white mb-3 text-center">观战模式</h3>
                <p className="text-gray-300 text-center text-sm">
                  您正在观看这场对战，无法进行游戏操作
                </p>
              </div>
            )}

            {/* 游戏日志 */}
            <div className={`${opponentColorClasses.bg} bg-opacity-10 backdrop-blur-md rounded-xl p-4`}>
              <h3 className="text-lg font-semibold text-white mb-3">游戏日志</h3>
              <div className="max-h-60 overflow-y-auto space-y-1">
                {gameLog.slice(0).reverse().map((log, index) => (
                  <div key={index} className="text-sm text-gray-300">
                    {log}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      
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
              <p className="text-white text-sm leading-relaxed">{championDetail.effect}</p>
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
      
    </div>
  );
};

export default GameRoom;
