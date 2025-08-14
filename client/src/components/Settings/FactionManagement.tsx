import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import api from '../../services/api';
import { Faction } from '../../types';

interface FactionFormData {
  id: string;
  name: string;
  description: string;
  tags: string[];
  image: string;
}

const FactionManagement: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [factions, setFactions] = useState<Faction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [editingFaction, setEditingFaction] = useState<FactionFormData | null>(null);
  const [showForm, setShowForm] = useState(false);

  // 获取现有的faction配置
  useEffect(() => {
    fetchFactions();
  }, []);

  const fetchFactions = async () => {
    try {
      setLoading(true);
      const response = await api.get('/config');
      setFactions(response.data.factions || []);
    } catch (error) {
      console.error('获取faction配置失败:', error);
      setError('获取主战者配置失败');
    } finally {
      setLoading(false);
    }
  };

  const saveFactions = async (newFactions: Faction[]) => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const response = await api.put('/config/factions', { factions: newFactions });
      setSuccess('主战者配置已自动保存');
      
      // 刷新数据
      await fetchFactions();
    } catch (error: any) {
      setError(error.response?.data?.message || '保存失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAddFaction = () => {
    setEditingFaction({
      id: '',
      name: '',
      description: '',
      tags: [],
      image: ''
    });
    setShowForm(true);
  };

  const handleEditFaction = (faction: Faction) => {
    setEditingFaction({
      id: faction.id,
      name: faction.name,
      description: faction.description || '',
      tags: faction.tags || [],
      image: faction.image || ''
    });
    setShowForm(true);
  };

  const handleDeleteFaction = async (factionId: string) => {
    if (window.confirm('确定要删除这个主战者吗？')) {
      const newFactions = factions.filter(f => f.id !== factionId);
      setFactions(newFactions);
      
      // 自动保存
      await saveFactions(newFactions);
    }
  };

  const handleFormSubmit = async (formData: FactionFormData) => {
    if (!formData.name.trim()) {
      setError('主战者名称不能为空');
      return;
    }

    const existingIndex = factions.findIndex(f => f.id === formData.id);
    let newFactions: Faction[];
    
    if (existingIndex >= 0) {
      // 编辑现有faction
      newFactions = [...factions];
      newFactions[existingIndex] = {
        id: formData.name.trim(),
        name: formData.name.trim(),
        description: formData.description.trim(),
        tags: formData.tags,
        image: formData.image.trim()
      };
    } else {
      // 添加新faction
      const newFaction: Faction = {
        id: formData.name.trim(),
        name: formData.name.trim(),
        description: formData.description.trim(),
        tags: formData.tags,
        image: formData.image.trim()
      };
      newFactions = [...factions, newFaction];
    }

    setFactions(newFactions);
    setShowForm(false);
    setEditingFaction(null);
    setError('');
    
    // 自动保存
    await saveFactions(newFactions);
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingFaction(null);
    setError('');
  };

  // 如果不是管理员，显示权限提示
  if (!user?.isAdmin) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <h2 className="text-2xl font-bold mb-6 text-white">主战者管理</h2>
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          只有管理员可以管理主战者配置。
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">主战者管理</h2>
        <button
          onClick={handleAddFaction}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
        >
          添加主战者
        </button>
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

      {/* 主战者列表 */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">当前主战者列表</h3>
        
        {loading ? (
          <div className="text-center py-4">加载中...</div>
        ) : factions.length === 0 ? (
          <div className="text-center py-4 text-gray-500">暂无主战者配置</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    名称
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    描述
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    标签
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    图片
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {factions.map((faction) => (
                  <tr key={faction.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {faction.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                      {faction.description || '无描述'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {faction.tags && faction.tags.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {faction.tags.slice(0, 3).map((tag, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
                            >
                              {tag}
                            </span>
                          ))}
                          {faction.tags.length > 3 && (
                            <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                              +{faction.tags.length - 3}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">无标签</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {faction.image ? (
                        <img
                          src={faction.image}
                          alt={faction.name}
                          className="w-12 h-12 object-cover rounded"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yNCAzNkMzMC42Mjc0IDM2IDM2IDMwLjYyNzQgMzYgMjRDMzYgMTcuMzcyNiAzMC42Mjc0IDEyIDI0IDEyQzE3LjM3MjYgMTIgMTIgMTcuMzcyNiAxMiAyNEMxMiAzMC42Mjc0IDE3LjM3MjYgMzYgMjQgMzZaIiBzdHJva2U9IiM5Q0EzQUYiIHN0cm9rZS13aWR0aD0iMiIvPgo8cGF0aCBkPSJNMjEgMjFMMjcgMjciIHN0cm9rZT0iIzlDQTNBRiIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4KPHA+';
                          }}
                        />
                      ) : (
                        <span className="text-gray-400">无图片</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleEditFaction(faction)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleDeleteFaction(faction.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        删除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* 编辑/添加表单弹窗 */}
      {showForm && editingFaction && (
        <FactionForm
          faction={editingFaction}
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
        />
      )}
    </div>
  );
};

// 主战者表单组件
interface FactionFormProps {
  faction: FactionFormData;
  onSubmit: (faction: FactionFormData) => void;
  onCancel: () => void;
}

const FactionForm: React.FC<FactionFormProps> = ({ faction, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState<FactionFormData>(faction);
  const [tagInput, setTagInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleAddTag = () => {
    const tag = tagInput.trim();
    if (tag && !formData.tags.includes(tag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleTagInputKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">
          {faction.id ? '编辑主战者' : '添加主战者'}
        </h3>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              主战者名称 *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              描述
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              标签
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={handleTagInputKeyPress}
                placeholder="输入标签后按回车添加"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                添加
              </button>
            </div>
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm flex items-center gap-1"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              图片URL
            </label>
            <input
              type="url"
              value={formData.image}
              onChange={(e) => setFormData(prev => ({ ...prev, image: e.target.value }))}
              placeholder="https://example.com/image.jpg"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {formData.image && (
              <div className="mt-2">
                <img
                  src={formData.image}
                  alt="预览"
                  className="w-20 h-20 object-cover rounded border"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              {faction.id ? '更新' : '添加'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FactionManagement;
