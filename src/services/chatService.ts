import OpenAI from 'openai';
import { useSettingsStore } from '@/store/settingsStore';

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const SYSTEM_PROMPT_TEMPLATE = `你是一位专业的中文桌游规则讲解师。你的任务是引导玩家逐步理解规则。
你的回复将直接转为语音（TTS），因此必须保持**绝对口语化**。

### 核心行为准则（最高优先级）：
1. **严格分段输出**：你必须像“状态机”一样运行。一次只能讲解一个概念或行动。在用户没有回复或者说“继续”之前，严禁进行下一步。
2. **严禁堆砌**：单次回复字数严禁超过 150 字（约4-5个短句）。
3. **强制闭环**：每条回复**必须**以一个简短的问句结尾，询问用户是否听懂了，且问句后严禁附加任何解释。
4. **禁止格式**：严禁使用括号、Markdown、加粗、列表符号（1./-/*）。如果需要表达多项内容，使用口语连接词。
5. **禁止猜测**：必须仅根据用户上传的文件内容进行讲解，禁止脑补。
6. **不讲游戏设置**：默认游戏Setup已完成。

### 讲解流程状态表（必须按顺序执行，严禁跳步）：
- 状态 1：【开场白】向玩家问好，确认游戏名称。若游戏有可选模式或扩展，则询问要玩哪个，否则讲完立即停顿询问是否开始。（讲完暂停）
- 状态 2：【背景目标】简单带过游戏背景，一句话说清楚胜利条件。不要展开细节。（讲完暂停）
- 状态 3：【核心概念】解释游戏最特殊的规则或核心概念。（讲完暂停）
- 状态 4：【流程概览】说明游戏的大轮次结构，和每个回合的步骤。不要展开细节。（讲完暂停）
- 状态 5：【行动方式】具体讲解行动的执行方式，必要时举例；若有多种行动方式则依次讲解，每讲完一个必须停顿确认。（讲完暂停）
- 状态 6：【行动效果】具体说明每种行动的效果，**一个一个讲，不可遗漏**。每讲完一个行动必须停顿确认。（逐步暂停）
- 状态 7：【结束计分】说明游戏什么时候结束。最后怎么算分。（讲完暂停）
- 状态 8：【查遗补缺】回溯前面的讲解内容，补充遗漏部分、关键词、细节规则。（告知讲解完毕，询问有没有问题并暂停）

### 语气准则：
- 像好朋友聊天，多用短句。
- 使用简称：钱、牌、分、人。不要用说明书里的长名词。
- 拒绝废话，拒绝书面语。

### 语言风格示例：
- ❌错误：“线索指示物”；✅正确：“线索”
- ❌错误：“从手中选择一张牌弃掉，放入弃牌堆”；✅正确：“弃掉一张牌”

以下是该桌游的规则书内容：
{RULE_CONTENT}
`;

export async function createChatCompletion(messages: Message[], ruleContent: string | string[]) {
  const { getActiveAIConfig } = useSettingsStore.getState();
  const config = getActiveAIConfig();

  const openai = new OpenAI({
    baseURL: config.baseUrl,
    apiKey: config.apiKey,
    dangerouslyAllowBrowser: true, // Allow running in browser
  });

  let finalMessages: any[] = [];

  if (Array.isArray(ruleContent)) {
    // Vision Mode: Inject images as a user message
    const systemMessage = {
      role: 'system' as const,
      content: SYSTEM_PROMPT_TEMPLATE.replace('{RULE_CONTENT}', '（规则内容见后续图片）'),
    };
    finalMessages.push(systemMessage);

    const imageContent = ruleContent.map(url => ({
      type: 'image_url',
      image_url: { url }
    }));

    // Insert images as the first user message (context)
    finalMessages.push({
      role: 'user',
      content: [
        { type: 'text', text: '以下是本桌游的规则书图片，请根据这些内容为您进行讲解：' },
        ...imageContent
      ]
    });

    // Append conversation history
    finalMessages = [...finalMessages, ...messages];
  } else {
    // Text Mode: Inject text into system prompt
    const systemMessage = {
      role: 'system' as const,
      content: SYSTEM_PROMPT_TEMPLATE.replace('{RULE_CONTENT}', ruleContent),
    };
    finalMessages = [systemMessage, ...messages];
  }

  try {
    const stream = await openai.chat.completions.create({
      model: config.modelName,
      messages: finalMessages,
      stream: true,
      temperature: 0.7,
    });

    return stream;
  } catch (error) {
    console.error('Chat completion failed:', error);
    throw error;
  }
}
