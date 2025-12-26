import { useSettingsStore } from '@/store/settingsStore';

export interface TTSResult {
  audioUrl: string;
  duration?: number;
}

export async function generateSpeech(text: string): Promise<TTSResult> {
  const { getActiveTTSConfig, tts } = useSettingsStore.getState();
  const config = getActiveTTSConfig();

  if (tts.engine === 'browser') {
    return generateBrowserSpeech(text);
  } else {
    return generateAliyunSpeech(text, config);
  }
}

function generateBrowserSpeech(text: string): Promise<TTSResult> {
  return new Promise((resolve, reject) => {
    if (!window.speechSynthesis) {
      reject(new Error('Browser TTS not supported'));
      return;
    }

    // Since we can't easily get a Blob from speechSyntehsis without recording it,
    // we will return a special URL scheme or handle it differently in the player.
    // However, to keep the interface consistent, we might need to actually speak it here
    // or return an object that the player knows how to handle.
    // For simplicity in this MVP, let's assume the player component handles "browser-tts" scheme
    // OR we just speak it immediately if it's browser TTS (not ideal for "replay").
    
    // Better approach: Web Speech API doesn't generate an audio file URL. 
    // We will return a marker and handle the actual speaking in the component or a hook.
    resolve({ audioUrl: `browser-tts:${encodeURIComponent(text)}` });
  });
}

async function generateAliyunSpeech(text: string, config: { baseUrl: string; apiKey: string; modelName: string; voice: string }): Promise<TTSResult> {
  try {
    // Aliyun 'qwen3-tts-flash' requires the Native API, not the OpenAI-compatible one.
    // We ignore config.baseUrl (which might be set to the compatible endpoint) and use the native one.
    
    // Use your own Aliyun FC function as proxy
    let endpoint = 'https://tts-service-mzftnveise.cn-chengdu.fcapp.run/tts';
    
    // Handle Proxy for local development (optional, but keeping it direct is fine since FC handles CORS)
    if (import.meta.env.DEV) {
       // You can also use the FC url directly in dev, as it supports CORS now.
       endpoint = 'https://tts-service-mzftnveise.cn-chengdu.fcapp.run/tts';
    }

    // Capitalize voice name (e.g. cherry -> Cherry)
    const voice = config.voice.charAt(0).toUpperCase() + config.voice.slice(1);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.modelName,
        input: {
          text: text,
          voice: voice,
          language_type: 'Chinese',
        },
        parameters: {
          format: 'wav',
        },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Aliyun TTS failed (${response.status}): ${err}`);
    }

    const data = await response.json();
    
    // Native API returns: { output: { task_id: "...", status: "SUCCEEDED", url: "..." }, usage: ... }
    const remoteUrl = data.output?.audio?.url || data.output?.url;
      
    if (remoteUrl) {
      return { audioUrl: remoteUrl };
    } else {
      throw new Error(`Unexpected response from Aliyun TTS: ${JSON.stringify(data)}`);
    }
  } catch (error) {
    console.error('TTS generation failed:', error);
    // Fallback to browser TTS if cloud fails
    console.warn('Falling back to browser TTS');
    return generateBrowserSpeech(text);
  }
}
