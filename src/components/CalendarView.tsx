import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  format, startOfWeek, addDays, isSameDay, parseISO, 
  addWeeks, subWeeks, startOfMonth, endOfMonth, eachDayOfInterval, 
  isSameMonth, addMonths, subMonths, startOfYear, endOfYear, 
  eachMonthOfInterval, addYears, subYears, subDays, endOfWeek
} from 'date-fns';
import { ChevronLeft, ChevronRight, Clock, User, Calendar as CalendarIcon, Edit2, CalendarX, Search, X, CheckCircle } from 'lucide-react';
import { Interview, InterviewStatus } from '../types';
import { cn } from '../utils';
import { ScheduleModal } from './ScheduleModal';
import { ConfirmModal } from './ConfirmModal';

type ViewType = 'day' | 'week' | 'month' | 'year' | 'schedule';

interface Holiday {
  date: string;
  name: string;
  localName: string;
}

export function CalendarView() {
  const { interviews, handleDelete, handleEdit, handleStatusChange } = useOutletContext<{ 
    interviews: Interview[],
    handleDelete: (id: string) => void,
    handleEdit: (id: string, interview: Omit<Interview, 'id'>) => void,
    handleStatusChange: (id: string, status: InterviewStatus) => void
  }>();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<ViewType>('week');
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [editingInterview, setEditingInterview] = useState<Interview | null>(null);
  const [deletingInterviewId, setDeletingInterviewId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchDate, setSearchDate] = useState('');

  const currentYear = currentDate.getFullYear();

  useEffect(() => {
    fetch(`https://date.nager.at/api/v3/PublicHolidays/${currentYear}/PH`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch holidays');
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) {
          setHolidays(data);
        }
      })
      .catch(err => console.error("Failed to fetch holidays", err));
  }, [currentYear]);

  const hours = Array.from({ length: 11 }).map((_, i) => i + 8); // 8 AM to 6 PM

  const getInterviewsForDayAndHour = (date: Date, hour: number) => {
    return interviews.filter((interview) => {
      const interviewDate = parseISO(interview.date);
      const interviewStartHour = parseInt(interview.startTime.split(':')[0], 10);
      return isSameDay(interviewDate, date) && interviewStartHour === hour;
    });
  };

  const getInterviewsForDay = (date: Date) => {
    return interviews.filter((interview) => isSameDay(parseISO(interview.date), date));
  };

  const getInterviewsForMonth = (date: Date) => {
    return interviews.filter((interview) => isSameMonth(parseISO(interview.date), date));
  };

  const getHolidaysForDay = (date: Date) => {
    const formattedDate = format(date, 'yyyy-MM-dd');
    return holidays.filter(h => h.date === formattedDate);
  };

  const next = () => {
    if (view === 'day') setCurrentDate(addDays(currentDate, 1));
    else if (view === 'week') setCurrentDate(addWeeks(currentDate, 1));
    else if (view === 'month') setCurrentDate(addMonths(currentDate, 1));
    else if (view === 'year') setCurrentDate(addYears(currentDate, 1));
  };

  const prev = () => {
    if (view === 'day') setCurrentDate(subDays(currentDate, 1));
    else if (view === 'week') setCurrentDate(subWeeks(currentDate, 1));
    else if (view === 'month') setCurrentDate(subMonths(currentDate, 1));
    else if (view === 'year') setCurrentDate(subYears(currentDate, 1));
  };

  const today = () => setCurrentDate(new Date());

  const renderDayView = () => {
    return (
      <div className="flex-1 overflow-auto">
        <div className="min-w-[400px]">
          <div className="grid grid-cols-2 border-b border-gray-100 sticky top-0 bg-white z-10" style={{ gridTemplateColumns: '100px 1fr' }}>
            <div className="p-4 border-r border-gray-100 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50/50">
              Time
            </div>
            <div className="p-4 border-r border-gray-100 text-center bg-white flex flex-col items-center">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                {format(currentDate, 'EEEE')}
              </div>
              <div className={cn(
                "text-lg font-semibold w-8 h-8 flex items-center justify-center rounded-full",
                isSameDay(currentDate, new Date()) ? "bg-indigo-600 text-white" : "text-gray-900"
              )}>
                {format(currentDate, 'd')}
              </div>
              {getHolidaysForDay(currentDate).map(h => (
                <div key={h.name} className="text-[10px] text-emerald-600 font-medium mt-1 text-center truncate w-full" title={h.name}>
                  {h.name}
                </div>
              ))}
            </div>
          </div>
          <div className="relative">
            {hours.map((hour) => (
              <div key={hour} className="grid grid-cols-2 border-b border-gray-100 min-h-[100px]" style={{ gridTemplateColumns: '100px 1fr' }}>
                <div className="p-4 border-r border-gray-100 text-right text-xs font-medium text-gray-500 bg-gray-50/50">
                  {hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                </div>
                <div className="p-2 border-r border-gray-100 relative group hover:bg-gray-50/50 transition-colors">
                  {getInterviewsForDayAndHour(currentDate, hour).map((interview) => {
                    const startMins = parseInt(interview.startTime.split(':')[1], 10);
                    const endHour = parseInt(interview.endTime.split(':')[0], 10);
                    const endMins = parseInt(interview.endTime.split(':')[1], 10);
                    const durationMins = (endHour - hour) * 60 + (endMins - startMins);
                    const height = Math.max((durationMins / 60) * 100, 40);
                    const top = (startMins / 60) * 100;

                    return (
                      <div
                        key={interview.id}
                        onClick={() => setEditingInterview(interview)}
                        className={cn(
                          "absolute left-2 right-2 rounded-lg p-2 overflow-hidden hover:shadow-md transition-all cursor-pointer z-10 border",
                          interview.status === 'cancelled'
                            ? "bg-red-50 border-red-200 hover:border-red-300"
                            : "bg-indigo-50 border-indigo-200 hover:border-indigo-300"
                        )}
                        style={{ top: `${top}px`, height: `${height}px`, minHeight: '40px' }}
                      >
                        <div className={cn(
                          "text-sm font-semibold truncate flex items-center space-x-2",
                          interview.status === 'cancelled' ? "text-red-900" : "text-indigo-900"
                        )}>
                          <span>{interview.candidateName}</span>
                          {interview.isRescheduled && (
                            <span className="inline-block w-2 h-2 rounded-full bg-amber-500 shrink-0" title="Rescheduled" />
                          )}
                        </div>
                        <div className={cn(
                          "text-xs truncate mt-0.5",
                          interview.status === 'cancelled' ? "text-red-700" : "text-indigo-700"
                        )}>
                          {interview.accreditationType}
                        </div>
                        <div className={cn(
                          "text-xs flex items-center mt-1 truncate",
                          interview.status === 'cancelled' ? "text-red-600" : "text-indigo-600"
                        )}>
                          <Clock className="w-3 h-3 mr-1 shrink-0" />
                          {interview.startTime} - {interview.endTime}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const startDate = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(startDate, i));

    return (
      <div className="flex-1 overflow-auto">
        <div className="min-w-[800px]">
          <div className="grid grid-cols-8 border-b border-gray-100 sticky top-0 bg-white z-10">
            <div className="p-4 border-r border-gray-100 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50/50">
              Time
            </div>
            {weekDays.map((day, i) => {
              const dayHolidays = getHolidaysForDay(day);
              return (
                <div key={i} className="p-4 border-r border-gray-100 text-center bg-white flex flex-col items-center overflow-hidden">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                    {format(day, 'EEE')}
                  </div>
                  <div className={cn(
                    "text-lg font-semibold w-8 h-8 flex items-center justify-center rounded-full",
                    isSameDay(day, new Date()) ? "bg-indigo-600 text-white" : "text-gray-900"
                  )}>
                    {format(day, 'd')}
                  </div>
                  {dayHolidays.map(h => (
                    <div key={h.name} className="text-[10px] text-emerald-600 font-medium mt-1 text-center truncate w-full" title={h.name}>
                      {h.name}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
          <div className="relative">
            {hours.map((hour) => (
              <div key={hour} className="grid grid-cols-8 border-b border-gray-100 min-h-[100px]">
                <div className="p-4 border-r border-gray-100 text-right text-xs font-medium text-gray-500 bg-gray-50/50">
                  {hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                </div>
                {weekDays.map((day, dayIdx) => {
                  const dayInterviews = getInterviewsForDayAndHour(day, hour);
                  return (
                    <div key={dayIdx} className="p-2 border-r border-gray-100 relative group hover:bg-gray-50/50 transition-colors">
                      {dayInterviews.map((interview) => {
                        const startMins = parseInt(interview.startTime.split(':')[1], 10);
                        const endHour = parseInt(interview.endTime.split(':')[0], 10);
                        const endMins = parseInt(interview.endTime.split(':')[1], 10);
                        const durationMins = (endHour - hour) * 60 + (endMins - startMins);
                        const height = Math.max((durationMins / 60) * 100, 40);
                        const top = (startMins / 60) * 100;

                        return (
                          <div
                            key={interview.id}
                            onClick={() => setEditingInterview(interview)}
                            className={cn(
                              "absolute left-2 right-2 rounded-lg p-2 overflow-hidden hover:shadow-md transition-all cursor-pointer z-10 border",
                              interview.status === 'cancelled'
                                ? "bg-red-50 border-red-200 hover:border-red-300"
                                : "bg-indigo-50 border-indigo-200 hover:border-indigo-300"
                            )}
                            style={{ top: `${top}px`, height: `${height}px`, minHeight: '40px' }}
                          >
                            <div className={cn(
                              "text-xs font-semibold truncate flex items-center space-x-1",
                              interview.status === 'cancelled' ? "text-red-900" : "text-indigo-900"
                            )}>
                              <span>{interview.candidateName}</span>
                              {interview.isRescheduled && (
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" title="Rescheduled" />
                              )}
                            </div>
                            <div className={cn(
                              "text-[10px] truncate mt-0.5",
                              interview.status === 'cancelled' ? "text-red-700" : "text-indigo-700"
                            )}>
                              {interview.accreditationType}
                            </div>
                            {height >= 60 && (
                              <div className={cn(
                                "text-[10px] flex items-center mt-1 truncate",
                                interview.status === 'cancelled' ? "text-red-600" : "text-indigo-600"
                              )}>
                                <Clock className="w-3 h-3 mr-1 shrink-0" />
                                {interview.startTime} - {interview.endTime}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const dateFormat = "d";
    const rows = [];
    let days = [];
    let day = startDate;
    let formattedDate = "";

    const weekDaysHeader = Array.from({ length: 7 }).map((_, i) => addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), i));

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, dateFormat);
        const cloneDay = day;
        const dayInterviews = getInterviewsForDay(cloneDay);
        
        days.push(
          <div
            key={day.toString()}
            className={cn(
              "min-h-[120px] p-2 border-r border-b border-gray-100 bg-white hover:bg-gray-50 transition-colors cursor-pointer",
              !isSameMonth(day, monthStart) ? "text-gray-400 bg-gray-50/50" : "text-gray-900"
            )}
            onClick={() => {
              setCurrentDate(cloneDay);
              setView('day');
            }}
          >
            <div className="flex justify-end">
              <span className={cn(
                "text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full",
                isSameDay(day, new Date()) ? "bg-indigo-600 text-white" : ""
              )}>
                {formattedDate}
              </span>
            </div>
            <div className="mt-1 space-y-1">
              {getHolidaysForDay(cloneDay).map(h => (
                <div key={h.name} className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded truncate" title={h.name}>
                  {h.name}
                </div>
              ))}
              {dayInterviews.slice(0, 3).map((interview) => (
                <div 
                  key={interview.id} 
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingInterview(interview);
                  }}
                  className={cn(
                    "text-xs truncate px-2 py-1 rounded border cursor-pointer transition-colors flex items-center space-x-1",
                    interview.status === 'cancelled'
                      ? "bg-red-50 text-red-700 border-red-100 hover:bg-red-100"
                      : "bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100"
                  )}
                >
                  <span className="truncate">{interview.startTime} {interview.candidateName}</span>
                  {interview.isRescheduled && (
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" title="Rescheduled" />
                  )}
                </div>
              ))}
              {dayInterviews.length > 3 && (
                <div className="text-xs text-gray-500 font-medium px-1">
                  +{dayInterviews.length - 3} more
                </div>
              )}
            </div>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div className="grid grid-cols-7" key={day.toString()}>
          {days}
        </div>
      );
      days = [];
    }

    return (
      <div className="flex-1 overflow-auto flex flex-col">
        <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50/50 sticky top-0 z-10">
          {weekDaysHeader.map((day, i) => (
            <div key={i} className="p-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-100">
              {format(day, 'EEE')}
            </div>
          ))}
        </div>
        <div className="flex-1">
          {rows}
        </div>
      </div>
    );
  };

  const renderYearView = () => {
    const yearStart = startOfYear(currentDate);
    const months = eachMonthOfInterval({ start: yearStart, end: endOfYear(yearStart) });

    return (
      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {months.map((month) => {
            const monthInterviews = getInterviewsForMonth(month);
            return (
              <div 
                key={month.toString()} 
                className="bg-white border border-gray-200 rounded-xl p-4 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer"
                onClick={() => {
                  setCurrentDate(month);
                  setView('month');
                }}
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
                  {format(month, 'MMMM')}
                </h3>
                <div className="flex flex-col items-center justify-center space-y-2">
                  <div className="text-3xl font-bold text-indigo-600">
                    {monthInterviews.length}
                  </div>
                  <div className="text-sm text-gray-500 font-medium">
                    Interviews
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderScheduleView = () => {
    // Sort all interviews
    const sortedInterviews = [...interviews].sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.startTime}`);
      const dateB = new Date(`${b.date}T${b.startTime}`);
      return dateA.getTime() - dateB.getTime();
    });

    const filteredInterviews = sortedInterviews.filter((interview) => {
      const query = searchQuery.toLowerCase();
      const nameMatch = interview.candidateName.toLowerCase().includes(query);
      const dateMatch = searchDate ? interview.date === searchDate : true;
      return nameMatch && dateMatch;
    });

    // Group by date
    const groupedInterviews = filteredInterviews.reduce((acc, interview) => {
      if (!acc[interview.date]) {
        acc[interview.date] = [];
      }
      acc[interview.date].push(interview);
      return acc;
    }, {} as Record<string, Interview[]>);

    return (
      <div className="flex-1 flex flex-col overflow-hidden bg-gray-50/30">
        <div className="p-6 pb-0 max-w-3xl mx-auto w-full">
          <div className="flex flex-col sm:flex-row items-center gap-3 mb-6">
            <div className="relative w-full sm:w-auto flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors"
              />
            </div>
            <div className="relative w-full sm:w-auto">
              <input
                type="date"
                value={searchDate}
                onChange={(e) => setSearchDate(e.target.value)}
                className="block w-full sm:w-48 px-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors"
              />
              {searchDate && (
                <button
                  onClick={() => setSearchDate('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-6 pt-0">
          <div className="max-w-3xl mx-auto space-y-8">
            {Object.keys(groupedInterviews).length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                {(searchQuery || searchDate) ? 'No interviews match your search.' : 'No interviews scheduled.'}
              </div>
            ) : (
              Object.keys(groupedInterviews).sort().map((dateStr) => {
              const date = parseISO(dateStr);
              return (
                <div key={dateStr} className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center sticky top-0 bg-gray-50/90 backdrop-blur py-2 z-10">
                    <CalendarIcon className="w-5 h-5 mr-2 text-indigo-500" />
                    {format(date, 'EEEE, MMMM d, yyyy')}
                    {getHolidaysForDay(date).map(h => (
                      <span key={h.name} className="ml-3 text-xs font-medium text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                        {h.name}
                      </span>
                    ))}
                  </h3>
                  <div className="space-y-3">
                    {groupedInterviews[dateStr].map((interview) => (
                      <div key={interview.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between hover:shadow-md transition-shadow group">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-semibold text-lg shrink-0">
                            {interview.candidateName.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center space-x-3">
                              <h4 className="text-base font-medium text-gray-900">{interview.candidateName}</h4>
                              {interview.status === 'confirmed' ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
                                  Confirmed
                                </span>
                              ) : interview.isRescheduled ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                                  Rescheduled
                                </span>
                              ) : interview.status === 'scheduled' ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                  Scheduled
                                </span>
                              ) : null}
                              {interview.status === 'completed' && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
                                  Completed
                                </span>
                              )}
                              {interview.status === 'cancelled' && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                  Cancelled
                                </span>
                              )}
                            </div>
                            <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                              <span className="flex items-center">
                                {interview.accreditationType}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-6">
                          <div className="text-right">
                            <div className="text-sm font-semibold text-gray-900 flex items-center justify-end">
                              <Clock className="w-4 h-4 mr-1.5 text-gray-400" />
                              {interview.startTime} - {interview.endTime}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {interview.interviewType || 'Face to Face'}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-all">
                            {(interview.status === 'scheduled' || interview.status === 'confirmed') && (
                              <button 
                                onClick={() => handleStatusChange(interview.id, 'completed')}
                                className="p-2 text-gray-400 hover:text-emerald-600 rounded-full hover:bg-emerald-50 transition-colors"
                                title="Mark as Complete"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                            )}
                            {interview.status !== 'completed' && (
                              <button 
                                onClick={() => setEditingInterview(interview)}
                                className="p-2 text-gray-400 hover:text-indigo-600 rounded-full hover:bg-indigo-50 transition-colors"
                                title="Reschedule"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            )}
                            {(interview.status === 'scheduled' || interview.status === 'confirmed') && (
                              <button 
                                onClick={() => setDeletingInterviewId(interview.id)}
                                className="p-2 text-gray-400 hover:text-red-600 rounded-full hover:bg-red-50 transition-colors"
                                title="Cancel Interview"
                              >
                                <CalendarX className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
          </div>
        </div>
      </div>
    );
  };

  const getHeaderText = () => {
    if (view === 'day') return format(currentDate, 'MMMM d, yyyy');
    if (view === 'week') return `${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'MMM d')} - ${format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'MMM d, yyyy')}`;
    if (view === 'month') return format(currentDate, 'MMMM yyyy');
    if (view === 'year') return format(currentDate, 'yyyy');
    if (view === 'schedule') return 'All Schedule';
    return '';
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[800px]">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-20">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-semibold text-gray-900 min-w-[200px]">
            {getHeaderText()}
          </h2>
          {view !== 'schedule' && (
            <div className="flex items-center space-x-2 bg-gray-50 rounded-lg p-1 border border-gray-200">
              <button onClick={prev} className="p-1.5 rounded-md hover:bg-white hover:shadow-sm text-gray-600 transition-all">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={today} className="px-3 py-1.5 text-sm font-medium rounded-md hover:bg-white hover:shadow-sm text-gray-700 transition-all">
                Today
              </button>
              <button onClick={next} className="p-1.5 rounded-md hover:bg-white hover:shadow-sm text-gray-600 transition-all">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
        
        <div className="flex items-center bg-gray-50 rounded-lg p-1 border border-gray-200">
          {(['day', 'week', 'month', 'year', 'schedule'] as ViewType[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded-md transition-all capitalize",
                view === v 
                  ? "bg-white text-indigo-600 shadow-sm" 
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {view === 'day' && renderDayView()}
      {view === 'week' && renderWeekView()}
      {view === 'month' && renderMonthView()}
      {view === 'year' && renderYearView()}
      {view === 'schedule' && renderScheduleView()}

      {editingInterview && (
        <ScheduleModal
          isOpen={true}
          onClose={() => setEditingInterview(null)}
          onSave={(updated) => {
            handleEdit(editingInterview.id, updated);
            setEditingInterview(null);
          }}
          onDelete={(id) => {
            handleStatusChange(id, 'cancelled');
            setEditingInterview(null);
          }}
          initialData={editingInterview}
          existingInterviews={interviews}
        />
      )}

      <ConfirmModal
        isOpen={!!deletingInterviewId}
        title="Cancel Interview"
        message="Are you sure you want to cancel this interview? This will remove it from the schedule."
        confirmText="Cancel Interview"
        onConfirm={() => {
          if (deletingInterviewId) {
            handleStatusChange(deletingInterviewId, 'cancelled');
            setDeletingInterviewId(null);
          }
        }}
        onCancel={() => setDeletingInterviewId(null)}
      />
    </div>
  );
}
