// 颜色映射工具函数
export const getColorClasses = (colorName: string) => {
  const colorMaps: { [key: string]: { [key: string]: string } } = {
    red: {
      bg: 'bg-red-600',
      bgOpacity: 'bg-red-600 bg-opacity-20',
      bgOpacityHigh: 'bg-red-800 bg-opacity-30',
      border: 'border-red-500',
      borderDashed: 'border-red-600 border-dashed',
      text: 'text-red-300',
      textSecondary: 'text-red-400',
      textTertiary: 'text-red-500',
      cardBg: 'bg-red-600 bg-opacity-70',
      cardBorder: 'border-red-400',
      avatar: 'bg-red-600',
      mana: 'bg-red-500',
      stats: 'bg-red-700 bg-opacity-50'
    },
    yellow: {
      bg: 'bg-yellow-600',
      bgOpacity: 'bg-yellow-600 bg-opacity-20',
      bgOpacityHigh: 'bg-yellow-800 bg-opacity-30',
      border: 'border-yellow-500',
      borderDashed: 'border-yellow-600 border-dashed',
      text: 'text-yellow-300',
      textSecondary: 'text-yellow-400',
      textTertiary: 'text-yellow-500',
      cardBg: 'bg-yellow-600 bg-opacity-70',
      cardBorder: 'border-yellow-400',
      avatar: 'bg-yellow-600',
      mana: 'bg-yellow-500',
      stats: 'bg-yellow-700 bg-opacity-50'
    },
    blue: {
      bg: 'bg-blue-600',
      bgOpacity: 'bg-blue-600 bg-opacity-20',
      bgOpacityHigh: 'bg-blue-800 bg-opacity-30',
      border: 'border-blue-500',
      borderDashed: 'border-blue-600 border-dashed',
      text: 'text-blue-300',
      textSecondary: 'text-blue-400',
      textTertiary: 'text-blue-500',
      cardBg: 'bg-blue-600 bg-opacity-70',
      cardBorder: 'border-blue-400',
      avatar: 'bg-blue-600',
      mana: 'bg-blue-500',
      stats: 'bg-blue-700 bg-opacity-50'
    },
    green: {
      bg: 'bg-green-600',
      bgOpacity: 'bg-green-600 bg-opacity-20',
      bgOpacityHigh: 'bg-green-800 bg-opacity-30',
      border: 'border-green-500',
      borderDashed: 'border-green-600 border-dashed',
      text: 'text-green-300',
      textSecondary: 'text-green-400',
      textTertiary: 'text-green-500',
      cardBg: 'bg-green-600 bg-opacity-70',
      cardBorder: 'border-green-400',
      avatar: 'bg-green-600',
      mana: 'bg-green-500',
      stats: 'bg-green-700 bg-opacity-50'
    },
    orange: {
      bg: 'bg-orange-600',
      bgOpacity: 'bg-orange-600 bg-opacity-20',
      bgOpacityHigh: 'bg-orange-800 bg-opacity-30',
      border: 'border-orange-500',
      borderDashed: 'border-orange-600 border-dashed',
      text: 'text-orange-300',
      textSecondary: 'text-orange-400',
      textTertiary: 'text-orange-500',
      cardBg: 'bg-orange-600 bg-opacity-70',
      cardBorder: 'border-orange-400',
      avatar: 'bg-orange-600',
      mana: 'bg-orange-500',
      stats: 'bg-orange-700 bg-opacity-50'
    },
    gray: {
      bg: 'bg-gray-600',
      bgOpacity: 'bg-gray-600 bg-opacity-20',
      bgOpacityHigh: 'bg-gray-800 bg-opacity-30',
      border: 'border-gray-500',
      borderDashed: 'border-gray-600 border-dashed',
      text: 'text-gray-300',
      textSecondary: 'text-gray-400',
      textTertiary: 'text-gray-500',
      cardBg: 'bg-gray-600 bg-opacity-70',
      cardBorder: 'border-gray-400',
      avatar: 'bg-gray-600',
      mana: 'bg-gray-500',
      stats: 'bg-gray-700 bg-opacity-50'
    },
    white: {
      bg: 'bg-white',
      bgOpacity: 'bg-white bg-opacity-20',
      bgOpacityHigh: 'bg-gray-100 bg-opacity-30',
      border: 'border-white',
      borderDashed: 'border-gray-200 border-dashed',
      text: 'text-white',
      textSecondary: 'text-gray-200',
      textTertiary: 'text-gray-300',
      cardBg: 'bg-white bg-opacity-70',
      cardBorder: 'border-gray-200',
      avatar: 'bg-white',
      mana: 'bg-gray-200',
      stats: 'bg-gray-200 bg-opacity-50'
    },
    black: {
      bg: 'bg-black',
      bgOpacity: 'bg-black bg-opacity-20',
      bgOpacityHigh: 'bg-gray-900 bg-opacity-30',
      border: 'border-black',
      borderDashed: 'border-gray-800 border-dashed',
      text: 'text-gray-200',
      textSecondary: 'text-gray-300',
      textTertiary: 'text-gray-400',
      cardBg: 'bg-black bg-opacity-70',
      cardBorder: 'border-gray-700',
      avatar: 'bg-black',
      mana: 'bg-gray-800',
      stats: 'bg-gray-800 bg-opacity-50'
    },
    purple: {
      bg: 'bg-purple-600',
      bgOpacity: 'bg-purple-600 bg-opacity-20',
      bgOpacityHigh: 'bg-purple-800 bg-opacity-30',
      border: 'border-purple-500',
      borderDashed: 'border-purple-600 border-dashed',
      text: 'text-purple-300',
      textSecondary: 'text-purple-400',
      textTertiary: 'text-purple-500',
      cardBg: 'bg-purple-600 bg-opacity-70',
      cardBorder: 'border-purple-400',
      avatar: 'bg-purple-600',
      mana: 'bg-purple-500',
      stats: 'bg-purple-700 bg-opacity-50'
    },
    pink: {
      bg: 'bg-pink-600',
      bgOpacity: 'bg-pink-600 bg-opacity-20',
      bgOpacityHigh: 'bg-pink-800 bg-opacity-30',
      border: 'border-pink-500',
      borderDashed: 'border-pink-600 border-dashed',
      text: 'text-pink-300',
      textSecondary: 'text-pink-400',
      textTertiary: 'text-pink-500',
      cardBg: 'bg-pink-600 bg-opacity-70',
      cardBorder: 'border-pink-400',
      avatar: 'bg-pink-600',
      mana: 'bg-pink-500',
      stats: 'bg-pink-700 bg-opacity-50'
    }
  };

  // 如果是自定义颜色（十六进制），返回内联样式对象
  if (colorName.startsWith('#')) {
    return {
      bg: '',
      bgOpacity: '',
      bgOpacityHigh: '',
      border: '',
      borderDashed: '',
      text: '',
      textSecondary: '',
      textTertiary: '',
      cardBg: '',
      cardBorder: '',
      avatar: '',
      mana: '',
      stats: '',
      customStyle: {
        backgroundColor: colorName + '33', // 20% opacity
        borderColor: colorName,
        color: colorName
      },
      customStyleFull: {
        backgroundColor: colorName
      }
    };
  }

  return colorMaps[colorName] || colorMaps.blue; // 默认返回蓝色
};

// 辅助函数：生成动态类名字符串
export const getDynamicClassName = (baseClasses: string, colorClasses: string, customStyle?: any) => {
  if (customStyle) {
    return baseClasses;
  }
  return `${baseClasses} ${colorClasses}`;
};
