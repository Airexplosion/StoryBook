import React, { useState } from 'react';
import { GamePlayer } from '../../types';

interface PlayerInfoProps {
  player: GamePlayer;
  isCurrentPlayer: boolean;
  isOpponent: boolean;
  firstPlayer?: number;
  playerIndex?: number;
}

const PlayerInfo: React.FC<PlayerInfoProps> = ({ player, isCurrentPlayer, isOpponent, firstPlayer, playerIndex }) => {
  const [notes, setNotes] = useState(player.notes || '');
  const [showNotes, setShowNotes] = useState(false);

  const handleNotesChange = (newNotes: string) => {
    setNotes(newNotes);
    // 这里可以添加保存备注的逻辑
  };

  return (
    <div className={`bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-4 ${
      isCurrentPlayer ? 'ring-2 ring-blue-500' : ''
    }`}>
      {/* 玩家基本信息 */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-bold text-white">{player.username}</h3>
          {isCurrentPlayer && (
            <span className="bg-blue-600 text-white px-2 py-1 rounded-full text-xs mr-2">
              当前回合
            </span>
          )}
          {firstPlayer !== undefined && playerIndex !== undefined && (
            <span className={`px-2 py-1 rounded-full text-xs ${
              firstPlayer === playerIndex ? 'bg-yellow-500 text-white' : 'bg-gray-500 text-white'
            }`}>
              {firstPlayer === playerIndex ? '先手' : '后手'}
            </span>
          )}
        </div>
        <p className="text-gray-300 text-sm">主角: {player.heroName}</p>
      </div>

      {/* 生命值 */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-1">
          <span className="text-gray-300 text-sm">生命值</span>
          <span className="text-white font-semibold">
            {player.health}/{player.maxHealth}
          </span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-3">
          <div 
            className="bg-red-500 h-3 rounded-full transition-all duration-300"
            style={{ width: `${Math.max(0, (player.health / player.maxHealth) * 100)}%` }}
          />
        </div>
      </div>

      {/* 费用/法力值 */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-1">
          <span className="text-gray-300 text-sm">当前费用</span>
          <span className="text-white font-semibold">
            {player.mana}/{player.maxMana}
          </span>
        </div>
        <div className="flex space-x-1">
          {Array.from({ length: player.maxMana }, (_, index) => (
            <div
              key={index}
              className={`w-4 h-4 rounded-full ${
                index < player.mana ? 'bg-blue-500' : 'bg-gray-600'
              }`}
            />
          ))}
        </div>
      </div>

      {/* 章节进度 */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-1">
          <span className="text-gray-300 text-sm">章节指示物</span>
          <span className="text-white font-semibold">
            {player.chapterTokens}/3
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-300 text-sm">章节进度</span>
          <span className="text-white font-semibold">
            {player.chapterProgress}/{player.maxChapterProgress || 3}
          </span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2 mt-1">
          <div 
            className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(player.chapterProgress / (player.maxChapterProgress || 3)) * 100}%` }}
          />
        </div>
      </div>

      {/* 牌堆信息 */}
      <div className="mb-4 grid grid-cols-2 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-white">{player.handSize}</div>
          <div className="text-gray-300 text-xs">手牌</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-white">{player.deckSize}</div>
          <div className="text-gray-300 text-xs">牌堆</div>
        </div>
      </div>

      {/* 玩家状态 */}
      <div className="mb-4">
        <div className="flex items-center justify-center space-x-2">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
            player.isReady ? 'bg-green-600 text-white' : 'bg-yellow-600 text-white'
          }`}>
            {player.isReady ? '准备就绪' : '未准备'}
          </span>
          {player.temporaryLeave && (
            <span className="bg-orange-600 text-white px-2 py-1 rounded-full text-xs">
              暂离
            </span>
          )}
        </div>
      </div>

      {/* 备注区域（仅对自己可见） */}
      {!isOpponent && (
        <div className="border-t border-gray-600 pt-4">
          <button
            onClick={() => setShowNotes(!showNotes)}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded text-sm transition-colors mb-2"
          >
            {showNotes ? '隐藏备注' : '显示备注'}
          </button>
          
          {showNotes && (
            <textarea
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="在这里记录游戏备注..."
              className="w-full h-20 px-3 py-2 bg-white bg-opacity-10 border border-gray-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
            />
          )}
        </div>
      )}
    </div>
  );
};

export default PlayerInfo;
