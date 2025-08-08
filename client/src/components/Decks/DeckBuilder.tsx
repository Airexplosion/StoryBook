import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { fetchDecks, createDeck, updateDeck, deleteDeck } from '../../store/slices/decksSlice';
import { fetchCards } from '../../store/slices/cardsSlice';
import { Card, Deck, DeckCard } from '../../types';
import DeckForm from './DeckForm';
import api from '../../services/api'; // Import api
import SearchableSelect from '../common/SearchableSelect'; // Import SearchableSelect

const DeckBuilder: React.FC = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingDeck, setEditingDeck] = useState<Deck | null>(null);
  const [viewingDeck, setViewingDeck] = useState<Deck | null>(null);
  const [filter, setFilter] = useState({
    search: '',
    showPublic: true,
    showPrivate: true
  });

  // State for custom types, factions, categories (loaded from config)
  const [customFactions, setCustomFactions] = useState<Array<{ id: string; name: string; description?: string }>>([]);
  const [customTypes, setCustomTypes] = useState<Array<{ id: string; name: string }>>([]);
  const [customCategories, setCustomCategories] = useState<any>({});

  const dispatch = useDispatch();
  const { decks, isLoading: decksLoading, error } = useSelector((state: RootState) => state.decks);
  const { cards, isLoading: cardsLoading } = useSelector((state: RootState) => state.cards);
  const { user } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    dispatch(fetchDecks() as any);
    dispatch(fetchCards() as any);
    loadGameConfig(); // Load game config on mount
  }, [dispatch]);

  // Load game config
  const loadGameConfig = async () => {
    try {
      const response = await api.config.getConfig();
      const config = response.data;
      
      if (config.factions) setCustomFactions(config.factions);
      if (config.types) setCustomTypes(config.types);
      if (config.categories) setCustomCategories(config.categories);
    } catch (error) {
      console.error('加载配置失败:', error);
    }
  };

  const filteredDecks = decks.filter(deck => {
    if (filter.search && !deck.name.toLowerCase().includes(filter.search.toLowerCase())) return false;
    if (!filter.showPublic && deck.isPublic) return false;
    if (!filter.showPrivate && !deck.isPublic) return false;
    return true;
  });

  // 将用户的卡组排在前面
  const sortedDecks = [...filteredDecks].sort((a, b) => {
    if (a.createdBy._id === user?.id && b.createdBy._id !== user?.id) return -1;
    if (a.createdBy._id !== user?.id && b.createdBy._id === user?.id) return 1;
    return 0;
  });

  const handleCreateDeck = async (deckData: { 
    name: string; 
    cards: DeckCard[]; 
    isPublic: boolean;
    championCardId?: string;
    championDescription?: string;
  }) => {
    await dispatch(createDeck(deckData as any) as any);
    // 重新获取卡组列表以确保界面更新
    await dispatch(fetchDecks() as any);
    setShowCreateModal(false);
  };

  const handleUpdateDeck = async (deckData: { 
    name: string; 
    cards: DeckCard[]; 
    isPublic: boolean;
    championCardId?: string;
    championDescription?: string;
  }) => {
    if (editingDeck) {
      await dispatch(updateDeck({ id: editingDeck._id, deckData: deckData as any }) as any);
      // 重新获取卡组列表以确保界面更新
      await dispatch(fetchDecks() as any);
      setEditingDeck(null);
    }
  };

  const handleDeleteDeck = async (deckId: string) => {
    if (window.confirm('确定要删除这个卡组吗？')) {
      dispatch(deleteDeck(deckId) as any);
    }
  };

  const getFactionText = (factionId: string) => {
    const faction = customFactions.find(f => f.id === factionId);
    return faction ? faction.name : factionId;
  };

  const DeckComponent: React.FC<{ deck: Deck }> = ({ deck }) => (
    <div className={`bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-6 hover:bg-opacity-20 transition-all ${
      deck.createdBy._id === user?.id ? 'ring-2 ring-blue-500' : ''
    }`}>
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xl font-bold text-white">
          {deck.createdBy._id === user?.id && '👤 '}
          {deck.name}
        </h3>
        <div className="flex space-x-2">
          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
            deck.isPublic ? 'bg-green-600 text-white' : 'bg-yellow-600 text-white'
          }`}>
            {deck.isPublic ? '公开' : '私有'}
          </span>
          {deck.createdBy._id === user?.id && (
            <span className="px-2 py-1 bg-blue-600 text-white rounded-full text-xs font-semibold">
              我的卡组
            </span>
          )}
        </div>
      </div>

      <div className="text-sm text-gray-300 mb-4">
        <p><span className="text-purple-400">主角:</span>
          <strong className="text-white">
            {deck.championCardId ? (() => {
              const championFaction = customFactions.find(f => f.id === deck.championCardId);
              return championFaction ? championFaction.name : deck.championCardId;
            })() : '未指定'}
          </strong>
          {deck.championDescription && (
            <button
              onClick={() => {
                alert(deck.championDescription);
              }}
              className="ml-2 text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded transition-colors"
              title="查看主角效果"
            >
              查看效果
            </button>
          )}
        </p>
        <p><span className="text-blue-400">卡牌数量:</span> {deck.totalCards}</p>
        <p><span className="text-green-400">卡牌种类:</span> {deck.cards.length}种</p>
        <p><span className="text-yellow-400">创建者:</span> {deck.createdBy.username}</p>
        <p><span className="text-gray-400">创建时间:</span> {new Date(deck.createdAt).toLocaleDateString()}</p>
      </div>

      {/* 卡组统计 */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-blue-600 bg-opacity-20 rounded p-2 text-center">
          <div className="text-sm font-bold text-blue-400">
            {deck.cards.filter(dc => dc.card.type === 'story').reduce((sum, dc) => sum + dc.count, 0)}
          </div>
          <div className="text-xs text-gray-300">故事牌</div>
        </div>
        <div className="bg-green-600 bg-opacity-20 rounded p-2 text-center">
          <div className="text-sm font-bold text-green-400">
            {deck.cards.filter(dc => dc.card.type === 'character').reduce((sum, dc) => sum + dc.count, 0)}
          </div>
          <div className="text-xs text-gray-300">配角牌</div>
        </div>
        <div className="bg-purple-600 bg-opacity-20 rounded p-2 text-center">
          <div className="text-sm font-bold text-purple-400">
            {deck.cards.filter(dc => dc.card.type === 'hero').reduce((sum, dc) => sum + dc.count, 0)}
          </div>
          <div className="text-xs text-gray-300">主角牌</div>
        </div>
      </div>

      <div className="flex space-x-2">
        <button
          onClick={() => setViewingDeck(deck)}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded transition-colors"
        >
          查看详情
        </button>

        {deck.createdBy._id === user?.id && (
          <>
            <button
              onClick={() => setEditingDeck(deck)}
              className="bg-green-600 hover:bg-green-700 text-white py-2 px-3 rounded transition-colors"
            >
              编辑
            </button>
            <button
              onClick={() => handleDeleteDeck(deck._id)}
              className="bg-red-600 hover:bg-red-700 text-white py-2 px-3 rounded transition-colors"
            >
              删除
            </button>
          </>
        )}
      </div>
    </div>
  );

  if (decksLoading || cardsLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-white text-xl">📚 加载卡组中...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold text-white">📚 卡组构建</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center space-x-2"
        >
          <span>🔨</span>
          <span>构建卡组</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-500 bg-opacity-20 border border-red-500 text-red-100 px-4 py-3 rounded-md mb-6">
          ❌ 错误: {error}
        </div>
      )}

      {/* 筛选器 */}
      <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-6 mb-8">
        <h3 className="text-white font-semibold mb-4">🔍 卡组筛选</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-2">搜索卡组</label>
            <input
              type="text"
              value={filter.search}
              onChange={(e) => setFilter({...filter, search: e.target.value})}
              className="w-full px-3 py-2 bg-white bg-opacity-10 border border-gray-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="搜索卡组名称..."
            />
          </div>

          <div className="flex items-center space-x-4">
            <label className="flex items-center text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={filter.showPublic}
                onChange={(e) => setFilter({...filter, showPublic: e.target.checked})}
                className="mr-2"
              />
              显示公开卡组
            </label>
          </div>

          <div className="flex items-center space-x-4">
            <label className="flex items-center text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={filter.showPrivate}
                onChange={(e) => setFilter({...filter, showPrivate: e.target.checked})}
                className="mr-2"
              />
              显示私有卡组
            </label>
          </div>
        </div>
      </div>

      {/* 统计信息 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-blue-400">{decks.filter(d => d.createdBy._id === user?.id).length}</div>
          <div className="text-gray-300 text-sm">我的卡组</div>
        </div>
        <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-green-400">{decks.filter(d => d.isPublic).length}</div>
          <div className="text-gray-300 text-sm">公开卡组</div>
        </div>
        <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-purple-400">{decks.filter(d => !d.isPublic).length}</div>
          <div className="text-gray-300 text-sm">私有卡组</div>
        </div>
        <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-yellow-400">{decks.length}</div>
          <div className="text-gray-300 text-sm">总卡组数</div>
        </div>
      </div>

      {/* 卡组列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedDecks.map((deck) => (
          <DeckComponent key={deck._id} deck={deck} />
        ))}
      </div>

      {filteredDecks.length === 0 && !decksLoading && (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">📚</div>
          <h3 className="text-2xl font-bold text-white mb-4">
            {filter.search ? '未找到匹配的卡组' : '暂无卡组'}
          </h3>
          <p className="text-gray-300 mb-8">
            {filter.search ? '尝试调整搜索条件' : '构建你的第一个卡组开始游戏吧！'}
          </p>
          <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-6 max-w-2xl mx-auto">
            <h4 className="text-white font-semibold mb-3">💡 卡组构建提示</h4>
            <div className="text-left text-gray-300 space-y-2 text-sm">
              <p>• 牌堆可携带卡牌总数为<strong className="text-yellow-400">40张卡牌</strong>（虽然你可以超出这个数字，但通常对局规则下请遵循此规则）</p>
              <p>• 同名卡牌数量<strong className="text-green-400">3张</strong></p>
              <p>• 可以选择<strong className="text-blue-400">中立卡</strong>和<strong className="text-orange-400">主角专属卡</strong></p>
              <p>• 主角牌<strong className="text-purple-400">通常限制一张</strong>，特殊情况除外</p>
            </div>
          </div>
        </div>
      )}

      {/* 创建卡组模态框 */}
      {showCreateModal && (
        <DeckForm
          cards={cards}
          customFactions={customFactions}
          customTypes={customTypes}
          customCategories={customCategories}
          onSubmit={handleCreateDeck}
          onCancel={() => setShowCreateModal(false)}
        />
      )}

      {/* 编辑卡组模态框 */}
      {editingDeck && (
        <DeckForm
          deck={editingDeck}
          cards={cards}
          customFactions={customFactions}
          customTypes={customTypes}
          customCategories={customCategories}
          onSubmit={handleUpdateDeck}
          onCancel={() => setEditingDeck(null)}
        />
      )}

      {/* 查看卡组详情模态框 */}
      {viewingDeck && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-8 max-w-6xl w-full max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">📖 卡组详情: {viewingDeck.name}</h2>
              <button
                onClick={() => setViewingDeck(null)}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded transition-colors"
              >
                关闭
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* 左侧：主角和基本信息 */}
              <div className="space-y-6">
                {viewingDeck.championCardId && (
                  <div className="bg-white bg-opacity-10 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-white mb-3">⭐ 主角</h3>
                    <div className="bg-gradient-to-br from-purple-800 to-purple-900 rounded-lg p-4 border-2 border-purple-500">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-white">
                          {(() => {
                            const championFaction = customFactions.find(f => f.id === viewingDeck.championCardId);
                            return championFaction ? championFaction.name : viewingDeck.championCardId;
                          })()}
                        </h4>
                      </div>
                      <div className="text-green-400 text-sm">
                        <p className="font-semibold">效果:</p>
                        <p>
                          {(() => {
                            const championFaction = customFactions.find(f => f.id === viewingDeck.championCardId);
                            return viewingDeck.championDescription || 
                                   (championFaction ? championFaction.description : null) || 
                                   '无效果描述';
                          })()}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-white bg-opacity-10 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-3">📊 卡组信息</h3>
                  <div className="text-gray-300 space-y-2">
                    <p>总卡牌数: <span className="text-yellow-400 font-bold">{viewingDeck.totalCards}</span></p>
                    <p>创建者: <span className="text-blue-400">{viewingDeck.createdBy.username}</span></p>
                    <p>可见性: <span className={viewingDeck.isPublic ? 'text-green-400' : 'text-yellow-400'}>
                      {viewingDeck.isPublic ? '公开' : '私有'}
                    </span></p>
                    <p>创建时间: <span className="text-gray-400">{new Date(viewingDeck.createdAt).toLocaleDateString()}</span></p>
                  </div>
                </div>

                {/* 卡组统计 */}
                <div className="bg-white bg-opacity-10 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-3">📈 卡牌统计</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-blue-400">故事牌:</span>
                      <span className="text-white font-bold">
                        {viewingDeck.cards.filter(dc => dc.card.type === 'story').reduce((sum, dc) => sum + dc.count, 0)}张
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-400">配角牌:</span>
                      <span className="text-white font-bold">
                        {viewingDeck.cards.filter(dc => dc.card.type === 'character').reduce((sum, dc) => sum + dc.count, 0)}张
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-yellow-400">中立卡:</span>
                      <span className="text-white font-bold">
                        {viewingDeck.cards.filter(dc => dc.card.faction === 'neutral').reduce((sum, dc) => sum + dc.count, 0)}张
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-orange-400">专属卡:</span>
                      <span className="text-white font-bold">
                        {viewingDeck.cards.filter(dc => dc.card.faction !== 'neutral').reduce((sum, dc) => sum + dc.count, 0)}张
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 右侧：卡牌列表 */}
              <div className="lg:col-span-2">
                <h3 className="text-lg font-semibold text-white mb-4">🃏 卡牌列表 ({viewingDeck.cards.length}种卡牌)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                  {viewingDeck.cards.map((deckCard, index) => (
                    <div key={index} className="bg-white bg-opacity-10 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-white">{deckCard.card.name}</h4>
                        <div className="flex items-center space-x-2">
                          <span className="text-yellow-400 font-bold">{deckCard.card.cost}</span>
                          <span className="bg-blue-600 text-white px-2 py-1 rounded-full text-xs font-semibold">
                            x{deckCard.count}
                          </span>
                        </div>
                      </div>
                      
                      <div className="text-sm text-gray-300 mb-2">
                        <p>
                          {deckCard.card.type === 'story' ? '📜 故事牌' : 
                           deckCard.card.type === 'character' ? '👥 配角牌' : '⭐ 主角牌'} 
                          - {deckCard.card.category}
                        </p>
                        <p>主角: {getFactionText(deckCard.card.faction)}</p>
                        {deckCard.card.type === 'character' && (
                          <p>攻击/生命: <span className="text-red-400">{deckCard.card.attack}</span>/<span className="text-green-400">{deckCard.card.health}</span></p>
                        )}
                      </div>
                      
                      <div className="text-green-400 text-xs">
                        <p className="font-semibold">效果:</p>
                        <p className="truncate">{deckCard.card.effect}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeckBuilder;
