import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getColorClasses } from '../utils/colorUtils';

interface ColorContextType {
  playerColor: string;
  opponentColor: string;
  playerColorClasses: ReturnType<typeof getColorClasses>;
  opponentColorClasses: ReturnType<typeof getColorClasses>;
  updateColors: (newPlayerColor: string, newOpponentColor: string) => void;
  showColorSettings: boolean;
  toggleColorSettings: () => void;
}

const ColorContext = createContext<ColorContextType | undefined>(undefined);

export const useColor = () => {
  const context = useContext(ColorContext);
  if (!context) {
    throw new Error('useColor must be used within a ColorProvider');
  }
  return context;
};

interface ColorProviderProps {
  children: ReactNode;
}

export const ColorProvider: React.FC<ColorProviderProps> = ({ children }) => {
  const [playerColor, setPlayerColor] = useState<string>('blue');
  const [opponentColor, setOpponentColor] = useState<string>('green');
  const [showColorSettings, setShowColorSettings] = useState(false);

  // 从localStorage加载颜色设置
  useEffect(() => {
    const savedPlayerColor = localStorage.getItem('playerColor');
    const savedOpponentColor = localStorage.getItem('opponentColor');
    
    if (savedPlayerColor) {
      setPlayerColor(savedPlayerColor);
    }
    if (savedOpponentColor) {
      setOpponentColor(savedOpponentColor);
    }
  }, []);

  // 更新颜色并保存到localStorage
  const updateColors = (newPlayerColor: string, newOpponentColor: string) => {
    setPlayerColor(newPlayerColor);
    setOpponentColor(newOpponentColor);
    localStorage.setItem('playerColor', newPlayerColor);
    localStorage.setItem('opponentColor', newOpponentColor);
  };

  const toggleColorSettings = () => {
    setShowColorSettings(!showColorSettings);
  };

  // 获取当前颜色的CSS类
  const playerColorClasses = getColorClasses(playerColor);
  const opponentColorClasses = getColorClasses(opponentColor);

  const value: ColorContextType = {
    playerColor,
    opponentColor,
    playerColorClasses,
    opponentColorClasses,
    updateColors,
    showColorSettings,
    toggleColorSettings
  };

  return (
    <ColorContext.Provider value={value}>
      {children}
    </ColorContext.Provider>
  );
};
