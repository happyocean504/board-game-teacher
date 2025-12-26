import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, FileText, Plus, Mic, Send, Play, Pause, Square, Loader2, Trash2 } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import { getFile, deleteGameData } from '@/lib/db';
import { extractTextFromPdf, convertPdfToImages } from '@/lib/pdfUtils';
import { useChat } from '@/hooks/useChat';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import PdfViewer from './PdfViewer';
import { useSettingsStore } from '@/store/settingsStore';
import { clsx } from 'clsx';

export default function ExplanationPage() {
  const navigate = useNavigate();
  const { gameId } = useParams<{ gameId: string }>();
  // Use global settings for speed
  const { tts, setSpeechRate } = useSettingsStore();
  
  const [showPdf, setShowPdf] = useState(false);
  const [pdfFile, setPdfFile] = useState<Blob | null>(null);
  const [ruleText, setRuleText] = useState<string | null>(null);
  const [ruleImages, setRuleImages] = useState<string[] | null>(null);
  const [inputText, setInputText] = useState('');

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const { getGame, updateGame, deleteGame } = useGameStore();
  const game = getGame(gameId || '');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize editedTitle when game loads
  useEffect(() => {
    if (game) setEditedTitle(game.name);
  }, [game]);

  // Initialize Hooks
  // Pass gameId (defaulting to empty string if undefined to satisfy types, though it should exist)
  const { messages, isLoading, sendMessage, playAudio, stopAudio, clearMessages } = useChat(gameId || '', ruleText, ruleImages);
  const { isListening, transcript, startListening, stopListening, setTranscript } = useSpeechRecognition();

  // Sync speech transcript to input
  useEffect(() => {
    if (transcript) {
      setInputText(prev => prev + transcript);
      setTranscript(''); // Clear after appending
    }
  }, [transcript, setTranscript]);

  // Load File & Extract Text
  useEffect(() => {
    if (gameId) {
      getFile(gameId).then(async (file) => {
        if (file) {
          setPdfFile(file);
          try {
            const text = await extractTextFromPdf(file);
            // Check if text is valid (not empty or just headers)
            // A typical rulebook page has > 100 chars. If total < 200 chars, it's likely scanned images.
            const cleanText = text.replace(/--- Page \d+ ---/g, '').trim();
            
            if (cleanText.length < 200) {
               console.log(`Text too short (${cleanText.length} chars), switching to image mode`);
               const images = await convertPdfToImages(file);
               setRuleImages(images);
               setRuleText(null);
            } else {
               setRuleText(text);
               setRuleImages(null);
            }
          } catch (e) {
            console.error("Text extraction failed, trying image conversion", e);
            try {
               const images = await convertPdfToImages(file);
               setRuleImages(images);
               setRuleText(null);
            } catch (imgError) {
               console.error("Image conversion failed", imgError);
               setRuleText("无法提取规则文本，请尝试重新上传或直接提问。");
            }
          }
        }
      });
    }
  }, [gameId]);

  // Scroll to bottom only when new messages arrive or content updates (streaming)
  // We avoid scrolling when just toggling audio playback state
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, messages[messages.length - 1]?.content]);

  const handleSend = () => {
    if (!inputText.trim() || isLoading) return;
    sendMessage(inputText);
    setInputText('');
  };

  const handleQuickAction = (action: string) => {
    if (isLoading) return;
    sendMessage(action);
  };

  const handleTitleSave = () => {
    if (gameId && editedTitle.trim()) {
      updateGame(gameId, { name: editedTitle.trim() });
      setIsEditingTitle(false);
    } else {
      setEditedTitle(game?.name || '');
      setIsEditingTitle(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!gameId) return;
    try {
      // 1. Delete data from DB
      await deleteGameData(gameId);
      // 2. Delete from store
      deleteGame(gameId);
      // 3. Navigate home
      navigate('/', { replace: true });
    } catch (error) {
      console.error("Failed to delete game:", error);
      setShowDeleteConfirm(false);
    }
  };

  const handleStartExplanation = () => {
    if (isLoading) return;
    sendMessage('讲解规则', true);
  };

  const handleRestart = async () => {
    setShowResetConfirm(false); 
    // No need to call clearMessages() separately as sendMessage now handles forceClear
    sendMessage('讲解规则', true, true); 
  };


  if (!game) return null;

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="flex items-center justify-between p-3 bg-white shadow-sm z-10">
        <div className="flex items-center gap-2 overflow-hidden flex-1 mr-2">
          <button onClick={() => navigate('/')} className="p-2 -ml-2 flex-shrink-0">
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {isEditingTitle ? (
              <input
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={(e) => e.key === 'Enter' && handleTitleSave()}
                autoFocus
                className="text-lg font-bold text-gray-800 bg-gray-50 border border-blue-300 rounded px-2 py-1 w-[66%] focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <h1 
                onClick={() => setIsEditingTitle(true)}
                className="text-lg font-bold text-gray-800 truncate cursor-pointer hover:bg-gray-50 px-2 py-1 rounded border border-transparent hover:border-gray-200 transition-colors max-w-[66%]"
                title="点击修改名称"
              >
                {game.name}
              </h1>
            )}
            
            <button 
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-full relative flex-shrink-0"
              title="删除规则"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setShowPdf(true)}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-full relative"
          >
            <FileText className="w-5 h-5" />
            {pdfFile && <span className="absolute top-2 right-2 w-2 h-2 bg-green-500 rounded-full border border-white"></span>}
          </button>
          
          <select
            value={tts.speechRate || 1.0}
            onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
            className="px-2 py-1 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg ml-1 border-none outline-none focus:ring-2 focus:ring-blue-300"
          >
            {[1.0, 1.25, 1.5, 1.75, 2.0].map((rate) => (
              <option key={rate} value={rate}>
                {rate}x
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Welcome Message if empty */}
        {messages.length === 0 && (
           <div className="flex flex-col gap-1 items-start max-w-[85%]">
             <div className="bg-white p-3 rounded-2xl rounded-tl-none shadow-sm border border-gray-100 text-gray-800">
               <p>规则书已就绪！我是你的规则导师，准备好开始学习《{game.name}》了吗？点击下方“讲解规则”开始吧！</p>
             </div>
           </div>
        )}

        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={clsx(
              "flex flex-col gap-1 max-w-[85%]",
              msg.role === 'user' ? "self-end items-end" : "items-start"
            )}
          >
            <div className={clsx(
              "p-3 rounded-2xl shadow-sm text-sm leading-relaxed whitespace-pre-wrap",
              msg.role === 'user' 
                ? "bg-blue-600 text-white rounded-tr-none" 
                : "bg-white border border-gray-100 text-gray-800 rounded-tl-none"
            )}>
              {msg.content}
            </div>
            
            {/* Audio Controls for Assistant */}
            {msg.role === 'assistant' && msg.content && (
              <div className="flex items-center gap-2 px-2 h-6">
                {msg.isAudioGenerating ? (
                  <span className="text-xs text-blue-500 animate-pulse font-medium">语音生成中...</span>
                ) : msg.isAudioPlaying ? (
                  <button onClick={stopAudio} className="p-1 bg-red-100 text-red-600 rounded-full">
                    <Square className="w-3 h-3 fill-current" />
                  </button>
                ) : (
                  <button 
                    onClick={() => playAudio(msg.id, msg.content, msg.audioUrl)} 
                    className="p-1 bg-blue-100 text-blue-600 rounded-full"
                  >
                    <Play className="w-3 h-3 fill-current" />
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
        
        {isLoading && (
          <div className="flex items-start max-w-[85%]">
             <div className="bg-white p-3 rounded-2xl rounded-tl-none shadow-sm border border-gray-100 text-gray-800">
               <div className="flex gap-1">
                 <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                 <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></span>
                 <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></span>
               </div>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </main>

      {/* Quick Actions */}
      <div className="px-4 py-2 flex gap-2 overflow-x-auto no-scrollbar">
        {messages.length === 0 ? (
          <button 
            onClick={handleStartExplanation}
            disabled={isLoading || (!ruleText && !ruleImages)}
            className="flex-shrink-0 px-4 py-2 bg-blue-600 text-white rounded-full text-sm shadow-md hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
          >
            ✨讲解规则
          </button>
        ) : (
          <>
            <button 
              onClick={() => setShowResetConfirm(true)}
              disabled={isLoading || (!ruleText && !ruleImages)}
              className="flex-shrink-0 px-4 py-2 bg-blue-600 text-white rounded-full text-sm shadow-md hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
            >
              🔄重新讲解
            </button>
            <button 
              onClick={() => handleQuickAction('没懂')}
              disabled={isLoading || (!ruleText && !ruleImages)}
              className="flex-shrink-0 px-4 py-2 bg-blue-600 text-white rounded-full text-sm shadow-md hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
            >
              ❔没懂
            </button>
            <button 
              onClick={() => handleQuickAction('继续')}
              disabled={isLoading || (!ruleText && !ruleImages)}
              className="flex-shrink-0 px-4 py-2 bg-blue-600 text-white rounded-full text-sm shadow-md hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
            >
              ➡️继续
            </button>
          </>
        )}
      </div>

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-2">确认重新讲解？</h3>
            <p className="text-gray-600 mb-6">将清除所有当前对话内容，确认吗？</p>
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                取消
              </button>
              <button 
                onClick={handleRestart}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl scale-100 animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-gray-900 mb-2">确认删除？</h3>
            <p className="text-gray-600 mb-6">将删除此游戏规则和所有对话内容，确认吗？</p>
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                取消
              </button>
              <button 
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-3 bg-white border-t border-gray-200 flex items-center gap-2">
        <button 
          onClick={isListening ? stopListening : startListening}
          className={clsx(
            "p-2 rounded-full transition-colors",
            isListening ? "bg-red-100 text-red-600 animate-pulse" : "text-gray-500 hover:bg-gray-100"
          )}
        >
          <Mic className="w-6 h-6" />
        </button>
        <div className="flex-1 relative">
          <input 
            type="text" 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={isListening ? "正在听..." : (ruleText || ruleImages ? "问点什么..." : "正在解析规则...")}
            disabled={(!ruleText && !ruleImages) || isLoading}
            className="w-full pl-4 pr-10 py-2 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow disabled:opacity-50"
          />
        </div>
        <button 
          onClick={handleSend}
          disabled={!inputText.trim() || isLoading || (!ruleText && !ruleImages)}
          className="p-2 bg-blue-600 text-white rounded-full shadow-md active:scale-95 transition-transform disabled:opacity-50 disabled:active:scale-100"
        >
          <Send className="w-5 h-5 ml-0.5" />
        </button>
      </div>

      {/* PDF Viewer Modal */}
      {showPdf && (
        <PdfViewer file={pdfFile} onClose={() => setShowPdf(false)} />
      )}
    </div>
  );
}
