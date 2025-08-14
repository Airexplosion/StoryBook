import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { store, RootState } from './store/store';
import { setUser } from './store/slices/authSlice';

import Navbar from './components/Layout/Navbar';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import Home from './components/Home/Home';
import CardCollection from './components/Cards/CardCollection';
import BatchImportCards from './components/Cards/BatchImportCards';
import DeckBuilder from './components/Decks/DeckBuilder';
import RoomList from './components/Rooms/RoomList';
import GameRoom from './components/Game/GameRoom';
import TestPage from './components/Test/TestPage';
import BatchImportHeroes from './components/Cards/BatchImportHeroes';
import FactionCollection from './components/Factions/FactionCollection';
import FactionManagement from './components/Settings/FactionManagement';
import TypeManagement from './components/Settings/TypeManagement';
import CategoryManagement from './components/Settings/CategoryManagement';
import CreateCard from './components/Cards/CreateCard';
import DataExport from './components/Settings/DataExport';
import { ColorProvider, useColor } from './contexts/ColorContext';
import ColorSettings from './components/Settings/ColorSettings';
import './index.css';

// 应用内容组件
const AppContent: React.FC = () => {
  const dispatch = useDispatch();
  const { user, token } = useSelector((state: RootState) => state.auth);
  const { playerColor, opponentColor, updateColors, showColorSettings, toggleColorSettings } = useColor();

  useEffect(() => {
    // 从localStorage恢复用户信息和页面状态
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    const savedCurrentPath = localStorage.getItem('currentPath');
    
    if (savedToken && savedUser && !user) {
      try {
        const userData = JSON.parse(savedUser);
        dispatch(setUser(userData));
        
        // 如果有保存的路径且不是登录/注册页，则重定向到该路径
        if (savedCurrentPath && savedCurrentPath !== '/login' && savedCurrentPath !== '/register' && window.location.pathname === '/') {
          window.history.replaceState({}, '', savedCurrentPath);
          window.location.reload();
        }
      } catch (error) {
        console.error('恢复用户信息失败:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('currentPath');
      }
    }

    // 保存当前路径状态
    const saveCurrentPath = () => {
      if (user && window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        localStorage.setItem('currentPath', window.location.pathname);
      }
    };
    
    // 监听路由变化
    saveCurrentPath();
    window.addEventListener('beforeunload', saveCurrentPath);
    
    return () => {
      window.removeEventListener('beforeunload', saveCurrentPath);
    };
  }, [dispatch, user]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#111111' }}>
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <Routes>
          <Route 
            path="/login" 
            element={!user ? <Login /> : <Navigate to="/" />} 
          />
          <Route 
            path="/register" 
            element={!user ? <Register /> : <Navigate to="/" />} 
          />
          <Route 
            path="/" 
            element={user ? <Home /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/cards" 
            element={user ? <CardCollection /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/cards/batch-import" 
            element={user ? <BatchImportCards /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/heroes/batch-import" 
            element={user ? <BatchImportHeroes /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/factions" 
            element={user ? <FactionCollection /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/factions/manage" 
            element={user ? <FactionManagement /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/types/manage" 
            element={user ? <TypeManagement /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/categories/manage" 
            element={user ? <CategoryManagement /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/cards/create" 
            element={user ? <CreateCard /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/settings/export" 
            element={user ? <DataExport /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/decks" 
            element={user ? <DeckBuilder /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/rooms" 
            element={user ? <RoomList /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/rooms/:roomId" 
            element={user ? <GameRoom /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/test" 
            element={<TestPage />} 
          />
        </Routes>
      </main>
      
      {/* 全局配色设置模态框 */}
      {showColorSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[9999]">
          <div className="relative max-w-4xl w-full mx-4">
            <ColorSettings 
              onSave={(playerColor, opponentColor) => {
                updateColors(playerColor, opponentColor);
                toggleColorSettings();
              }}
              initialPlayerColor={playerColor}
              initialOpponentColor={opponentColor}
            />
            <button
              onClick={toggleColorSettings}
              className="absolute top-4 right-4 bg-red-600 hover:bg-red-700 text-white w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

function App() {
  return (
    <Provider store={store}>
      <Router>
        <ColorProvider>
          <AppContent />
        </ColorProvider>
      </Router>
    </Provider>
  );
}

export default App;
