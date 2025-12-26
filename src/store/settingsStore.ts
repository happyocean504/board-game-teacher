import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AIModelType = 'gemini' | 'claude' | 'custom';
export type TTSEngineType = 'aliyun' | 'browser';
export type AliyunVoiceType = 'cherry' | 'ethan' | 'dylan' | 'nofish';

interface AISettings {
  modelType: AIModelType;
  customBaseUrl: string;
  customApiKey: string;
  customModelName: string;
}

interface TTSSettings {
  engine: TTSEngineType;
  aliyunVoice: AliyunVoiceType;
  autoPlay: boolean;
  speechRate: number;
}

interface SettingsState {
  ai: AISettings;
  tts: TTSSettings;
  setAIModelType: (type: AIModelType) => void;
  setCustomAIConfig: (config: Partial<Omit<AISettings, 'modelType'>>) => void;
  setTTSEngine: (engine: TTSEngineType) => void;
  setAliyunVoice: (voice: AliyunVoiceType) => void;
  setAutoPlay: (autoPlay: boolean) => void;
  setSpeechRate: (rate: number) => void;
  // Helper to get the actual API config to use
  getActiveAIConfig: () => { baseUrl: string; apiKey: string; modelName: string };
  getActiveTTSConfig: () => { baseUrl: string; apiKey: string; modelName: string; voice: string };
}

// Built-in configurations
const BUILTIN_AI_CONFIG = {
  gemini: {
    baseUrl: import.meta.env.VITE_AI_BASE_URL || 'https://yunwu.zeabur.app/v1',
    apiKey: import.meta.env.VITE_GEMINI_API_KEY || '',
    modelName: 'gemini-3-flash-preview',
  },
  claude: {
    baseUrl: import.meta.env.VITE_AI_BASE_URL || 'https://yunwu.zeabur.app/v1',
    apiKey: import.meta.env.VITE_CLAUDE_API_KEY || '',
    modelName: 'claude-haiku-4-5-20251001',
  },
};

const ALIYUN_TTS_CONFIG = {
  baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  apiKey: import.meta.env.VITE_ALIYUN_TTS_API_KEY || '',
  modelName: 'qwen3-tts-flash',
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      ai: {
        modelType: 'gemini',
        customBaseUrl: '',
        customApiKey: '',
        customModelName: '',
      },
      tts: {
        engine: 'aliyun',
        aliyunVoice: 'cherry',
        autoPlay: true,
        speechRate: 1.0,
      },
      setAIModelType: (modelType) => 
        set((state) => ({ ai: { ...state.ai, modelType } })),
      setCustomAIConfig: (config) =>
        set((state) => ({ ai: { ...state.ai, ...config } })),
      setTTSEngine: (engine) =>
        set((state) => ({ tts: { ...state.tts, engine } })),
      setAliyunVoice: (aliyunVoice) =>
        set((state) => ({ tts: { ...state.tts, aliyunVoice } })),
      setAutoPlay: (autoPlay) =>
        set((state) => ({ tts: { ...state.tts, autoPlay } })),
      setSpeechRate: (speechRate) =>
        set((state) => ({ tts: { ...state.tts, speechRate } })),
      
      getActiveAIConfig: () => {
        const { ai } = get();
        if (ai.modelType === 'custom') {
          return {
            baseUrl: ai.customBaseUrl,
            apiKey: ai.customApiKey,
            modelName: ai.customModelName,
          };
        }
        return BUILTIN_AI_CONFIG[ai.modelType];
      },
      
      getActiveTTSConfig: () => {
        const { tts } = get();
        // Return Aliyun config regardless of engine choice, caller decides usage
        return {
          ...ALIYUN_TTS_CONFIG,
          voice: tts.aliyunVoice,
        };
      },
    }),
    {
      name: 'boardgame-teacher-settings',
      merge: (persistedState: any, currentState: SettingsState) => {
        // Deep merge to ensure new fields (like speechRate) are added to existing persisted state
        return {
          ...currentState,
          ...persistedState,
          ai: { ...currentState.ai, ...(persistedState.ai || {}) },
          tts: { ...currentState.tts, ...(persistedState.tts || {}) },
        };
      },
    }
  )
);
