/**
 * 测试 Cloudflare Pages Functions API 代理
 *
 * 使用方法：
 * 1. 将此脚本部署到 Cloudflare Pages 后
 * 2. 在浏览器控制台中运行
 * 3. 替换 YOUR_TOKEN 为你的 ModelScope API Token
 */

const YOUR_TOKEN = 'YOUR_MODELSCOPE_API_TOKEN'; // 替换为你的 Token

async function testProxy() {
  console.log('🧪 测试 Cloudflare Pages Functions API 代理\n');

  // 测试 1: OPTIONS 请求（预检请求）
  console.log('📡 测试 1: OPTIONS 预检请求');
  try {
    const optionsResponse = await fetch('/api/v1/images/generations', {
      method: 'OPTIONS',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${YOUR_TOKEN}`,
      },
    });
    console.log('✅ OPTIONS 请求成功');
    console.log('CORS 头:', {
      'Access-Control-Allow-Origin': optionsResponse.headers.get('Access-Control-Allow-Origin'),
      'Access-Control-Allow-Methods': optionsResponse.headers.get('Access-Control-Allow-Methods'),
      'Access-Control-Allow-Headers': optionsResponse.headers.get('Access-Control-Allow-Headers'),
    });
  } catch (error) {
    console.error('❌ OPTIONS 请求失败:', error);
    return;
  }

  // 测试 2: POST 请求（创建任务）
  console.log('\n📡 测试 2: POST 创建图像生成任务');
  try {
    const response = await fetch('/api/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${YOUR_TOKEN}`,
        'X-ModelScope-Async-Mode': 'true',
      },
      body: JSON.stringify({
        model: 'Tongyi-MAI/Z-Image-Turbo',
        prompt: '一只可爱的小猫',
        n: 1,
        size: '1024x1024',
      }),
    });

    console.log('响应状态:', response.status, response.statusText);
    console.log('CORS 头:', response.headers.get('Access-Control-Allow-Origin'));

    const data = await response.json();
    console.log('响应数据:', data);

    if (data.task_id) {
      console.log('✅ 任务创建成功，任务 ID:', data.task_id);
    } else {
      console.log('❌ 任务创建失败');
    }
  } catch (error) {
    console.error('❌ POST 请求失败:', error);
  }

  console.log('\n✨ 测试完成');
}

// 运行测试
testProxy();
