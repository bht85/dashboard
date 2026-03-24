import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

const Layout = ({ currentView, setCurrentView, selectedDate, setSelectedDate, children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="flex min-h-screen bg-[#f8fafc] text-slate-900 font-sans">
      <Sidebar 
        isSidebarOpen={isSidebarOpen} 
        currentView={currentView} 
        setCurrentView={setCurrentView} 
      />

      {/* Mobile Overlay */}
      {!isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 lg:hidden opacity-0 pointer-events-none transition-opacity duration-300"
          onClick={() => setIsSidebarOpen(true)}
        ></div>
      )}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden opacity-100 transition-opacity duration-300"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${isSidebarOpen ? 'lg:ml-64' : 'lg:ml-0'}`}>
        <Header 
          isSidebarOpen={isSidebarOpen} 
          setIsSidebarOpen={setIsSidebarOpen} 
          currentView={currentView}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
        />

        <main className="flex-1 p-8 lg:p-12 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>

        <footer className="px-12 py-6 bg-white border-t border-slate-100 flex justify-between items-center text-[10px] font-black text-slate-400 tracking-widest uppercase">
          <p>© 2026 COMPOSE TREASURY HUB</p>
          <div className="flex gap-8 items-center">
            <span className="text-indigo-600">Enterprise Edition v2.4</span>
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
            <span>System Status: Optimal</span>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Layout;
