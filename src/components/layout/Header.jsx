import React from 'react';
import { Menu, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

import { auth } from '../../firebase';
import { signOut } from 'firebase/auth';

const Header = ({ 
  isSidebarOpen, 
  setIsSidebarOpen, 
  currentView, 
  selectedDate, 
  setSelectedDate,
  onExport,
  user
}) => {
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleDayChange = (offset) => {
    const [year, month, day] = selectedDate.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() + offset);
    
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    setSelectedDate(`${y}-${m}-${d}`);
  };

  const getTitle = () => {
    switch(currentView) {
      case 'dashboard': return "일일 자금 일보";
      case 'monthly': return "월간 자금 일보";
      case 'accounts': return "계좌 관리";
      case 'transactions': return "출금 대상";
      case 'foreign': return "외화 송금";
      case 'cashStatus': return "일일 자금 업로드";
      default: return "자금 관리 시스템";
    }
  };

  return (
    <header className="bg-white/90 border-b border-slate-200 px-4 lg:px-8 py-3 lg:py-5 flex items-center justify-between sticky top-0 z-40 backdrop-blur-sm print:hidden">
      <div className="flex items-center gap-2 lg:gap-4 flex-shrink-0">
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
          className="p-2.5 hover:bg-slate-100 rounded-xl transition-all duration-200 text-slate-500 hover:text-indigo-600 active:scale-95"
          title={isSidebarOpen ? "메뉴 닫기" : "메뉴 열기"}
        >
          <Menu className="w-6 h-6" />
        </button>
        <div>
          <h2 className="font-black text-slate-800 text-base lg:text-xl tracking-tighter truncate max-w-[120px] sm:max-w-[200px] lg:max-w-none">
            {getTitle()}
          </h2>
        </div>
      </div>
      
      <div className="flex items-center gap-2 lg:gap-3 flex-shrink-1 min-w-0">
        <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg lg:rounded-xl overflow-hidden shadow-sm group">
          <button 
            onClick={() => handleDayChange(-1)}
            className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-all border-r border-slate-200 active:scale-90"
            title="이전 날짜"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <div className="relative flex items-center">
            <Calendar className="absolute left-2 w-4 h-4 text-indigo-500 pointer-events-none hidden sm:block" />
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-2 sm:pl-8 sm:pr-3 py-2 lg:py-2.5 bg-transparent text-xs lg:text-sm font-black text-slate-700 focus:bg-white outline-none transition-all w-[110px] sm:w-[145px] tracking-tight"
            />
          </div>
          
          <button 
            onClick={() => handleDayChange(1)}
            className="p-1.5 lg:p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-all border-l border-slate-200 active:scale-90"
            title="다음 날짜"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <button 
          onClick={handleLogout}
          className="bg-white text-slate-500 border border-slate-200 px-3 py-2 lg:px-5 lg:py-2.5 rounded-lg lg:rounded-xl text-[10px] lg:text-xs font-black uppercase tracking-widest hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all active:scale-95"
        >
          Logout
        </button>
      </div>
    </header>
  );
};

export default Header;

