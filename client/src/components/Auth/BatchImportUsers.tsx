import React, { useState } from 'react';
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
      const response = await api.get('/api/batch-import/hero-template', {
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'hero_import_template.csv');
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
      setError('只有管理员可以批量导入主战者');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('csvFile', file);

      const response = await api.post('/api/batch-import/heroes', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setResult(response.data);
      
    } catch (error: any) {
      setError(error.response?.data?.message || '批量导入失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">批量导入主战者</h2>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2">使用说明</h3>
          <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
            <li>请下载CSV模板并按照格式填写数据</li>
            <li>必填字段：name, effect</li>
            <li>可选字段：flavor, image, faction</li>
            <li>name为主战者名称，不能重复</li>
            <li>effect为主战者效果描述</li>
            <li>faction为主战者所属阵营（可选）</li>
          </ul>
        </div>

        <button
          onClick={handleDownloadTemplate}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded mb-4"
        >
          下载CSV模板
        </button>
      </div>

      {!user?.isAdmin && (
        <div className="mb-4 p-3 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
          只有管理员可以批量导入主战者
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            选择CSV文件
          </label>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            disabled={!user?.isAdmin}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100
              disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={!file || loading || !user?.isAdmin}
          className={`w-full py-2 px-4 rounded-md text-white font-medium
            ${!file || loading || !user?.isAdmin
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
