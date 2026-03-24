import React from 'react';
import { 
  TrendingUp,
  LayoutDashboard, 
  ArrowLeftRight, 
  Globe, 
  Settings,
  Receipt
} from 'lucide-react';

const Sidebar = ({ isSidebarOpen, currentView, setCurrentView }) => {
  const navItems = [
    { id: 'dashboard', label: '자금 일보 리포트', icon: LayoutDashboard },
    { id: 'monthly', label: '자금 리포트(월간)', icon: TrendingUp },
    { id: 'transactions', label: '데이터 업로드/기입', icon: ArrowLeftRight },
    { id: 'foreign', label: '외화송금 일정', icon: Globe },
    { id: 'accounts', label: '계좌 등록 및 관리', icon: Settings },
    { id: 'cashStatus', label: '자금 시재 현황', icon: Receipt },
  ];

  return (
    <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} shadow-xl lg:shadow-none`}>
      <div className="h-full flex flex-col">
        <div className="px-6 py-8 text-center flex flex-col items-center">
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100 mb-4">
            <TrendingUp className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-xl font-black tracking-tighter text-slate-900 uppercase">Compose</h1>
          <p className="text-[9px] text-slate-400 font-bold tracking-[0.2em] mt-1">TREASURY INTELLIGENCE</p>
        </div>
        
        <nav className="flex-1 px-4 space-y-1 mt-4">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                currentView === item.id 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 mb-4">
          <div className="bg-slate-900 rounded-2xl p-5 text-white">
            <p className="text-[10px] text-slate-500 font-bold uppercase mb-2">Today Status</p>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <p className="text-xs font-bold">Cloud Synced</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
