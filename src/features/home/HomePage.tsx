import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Settings, FileText, ChevronRight } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';

export default function HomePage() {
  const navigate = useNavigate();
  const games = useGameStore((state) => state.games);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="flex justify-between items-center p-4 bg-white shadow-sm sticky top-0 z-10">
        <h1 className="text-xl font-bold text-gray-800">我的桌游库</h1>
        <button 
          onClick={() => navigate('/settings')}
          className="p-2 rounded-full hover:bg-gray-100"
        >
          <Settings className="w-6 h-6 text-gray-600" />
        </button>
      </header>

      {/* Game List */}
      <main className="flex-1 overflow-y-auto p-4">
        {games.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500 animate-in fade-in zoom-in duration-300">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <FileText className="w-10 h-10 text-gray-300" />
            </div>
            <p>还没有添加任何游戏规则</p>
            <p className="text-sm mt-2">点击下方按钮添加</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {games.map((game) => (
              <button
                key={game.id}
                onClick={() => navigate(`/explain/${game.id}`)}
                className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-shadow active:scale-[0.98] transition-transform text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 font-bold text-lg group-hover:bg-blue-100 transition-colors">
                    {game.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 line-clamp-1">{game.name}</h3>
                    <span className="text-xs text-gray-400">
                      上次学习: {new Date(game.lastPlayedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-500 transition-colors" />
              </button>
            ))}
          </div>
        )}
      </main>

      {/* Add Button */}
      <div className="p-4 bg-white border-t border-gray-200 safe-area-bottom">
        <button
          onClick={() => navigate('/add')}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 px-4 rounded-xl font-medium active:scale-95 transition-transform hover:bg-blue-700 shadow-lg shadow-blue-200"
        >
          <Plus className="w-5 h-5" />
          新增桌游规则
        </button>
      </div>
    </div>
  );
}
