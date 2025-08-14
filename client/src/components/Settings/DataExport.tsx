import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import api from '../../services/api';

const DataExport: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  const handleExport = async (type: 'cards' | 'heroes' | 'all') => {
    if (!user || !user.isAdmin) {
      setError('只有管理员可以导出数据');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      let endpoint = '';
      let filename = '';
      let responseType: 'blob' | 'json' = 'blob';

      switch (type) {
        case 'cards':
          endpoint = '/export/cards';
          filename = 'cards_export.csv';
          break;
        case 'heroes':
          endpoint = '/export/heroes';
          filename = 'heroes_export.csv';
          break;
        case 'all':
          endpoint = '/export/all';
          filename = 'database_export.json';
          responseType = 'json';
          break;
      }

      const response = await api.get(endpoint, {
        responseType: responseType,
      });

      if (responseType === 'json') {
        // JSON格式导出
        const jsonString = JSON.stringify(response.data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      } else {
        // CSV格式导出
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      }

      setSuccess(`${getTypeDisplayName(type)}导出成功！文件已下载。`);
    } catch (error: any) {
      setError(error.response?.data?.message || `导出${getTypeDisplayName(type)}失败`);
    } finally {
      setLoading(false);
    }
  };

  const getTypeDisplayName = (type: 'cards' | 'heroes' | 'all') => {
    switch (type) {
      case 'cards':
        return '卡牌数据';
      case 'heroes':
        return '主战者数据';
      case 'all':
        return '完整数据库';
      default:
        return '数据';
    }
  };

  if (!user?.isAdmin) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          只有管理员可以访问数据导出功能
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">数据导出</h2>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2">导出说明</h3>
          <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
            <li>卡牌数据导出：导出所有卡牌数据为CSV格式，与导入格式兼容</li>
            <li>主战者数据导出：导出所有主战者配置为CSV格式，与导入格式兼容</li>
            <li>完整数据库导出：导出所有数据为JSON格式，包含详细的数据库信息</li>
            <li>导出的CSV文件可以直接用于批量导入功能</li>
            <li>导出的JSON文件包含导出时间、版本信息等元数据</li>
          </ul>
        </div>
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 卡牌数据导出 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4 text-blue-600">卡牌数据导出</h3>
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">
              导出所有卡牌数据为CSV格式
            </p>
            <ul className="text-xs text-gray-500 space-y-1">
              <li>• 包含卡牌名称、类型、类别等信息</li>
              <li>• 与批量导入格式完全兼容</li>
              <li>• 可在Excel中直接编辑</li>
            </ul>
          </div>
          <button
            onClick={() => handleExport('cards')}
            disabled={loading}
            className={`w-full py-2 px-4 rounded-md text-white font-medium
              ${loading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600'
              }`}
          >
            {loading ? '导出中...' : '导出卡牌数据'}
          </button>
        </div>

        {/* 主战者数据导出 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4 text-green-600">主战者数据导出</h3>
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">
              导出所有主战者配置为CSV格式
            </p>
            <ul className="text-xs text-gray-500 space-y-1">
              <li>• 包含主战者名称、描述、标签等</li>
              <li>• 与批量导入格式完全兼容</li>
              <li>• 支持标签和图片信息</li>
            </ul>
          </div>
          <button
            onClick={() => handleExport('heroes')}
            disabled={loading}
            className={`w-full py-2 px-4 rounded-md text-white font-medium
              ${loading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-500 hover:bg-green-600'
              }`}
          >
            {loading ? '导出中...' : '导出主战者数据'}
          </button>
        </div>

        {/* 完整数据库导出 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4 text-purple-600">完整数据库导出</h3>
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">
              导出所有数据为JSON格式
            </p>
            <ul className="text-xs text-gray-500 space-y-1">
              <li>• 包含卡牌和主战者的完整信息</li>
              <li>• 包含导出时间和版本信息</li>
              <li>• 适合数据备份和迁移</li>
            </ul>
          </div>
          <button
            onClick={() => handleExport('all')}
            disabled={loading}
            className={`w-full py-2 px-4 rounded-md text-white font-medium
              ${loading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-purple-500 hover:bg-purple-600'
              }`}
          >
            {loading ? '导出中...' : '导出完整数据库'}
          </button>
        </div>
      </div>

      <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h4 className="font-medium text-yellow-800 mb-2">注意事项</h4>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>• 导出功能仅限管理员使用</li>
          <li>• CSV文件使用UTF-8编码，确保中文正确显示</li>
          <li>• 导出的数据包含所有用户创建的内容</li>
          <li>• 建议定期备份数据以防数据丢失</li>
          <li>• 导出的CSV文件可以直接用于批量导入功能</li>
        </ul>
      </div>
    </div>
  );
};

export default DataExport;
