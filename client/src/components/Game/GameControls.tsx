import React, { useState } from 'react';
import { GameState, Deck } from '../../types';

interface GameControlsProps {
  gameState: GameState;
  currentUserId?: string;
  onGameAction: (action: string, data?: any) => void;
  decks?: Deck[];
  selectedDeck?: string;
  onDeckSelect?: (deckId: string) => void;
  onDeckConfirm?: () => void;
  isDeckLocked?: boolean;
}

const GameControls: React.FC<GameControlsProps> = ({ 
  gameState, 
  currentUserId, 
  onGameAction, 
  decks = [], 
  selectedDeck = '', 
  onDeckSelect, 
  onDeckConfirm, 
  isDeckLocked = false 
}) => {
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [newCardName, setNewCardName] = useState('');
  const [showEndGameModal, setShowEndGameModal] = useState(false);

  const currentPlayer = gameState.players.find(p => p.userId === currentUserId);
  const isMyTurn = currentPlayer && gameState.currentPlayer === gameState.players.findIndex(p => p.userId === currentUserId);

  const handleEndTurn = () => {
    onGameAction('end-turn');
  };

  const handleStartGame = () => {
    onGameAction('start-game');
  };

  const handlePauseGame = () => {
    onGameAction('pause-game');
  };

  const handleResumeGame = () => {
    onGameAction('resume-game');
  };

  const handleEndGame = () => {
    onGameAction('end-game');
    setShowEndGameModal(false);
  };

  const handleAgreeToEnd = () => {
    onGameAction('agree-to-end');
    setShowEndGameModal(false);
  };

  const handleAddCard = () => {
    if (newCardName.trim()) {
      onGameAction('add-card-to-deck', { cardName: newCardName.trim() });
      setNewCardName('');
      setShowAddCardModal(false);
    }
  };

  const handleTemporaryLeave = () => {
    onGameAction('temporary-leave');
  };

  const handleDrawCards = (count: number) => {
    onGameAction('draw-multiple-cards', { count });
  };

  const handleReturnCardToDeck = () => {
    onGameAction('return-card-to-deck');
  };

  const handleMulliganComplete = () => {
    onGameAction('mulligan-complete');
  };

  const handleViewGraveyard = () => {
    onGameAction('view-graveyard');
  };

  const handleModifyStats = (type: 'health' | 'mana' | 'chapter' | 'maxMana' | 'maxChapter' | 'maxHealth', change: number) => {
    onGameAction('modify-player-stats', { type, change });
  };

  const handleSearchDeck = () => {
    onGameAction('search-deck');
  };

  return (
    <div className="space-y-4">
      {/* 卡组选择 */}
      {!isDeckLocked && decks.length > 0 && (
        <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-4">
          <h3 className="text-lg font-semibold text-white mb-4">选择卡组</h3>
          
          <div className="space-y-3">
            <select
              value={selectedDeck}
              onChange={(e) => onDeckSelect?.(e.target.value)}
              className="w-full px-3 py-2 bg-white bg-opacity-10 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="" className="bg-gray-800">请选择卡组...</option>
              {decks.map(deck => (
                <option key={deck._id} value={deck._id} className="bg-gray-800">
                  {deck.name} - {deck.heroCard.name} ({deck.totalCards}张)
                </option>
              ))}
            </select>
            
            {selectedDeck && (
              <div className="bg-white bg-opacity-5 rounded p-3">
                {(() => {
                  const deck = decks.find(d => d._id === selectedDeck);
                  return deck ? (
                    <div>
                      <h4 className="text-white font-medium mb-2">{deck.name}</h4>
                      <p className="text-gray-300 text-sm mb-1">主角: {deck.heroCard.name}</p>
                      <p className="text-gray-300 text-sm mb-1">卡牌总数: {deck.totalCards}</p>
                      <p className="text-gray-400 text-xs">创建者: {deck.createdBy.username}</p>
                    </div>
                  ) : null;
                })()}
              </div>
            )}
            
            <button
              onClick={onDeckConfirm}
              disabled={!selectedDeck}
              className={`w-full py-2 px-4 rounded font-semibold transition-colors ${
                selectedDeck 
                  ? 'bg-green-600 hover:bg-green-700 text-white' 
                  : 'bg-gray-600 text-gray-300 cursor-not-allowed'
              }`}
            >
              确认卡组
            </button>
          </div>
        </div>
      )}


      {/* 游戏控制 */}
      <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-4">
        <h3 className="text-lg font-semibold text-white mb-4">游戏控制</h3>
        
        <div className="space-y-3">
          {/* 回合控制 */}
          {gameState.phase === 'playing' && (
            <button
              onClick={handleEndTurn}
              disabled={!isMyTurn}
              className={`w-full py-3 px-4 rounded font-semibold transition-colors ${
                isMyTurn 
                  ? 'bg-green-600 hover:bg-green-700 text-white' 
                  : 'bg-gray-600 text-gray-300 cursor-not-allowed'
              }`}
            >
              {isMyTurn ? '结束回合' : '等待对手'}
            </button>
          )}
        </div>
      </div>


      {/* 数值调整 */}
      <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-4">
        <h3 className="text-lg font-semibold text-white mb-4">数值调整</h3>
        
        <div className="space-y-3">
          {/* 生命值调整 */}
          <div className="flex items-center justify-between">
            <span className="text-gray-300 text-sm">生命值</span>
            <div className="flex space-x-2">
              <button
                onClick={() => handleModifyStats('health', -5)}
                className="bg-red-600 hover:bg-red-700 text-white w-8 h-8 rounded text-sm transition-colors"
              >
                -5
              </button>
              <button
                onClick={() => handleModifyStats('health', -1)}
                className="bg-red-600 hover:bg-red-700 text-white w-8 h-8 rounded text-sm transition-colors"
              >
                -1
              </button>
              <button
                onClick={() => handleModifyStats('health', 1)}
                className="bg-green-600 hover:bg-green-700 text-white w-8 h-8 rounded text-sm transition-colors"
              >
                +1
              </button>
              <button
                onClick={() => handleModifyStats('health', 5)}
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
                onClick={() => handleModifyStats('maxHealth', -5)}
                className="bg-red-600 hover:bg-red-700 text-white w-8 h-8 rounded text-sm transition-colors"
              >
                -5
              </button>
              <button
                onClick={() => handleModifyStats('maxHealth', -1)}
                className="bg-red-600 hover:bg-red-700 text-white w-8 h-8 rounded text-sm transition-colors"
              >
                -1
              </button>
              <button
                onClick={() => handleModifyStats('maxHealth', 1)}
                className="bg-green-600 hover:bg-green-700 text-white w-8 h-8 rounded text-sm transition-colors"
              >
                +1
              </button>
              <button
                onClick={() => handleModifyStats('maxHealth', 5)}
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
                onClick={() => handleModifyStats('mana', -1)}
                className="bg-red-600 hover:bg-red-700 text-white w-8 h-8 rounded text-sm transition-colors"
              >
                -1
              </button>
              <button
                onClick={() => handleModifyStats('mana', 1)}
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
                onClick={() => handleModifyStats('maxMana', -1)}
                className="bg-red-600 hover:bg-red-700 text-white w-8 h-8 rounded text-sm transition-colors"
              >
                -1
              </button>
              <button
                onClick={() => handleModifyStats('maxMana', 1)}
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
                onClick={() => handleModifyStats('chapter', -1)}
                className="bg-red-600 hover:bg-red-700 text-white w-8 h-8 rounded text-sm transition-colors"
              >
                -1
              </button>
              <button
                onClick={() => handleModifyStats('chapter', 1)}
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
                onClick={() => handleModifyStats('maxChapter', -1)}
                className="bg-red-600 hover:bg-red-700 text-white w-8 h-8 rounded text-sm transition-colors"
              >
                -1
              </button>
              <button
                onClick={() => handleModifyStats('maxChapter', 1)}
                className="bg-green-600 hover:bg-green-700 text-white w-8 h-8 rounded text-sm transition-colors"
              >
                +1
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 添加卡牌模态框 */}
      {showAddCardModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-xl font-bold text-white mb-4">添加卡牌到牌堆</h3>
            
            <input
              type="text"
              value={newCardName}
              onChange={(e) => setNewCardName(e.target.value)}
              className="w-full px-3 py-2 bg-white bg-opacity-10 border border-gray-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              placeholder="输入卡牌名称..."
            />
            
            <div className="flex space-x-3">
              <button
                onClick={() => setShowAddCardModal(false)}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleAddCard}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded transition-colors"
              >
                添加
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 结束游戏确认模态框 */}
      {showEndGameModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-xl font-bold text-white mb-4">确认结束游戏</h3>
            <p className="text-gray-300 mb-6">确定要结束当前游戏吗？游戏进度将不会保存。</p>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setShowEndGameModal(false)}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleEndGame}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded transition-colors"
              >
                确认结束
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameControls;
