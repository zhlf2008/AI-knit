import { Config, Resolution, ApiProvider } from "../types";

// API Configuration
const DEFAULT_API_ENDPOINT = "https://api-inference.modelscope.cn/v1/images/generations";
const DEFAULT_MODEL_ID = "Tongyi-MAI/Z-Image-Turbo";

// Helper to get effective API Key
const getApiKey = (config: Config, providerOverride?: ApiProvider) => {
  const provider = providerOverride || config.apiProvider;
  if (config.keys && config.keys[provider]) {
    return config.keys[provider] || "";
  }
  return "";
};

// --- Verification Logic ---

// 检查字符串是否只包含ISO-8859-1 (Latin-1) 字符
const isLatin1 = (str: string): boolean => {
  // ISO-8859-1范围：\u0000-\u00FF
  return /^[\u0000-\u00FF]*$/.test(str);
};

export const verifyConnection = async (provider: ApiProvider, key: string, endpoint?: string, model?: string, proxy?: string): Promise<{ success: boolean; message?: string }> => {
  if (!key) return { success: false, message: "请输入 API 密钥" };
  
  // 检查API密钥是否只包含ISO-8859-1字符
  if (!isLatin1(key)) {
    return { success: false, message: "API 密钥包含非ISO-8859-1字符，请确保只使用英文字母、数字和符号" };
  }
  
  // 检查接入地址是否只包含ISO-8859-1字符
  if (endpoint && !isLatin1(endpoint)) {
    return { success: false, message: "API 接入地址包含非ISO-8859-1字符，请使用标准URL格式" };
  }
  
  // 检查模型ID是否只包含ISO-8859-1字符
  if (model && !isLatin1(model)) {
    return { success: false, message: "模型 ID 包含非ISO-8859-1字符，请使用英文模型名称" };
  }
  
  // 检查代理地址是否只包含ISO-8859-1字符
  if (proxy && !isLatin1(proxy)) {
    return { success: false, message: "代理地址包含非ISO-8859-1字符，请使用标准URL格式" };
  }

  try {
    switch (provider) {
      case 'zimage': {
        // Detect if running in production (not on Vite dev server)
        const isProduction = !import.meta.env.DEV;

        // Production: Use Cloudflare Pages Functions proxy
        // Development: Use Vite proxy
        const url = isProduction
          ? '/api/v1/images/generations'
          : '/api/proxy/v1/images/generations';

        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${key}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ 
            model: DEFAULT_MODEL_ID, 
            prompt: "test", 
            n: 1, 
            size: "1024x1024",
            seed: 42,
            steps: 8,
            time_shift: 3.0,
            guidance_scale: 7.5,
            sampler: "euler_a",
            scheduler: "karras"
          })
        });

        if (res.status === 401 || res.status === 403) {
          return { success: false, message: "Z-Image API Token 无效或权限不足" };
        }
        if (res.status === 400 || res.status === 200) {
          return { success: true };
        }
        return { success: false, message: `验证失败 (${res.status}): API 响应异常` };
      }
      case 'openai': {
        if (!endpoint) {
          return { success: false, message: "请输入 API 接入地址" };
        }
        // 使用配置的模型名称，如果未提供则使用通用模型
        const testModel = model || "gpt-3.5-turbo";
        // 测试 OpenAI 兼容 API 连接
        const testEndpoint = endpoint.endsWith('/chat/completions') ? endpoint : `${endpoint.replace(/\/$/, '')}/chat/completions`;
        const res = await fetch(testEndpoint, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${key}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: testModel,
            messages: [{ role: "user", content: "Hello" }],
            max_tokens: 5
          })
        });

        if (res.status === 401 || res.status === 403) {
          return { success: false, message: "API 密钥无效或权限不足" };
        }
        if (res.ok) {
          return { success: true };
        }
        // 尝试解析错误响应体
        let errorDetail = '';
        try {
          const errorBody = await res.text();
          if (errorBody) {
            // 尝试解析JSON
            try {
              const errorJson = JSON.parse(errorBody);
              errorDetail = errorJson.error?.message || errorJson.message || errorBody.substring(0, 200);
            } catch {
              errorDetail = errorBody.substring(0, 200);
            }
          }
        } catch {
          // 忽略解析错误
        }
        if (errorDetail) {
          return { success: false, message: `验证失败 (${res.status}): ${errorDetail}` };
        }
        return { success: false, message: `验证失败 (${res.status}): ${res.statusText}` };
      }
      default:
        return { success: false, message: "未知服务商" };
    }
  } catch (e: any) {
    console.error(`Verification failed for ${provider}:`, e);
    if (e.message?.includes("Failed to fetch")) {
      return { success: false, message: "网络错误: 请检查网络连接和 API 地址" };
    }
    return { success: false, message: e.message || "未知错误" };
  }
};

// --- Z-Image-Turbo Implementation ---

const generateWithZImage = async (
  prompt: string,
  resolution: Resolution,
  seed: number,
  config: Config,
  signal?: AbortSignal
): Promise<{ imageUrl: string; seed: number | null }> => {
  const apiKey = getApiKey(config, 'zimage');
  if (!apiKey) throw new Error("Z-Image API Token is missing. Please configure it in Settings.");

  // ModelScope API has a 2000 character limit for prompt
  const MAX_PROMPT_LENGTH = 1800;
  let truncatedPrompt = prompt;
  if (prompt.length > MAX_PROMPT_LENGTH) {
    truncatedPrompt = prompt.substring(0, MAX_PROMPT_LENGTH);
    const lastSpace = truncatedPrompt.lastIndexOf(' ');
    const lastComma = truncatedPrompt.lastIndexOf(',');
    const lastPeriod = truncatedPrompt.lastIndexOf('。');
    const lastBreak = Math.max(lastSpace, lastComma, lastPeriod);
    if (lastBreak > MAX_PROMPT_LENGTH * 0.8) {
      truncatedPrompt = truncatedPrompt.substring(0, lastBreak);
    }
  }

  // Remove "AI设计：" prefix if present
  const cleanedPrompt = truncatedPrompt.replace(/^AI设计[:：]\s*/, '').trim();

  // Detect if running in production (not on Vite dev server)
  const isProduction = !import.meta.env.DEV;

  // Production: Use Cloudflare Pages Functions proxy
  // Development: Use Vite proxy
  const apiBaseUrl = isProduction
    ? '/api'
    : '/api/proxy';

  const url = `${apiBaseUrl}/v1/images/generations`;

  try {
    // Step 1: Submit async task
    // Note: ModelScope API uses the seed value directly
    // Unlike Gradio, it doesn't have a separate random_seed flag
    const response = await fetch(url, {
      method: "POST",
      signal: signal,
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-ModelScope-Async-Mode": "true"
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL_ID,
        prompt: cleanedPrompt,
        n: 1,
        size: resolution,
        seed: seed,  // Use the seed value from UI (could be fixed or random)
        steps: config.steps || 8,
        time_shift: config.timeShift || 3.0,
        guidance_scale: config.guidanceScale || 7.5,  // Add guidance scale parameter
        sampler: config.sampler || "euler_a",  // Add sampler parameter
        scheduler: config.scheduler || "karras"  // Add scheduler parameter
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Z-Image API Error:', {
        status: response.status,
        statusText: response.statusText,
        body: errText,
        promptLength: cleanedPrompt.length,
        prompt: cleanedPrompt
      });
      throw new Error(`Z-Image Error (${response.status}): ${errText}`);
    }

    const data = await response.json();

    // Step 2: Get task ID and poll for result
    const taskId = data.task_id;
    if (!taskId) throw new Error("Failed to start Z-Image task: No task_id returned.");

    // Production: Use Cloudflare Pages Functions proxy
    // Development: Use Vite proxy
    const taskBaseUrl = isProduction
      ? `/api/v1/tasks/${taskId}`
      : `/api/proxy/v1/tasks/${taskId}`;

    let attempts = 0;
    while (attempts < 120) {
      // Check for abort signal
      if (signal?.aborted) {
        throw new Error('Generation cancelled by user');
      }

      await new Promise(r => setTimeout(r, 2000));

      const taskRes = await fetch(taskBaseUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "X-ModelScope-Task-Type": "image_generation"
        }
      });

      if (!taskRes.ok) {
        console.error(`Task query failed: ${taskRes.status}`);
        attempts++;
        continue;
      }

      const taskData = await taskRes.json();
      const status = taskData.task_status;

      if (status === 'SUCCEED') {
        if (taskData.output_images && taskData.output_images.length > 0) {
          return {
            imageUrl: taskData.output_images[0],
            seed: taskData.seed || seed || null // Use API returned seed if available
          };
        }
        throw new Error("Task succeeded but no images returned.");
      } else if (status === 'FAILED') {
        throw new Error(`Z-Image task failed: ${taskData.message || 'Unknown error'}`);
      } else if (status === 'CANCELED') {
        throw new Error("Z-Image task canceled.");
      } else if (status === 'PENDING' || status === 'RUNNING' || status === 'SUSPENDED') {
        console.log(`Z-Image task status: ${status}, attempt ${attempts + 1}/120`);
      }
      attempts++;
    }
    throw new Error("Z-Image generation timed out after 240 seconds.");
  } catch (e: any) {
    if (e.name === 'AbortError') {
      throw new Error('Generation cancelled by user');
    }
    if (e.message?.includes("403") || e.message?.includes("Failed to fetch")) {
      throw new Error("连接被拒绝 (CORS/网络错误)。\n请确保已部署 Cloudflare Pages Functions。\n详见: https://developers.cloudflare.com/pages/functions/");
    }
    throw e;
  }
};

export const generateImage = async (
    prompt: string,
    resolution: Resolution,
    seed: number,
    config: Config,
    signal?: AbortSignal
): Promise<{ imageUrl: string; seed: number | null }> => {
  return await generateWithZImage(prompt, resolution, seed, config, signal);
};
