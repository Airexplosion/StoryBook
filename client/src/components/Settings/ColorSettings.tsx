import React, { useState, useEffect } from 'react';

interface ColorPalette {
  name: string;
  playerColor: string;
  opponentColor: string;
}

const predefinedPalettes: ColorPalette[] = [
  { name: '默认 (蓝/绿)', playerColor: 'blue', opponentColor: 'green' },
  { name: '红/黄', playerColor: 'red', opponentColor: 'yellow' },
  { name: '蓝/橙', playerColor: 'blue', opponentColor: 'orange' },
  { name: '绿/紫', playerColor: 'green', opponentColor: 'purple' },
  { name: '灰/白', playerColor: 'gray', opponentColor: 'white' },
  { name: '黑/粉', playerColor: 'black', opponentColor: 'pink' },
];

interface ColorSettingsProps {
  onSave: (playerColor: string, opponentColor: string) => void;
  initialPlayerColor: string;
  initialOpponentColor: string;
}

const ColorSettings: React.FC<ColorSettingsProps> = ({ onSave, initialPlayerColor, initialOpponentColor }) => {
  const [playerColor, setPlayerColor] = useState(initialPlayerColor);
  const [opponentColor, setOpponentColor] = useState(initialOpponentColor);
  const [customPlayerColor, setCustomPlayerColor] = useState(initialPlayerColor);
  const [customOpponentColor, setCustomOpponentColor] = useState(initialOpponentColor);
  const [isCustom, setIsCustom] = useState(false);

  useEffect(() => {
    setPlayerColor(initialPlayerColor);
    setOpponentColor(initialOpponentColor);
    setCustomPlayerColor(initialPlayerColor);
    setCustomOpponentColor(initialOpponentColor);
    // Check if initial colors match any predefined palette
    const matchedPalette = predefinedPalettes.find(
      p => p.playerColor === initialPlayerColor && p.opponentColor === initialOpponentColor
    );
    setIsCustom(!matchedPalette);
  }, [initialPlayerColor, initialOpponentColor]);

  const handlePaletteSelect = (palette: ColorPalette) => {
    setPlayerColor(palette.playerColor);
    setOpponentColor(palette.opponentColor);
    setCustomPlayerColor(palette.playerColor);
    setCustomOpponentColor(palette.opponentColor);
    setIsCustom(false);
    onSave(palette.playerColor, palette.opponentColor);
  };

  const handleCustomSave = () => {
    setPlayerColor(customPlayerColor);
    setOpponentColor(customOpponentColor);
    onSave(customPlayerColor, customOpponentColor);
  };

  const handleCustomToggle = () => {
    setIsCustom(true);
  };

  return (
    <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-6 max-w-lg mx-auto my-8">
      <h2 className="text-2xl font-bold text-white mb-6 text-center">配色设置</h2>

      <div className="mb-6">
        <h3 className="text-xl font-semibold text-white mb-4">预设配色方案</h3>
        <div className="grid grid-cols-2 gap-4">
          {predefinedPalettes.map((palette) => (
            <button
              key={palette.name}
              onClick={() => handlePaletteSelect(palette)}
              className={`p-4 rounded-lg border-2 transition-all ${
                playerColor === palette.playerColor && opponentColor === palette.opponentColor && !isCustom
                  ? 'border-blue-500 ring-2 ring-blue-500'
                  : 'border-gray-600 hover:border-gray-400'
              } flex flex-col items-center`}
            >
              <span className="text-white text-sm font-medium mb-2">{palette.name}</span>
              <div className="flex space-x-2">
                <div className={`w-8 h-8 rounded-full bg-${palette.playerColor}-500 border border-white`}></div>
                <div className={`w-8 h-8 rounded-full bg-${palette.opponentColor}-500 border border-white`}></div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <h3 className="text-xl font-semibold text-white mb-4">自定义配色</h3>
        <div className="space-y-4">
          <div>
            <label htmlFor="playerColor" className="block text-white text-sm font-medium mb-2">
              我方颜色 ({customPlayerColor})
            </label>
            <input
              type="color"
              id="playerColor"
              value={customPlayerColor}
              onChange={(e) => { setCustomPlayerColor(e.target.value); setIsCustom(true); }}
              className="w-full h-10 rounded-md border border-gray-500 cursor-pointer"
            />
          </div>
          <div>
            <label htmlFor="opponentColor" className="block text-white text-sm font-medium mb-2">
              对手颜色 ({customOpponentColor})
            </label>
            <input
              type="color"
              id="opponentColor"
              value={customOpponentColor}
              onChange={(e) => { setCustomOpponentColor(e.target.value); setIsCustom(true); }}
              className="w-full h-10 rounded-md border border-gray-500 cursor-pointer"
            />
          </div>
          <button
            onClick={handleCustomSave}
            disabled={!isCustom}
            className={`w-full py-3 px-4 rounded font-semibold transition-colors ${
              isCustom
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gray-600 text-gray-300 cursor-not-allowed'
            }`}
          >
            保存自定义配色
          </button>
        </div>
      </div>
    </div>
  );
};

export default ColorSettings;
