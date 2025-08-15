import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { RootState } from '../../store/store';
import { fetchRooms } from '../../store/slices/roomsSlice';
import api from '../../services/api';
import socketService from '../../services/socket';

const RoomList: React.FC = () => {
  const dispatch = useDispatch();
  const { rooms, isLoading, error } = useSelector((state: RootState) => state.rooms);
  const { user } = useSelector((state: RootState) => state.auth);
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [showSpectatorsModal, setShowSpectatorsModal] = useState(false);
  const [selectedRoomSpectators, setSelectedRoomSpectators] = useState<any[]>([]);
  const [selectedRoomName, setSelectedRoomName] = useState('');

  useEffect(() => {
    dispatch(fetchRooms() as any);
    
    // 设置定时刷新房间列表以获取实时观战人数据
    const interval = setInterval(() => {
      dispatch(fetchRooms() as any);
    }, 5000); // 每5秒刷新一次
    
    return () => {
      clearInterval(interval);
    };
  }, [dispatch]);

  const handleCreateRoom = () => {
    setShowCreateModal(true);
  };

  const handleConfirmCreate = async () => {
    if (roomName.trim()) {
      try {
        const response = await api.rooms.create({ name: roomName.trim() });
        const newRoom = response.data;
        dispatch(fetchRooms() as any); // 刷新房间列表
        navigate(`/rooms/${newRoom._id}`); // 跳转到新创建的房间
        setShowCreateModal(false);
        setRoomName('');
      } catch (error) {
        console.error('创建房间失败:', error);
        alert('创建房间失败，请重试');
      }
    }
  };

  const handleCancelCreate = () => {
    setShowCreateModal(false);
    setRoomName('');
  };

  const handleJoinRoom = (roomId: string) => {
    navigate(`/rooms/${roomId}`);
  };

  const handleSpectateRoom = (roomId: string) => {
    navigate(`/rooms/${roomId}?spectate=true`);
  };

  const handleDeleteRoom = async (roomId: string, roomName: string) => {
    if (window.confirm(`确定要删除房间"${roomName}"吗？此操作不可撤销。`)) {
      try {
        await api.rooms.delete(roomId);
        dispatch(fetchRooms() as any);
        alert('房间删除成功');
      } catch (error: any) {
        console.error('删除房间失败:', error);
        alert(error.response?.data?.message || '删除房间失败，请重试');
      }
    }
  };

  const canDeleteRoom = (room: any) => {
    if (!user) return false;
    return user.isAdmin || room.createdBy._id === user.id;
  };

  const handleViewSpectators = (room: any) => {
    setSelectedRoomSpectators(room.spectators || []);
    setSelectedRoomName(room.name);
    setShowSpectatorsModal(true);
  };

  const handleCloseSpectatorsModal = () => {
    setShowSpectatorsModal(false);
    setSelectedRoomSpectators([]);
    setSelectedRoomName('');
  };

  const formatSpectatorNames = (spectators: any[]) => {
    if (!spectators || spectators.length === 0) {
      return '暂无观战';
    }
    
    const names = spectators.map(s => s.username).join('、');
    if (names.length > 10) {
      return names.substring(0, 10) + '...';
    }
    return names;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-white text-xl">加载中...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto relative">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-semibold" style={{ color: '#FBFBFB', fontFamily: 'QingNiaoHuaGuangYaoTi, sans-serif' }}>对战房间</h1>
        <button 
          onClick={handleCreateRoom}
          className="px-6 py-3 rounded-lg transition-all duration-500 ease-out relative overflow-hidden group border-2 text-xl"
          style={{ 
            backgroundColor: 'transparent',
            color: '#C2B79C',
            borderColor: '#C2B79C',
            fontFamily: 'QingNiaoHuaGuangYaoTi, sans-serif',
            fontWeight: '100'
          }}
        >
          {/* 背景滑动效果 */}
          <div
            className="absolute inset-0 transition-transform duration-500 ease-out transform -translate-x-full group-hover:translate-x-0"
            style={{ backgroundColor: '#C2B79C' }}
          ></div>
          
          {/* 文字内容 */}
          <span className="relative z-10 transition-colors duration-300 group-hover:text-white whitespace-nowrap">
            创建房间
          </span>
        </button>
      </div>

      {error && (
        <div className="bg-red-500 bg-opacity-20 border border-red-500 text-red-100 px-4 py-3 rounded-md mb-6">
          错误: {error}
        </div>
      )}

      <div className="mb-8 text-center">
        <p className="italic" style={{ color: '#AEAEAE' }}>当前房间数量: {rooms.length}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rooms.map((room) => (
          <div key={room._id} className="rounded-xl p-4 transition-all" style={{ backgroundColor: '#414141' }}>
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1">
                <span 
                  className="px-2 py-1 rounded text-xs inline-block mb-2"
                  style={{
                    backgroundColor: room.gameState.phase === 'playing' ? '#679C7A' : 
                                   room.gameState.phase === 'waiting' ? '#4F6A8D' : '#666666',
                    color: 'white',
                    fontWeight: '100'
                  }}
                >
                  {room.gameState.phase === 'playing' ? '对战中' : 
                   room.gameState.phase === 'waiting' ? '等待中' : '暂停'}
                </span>
                <h3 
                  className="text-3xl font-bold truncate" 
                  style={{ 
                    color: '#C2B79C', 
                    fontFamily: 'QingNiaoHuaGuangYaoTi, sans-serif',
                    maxWidth: '350px',
                    marginLeft: '-3px'
                  }}
                  title={room.name}
                >
                  {room.name.length > 7 ? `${room.name.substring(0, 7)}...` : room.name}
                </h3>
              </div>
              
              {canDeleteRoom(room) && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteRoom(room._id, room.name);
                  }}
                  className="p-2 rounded transition-colors duration-300 group"
                  style={{ color: '#AEAEAE' }}
                  title="删除房间"
                >
                  <svg className="w-4 h-4 transition-colors duration-300 group-hover:fill-[#F07272]" viewBox="0 0 1024 1024" fill="currentColor">
                    <path d="M799.2 874.4c0 34.4-28.001 62.4-62.4 62.4H287.2c-34.4 0-62.4-28-62.4-62.4V212h574.4v662.4zM349.6 100c0-7.2 5.6-12.8 12.8-12.8h300c7.2 0 12.8 5.6 12.8 12.8v37.6H349.6V100z m636.8 37.6H749.6V100c0-48.001-39.2-87.2-87.2-87.2h-300c-48 0-87.2 39.199-87.2 87.2v37.6H37.6C16.8 137.6 0 154.4 0 175.2s16.8 37.6 37.6 37.6h112v661.6c0 76 61.6 137.6 137.6 137.6h449.6c76 0 137.6-61.6 137.6-137.6V212h112c20.8 0 37.6-16.8 37.6-37.6s-16.8-36.8-37.6-36.8zM512 824c20.8 0 37.6-16.8 37.6-37.6v-400c0-20.8-16.8-37.6-37.6-37.6s-37.6 16.8-37.6 37.6v400c0 20.8 16.8 37.6 37.6 37.6m-175.2 0c20.8 0 37.6-16.8 37.6-37.6v-400c0-20.8-16.8-37.6-37.6-37.6s-37.6 16.8-37.6 37.6v400c0.8 20.8 17.6 37.6 37.6 37.6m350.4 0c20.8 0 37.6-16.8 37.6-37.6v-400c0-20.8-16.8-37.6-37.6-37.6s-37.6 16.8-37.6 37.6v400c0 20.8 16.8 37.6 37.6 37.6"/>
                  </svg>
                </button>
              )}
            </div>

                          <div className="mb-2" style={{ color: '#FBFBFB', marginLeft: '2px' }}>
                <p className="text-lg">创建者 <span className="italic">{room.createdBy.username}</span></p>
              </div>

            <div className="rounded p-3 mb-4" style={{ backgroundColor: '#2A2A2A', color: '#AEAEAE' }}>
              <div className="flex justify-between items-center text-sm">
                <span>对战人数</span>
                <span>{room.realTimeStats?.playerCount || room.players.length}/{room.maxPlayers}</span>
              </div>
              <div className="text-sm">

                {room.players && room.players.length > 0 && (
                  <div className="text-xs space-y-1 mt-2">
                    {room.players.map((player, index) => (
                      <div key={player.user._id} className="flex justify-between items-center">
                        <span className="truncate max-w-[120px]" title={player.user.username}>
                          {player.user.username}
                        </span>
                        <span>
                          {room.realTimeStats?.playerTurns?.[player.user._id] || 0}回合
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 观战人信息 */}
              <div className="border-t border-gray-600 mt-3 pt-3">
                <div className="flex justify-between items-center text-sm">
                  <span>观战人</span>
                  <span>{room.spectators?.length || 0}人</span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-xs truncate flex-1" style={{ color: '#CCCCCC' }}>
                    {formatSpectatorNames(room.spectators)}
                  </span>
                  {room.spectators && room.spectators.length > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewSpectators(room);
                      }}
                      className="ml-2 px-2 py-1 text-xs rounded transition-colors hover:bg-gray-600"
                      style={{ color: '#4F6A8D', backgroundColor: 'transparent' }}
                    >
                      查看
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex space-x-2">
              <button 
                onClick={() => handleJoinRoom(room._id)}
                disabled={room.players.length >= room.maxPlayers}
                className={`flex-1 py-1 px-4 rounded transition-colors ${
                  room.players.length >= room.maxPlayers 
                    ? 'bg-gray-600 text-gray-300 cursor-not-allowed' 
                    : ''
                }`}
                style={{
                  backgroundColor: room.players.length >= room.maxPlayers ? '#666666' : '#C2B79C',
                  color: room.players.length >= room.maxPlayers ? '#999999' : '#FBFBFB'
                }}
              >
                参战
              </button>
              <button 
                onClick={() => handleSpectateRoom(room._id)}
                className="flex-1 py-1 px-4 rounded transition-colors"
                style={{ backgroundColor: '#CCCCCC', color: '#333333' }}
              >
                观战
              </button>
            </div>
          </div>
        ))}
      </div>

      {rooms.length === 0 && !isLoading && (
        <div className="text-center py-20">
          <div className="mb-4 flex justify-center">
            <svg className="w-16 h-16" viewBox="0 0 1024 1024" fill="#AEAEAE">
              <path d="M992.08768 332.8L544.08768 51.2c-19.2-12.8-44.8-12.8-64 0l-448 281.6C-25.51232 364.8 0.08768 448 64.08768 448h896c64 0 89.6-83.2 32-115.2z"/>
              <path d="M128.08768 441.6v486.4c0 32 25.6 51.2 51.2 51.2H832.08768c32 0 51.2-25.6 51.2-51.2V441.6H128.08768z m499.2 492.8H390.48768V704c0-64 51.2-115.2 115.2-115.2s121.6 51.2 121.6 115.2v230.4z"/>
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-white mb-4">暂无房间</h3>
          <p className="text-gray-300 mb-8">创建第一个房间开始游戏吧！</p>
        </div>
      )}

      {/* 创建房间模态框 */}
      {showCreateModal && (
        <div className="fixed inset-0 flex items-center justify-center z-40 backdrop-blur-sm" style={{ backgroundColor: 'rgba(17, 17, 17, 0.8)' }}>
          <div className="rounded-lg p-6 w-96 max-w-md mx-4" style={{ backgroundColor: '#414141' }}>
            <h3 className="text-lg font-medium mb-4" style={{ color: '#FBFBFB' }}>
              请输入房间名称:
            </h3>
            
            <input
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              className="w-full px-3 py-2 rounded border-2 mb-6 bg-transparent focus:outline-none"
              style={{ 
                borderColor: '#4F6A8D',
                color: '#FBFBFB'
              }}
              placeholder="房间名称"
              autoFocus
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleConfirmCreate();
                }
              }}
            />
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleCancelCreate}
                className="px-4 py-2 rounded border-2 transition-colors"
                style={{
                  borderColor: '#4F6A8D',
                  color: '#4F6A8D',
                  backgroundColor: 'transparent'
                }}
              >
                取消
              </button>
              <button
                onClick={handleConfirmCreate}
                className="px-4 py-2 rounded transition-colors"
                style={{
                  backgroundColor: '#4F6A8D',
                  color: '#FBFBFB'
                }}
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 观战人查看模态框 */}
      {showSpectatorsModal && (
        <div className="fixed inset-0 flex items-center justify-center z-40 backdrop-blur-sm" style={{ backgroundColor: 'rgba(17, 17, 17, 0.8)' }}>
          <div className="rounded-lg p-6 w-96 max-w-md mx-4" style={{ backgroundColor: '#414141' }}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium" style={{ color: '#FBFBFB' }}>
                房间观战人员
              </h3>
              <button
                onClick={handleCloseSpectatorsModal}
                className="p-1 rounded transition-colors hover:bg-gray-600"
                style={{ color: '#AEAEAE' }}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-sm" style={{ color: '#AEAEAE' }}>
                房间: <span style={{ color: '#C2B79C' }}>{selectedRoomName}</span>
              </p>
              <p className="text-sm mt-1" style={{ color: '#AEAEAE' }}>
                观战人数: <span style={{ color: '#FBFBFB' }}>{selectedRoomSpectators.length}</span>
              </p>
            </div>

            <div className="max-h-60 overflow-y-auto mb-6">
              {selectedRoomSpectators.length > 0 ? (
                <div className="space-y-2">
                  {selectedRoomSpectators.map((spectator, index) => (
                    <div 
                      key={spectator._id || index} 
                      className="flex items-center p-2 rounded"
                      style={{ backgroundColor: '#2A2A2A' }}
                    >
                      <div className="w-8 h-8 rounded-full flex items-center justify-center mr-3" style={{ backgroundColor: '#4F6A8D' }}>
                        <span className="text-xs font-medium" style={{ color: '#FBFBFB' }}>
                          {spectator.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="text-sm" style={{ color: '#FBFBFB' }}>
                        {spectator.username}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm" style={{ color: '#AEAEAE' }}>暂无观战人员</p>
                </div>
              )}
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={handleCloseSpectatorsModal}
                className="px-4 py-2 rounded transition-colors"
                style={{
                  backgroundColor: '#4F6A8D',
                  color: '#FBFBFB'
                }}
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomList;
