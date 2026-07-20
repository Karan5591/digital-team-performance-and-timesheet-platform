/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  Clock, 
  Sliders, 
  Calendar, 
  Coins, 
  Bot, 
  Users, 
  LogOut, 
  Menu, 
  X,
  Table,
  BarChart2,
  ClipboardList
} from 'lucide-react';

import Login from './components/Login';
import Dashboard from './components/Dashboard';
import TimesheetLog from './components/TimesheetLog';
import KPIManager from './components/KPIManager';
import CalendarView from './components/CalendarView';
import TeamUsers from './components/TeamUsers';
import IncentiveViewer from './components/IncentiveViewer';
import AIQueryAssistant from './components/AIQueryAssistant';
import MasterArchitect from './components/MasterArchitect';
import Reports from './components/Reports';
import AssignTask from './components/AssignTask';
import { clearStoredSession, restoreSessionFromStorage } from './lib/authSession';

export default function App() {
  const initialSession = restoreSessionFromStorage();
  const [user, setUser] = useState<any>(initialSession.user);
  const [token, setToken] = useState<string>(initialSession.token);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [clockedIn, setClockedIn] = useState(false);

  useEffect(() => {
    if (token) {
      checkShiftStatus();
    }
  }, [token]);

  const checkShiftStatus = async () => {
    try {
      const res = await fetch('/api/attendance/today', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.warn("Received non-JSON shift status response:", text.substring(0, 100));
        return;
      }
      if (res.ok && data) {
        setClockedIn(data.clockedIn);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLoginSuccess = (loggedInUser: any, sessionToken: string) => {
    setUser(loggedInUser);
    setToken(sessionToken);
    localStorage.setItem('user', JSON.stringify(loggedInUser));
    localStorage.setItem('token', sessionToken);
  };

  const handleLogout = () => {
    setUser(null);
    setToken('');
    clearStoredSession();
    setActiveTab('dashboard');
    window.location.reload();
  };

  const isAuthenticated = Boolean(user && token);

  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // Sidebar navigation options grouped by purpose
  const navSections = [
    {
      title: 'Core Workspace',
      items: [
        { id: 'dashboard', label: 'Performance Summary', icon: LayoutDashboard, role: 'all' },
        { id: 'timesheet', label: 'Daily Timesheet Log', icon: Clock, role: 'all' },
        { id: 'kpi', label: 'Monthly KPIs', icon: Sliders, role: 'all' },
        { id: 'calendar', label: 'Leaves & Calendar', icon: Calendar, role: 'all' },
        { id: 'incentives', label: 'Incentive Gates', icon: Coins, role: 'admin' },
        { id: 'ai-audit', label: 'Performance Auditor (AI)', icon: Bot, role: 'admin' },
        { id: 'master-architect', label: 'Excel & System Architect', icon: Table, role: 'admin' },
      ],
    },
    {
      title: 'Admin Controls',
      items: [
        { id: 'assign-task', label: 'Assign Task', icon: ClipboardList, role: 'admin' },
        { id: 'team', label: 'Team Registry', icon: Users, role: 'admin' },
        { id: 'reports', label: 'Reports', icon: BarChart2, role: 'admin' },
      ],
    },
  ];

  const filteredNavSections = navSections
    .map(section => ({
      ...section,
      items: section.items.filter(item => item.role === 'all' || (item.role === 'admin' && user.role === 'admin')),
    }))
    .filter(section => section.items.length > 0);

  return (
    <div id="application_viewport_container" className="min-h-screen bg-gray-50 flex font-sans overflow-x-hidden">
      
      {/* SIDEBAR NAVIGATION - DESKTOP */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-gray-150 shrink-0 select-none">
        
        {/* Branding header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex gap-2 mb-2">
            <span className="h-2 w-6 rounded bg-[#C8102E]" title="Galaxy Toyota"></span>
            <span className="h-2 w-6 rounded bg-[#003189]" title="Hans Hyundai"></span>
            <span className="h-2 w-6 rounded bg-[#1A6B3A]" title="AutoCarRepair.in"></span>
          </div>
          <h1 className="text-lg font-extrabold tracking-tight font-display text-gray-900">
            TSG Digital & Tech
          </h1>
          <p className="text-[10px] text-gray-400 font-semibold tracking-wider uppercase mt-1">Central Hub Platform</p>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 p-4 space-y-4 overflow-y-auto">
          {filteredNavSections.map(section => (
            <div key={section.title}>
              <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-gray-400">
                {section.title}
              </p>
              <div className="space-y-1">
                {section.items.map(item => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold tracking-tight transition-all duration-200 ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

      </aside>

      {/* MOBILE HEADER BAR */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between lg:justify-end gap-4 shrink-0 select-none">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-xl border border-gray-200"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-4">
            
            {/* Shift Tracker clock-in alert */}
            <div className="flex items-center gap-2 px-3 py-1 bg-gray-50 rounded-full border border-gray-200 text-xs">
              <span className={`h-2.5 w-2.5 rounded-full ${clockedIn ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'}`}></span>
              <span className="font-semibold text-gray-600">{clockedIn ? 'Clocked In' : 'Shift Closed'}</span>
            </div>

            {/* Profile initial logo */}
            <div className="h-8 w-8 bg-indigo-100 rounded-lg flex items-center justify-center font-bold text-indigo-700 text-xs">
              {user.name.charAt(0)}
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-red-600 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>

          </div>
        </header>

        {/* MOBILE NAVIGATION SIDEBAR DRAWER */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <>
              {/* Overlay Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileMenuOpen(false)}
                className="lg:hidden fixed inset-0 bg-gray-900/30 backdrop-blur-xs z-40"
              ></motion.div>

              {/* Sidebar container */}
              <motion.aside
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="lg:hidden fixed top-0 bottom-0 left-0 w-64 bg-white border-r border-gray-150 z-50 flex flex-col select-none"
              >
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <div className="flex gap-1.5 mb-1">
                      <span className="h-1.5 w-4 rounded bg-[#C8102E]"></span>
                      <span className="h-1.5 w-4 rounded bg-[#003189]"></span>
                      <span className="h-1.5 w-4 rounded bg-[#1A6B3A]"></span>
                    </div>
                    <h2 className="text-base font-extrabold tracking-tight font-display text-gray-900">
                      TSG Digital Hub
                    </h2>
                  </div>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg border border-gray-150"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <nav className="flex-1 p-4 space-y-4 overflow-y-auto">
                  {filteredNavSections.map(section => (
                    <div key={section.title}>
                      <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-gray-400">
                        {section.title}
                      </p>
                      <div className="space-y-1">
                        {section.items.map(item => {
                          const Icon = item.icon;
                          const isActive = activeTab === item.id;
                          return (
                            <button
                              key={item.id}
                              onClick={() => {
                                setActiveTab(item.id);
                                setMobileMenuOpen(false);
                              }}
                              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold tracking-tight transition-all duration-200 ${
                                isActive
                                  ? 'bg-indigo-600 text-white shadow-md'
                                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                              }`}
                            >
                              <Icon className="h-4 w-4 shrink-0" />
                              <span>{item.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </nav>

                <div className="p-4 border-t border-gray-100 bg-gray-50/50">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 bg-indigo-100 rounded-lg flex items-center justify-center font-bold text-indigo-700 text-xs">
                      {user.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-900 truncate">{user.name}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full mt-4 flex items-center justify-center gap-1 px-3 py-1.5 border border-gray-200 rounded-xl text-[11px] font-semibold text-gray-600 hover:text-red-600 hover:bg-red-50 hover:border-red-100 transition-all"
                  >
                    <LogOut className="h-3 w-3" /> Sign Out
                  </button>
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* WORKSPACE CONTENT BODY */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'dashboard' && (
                <Dashboard 
                  token={token} 
                  user={user} 
                  onNavigateToTab={(tab) => setActiveTab(tab)} 
                />
              )}
              {activeTab === 'timesheet' && (
                <TimesheetLog 
                  token={token} 
                  user={user} 
                  onStatusChange={checkShiftStatus} 
                  onLogout={handleLogout}
                />
              )}
              {activeTab === 'kpi' && (
                <KPIManager 
                  token={token} 
                  user={user} 
                />
              )}
              {activeTab === 'calendar' && (
                <CalendarView 
                  token={token} 
                  user={user} 
                />
              )}
              {activeTab === 'incentives' && (
                <IncentiveViewer />
              )}
              {activeTab === 'ai-audit' && (
                <AIQueryAssistant token={token} />
              )}
              {activeTab === 'master-architect' && (
                <MasterArchitect token={token} />
              )}
              {activeTab === 'team' && user.role === 'admin' && (
                <TeamUsers token={token} />
              )}
              {activeTab === 'reports' && user.role === 'admin' && (
                <Reports token={token} />
              )}
              {activeTab === 'assign-task' && user.role === 'admin' && (
                <AssignTask token={token} />
              )}
            </motion.div>
          </AnimatePresence>
        </main>

      </div>

    </div>
  );
}
