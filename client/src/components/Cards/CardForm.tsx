import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Card } from '../../types';
import { RootState } from '../../store/store';
import SearchableSelect from '../common/SearchableSelect';
import api from '../../services/api';

interface CardFormProps {
  card?: Card;
  onSubmit: (cardData: Partial<Card>) => void;
  onCancel: () => void;
}

const CardForm: React.FC<CardFormProps> = ({ card, onSubmit, onCancel }) => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [formData, setFormData] = useState({
    name: '',
    type: 'story' as 'story' | 'character' | 'hero',
    category: '',
    cost: '',
    attack: 0,
    health: 0,
    effect: '',
    flavor: '',
    image: '',
    faction: 'neutral', // 初始值设为neutral
    isPublic: false
  });

  const [factions, setFactions] = useState<{ id: string; name: string; icon: string }[]>([]);
  const [types, setTypes] = useState<{ id: string; name: string; icon: string }[]>([]);
  const [categories, setCategories] = useState<any>({});

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await api.config.getConfig();
        setFactions(response.data.factions || []);
        setTypes(response.data.types || []);
        setCategories(response.data.categories || {});

        // 如果是编辑模式，并且卡牌有阵营，确保阵营在加载后被正确设置
        if (card) {
          setFormData(prev => ({
            ...prev,
            faction: card.faction,
            type: card.type,
            category: card.category
          }));
        }
      } catch (error) {
        console.error('加载配置失败:', error);
      }
    };
    fetchConfig();
  }, [card]); // 依赖card，确保编辑时能正确加载

  useEffect(() => {
    if (card) {
      setFormData(prev => ({
        ...prev,
        name: card.name,
        type: card.type,
        category: card.category,
        cost: card.cost,
        attack: card.attack || 0,
        health: card.health || 0,
        effect: card.effect,
        flavor: card.flavor || '',
        image: card.image || '',
        faction: card.faction,
        isPublic: card.isPublic
      }));
    }
  }, [card]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checkbox = e.target as HTMLInputElement;
      setFormData(prev => ({
        ...prev,
        [name]: checkbox.checked
      }));
    } else if (name === 'attack' || name === 'health') {
      setFormData(prev => ({
        ...prev,
        [name]: parseInt(value) || 0
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }

    // 当卡牌类型改变时，自动更新类别
    if (name === 'type') {
      setFormData(prev => ({
        ...prev,
        category: getDefaultCategory(value as any),
        // 重置攻击和生命值
        attack: value === 'character' ? prev.attack : 0,
        health: value === 'character' ? prev.health : 0
      }));
    }
  };

  const getDefaultCategory = (type: 'story' | 'character' | 'hero') => {
    const typeCategories = categories[type];
    if (typeCategories && typeCategories.length > 0) {
      return typeCategories[0].name;
    }
    return '';
  };

  const getCategoryOptions = () => {
    const typeCategories = categories[formData.type] || [];
    return typeCategories.map((category: any) => (
      <option key={category.id} value={category.name}>
        {category.name} - {category.description}
      </option>
    ));
  };

  // 当类型改变时，重新加载配置以确保类别选项是最新的
  useEffect(() => {
    const fetchLatestConfig = async () => {
      try {
        const response = await api.config.getConfig();
        setCategories(response.data.categories || {});
        
        // 如果当前选择的类别在新类型中不存在，重置为默认类别
        const typeCategories = response.data.categories?.[formData.type] || [];
        if (typeCategories.length > 0 && !typeCategories.find((cat: any) => cat.name === formData.category)) {
          setFormData(prev => ({
            ...prev,
            category: typeCategories[0].name
          }));
        }
      } catch (error) {
        console.error('重新加载配置失败:', error);
      }
    };
    
    fetchLatestConfig();
  }, [formData.type]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 验证必填字段
    if (!formData.name.trim() || !formData.category.trim() || !formData.cost.trim() || !formData.effect.trim()) {
      alert('请填写所有必填字段');
      return;
    }

    // 验证配角牌的攻击和生命值
    if (formData.type === 'character') {
      if (formData.attack < 0 || formData.health <= 0) {
        alert('配角牌的攻击力不能小于0，生命值必须大于0');
        return;
      }
    }

    onSubmit(formData as any);
  };

  const getCardPreview = () => {
    return (
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-4 border-2 border-yellow-500">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-lg font-bold text-white">{formData.name || '卡牌名称'}</h3>
          <span className="text-yellow-400 font-bold text-xl bg-yellow-600 bg-opacity-50 px-2 py-1 rounded-full">
            {formData.cost || '?'}
          </span>
        </div>

        {/* 插画预览 */}
        {formData.image && (
          <div className="mb-3">
            <img
              src={formData.image}
              alt="卡牌插画预览"
              className="w-full h-32 object-cover rounded border border-gray-500"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
          </div>
        )}

        <div className="text-sm text-gray-300 mb-3">
          <p><span className="text-blue-400">类型:</span> {getCardTypeText(formData.type)} - {formData.category}</p>
          <p><span className="text-blue-400">主角:</span> {getFactionText(formData.faction)}</p>
          {formData.type === 'character' && (
            <p><span className="text-blue-400">攻击/生命:</span> 
              <span className="text-red-400 font-bold ml-1">{formData.attack}</span>/
              <span className="text-green-400 font-bold">{formData.health}</span>
            </p>
          )}
        </div>

        <div className="text-gray-200 text-sm mb-3 bg-green-600 bg-opacity-20 p-2 rounded">
          <p className="font-semibold text-green-400">效果:</p>
          <p className="break-words whitespace-pre-wrap">{formData.effect || '请输入卡牌效果...'}</p>
        </div>

        {formData.flavor && (
          <div className="text-gray-400 text-xs italic bg-gray-600 bg-opacity-30 p-2 rounded whitespace-pre-wrap">
            "{formData.flavor}"
          </div>
        )}

        <div className="mt-3 text-center">
          <span className={`px-2 py-1 rounded-full text-xs ${
            formData.isPublic ? 'bg-green-600 text-white' : 'bg-yellow-600 text-white'
          }`}>
            {formData.isPublic ? '公开卡牌' : '私有卡牌'}
          </span>
        </div>
      </div>
    );
  };

  const getCardTypeText = (type: string) => {
    switch (type) {
      case 'story': return '故事牌';
      case 'character': return '配角牌';
      case 'hero': return '主战者牌';
      default: return type;
    }
  };

  const getFactionText = (faction: string) => {
    switch (faction) {
      case 'neutral': return '中立';
      case 'hero1': return '主战者1专属';
      case 'hero2': return '主战者2专属';
      case 'hero3': return '主战者3专属';
      default: return faction;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-8 max-w-6xl w-full max-h-screen overflow-y-auto">
        <h2 className="text-2xl font-bold text-white mb-6">
          ✨ {card ? '编辑卡牌' : '创建卡牌'}
        </h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 左侧：表单 */}
          <div>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 基本信息 */}
              <div className="bg-white bg-opacity-10 rounded-lg p-4">
                <h3 className="text-white font-semibold mb-4">📝 基本信息</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      卡牌名称 <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-white bg-opacity-10 border border-gray-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="请输入卡牌名称"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      基础费用 <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      name="cost"
                      value={formData.cost}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-white bg-opacity-10 border border-gray-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="如: 2, *, X等"
                      required
                    />
                    <p className="text-xs text-gray-400 mt-1">* 表示无法直接使用</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      卡牌类型 <span className="text-red-400">*</span>
                    </label>
                    <select
                      name="type"
                      value={formData.type}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      style={{
                        backgroundColor: '#1a1a1a',
                        color: 'white'
                      }}
                      required
                    >
                      {types.map(type => (
                        <option 
                          key={type.id} 
                          value={type.id} 
                          style={{ backgroundColor: '#2a2a2a', color: 'white' }}
                        >
                          {type.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      类别 <span className="text-red-400">*</span>
                    </label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      style={{
                        backgroundColor: '#1a1a1a',
                        color: 'white'
                      }}
                      required
                    >
                      <option value="" style={{ backgroundColor: '#2a2a2a', color: 'white' }}>请选择类别</option>
                      {getCategoryOptions().map((option: React.ReactElement) => 
                        React.cloneElement(option, {
                          style: { backgroundColor: '#2a2a2a', color: 'white' }
                        })
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">卡牌主角</label>
                    <SearchableSelect
                      options={factions.map(faction => ({ 
                        value: faction.id, 
                        label: faction.name 
                      }))}
                      value={formData.faction}
                      onChange={(value) => setFormData(prev => ({ ...prev, faction: value }))}
                      placeholder="选择卡牌主角..."
                      className="w-full"
                    />
                  </div>

                  {formData.type === 'character' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          基础攻击 <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="number"
                          name="attack"
                          value={formData.attack}
                          onChange={handleChange}
                          min="0"
                          className="w-full px-3 py-2 bg-white bg-opacity-10 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="text-xs text-gray-400 mt-1">攻击为0的配角不能攻击</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          基础生命 <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="number"
                          name="health"
                          value={formData.health}
                          onChange={handleChange}
                          min="1"
                          className="w-full px-3 py-2 bg-white bg-opacity-10 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="text-xs text-gray-400 mt-1">生命值达到0时配角死亡</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* 效果和配文 */}
              <div className="bg-white bg-opacity-10 rounded-lg p-4">
                <h3 className="text-white font-semibold mb-4">💫 效果与描述</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    卡面效果 <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    name="effect"
                    value={formData.effect}
                    onChange={handleChange}
                    rows={4}
                    className="w-full px-3 py-2 bg-white bg-opacity-10 border border-gray-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="详细描述这张牌的效果..."
                    required
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    {formData.type === 'story' ? '描述使用后产生的效果' :
                     formData.type === 'character' ? '描述配角的特殊能力' :
                     '描述主角获得的持续性效果'}
                  </p>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">配文（可选）</label>
                  <textarea
                    name="flavor"
                    value={formData.flavor}
                    onChange={handleChange}
                    rows={2}
                    className="w-full px-3 py-2 bg-white bg-opacity-10 border border-gray-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="与这张牌相关的背景故事或台词（可选）"
                  />
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">插画URL（可选）</label>
                  <input
                    type="url"
                    name="image"
                    value={formData.image}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-white bg-opacity-10 border border-gray-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="http://example.com/card-image.jpg"
                  />
                  {formData.image && (
                    <div className="mt-2">
                      <img
                        src={formData.image}
                        alt="卡牌插画预览"
                        className="max-w-full h-32 object-cover rounded border border-gray-500"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                      <div className="hidden text-red-400 text-sm">图片加载失败，请检查URL是否正确</div>
                    </div>
                  )}
                </div>
              </div>

              {/* 可见性设置 */}
              <div className="bg-white bg-opacity-10 rounded-lg p-4">
                <h3 className="text-white font-semibold mb-4">👁️ 可见性设置</h3>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="isPublic"
                    checked={formData.isPublic}
                    onChange={handleChange}
                    className="w-4 h-4"
                  />
                  <span className="text-gray-300">
                    公开这张卡牌（其他玩家可以看到和使用这张卡牌）
                  </span>
                </label>
                <p className="text-xs text-gray-400 mt-2">
                  私有卡牌只有您自己可以看到和使用
                </p>
              </div>

              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={onCancel}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-3 px-4 rounded transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded transition-colors"
                >
                  {card ? '更新卡牌' : '创建卡牌'}
                </button>
              </div>
            </form>
          </div>

          {/* 右侧：卡牌预览 */}
          <div>
            <h3 className="text-white font-semibold mb-4">👀 卡牌预览</h3>
            {getCardPreview()}
            
            {/* 卡牌类型说明 */}
            <div className="mt-6 bg-white bg-opacity-10 rounded-lg p-4">
              <h4 className="text-white font-semibold mb-3">📚 卡牌类型说明</h4>
              <div className="text-sm text-gray-300 space-y-2">
                {formData.type === 'story' && (
                  <>
                    <p><strong className="text-blue-400">故事牌</strong> - 用于产生各种游戏效果</p>
                    <p>• <strong>事件:</strong> 需要支付费用主动使用</p>
                    <p>• <strong>背景:</strong> 加入手中时自动使用</p>
                  </>
                )}
                {formData.type === 'character' && (
                  <>
                    <p><strong className="text-green-400">配角牌</strong> - 可以进行战斗的单位</p>
                    <p>• 进入故事后才会成为实体单位</p>
                    <p>• 当回合一般不能进行攻击</p>
                    <p>• 生命值达到0或以下时死亡</p>
                  </>
                )}
                {formData.type === 'hero' && (
                  <>
                    <p><strong className="text-purple-400">主战者牌</strong> - 为主战者提供增益</p>
                    <p>• 使用后主战者获得牌面效果</p>
                    <p>• 效果一般可以叠加</p>
                    <p>• 卡组中携带上限为1张</p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default CardForm;
