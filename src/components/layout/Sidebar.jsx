import React from 'react';
import { 
  BarChart3,
  BarChart2,
  TrendingUp,
  LayoutDashboard, 
  ArrowLeftRight, 
  Globe, 
  Settings,
  Receipt,
  Calendar,
  CalendarPlus,
  ListFilter
} from 'lucide-react';

const Sidebar = ({ isSidebarOpen, setIsSidebarOpen, currentView, setCurrentView, user }) => {
  const isAuthorized = ['jiin0723@composecoffee.co.kr', 'kth@composecoffee.co.kr', 'choihy@composecoffee.co.kr'].includes(user?.email?.toLowerCase());
  const isAuthorizedMapping = ['jiin0723@composecoffee.co.kr', 'kth@composecoffee.co.kr', 'choihy@composecoffee.co.kr'].includes(user?.email?.toLowerCase());

  const baseNavItems = [
    { id: 'dashboard', label: '일일 자금 일보', icon: LayoutDashboard },
    { id: 'analytics', label: '추이 분석', icon: BarChart3 },
    { id: 'monthly', label: '월간 자금 일보', icon: TrendingUp },
    { id: 'transactions', label: '출금 대상', icon: ArrowLeftRight },
    { id: 'foreign', label: '외화 송금', icon: Globe },
    { id: 'accounts', label: '계좌 관리', icon: Settings },
    { id: 'cashStatus', label: '일일 자금 업로드', icon: Receipt },
  ];

  const navItems = isAuthorizedMapping
    ? [...baseNavItems, { id: 'accountMapping', label: '계정과목 매칭', icon: ListFilter }]
    : baseNavItems;

  const cashFlowItems = [
    { id: 'cashFlow', label: '자금 흐름 추정', icon: Calendar },
    { id: 'cashEvent', label: '자금 이벤트 등록', icon: CalendarPlus },
    { id: 'cashPL', label: '캐시 손익계산서', icon: BarChart2 },
  ];

  return (
    <aside className={`fixed inset-y-0 left-0 z-50 bg-white border-r border-slate-200 transform transition-all duration-300 ease-in-out shadow-xl lg:shadow-none ${isSidebarOpen ? 'w-64 translate-x-0' : 'w-20 -translate-x-full lg:translate-x-0 flex flex-col'}`}>
      <div className="h-full flex flex-col">
        <div className={`pt-8 pb-6 text-center flex flex-col items-center overflow-hidden transition-all ${isSidebarOpen ? 'px-6' : 'px-2'}`}>
          <div className={`bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100 mb-4 transition-all duration-300 ${isSidebarOpen ? 'w-14 h-14' : 'w-10 h-10'}`}>
            <TrendingUp className={`${isSidebarOpen ? 'w-8 h-8' : 'w-5 h-5'} text-white transition-all`} />
          </div>
          {isSidebarOpen && (
            <div className="animate-in fade-in duration-300">
              <h1 className="text-xl font-black tracking-tighter text-slate-900 uppercase">Compose</h1>
              <p className="text-[9px] text-slate-400 font-bold tracking-[0.2em] mt-1 whitespace-nowrap">TREASURY INTELLIGENCE</p>
            </div>
          )}
        </div>
        
        <nav className="flex-1 px-4 space-y-1 mt-4">
          {navItems.map((item) => (
            <button
              key={item.id}
              title={!isSidebarOpen ? item.label : undefined}
              onClick={() => {
                setCurrentView(item.id);
                if (window.innerWidth < 1024) setIsSidebarOpen(false);
              }}
              className={`flex items-center gap-3 py-3 rounded-xl text-sm font-bold transition-all ${isSidebarOpen ? 'w-full px-4' : 'w-12 h-12 justify-center mx-auto'} ${
                currentView === item.id 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {isSidebarOpen && <span>{item.label}</span>}
            </button>
          ))}
          
          {isAuthorized && (
            <div className="my-6 pt-4 border-t-2 border-slate-100">
              {isSidebarOpen && <p className="px-4 mb-3 text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] truncate">Simulation & Event</p>}
              {!isSidebarOpen && <div className="border-t-2 border-slate-100 mb-3 mx-4"></div>}
              {cashFlowItems.map((item) => (
                <button
                  key={item.id}
                  title={!isSidebarOpen ? item.label : undefined}
                  onClick={() => {
                    setCurrentView(item.id);
                    if (window.innerWidth < 1024) setIsSidebarOpen(false);
                  }}
                  className={`flex items-center gap-3 py-3 mt-1 rounded-xl text-sm font-bold transition-all ${isSidebarOpen ? 'w-full px-4' : 'w-12 h-12 justify-center mx-auto'} ${
                    currentView === item.id 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <item.icon className="w-5 h-5 shrink-0" />
                  {isSidebarOpen && <span>{item.label}</span>}
                </button>
              ))}
            </div>
          )}
        </nav>

        <div className={`p-4 mb-4 ${!isSidebarOpen && 'flex justify-center'}`}>
          <div className={`bg-slate-900 rounded-2xl text-white transition-all overflow-hidden ${isSidebarOpen ? 'p-5 w-full' : 'p-3 flex items-center justify-center w-12 h-12'}`} title={!isSidebarOpen ? "Today Status: Cloud Synced" : undefined}>
            {isSidebarOpen ? (
              <>
                <p className="text-[10px] text-slate-500 font-bold uppercase mb-2 whitespace-nowrap">Today Status</p>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shrink-0"></div>
                  <p className="text-xs font-bold truncate">Cloud Synced</p>
                </div>
              </>
            ) : (
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shrink-0"></div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
