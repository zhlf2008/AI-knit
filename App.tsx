import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Settings,
  Shuffle,
  Download,
  Loader2,
  Palette,
  Maximize2,
  AlertCircle,
  X,
  Zap,
  History,
  Trash2,
  Copy,
  Image as ImageIcon,
  ChevronDown,
  Square
} from 'lucide-react';
import { Config, Resolution, GenerationState, ApiProvider, HistoryItem } from './types';
import { DEFAULT_CONFIG, STATIC_PROMPT_SUFFIX, RESOLUTIONS } from './constants';
import ConfigModal from './components/ConfigModal';
import { generateImage } from './services/generationService';

const MAX_HISTORY_ITEMS = 100; // Limit history to prevent localStorage quota issues with base64

const App: React.FC = () => {
  // --- State ---
  // Load config from localStorage
  const [config, setConfig] = useState<Config>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('app_config');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);

          // Reset to default if old provider is detected
          if (parsed.apiProvider && parsed.apiProvider !== 'zimage') {
            console.log('Migrating to zimage provider');
            return { ...DEFAULT_CONFIG };
          }

          const merged = { ...DEFAULT_CONFIG, ...parsed,
             keys: { ...DEFAULT_CONFIG.keys, ...(parsed.keys || {}) },
             endpoints: { ...DEFAULT_CONFIG.endpoints, ...(parsed.endpoints || {}) },
             models: { ...DEFAULT_CONFIG.models, ...(parsed.models || {}) },
             corsProxies: { ...DEFAULT_CONFIG.corsProxies, ...(parsed.corsProxies || {}) }
          };
          
          // Ensure corsProxy has a default value if not set
          if (!merged.corsProxy) {
            merged.corsProxy = DEFAULT_CONFIG.corsProxy;
          }
          
          return merged;
        } catch (e) { console.error(e); }
      }
    }
    return DEFAULT_CONFIG;
  });

  // History State
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('app_history');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) { console.error("Failed to load history", e); }
      }
    }
    return [];
  });

  const [selections, setSelections] = useState<Record<string, string>>({});
  const [prompt, setPrompt] = useState('');
  const [resolution, setResolution] = useState<Resolution>("1024x1024");
  const [seedInput, setSeedInput] = useState('42');
  const [isRandomSeed, setIsRandomSeed] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showFullScreenImage, setShowFullScreenImage] = useState<string | null>(null);
  
  // Navigation State
  const [currentView, setCurrentView] = useState<'design' | 'history'>('design');
  
  const [generationState, setGenerationState] = useState<GenerationState>({
    isGenerating: false,
    progress: 0,
    imageUrl: null,
    seed: 42
  });

  // AbortController for cancelling generation
  const abortControllerRef = useRef<AbortController | null>(null);

  // --- Effects ---
  
  // Persist config
  useEffect(() => {
    localStorage.setItem('app_config', JSON.stringify(config));
  }, [config]);

  // Persist history
  useEffect(() => {
    try {
      localStorage.setItem('app_history', JSON.stringify(history));
    } catch (e) {
      console.warn("Storage quota exceeded, could not save history", e);
      // Optional: Logic to remove oldest item and try again could go here
    }
  }, [history]);

  // Initialize selections
  useEffect(() => {
    const initialSelections: Record<string, string> = {};
    config.categories.forEach(cat => {
      if (cat.items.length > 0 && !selections[cat.id]) {
        initialSelections[cat.id] = cat.items[0];
      }
    });
    if (Object.keys(initialSelections).length > 0) {
      setSelections(prev => ({ ...prev, ...initialSelections }));
    }
  }, [config.categories]);

  // Construct prompt
  const constructPrompt = useCallback(() => {
    const parts = ["AI设计：一件精美毛衣"];
    config.categories.forEach(cat => {
      if (selections[cat.id]) {
        parts.push(selections[cat.id]);
      }
    });
    const suffix = STATIC_PROMPT_SUFFIX ? "，" + STATIC_PROMPT_SUFFIX : "";
    setPrompt(parts.join("，") + suffix);
  }, [config.categories, selections]);

  useEffect(() => {
    // Only auto-update prompt if we haven't manually edited it significantly or if it's empty
    // Simplified: Just update for demo purposes unless user is typing? 
    // For this specific app logic: Auto update on selection change.
    constructPrompt();
  }, [selections, constructPrompt]);


  // --- Handlers ---

  const handleSelectionChange = (categoryId: string, item: string) => {
    setSelections(prev => ({ ...prev, [categoryId]: item }));
  };

  const handleRandomize = () => {
    const newSelections: Record<string, string> = {};
    config.categories.forEach(cat => {
      if (cat.items.length > 0) {
        const randomIndex = Math.floor(Math.random() * cat.items.length);
        newSelections[cat.id] = cat.items[randomIndex];
      }
    });
    setSelections(newSelections);
  };



  const handleGenerate = async () => {
    // Cancel any ongoing generation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new AbortController
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setGenerationState(prev => ({ ...prev, isGenerating: true, progress: 0, imageUrl: null }));
    setErrorMsg(null);
    setCurrentView('design'); // Ensure we are on design view

    const usedSeed = isRandomSeed ? Math.floor(Math.random() * 1000000) : parseInt(seedInput) || 42;
    if (isRandomSeed) setSeedInput(usedSeed.toString());

    // Progress animation
    const interval = setInterval(() => {
      setGenerationState(prev => {
        if (prev.progress >= 90) return prev;
        const speed = 2;
        return { ...prev, progress: prev.progress + speed };
      });
    }, 500);

    try {
      console.log('Starting generation with config:', {
        provider: config.apiProvider,
        hasKey: !!config.keys[config.apiProvider],
        promptLength: prompt.length,
        resolution,
        seed: usedSeed
      });

      const imageUrl = await generateImage(prompt, resolution, usedSeed, config, controller.signal);

      console.log('Generation completed, imageUrl:', imageUrl);

      setGenerationState({
        isGenerating: false,
        progress: 100,
        imageUrl: imageUrl,
        seed: usedSeed
      });

      // Add to History
      const newItem: HistoryItem = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        imageUrl: imageUrl,
        prompt: prompt,
        seed: usedSeed,
        resolution: resolution,
        provider: config.apiProvider
      };

      setHistory(prev => {
        const newHistory = [newItem, ...prev];
        return newHistory.slice(0, MAX_HISTORY_ITEMS);
      });

    } catch (e: any) {
      if (e.name === 'AbortError') {
        console.log('Generation cancelled by user');
        setErrorMsg('生成已取消');
        setGenerationState(prev => ({ ...prev, isGenerating: false, progress: 0 }));
        return;
      }

      console.error("Generation Error:", e);
      console.error("Error details:", {
        message: e.message,
        stack: e.stack,
        name: e.name
      });
      let userMsg = "生成失败，请检查配置或网络";
      const detailedMsg = e.message || String(e);

      if (detailedMsg.includes("429") || detailedMsg.includes("RESOURCE_EXHAUSTED")) {
        userMsg = "API 配额已用尽。";
      } else if (detailedMsg.includes("API Key") || detailedMsg.includes("Token")) {
        userMsg = "Z-Image API Token 无效或未配置。\n\n请访问 https://modelscope.cn/my/myaccesstoken 获取 API Token，并在高级设置中配置。";
      } else {
        userMsg = detailedMsg.slice(0, 300); // 增加错误信息长度
      }

      setErrorMsg(userMsg);
      setGenerationState(prev => ({ ...prev, isGenerating: false, progress: 0 }));
    } finally {
      clearInterval(interval);
      abortControllerRef.current = null;
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleSave = (url: string | null) => {
    if (url) {
      const link = document.createElement('a');
      link.href = url;
      link.download = `sweater_design_${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleDeleteHistory = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setHistory(prev => prev.filter(item => item.id !== id));
  };

  const handleRestoreFromHistory = (item: HistoryItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setPrompt(item.prompt);
    setSeedInput(item.seed.toString());
    setResolution(item.resolution);
    setIsRandomSeed(false);
    setCurrentView('design');
    // Optional: Load the image into the preview area as well without regenerating?
    setGenerationState(prev => ({
        ...prev,
        imageUrl: item.imageUrl,
        seed: item.seed,
        progress: 100,
        isGenerating: false
    }));
  };

  const getProviderLabel = () => {
      switch(config.apiProvider) {
          case 'zimage': return { name: 'Z-Image-Turbo', icon: <Zap size={10} />, color: 'bg-purple-100 text-purple-700' };
          default: return { name: 'AI', icon: <Zap size={10} />, color: 'bg-gray-100 text-gray-700' };
      }
  };
  
  const providerInfo = getProviderLabel();
  const currentProviderKey = config.keys?.[config.apiProvider];
  const hasKey = !!currentProviderKey;

  const getAspectRatioStyle = () => {
    if (resolution === "1024x1024") return '1/1';
    const [w, h] = resolution.split('x').map(Number);
    if (!isNaN(w) && !isNaN(h)) return `${w}/${h}`;
    return '1/1';
  };

  return (
    <div className="flex h-screen w-full bg-brand-50 text-brand-900 font-sans overflow-hidden">
      
      {/* --- Sidebar (Left) --- */}
      <aside className="w-[360px] flex-shrink-0 flex flex-col border-r border-brand-200 bg-white/50 backdrop-blur-md z-20">
        
        {/* Header */}
        <div className="h-16 flex items-center px-6 border-b border-brand-100 bg-white justify-between flex-shrink-0">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-lg bg-brand-400 flex items-center justify-center text-white mr-3">
              <Palette size={20} />
            </div>
            <h1 className="font-bold text-xl text-brand-800 tracking-tight">AI 毛衣设计师</h1>
          </div>
        </div>

        {/* View Switcher (New) */}
        <div className="px-6 py-4 flex gap-2">
            <button 
              onClick={() => setCurrentView('design')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                currentView === 'design' 
                ? 'bg-brand-100 text-brand-700 shadow-sm ring-1 ring-brand-200' 
                : 'text-gray-500 hover:bg-white hover:text-brand-600'
              }`}
            >
               <Palette size={16} /> 设计工坊
            </button>
            <button 
              onClick={() => setCurrentView('history')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                currentView === 'history' 
                ? 'bg-brand-100 text-brand-700 shadow-sm ring-1 ring-brand-200' 
                : 'text-gray-500 hover:bg-white hover:text-brand-600'
              }`}
            >
               <History size={16} /> 创作历史
            </button>
        </div>

        {/* Scrollable Controls */}
        <div className="flex-1 overflow-y-auto px-6 space-y-8 pb-6 custom-scrollbar">
          
          {/* Categories */}
          <div className="space-y-6">
            <div className="flex flex-col gap-3 mb-2">
              <h2 className="text-sm font-bold uppercase tracking-wider text-brand-400 flex items-center justify-between">
                <span>款式定制</span>
                <span className="text-[10px] bg-brand-50 text-brand-300 px-2 py-0.5 rounded-full border border-brand-100">
                  Step 1
                </span>
              </h2>
              <button 
                onClick={handleRandomize}
                className="w-full text-sm font-medium flex items-center justify-center gap-2 text-white bg-gradient-to-br from-brand-400 to-brand-500 hover:from-brand-500 hover:to-brand-600 shadow-lg shadow-brand-400/30 py-3 px-4 rounded-xl border border-brand-400 transition-all active:scale-95 group"
              >
                <Shuffle size={16} className="group-hover:rotate-180 transition-transform duration-500" /> 随机灵感组合
              </button>
            </div>

            {config.categories.map((cat) => (
              <div key={cat.id} className="space-y-2">
                <label className="text-sm font-semibold text-brand-700">{cat.label}</label>
                <div className="relative">
                  <select
                    value={selections[cat.id] || ''}
                    onChange={(e) => handleSelectionChange(cat.id, e.target.value)}
                    className="w-full appearance-none bg-white border border-brand-200 text-brand-800 py-3 px-4 pr-8 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent shadow-sm transition-all text-sm"
                  >
                    {cat.items.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-brand-400">
                    <ChevronDown size={16} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="h-px bg-brand-200/50 w-full" />

          {/* Technical Settings */}
          <div className="space-y-8">
            <h2 className="text-sm font-bold uppercase tracking-wider text-brand-400 flex items-center justify-between">
              <span>画布设置</span>
              <span className="text-[10px] bg-brand-50 text-brand-300 px-2 py-0.5 rounded-full border border-brand-100">
                Step 2
              </span>
            </h2>
            
            <div className="space-y-2">
              <label className="text-sm font-semibold text-brand-700">画幅尺寸</label>
              <div className="relative">
                <select
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value as Resolution)}
                  className="w-full appearance-none bg-white border border-brand-200 text-brand-800 py-3 px-4 pr-8 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent shadow-sm transition-all text-sm"
                >
                  {RESOLUTIONS.map((res) => (
                    <option key={res.value} value={res.value}>{res.label}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-brand-400">
                  <ChevronDown size={16} />
                </div>
              </div>
            </div>

            <div className="space-y-2">
               <label className="text-sm font-semibold text-brand-700">种子数值 (Seed)</label>
               <div className="flex gap-2">
                 <input
                   type="number"
                   value={seedInput}
                   onChange={(e) => setSeedInput(e.target.value)}
                   disabled={isRandomSeed}
                   className={`flex-1 bg-white border border-brand-200 text-brand-800 py-2 px-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-400 text-sm font-mono ${isRandomSeed ? 'opacity-50' : ''}`}
                 />
                 <button
                   onClick={() => setIsRandomSeed(!isRandomSeed)}
                   className={`px-3 rounded-xl border transition-colors flex items-center gap-2 text-sm ${
                     isRandomSeed 
                     ? 'bg-brand-400 text-white border-brand-400' 
                     : 'bg-white text-brand-600 border-brand-200'
                   }`}
                 >
                   <Shuffle size={14} /> 随机
                 </button>
               </div>
            </div>
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-brand-100 bg-brand-50 flex-shrink-0">
          <div className="flex items-center justify-between mb-3 px-2">
             <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-brand-500 uppercase tracking-wider">Current API</span>
             </div>
             <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${providerInfo.color}`}>
               {providerInfo.icon}
               {providerInfo.name}
             </span>
          </div>
          <button 
            onClick={() => setIsConfigOpen(true)}
            className="w-full py-3 flex items-center justify-center gap-2 text-brand-600 font-medium hover:text-brand-800 hover:bg-brand-100 rounded-xl transition-colors relative group border border-brand-200 bg-white shadow-sm"
          >
            <Settings size={18} /> 
            <span>高级设置</span>
            {!hasKey && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse border-2 border-white"></span>
            )}
          </button>
        </div>
      </aside>

      {/* --- Main Area (Right) --- */}
      <main className="flex-1 flex flex-col h-full relative overflow-hidden">
        
        {currentView === 'design' ? (
          <>
            {/* Canvas / Preview Area */}
            <div className="flex-1 bg-[#FDFBF7] relative flex items-center justify-center p-8 overflow-hidden">
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-30" 
                 style={{ 
                   backgroundImage: 'radial-gradient(#e5e7eb 1px, transparent 1px)', 
                   backgroundSize: '24px 24px' 
                 }}>
              </div>

              <div 
                className="relative bg-white shadow-2xl shadow-brand-200/50 rounded-lg overflow-hidden transition-all duration-500 ease-in-out border border-brand-100 flex items-center justify-center group"
                style={{
                  height: '80%',
                  maxWidth: '90%',
                  aspectRatio: getAspectRatioStyle(),
                }}
              >
                {generationState.imageUrl ? (
                  <img 
                    src={generationState.imageUrl} 
                    alt="Generated Design" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-brand-300 bg-brand-50/50 p-6 text-center">
                     {errorMsg ? (
                       <>
                        <AlertCircle size={64} className="mb-4 text-red-400 opacity-80" />
                        <p className="font-medium text-red-500 max-w-md mb-3">{errorMsg}</p>
                        <button 
                          onClick={() => setIsConfigOpen(true)}
                          className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors border border-red-200 flex items-center gap-2"
                        >
                          <Settings size={14} /> 检查设置
                        </button>
                       </>
                     ) : (
                       <>
                        <ImageIcon size={64} className="mb-4 opacity-50" />
                        <p className="font-medium">准备生成</p>
                        <p className="text-sm mt-2 opacity-70">
                          {selections['style'] ? '已加载设计风格' : '请在左侧配置参数'}
                        </p>
                       </>
                     )}
                  </div>
                )}

                {/* Overlay Loader */}
                {generationState.isGenerating && (
                  <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-10">
                    <Loader2 size={48} className="text-brand-500 animate-spin mb-4" />
                    <div className="w-48 h-2 bg-brand-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-brand-300 to-brand-500 transition-all duration-300"
                        style={{ width: `${generationState.progress}%` }}
                      />
                    </div>
                    <p className="text-brand-600 mt-4 text-sm font-medium animate-pulse">正在编织细节...</p>
                    <p className="text-xs text-brand-400 mt-1">( Async Queue 排队中... )</p>
                    <button
                      onClick={handleCancel}
                      className="mt-6 px-6 py-2 bg-red-100 text-red-600 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors flex items-center gap-2"
                    >
                      <Square size={14} className="fill-current" /> 取消生成
                    </button>
                  </div>
                )}
                
                {/* Action Overlay (Hover) */}
                 {generationState.imageUrl && !generationState.isGenerating && (
                  <div className="absolute bottom-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                     <button 
                      onClick={() => setShowFullScreenImage(generationState.imageUrl)}
                      className="bg-white/90 p-2.5 rounded-xl shadow-lg hover:bg-white text-brand-700 transition-all backdrop-blur"
                      title="全屏查看"
                     >
                       <Maximize2 size={20} />
                     </button>
                     <button 
                      onClick={() => handleSave(generationState.imageUrl)}
                      className="bg-brand-500/90 p-2.5 rounded-xl shadow-lg hover:bg-brand-500 text-white transition-all backdrop-blur"
                      title="保存图片"
                     >
                       <Download size={20} />
                     </button>
                  </div>
                 )}
              </div>
            </div>

            {/* Bottom Control Bar */}
            <div className="h-[280px] bg-white border-t border-brand-200 p-6 flex flex-col gap-4 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)] z-20 flex-shrink-0">
              <div className="flex items-center justify-between mb-1">
                 <h3 className="text-sm font-bold text-brand-400 uppercase tracking-wider flex items-center gap-2">
                   <span>提示词工程</span>
                   <span className="text-[10px] bg-brand-50 text-brand-300 px-2 py-0.5 rounded-full border border-brand-100">Step 3</span>
                 </h3>
                 <span className="text-xs text-gray-400">{prompt.length} chars</span>
              </div>
              <div className="flex-1 flex gap-4 h-full min-h-0">
                <div className="relative flex-1 h-full">
                  <textarea 
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="w-full h-full bg-brand-50/50 border border-brand-200 rounded-xl p-4 text-brand-800 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:bg-white resize-none text-base leading-relaxed"
                    placeholder="您的设计提示词将显示在这里..."
                  />
                </div>
                
                <div className="flex flex-col gap-3 w-48">
                  <button 
                    onClick={handleGenerate}
                    disabled={generationState.isGenerating}
                    className="flex-1 bg-gradient-to-br from-brand-400 to-brand-500 hover:from-brand-500 hover:to-brand-600 text-white rounded-xl font-bold shadow-lg shadow-brand-400/30 flex flex-col items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-70 disabled:pointer-events-none"
                  >
                    {generationState.isGenerating ? (
                      <>
                        <Loader2 size={24} className="animate-spin" />
                        <span className="text-sm">正在生成...</span>
                      </>
                    ) : (
                      <>
                        <Palette size={24} />
                        <span>生成设计图</span>
                      </>
                    )}
                  </button>
                  
                  <button 
                    onClick={() => handleSave(generationState.imageUrl)}
                    disabled={!generationState.imageUrl}
                    className="h-12 border-2 border-brand-200 text-brand-600 font-semibold rounded-xl hover:bg-brand-50 hover:border-brand-300 flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Download size={18} /> 保存结果
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* --- History View --- */
          <div className="flex-1 bg-[#FDFBF7] p-8 overflow-y-auto custom-scrollbar">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center justify-between mb-8">
                 <h2 className="text-2xl font-bold text-brand-800 flex items-center gap-3">
                   <History className="text-brand-500" /> 创作历史
                 </h2>
                 <span className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full border border-gray-200 shadow-sm">
                   本地存储: {history.length} / {MAX_HISTORY_ITEMS}
                 </span>
              </div>
              
              {history.length === 0 ? (
                <div className="text-center py-20 text-gray-400 bg-white rounded-3xl border border-dashed border-gray-200">
                  <History size={64} className="mx-auto mb-4 opacity-30" />
                  <p className="text-lg">暂无历史记录</p>
                  <p className="text-sm mt-2">快去设计工坊生成第一张毛衣设计图吧！</p>
                  <button 
                    onClick={() => setCurrentView('design')}
                    className="mt-6 px-6 py-2 bg-brand-100 text-brand-700 rounded-lg hover:bg-brand-200 transition-colors"
                  >
                    前往设计
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {history.map((item) => (
                    <div key={item.id} className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-gray-100 flex flex-col group">
                       <div 
                         className="relative aspect-square bg-gray-100 cursor-pointer overflow-hidden"
                         onClick={() => setShowFullScreenImage(item.imageUrl)}
                       >
                         <img src={item.imageUrl} alt="History" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                         <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                         <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={(e) => handleDeleteHistory(item.id, e)}
                              className="p-1.5 bg-white/90 text-red-500 rounded-lg hover:bg-red-50"
                              title="删除"
                            >
                              <Trash2 size={14} />
                            </button>
                         </div>
                       </div>
                       <div className="p-4 flex flex-col flex-1">
                          <div className="flex items-center justify-between mb-2">
                             <span className="text-[10px] text-gray-400">{new Date(item.timestamp).toLocaleString()}</span>
                             <span className="text-[10px] font-mono bg-gray-50 px-1.5 py-0.5 rounded text-gray-500">{item.resolution}</span>
                          </div>
                          <p className="text-xs text-gray-600 line-clamp-2 mb-3 flex-1" title={item.prompt}>
                            {item.prompt}
                          </p>
                          <div className="flex gap-2 mt-auto">
                             <button 
                               onClick={(e) => handleRestoreFromHistory(item, e)}
                               className="flex-1 py-2 bg-brand-50 text-brand-700 text-xs font-bold rounded-lg hover:bg-brand-100 transition-colors flex items-center justify-center gap-1"
                             >
                               <Copy size={12} /> 使用此配置
                             </button>
                             <button 
                               onClick={() => handleSave(item.imageUrl)}
                               className="px-3 py-2 bg-gray-50 text-gray-600 text-xs rounded-lg hover:bg-gray-100 transition-colors"
                               title="下载"
                             >
                               <Download size={14} />
                             </button>
                          </div>
                       </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </main>

      {/* Full Screen Modal */}
      {showFullScreenImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setShowFullScreenImage(null)}
        >
          <button 
            className="absolute top-6 right-6 text-white/70 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full z-50"
            onClick={() => setShowFullScreenImage(null)}
          >
            <X size={32} />
          </button>
          <img 
            src={showFullScreenImage} 
            alt="Full Screen Design" 
            className="max-w-full max-h-full object-contain shadow-2xl rounded-lg"
            onClick={(e) => e.stopPropagation()} 
          />
        </div>
      )}

      {/* Modals */}
      <ConfigModal 
        isOpen={isConfigOpen} 
        onClose={() => setIsConfigOpen(false)} 
        config={config}
        onSave={setConfig}
      />
    </div>
  );
};

export default App;