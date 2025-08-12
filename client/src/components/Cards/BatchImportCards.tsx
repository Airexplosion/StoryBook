import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCards } from '../../store/slices/cardsSlice';
import { RootState } from '../../store/store';
import api from '../../services/api';

interface ImportError {
  row: number;
  data: any;
  error: string;
}

interface ImportResult {
  message: string;
  total: number;
  success: number;
  failed: number;
  errors: ImportError[];
}

const BatchImportCards: React.FC = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string>('');
  const [isOverwriteMode, setIsOverwriteMode] = useState(false); // 新增覆盖模式状态
  const [cardOptions, setCardOptions] = useState<{
    types: string[];
    factions: string[];
    categories: { [key: string]: string[] };
    typeDetails: Array<{ id: string; name: string }>;
    factionDetails: Array<{ id: string; name: string }>;
    categoryDetails: { [key: string]: Array<{ id: string; name: string; description?: string }> };
  }>({ 
    types: [], 
    factions: [], 
    categories: {},
    typeDetails: [],
    factionDetails: [],
    categoryDetails: {}
  });

  // 获取卡牌选项
  useEffect(() => {
    const fetchCardOptions = async () => {
      try {
        const response = await api.get('/options/card-options');
        setCardOptions(response.data);
      } catch (error) {
        console.error('获取卡牌选项失败:', error);
        // 设置默认值
        setCardOptions({
          types: ['story', 'character', 'hero'],
          factions: ['neutral', 'hero1', 'hero2', 'hero3'],
          categories: {
            story: ['event', 'background'],
            character: ['character'],
            hero: ['hero']
          },
          typeDetails: [
            { id: 'story', name: '故事牌' },
            { id: 'character', name: '配角牌' },
            { id: 'hero', name: '主角牌' }
          ],
          factionDetails: [
            { id: 'neutral', name: '中立' },
            { id: 'hero1', name: '主角1专属' },
            { id: 'hero2', name: '主角2专属' },
            { id: 'hero3', name: '主角3专属' }
          ],
          categoryDetails: {
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
          }
        });
      }
    };

    if (user) {
      fetchCardOptions();
    }
  }, [user]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        setError('请选择CSV文件');
        return;
      }
      setFile(selectedFile);
      setError('');
      setResult(null);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await api.get('/cards/import-template', {
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'card_import_template.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      setError('下载模板失败');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      setError('请选择CSV文件');
      return;
    }

    if (!user) {
      setError('请先登录');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('csvFile', file);
      formData.append('overwriteMode', isOverwriteMode.toString()); // 添加覆盖模式参数

      const response = await api.post('/cards/batch-import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setResult(response.data);
      
      // 导入成功后刷新卡牌列表
      dispatch(fetchCards({}) as any);
      
    } catch (error: any) {
      setError(error.response?.data?.message || '批量导入失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">批量导入卡牌</h2>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2">使用说明</h3>
          <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
            <li>请下载CSV模板并按照格式填写数据</li>
            <li>必填字段：卡牌名称(name), 类型(type), 类别(category), 费用(cost), 效果(effect)</li>
            <li>type字段可选值：{cardOptions.typeDetails.length > 0 ? cardOptions.typeDetails.map(t => `${t.id}(${t.name})`).join(', ') : '加载中...'}</li>
            <li>faction字段可选值：{cardOptions.factionDetails.length > 0 ? cardOptions.factionDetails.map(f => `${f.id}(${f.name})`).join(', ') : '加载中...'}</li>
            <li>category字段按type分类：
              {cardOptions.typeDetails.length > 0 ? (
                <ul className="ml-4 mt-1">
                  {cardOptions.typeDetails.map(type => {
                    const categories = cardOptions.categoryDetails[type.id] || [];
                    return (
                      <li key={type.id}>
                        <strong>{type.name}</strong>: {categories.length > 0 ? categories.map(c => `${c.id}(${c.name})`).join(', ') : '无'}
                      </li>
                    );
                  })}
                </ul>
              ) : '加载中...'}
            </li>
            <li>attack和health字段为数字，默认为0</li>
            <li>isPublic字段为true/false，默认为true（公开）</li>
          </ul>
        </div>

        <button
          onClick={handleDownloadTemplate}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded mb-4"
        >
          下载CSV模板
        </button>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            选择CSV文件
          </label>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100"
          />
        </div>

        <div className="mb-4">
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={isOverwriteMode}
              onChange={(e) => setIsOverwriteMode(e.target.checked)}
              className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
            />
            <span className="text-sm font-medium text-gray-700">
              覆盖模式
            </span>
          </label>
          <p className="text-xs text-gray-500 mt-1 ml-7">
            {isOverwriteMode 
              ? "⚠️ 启用后将删除您创建的所有现有卡牌，然后导入新的卡牌" 
              : "默认模式：在现有卡牌基础上添加新卡牌"}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={!file || loading}
          className={`w-full py-2 px-4 rounded-md text-white font-medium
            ${!file || loading
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-500 hover:bg-blue-600'
            }`}
        >
          {loading ? '导入中...' : '开始导入'}
        </button>
      </form>

      {result && (
        <div className="mt-6 bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">导入结果</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-3 bg-blue-50 rounded">
              <div className="text-2xl font-bold text-blue-600">{result.total}</div>
              <div className="text-sm text-gray-600">总数</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded">
              <div className="text-2xl font-bold text-green-600">{result.success}</div>
              <div className="text-sm text-gray-600">成功</div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded">
              <div className="text-2xl font-bold text-red-600">{result.failed}</div>
              <div className="text-sm text-gray-600">失败</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded">
              <div className="text-2xl font-bold text-gray-600">
                {result.total > 0 ? Math.round((result.success / result.total) * 100) : 0}%
              </div>
              <div className="text-sm text-gray-600">成功率</div>
            </div>
          </div>

          {result.errors.length > 0 && (
            <div>
              <h4 className="font-medium text-red-600 mb-3">错误详情</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        行号
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        数据
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        错误信息
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {result.errors.map((error, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {error.row}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                            {JSON.stringify(error.data, null, 2)}
                          </pre>
                        </td>
                        <td className="px-6 py-4 text-sm text-red-600">
                          {error.error}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BatchImportCards;
