/**
 * Cloudflare Pages Function for ModelScope API Proxy
 * This function proxies requests to ModelScope API and adds CORS headers
 * 
 * Create file structure:
 * - functions/
 *   - api/
 *     - [[path]].js
 */

const MODELSCOPE_API_BASE = 'https://api-inference.modelscope.cn';

export async function onRequest(context) {
  const { request, env } = context;

  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-ModelScope-Async-Mode, X-ModelScope-Task-Type',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  // Get the path after /api/
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api\//, '');
  const targetUrl = `${MODELSCOPE_API_BASE}/${path}${url.search}`;
  
  // Create new request with modified URL
  const newRequest = new Request(targetUrl, request);
  
  // Forward all headers from original request
  request.headers.forEach((value, key) => {
    newRequest.headers.set(key, value);
  });

  try {
    const response = await fetch(newRequest);
    
    // Create new response with CORS headers
    const newResponse = new Response(response.body, response);
    
    // Add CORS headers
    newResponse.headers.set('Access-Control-Allow-Origin', '*');
    newResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    newResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-ModelScope-Async-Mode, X-ModelScope-Task-Type');
    newResponse.headers.set('Access-Control-Max-Age', '86400');
    
    return newResponse;
  } catch (error) {
    console.error('Proxy error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to fetch from ModelScope API',
      details: error.message 
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}
