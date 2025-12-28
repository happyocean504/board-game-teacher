import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, Search, Loader2, ExternalLink } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { v4 as uuidv4 } from 'uuid';
import { saveFile } from '@/lib/db';
import { useGameStore } from '@/store/gameStore';

export default function RuleAddPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Store state
  const addGame = useGameStore((state) => state.addGame);
  const lastSearchQuery = useGameStore((state) => state.lastSearchQuery);
  const searchResults = useGameStore((state) => state.lastSearchResults);
  const setLastSearch = useGameStore((state) => state.setLastSearch);

  const [searchQuery, setSearchQuery] = useState(lastSearchQuery);
  const [isSearching, setIsSearching] = useState(false);

  const processAndSaveGame = async (blob: Blob, name: string) => {
    try {
      const gameId = uuidv4();
      await saveFile(gameId, blob);
      
      addGame({
        id: gameId,
        name: name,
        createdAt: Date.now(),
        lastPlayedAt: Date.now(),
        hasPdf: true
      });

      navigate(`/explain/${gameId}`);
    } catch (error) {
      console.error('Game save failed:', error);
      throw error;
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    try {
      let finalPdfBlob: Blob;
      let gameName = files[0].name.replace(/\.[^/.]+$/, ""); // Remove extension

      if (files[0].type === 'application/pdf') {
        finalPdfBlob = files[0];
      } else {
        const doc = new jsPDF();
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          if (i > 0) doc.addPage();
          const imgData = await readFileAsDataURL(file);
          const imgProps = doc.getImageProperties(imgData);
          const pdfWidth = doc.internal.pageSize.getWidth();
          const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
          doc.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
        }
        finalPdfBlob = doc.output('blob');
        gameName = "New Game (From Images)";
      }

      await processAndSaveGame(finalPdfBlob, gameName);
      
    } catch (error) {
      console.error('File processing failed:', error);
      alert('文件处理失败，请重试');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    // Clear previous results before new search
    setLastSearch(searchQuery, []);
    
    try {
      const apiUrl = import.meta.env.VITE_RULE_SEARCH_API_URL || 'https://rule-searcher-xyprdcgeaw.cn-chengdu.fcapp.run';
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: searchQuery }),
      });
      
      const data = await response.json();
      if (data && Array.isArray(data.pdf_urls)) {
        setLastSearch(searchQuery, data.pdf_urls);
      }
    } catch (error) {
      console.error('Search failed:', error);
      alert('搜索失败，请稍后重试');
    } finally {
      setIsSearching(false);
    }
  };

  const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="flex items-center p-4 bg-white shadow-sm">
        <button 
          onClick={() => navigate('/')}
          className="p-2 -ml-2 rounded-full hover:bg-gray-100"
        >
          <ArrowLeft className="w-6 h-6 text-gray-600" />
        </button>
        <h1 className="text-xl font-bold text-gray-800 ml-2">添加规则</h1>
      </header>

      <main className="flex-1 p-6 flex flex-col gap-8">
        {/* Upload Section */}
        <section className="flex flex-col items-center gap-4">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="application/pdf,image/*"
            multiple
            className="hidden"
          />
          
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="w-full aspect-[5/3] max-w-xs bg-white border-2 border-dashed border-blue-300 rounded-2xl flex flex-col items-center justify-center gap-4 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                <span className="text-gray-500">处理中...</span>
              </div>
            ) : (
              <>
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <Upload className="w-8 h-8 text-blue-600" />
                </div>
                <div className="text-center">
                  <span className="text-lg font-medium text-gray-700 block">上传 PDF 或 图片</span>
                  <span className="text-sm text-gray-500">支持多张图片自动合并</span>
                </div>
              </>
            )}
          </button>
        </section>

        {/* Search Section */}
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">或者搜索规则</h2>
          <div className="flex gap-2">
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="输入桌游名称..." 
              className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              disabled={isProcessing}
            />
            <button 
              onClick={handleSearch}
              disabled={isSearching || isProcessing}
              className="bg-gray-800 text-white px-4 rounded-xl flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed min-w-[3.5rem]"
            >
              {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
            </button>
          </div>

          {/* Search Results */}
          {(searchResults.length > 0 || isSearching || searchQuery) && (
             <div className="flex flex-col gap-2 mt-2 animate-in fade-in slide-in-from-top-2">
               {(searchResults.length > 0 || isSearching) && (
                 <h3 className="text-sm font-medium text-gray-700">搜索结果：</h3>
               )}
               
               {isSearching ? (
                 <div className="flex items-center justify-center p-8 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                   <div className="flex flex-col items-center gap-3">
                     <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                     <p className="text-sm text-gray-500">正在搜索规则，请耐心等待...</p>
                   </div>
                 </div>
               ) : (
                 <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
                    {searchResults.map((url, index) => (
                      <button
                        key={index}
                        onClick={() => window.open(url, '_blank')}
                        disabled={isProcessing}
                        className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-200 transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-red-100 transition-colors">
                          <span className="text-red-500 font-bold text-xs">PDF</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">
                            {(() => {
                              const filename = decodeURIComponent(url.split('/').pop() || 'Unknown File');
                              // 如果是 1jour-1jeu 的链接（通常包含 1j1ju.com），且文件名前3个字符可能是hash，才去掉
                              // 更安全的做法是：只有当 URL 包含 1j1ju.com 时才 slice(3)
                              if (url.includes('1j1ju.com')) {
                                return filename.slice(3);
                              }
                              return filename;
                            })()}
                          </p>
                        </div>
                        <ExternalLink className="w-4 h-4 text-gray-300 group-hover:text-blue-500" />
                      </button>
                    ))}
                    
                    {/* GStone Link */}
                    {searchQuery && (
                      <button
                        onClick={() => window.open(`https://www.gstonegames.com/game/?keyword=${encodeURIComponent(searchQuery)}`, '_blank')}
                        className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:bg-orange-50 hover:border-orange-200 transition-all text-left group"
                      >
                        <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-orange-100 transition-colors">
                          <span className="text-orange-500 font-bold text-xs">WEB</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">
                            集石桌游搜索页
                          </p>
                        </div>
                        <ExternalLink className="w-4 h-4 text-gray-300 group-hover:text-orange-500" />
                      </button>
                    )}
                 </div>
               )}
             </div>
          )}
        </section>
      </main>
    </div>
  );
}
