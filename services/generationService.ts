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

export const verifyConnection = async (provider: ApiProvider, key: string, endpoint?: string, proxy?: string): Promise<{ success: boolean; message?: string }> => {
  if (!key) return { success: false, message: "请输入 API 密钥" };

  try {
    switch (provider) {
      case 'zimage': {
        // Detect if running in production (not on Vite dev server)
        const isProduction = !import.meta.env.DEV;

        // Use direct API call in production, Vite proxy in development
        const url = isProduction
          ? `${DEFAULT_API_ENDPOINT}`
          : '/api/proxy/v1/images/generations';

        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${key}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ model: DEFAULT_MODEL_ID, prompt: "test", n: 1, size: "1024x1024" })
        });

        if (res.status === 401 || res.status === 403) {
          return { success: false, message: "Z-Image API Token 无效或权限不足" };
        }
        if (res.status === 400 || res.status === 200) {
          return { success: true };
        }
        return { success: false, message: `验证失败 (${res.status}): API 响应异常` };
      }
      default:
        return { success: false, message: "未知服务商" };
    }
  } catch (e: any) {
    console.error(`Verification failed for ${provider}:`, e);
    if (e.message?.includes("Failed to fetch")) {
      return { success: false, message: "网络错误 (CORS): 请检查网络连接" };
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
): Promise<string> => {
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

  // Use direct API call in production, Vite proxy in development
  const apiBaseUrl = isProduction
    ? 'https://api-inference.modelscope.cn'
    : '/api/proxy';

  const url = `${apiBaseUrl}/v1/images/generations`;

  try {
    // Step 1: Submit async task
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
        size: resolution
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

    // Use direct API call for task query in production
    const taskBaseUrl = isProduction
      ? `https://api-inference.modelscope.cn/v1/tasks/${taskId}`
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
          return taskData.output_images[0];
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
      throw new Error("连接被拒绝 (CORS/网络错误)。\n请检查网络连接或稍后重试。");
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
): Promise<string> => {
  return await generateWithZImage(prompt, resolution, seed, config, signal);
};
