import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { Calendar, LayoutDashboard, Plus, Settings, Users, CalendarDays, AlertCircle, X } from 'lucide-react';
import { format } from 'date-fns';
import { io } from 'socket.io-client';
import { ScheduleModal } from './ScheduleModal';
import { SettingsModal } from './SettingsModal';
import { Interview, InterviewStatus, MOCK_INTERVIEWS } from '../types';
import { cn } from '../utils';

export function Layout() {
  const [interviews, setInterviews] = useState<Interview[]>(MOCK_INTERVIEWS);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();

  useEffect(() => {
    checkAuthStatus();
    
    // Set up WebSocket connection for real-time updates
    const socket = io();
    socket.on('calendar_update', () => {
      console.log('Received real-time calendar update');
      fetchCalendarEvents();
    });

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        checkAuthStatus();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
      socket.disconnect();
    };
  }, []);

  // Remove the 30s polling interval as we now use WebSockets
  // But we can keep a slow fallback poll (e.g. every 5 mins) if desired
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isConnected) {
      interval = setInterval(() => {
        fetchCalendarEvents();
      }, 300000); // 5 minutes fallback
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isConnected]);

  const checkAuthStatus = async () => {
    try {
      const res = await fetch('/api/auth/status');
      if (!res.ok) throw new Error('Authentication status check failed');
      const data = await res.json();
      setIsConnected(data.connected);
      if (data.connected) {
        fetchCalendarEvents();
      }
    } catch (e: any) {
      console.error('Auth status error:', e);
      setIsConnected(false);
    }
  };

  const fetchCalendarEvents = async () => {
    try {
      const calendarId = localStorage.getItem('calendarId') || 'primary';
      const res = await fetch(`/api/calendar/events?calendarId=${encodeURIComponent(calendarId)}`);
      
      if (res.status === 401) {
        setIsConnected(false);
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed to fetch events (${res.status})`);
      }

      const events = await res.json();
      
      const mappedInterviews: Interview[] = events
        .filter((e: any) => e.start?.dateTime && (e.summary?.includes('Interview:')))
        .map((e: any) => {
          const start = new Date(e.start.dateTime);
          const end = new Date(e.end.dateTime);
          
          // Remove potential status prefixes
          const cleanSummary = e.summary.replace(/^\[(CANCELLED|COMPLETED)\]\s*/, '');
          const summaryParts = cleanSummary.replace('Interview: ', '').split(' - ');
          const candidateName = summaryParts[0] || 'Unknown Candidate';
          const accreditationType = summaryParts[1] || 'Unknown Type';
          
          const description = e.description || '';
          const scheduledTimeMatch = description.match(/Scheduled Time:\s*(.+)/);
          const scheduledTimeStr = scheduledTimeMatch ? scheduledTimeMatch[1].trim() : null;
          const actualTimeStr = e.start.dateTime;
          
          let timeChangedExternally = false;
          if (scheduledTimeStr && actualTimeStr) {
            try {
              // Compare timestamps to avoid false positives from string formatting differences
              timeChangedExternally = new Date(scheduledTimeStr).getTime() !== new Date(actualTimeStr).getTime();
            } catch (err) {
              console.error('Error comparing times:', err);
            }
          }
          
          const isRescheduled = description.includes('Rescheduled: true') || timeChangedExternally;
          
          const statusMatch = description.match(/Status:\s*(.+)/);
          let status = (statusMatch ? statusMatch[1].trim() : 'scheduled') as InterviewStatus;
          
          // If time changed externally, reset status to scheduled (which shows as Rescheduled)
          // until the applicant confirms the new time.
          if (timeChangedExternally && status !== 'completed' && status !== 'cancelled') {
            status = 'scheduled';
          }
          
          // Check if the applicant has confirmed or declined the invitation
          if (e.attendees) {
            const hasDeclined = e.attendees.some((a: any) => a.responseStatus === 'declined');
            const hasAccepted = e.attendees.some((a: any) => a.responseStatus === 'accepted');

            if (hasDeclined && status !== 'completed') {
              status = 'cancelled';
            } else if (hasAccepted && status === 'scheduled') {
              status = 'confirmed';
            }
          }
          
          let candidateEmail = undefined;
          if (e.attendees && e.attendees.length > 0) {
            candidateEmail = e.attendees[0].email;
          }

          return {
            id: e.id,
            candidateName,
            candidateEmail,
            accreditationType,
            date: format(start, 'yyyy-MM-dd'),
            startTime: format(start, 'HH:mm'),
            endTime: format(end, 'HH:mm'),
            status,
            isRescheduled,
          };
        });
        
      setInterviews(mappedInterviews);
      setError(null);
    } catch (e: any) {
      console.error('Fetch events error:', e);
      if (e.message !== 'Failed to fetch') { // Ignore generic network errors during server restart
        setError(e.message);
      }
    }
  };

  const handleConnect = async () => {
    try {
      setError(null);
      const res = await fetch('/api/auth/url');
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to get auth URL');
      }
      
      const authWindow = window.open(data.url, 'oauth_popup', 'width=600,height=700');
      if (!authWindow) {
        throw new Error('Popup blocked. Please allow popups for this site to connect Google Calendar.');
      }
    } catch (e: any) {
      console.error(e);
      setError(e.message);
    }
  };

  const handleDisconnect = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setIsConnected(false);
      setInterviews(MOCK_INTERVIEWS);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSchedule = async (newInterview: Omit<Interview, 'id'>) => {
    if (isConnected) {
      try {
        const calendarId = localStorage.getItem('calendarId') || 'primary';
        const startDateTime = new Date(`${newInterview.date}T${newInterview.startTime}:00`).toISOString();
        const endDateTime = new Date(`${newInterview.date}T${newInterview.endTime}:00`).toISOString();
        
        const res = await fetch(`/api/calendar/events?calendarId=${encodeURIComponent(calendarId)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            summary: `Interview: ${newInterview.candidateName} - ${newInterview.accreditationType}`,
            description: `Type: ${newInterview.interviewType}${newInterview.zoomLink ? `\nZoom Link: ${newInterview.zoomLink}` : ''}${newInterview.comments ? `\nComments: ${newInterview.comments}` : ''}\nScheduled Time: ${startDateTime}\nStatus: ${newInterview.status || 'scheduled'}`,
            start: startDateTime,
            end: endDateTime,
            attendees: newInterview.candidateEmail ? [{ email: newInterview.candidateEmail }] : undefined,
            status: newInterview.status || 'scheduled',
          })
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to schedule interview');
        }

        fetchCalendarEvents();
      } catch (e: any) {
        console.error(e);
        setError(e.message);
      }
    } else {
      const interview: Interview = {
        ...newInterview,
        id: Math.random().toString(36).substr(2, 9),
        status: newInterview.status || 'scheduled',
      };
      setInterviews((prev) => [...prev, interview]);
    }
  };

  const handleDelete = async (id: string) => {
    if (isConnected) {
      try {
        const calendarId = localStorage.getItem('calendarId') || 'primary';
        const res = await fetch(`/api/calendar/events/${id}?calendarId=${encodeURIComponent(calendarId)}`, {
          method: 'DELETE',
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to delete interview');
        }
        fetchCalendarEvents();
      } catch (e: any) {
        console.error(e);
        setError(e.message);
      }
    } else {
      setInterviews((prev) => prev.filter((i) => i.id !== id));
    }
  };

  const handleEdit = async (id: string, updatedInterview: Omit<Interview, 'id'>) => {
    const existingInterview = interviews.find(i => i.id === id);
    
    // Check if the time or date actually changed in this edit
    const timeChanged = existingInterview && (
      existingInterview.date !== updatedInterview.date ||
      existingInterview.startTime !== updatedInterview.startTime ||
      existingInterview.endTime !== updatedInterview.endTime
    );

    const isRescheduled = existingInterview?.isRescheduled || timeChanged;
    
    // If time changed, we should reset status to 'scheduled' so it shows as "Rescheduled" 
    // and requires new confirmation.
    const statusToSave = timeChanged ? 'scheduled' : updatedInterview.status;

    if (isConnected) {
      try {
        const calendarId = localStorage.getItem('calendarId') || 'primary';
        const startDateTime = new Date(`${updatedInterview.date}T${updatedInterview.startTime}:00`).toISOString();
        const endDateTime = new Date(`${updatedInterview.date}T${updatedInterview.endTime}:00`).toISOString();
        
        const res = await fetch(`/api/calendar/events/${id}?calendarId=${encodeURIComponent(calendarId)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            summary: `Interview: ${updatedInterview.candidateName} - ${updatedInterview.accreditationType}`,
            description: `Type: ${updatedInterview.interviewType}${updatedInterview.zoomLink ? `\nZoom Link: ${updatedInterview.zoomLink}` : ''}${updatedInterview.comments ? `\nComments: ${updatedInterview.comments}` : ''}${isRescheduled ? '\nRescheduled: true' : ''}\nScheduled Time: ${startDateTime}\nStatus: ${statusToSave}`,
            start: startDateTime,
            end: endDateTime,
            attendees: updatedInterview.candidateEmail ? [{ email: updatedInterview.candidateEmail }] : undefined,
            status: statusToSave,
          })
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to update interview');
        }

        await fetchCalendarEvents();
      } catch (e: any) {
        console.error(e);
        setError(e.message);
      }
    } else {
      setInterviews((prev) => prev.map((i) => i.id === id ? { ...i, ...updatedInterview, isRescheduled } : i));
    }
  };

  const handleStatusChange = async (id: string, status: InterviewStatus) => {
    const interview = interviews.find(i => i.id === id);
    if (!interview) return;
    
    await handleEdit(id, { ...interview, status });
  };

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/': return 'Dashboard';
      case '/calendar': return 'Calendar';
      case '/interviews': return 'Interview List';
      default: return 'Accreditation Interview';
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col fixed inset-y-0 z-20">
        <div className="h-16 flex items-center px-6 border-b border-gray-100">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center mr-3 shrink-0">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <span className="text-sm font-bold text-gray-900 tracking-tight leading-tight">Accreditation Interview</span>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-1">
          <NavLink
            to="/"
            className={({ isActive }) => cn(
              "w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-colors",
              isActive && location.pathname === '/'
                ? "bg-indigo-50 text-indigo-700" 
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            )}
          >
            <LayoutDashboard className="w-5 h-5 mr-3" />
            Dashboard
          </NavLink>
          <NavLink
            to="/calendar"
            className={({ isActive }) => cn(
              "w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-colors",
              isActive 
                ? "bg-indigo-50 text-indigo-700" 
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            )}
          >
            <Calendar className="w-5 h-5 mr-3" />
            Calendar
          </NavLink>
          <NavLink
            to="/interviews"
            className={({ isActive }) => cn(
              "w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-colors",
              isActive 
                ? "bg-indigo-50 text-indigo-700" 
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            )}
          >
            <Users className="w-5 h-5 mr-3" />
            Interview List
          </NavLink>
        </nav>

        <div className="p-4 border-t border-gray-100">
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-xl text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
          >
            <Settings className="w-5 h-5 mr-3" />
            Settings
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 flex flex-col min-h-screen relative">
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 sticky top-0 z-10">
          <h1 className="text-xl font-semibold text-gray-900 capitalize">
            {getPageTitle()}
          </h1>
          <div className="flex items-center space-x-4">
            {!isConnected ? (
              <button
                onClick={handleConnect}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
              >
                <CalendarDays className="w-4 h-4 mr-2 text-blue-600" />
                Connect Google Calendar
              </button>
            ) : (
              <div className="flex items-center space-x-2">
                <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-emerald-100 text-emerald-800">
                  <CalendarDays className="w-4 h-4 mr-1.5" />
                  Connected
                </span>
                <button
                  onClick={handleDisconnect}
                  className="text-xs text-gray-500 hover:text-red-600 underline transition-colors"
                >
                  Disconnect
                </button>
              </div>
            )}
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Schedule Interview
            </button>
          </div>
        </header>

        {/* Error Toast */}
        {error && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-2">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start shadow-lg max-w-md">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 mr-3 shrink-0" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-red-800">Connection Error</h3>
                <p className="mt-1 text-sm text-red-700">{error}</p>
                {error.includes('OAUTH_CLIENT') && (
                  <p className="mt-2 text-xs text-red-600">
                    Please ensure you have configured OAUTH_CLIENT_ID and OAUTH_CLIENT_SECRET in the Settings menu.
                  </p>
                )}
              </div>
              <button 
                onClick={() => setError(null)}
                className="ml-4 text-red-400 hover:text-red-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 p-8 overflow-auto">
          <div className="max-w-7xl mx-auto">
            <Outlet context={{ interviews, handleDelete, handleEdit, handleStatusChange }} />
          </div>
        </div>
      </main>

      <ScheduleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSchedule}
        existingInterviews={interviews}
      />

      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}
