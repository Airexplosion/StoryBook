import React, { useState } from 'react';
import { keywords, Keyword } from '../../utils/keywords';

// 解析markdown格式的加粗文本
const parseMarkdown = (text: string): React.ReactNode[] => {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  
  // 匹配 **text** 格式的加粗文本
  const boldRegex = /\*\*(.*?)\*\*/g;
  let match;
  
  while ((match = boldRegex.exec(text)) !== null) {
    // 添加匹配前的普通文本
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    
    // 添加加粗文本
    parts.push(
      <strong key={match.index} style={{ fontWeight: 'bold', color: '#C2B79C' }}>
        {match[1]}
      </strong>
    );
    
    lastIndex = match.index + match[0].length;
  }
  
  // 添加剩余的普通文本
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }
  
  return parts;
};

// 渲染支持markdown的文本
const MarkdownText: React.FC<{ children: string }> = ({ children }) => {
  return <>{parseMarkdown(children)}</>;
};

const RuleBook: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'rules' | 'keywords'>('rules');
  const [keywordSearch, setKeywordSearch] = useState('');
  const [selectedKeyword, setSelectedKeyword] = useState<Keyword | null>(null);

  // 筛选关键字
  const filteredKeywords = keywords.filter(keyword =>
    keyword.keyword.toLowerCase().includes(keywordSearch.toLowerCase()) ||
    keyword.explanation.toLowerCase().includes(keywordSearch.toLowerCase())
  );

  // 规则集内容（从官方文档提取）
  const ruleContent = {
    title: "《异域故事书》规则集",
    introduction: {
      title: "背景介绍",
      content: `坐在温暖的图书馆里，不妨打开一本书来看看吧。
你会喜欢怎样的故事呢？

跟随每一本书中的主角，阅读他们的命运。
然后，运用他们的力量，来推动故事的发展。
你可以为他们选择截然不同的轨迹，即使他们的故事书早已透露结局。

你也可以与其他的阅读者"交流"。
当然，是要以故事中的主角们来作为比拼的中心。
由一张张卡片汇聚而成的剧情牌堆，究竟是谁能得到最后的"胜利"？

欢迎开启只属于你的——《异域故事书》`
    },
    sections: [
      {
        title: "1. 游戏准备",
        subsections: [
          {
            title: "① 选择一位主角",
            content: "从游戏内提供的诸多主角中选择自己中意的一位，来进行之后的每一步操作。挑选主角时，每位主角都有着一个\"特质\"，这个初始特质将会影响每个主角后续的选择思路，还请留心。"
          },
          {
            title: "② 构筑卡组",
            content: "从你选择的主角的专属牌与中立牌中挑选40张牌组成自己独一无二的卡组。"
          }
        ]
      },
      {
        title: "2. 卡牌类型",
        subsections: [
          {
            title: "故事牌",
            content: `故事牌的卡面由以下几个部分构成：

• **基础支付费用** - 你使用这张牌所需支付的基础费用（*表示无法直接使用，通过其他效果自动使用且此时无需支付费用）
• **名称** - 这张牌叫什么；卡组中，同名故事牌的携带上限为3
• **类别** - 目前有"事件"与"背景"；"事件"需要支付费用主动使用，"背景"在加入手中时自动使用
• **效果** - 这张牌使用后有什么用
• **配文** - 一段与这张牌有关的文字`
          },
          {
            title: "配角牌",
            content: `配角牌的卡面由以下几个部分构成：

• **基础支付费用** - 你使用这张牌所需支付的基础费用
• **名称** - 这张牌叫什么；卡组中，同名配角牌的携带上限为3
• **类别** - 只有"配角"这一类别；"配角"在进入故事后才会成为实体单位，进入故事后的配角在当回合一般不能进行攻击
• **效果** - 这张牌有什么效果
• **X/Y** - X为基础攻击，Y为基础生命和基础生命上限。特别地，X为0的配角不能进行攻击，当生命或生命上限达到0以下时，配角死亡
• **配文** - 一段与这张牌有关的文字`
          },
          {
            title: "主角牌",
            content: `主角牌的卡面由以下几个部分构成：

• **基础支付费用** - 你使用这张牌所需支付的基础费用
• **名称** - 这张牌叫什么；卡组中，主角牌的携带上限为1
• **类别** - 只有"主角"这一类别；"主角"在使用后会使你的主角获得牌面上的效果（这些效果一般可以进行叠加）
• **效果** - 这张牌有什么效果

**主角牌效果类型：**
- 回复X点生命：你回复X点生命
- 失去X点生命：你减少X点生命，这不视为受到伤害
- +X生命上限：你增加X点生命上限
- -X生命上限：你减少X点生命上限
- +X攻击：你增加X点攻击
- +X手牌上限：你增加X张手牌上限

*注意：当你将获得与某张主角牌相同的牌时，如果其未声明可以获得额外的相同主角牌，则你改为获得一张名为"推进章节"的牌。`
          }
        ]
      },
      {
        title: "3. 游戏流程",
        subsections: [
          {
            title: "1. 决定先后手",
            content: `随机决定先后手，然后按照以下配置分配初始资源：

**先手：** 抽取三张牌，将主角基础生命与基础生命上限设置为25，初始支付费用上限为0。
**后手：** 获得1点章节进度，抽取四张牌，将主角基础生命与基础生命上限设置为25，初始支付费用上限为0。`
          },
          {
            title: "2. 调度",
            content: "双方玩家选择手中的任意张牌，扣置于桌面，而后抽取等量的牌，再将自己扣置的牌返回牌堆中。"
          },
          {
            title: "3. 进行回合",
            content: `依照先后手顺序执行，在每个回合开始后：

1. 当前回合玩家增加1点支付费用上限与1点章节进度
2. 章节进度达到3时，清零并获得1个章节指示物（上限为3）
3. 回复所有支付费用
4. 玩家从牌堆顶部抽取一张牌，并开始进行回合

**回合中可以进行的操作：**
- 使用故事牌
- 使用配角牌  
- 使用主角牌
- 用自己故事中的配角牌对敌方故事中的配角牌或主角牌进行攻击

在没有其他操作时，当前回合玩家结束回合，进入到下一个顺位玩家的回合，如此往复。`
          },
          {
            title: "4. 章节化",
            content: `玩家还可以在自己的每个回合内使用"章节化"，具体流程如下：

1. 移除自己的一个章节指示物
2. 选择自己的一个没有进行过"章节化"的配角
3. 从以下三项中选择不同的两项：
   - ① +1/+1
   - ② 主角具有的特色选项
   - ③ 突转
4. "章节化"完成

*每个配角一般只能进行一次章节化`
          }
        ]
      },
      {
        title: "4. 特殊规则",
        subsections: [
          {
            title: "状态系统",
            content: "每个主角同一时间只能进入一个状态，后进入的状态会使得前进入的状态被移除。一般而言，状态会以【XX状态】的形式命名。"
          },
          {
            title: "章节化特色选项",
            content: "随机展示接待层中的三张书页，你将其中的一张加入手中（异想体书页自动使用且使用后自动抹消）。"
          }
        ]
      },
      {
        title: "5. 胜利条件",
        content: `结束对局的几个情况：

1. **主角死亡** - 一方主角生命达到0血以下而死亡或因特殊效果而死亡，另一方获得本次对局的胜利
2. **牌库耗尽** - 一方抽取完自己的牌堆，但还将继续抽取下一张"死神牌"，则抽取"死亡牌"的瞬间，另一方获得本次对局的胜利
3. **特殊效果** - 其他特殊效果达成，按照特殊效果结算胜利方（如一方无法正常进行回合，则另一方达成规则特殊胜利）`
      }
    ]
  };

  return (
    <div className="min-h-screen relative">

      
      <div className="max-w-6xl mx-auto px-6 py-8 relative z-10">
        {/* 页面标题 */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-regular mb-4" style={{ color: '#FBFBFB', fontFamily: 'HYAoDeSaiJ, sans-serif' }}>
            规则书
          </h1>
          <div className="flex items-center justify-center">
            <div className="flex-1 h-px" style={{ backgroundColor: '#C2B79C' }}></div>
            <div className="flex items-center px-6">
              {/* 左边小星星 */}
              <svg width="16" height="18" viewBox="0 0 9.27 10.17" className="mx-2">
                <path fill="#C2B79C" d="M0,5.29c1.52.02,3.22.12,3.38.17.36.1.63.3.79.62s.24.79.24,1.44l.02,2.66h.39s-.02-2.66-.02-2.66c0-.88.14-1.46.45-1.77.32-.3,2.99-.48,4.02-.49v-.41c-1.03,0-3.7-.11-4.03-.41-.32-.3-.48-.89-.48-1.77l-.02-2.65h-.39s.02,2.66.02,2.66c0,.88-.14,1.48-.45,1.78-.15.15-2.12.37-3.91.44"/>
              </svg>
              {/* 中间大星星 */}
              <svg width="24" height="26" viewBox="0 0 9.27 10.17" className="mx-2">
                <path fill="#C2B79C" d="M0,5.29c1.52.02,3.22.12,3.38.17.36.1.63.3.79.62s.24.79.24,1.44l.02,2.66h.39s-.02-2.66-.02-2.66c0-.88.14-1.46.45-1.77.32-.3,2.99-.48,4.02-.49v-.41c-1.03,0-3.7-.11-4.03-.41-.32-.3-.48-.89-.48-1.77l-.02-2.65h-.39s.02,2.66.02,2.66c0-.88-.14,1.48-.45,1.78-.15.15-2.12.37-3.91.44"/>
              </svg>
              {/* 右边小星星 */}
              <svg width="16" height="18" viewBox="0 0 9.27 10.17" className="mx-2">
                <path fill="#C2B79C" d="M0,5.29c1.52.02,3.22.12,3.38.17.36.1.63.3.79.62s.24.79.24,1.44l.02,2.66h.39s-.02-2.66-.02-2.66c0-.88.14-1.46.45-1.77.32-.3,2.99-.48,4.02-.49v-.41c-1.03,0-3.7-.11-4.03-.41-.32-.3-.48-.89-.48-1.77l-.02-2.65h-.39s.02,2.66.02,2.66c0-.88-.14,1.48-.45,1.78-.15.15-2.12.37-3.91.44"/>
              </svg>
            </div>
            <div className="flex-1 h-px" style={{ backgroundColor: '#C2B79C' }}></div>
          </div>
        </div>

        {/* 标签页导航 */}
        <div className="flex justify-center mb-8">
          <div className="flex rounded-lg overflow-hidden border border-opacity-20 border-white">
            <button
              onClick={() => setActiveTab('rules')}
              className={`px-8 py-3 font-medium transition-all duration-300 ${
                activeTab === 'rules'
                  ? 'bg-[#C2B79C] text-[#3F3832]'
                  : 'bg-transparent text-[#AEAEAE] hover:bg-[#C2B79C] hover:bg-opacity-20'
              }`}
              style={{ fontFamily: 'QingNiaoHuaGuangYaoTi, sans-serif' }}
            >
              游戏规则
            </button>
            <button
              onClick={() => setActiveTab('keywords')}
              className={`px-8 py-3 font-medium transition-all duration-300 ${
                activeTab === 'keywords'
                  ? 'bg-[#C2B79C] text-[#3F3832]'
                  : 'bg-transparent text-[#AEAEAE] hover:bg-[#C2B79C] hover:bg-opacity-20'
              }`}
              style={{ fontFamily: 'QingNiaoHuaGuangYaoTi, sans-serif' }}
            >
              关键字大全
            </button>
          </div>
        </div>

        {/* 游戏规则内容 */}
        {activeTab === 'rules' && (
          <div className="max-w-4xl mx-auto">
            <div className="rounded-lg p-8 backdrop-blur-md border border-opacity-20 border-white shadow-2xl" style={{
              background: 'linear-gradient(135deg, rgba(145, 130, 115, 0.3) 0%, rgba(63, 56, 50, 0.4) 50%, rgba(145, 130, 115, 0.3) 100%)',
              backdropFilter: 'blur(12px)',
              boxShadow: 'inset 0 0 50px rgba(194, 183, 156, 0.1), 0 10px 30px rgba(0,0,0,0.3)',
              position: 'relative',
              overflow: 'hidden'
                          }}>
                {/* 噪点纹理层 */}
                <div 
                  className="absolute inset-0 opacity-30"
                  style={{
                    backgroundImage: `
                      radial-gradient(circle at 1px 1px, rgba(194, 183, 156, 0.15) 1px, transparent 0),
                      radial-gradient(circle at 3px 5px, rgba(194, 183, 156, 0.1) 1px, transparent 0),
                      radial-gradient(circle at 7px 2px, rgba(194, 183, 156, 0.08) 1px, transparent 0),
                      radial-gradient(circle at 11px 9px, rgba(194, 183, 156, 0.12) 1px, transparent 0)
                    `,
                    backgroundSize: '15px 15px, 20px 20px, 25px 25px, 30px 30px',
                    backgroundPosition: '0 0, 5px 5px, 10px 10px, 15px 15px',
                    pointerEvents: 'none'
                  }}
                />
                
                <div className="relative z-10">
                  <h2 className="text-3xl font-bold text-center mb-8" style={{ color: '#C2B79C', fontFamily: 'QingNiaoHuaGuangYaoTi, sans-serif' }}>
                    {ruleContent.title}
                  </h2>
              
              {/* 背景介绍 */}
              <div className="mb-10">
                <div className="text-center mb-4">
                  <h3 className="text-2xl font-semibold" style={{ color: '#FBFBFB', fontFamily: 'QingNiaoHuaGuangYaoTi, sans-serif' }}>
                    {ruleContent.introduction.title}
                  </h3>
                </div>
                <div className="w-16 h-px bg-[#C2B79C] opacity-60 mb-6 mx-auto"></div>
                <div className="leading-relaxed whitespace-pre-line text-center italic" style={{ 
                  color: '#AEAEAE', 
                  lineHeight: '1.8', 
                  fontSize: '1.1em',
                  fontFamily: 'KaiTi, "楷体", serif, "Times New Roman"'
                }}>
                  {ruleContent.introduction.content}
                </div>
              </div>
              
              <div className="space-y-10">
                {ruleContent.sections.map((section, index) => (
                  <div key={index} className="space-y-6">
                    <h3 className="text-2xl font-semibold" style={{ color: '#FBFBFB', fontFamily: 'QingNiaoHuaGuangYaoTi, sans-serif' }}>
                      {section.title}
                    </h3>
                    <div className="w-16 h-px bg-[#C2B79C] opacity-60"></div>
                    
                    {section.subsections ? (
                      // 有子章节的情况
                      <div className="space-y-6">
                        {section.subsections.map((subsection, subIndex) => (
                                                     <div key={subIndex} className="ml-4">
                             <h4 className="text-xl font-medium mb-3" style={{ color: '#C2B79C', fontFamily: 'QingNiaoHuaGuangYaoTi, sans-serif' }}>
                               {subsection.title}
                             </h4>
                             <div className="leading-relaxed whitespace-pre-line ml-2" style={{ color: '#AEAEAE', lineHeight: '1.8' }}>
                               <MarkdownText>{subsection.content}</MarkdownText>
                             </div>
                           </div>
                        ))}
                      </div>
                    ) : (
                      // 没有子章节的情况
                      section.content && (
                        <div className="leading-relaxed whitespace-pre-line" style={{ color: '#AEAEAE', lineHeight: '1.8' }}>
                          <MarkdownText>{section.content}</MarkdownText>
                        </div>
                      )
                    )}
                  </div>
                ))}
              </div>
                </div>
            </div>
          </div>
        )}

        {/* 关键字大全内容 */}
        {activeTab === 'keywords' && (
          <div>
            {/* 搜索栏 */}
            <div className="max-w-2xl mx-auto mb-8">
              <div className="relative">
                <input
                  type="text"
                  placeholder="搜索关键字或效果描述..."
                  value={keywordSearch}
                  onChange={(e) => setKeywordSearch(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-opacity-30 text-white placeholder-gray-400 focus:outline-none focus:border-opacity-60 transition-all duration-300"
                  style={{
                    borderColor: 'rgba(194, 183, 156, 0.3)',
                    fontFamily: 'QingNiaoHuaGuangYaoTi, sans-serif',
                    background: 'linear-gradient(135deg, rgba(145, 130, 115, 0.2) 0%, rgba(63, 56, 50, 0.25) 50%, rgba(145, 130, 115, 0.2) 100%)',
                    backdropFilter: 'blur(8px)',
                    boxShadow: 'inset 0 0 15px rgba(194, 183, 156, 0.08)'
                  }}
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <svg className="w-5 h-5 text-[#AEAEAE]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
              <div className="text-sm mt-2 text-center" style={{ color: '#AEAEAE' }}>
                共找到 {filteredKeywords.length} 个关键字
              </div>
            </div>

            {/* 关键字列表 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredKeywords.map((keyword, index) => (
                                <div
                  key={index}
                  className="rounded-lg p-6 backdrop-blur-md border border-opacity-20 border-white hover:border-opacity-40 transition-all duration-300 cursor-pointer relative overflow-hidden"
                  style={{
                    background: 'linear-gradient(135deg, rgba(145, 130, 115, 0.25) 0%, rgba(63, 56, 50, 0.35) 50%, rgba(145, 130, 115, 0.25) 100%)',
                    backdropFilter: 'blur(8px)',
                    boxShadow: 'inset 0 0 20px rgba(194, 183, 156, 0.08), 0 4px 15px rgba(0,0,0,0.2)'
                  }}
                  onClick={() => setSelectedKeyword(keyword)}
                >
                    {/* 噪点纹理层 */}
                    <div 
                      className="absolute inset-0 opacity-20 pointer-events-none"
                      style={{
                        backgroundImage: `
                          radial-gradient(circle at 2px 1px, rgba(194, 183, 156, 0.1) 1px, transparent 0),
                          radial-gradient(circle at 5px 7px, rgba(194, 183, 156, 0.08) 1px, transparent 0),
                          radial-gradient(circle at 9px 3px, rgba(194, 183, 156, 0.06) 1px, transparent 0)
                        `,
                        backgroundSize: '12px 12px, 16px 16px, 20px 20px',
                        backgroundPosition: '0 0, 3px 3px, 6px 6px'
                      }}
                    />
                    
                    <div className="relative z-10">
                      <h3 className="text-xl font-bold mb-3" style={{ color: '#C2B79C', fontFamily: 'QingNiaoHuaGuangYaoTi, sans-serif' }}>
                        {keyword.keyword}
                      </h3>
                      <p className="leading-relaxed line-clamp-3" style={{ color: '#AEAEAE' }}>
                        {keyword.explanation}
                      </p>
                      <div className="mt-4 text-sm" style={{ color: '#4F6A8D' }}>
                        点击查看详情 →
                      </div>
                    </div>
                  </div>
              ))}
            </div>

            {filteredKeywords.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 opacity-50">
                  <svg className="w-full h-full text-[#AEAEAE]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.467-.881-6.072-2.325m-.208.208a8 8 0 1111.04-11.04c.193.192.37.396.534.612M5.64 5.64a7.963 7.963 0 012.72-2.088" />
                  </svg>
                </div>
                <p style={{ color: '#AEAEAE' }}>没有找到匹配的关键字</p>
              </div>
            )}
          </div>
        )}

        {/* 关键字详情弹窗 */}
        {selectedKeyword && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
            <div className="rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto border border-opacity-30 border-white relative" style={{
              backgroundColor: '#3F3832',
              background: 'linear-gradient(135deg, rgba(145, 130, 115, 0.4) 0%, rgba(63, 56, 50, 0.6) 50%, rgba(145, 130, 115, 0.4) 100%)',
              backdropFilter: 'blur(15px)',
              boxShadow: 'inset 0 0 30px rgba(194, 183, 156, 0.15), 0 20px 40px rgba(0,0,0,0.4)',
              overflow: 'hidden'
                          }}>
                {/* 噪点纹理层 */}
                <div 
                  className="absolute inset-0 opacity-25"
                  style={{
                    backgroundImage: `
                      radial-gradient(circle at 1px 2px, rgba(194, 183, 156, 0.12) 1px, transparent 0),
                      radial-gradient(circle at 4px 6px, rgba(194, 183, 156, 0.09) 1px, transparent 0),
                      radial-gradient(circle at 8px 1px, rgba(194, 183, 156, 0.07) 1px, transparent 0),
                      radial-gradient(circle at 12px 8px, rgba(194, 183, 156, 0.1) 1px, transparent 0)
                    `,
                    backgroundSize: '16px 16px, 22px 22px, 28px 28px, 34px 34px',
                    backgroundPosition: '0 0, 6px 6px, 12px 12px, 18px 18px',
                    pointerEvents: 'none'
                  }}
                />
                
                <div className="p-6 relative z-10">
                  <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold" style={{ color: '#C2B79C', fontFamily: 'QingNiaoHuaGuangYaoTi, sans-serif' }}>
                    {selectedKeyword.keyword}
                  </h2>
                  <button
                    onClick={() => setSelectedKeyword(null)}
                    className="text-[#AEAEAE] hover:text-[#FBFBFB] transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="w-16 h-px bg-[#C2B79C] opacity-60 mb-6"></div>
                <div className="leading-relaxed whitespace-pre-line" style={{ color: '#AEAEAE', lineHeight: '1.8' }}>
                  {selectedKeyword.explanation}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* 官方信息 */}
      <div className="text-center py-4 mt-8">
        <div className="text-sm italic" style={{ color: '#AEAEAE' }}>
          故事书官方QQ群：1059031473 &nbsp;&nbsp;&nbsp; 故事书官方OOPZ：
          <a 
            href="https://oopz.cn/i/L3xunQ" 
            target="_blank" 
            rel="noopener noreferrer"
            className="underline hover:opacity-80 transition-opacity italic"
            style={{ color: '#C2B79C' }}
          >
            @https://oopz.cn/i/L3xunQ
          </a>
        </div>
      </div>
    </div>
  );
};

export default RuleBook; 