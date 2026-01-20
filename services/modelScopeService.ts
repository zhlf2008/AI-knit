import { Config, ApiProvider } from "../types";

// Helper to get effective API Key
const getApiKey = (config: Config, providerOverride?: ApiProvider) => {
  const provider = providerOverride || config.apiProvider;
  if (config.keys && config.keys[provider]) {
    return config.keys[provider] || "";
  }
  return "";
};

/**
 * 毛衣设计师提示词优化大师
 * 角色：顶级的毛衣设计AI绘画提示词优化师
 * 任务：分析、重构并优化毛衣设计提示词，显著提升生成图像的艺术感、细节丰富度和整体质量
 */
class SweaterDesignPromptOptimizer {
  // 毛衣设计优化维度库（基于constants.ts中的分类）
  private readonly dimensions = {
    // 颜色维度增强
    color: [
      "奶油白，柔和温暖",
      "焦糖橘，复古时尚", 
      "莫兰迪绿，高级质感",
      "燕麦色，自然优雅",
      "复古红，经典大气"
    ],
    
    // 材质维度增强
    material: [
      "山羊绒材质，柔软细腻",
      "蓬松马海毛，轻盈温暖",
      "亲肤棉线，舒适透气",
      "粗旷羊毛，自然纹理"
    ],
    
    // 领型维度增强
    collar: [
      "经典圆领，简约百搭",
      "优雅V领，修饰颈线",
      "高领保暖，冬日必备",
      "Polo翻领，休闲时尚"
    ],
    
    // 剪裁维度增强
    fit: [
      "慵懒宽松，舒适随性",
      "修身款，展现身材曲线",
      "复古箱型，时尚廓形"
    ],
    
    // 风格维度增强
    style: [
      "温暖色调，8k超清细节，时尚摄影特写，柔和唯美光影",
      "自然清新，日系风格，明亮光线，生活感",
      "复古胶片，电影感，高对比度，颗粒质感",
      "极简主义，冷淡风，棚拍质感，干净背景"
    ],
    
    // 通用高质量词缀
    quality: [
      "最佳质量，杰作",
      "8K分辨率，高清画质",
      "大师水准，艺术级"
    ]
  };
  
  /**
   * 深度清理标点符号（公共方法）
   * 1. 移除多余的中文逗号
   * 2. 确保以句号结尾
   * 3. 处理连续的标点
   */
  public cleanPunctuation(text: string): string {
    if (!text || text.trim().length === 0) {
      return "一件精美的毛衣设计。";
    }
    
    let cleaned = text.trim();
    
    // 替换连续的逗号为单个逗号
    cleaned = cleaned.replace(/，+/g, '，');
    
    // 移除开头和结尾的多余逗号
    cleaned = cleaned.replace(/^，/, '').replace(/，$/, '');
    
    // 清理多余的句号
    cleaned = cleaned.replace(/。+/g, '。');
    
    // 如果以逗号结尾，替换为句号
    if (cleaned.endsWith('，')) {
      cleaned = cleaned.slice(0, -1) + '。';
    }
    
    // 确保以中文标点结尾
    if (!cleaned.endsWith('。') && !cleaned.endsWith('！') && !cleaned.endsWith('？')) {
      cleaned += '。';
    }
    
    // 再次清理可能的连续句号
    cleaned = cleaned.replace(/。+/g, '。');
    
    return cleaned;
  }
  
  /**
   * 分析提示词中已有的维度
   * 返回已覆盖的维度类型数组
   */
  private analyzeExistingDimensions(prompt: string): string[] {
    const existing: string[] = [];
    const lowerPrompt = prompt.toLowerCase();
    
    // 检查颜色维度
    const colorKeywords = ['奶油白', '焦糖橘', '莫兰迪绿', '燕麦色', '复古红', '色', '颜色', '色彩', '红', '白', '绿', '橘'];
    if (colorKeywords.some(keyword => lowerPrompt.includes(keyword.toLowerCase()))) {
      existing.push('color');
    }
    
    // 检查材质维度
    const materialKeywords = ['山羊绒', '马海毛', '棉线', '羊毛', '羊绒', '材质', '面料', '针织', '绒', '毛'];
    if (materialKeywords.some(keyword => lowerPrompt.includes(keyword.toLowerCase()))) {
      existing.push('material');
    }
    
    // 检查领型维度
    const collarKeywords = ['圆领', 'v领', '高领', 'polo', '翻领', '领口', '领型', '领子', '领'];
    if (collarKeywords.some(keyword => lowerPrompt.includes(keyword.toLowerCase()))) {
      existing.push('collar');
    }
    
    // 检查剪裁维度
    const fitKeywords = ['宽松', '修身', '箱型', '剪裁', '版型', '合身', '短款', '长款'];
    if (fitKeywords.some(keyword => lowerPrompt.includes(keyword.toLowerCase()))) {
      existing.push('fit');
    }
    
    // 检查风格维度
    const styleKeywords = ['温暖', '自然', '复古', '极简', '商业', '艺术', '电影', '日系', '风格'];
    if (styleKeywords.some(keyword => lowerPrompt.includes(keyword.toLowerCase()))) {
      existing.push('style');
    }
    
    return existing;
  }
  
  /**
   * 智能选择增强维度
   * 优先选择缺失的维度，但最多选择2-3个
   */
  private selectEnhancementDimensions(existingDimensions: string[]): string[] {
    const allDimensions = Object.keys(this.dimensions);
    const selected: string[] = [];
    
    // 优先选择缺失的维度
    const missingDimensions = allDimensions.filter(dim => !existingDimensions.includes(dim));
    
    // 从缺失维度中随机选择1-2个
    if (missingDimensions.length > 0) {
      const numToSelect = Math.min(2, missingDimensions.length);
      // 简单随机选择，避免复杂排序
      for (let i = 0; i < numToSelect; i++) {
        const randomIndex = Math.floor(Math.random() * missingDimensions.length);
        selected.push(missingDimensions[randomIndex]);
      }
    }
    
    // 如果还不足2个，从所有维度中随机补充
    if (selected.length < 2) {
      const remainingDimensions = allDimensions.filter(dim => !selected.includes(dim));
      const numNeeded = 2 - selected.length;
      for (let i = 0; i < numNeeded && remainingDimensions.length > 0; i++) {
        const randomIndex = Math.floor(Math.random() * remainingDimensions.length);
        selected.push(remainingDimensions[randomIndex]);
      }
    }
    
    // 确保不超过3个维度
    return selected.slice(0, 3);
  }
  
  /**
   * 从指定维度中随机选择增强项
   */
  private getRandomEnhancement(dimension: string): string {
    const enhancements = this.dimensions[dimension as keyof typeof this.dimensions];
    if (!enhancements || enhancements.length === 0) {
      return "";
    }
    return enhancements[Math.floor(Math.random() * enhancements.length)];
  }
  
  /**
   * 判断提示词是否需要基础增强
   * 如果提示词过于简单（少于4个中文字符），返回true
   */
  private needsBasicEnhancement(prompt: string): boolean {
    const chineseCharCount = (prompt.match(/[\u4e00-\u9fa5]/g) || []).length;
    return chineseCharCount < 4;
  }
  
  /**
   * 去除重复的关键词和短语
   * 将提示词按逗号分割，去除重复的短语，保持顺序
   */
  private removeDuplicateKeywords(text: string): string {
    if (!text || text.trim().length === 0) {
      return text;
    }
    
    // 分割成短语（按中文逗号分隔）
    const phrases = text.split('，').map(p => p.trim()).filter(p => p.length > 0);
    const uniquePhrases: string[] = [];
    const seenPhrases = new Set<string>();
    
    // 保留顺序，去除重复
    for (const phrase of phrases) {
      // 标准化短语以进行去重比较（移除质量词等常见修饰语）
      const normalized = phrase
        .replace(/[0-9]K|超高清|高质量|最佳质量|杰作|大师级|照片级|无可挑剔的/g, '')
        .trim();
      
      // 如果标准化后为空或已经见过，则跳过
      if (normalized.length === 0 || seenPhrases.has(normalized)) {
        continue;
      }
      
      seenPhrases.add(normalized);
      uniquePhrases.push(phrase);
    }
    
    // 如果所有短语都被去重了，至少保留一个
    if (uniquePhrases.length === 0 && phrases.length > 0) {
      uniquePhrases.push(phrases[0]);
    }
    
    // 重新组合
    let result = uniquePhrases.join('，');
    
    // 确保以句号结尾
    if (result.length > 0 && !result.endsWith('。')) {
      result += '。';
    }
    
    return result;
  }
  
  /**
   * 检查短语是否与已有内容语义重复
   * 基于关键词重叠进行简单判断
   */
  private isPhraseRedundant(newPhrase: string, existingText: string): boolean {
    if (!newPhrase || !existingText) return false;
    
    // 提取关键词（中文常见词汇）
    const extractKeywords = (text: string): string[] => {
      return text
        .replace(/[0-9]K|超高清|高质量|最佳质量|杰作|大师级|照片级|无可挑剔的|精致|细腻|逼真|柔和|鲜明|高级|专业|艺术/g, '')
        .split(/[，。、\s]/)
        .map(word => word.trim())
        .filter(word => word.length > 1 && !['的', '了', '在', '和', '与', '或', '且'].includes(word));
    };
    
    const newKeywords = extractKeywords(newPhrase);
    const existingKeywords = extractKeywords(existingText);
    
    // 如果新短语的关键词大部分都已存在，则认为重复
    if (newKeywords.length === 0) return false;
    
    const overlapping = newKeywords.filter(kw => 
      existingKeywords.some(ekw => ekw.includes(kw) || kw.includes(ekw))
    ).length;
    
    // 如果超过50%的关键词重复，则认为冗余
    return overlapping / newKeywords.length > 0.5;
  }
  
  /**
   * 提示词优化专家进行润色
   * 核心逻辑：
   * 1. 深度清理标点符号
   * 2. 重构提示词结构，使其更符合AI绘画的优化标准
   * 3. 添加必要的艺术描述和细节增强
   * 4. 防止重复关键词堆叠，确保语言精炼
   * 5. 确保最终输出为高质量的、完整的提示词
   */
  public optimizePrompt(basePrompt: string): string {
    console.log('🧶 AI提示词优化专家开始工作...');
    console.log('原始提示词:', basePrompt);
    
    // 深度清理标点
    let optimized = this.cleanPunctuation(basePrompt);
    
    // 移除可能的多余前缀（如"AI设计："等）
    optimized = optimized.replace(/^AI设计[：:]?\s*/, '');
    
    // 提示词优化专家系统提示词（参考aardio项目）
    const systemPrompt = `你是顶级的AI绘画提示词优化师。请对用户输入的提示词进行深度分析和重构优化。
优化原则：
1. 结构优化：将杂乱描述重组为逻辑清晰的提示词结构
2. 细节增强：添加具体的材质、光影、构图、风格等艺术细节
3. 专业术语：使用AI绘画领域的专业术语和增强词汇
4. 质量提升：确保最终提示词能生成高质量、高细节的图像
5. 语言精炼：保持中文表达的优美和精炼，避免重复和关键词堆叠

优化后的提示词应该包含：
- 主体描述：清晰明确的主体和核心特征
- 风格设定：艺术风格、摄影风格或绘画风格
- 细节增强：材质、光影、色彩、纹理等细节
- 质量词汇：8K、高质量、杰作、最佳质量等增强词
- 负面提示：必要时添加负面提示以排除不良元素

请直接输出优化后的完整提示词，不要添加任何解释。`;
    
    // 模拟提示词优化专家的思考过程
    console.log('提示词优化专家分析中...');
    
    // 分析原始提示词的特征
    const hasColor = /(色|颜色|色彩|红|黄|蓝|绿|紫|橙|粉|黑|白|灰|金|银)/.test(optimized);
    const hasMaterial = /(材质|面料|布料|绒|毛|棉|丝|麻|皮)/.test(optimized);
    const hasStyle = /(风格|式样|设计|艺术|摄影|画)/.test(optimized);
    const hasDetail = /(细节|纹理|质感|光影|光线|照明)/.test(optimized);
    
    // 艺术风格增强词库
    const artStyles = [
      "高质量的艺术摄影风格",
      "商业时尚摄影质感",
      "电影感画面构图",
      "日系清新自然风格",
      "复古胶片质感",
      "极简主义美学",
      "超现实主义艺术风格",
      "写实主义绘画风格"
    ];
    
    // 细节增强词库
    const detailEnhancements = [
      "精致的细节纹理",
      "细腻的材质质感",
      "逼真的光影效果",
      "柔和的光线渲染",
      "鲜明的色彩对比",
      "高级的画面质感",
      "专业级的摄影构图",
      "艺术级的视觉表现"
    ];
    
    // 质量增强词库
    const qualityEnhancements = [
      "8K超高清画质",
      "最佳质量，杰作",
      "大师级艺术水准",
      "照片级真实细节",
      "无可挑剔的细节表现"
    ];
    
    // 智能选择增强项（基于缺失的特征）
    const selectedEnhancements: string[] = [];
    
    // 如果缺乏艺术风格，添加一个（检查是否与现有内容重复）
    if (!hasStyle) {
      const styleCandidates = [...artStyles];
      let added = false;
      
      // 尝试最多3次找到非重复的风格
      for (let attempt = 0; attempt < 3 && styleCandidates.length > 0; attempt++) {
        const randomIndex = Math.floor(Math.random() * styleCandidates.length);
        const candidate = styleCandidates[randomIndex];
        
        if (!this.isPhraseRedundant(candidate, optimized)) {
          selectedEnhancements.push(candidate);
          added = true;
          break;
        }
        
        // 移除已尝试的候选
        styleCandidates.splice(randomIndex, 1);
      }
      
      // 如果所有尝试都失败，添加一个不重复检查的
      if (!added && artStyles.length > 0) {
        selectedEnhancements.push(artStyles[Math.floor(Math.random() * artStyles.length)]);
      }
    }
    
    // 如果缺乏细节，添加1-2个细节增强（检查重复）
    if (!hasDetail) {
      const detailCandidates = [...detailEnhancements];
      const numDetails = Math.floor(Math.random() * 2) + 1;
      let addedCount = 0;
      
      for (let i = 0; i < numDetails && detailCandidates.length > 0 && addedCount < 2; i++) {
        const randomIndex = Math.floor(Math.random() * detailCandidates.length);
        const candidate = detailCandidates[randomIndex];
        
        // 检查与已选增强项和原始内容的重复
        const allExistingText = optimized + '，' + selectedEnhancements.join('，');
        if (!this.isPhraseRedundant(candidate, allExistingText)) {
          selectedEnhancements.push(candidate);
          addedCount++;
        }
        
        // 移除已尝试的候选
        detailCandidates.splice(randomIndex, 1);
      }
    }
    
    // 总是添加1个质量增强（检查重复）
    const qualityCandidates = [...qualityEnhancements];
    let qualityAdded = false;
    
    for (let attempt = 0; attempt < 3 && qualityCandidates.length > 0; attempt++) {
      const randomIndex = Math.floor(Math.random() * qualityCandidates.length);
      const candidate = qualityCandidates[randomIndex];
      
      const allExistingText = optimized + '，' + selectedEnhancements.join('，');
      if (!this.isPhraseRedundant(candidate, allExistingText)) {
        selectedEnhancements.push(candidate);
        qualityAdded = true;
        break;
      }
      
      qualityCandidates.splice(randomIndex, 1);
    }
    
    // 如果所有尝试都失败，添加一个不重复检查的
    if (!qualityAdded && qualityEnhancements.length > 0) {
      selectedEnhancements.push(qualityEnhancements[Math.floor(Math.random() * qualityEnhancements.length)]);
    }
    
    // 重构提示词结构
    let sentences = optimized.split(/[，。]/).map(s => s.trim()).filter(s => s.length > 0);
    
    // 如果提示词太简单，添加基础增强（检查重复）
    if (sentences.length < 2) {
      const basicEnhancements = [
        "设计精美，细节丰富",
        "造型优雅，时尚感强",
        "工艺精湛，质感出众"
      ];
      
      const basicCandidates = [...basicEnhancements];
      let added = false;
      
      for (let attempt = 0; attempt < 3 && basicCandidates.length > 0; attempt++) {
        const randomIndex = Math.floor(Math.random() * basicCandidates.length);
        const candidate = basicCandidates[randomIndex];
        
        const allExistingText = sentences.join('，') + '，' + selectedEnhancements.join('，');
        if (!this.isPhraseRedundant(candidate, allExistingText)) {
          sentences.push(candidate);
          added = true;
          break;
        }
        
        basicCandidates.splice(randomIndex, 1);
      }
      
      if (!added && basicEnhancements.length > 0) {
        sentences.push(basicEnhancements[Math.floor(Math.random() * basicEnhancements.length)]);
      }
    }
    
    // 去重句子本身
    const uniqueSentences: string[] = [];
    const seenSentenceKeys = new Set<string>();
    
    for (const sentence of sentences) {
      const key = sentence.replace(/[0-9]K|超高清|高质量|最佳质量|杰作|大师级|照片级|无可挑剔的/g, '').trim();
      if (!seenSentenceKeys.has(key)) {
        seenSentenceKeys.add(key);
        uniqueSentences.push(sentence);
      }
    }
    
    // 重组提示词：主体描述 + 风格 + 细节 + 质量
    let reconstructed = uniqueSentences.join('，');
    
    // 添加选择的增强项
    if (selectedEnhancements.length > 0) {
      reconstructed += '，' + selectedEnhancements.join('，');
    }
    
    // 确保以句号结尾
    if (!reconstructed.endsWith('。')) {
      reconstructed += '。';
    }
    
    // 最终清理和去重
    optimized = this.cleanPunctuation(reconstructed);
    optimized = this.removeDuplicateKeywords(optimized);
    
    // 确保长度适中（60-120字）
    if (optimized.length > 120) {
      const parts = optimized.split('，');
      if (parts.length > 4) {
        optimized = parts.slice(0, 4).join('，') + '。';
      }
    }
    
    console.log('优化后的提示词:', optimized);
    console.log('提示词优化专家润色完成！已避免重复关键词堆叠。');
    
    return optimized;
  }
}

// 创建单例优化器实例
const sweaterOptimizer = new SweaterDesignPromptOptimizer();

/**
 * 使用OpenAI兼容API优化提示词
 */
const enhancePromptWithOpenAI = async (
  basePrompt: string,
  apiKey: string,
  baseURL: string,
  model: string
): Promise<string> => {
  console.log('🤖 使用OpenAI兼容API优化提示词...');
  
  const promptText = `你是一位顶级的AI绘画提示词优化师，专精于毛衣设计领域。
  请对用户输入的毛衣设计提示词进行深度分析和重构优化，按照以下结构生成详细、专业的优化版本：

优化原则：
1. 结构优化：将简短描述重组为逻辑清晰、层次分明的完整提示词
2. 细节增强：添加具体的模特描述、姿势、表情、材质纹理、光影效果
3. 环境营造：创建简约温馨的室内背景，描述家具、灯光氛围
4. 摄影专业：使用时尚摄影术语，描述构图、视角、画面质感
5. 质量提升：确保提示词能生成照片级真实感的高质量图像

优化后的提示词应包含以下要素：
- 主体描述：毛衣的完整描述，包括颜色、材质、领型、剪裁等特征
- 人物设定：模特的姿态、表情、穿着效果
- 摄影视角：特写、构图、画面焦点
- 背景环境：简约温馨的室内场景，光线氛围
- 艺术风格：照片级真实感，高质量视觉效果
- 质量词汇：8K分辨率，最佳画质，大师之作

请基于以下输入提示词进行深度优化，生成一个完整、专业、详细的优化版本：

输入提示词: "${basePrompt}"

要求：
1. 请使用中文输出，语言优美专业
2. 生成100-150字的详细描述
3. 只输出优化后的提示词文本，不要包含任何其他解释或标签
4. 确保提示词结构完整，逻辑清晰`;

  try {
    const response = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'user', content: promptText }
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API请求失败: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const optimizedText = data.choices?.[0]?.message?.content?.trim();
    
    if (!optimizedText) {
      console.warn('OpenAI API返回空内容，使用原始提示词');
      return basePrompt;
    }

    console.log('OpenAI优化后的提示词:', optimizedText);
    return optimizedText;
  } catch (error) {
    console.error('OpenAI API调用失败:', error);
    throw error;
  }
};



/**
 * 使用AI大模型优化提示词
 * 优先使用OpenAI兼容API，其次本地优化器
 */
export const enhancePromptWithModelScope = async (
  basePrompt: string, 
  config: Config
): Promise<string> => {
  console.log('🧠 AI提示词优化开始...');
  console.log('原始提示词:', basePrompt);
  
  // 1. 检查OpenAI兼容API配置是否完整
  const openaiApiKey = config.keys?.openai;
  const openaiEndpoint = config.endpoints?.openai;
  const openaiModel = config.models?.openai;
  
  if (openaiApiKey && openaiEndpoint && openaiModel && 
      openaiApiKey !== 'your_api_key_here' && !openaiApiKey.includes('your_')) {
    console.log('使用OpenAI兼容API进行深度提示词优化...');
    try {
      const optimized = await enhancePromptWithOpenAI(basePrompt, openaiApiKey, openaiEndpoint, openaiModel);
      console.log('OpenAI优化后的提示词:', optimized);
      return optimized;
    } catch (error) {
      console.warn('OpenAI API优化失败，回退到本地优化器:', error);
      // 继续使用本地优化器
    }
  }
  
  // 2. 使用本地优化器进行优化
  console.log('使用本地优化器进行提示词优化...');
  const apiKey = getApiKey(config, 'zimage');
  
  if (!apiKey || apiKey === 'your_api_key_here' || apiKey.includes('your_')) {
    throw new Error("魔搭API密钥未配置。请在高级设置中配置Z-Image API Token。");
  }

  // 使用改进的本地优化器进行智能优化
  const optimized = sweaterOptimizer.optimizePrompt(basePrompt);
  
  // 如果优化失败，返回清理后的原始提示词
  if (!optimized || optimized.trim().length === 0) {
    return sweaterOptimizer.cleanPunctuation(basePrompt);
  }
  
  console.log('本地优化后的提示词:', optimized);
  return optimized;
};