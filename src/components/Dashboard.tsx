import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';
import { Calendar, Clock, User, ChevronRight, Edit2, CalendarX, Search, X, CheckCircle, Download } from 'lucide-react';
import { Interview, InterviewStatus } from '../types';
import { cn } from '../utils';
import { ScheduleModal } from './ScheduleModal';
import { ConfirmModal } from './ConfirmModal';

export function Dashboard() {
  const { interviews, handleDelete, handleEdit, handleStatusChange } = useOutletContext<{ 
    interviews: Interview[], 
    handleDelete: (id: string) => void,
    handleEdit: (id: string, interview: Omit<Interview, 'id'>) => void,
    handleStatusChange: (id: string, status: InterviewStatus) => void
  }>();
  
  const [editingInterview, setEditingInterview] = useState<Interview | null>(null);
  const [deletingInterviewId, setDeletingInterviewId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchDate, setSearchDate] = useState('');
  const [searchAccreditation, setSearchAccreditation] = useState('');

  const downloadCSV = () => {
    const headers = ['Candidate Name', 'Candidate Email', 'Accreditation Type', 'Date', 'Start Time', 'End Time', 'Status', 'Is Rescheduled'];
    const rows = interviews.map(i => [
      i.candidateName,
      i.candidateEmail || '',
      i.accreditationType,
      i.date,
      i.startTime,
      i.endTime,
      i.status,
      i.isRescheduled ? 'Yes' : 'No'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell.toString().replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `all_interviews_export_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Sort interviews by date and time
  const sortedInterviews = [...interviews].sort((a, b) => {
    const dateA = new Date(`${a.date}T${a.startTime}`);
    const dateB = new Date(`${b.date}T${b.startTime}`);
    return dateA.getTime() - dateB.getTime();
  });

  const upcomingInterviews = sortedInterviews.filter(
    (i) => (i.status === 'scheduled' || i.status === 'confirmed') && new Date(`${i.date}T${i.startTime}`) >= new Date()
  );

  const filteredUpcomingInterviews = upcomingInterviews.filter((interview) => {
    const query = searchQuery.toLowerCase();
    const nameMatch = interview.candidateName.toLowerCase().includes(query);
    const dateMatch = searchDate ? interview.date === searchDate : true;
    const accreditationMatch = searchAccreditation ? interview.accreditationType === searchAccreditation : true;
    return nameMatch && dateMatch && accreditationMatch;
  });

  const formatInterviewDate = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'MMM d, yyyy');
  };

  const scheduledInterviews = interviews.filter((i) => i.status === 'scheduled' && !i.isRescheduled);
  const confirmedInterviews = interviews.filter((i) => i.status === 'confirmed');
  const rescheduledInterviews = interviews.filter((i) => i.isRescheduled && i.status === 'scheduled');
  const completedInterviews = interviews.filter((i) => i.status === 'completed');
  const cancelledInterviews = interviews.filter((i) => i.status === 'cancelled');

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Scheduled</p>
            <p className="text-2xl font-semibold text-gray-900">{scheduledInterviews.length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <User className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Confirmed</p>
            <p className="text-2xl font-semibold text-gray-900">
              {confirmedInterviews.length}
            </p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Rescheduled</p>
            <p className="text-2xl font-semibold text-gray-900">{rescheduledInterviews.length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="p-3 bg-sky-50 text-sky-600 rounded-xl">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Completed</p>
            <p className="text-2xl font-semibold text-gray-900">{completedInterviews.length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="p-3 bg-red-50 text-red-600 rounded-xl">
            <CalendarX className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Cancelled</p>
            <p className="text-2xl font-semibold text-gray-900">{cancelledInterviews.length}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-semibold text-gray-900">Upcoming Interviews</h2>
            <button
              onClick={downloadCSV}
              className="inline-flex items-center px-3 py-1 border border-gray-200 text-xs font-medium rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
              title="Download all interview data as CSV"
            >
              <Download className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
              Export All
            </button>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative w-full sm:w-auto">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full sm:w-64 pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors"
              />
            </div>
            <div className="relative w-full sm:w-auto">
              <select
                value={searchAccreditation}
                onChange={(e) => setSearchAccreditation(e.target.value)}
                className="block w-full sm:w-48 px-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors appearance-none"
              >
                <option value="">All Accreditations</option>
                <option value="Practitioner">Practitioner</option>
                <option value="Consultant">Consultant</option>
              </select>
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
        <div className="divide-y divide-gray-100">
          {filteredUpcomingInterviews.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              {(searchQuery || searchDate || searchAccreditation) ? 'No interviews match your search.' : 'No upcoming interviews scheduled.'}
            </div>
          ) : (
            filteredUpcomingInterviews.map((interview) => (
              <div key={interview.id} className="p-6 hover:bg-gray-50 transition-colors group">
                <div className="flex items-center justify-between">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-semibold text-lg shrink-0">
                      {interview.candidateName.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center space-x-3">
                        <h3 className="text-base font-medium text-gray-900">{interview.candidateName}</h3>
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
                      <p className="text-sm font-medium text-gray-900">
                        {formatInterviewDate(interview.date)}
                      </p>
                      <p className="text-sm text-gray-500 flex items-center justify-end mt-1">
                        <Clock className="w-4 h-4 mr-1.5" />
                        {interview.startTime} - {interview.endTime}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-all">
                      {interview.status !== 'completed' && (
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
                      {interview.status !== 'completed' && (
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
              </div>
            ))
          )}
        </div>
      </div>

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
