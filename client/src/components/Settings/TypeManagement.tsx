import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import api from '../../services/api';

interface TypeData {
  id: string;
  name: string;
}

const TypeManagement: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [types, setTypes] = useState<TypeData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [newTypeName, setNewTypeName] = useState('');
  const [editingType, setEditingType] = useState<TypeData | null>(null);
  const [editName, setEditName] = useState('');

  // 获取现有的类型配置
  useEffect(() => {
    fetchTypes();
  }, []);

  const fetchTypes = async () => {
    try {
      setLoading(true);
      const response = await api.get('/config');
      setTypes(response.data.types || []);
    } catch (error) {
      console.error('获取类型配置失败:', error);
      setError('获取类型配置失败');
    } finally {
      setLoading(false);
    }
  };

  const saveTypes = async (newTypes: TypeData[]) => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      await api.put('/config/types', { types: newTypes });
      setSuccess('类型配置已自动保存');
      
      // 刷新数据
      await fetchTypes();
    } catch (error: any) {
      setError(error.response?.data?.message || '保存失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAddType = async () => {
    if (!newTypeName.trim()) {
      setError('类型名称不能为空');
      return;
    }

    const newTypeId = newTypeName.toLowerCase().replace(/\s+/g, '_');
    
    // 检查是否已存在
    if (types.some(type => type.id === newTypeId || type.name === newTypeName.trim())) {
      setError('该类型已存在');
      return;
    }

    const newType: TypeData = {
      id: newTypeId,
      name: newTypeName.trim()
    };

    const newTypes = [...types, newType];
    setTypes(newTypes);
    setNewTypeName('');
    setError('');
    
    // 自动保存
    await saveTypes(newTypes);
  };

  const handleEditType = async () => {
    if (!editingType || !editName.trim()) {
      setError('类型名称不能为空');
      return;
    }

    const newTypeId = editName.toLowerCase().replace(/\s+/g, '_');
    
    // 检查是否已存在（排除当前编辑的类型）
    if (types.some(type => type.id !== editingType.id && (type.id === newTypeId || type.name === editName.trim()))) {
      setError('该类型已存在');
      return;
    }

    const newTypes = types.map(type => 
      type.id === editingType.id 
        ? { id: newTypeId, name: editName.trim() }
        : type
    );

    setTypes(newTypes);
    setEditingType(null);
    setEditName('');
    setError('');
    
    // 自动保存
    await saveTypes(newTypes);
  };

  const startEdit = (type: TypeData) => {
    setEditingType(type);
    setEditName(type.name);
  };

  const cancelEdit = () => {
    setEditingType(null);
    setEditName('');
    setError('');
  };

  const handleDeleteType = async (typeId: string) => {
    if (window.confirm('确定要删除这个类型吗？删除后相关的类别也会被删除。')) {
      const newTypes = types.filter(type => type.id !== typeId);
      setTypes(newTypes);
      
      // 自动保存
      await saveTypes(newTypes);
    }
  };

  // 如果不是管理员，显示权限提示
  if (!user?.isAdmin) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <h2 className="text-2xl font-bold mb-6 text-white">类型管理</h2>
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          只有管理员可以管理类型配置。
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">类型管理</h2>
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

      {/* 添加新类型 */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">添加新类型</h3>
        
        <div className="flex gap-3">
          <input
            type="text"
            value={newTypeName}
            onChange={(e) => setNewTypeName(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleAddType();
              }
            }}
            placeholder="输入类型名称"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleAddType}
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
          >
            添加
          </button>
        </div>
      </div>

      {/* 类型列表 */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">当前类型列表</h3>
        
        {loading ? (
          <div className="text-center py-4">加载中...</div>
        ) : types.length === 0 ? (
          <div className="text-center py-4 text-gray-500">暂无类型配置</div>
        ) : (
          <div className="space-y-3">
            {types.map((type) => (
              <div key={type.id} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                {editingType?.id === type.id ? (
                  <>
                    <div className="flex-1 flex items-center gap-3">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleEditType();
                          } else if (e.key === 'Escape') {
                            cancelEdit();
                          }
                        }}
                        className="flex-1 px-3 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                      />
                      <span className="text-gray-500 text-sm">({type.id})</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleEditType}
                        className="text-green-600 hover:text-green-900 px-2 py-1"
                      >
                        保存
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="text-gray-600 hover:text-gray-900 px-2 py-1"
                      >
                        取消
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <span className="font-medium">{type.name}</span>
                      <span className="text-gray-500 text-sm ml-2">({type.id})</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEdit(type)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleDeleteType(type.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        删除
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

      </div>

      {/* 使用说明 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-800 mb-2">使用说明</h4>
        <ul className="text-blue-700 text-sm space-y-1">
          <li>• 类型用于区分不同种类的卡牌，如故事牌、配角牌、主角牌等</li>
          <li>• 删除类型时，相关的类别配置也会被删除</li>
          <li>• 类型ID会自动根据名称生成，用于系统内部识别</li>
          <li>• 添加或删除类型后会自动保存到数据库</li>
        </ul>
      </div>
    </div>
  );
};

export default TypeManagement;
