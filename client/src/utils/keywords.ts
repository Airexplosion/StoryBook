import React from 'react';

// 关键字库 - 包含所有游戏关键字及其解释
export interface Keyword {
  keyword: string;
  explanation: string;
}

// 关键字列表及其解释
export const keywords: Keyword[] = [
  { keyword: '登场', explanation: '配角/主角从手中使用后会触发"登场"后标注的效果（满足需求就会强制触发，触发时配角牌/主角牌已经被使用，此时可以被指定）。' },
  { keyword: '遗愿', explanation: '配角/主角死亡时会触发"遗愿"后标注的效果（满足需求会强制触发，触发时配角牌/主角牌仍未死亡但已处于死亡结算中，此时无法被指定）。' },
  { keyword: '至终遗愿', explanation: '特殊的【遗愿】，永远无法失去，拥有此效果的角色即使被抹消也会如常触发此遗愿。' },
  { keyword: '护卫', explanation: '进行攻击时，敌方具有护卫的配角/主角必须被优先攻击，此时不能攻击不具有护卫的配角/主角。' },
  { keyword: '至高护卫', explanation: '特殊的【护卫】，永远无法无视和移除。' },
  { keyword: '急进', explanation: '配角/主角在当回合便可进行攻击。' },
  { keyword: '突转', explanation: '配角/主角在当回合便可进行攻击，但不能攻击敌方主角。' },
  { keyword: '章节化', explanation: '配角在进行一次章节化后，触发"章节化"后的效果。' },
  { keyword: '暗线', explanation: '配角/主角无法被攻击，具有暗线的配角/主角造成一次伤害后解除暗线效果。' },
  { keyword: '残响', explanation: '配角/主角0血以下不会死亡，但在当回合结束时若仍为0血以下，则立即死亡。' },
  { keyword: '唤醒X', explanation: 'X为唤醒时间。\n你的每个回合开始时，使你的所有角色的唤醒时间自然减少1，当唤醒时间为0时，触发对应的"唤醒X"后的效果，仅触发一次。' },
  { keyword: '连系', explanation: '配角/主角对敌方任一角色造成伤害后，为你的主角回复等数量的生命。' },
  { keyword: '推动', explanation: '每当你"进行X次推动"后，连续触发X次"推动"后的效果。' },
  { keyword: '充盈X', explanation: '当你的剩余支付费用不少于X时，这张牌的所需支付费用会增加至X并具有"充盈X"后的效果；"充盈X"时，费用增加或减少效果依然有效（不论触发先后）' },
  { keyword: '逆时', explanation: '比不具有逆时的配角在攻击时更早造成伤害。（与顺时同时存在时，攻击造成伤害的时点回归正常）' },
  { keyword: '狂进', explanation: '配角/主角在当回合便可进行攻击，但在当回合进行攻击后，便无法在之后的回合内进行攻击。' },
  { keyword: '支援', explanation: '具有支援的配角可以将自身效果和面板属性视为事件效果叠加在另一个具有支援的友方配角上（不作为事件或配角结算）。' },
  { keyword: '代偿X', explanation: '你累计受到X点伤害后，触发"代偿X"后的效果，仅触发一次。' },
  { keyword: '译制X', explanation: '从手中或牌堆中使用后，你在你的下个回合回复费用时减少回复X点费用。' },
  { keyword: '神迹', explanation: '抽到时，在当回合内始终存在"神迹"后的效果。' },
  { keyword: '传奇神迹', explanation: '抽到时，在整个对局内始终存在"传奇神迹"后的效果（重复抽取会叠加）。' },
  { keyword: '逸逃', explanation: '从手中使用此牌后，你可以丢弃若干张手牌并回复等量的费用。' },
  { keyword: '诱变', explanation: '如果你的故事中有攻击大于4的配角，则具有"诱变"后的效果（视为对本配角的光环效果）。' },
  { keyword: '花语X', explanation: '你累计回复X点生命（会计算超出上限的部分）后，触发"花语X"后的效果，仅触发一次。' },
  { keyword: '伏笔X', explanation: '在你的回合内该牌所需支付费用-N，N为你上回合余下的费用且至多为X。' },
  { keyword: '科研X', explanation: '你可以在你回合内的空余时间，支付X个科技指示物，并触发"科研X"后的效果，仅能触发一次。' },
  { keyword: '追放', explanation: '使用后，在自己的下个回合开始后才会作为配角站场（登场效果正常触发，解除此效果前会以配角牌形式而非配角形式占据配角位）。\n此效果持续期间称为【处于追放状态】。' },
  { keyword: '兵刃', explanation: '主动攻击时，无视目标的攻击。' },
  { keyword: '追忆', explanation: '在有事件牌被使用过的回合内，具有"追忆"后的效果。' },
  { keyword: '驱幻', explanation: '无法被敌方的故事牌指定。' },
  { keyword: '焰灼X', explanation: '控制者的回合结束时，失去X点生命和生命上限，因此死亡的配角改为抹消。' },
  { keyword: '淬毒', explanation: '此角色造成与受到的伤害翻倍。' },
  { keyword: '陷杀X', explanation: '对进入相对格的配角立即造成X点伤害（时机早于登场）' },
  { keyword: '古械', explanation: '自身减少生命时，同步减少等量的生命上限；自身不会失去关键字效果。' },
  { keyword: '刚力', explanation: '对配角造成的超额伤害可以转移至另一个配角上（转移造成的超额伤害不触发刚力）。' },
  { keyword: '柔劲', explanation: '对配角造成超额伤害时可以为一名友方其他角色回复该超额伤害数值的生命，若为配角则改为获得等量的生命加成。' },
  { keyword: '升华', explanation: '自身将因友方伤害或效果死亡时，防止此伤害或效果，并获得升华后的效果（仅触发一次）。' },
  { keyword: '双重升华', explanation: '自身将因友方伤害或效果死亡时，防止此伤害或效果，并获得双重升华后的效果（仅触发两次）。' },
  { keyword: '冰寒X', explanation: '控制者的回合结束时，减少X点基础攻击，若其基础攻击被减为0，则立即抹消。特殊地，冰寒X与焰灼X作用与同一配角时，其立即抹消。' },
  { keyword: '序言', explanation: '如果此牌是你本回合使用的第一张牌，则触发后续的效果。' },
  { keyword: '摇曳', explanation: '若你在本回合内使用的上一张牌与本牌的类别不同，则本牌具有摇曳后的效果。' },
  { keyword: '顺时', explanation: '比不具有顺时的配角在攻击时更晚造成伤害。（与逆时同时存在时，攻击造成伤害的时点回归正常）' },
  { keyword: '连击', explanation: '本配角进行攻击时，分别在逆时节点与正常节点各造成一次攻击伤害。' },
  { keyword: '剑气连击', explanation: '本配角进行攻击时，分别在逆时节点、正常节点与顺时节点各造成一次攻击伤害。' },
  { keyword: '斜刺X', explanation: '对进入斜对格的配角立即造成X点伤害（时机早于登场）。' },
  { keyword: '反击X', explanation: '此角色受到敌方角色的攻击后，若仍存活，则对伤害来源造成X点伤害（多个反击合并计算），此伤害不会触发反击。' },
  { keyword: '尖刺X', explanation: '此角色受到伤害后，无论是否存活，对伤害来源造成X点伤害（多个尖刺合并计算），而后失去此效果。' },
  { keyword: '狂想', explanation: '你的回合结束时，若此牌在你的手中，则你丢弃此牌。' },
  { keyword: '崩毁', explanation: '此角色造成一次伤害后，生命上限变为0。' },
  { keyword: '兵甲X', explanation: '此配角将进入故事中时，先获得X个兵甲指示物。' },
  { keyword: '牧生X', explanation: '此配角第一次进入配角格后，下一个进入同一配角格的配角获得+X/+X。（也可由效果直接指定一个配角格触发此后半段效果）' },
  { keyword: '潮离X', explanation: '此配角第一次离开配角格后，下一个进入相对配角格的配角获得-X/-X（也可由效果直接指定一个配角格，对其的相对配角格触发此后半段效果）。' },
  { keyword: '鲸落', explanation: '此角色死亡时，友方其他具有鲸落的角色触发各自鲸落后的效果。' },
  { keyword: '珠光X', explanation: '使用此牌时，如果双方故事中的角色具有的总关键字种类不少于X，则触发珠光后的效果（不计入此牌的关键字，配角牌触发时机等同于登场）。' },
  { keyword: '永劫', explanation: '如果你在本回合内使用过【命运劫难之轮】，则此牌具有永劫后的效果。' },
  { keyword: '幻彩', explanation: '当敌方主角使用了【极光的幻彩】后，触发后续效果，仅触发一次。' },
  { keyword: '永恒幻彩', explanation: '当敌方主角使用了【极光的幻彩】后，触发后续效果，无触发次数的限制。' },
  { keyword: '锁定X', explanation: '被锁定的角色无法进行攻击，于归属者的X个回合开始后，本关键字效果不再生效，这视为解锁（依然保留本关键字，如果锁定不再生效的那个回合内，角色没有突转、急进等类似效果，则角色在那个回合内无法进行攻击）。' },
  { keyword: '冲阵', explanation: '本角色进行攻击后，触发后续效果。' },
  { keyword: '忍袭', explanation: '当敌方一个配角将进行攻击时，触发后续效果，仅触发一次。' },
  { keyword: '五音', explanation: '使用本牌时，如果你本回合内已使用的牌数与敌方当前手牌数奇偶相同，则触发后续效果。' },
  { keyword: '梦迴', explanation: '本配角不会被异度奇点抹消、能正常进入异度奇点所在的配角格内，且处于异度奇点内时具有梦迴后的效果。' },
  { keyword: '抗争', explanation: '当你的生命小于敌方主角的生命时，本牌具有"抗争"后的效果。' },
  { keyword: '余晖', explanation: '你可以在支付此牌费用时，额外抹消一张手牌，若如此做，触发余晖后的效果。' },
  { keyword: '枯荣', explanation: '如果你在本回合内杀死过配角，则额外具有枯荣后的效果。' },
  { keyword: '绝志', explanation: '本角色受到的伤害减半（向下取整），但无法增加生命。' },
  { keyword: '继遗', explanation: '在本回合内，如果有友方角色的遗愿生效，则此牌具有继遗后的效果。' },
  { keyword: '开卷X', explanation: '你从手中使用此牌后，再从牌堆中使用一张基础支付费用不大于X的牌，无需支付其所需费用（多个开卷效果结算时，自行决定依次生效的顺序）。' },
  { keyword: '轮回', explanation: '当此配角将受到致命伤害时，立即将此配角洗回你的牌堆中。' },
  { keyword: '潜龙', explanation: '此配角进入故事后，立即进入无限时长的追放状态' },
  { keyword: '残核', explanation: '在配角因伤害而死亡后，将一个与其相同、基础攻击与基础生命为其一半（向下取整）、不具有残核的配角加入你的故事中。' },
  { keyword: '转折', explanation: '若此牌不是本回合内抽取到的，则后续效果持续生效。' },
  { keyword: '刻命X', explanation: '仅限配角牌，于登场效果时机内，你可以额外失去X点生命，若如此做，触发刻命后的效果。' },
  { keyword: '疫体', explanation: '不会获得指示物，不会被抹消，造成/受到的伤害无法被增加。' },
  { keyword: '代金X', explanation: '此牌使用后，使你手中一张所需支付费用最低的一张牌的所需支付费用+X。' },
  { keyword: '十诫', explanation: '使用此牌时，若双方主角在本次对局中丢弃牌数之和不小于10，则你在本次对局中的剩余时间内处于【诫言状态】。' },
  { keyword: '空视', explanation: '此角色不受事件牌效果的影响（仍会受到事件牌的伤害），受到一次攻击后失效。' },
  { keyword: '智律', explanation: '防止本角色受到的来自故事牌的伤害。' },
  { keyword: '沉梦', explanation: '与此角色相对的敌方配角攻击次数-1（允许正常攻击的效果不对攻击次数减少产生影响），若本角色是主角，则改为使其他每名主角攻击次数-1。' },
  { keyword: '稳定', explanation: '此角色无法被移动、不会流失生命且可以阻止撞击（若可以，则将撞击来源停留在左侧相邻的空置配角格内，否则将其加入你的手中）。' },
  { keyword: '返灵', explanation: '仅限故事牌，在你使用此牌时，如果你的灵力指示物不足7，则你获得1个灵力指示物，反之，此牌具有返灵后的效果。' },
  { keyword: '迅移', explanation: '你的每个回合结束时，你可以移动本配角至相邻且空置的配角格内，同一节点内只能执行一个配角的迅移效果。' },
  { keyword: '迂回', explanation: '你可以在本配角进行主动攻击时，停止此次攻击（此次攻击仍会消耗攻击次数）并移动本配角一次，而后对与本配角相对的配角造成等同于本配角当前攻击数值的伤害。' },
  { keyword: '隐文', explanation: '仅限事件牌，使用时仅声明本关键字效果，而后将该牌背面朝上置于隐文执行格内，在敌方主角的回合内满足条件时立即翻至正面并插入结算执行。' },
  { keyword: '接续', explanation: '若你在本回合内使用的上一张牌与本牌的类别（故事牌、配角牌）相同或你使用的上一张牌为主角牌，则本牌具有接续后的效果。' }
];

// 工具函数：格式化效果描述文本，支持关键字高亮和提示框
export interface TooltipState {
  isVisible: boolean;
  content: string;
  position: { x: number; y: number };
}

export const formatEffectText = (
  text: string, 
  setTooltip?: (tooltip: TooltipState) => void
): React.ReactNode[] => {
  if (!text) return ['暂无效果描述'];
  
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  
  // 遍历所有关键字，找到它们在文本中的位置
  const matches: Array<{ keyword: string; index: number; endIndex: number; explanation: string }> = [];
  keywords.forEach(keywordObj => {
    let index = text.indexOf(keywordObj.keyword);
    while (index !== -1) {
      matches.push({ 
        keyword: keywordObj.keyword, 
        index, 
        endIndex: index + keywordObj.keyword.length,
        explanation: keywordObj.explanation
      });
      index = text.indexOf(keywordObj.keyword, index + 1);
    }
  });
  
  // 按位置排序
  matches.sort((a, b) => a.index - b.index);
  
  // 处理重叠的关键字（取最长的）
  const filteredMatches = [];
  for (let i = 0; i < matches.length; i++) {
    const current = matches[i];
    let shouldAdd = true;
    
    for (let j = 0; j < filteredMatches.length; j++) {
      const existing = filteredMatches[j];
      // 检查是否重叠
      if (current.index < existing.endIndex && current.endIndex > existing.index) {
        // 如果当前关键字更长，替换现有的
        if (current.keyword.length > existing.keyword.length) {
          filteredMatches.splice(j, 1);
          j--;
        } else {
          shouldAdd = false;
          break;
        }
      }
    }
    
    if (shouldAdd) {
      filteredMatches.push(current);
    }
  }
  
  // 构建结果
  for (const match of filteredMatches) {
    // 添加匹配前的普通文本
    if (match.index > lastIndex) {
      parts.push(
        React.createElement('span', {
          key: `text-${lastIndex}`
        }, text.substring(lastIndex, match.index))
      );
    }
    
    // 添加斜体关键字
    if (setTooltip) {
      parts.push(
        React.createElement('span', {
          key: `italic-${match.index}`,
          style: { fontStyle: 'italic', fontWeight: 'bold', cursor: 'help' },
          onMouseEnter: (e: React.MouseEvent<HTMLSpanElement>) => {
            const rect = e.currentTarget.getBoundingClientRect();
            setTooltip({
              isVisible: true,
              content: match.explanation,
              position: { 
                x: rect.left + rect.width / 2, 
                y: rect.top - 10 
              }
            });
          },
          onMouseLeave: () => {
            setTooltip({
              isVisible: false,
              content: '',
              position: { x: 0, y: 0 }
            });
          }
        }, match.keyword)
      );
    } else {
      parts.push(
        React.createElement('span', {
          key: `italic-${match.index}`,
          style: { fontStyle: 'italic', fontWeight: 'bold' }
        }, match.keyword)
      );
    }
    
    lastIndex = match.endIndex;
  }
  
  // 添加剩余的普通文本
  if (lastIndex < text.length) {
    parts.push(
      React.createElement('span', {
        key: `text-${lastIndex}`
      }, text.substring(lastIndex))
    );
  }
  
  return parts;
};

// 工具函数：根据关键字名称获取解释
export const getKeywordExplanation = (keywordName: string): string => {
  const keyword = keywords.find(k => k.keyword === keywordName);
  return keyword ? keyword.explanation : '';
};

// 工具函数：检查文本中是否包含关键字
export const hasKeyword = (text: string, keywordName: string): boolean => {
  return text.includes(keywordName);
};

// 工具函数：获取所有关键字名称
export const getAllKeywordNames = (): string[] => {
  return keywords.map(k => k.keyword);
};
