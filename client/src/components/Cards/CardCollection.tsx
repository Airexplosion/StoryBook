import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { fetchCards, createCard, updateCard, deleteCard } from '../../store/slices/cardsSlice';
import { Card } from '../../types';
import CardForm from './CardForm';
import SearchableSelect from '../common/SearchableSelect';
import api from '../../services/api';

const CardCollection: React.FC = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [filter, setFilter] = useState({
    type: 'all',
    faction: 'all',
    search: ''
  });

  // 管理员功能状态
  const [showFactionModal, setShowFactionModal] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [customFactions, setCustomFactions] = useState<Array<{ id: string; name: string; description?: string }>>([
    { id: 'neutral', name: '中立' },
    { id: 'hero1', name: '主角1专属' },
    { id: 'hero2', name: '主角2专属' },
    { id: 'hero3', name: '主角3专属' }
  ]);
  const [customTypes, setCustomTypes] = useState([
    { id: 'story', name: '故事牌' },
    { id: 'character', name: '配角牌' },
    { id: 'hero', name: '主角牌' }
  ]);
  const [customCategories, setCustomCategories] = useState({
    story: [
      { id: 'event', name: '事件', description: '需要支付费用主动使用' },
      { id: 'background', name: '背景', description: '加入手中时自动使用' }
    ],
    character: [
      { id: 'character', name: '配角', description: '进入故事后才会成为实体单位' }
    ],
    hero: [
      { id: 'hero', name: '主角', description: '为主角提供持续性效果' }
    ]
  });

  const dispatch = useDispatch();
  const { cards, isLoading, error } = useSelector((state: RootState) => state.cards);
  const { user } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    dispatch(fetchCards() as any);
    // 加载游戏配置
    loadGameConfig();
  }, [dispatch]);

  // 加载游戏配置
  const loadGameConfig = async () => {
    try {
      const response = await api.config.getConfig();
      const config = response.data;
      
      if (config.factions) setCustomFactions(config.factions);
      if (config.types) setCustomTypes(config.types);
      if (config.categories) setCustomCategories(config.categories);
    } catch (error) {
      console.error('加载配置失败:', error);
      // 如果加载失败，保持默认值
    }
  };

  // 保存主战者配置
  const saveFactionConfig = async (factions: Array<{ id: string; name: string; description?: string }> = customFactions) => {
    try {
      await api.config.updateFactions(factions);
      console.log('主战者配置已保存');
    } catch (error) {
      console.error('保存主战者配置失败:', error);
      alert('保存失败，请重试');
    }
  };

  // 保存类型配置
  const saveTypeConfig = async (types = customTypes) => {
    try {
      await api.config.updateTypes(types);
      console.log('类型配置已保存');
    } catch (error) {
      console.error('保存类型配置失败:', error);
      alert('保存失败，请重试');
    }
  };

  // 保存类别配置
  const saveCategoryConfig = async (categories = customCategories) => {
    try {
      await api.config.updateCategories(categories);
      console.log('类别配置已保存');
      // 保存成功后重新加载配置，确保数据同步
      await loadGameConfig();
    } catch (error) {
      console.error('保存类别配置失败:', error);
      alert('保存失败，请重试');
    }
  };

  const filteredCards = cards.filter(card => {
    if (filter.type !== 'all' && card.type !== filter.type) return false;
    if (filter.faction !== 'all' && card.faction !== filter.faction) return false;
    if (filter.search && !card.name.toLowerCase().includes(filter.search.toLowerCase())) return false;
    return true;
  });

  const handleCreateCard = async (cardData: Partial<Card>) => {
    await dispatch(createCard(cardData) as any);
    setShowCreateModal(false);
  };

  const handleUpdateCard = async (cardData: Partial<Card>) => {
    if (editingCard) {
      await dispatch(updateCard({ id: editingCard._id, cardData }) as any);
      setEditingCard(null);
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    if (window.confirm('确定要删除这张卡牌吗？')) {
      dispatch(deleteCard(cardId) as any);
    }
  };

  const CardComponent: React.FC<{ card: Card }> = ({ card }) => (
    <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-4 hover:bg-opacity-20 transition-all">
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-lg font-bold text-white">{card.name}</h3>
        <span className="text-yellow-400 font-bold text-xl bg-yellow-600 bg-opacity-30 px-2 py-1 rounded-full">
          {card.cost}
        </span>
      </div>

      {/* 插画显示 */}
      {card.image && (
        <div className="mb-3">
          <img
            src={card.image}
            alt={card.name}
            className="w-full h-32 object-cover rounded border border-gray-500"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
        </div>
      )}

      <div className="text-sm text-gray-300 mb-3">
        <p><span className="text-blue-400">类型:</span> {getCardTypeText(card.type)}</p>
        <p><span className="text-blue-400">类别:</span> {card.category}</p>
        <p><span className="text-blue-400">主角:</span> {getFactionText(card.faction)}</p>
        {card.type === 'character' && (
          <p><span className="text-blue-400">攻击/生命:</span> 
            <span className="text-red-400 font-bold ml-1">{card.attack}</span>/
            <span className="text-green-400 font-bold">{card.health}</span>
          </p>
        )}
        <p><span className="text-blue-400">创建者:</span> {card.createdBy.username}</p>
      </div>

      <div className="text-gray-200 text-sm mb-3 bg-green-600 bg-opacity-20 p-2 rounded">
        <p className="font-semibold text-green-400">效果:</p>
        <p className="break-words whitespace-pre-wrap">{card.effect}</p>
      </div>

      {card.flavor && (
        <div className="text-gray-400 text-xs italic mb-3 bg-gray-600 bg-opacity-30 p-2 rounded whitespace-pre-wrap">
          {card.flavor}
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className={`px-2 py-1 rounded-full text-xs ${
          card.isPublic ? 'bg-green-600 text-white' : 'bg-yellow-600 text-white'
        }`}>
          {card.isPublic ? '公开' : '私有'}
        </span>

        {card.createdBy._id === user?.id && (
          <div className="flex space-x-2">
            <button
              onClick={() => setEditingCard(card)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs transition-colors"
            >
              编辑
            </button>
            <button
              onClick={() => handleDeleteCard(card._id)}
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs transition-colors"
            >
              删除
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const getCardTypeText = (type: string) => {
    switch (type) {
      case 'story': return '故事牌';
      case 'character': return '配角牌';
      case 'hero': return '主角牌';
      default: return type;
    }
  };

  const getFactionText = (faction: string) => {
    const factionData = customFactions.find(f => f.id === faction);
    return factionData ? factionData.name : faction;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-white text-xl">🃏 加载卡牌中...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold text-white">🃏 卡牌集</h1>
        <div className="flex items-center space-x-3">
          {/* 管理员按钮组 */}
          {user?.isAdmin && (
            <>
              <button
                onClick={() => setShowTypeModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center space-x-2"
                title="管理卡牌类型"
              >
                <span>⚙️</span>
                <span>管理类型</span>
              </button>
              <button
                onClick={() => setShowCategoryModal(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center space-x-2"
                title="管理卡牌类别"
              >
                <span>📋</span>
                <span>管理类别</span>
              </button>
              <button
                onClick={() => setShowFactionModal(true)}
                className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center space-x-2"
                title="管理卡牌主战者"
              >
                <span>🏛️</span>
                <span>管理主战者</span>
              </button>
            </>
          )}
          
          {/* 创建卡牌按钮 */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center space-x-2"
          >
            <span>✨</span>
            <span>创建卡牌</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500 bg-opacity-20 border border-red-500 text-red-100 px-4 py-3 rounded-md mb-6">
          ❌ 错误: {error}
        </div>
      )}

      {/* 筛选器 */}
      <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-6 mb-8 relative z-10">
        <h3 className="text-white font-semibold mb-4">🔍 卡牌筛选</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">搜索卡牌</label>
            <input
              type="text"
              value={filter.search}
              onChange={(e) => setFilter({...filter, search: e.target.value})}
              className="w-full px-3 py-2 bg-white bg-opacity-10 border border-gray-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="搜索卡牌名称..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">卡牌类型</label>
            <SearchableSelect
              options={[
                { value: 'all', label: '全部类型' },
                ...customTypes.map(type => ({ value: type.id, label: type.name }))
              ]}
              value={filter.type}
              onChange={(value) => setFilter({...filter, type: value})}
              placeholder="选择卡牌类型..."
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">卡牌主角</label>
            <SearchableSelect
              options={[
                { value: 'all', label: '全部主角' },
                ...customFactions.map(faction => ({ value: faction.id, label: faction.name }))
              ]}
              value={filter.faction}
              onChange={(value) => setFilter({...filter, faction: value})}
              placeholder="选择卡牌主角..."
              className="w-full"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={() => setFilter({ type: 'all', faction: 'all', search: '' })}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded transition-colors"
            >
              🔄 重置筛选
            </button>
          </div>
        </div>
      </div>

      {/* 统计信息 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-blue-400">{cards.filter(c => c.type === 'story').length}</div>
          <div className="text-gray-300 text-sm">故事牌</div>
        </div>
        <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-green-400">{cards.filter(c => c.type === 'character').length}</div>
          <div className="text-gray-300 text-sm">配角牌</div>
        </div>
        <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-purple-400">{cards.filter(c => c.type === 'hero').length}</div>
          <div className="text-gray-300 text-sm">主角牌</div>
        </div>
        <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-yellow-400">{cards.length}</div>
          <div className="text-gray-300 text-sm">总卡牌数</div>
        </div>
      </div>

      {/* 卡牌列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredCards.map((card) => (
          <CardComponent key={card._id} card={card} />
        ))}
      </div>

      {filteredCards.length === 0 && !isLoading && (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">🃏</div>
          <h3 className="text-2xl font-bold text-white mb-4">
            {filter.search || filter.type !== 'all' || filter.faction !== 'all' 
              ? '未找到匹配的卡牌' 
              : '暂无卡牌'
            }
          </h3>
          <p className="text-gray-300 mb-8">
            {filter.search || filter.type !== 'all' || filter.faction !== 'all'
              ? '尝试调整筛选条件或创建新的卡牌'
              : '创建第一张卡牌开始游戏吧！'
            }
          </p>
        </div>
      )}

      {/* 创建卡牌模态框 */}
      {showCreateModal && (
        <CardForm
          onSubmit={handleCreateCard}
          onCancel={() => setShowCreateModal(false)}
        />
      )}

      {/* 编辑卡牌模态框 */}
      {editingCard && (
        <CardForm
          card={editingCard}
          onSubmit={handleUpdateCard}
          onCancel={() => setEditingCard(null)}
        />
      )}

      {/* 管理员模态框 - 管理卡牌类型 */}
      {showTypeModal && user?.isAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-white mb-4">管理卡牌类型</h3>
            
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {customTypes.map((type, index) => (
                <div key={type.id} className="flex items-center justify-between bg-white bg-opacity-10 p-3 rounded">
                  <div className="flex items-center space-x-2">
                    <span className="text-white">{type.name}</span>
                  </div>
                  <button
                    onClick={() => {
                      const newTypes = customTypes.filter((_, i) => i !== index);
                      setCustomTypes(newTypes);
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-sm"
                  >
                    删除
                  </button>
                </div>
              ))}
            </div>
            
            <div className="mt-4 flex space-x-2">
              <input
                type="text"
                placeholder="类型名称"
                className="flex-1 px-3 py-2 bg-white bg-opacity-10 border border-gray-500 rounded text-white placeholder-gray-400"
                id="new-type-name"
              />
              <button 
                onClick={async () => {
                  const newTypeName = (document.getElementById('new-type-name') as HTMLInputElement).value;
                  if (newTypeName) {
                    const newTypeId = newTypeName.toLowerCase().replace(/\s+/g, '_');
                    const newTypes = [...customTypes, { id: newTypeId, name: newTypeName }];
                    setCustomTypes(newTypes);
                    
                    // 为新类型创建空的类别数组
                    const newCategories = { ...customCategories };
                    if (!newCategories[newTypeId as keyof typeof customCategories]) {
                      newCategories[newTypeId as keyof typeof customCategories] = [];
                    }
                    setCustomCategories(newCategories);
                    
                    await saveTypeConfig(newTypes);
                    await saveCategoryConfig(newCategories);
                    (document.getElementById('new-type-name') as HTMLInputElement).value = '';
                  }
                }}
                className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded"
              >
                添加
              </button>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowTypeModal(false)}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 管理员模态框 - 管理卡牌阵营 */}
      {showFactionModal && user?.isAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-white mb-4">管理卡牌主战者</h3>
            
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {customFactions.map((faction, index) => (
                <div key={faction.id} className="bg-white bg-opacity-10 p-3 rounded">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-semibold">{faction.name}</span>
                    <button
                      onClick={async () => {
                        const newFactions = customFactions.filter((_, i) => i !== index);
                        setCustomFactions(newFactions);
                        await saveFactionConfig(newFactions);
                      }}
                      className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-sm"
                    >
                      删除
                    </button>
                  </div>
                  {faction.description && (
                    <div className="text-gray-300 text-sm">
                      效果描述: {faction.description}
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            <div className="mt-4 space-y-3">
              <input
                type="text"
                placeholder="主战者名称"
                className="w-full px-3 py-2 bg-white bg-opacity-10 border border-gray-500 rounded text-white placeholder-gray-400"
                id="new-faction-name"
              />
              <textarea
                placeholder="主战者效果描述（可选）"
                className="w-full px-3 py-2 bg-white bg-opacity-10 border border-gray-500 rounded text-white placeholder-gray-400 resize-none"
                rows={3}
                id="new-faction-description"
              />
              <div className="flex space-x-2">
                <button 
                  onClick={async () => {
                    const newFactionName = (document.getElementById('new-faction-name') as HTMLInputElement).value;
                    const newFactionDescription = (document.getElementById('new-faction-description') as HTMLTextAreaElement).value;
                    if (newFactionName) {
                      const newFactions = [...customFactions, { 
                        id: newFactionName.toLowerCase().replace(/\s+/g, '_'), 
                        name: newFactionName,
                        description: newFactionDescription.trim() || undefined
                      }];
                      setCustomFactions(newFactions);
                      await saveFactionConfig(newFactions);
                      (document.getElementById('new-faction-name') as HTMLInputElement).value = '';
                      (document.getElementById('new-faction-description') as HTMLTextAreaElement).value = '';
                    }
                  }}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded"
                >
                  添加
                </button>
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowFactionModal(false)}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 管理员模态框 - 管理卡牌类别 */}
      {showCategoryModal && user?.isAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-6 max-w-lg w-full max-h-[90vh] flex flex-col">
            <h3 className="text-xl font-bold text-white mb-4">管理卡牌类别</h3>
            
            <div className="space-y-4 overflow-y-auto flex-1 pr-2">
              {Object.entries(customCategories)
                .filter(([typeId, categories]) => categories.length > 0) // 只显示有类别的类型
                .map(([typeId, categories]) => (
                <div key={typeId} className="bg-white bg-opacity-10 p-4 rounded">
                  <h4 className="text-white font-semibold mb-2">
                    {customTypes.find(t => t.id === typeId)?.name} 类别
                  </h4>
                  <div className="space-y-2">
                    {categories.map((category, index) => (
                      <div key={category.id} className="flex items-center justify-between bg-white bg-opacity-10 p-2 rounded">
                        <div>
                          <span className="text-white font-medium">{category.name}</span>
                          <p className="text-gray-300 text-sm">{category.description}</p>
                        </div>
                        <button
                        onClick={async () => {
                          const newCategories = { ...customCategories };
                          newCategories[typeId as keyof typeof customCategories] = 
                            newCategories[typeId as keyof typeof customCategories].filter((_, i) => i !== index);
                          setCustomCategories(newCategories);
                          // 立即保存更改
                          await saveCategoryConfig(newCategories);
                        }}
                          className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-sm"
                        >
                          删除
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 space-y-2">
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        placeholder="新类别名称"
                        className="w-32 px-3 py-2 bg-white bg-opacity-10 border border-gray-500 rounded text-white placeholder-gray-400"
                        id={`new-category-name-${typeId}`}
                      />
                      <input
                        type="text"
                        placeholder="描述"
                        className="flex-1 px-3 py-2 bg-white bg-opacity-10 border border-gray-500 rounded text-white placeholder-gray-400"
                        id={`new-category-description-${typeId}`}
                      />
                      <button
                        onClick={async () => {
                          const newCategoryName = (document.getElementById(`new-category-name-${typeId}`) as HTMLInputElement).value;
                          const newCategoryDescription = (document.getElementById(`new-category-description-${typeId}`) as HTMLInputElement).value;
                          if (newCategoryName && newCategoryDescription) {
                            const newCategories = { ...customCategories };
                            // 确保该类型的类别数组存在
                            if (!newCategories[typeId as keyof typeof customCategories]) {
                              newCategories[typeId as keyof typeof customCategories] = [];
                            }
                            newCategories[typeId as keyof typeof customCategories] = [
                              ...newCategories[typeId as keyof typeof customCategories],
                              { id: newCategoryName, name: newCategoryName, description: newCategoryDescription }
                            ];
                            setCustomCategories(newCategories);
                            await saveCategoryConfig(newCategories); // 保存更改
                            (document.getElementById(`new-category-name-${typeId}`) as HTMLInputElement).value = '';
                            (document.getElementById(`new-category-description-${typeId}`) as HTMLInputElement).value = '';
                          }
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded whitespace-nowrap"
                      >
                        添加
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* 为所有类型显示添加类别的选项，包括没有类别的类型 */}
              {customTypes.map(type => {
                const hasCategories = customCategories[type.id as keyof typeof customCategories]?.length > 0;
                if (hasCategories) return null; // 如果已经有类别，上面已经显示了
                
                return (
                  <div key={`empty-${type.id}`} className="bg-white bg-opacity-10 p-4 rounded">
                    <h4 className="text-white font-semibold mb-2">
                      {type.name} 类别 <span className="text-gray-400 text-sm">(暂无类别)</span>
                    </h4>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        placeholder="新类别名称"
                        className="w-32 px-3 py-2 bg-white bg-opacity-10 border border-gray-500 rounded text-white placeholder-gray-400"
                        id={`new-category-name-${type.id}`}
                      />
                      <input
                        type="text"
                        placeholder="描述"
                        className="flex-1 px-3 py-2 bg-white bg-opacity-10 border border-gray-500 rounded text-white placeholder-gray-400"
                        id={`new-category-description-${type.id}`}
                      />
                      <button
                        onClick={async () => {
                          const newCategoryName = (document.getElementById(`new-category-name-${type.id}`) as HTMLInputElement).value;
                          const newCategoryDescription = (document.getElementById(`new-category-description-${type.id}`) as HTMLInputElement).value;
                          if (newCategoryName && newCategoryDescription) {
                            const newCategories = { ...customCategories };
                            if (!newCategories[type.id as keyof typeof customCategories]) {
                              newCategories[type.id as keyof typeof customCategories] = [];
                            }
                            newCategories[type.id as keyof typeof customCategories] = [
                              ...newCategories[type.id as keyof typeof customCategories],
                              { id: newCategoryName, name: newCategoryName, description: newCategoryDescription }
                            ];
                            setCustomCategories(newCategories);
                            await saveCategoryConfig(newCategories);
                            (document.getElementById(`new-category-name-${type.id}`) as HTMLInputElement).value = '';
                            (document.getElementById(`new-category-description-${type.id}`) as HTMLInputElement).value = '';
                          }
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded whitespace-nowrap"
                      >
                        添加
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowCategoryModal(false);
                  // 不需要在关闭时保存，因为每次操作都会立即保存
                }}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded"
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

export default CardCollection;
