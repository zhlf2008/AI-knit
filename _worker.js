/**
 * Cloudflare Worker for ModelScope API Proxy
 * 
 * This worker forwards requests to ModelScope API and adds proper CORS headers
 * to allow browser-based applications to call the API.
 */

const MODELSCOPE_API_BASE = 'https://api-inference.modelscope.cn';

export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return handleCORS(request);
    }

    const url = new URL(request.url);
    const path = url.pathname + url.search;
    
    // Build the target URL
    const targetUrl = MODELSCOPE_API_BASE + path;
    
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
      return new Response(JSON.stringify({ error: 'Failed to fetch from ModelScope API' }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
  },
};

function handleCORS(request) {
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
