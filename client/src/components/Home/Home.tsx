import React from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';

const Home: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);

  return (
    <div className="min-h-screen">
      <div className="text-center py-20">
        <h1 className="text-6xl font-bold text-white mb-8">
          欢迎来到故事书对战平台
        </h1>
        <p className="text-xl text-gray-300 mb-12 max-w-2xl mx-auto">
          体验刺激的故事书对战，建造你的专属卡组，与其他玩家展开激烈对决！
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <Link
            to="/cards"
            className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-8 hover:bg-opacity-20 transition-all duration-300 transform hover:scale-105"
          >
            <div className="text-4xl mb-4">🃏</div>
            <h3 className="text-2xl font-bold text-white mb-4">卡牌集</h3>
            <p className="text-gray-300">
              浏览和创建各种类型的卡牌，包括故事牌、配角牌和主角牌
            </p>
          </Link>

          <Link
            to="/decks"
            className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-8 hover:bg-opacity-20 transition-all duration-300 transform hover:scale-105"
          >
            <div className="text-4xl mb-4">📚</div>
            <h3 className="text-2xl font-bold text-white mb-4">卡组构建</h3>
            <p className="text-gray-300">
              从卡牌集中选择40张卡牌，构建你的专属卡组
            </p>
          </Link>

          <Link
            to="/rooms"
            className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-8 hover:bg-opacity-20 transition-all duration-300 transform hover:scale-105"
          >
            <div className="text-4xl mb-4">⚔️</div>
            <h3 className="text-2xl font-bold text-white mb-4">对战房间</h3>
            <p className="text-gray-300">
              创建或加入房间，与其他玩家进行实时对战
            </p>
          </Link>
        </div>

        <div className="mt-16 bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-8 max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-6">游戏规则简介</h2>
          <div className="text-left text-gray-300 space-y-4">
            <p>• <strong className="text-white">故事牌：</strong>包含事件和背景，消耗费用后产生各种效果</p>
            <p>• <strong className="text-white">配角牌：</strong>拥有攻击力和生命值的战斗单位</p>
            <p>• <strong className="text-white">主角牌：</strong>为你的主角提供持续性增益效果</p>
            <p>• <strong className="text-white">回合制对战：</strong>玩家轮流进行操作，通过策略取得胜利</p>
            <p>• <strong className="text-white">卡组构建：</strong>每个卡组包含40张卡牌，同名卡牌最多3张</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
