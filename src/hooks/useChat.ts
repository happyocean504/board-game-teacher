import { useState, useRef, useEffect } from 'react';
import { Message, createChatCompletion } from '@/services/chatService';
import { generateSpeech } from '@/services/ttsService';
import { useSettingsStore } from '@/store/settingsStore';
import { saveMessages, getMessages, saveAudio, getAudio } from '@/lib/db';

export interface ChatMessage extends Message {
  id: string;
  audioUrl?: string;
  isAudioPlaying?: boolean;
  isAudioGenerating?: boolean;
  hasAudio?: boolean; // Persisted flag
}

export function useChat(gameId: string, ruleText: string | null, ruleImages: string[] | null = null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { tts } = useSettingsStore();
  
  // Audio playback refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Track mounted state to prevent async operations after unmount
  const isMounted = useRef(true);

  // Initialize audio element and cleanup
  useEffect(() => {
    isMounted.current = true;
    audioRef.current = new Audio();
    audioRef.current.onended = () => {
      if (isMounted.current) {
        setMessages(prev => prev.map(m => ({ ...m, isAudioPlaying: false })));
      }
    };
    return () => {
      isMounted.current = false;
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      // Ensure browser TTS also stops on unmount/exit
      window.speechSynthesis.cancel();
    };
  }, []);

  // Sync playback rate when tts.speechRate changes
  useEffect(() => {
    if (audioRef.current) {
      // Fallback to 1.0 if speechRate is undefined (e.g. old persisted state)
      audioRef.current.playbackRate = tts.speechRate || 1.0;
    }
  }, [tts.speechRate]);

  // Load persisted messages
  useEffect(() => {
    if (gameId) {
      getMessages(gameId).then(msgs => {
        if (msgs && msgs.length > 0) {
          setMessages(msgs);
        }
      });
    }
  }, [gameId]);

  // Save messages whenever they change (debounce could be added if needed, but for now direct save is fine)
  useEffect(() => {
    if (gameId && messages.length > 0) {
      saveMessages(gameId, messages);
    }
  }, [gameId, messages]);

  const playAudio = async (messageId: string, text: string, existingAudioUrl?: string) => {
    // Stop any current playback
    if (audioRef.current) {
      audioRef.current.pause();
    }
    window.speechSynthesis.cancel();
    setMessages(prev => prev.map(m => ({ ...m, isAudioPlaying: false })));

    try {
      let url = existingAudioUrl;

      // If we don't have a URL but the message says it has audio (persisted), try to load from DB
      const msg = messages.find(m => m.id === messageId);
      if (!url && msg?.hasAudio) {
        const blob = await getAudio(messageId);
        if (!isMounted.current) return;
        if (blob) {
          url = URL.createObjectURL(blob);
          // Update state with new ephemeral URL
          setMessages(prev => prev.map(m => 
            m.id === messageId ? { ...m, audioUrl: url } : m
          ));
        }
      }

      // If still no URL, generate new audio
      if (!url) {
        // Set generating state
        setMessages(prev => prev.map(m => 
          m.id === messageId ? { ...m, isAudioGenerating: true } : m
        ));

        const result = await generateSpeech(text);
        if (!isMounted.current) return;
        url = result.audioUrl;
        
        // Save url to message state and clear generating flag
        // If it's not browser TTS, fetch the blob and save to DB
        let savedToDb = false;
        if (!url.startsWith('browser-tts:')) {
           try {
             const response = await fetch(url);
             if (!isMounted.current) return;
             const blob = await response.blob();
             if (!isMounted.current) return;
             await saveAudio(messageId, blob);
             savedToDb = true;
           } catch (e) {
             console.error("Failed to save audio blob", e);
           }
        }
        
        if (!isMounted.current) return;

        setMessages(prev => prev.map(m => 
          m.id === messageId ? { ...m, audioUrl: url, hasAudio: savedToDb || m.hasAudio, isAudioGenerating: false } : m
        ));
      }

      if (url) {
        if (!isMounted.current) return;

        if (url.startsWith('browser-tts:')) {
          // Browser native TTS
          const utterance = new SpeechSynthesisUtterance(decodeURIComponent(url.split(':')[1]));
          const baseRate = tts.speechRate || 1.0;
          // Apply aggressive scaling for browser TTS to make speed changes more noticeable
          // Formula: 1.0 -> 1.0, 1.5 -> 2.0, 2.0 -> 3.0
          utterance.rate = baseRate === 1.0 ? 1.0 : 1.0 + (baseRate - 1.0) * 2.0;
          
          utterance.onend = () => {
             if (isMounted.current) {
                setMessages(prev => prev.map(m => ({ ...m, isAudioPlaying: false })));
             }
          };
          window.speechSynthesis.cancel(); // Stop previous
          window.speechSynthesis.speak(utterance);
          setMessages(prev => prev.map(m => 
            m.id === messageId ? { ...m, isAudioPlaying: true } : m
          ));
        } else {
          // Audio file URL
          if (audioRef.current) {
            audioRef.current.src = url;
            audioRef.current.playbackRate = tts.speechRate || 1.0; // Apply rate with fallback
            await audioRef.current.play();
            setMessages(prev => prev.map(m => 
              m.id === messageId ? { ...m, isAudioPlaying: true } : m
            ));
          }
        }
      }
    } catch (error) {
      console.error('Audio playback failed', error);
      if (isMounted.current) {
          setMessages(prev => prev.map(m => ({ 
            ...m, 
            isAudioPlaying: false,
            isAudioGenerating: false // Ensure flag is cleared on error
          })));
      }
    }
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    window.speechSynthesis.cancel();
    setMessages(prev => prev.map(m => ({ ...m, isAudioPlaying: false })));
  };

  const clearMessages = async () => {
    stopAudio();
    setMessages([]);
    if (gameId) {
      await saveMessages(gameId, []);
    }
  };

  const sendMessage = async (content: string, hidden: boolean = false, forceClear: boolean = false) => {
    if (!ruleText && (!ruleImages || ruleImages.length === 0)) return;

    if (forceClear) {
      stopAudio();
      if (gameId) {
        await saveMessages(gameId, []);
      }
    }

    const newUserMsg: ChatMessage = { 
      id: Date.now().toString(), 
      role: 'user', 
      content 
    };
    
    // Determine base messages (ignore current state if forceClear)
    const baseMessages = forceClear ? [] : messages;
    
    let updatedMessages = [...baseMessages];
    if (!hidden) {
      updatedMessages = [...updatedMessages, newUserMsg];
      setMessages(updatedMessages);
    } else {
       // If hidden, we don't add to state, but we might need it for context if not forceClear
       // If forceClear is true, context is just this message.
    }

    setIsLoading(true);

    const aiMsgId = (Date.now() + 1).toString();
    const newAiMsg: ChatMessage = { 
      id: aiMsgId, 
      role: 'assistant', 
      content: '' 
    };
    
    // Update state with AI placeholder
    // If hidden, we append to baseMessages (which might be empty if forceClear)
    // If not hidden, we already updated state to updatedMessages, so we append to that.
    // Actually, setMessages should always use the calculated list to avoid closure issues?
    // But updatedMessages is local.
    
    const messagesWithAi = hidden 
        ? [...baseMessages, newAiMsg] 
        : [...updatedMessages, newAiMsg];
        
    setMessages(messagesWithAi);

    let fullResponse = '';

    try {
      // Prepare context for AI
      const contextMessages = baseMessages.map(({ role, content }) => ({ role, content }));
      // Always add the current user prompt to the context sent to AI
      contextMessages.push({ role: 'user', content });

      const stream = await createChatCompletion(
        contextMessages,
        ruleText || ruleImages!
      );

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullResponse += content;
          setMessages(prev => prev.map(m => 
            m.id === aiMsgId ? { ...m, content: fullResponse } : m
          ));
        }
      }

      // After full response, generate audio if auto-play is on
      if (tts.autoPlay && fullResponse) {
        playAudio(aiMsgId, fullResponse);
      }

    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages(prev => prev.map(m => 
        m.id === aiMsgId ? { ...m, content: '抱歉，我出了一点小问题，请重试。' } : m
      ));
    } finally {
      setIsLoading(false);
    }
  };

  return {
    messages,
    isLoading,
    sendMessage,
    playAudio,
    stopAudio,
    clearMessages
  };
}
