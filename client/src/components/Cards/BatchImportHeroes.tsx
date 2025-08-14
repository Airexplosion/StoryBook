import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
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

const BatchImportHeroes: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string>('');
  const [existingFactions, setExistingFactions] = useState<string[]>([]);
  const [overwriteMode, setOverwriteMode] = useState<boolean>(false);

  // 获取现有的faction配置
  useEffect(() => {
    const fetchExistingFactions = async () => {
      try {
        const response = await api.get('/options/card-options');
        setExistingFactions(response.data.factions || []);
      } catch (error) {
        console.error('获取现有faction配置失败:', error);
        setExistingFactions(['neutral', 'champion1', 'champion2', 'champion3']);
      }
    };

    if (user) {
      fetchExistingFactions();
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
      const response = await api.get('/batch-import/hero-template', {
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'faction_import_template.csv');
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

    if (!user.isAdmin) {
      setError('只有管理员可以批量导入主战者配置');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('csvFile', file);
      formData.append('overwriteMode', overwriteMode.toString());

      const response = await api.post('/batch-import/heroes', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setResult(response.data);
      
      // 导入成功后刷新faction列表
      if (response.data.success > 0) {
        // 重新获取faction配置
        const updatedResponse = await api.get('/options/card-options');
        setExistingFactions(updatedResponse.data.factions || []);
      }
      
    } catch (error: any) {
      setError(error.response?.data?.message || '批量导入失败');
    } finally {
      setLoading(false);
    }
  };

  // 如果不是管理员，显示权限提示
  if (!user?.isAdmin) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <h2 className="text-2xl font-bold mb-6">批量导入主战者配置</h2>
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          只有管理员可以批量导入主战者配置。
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">批量导入主战者配置</h2>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2">使用说明</h3>
          <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
            <li>请下载CSV模板并按照格式填写数据</li>
            <li>必填字段：name（主战者名称）</li>
            <li>可选字段：
              <ul className="list-disc list-inside ml-4 mt-1">
                <li>description（描述）：主战者的详细描述</li>
                <li>tags（标签）：用逗号分隔的标签，如"正义,光明,治疗"</li>
                <li>image（图片）：单个图片URL，如"https://example.com/image.jpg"</li>
              </ul>
            </li>
            <li>导入模式：
              <ul className="list-disc list-inside ml-4 mt-1">
                <li>添加模式（默认）：如果主战者名称已存在，将跳过并报错</li>
                <li>覆盖模式：如果主战者名称已存在，将更新其配置信息</li>
              </ul>
            </li>
            <li>通过name字段进行匹配，确保导入后能正确对应</li>
            <li>现有的faction配置：{existingFactions.length > 0 ? existingFactions.join(', ') : '加载中...'}</li>
            <li>导入的配置将添加到系统中，供创建卡牌和卡组时使用</li>
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
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={overwriteMode}
              onChange={(e) => setOverwriteMode(e.target.checked)}
              className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="text-sm font-medium text-gray-700">
              覆盖模式
            </span>
          </label>
          <p className="text-xs text-gray-500 mt-1">
            {overwriteMode 
              ? '勾选后，如果主战者名称已存在，将更新其配置信息' 
              : '未勾选时，如果主战者名称已存在，将跳过该条记录并报错'
            }
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

export default BatchImportHeroes;
