import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { RootState } from '../../store/store';
import { fetchRooms } from '../../store/slices/roomsSlice';
import api from '../../services/api';

const RoomList: React.FC = () => {
  const dispatch = useDispatch();
  const { rooms, isLoading, error } = useSelector((state: RootState) => state.rooms);
  const { user } = useSelector((state: RootState) => state.auth);
  const navigate = useNavigate();

  useEffect(() => {
    dispatch(fetchRooms() as any);
  }, [dispatch]);

  const handleCreateRoom = async () => {
    const roomName = prompt('请输入房间名称:');
    if (roomName) {
      try {
        const response = await api.rooms.create({ name: roomName });
        const newRoom = response.data;
        dispatch(fetchRooms() as any); // 刷新房间列表
        navigate(`/rooms/${newRoom._id}`); // 跳转到新创建的房间
      } catch (error) {
        console.error('创建房间失败:', error);
        alert('创建房间失败，请重试');
      }
    }
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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-white text-xl">加载中...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold text-white">对战房间</h1>
        <button 
          onClick={handleCreateRoom}
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
        >
          创建房间
        </button>
      </div>

      {error && (
        <div className="bg-red-500 bg-opacity-20 border border-red-500 text-red-100 px-4 py-3 rounded-md mb-6">
          错误: {error}
        </div>
      )}

      <div className="mb-8 text-center">
        <p className="text-gray-300">当前房间数量: {rooms.length}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rooms.map((room) => (
          <div key={room._id} className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-6 hover:bg-opacity-20 transition-all">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-white">{room.name}</h3>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                  room.gameState.phase === 'playing' ? 'bg-green-600 text-white' :
                  room.gameState.phase === 'waiting' ? 'bg-yellow-600 text-white' :
                  'bg-gray-600 text-white'
                }`}>
                  {room.gameState.phase === 'playing' ? '对战中' : 
                   room.gameState.phase === 'waiting' ? '等待中' : '暂停'}
                </span>
                {canDeleteRoom(room) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteRoom(room._id, room.name);
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white p-1 rounded transition-colors"
                    title="删除房间"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            <div className="text-gray-300 text-sm mb-4">
              <p>创建者: {room.createdBy.username}</p>
              <p>玩家: {room.realTimeStats?.playerCount || room.players.length}/{room.maxPlayers}</p>
              <p>观众: {room.realTimeStats?.spectatorCount || room.spectators.length}</p>
              <p>回合: {room.gameState.round}</p>
            </div>

            <div className="flex space-x-2">
              <button 
                onClick={() => handleJoinRoom(room._id)}
                disabled={room.players.length >= room.maxPlayers}
                className={`flex-1 py-2 px-4 rounded transition-colors ${
                  room.players.length >= room.maxPlayers 
                    ? 'bg-gray-600 text-gray-300 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                参战
              </button>
              <button 
                onClick={() => handleSpectateRoom(room._id)}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded transition-colors"
              >
                观战
              </button>
            </div>
          </div>
        ))}
      </div>

      {rooms.length === 0 && !isLoading && (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">🏠</div>
          <h3 className="text-2xl font-bold text-white mb-4">暂无房间</h3>
          <p className="text-gray-300 mb-8">创建第一个房间开始游戏吧！</p>
        </div>
      )}
    </div>
  );
};

export default RoomList;
