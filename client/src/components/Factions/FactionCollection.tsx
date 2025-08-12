import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store/store';
import { fetchConfig } from '../../store/slices/configSlice';
import { Faction } from '../../types';

const FactionCollection: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { config, isLoading, error } = useSelector((state: RootState) => state.config);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredFactions, setFilteredFactions] = useState<Faction[]>([]);
  const [selectedFaction, setSelectedFaction] = useState<Faction | null>(null);

  useEffect(() => {
    dispatch(fetchConfig());
  }, [dispatch]);

  useEffect(() => {
    if (config?.factions) {
      const filtered = config.factions.filter(faction =>
        faction.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (faction.description && faction.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredFactions(filtered);
    }
  }, [config?.factions, searchTerm]);

  const handleFactionClick = (faction: Faction) => {
    setSelectedFaction(faction);
  };

  const closeFactionDetail = () => {
    setSelectedFaction(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-red-900 bg-opacity-50 border border-red-500 rounded-lg p-8 max-w-md">
          <h2 className="text-red-300 text-2xl font-bold mb-4">加载失败</h2>
          <p className="text-red-200 text-lg">{error}</p>
          <button
            onClick={() => dispatch(fetchConfig())}
            className="mt-6 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-md transition-colors text-lg"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* 页面标题 */}
      <div className="mb-10">
        <h1 className="text-5xl font-bold text-white mb-4 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          主角集
        </h1>
        <p className="text-gray-300 text-xl">
          浏览所有可用的主战者阵营，了解它们的特色和效果
        </p>
      </div>

      {/* 搜索栏 */}
      <div className="mb-10">
        <div className="relative max-w-lg">
          <input
            type="text"
            placeholder="搜索主战者..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-6 py-4 pl-14 bg-gray-800 bg-opacity-50 border border-gray-600 rounded-lg text-white text-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent backdrop-blur-sm"
          />
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* 统计信息 */}
      <div className="mb-8">
        <div className="bg-gray-800 bg-opacity-30 rounded-lg p-6 backdrop-blur-sm border border-gray-700">
          <div className="flex items-center justify-between">
            <span className="text-gray-300 text-lg">
              共找到 <span className="text-purple-400 font-semibold text-xl">{filteredFactions.length}</span> 个主战者
            </span>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="text-gray-400 hover:text-white transition-colors text-lg"
              >
                清除搜索
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 主战者网格 */}
      {filteredFactions.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-gray-400 text-2xl mb-6">
            {searchTerm ? '未找到匹配的主战者' : '暂无主战者数据'}
          </div>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-lg transition-colors text-lg"
            >
              查看所有主战者
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredFactions.map((faction) => (
            <FactionCard 
              key={faction.id} 
              faction={faction} 
              onClick={() => handleFactionClick(faction)}
            />
          ))}
        </div>
      )}

      {/* 主战者详情弹窗 */}
      {selectedFaction && (
        <FactionDetailModal 
          faction={selectedFaction} 
          onClose={closeFactionDetail}
        />
      )}
    </div>
  );
};

// 主战者卡片组件
const FactionCard: React.FC<{ faction: Faction; onClick: () => void }> = ({ faction, onClick }) => {
  const getFactionColor = (factionId: string) => {
    const colors = {
      neutral: 'from-gray-600 to-gray-800',
      hero1: 'from-blue-600 to-blue-800',
      hero2: 'from-red-600 to-red-800',
      hero3: 'from-green-600 to-green-800',
    };
    return colors[factionId as keyof typeof colors] || 'from-purple-600 to-purple-800';
  };

  return (
    <div 
      className="group relative cursor-pointer"
      onClick={onClick}
    >
      <div 
        className={`bg-gradient-to-br ${getFactionColor(faction.id)} rounded-xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-opacity-20 border-white backdrop-blur-sm`}
        style={{ width: '280px', height: '200px' }} // 固定大小
      >
        {/* 主战者名称 */}
        <div className="text-center mb-6">
          <h3 className="text-2xl font-bold text-white group-hover:text-yellow-300 transition-colors">
            {faction.name}
          </h3>
          <div className="w-16 h-1 bg-white bg-opacity-30 mx-auto mt-3 rounded-full"></div>
        </div>

        {/* 主战者ID */}
        <div className="text-center mb-4">
          <span className="inline-block bg-black bg-opacity-30 text-gray-300 text-base px-4 py-2 rounded-full">
            ID: {faction.id}
          </span>
        </div>


        {/* 装饰性元素 */}
        <div className="absolute top-3 right-3 opacity-20 group-hover:opacity-40 transition-opacity">
          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        </div>
      </div>
    </div>
  );
};

// 主战者详情弹窗组件
const FactionDetailModal: React.FC<{ faction: Faction; onClose: () => void }> = ({ faction, onClose }) => {
  const getFactionColor = (factionId: string) => {
    const colors = {
      neutral: 'from-gray-600 to-gray-800',
      hero1: 'from-blue-600 to-blue-800',
      hero2: 'from-red-600 to-red-800',
      hero3: 'from-green-600 to-green-800',
    };
    return colors[factionId as keyof typeof colors] || 'from-purple-600 to-purple-800';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-700 shadow-2xl">
        {/* 头部 */}
        <div className={`bg-gradient-to-r ${getFactionColor(faction.id)} p-8 rounded-t-2xl relative`}>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          <div className="text-center">
            <h2 className="text-4xl font-bold text-white mb-4">
              {faction.name}
            </h2>
            <div className="inline-block bg-black bg-opacity-30 text-gray-200 text-lg px-6 py-2 rounded-full">
              ID: {faction.id}
            </div>
          </div>
        </div>

        {/* 内容 */}
        <div className="p-8">
          <div className="mb-8">
            <h3 className="text-3xl font-bold text-white mb-6">主战者效果</h3>
            <div className="bg-gray-800 bg-opacity-50 rounded-lg p-8 border border-gray-700">
              <p className="text-white text-xl leading-relaxed font-medium">
                {faction.description || '暂无详细描述'}
              </p>
            </div>
          </div>

          {/* 关闭按钮 */}
          <div className="text-center">
            <button
              onClick={onClose}
              className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-lg transition-colors text-lg font-semibold"
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FactionCollection;
