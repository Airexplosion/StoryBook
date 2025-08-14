import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { Card } from '../../types';
import CardForm from './CardForm';
import api from '../../services/api';

const CreateCard: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [showForm, setShowForm] = useState(false);
  const [success, setSuccess] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [showCardList, setShowCardList] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredCards, setFilteredCards] = useState<Card[]>([]);

  // 获取所有卡牌
  useEffect(() => {
    if (showCardList) {
      fetchCards();
    }
  }, [showCardList]);

  // 搜索过滤
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredCards(cards);
    } else {
      const filtered = cards.filter(card =>
        card.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        card.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        card.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        card.faction.toLowerCase().includes(searchTerm.toLowerCase()) ||
        card.effect.toLowerCase().includes(searchTerm.toLowerCase()) ||
        card.createdBy.username.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredCards(filtered);
    }
  }, [cards, searchTerm]);

  const fetchCards = async () => {
    try {
      setLoading(true);
      const response = await api.get('/cards');
      // 确保返回的是数组
      const cardsData = response.data?.cards || response.data || [];
      setCards(Array.isArray(cardsData) ? cardsData : []);
    } catch (error) {
      console.error('获取卡牌列表失败:', error);
      setError('获取卡牌列表失败');
      setCards([]); // 出错时设置为空数组
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCard = async (cardData: Partial<Card>) => {
    try {
      setError('');
      setSuccess('');
      
      await api.cards.create(cardData);
      setSuccess('卡牌创建成功！');
      setShowForm(false);
      
      // 如果正在显示卡牌列表，刷新列表
      if (showCardList) {
        fetchCards();
      }
      
      // 3秒后清除成功消息
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (error: any) {
      console.error('创建卡牌失败:', error);
      setError(error.response?.data?.message || '创建卡牌失败，请重试');
    }
  };

  const handleEditCard = async (cardData: Partial<Card>) => {
    if (!editingCard) return;
    
    try {
      setError('');
      setSuccess('');
      
      await api.cards.update(editingCard._id, cardData);
      setSuccess('卡牌更新成功！');
      setShowForm(false);
      setEditingCard(null);
      
      // 刷新卡牌列表
      fetchCards();
      
      // 3秒后清除成功消息
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (error: any) {
      console.error('更新卡牌失败:', error);
      setError(error.response?.data?.message || '更新卡牌失败，请重试');
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    if (!window.confirm('确定要删除这张卡牌吗？此操作不可撤销。')) {
      return;
    }
    
    try {
      setError('');
      setSuccess('');
      
      await api.cards.delete(cardId);
      setSuccess('卡牌删除成功！');
      
      // 刷新卡牌列表
      fetchCards();
      
      // 3秒后清除成功消息
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (error: any) {
      console.error('删除卡牌失败:', error);
      setError(error.response?.data?.message || '删除卡牌失败，请重试');
    }
  };

  const startEditCard = (card: Card) => {
    setEditingCard(card);
    setShowForm(true);
    setShowCardList(false);
  };

  // 如果不是管理员，显示权限提示
  if (!user?.isAdmin) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <h2 className="text-2xl font-bold mb-6 text-white">创建卡牌</h2>
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          只有管理员可以创建卡牌。
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">创建卡牌</h2>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
          {success}
        </div>
      )}

      {!showForm && !showCardList ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <div className="mb-6">
            <div className="text-6xl mb-4">🃏</div>
            <h3 className="text-2xl font-bold text-gray-800 mb-4">创建新卡牌</h3>
            <p className="text-gray-600 mb-8">
              点击下方按钮开始创建一张新的卡牌。您可以设置卡牌的名称、类型、效果等属性。
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => setShowForm(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-colors flex items-center space-x-3"
            >
              <span>✨</span>
              <span>开始创建卡牌</span>
            </button>
            
            <button
              onClick={() => setShowCardList(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-colors flex items-center space-x-3"
            >
              <span>📋</span>
              <span>查看所有卡牌</span>
            </button>
          </div>
          
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
            <div>
              <h4 className="font-semibold text-gray-800 mb-3">创建卡牌前的准备</h4>
              <ul className="text-gray-600 space-y-2">
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  确保已经配置好卡牌类型（如故事牌、配角牌、主角牌）
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  确保已经配置好主战者阵营
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  准备好卡牌的效果描述和风味文本
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  如果有卡牌插画，准备好图片URL
                </li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-800 mb-3">卡牌字段说明</h4>
              <div className="space-y-3 text-sm">
                <div className="bg-gray-50 p-3 rounded">
                  <div className="font-medium text-gray-800">基础字段</div>
                  <ul className="text-gray-600 mt-1 space-y-1">
                    <li><span className="font-medium">名称:</span> 卡牌的显示名称</li>
                    <li><span className="font-medium">类型:</span> 故事牌/配角牌/主角牌</li>
                    <li><span className="font-medium">类别:</span> 具体的卡牌分类</li>
                    <li><span className="font-medium">主角:</span> 所属的主战者阵营</li>
                    <li><span className="font-medium">费用:</span> 使用卡牌所需的费用</li>
                  </ul>
                </div>
                
                <div className="bg-gray-50 p-3 rounded">
                  <div className="font-medium text-gray-800">配角牌专用</div>
                  <ul className="text-gray-600 mt-1 space-y-1">
                    <li><span className="font-medium">攻击力:</span> 配角的攻击数值</li>
                    <li><span className="font-medium">生命值:</span> 配角的生命数值</li>
                  </ul>
                </div>
                
                <div className="bg-gray-50 p-3 rounded">
                  <div className="font-medium text-gray-800">描述字段</div>
                  <ul className="text-gray-600 mt-1 space-y-1">
                    <li><span className="font-medium">效果:</span> 卡牌的游戏效果描述</li>
                    <li><span className="font-medium">风味文本:</span> 卡牌的背景故事（可选）</li>
                  </ul>
                </div>
                
                <div className="bg-gray-50 p-3 rounded">
                  <div className="font-medium text-gray-800">其他字段</div>
                  <ul className="text-gray-600 mt-1 space-y-1">
                    <li><span className="font-medium">插画:</span> 卡牌图片URL（可选）</li>
                    <li><span className="font-medium">可见性:</span> 公开/私有设置</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : showCardList ? (
        <div>
          <div className="mb-4">
            <button
              onClick={() => {
                setShowCardList(false);
                setError('');
              }}
              className="text-gray-400 hover:text-white transition-colors flex items-center"
            >
              <span className="mr-2">←</span>
              返回
            </button>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">所有卡牌 ({filteredCards.length}/{cards.length})</h3>
              <button
                onClick={() => {
                  setShowCardList(false);
                  setShowForm(true);
                }}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
              >
                创建新卡牌
              </button>
            </div>
            
            {/* 搜索框 */}
            <div className="mb-4">
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="搜索卡牌名称、类型、类别、主角、效果或创建者..."
                  className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
            
            {loading ? (
              <div className="text-center py-8">
                <div className="text-gray-500">加载中...</div>
              </div>
            ) : filteredCards.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-500">
                  {searchTerm ? '没有找到匹配的卡牌' : '暂无卡牌'}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredCards.map((card) => (
                  <div key={card._id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      {/* 左侧：卡牌基本信息 */}
                      <div className="flex items-start space-x-4 flex-1">
                        {/* 卡牌图片 */}
                        {card.image && (
                          <img
                            src={card.image}
                            alt={card.name}
                            className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                          />
                        )}
                        
                        {/* 卡牌详细信息 */}
                        <div className="flex-1 min-w-0">
                          {/* 第一行：名称、类型、费用 */}
                          <div className="flex items-center space-x-3 mb-2">
                            <h4 className="text-lg font-semibold text-gray-900 truncate">
                              {card.name}
                            </h4>
                            <span className={`px-2 py-1 text-xs rounded-full flex-shrink-0 ${
                              card.type === '故事牌' ? 'bg-blue-100 text-blue-800' :
                              card.type === '配角牌' ? 'bg-green-100 text-green-800' :
                              card.type === '主角牌' ? 'bg-purple-100 text-purple-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {card.type}
                            </span>
                            <span className="font-bold text-orange-600 text-lg flex-shrink-0">
                              {card.cost}
                            </span>
                            {card.attack !== undefined && card.health !== undefined && (
                              <span className="font-mono flex-shrink-0">
                                <span className="text-red-600 font-bold">{card.attack || 0}</span>
                                <span className="text-gray-400 mx-1">/</span>
                                <span className="text-green-600 font-bold">{card.health || 0}</span>
                              </span>
                            )}
                          </div>
                          
                          {/* 第二行：类别、主角、状态 */}
                          <div className="flex items-center space-x-4 mb-2 text-sm text-gray-600">
                            <span><strong>类别:</strong> {card.category}</span>
                            <span><strong>主角:</strong> {card.faction}</span>
                            <span>
                              {card.isPublic ? (
                                <span className="text-green-600 font-medium">公开</span>
                              ) : (
                                <span className="text-gray-500">私有</span>
                              )}
                            </span>
                            <span><strong>创建者:</strong> {card.createdBy.username}</span>
                          </div>
                          
                          {/* 第三行：效果 */}
                          <div className="text-sm text-gray-700">
                            <strong>效果:</strong> {card.effect}
                          </div>
                        </div>
                      </div>
                      
                      {/* 右侧：操作按钮 */}
                      <div className="flex flex-col space-y-2 ml-4 flex-shrink-0">
                        <button
                          onClick={() => startEditCard(card)}
                          className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                        >
                          编辑
                        </button>
                        <button
                          onClick={() => handleDeleteCard(card._id)}
                          className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div>
          <div className="mb-4">
            <button
              onClick={() => {
                setShowForm(false);
                setEditingCard(null);
                setError('');
                if (cards.length > 0) {
                  setShowCardList(true);
                }
              }}
              className="text-gray-400 hover:text-white transition-colors flex items-center"
            >
              <span className="mr-2">←</span>
              返回{cards.length > 0 ? '卡牌列表' : ''}
            </button>
          </div>
          
          <CardForm
            card={editingCard || undefined}
            onSubmit={editingCard ? handleEditCard : handleCreateCard}
            onCancel={() => {
              setShowForm(false);
              setEditingCard(null);
              setError('');
              if (cards.length > 0) {
                setShowCardList(true);
              }
            }}
          />
        </div>
      )}
    </div>
  );
};

export default CreateCard;
