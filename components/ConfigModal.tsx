import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Trash2, GripVertical, Layers, Key, CheckCircle, AlertTriangle, Cpu, Settings2, Zap, Cloud, Link, Loader2, Play } from 'lucide-react';
import { Config, Category, ApiProvider, VerificationStatus } from '../types';
import { DEFAULT_CONFIG } from '../constants';
import { verifyConnection } from '../services/generationService';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: Config;
  onSave: (newConfig: Config) => void;
}

// --- Mini Tooltip Component (Simulating win.ui.tooltip) ---
const Tooltip: React.FC<{ text: string; children: React.ReactNode }> = ({ text, children }) => {
  const [show, setShow] = useState(false);
  return (
    <div 
      className="relative flex items-center" 
      onMouseEnter={() => setShow(true)} 
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div className="absolute left-full ml-2 px-2 py-1 bg-brand-800 text-white text-xs rounded shadow-lg z-50 whitespace-nowrap animate-in fade-in zoom-in-95 duration-100 pointer-events-none">
          {text}
          {/* Arrow */}
          <div className="absolute top-1/2 -left-1 -mt-1 border-4 border-transparent border-r-brand-800" />
        </div>
      )}
    </div>
  );
};

const ConfigModal: React.FC<ConfigModalProps> = ({ isOpen, onClose, config, onSave }) => {
  const [localConfig, setLocalConfig] = useState<Config>(JSON.parse(JSON.stringify(config)));
  const [activeTab, setActiveTab] = useState<'categories' | 'env'>('categories');
  const [selectedCatIndex, setSelectedCatIndex] = useState<number>(0);
  const [newCatName, setNewCatName] = useState('');
  const [newItemName, setNewItemName] = useState('');
  
  // Verification State
  const [verifying, setVerifying] = useState<Record<string, VerificationStatus>>({});
  const [verifyMsg, setVerifyMsg] = useState<Record<string, string>>({}); // Store specific error messages
  const [saveIndicator, setSaveIndicator] = useState(false); // Show save indicator

  // Drag state
  const [draggedCatIndex, setDraggedCatIndex] = useState<number | null>(null);
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);

  // Reset local config when modal opens
  useEffect(() => {
    if (isOpen) {
        const mergedConfig = JSON.parse(JSON.stringify(config));
        // Ensure objects exist
        if (!mergedConfig.keys) mergedConfig.keys = {};
        if (!mergedConfig.endpoints) mergedConfig.endpoints = {};
        if (!mergedConfig.models) mergedConfig.models = {};
        if (!mergedConfig.corsProxies) mergedConfig.corsProxies = {};

        // Reset to zimage if old provider is detected
        if (mergedConfig.apiProvider && mergedConfig.apiProvider !== 'zimage') {
            mergedConfig.apiProvider = 'zimage';
        }

        // Ensure default proxy if missing
        if (!mergedConfig.corsProxy && mergedConfig.corsProxy !== '') {
            mergedConfig.corsProxy = DEFAULT_CONFIG.corsProxy;
        }

        setLocalConfig(mergedConfig);
        setVerifying({});
        setVerifyMsg({});
    }
  }, [isOpen, config]);

  // Handle click outside to close
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // --- Handlers ---
  
  const handleVerify = async (provider: ApiProvider) => {
      const key = localConfig.keys[provider];
      if (!key) return;

      setVerifying(prev => ({ ...prev, [provider]: 'verifying' }));
      setVerifyMsg(prev => ({ ...prev, [provider]: '' }));
      
      const endpoint = localConfig.endpoints[provider];
      const result = await verifyConnection(provider, key, endpoint, localConfig.corsProxy);
      
      setVerifying(prev => ({ ...prev, [provider]: result.success ? 'success' : 'error' }));
      if (!result.success && result.message) {
          setVerifyMsg(prev => ({ ...prev, [provider]: result.message || '' }));
      }
  };

  const handleKeyChange = (provider: ApiProvider, val: string) => {
      const newConfig = {
          ...localConfig,
          keys: { ...localConfig.keys, [provider]: val }
      };
      setLocalConfig(newConfig);
      setVerifying(prev => ({ ...prev, [provider]: 'idle' }));
      setVerifyMsg(prev => ({ ...prev, [provider]: '' }));
      handleAutoSave(newConfig);
  };

  const handleStepsChange = (val: number) => {
      const newConfig = { ...localConfig, steps: val };
      setLocalConfig(newConfig);
      handleAutoSave(newConfig);
  };

  const handleTimeShiftChange = (val: number) => {
      const newConfig = { ...localConfig, timeShift: val };
      setLocalConfig(newConfig);
      handleAutoSave(newConfig);
  };

  const handleAddCategory = () => {
    if (!newCatName.trim()) return;
    const newCat: Category = {
      id: `cat_${Date.now()}`,
      label: newCatName,
      items: []
    };
    setLocalConfig(prev => ({
      ...prev,
      categories: [...prev.categories, newCat]
    }));
    setNewCatName('');
    setSelectedCatIndex(localConfig.categories.length); // Select the new one
  };

  const handleDeleteCategory = (index: number) => {
    const newCats = [...localConfig.categories];
    newCats.splice(index, 1);
    setLocalConfig(prev => ({ ...prev, categories: newCats }));
    if (selectedCatIndex >= newCats.length) {
      setSelectedCatIndex(Math.max(0, newCats.length - 1));
    }
  };

  const handleAddItem = () => {
    if (!newItemName.trim() || localConfig.categories.length === 0) return;
    const newCats = [...localConfig.categories];
    newCats[selectedCatIndex].items.push(newItemName);
    setLocalConfig(prev => ({ ...prev, categories: newCats }));
    setNewItemName('');
  };

  const handleDeleteItem = (itemIndex: number) => {
    const newCats = [...localConfig.categories];
    newCats[selectedCatIndex].items.splice(itemIndex, 1);
    setLocalConfig(prev => ({ ...prev, categories: newCats }));
  };

  const handleSave = () => {
    onSave(localConfig);
    onClose();
  };

  const handleAutoSave = (newConfig?: Config) => {
    if (newConfig) {
      onSave(newConfig);
      // Show save indicator
      setSaveIndicator(true);
      setTimeout(() => setSaveIndicator(false), 2000);
    } else {
      // Use a small delay to ensure state has been updated
      setTimeout(() => {
        onSave(localConfig);
        setSaveIndicator(true);
        setTimeout(() => setSaveIndicator(false), 2000);
      }, 10);
    }
  };

  // Drag & Drop (Categories/Items)
  const handleCatDragStart = (index: number) => { setDraggedCatIndex(index); };
  const handleCatDragOver = (e: React.DragEvent) => { e.preventDefault(); };
  const handleCatDrop = (dropIndex: number) => {
    if (draggedCatIndex === null || draggedCatIndex === dropIndex) return;
    const newCats = [...localConfig.categories];
    const [movedCat] = newCats.splice(draggedCatIndex, 1);
    newCats.splice(dropIndex, 0, movedCat);
    if (selectedCatIndex === draggedCatIndex) setSelectedCatIndex(dropIndex);
    else if (selectedCatIndex > draggedCatIndex && selectedCatIndex <= dropIndex) setSelectedCatIndex(selectedCatIndex - 1);
    else if (selectedCatIndex < draggedCatIndex && selectedCatIndex >= dropIndex) setSelectedCatIndex(selectedCatIndex + 1);
    setLocalConfig(prev => ({ ...prev, categories: newCats }));
    setDraggedCatIndex(null);
  };

  const handleItemDragStart = (index: number) => { setDraggedItemIndex(index); };
  const handleItemDragOver = (e: React.DragEvent) => { e.preventDefault(); };
  const handleItemDrop = (dropIndex: number) => {
    if (draggedItemIndex === null || draggedItemIndex === dropIndex) return;
    const newCats = [...localConfig.categories];
    const items = [...newCats[selectedCatIndex].items];
    const [movedItem] = items.splice(draggedItemIndex, 1);
    items.splice(dropIndex, 0, movedItem);
    newCats[selectedCatIndex].items = items;
    setLocalConfig(prev => ({ ...prev, categories: newCats }));
    setDraggedItemIndex(null);
  };

  const activeCategory = localConfig.categories[selectedCatIndex];

  const activeProviderId = localConfig.apiProvider;
  const getProviderMeta = () => {
     return { label: 'Z-Image-Turbo', desc: '魔搭ModelScope (免费)', url: 'https://modelscope.cn/my/myaccesstoken' };
  };
  const providerMeta = getProviderMeta();
  const currentKey = localConfig.keys[activeProviderId] || '';
  const verifyState = verifying[activeProviderId] || 'idle';
  const verifyError = verifyMsg[activeProviderId];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div ref={modalRef} className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[650px] flex flex-col overflow-hidden border border-brand-100 font-sans">

        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-brand-100 bg-brand-50/50">
          <div className="flex items-center gap-2 text-brand-800">
            <Settings2 size={20} className="text-brand-500" />
            <span className="font-bold text-lg tracking-tight">高级设置</span>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-brand-100 rounded-full transition-colors text-brand-500">
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex flex-1 overflow-hidden">

          {/* --- Sidebar (Simplified) --- */}
          <div className="w-60 bg-brand-50/50 border-r border-brand-200 flex flex-col py-4 overflow-y-auto custom-scrollbar select-none">

             {/* Section: Configuration */}
             <div className="mb-2">
                 <button
                    onClick={() => setActiveTab('categories')}
                    className={`w-full flex items-center gap-3 px-6 py-2.5 text-sm font-medium transition-colors border-l-4 ${
                      activeTab === 'categories'
                      ? 'border-brand-500 text-brand-700 bg-white'
                      : 'border-transparent text-brand-600 hover:bg-white hover:text-brand-900'
                    }`}
                 >
                    <Layers size={16} />
                    <span>分类标签</span>
                 </button>
             </div>

             {/* Section: Environment */}
             <div>
                 <button
                    onClick={() => setActiveTab('env')}
                    className={`w-full flex items-center gap-3 px-6 py-2.5 text-sm font-medium transition-colors border-l-4 ${
                      activeTab === 'env'
                      ? 'border-brand-500 text-brand-700 bg-white'
                      : 'border-transparent text-brand-600 hover:bg-white hover:text-brand-900'
                    }`}
                 >
                    <Cloud size={16} />
                    <span>接口配置</span>
                 </button>
             </div>
          </div>

          {/* --- Right Panel --- */}
          <div className="flex-1 flex overflow-hidden bg-white relative">
            
            {/* Tab: Categories */}
            {activeTab === 'categories' && (
              <div className="flex w-full h-full">
                {/* Categories List */}
                <div className="w-1/3 border-r border-brand-100 flex flex-col bg-brand-50/30">
                  <div className="p-3 border-b border-brand-100 flex gap-2 items-center">
                      <input
                        type="text"
                        value={newCatName}
                        onChange={(e) => setNewCatName(e.target.value)}
                        placeholder="新建分类..."
                        className="flex-1 min-w-0 px-3 py-2.5 h-10 rounded-md border border-brand-200 focus:outline-none focus:ring-1 focus:ring-brand-400 text-sm"
                        onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                      />
                      <button
                        onClick={handleAddCategory}
                        disabled={!newCatName.trim()}
                        className="w-10 h-10 flex items-center justify-center bg-white border border-brand-200 text-brand-600 rounded-md hover:bg-brand-100 transition-colors"
                      >
                        <Plus size={16} />
                      </button>
                  </div>
                  <div className="overflow-y-auto flex-1 p-2 space-y-1 custom-scrollbar">
                    {localConfig.categories.map((cat, idx) => (
                      <div
                        key={cat.id}
                        draggable
                        onDragStart={() => handleCatDragStart(idx)}
                        onDragOver={handleCatDragOver}
                        onDrop={() => handleCatDrop(idx)}
                        onClick={() => setSelectedCatIndex(idx)}
                        className={`flex justify-between items-center px-3 py-2.5 h-10 rounded-md cursor-pointer transition-all group/item ${
                          idx === selectedCatIndex ? 'bg-white shadow-sm ring-1 ring-brand-200' : 'hover:bg-white'
                        } ${draggedCatIndex === idx ? 'opacity-40 border-dashed border border-brand-400' : ''}`}
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <GripVertical size={12} className="text-brand-300 cursor-move opacity-0 group-hover/item:opacity-100 transition-opacity" />
                          <span className="font-medium text-brand-700 truncate text-sm">{cat.label}</span>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteCategory(idx); }}
                          className="text-brand-300 hover:text-red-500 opacity-0 group-hover/item:opacity-100 transition-opacity"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Items List */}
                <div className="w-2/3 flex flex-col bg-white">
                  <div className="p-3 border-b border-brand-100 flex justify-between items-center bg-brand-50/50">
                    <span className="text-sm font-bold text-brand-500 uppercase tracking-wide">{activeCategory?.label || '未选择'}</span>
                    <div className="flex gap-2 items-center w-1/2">
                      <input
                        type="text"
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        placeholder="添加选项..."
                        disabled={!activeCategory}
                        className="flex-1 min-w-0 px-3 py-2.5 h-10 rounded-md border border-brand-200 focus:outline-none focus:ring-1 focus:ring-brand-400 text-sm"
                        onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                      />
                      <button
                        onClick={handleAddItem}
                        disabled={!activeCategory || !newItemName.trim()}
                        className="w-10 h-10 flex items-center justify-center bg-white border border-brand-200 text-brand-600 rounded-md hover:bg-brand-100 transition-colors disabled:opacity-50"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="overflow-y-auto flex-1 p-3 custom-scrollbar">
                    {activeCategory ? (
                      <div className="grid grid-cols-2 gap-2">
                        {activeCategory.items.map((item, idx) => (
                          <div
                            key={idx}
                            draggable
                            onDragStart={() => handleItemDragStart(idx)}
                            onDragOver={handleItemDragOver}
                            onDrop={() => handleItemDrop(idx)}
                            className={`flex justify-between items-center px-3 py-2.5 h-10 rounded border border-brand-100 bg-brand-50 group hover:border-brand-200 hover:bg-brand-50/50 transition-colors cursor-move ${
                              draggedItemIndex === idx ? 'opacity-40 border-dashed border border-brand-400' : ''
                            }`}
                          >
                            <span className="text-brand-700 select-none truncate text-sm">{item}</span>
                            <button
                              onClick={() => handleDeleteItem(idx)}
                              className="text-brand-300 hover:text-red-500 opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full text-brand-300 text-sm">
                        选择左侧分类进行编辑
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Environment - Simplified for Z-Image Only */}
            {activeTab === 'env' && (
               <div className="flex-1 flex flex-col bg-white overflow-hidden w-full">
                 <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                   <div className="max-w-2xl mx-auto space-y-8">

                     {/* Header Area */}
                     <div className="flex items-start justify-between border-b border-brand-100 pb-6">
                        <div className="flex gap-4">
                           <div className={`p-3 rounded-xl shadow-sm ${verifyState === 'success' ? 'bg-green-50 text-green-600' : 'bg-brand-50 text-brand-600'}`}>
                             {verifyState === 'verifying' ? <Loader2 className="animate-spin" size={32} /> : <Cpu size={32} />}
                           </div>
                           <div>
                             <h3 className="font-bold text-xl text-brand-800">{providerMeta.label}</h3>
                             <p className="text-sm text-brand-500 mt-1">{providerMeta.desc}</p>
                           </div>
                        </div>
                        <a
                          href={providerMeta.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-brand-600 hover:text-brand-800 flex items-center gap-1 bg-brand-50 px-3 py-1.5 rounded-full border border-brand-100 hover:bg-brand-100 transition-colors"
                        >
                          <Link size={12} /> 获取凭证
                        </a>
                     </div>

                     {/* Credentials */}
                     <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <label className="text-sm font-semibold text-brand-700 flex items-center gap-2">
                               <Key size={16} className="text-brand-400" /> API Key / Token
                            </label>
                            {verifyState === 'success' && <span className="text-xs text-green-600 flex items-center gap-1 bg-green-50 px-2 py-0.5 rounded"><CheckCircle size={10} /> 已连接</span>}
                        </div>

                        <div className="flex flex-col gap-2">
                          <div className="flex gap-2">
                            <div className="relative flex-1 group">
                               <input
                                  type="password"
                                  value={currentKey}
                                  onChange={(e) => handleKeyChange(activeProviderId, e.target.value)}
                                  placeholder={`请输入 ${activeProviderId} 的密钥...`}
                                  className={`w-full pl-4 pr-10 py-3 rounded-lg border bg-white focus:outline-none focus:ring-2 focus:ring-offset-1 text-sm font-mono transition-all ${
                                     verifyState === 'error'
                                     ? 'border-red-300 focus:ring-red-200 bg-red-50/30'
                                     : verifyState === 'success'
                                       ? 'border-green-300 focus:ring-green-200 bg-green-50/30'
                                       : 'border-brand-200 focus:ring-brand-400'
                                  }`}
                               />
                            </div>
                            <button
                              onClick={() => handleVerify(activeProviderId)}
                              disabled={!currentKey || verifyState === 'verifying'}
                              className={`px-5 rounded-lg font-medium text-sm flex items-center gap-2 transition-all flex-shrink-0 shadow-sm active:scale-95 ${
                                verifyState === 'success'
                                ? 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-200'
                                : 'bg-gradient-to-br from-brand-400 to-brand-500 hover:from-brand-500 hover:to-brand-600 text-white disabled:opacity-50 disabled:cursor-not-allowed'
                              }`}
                            >
                               {verifyState === 'verifying' ? <Loader2 className="animate-spin" size={16} /> : <Play size={16} />}
                               测试
                            </button>
                          </div>

                          {/* Error Message Display */}
                          {verifyState === 'error' && verifyError && (
                             <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">
                                <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                                <span className="leading-relaxed">{verifyError}</span>
                             </div>
                          )}
                        </div>
                     </div>

                     {/* Z-Image Params */}
                     {activeProviderId === 'zimage' && (
                            <div className="bg-brand-50 rounded-xl p-5 border border-brand-100 space-y-4">
                               <div className="flex items-center gap-2 text-brand-800">
                                  <Settings2 size={18} />
                                  <h4 className="font-bold text-sm">高级参数</h4>
                               </div>
                               <div className="grid grid-cols-2 gap-4">
                                  <div>
                                     <label className="text-xs text-brand-500 mb-1 block">迭代步数 (Steps: {localConfig.steps || 8})</label>
                                     <input
                                      type="range" min="1" max="50"
                                      value={localConfig.steps || 8}
                                      onChange={(e) => handleStepsChange(parseInt(e.target.value))}
                                      className="w-full h-1.5 bg-brand-200 rounded-lg appearance-none cursor-pointer accent-brand-500"
                                     />
                                  </div>
                                  <div>
                                     <label className="text-xs text-brand-500 mb-1 block">时间偏移 (Shift: {localConfig.timeShift || 3.0})</label>
                                     <input
                                      type="number" step="0.1"
                                      value={localConfig.timeShift || 3.0}
                                      onChange={(e) => handleTimeShiftChange(parseFloat(e.target.value))}
                                      className="w-full px-2 py-1 rounded border border-brand-200 text-xs"
                                     />
                                  </div>
                               </div>
                            </div>
                        )}

                   </div>
                 </div>
               </div>
            )}

          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-brand-100 bg-brand-50 flex justify-between items-center">
          <div className="text-xs text-brand-400">
             {activeTab === 'env' && verifyState === 'success' && <span className="text-green-600 flex items-center gap-1"><CheckCircle size={12}/> 配置有效</span>}
          </div>
          <div className={`text-xs flex items-center gap-1 transition-colors ${saveIndicator ? 'text-green-600' : 'text-brand-300'}`}>
            {saveIndicator && <CheckCircle size={12} className="animate-in zoom-in duration-200" />}
            配置已自动保存
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfigModal;