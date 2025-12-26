import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { useSettingsStore, AIModelType, TTSEngineType, AliyunVoiceType } from '@/store/settingsStore';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { 
    ai, 
    tts, 
    setAIModelType, 
    setCustomAIConfig, 
    setTTSEngine, 
    setAliyunVoice,
    setAutoPlay 
  } = useSettingsStore();

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="flex items-center justify-between p-4 bg-white shadow-sm sticky top-0 z-10">
        <div className="flex items-center">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-full hover:bg-gray-100"
          >
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <h1 className="text-xl font-bold text-gray-800 ml-2">设置</h1>
        </div>
      </header>

      <main className="flex-1 p-4 space-y-6 overflow-y-auto">
        {/* AI Config */}
        <section className="bg-white p-4 rounded-xl shadow-sm space-y-4">
          <h2 className="font-semibold text-gray-800 border-b pb-2 flex items-center gap-2">
            <span>对话模型</span>
            <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">核心设置</span>
          </h2>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-600">选择模型</label>
            <div className="grid grid-cols-1 gap-2">
              {[
                { id: 'gemini', name: 'Gemini 3 Flash', tag: '推荐' },
                { id: 'claude', name: 'Claude Haiku 4.5', tag: '智能' },
                { id: 'custom', name: '自定义模型', tag: '' },
              ].map((option) => (
                <button
                  key={option.id}
                  onClick={() => setAIModelType(option.id as AIModelType)}
                  className={`flex items-center justify-between p-3 rounded-lg border text-left transition-all ${
                    ai.modelType === option.id 
                      ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' 
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <span className={`font-medium ${ai.modelType === option.id ? 'text-blue-700' : 'text-gray-700'}`}>
                    {option.name}
                  </span>
                  {option.tag && (
                    <span className="text-xs bg-white text-gray-500 px-2 py-1 rounded border border-gray-100">
                      {option.tag}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {ai.modelType === 'custom' && (
            <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-top-2">
              <div className="p-3 bg-yellow-50 text-yellow-800 text-sm rounded-lg border border-yellow-100">
                您正在使用自定义配置，请确保您的 API 格式兼容 OpenAI 标准。
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-600">Base URL</label>
                <input 
                  type="text" 
                  value={ai.customBaseUrl}
                  onChange={(e) => setCustomAIConfig({ customBaseUrl: e.target.value })}
                  placeholder="https://api.example.com/v1" 
                  className="w-full p-2 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-600">API Key</label>
                <input 
                  type="password" 
                  value={ai.customApiKey}
                  onChange={(e) => setCustomAIConfig({ customApiKey: e.target.value })}
                  placeholder="sk-..." 
                  className="w-full p-2 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-600">模型名称</label>
                <input 
                  type="text" 
                  value={ai.customModelName}
                  onChange={(e) => setCustomAIConfig({ customModelName: e.target.value })}
                  placeholder="gpt-4o" 
                  className="w-full p-2 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
                />
              </div>
            </div>
          )}
        </section>

        {/* TTS Config */}
        <section className="bg-white p-4 rounded-xl shadow-sm space-y-4">
          <h2 className="font-semibold text-gray-800 border-b pb-2">语音设置</h2>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-600">TTS 引擎</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setTTSEngine('aliyun')}
                className={`p-3 rounded-lg border text-center transition-all ${
                  tts.engine === 'aliyun'
                    ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500 text-blue-700 font-medium'
                    : 'border-gray-200 text-gray-600 hover:border-blue-300'
                }`}
              >
                阿里云 TTS (推荐)
              </button>
              <button
                onClick={() => setTTSEngine('browser')}
                className={`p-3 rounded-lg border text-center transition-all ${
                  tts.engine === 'browser'
                    ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500 text-blue-700 font-medium'
                    : 'border-gray-200 text-gray-600 hover:border-blue-300'
                }`}
              >
                浏览器原生
              </button>
            </div>
          </div>

          {tts.engine === 'aliyun' && (
            <div className="space-y-2 pt-2 animate-in fade-in slide-in-from-top-2">
              <label className="text-sm font-medium text-gray-600">音色选择</label>
              <select 
                value={tts.aliyunVoice}
                onChange={(e) => setAliyunVoice(e.target.value as AliyunVoiceType)}
                className="w-full p-2 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="cherry">Cherry (女声)</option>
                <option value="ethan">Ethan (男声)</option>
                <option value="dylan">Dylan (北京腔)</option>
                <option value="nofish">Nofish (台湾腔)</option>
              </select>
            </div>
          )}
          
          <div className="flex items-center justify-between pt-2 border-t border-gray-100 mt-2">
            <span className="text-sm font-medium text-gray-600">AI 回复自动播放</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={tts.autoPlay} 
                onChange={(e) => setAutoPlay(e.target.checked)}
                className="sr-only peer" 
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </section>
        
        <div className="text-center text-xs text-gray-400 py-4">
          所有设置将自动保存至本地
        </div>
      </main>
    </div>
  );
}
