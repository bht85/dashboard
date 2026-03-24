import React from 'react';
import { Menu, Calendar } from 'lucide-react';

import { auth } from '../../firebase';
import { signOut } from 'firebase/auth';

const Header = ({ 
  isSidebarOpen, 
  setIsSidebarOpen, 
  currentView, 
  selectedDate, 
  setSelectedDate 
}) => {
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const getTitle = () => {
    switch(currentView) {
      case 'dashboard': return "자금 일보 리포트";
      case 'monthly': return "자금 리포트 (월간 요약)";
      case 'accounts': return "계좌 설정 및 관리";
      case 'transactions': return "자금 관리 시스템 - 데이터 처리";
      case 'foreign': return "외화송금 일정";
      case 'cashStatus': return "자금 시재 현황";
      default: return "자금 관리 시스템";
    }
  };

  return (
    <header className="bg-white/90 border-b border-slate-200 px-8 py-5 flex items-center justify-between sticky top-0 z-40 backdrop-blur-sm">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
          className="p-2.5 hover:bg-slate-100 rounded-xl transition-all duration-200 text-slate-500 hover:text-indigo-600 active:scale-95"
          title={isSidebarOpen ? "메뉴 닫기" : "메뉴 열기"}
        >
          <Menu className="w-6 h-6" />
        </button>
        <div>
          <h2 className="font-black text-slate-800 text-xl tracking-tighter">
            {getTitle()}
          </h2>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="date" 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
        <button className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-200">
          Export Excel
        </button>
        <button 
          onClick={handleLogout}
          className="bg-white text-slate-500 border border-slate-200 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all active:scale-95"
        >
          Logout
        </button>
      </div>
    </header>
  );
};

export default Header;

