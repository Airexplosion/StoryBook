import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import api from '../../services/api';

interface TypeData {
  id: string;
  name: string;
}

interface CategoryData {
  id: string;
  name: string;
  description: string;
}

interface CategoriesData {
  [typeId: string]: CategoryData[];
}

const CategoryManagement: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [types, setTypes] = useState<TypeData[]>([]);
  const [categories, setCategories] = useState<CategoriesData>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [editingCategory, setEditingCategory] = useState<{typeId: string, index: number} | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');

  // 获取现有的配置
  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const response = await api.get('/config');
      setTypes(response.data.types || []);
      setCategories(response.data.categories || {});
    } catch (error) {
      console.error('获取配置失败:', error);
      setError('获取配置失败');
    } finally {
      setLoading(false);
    }
  };

  const saveCategories = async (newCategories: CategoriesData) => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      await api.put('/config/categories', { categories: newCategories });
      setSuccess('类别配置已自动保存');
      
      // 刷新数据
      await fetchConfig();
    } catch (error: any) {
      setError(error.response?.data?.message || '保存失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async (typeId: string, name: string, description: string) => {
    if (!name.trim() || !description.trim()) {
      setError('类别名称和描述都不能为空');
      return;
    }

    const newCategory: CategoryData = {
      id: name.trim(),
      name: name.trim(),
      description: description.trim()
    };

    const newCategories = {
      ...categories,
      [typeId]: [...(categories[typeId] || []), newCategory]
    };

    setCategories(newCategories);
    setError('');
    
    // 自动保存
    await saveCategories(newCategories);
  };

  const handleEditCategory = async () => {
    if (!editingCategory || !editName.trim() || !editDescription.trim()) {
      setError('类别名称和描述都不能为空');
      return;
    }

    const { typeId, index } = editingCategory;
    const typeCategories = categories[typeId] || [];
    
    // 检查是否已存在（排除当前编辑的类别）
    if (typeCategories.some((cat, i) => i !== index && cat.name === editName.trim())) {
      setError('该类别名称已存在');
      return;
    }

    const newCategories = {
      ...categories,
      [typeId]: typeCategories.map((cat, i) => 
        i === index 
          ? { id: editName.trim(), name: editName.trim(), description: editDescription.trim() }
          : cat
      )
    };

    setCategories(newCategories);
    setEditingCategory(null);
    setEditName('');
    setEditDescription('');
    setError('');
    
    // 自动保存
    await saveCategories(newCategories);
  };

  const startEditCategory = (typeId: string, index: number, category: CategoryData) => {
    setEditingCategory({ typeId, index });
    setEditName(category.name);
    setEditDescription(category.description);
  };

  const cancelEditCategory = () => {
    setEditingCategory(null);
    setEditName('');
    setEditDescription('');
    setError('');
  };

  const handleDeleteCategory = async (typeId: string, categoryIndex: number) => {
    if (window.confirm('确定要删除这个类别吗？')) {
      const newCategories = {
        ...categories,
        [typeId]: categories[typeId].filter((_, index) => index !== categoryIndex)
      };
      
      setCategories(newCategories);
      
      // 自动保存
      await saveCategories(newCategories);
    }
  };

  // 如果不是管理员，显示权限提示
  if (!user?.isAdmin) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <h2 className="text-2xl font-bold mb-6 text-white">类别管理</h2>
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          只有管理员可以管理类别配置。
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">类别管理</h2>
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

      {/* 类别管理 */}
      <div className="space-y-6 mb-6">
        {types.map(type => (
          <div key={type.id} className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">
              {type.name} 类别
              <span className="text-gray-500 text-sm ml-2">
                ({(categories[type.id] || []).length} 个类别)
              </span>
            </h3>
            
            {/* 现有类别列表 */}
            <div className="space-y-3 mb-4">
              {(categories[type.id] || []).map((category, index) => (
                <div key={index} className="bg-gray-50 p-3 rounded">
                  {editingCategory?.typeId === type.id && editingCategory?.index === index ? (
                    <div className="space-y-3">
                      <div className="flex gap-3">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder="类别名称"
                          className="w-32 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          autoFocus
                        />
                        <input
                          type="text"
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          placeholder="类别描述"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleEditCategory}
                          className="text-green-600 hover:text-green-900 px-3 py-1"
                        >
                          保存
                        </button>
                        <button
                          onClick={cancelEditCategory}
                          className="text-gray-600 hover:text-gray-900 px-3 py-1"
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium">{category.name}</div>
                        <div className="text-gray-600 text-sm">{category.description}</div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEditCategory(type.id, index, category)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          编辑
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(type.id, index)}
                          className="text-red-600 hover:text-red-900"
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              
              {(categories[type.id] || []).length === 0 && (
                <div className="text-gray-500 text-center py-4">
                  暂无类别，请添加新类别
                </div>
              )}
            </div>

            {/* 添加新类别 */}
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">添加新类别</h4>
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="类别名称"
                  className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  id={`category-name-${type.id}`}
                />
                <input
                  type="text"
                  placeholder="类别描述"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  id={`category-description-${type.id}`}
                />
                <button
                  onClick={() => {
                    const nameInput = document.getElementById(`category-name-${type.id}`) as HTMLInputElement;
                    const descInput = document.getElementById(`category-description-${type.id}`) as HTMLInputElement;
                    
                    if (nameInput && descInput) {
                      handleAddCategory(type.id, nameInput.value, descInput.value);
                      if (!error) {
                        nameInput.value = '';
                        descInput.value = '';
                      }
                    }
                  }}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md whitespace-nowrap"
                >
                  添加
                </button>
              </div>
            </div>
          </div>
        ))}
        
        {types.length === 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="text-gray-500">
              暂无类型配置，请先在类型管理中添加类型
            </div>
          </div>
        )}
      </div>


      {/* 使用说明 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
        <h4 className="font-semibold text-blue-800 mb-2">使用说明</h4>
        <ul className="text-blue-700 text-sm space-y-1">
          <li>• 类别是类型的细分，用于更精确地分类卡牌</li>
          <li>• 每个类型可以有多个类别</li>
          <li>• 类别名称将作为ID使用，请确保在同一类型下唯一</li>
          <li>• 类别描述会在创建卡牌时显示，帮助用户理解类别用途</li>
          <li>• 添加或删除类别后会自动保存到数据库</li>
        </ul>
      </div>
    </div>
  );
};

export default CategoryManagement;
