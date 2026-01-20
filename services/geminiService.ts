import { GoogleGenAI } from "@google/genai";

const getClient = () => {
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Gemini API密钥未配置。请创建.env文件并添加GEMINI_API_KEY=your_api_key_here");
  }
  return new GoogleGenAI({ apiKey });
};

export const enhancePromptWithGemini = async (basePrompt: string): Promise<string> => {
  try {
    const ai = getClient();
    
    // Using a Flash model for speed
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `你是一位顶级的AI绘画提示词优化师，专精于毛衣设计领域。
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
4. 确保提示词结构完整，逻辑清晰`,
    });

    const text = response.text;
    return text ? text.trim() : basePrompt;

  } catch (error) {
    console.error("Failed to enhance prompt with Gemini:", error);
    return basePrompt;
  }
};

export const generateImageWithGemini = async (prompt: string, aspectRatio: string): Promise<string | null> => {
  try {
    const ai = getClient();
    
    // Using Imagen model for high quality image generation
    const response = await ai.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt: prompt,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/jpeg',
        aspectRatio: aspectRatio as any, 
      },
    });

    const imageBytes = response.generatedImages?.[0]?.image?.imageBytes;
    
    if (imageBytes) {
      return `data:image/jpeg;base64,${imageBytes}`;
    }
    throw new Error("No image data returned");

  } catch (error) {
    console.error("Failed to generate image:", error);
    throw error;
  }
};