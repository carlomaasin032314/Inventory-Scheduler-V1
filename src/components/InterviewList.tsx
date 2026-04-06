import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { Search, X, Edit2, CalendarX, CheckCircle, Clock, User, Calendar, Download } from 'lucide-react';
import { Interview, InterviewStatus } from '../types';
import { cn } from '../utils';
import { ScheduleModal } from './ScheduleModal';
import { ConfirmModal } from './ConfirmModal';

export function InterviewList() {
  const { interviews, handleEdit, handleStatusChange } = useOutletContext<{ 
    interviews: Interview[], 
    handleDelete: (id: string) => void,
    handleEdit: (id: string, interview: Omit<Interview, 'id'>) => void,
    handleStatusChange: (id: string, status: InterviewStatus) => void
  }>();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<InterviewStatus | 'all'>('all');
  const [accreditationFilter, setAccreditationFilter] = useState('');
  const [editingInterview, setEditingInterview] = useState<Interview | null>(null);
  const [cancellingInterviewId, setCancellingInterviewId] = useState<string | null>(null);

  const downloadCSV = () => {
    const headers = ['Candidate Name', 'Candidate Email', 'Accreditation Type', 'Date', 'Start Time', 'End Time', 'Status', 'Is Rescheduled'];
    const rows = sortedInterviews.map(i => [
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
    link.setAttribute('download', `interviews_export_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredInterviews = interviews.filter((interview) => {
    const query = searchQuery.toLowerCase();
    const nameMatch = interview.candidateName.toLowerCase().includes(query);
    const accreditationMatch = accreditationFilter ? interview.accreditationType === accreditationFilter : true;
    const statusMatch = statusFilter === 'all' || interview.status === statusFilter;
    
    // If there's a search query, it can match name or accreditation (if filter not set)
    const searchMatch = query ? (nameMatch || interview.accreditationType.toLowerCase().includes(query)) : true;
    
    return searchMatch && accreditationMatch && statusMatch;
  });

  const sortedInterviews = [...filteredInterviews].sort((a, b) => {
    const dateA = new Date(`${a.date}T${a.startTime}`);
    const dateB = new Date(`${b.date}T${b.startTime}`);
    return dateB.getTime() - dateA.getTime(); // Most recent first
  });

  const getStatusBadge = (status: InterviewStatus, isRescheduled?: boolean) => {
    if (isRescheduled && status === 'scheduled') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
          Rescheduled
        </span>
      );
    }

    switch (status) {
      case 'scheduled':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            Scheduled
          </span>
        );
      case 'confirmed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
            Confirmed
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
            Completed
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            Cancelled
          </span>
        );
    }
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
        <div className="px-6 py-5 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-gray-900">All Interviews</h2>
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative w-full sm:w-auto">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search interviews..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full sm:w-64 pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors"
              />
            </div>
            <div className="relative w-full sm:w-auto">
              <select
                value={accreditationFilter}
                onChange={(e) => setAccreditationFilter(e.target.value)}
                className="block w-full sm:w-48 px-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors appearance-none"
              >
                <option value="">All Accreditations</option>
                <option value="Practitioner">Practitioner</option>
                <option value="Consultant">Consultant</option>
              </select>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="block w-full sm:w-40 px-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors"
            >
              <option value="all">All Statuses</option>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <button
              onClick={downloadCSV}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors whitespace-nowrap"
              title="Download as CSV (Google Sheets compatible)"
            >
              <Download className="w-4 h-4 mr-2 text-indigo-600" />
              Export CSV
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Candidate
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type of Accreditation
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date & Time
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedInterviews.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                    No interviews found.
                  </td>
                </tr>
              ) : (
                sortedInterviews.map((interview) => (
                  <tr key={interview.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-semibold text-sm">
                          {interview.candidateName.charAt(0)}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{interview.candidateName}</div>
                          <div className="text-sm text-gray-500">{interview.candidateEmail}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        {interview.accreditationType}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 flex items-center">
                        <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                        {format(parseISO(interview.date), 'MMM d, yyyy')}
                      </div>
                      <div className="text-sm text-gray-500 flex items-center mt-1">
                        <Clock className="w-4 h-4 mr-2 text-gray-400" />
                        {interview.startTime} - {interview.endTime}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(interview.status, interview.isRescheduled)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-all">
                        {(interview.status === 'scheduled' || interview.status === 'confirmed') && (
                          <button 
                            onClick={() => handleStatusChange(interview.id, 'completed')}
                            className="p-1.5 text-gray-400 hover:text-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors"
                            title="Mark as Complete"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        {interview.status !== 'completed' && (
                          <button 
                            onClick={() => setEditingInterview(interview)}
                            className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors"
                            title="Edit / Reschedule"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        {(interview.status === 'scheduled' || interview.status === 'confirmed') && (
                          <button 
                            onClick={() => setCancellingInterviewId(interview.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                            title="Cancel Interview"
                          >
                            <CalendarX className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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
        isOpen={!!cancellingInterviewId}
        title="Cancel Interview"
        message="Are you sure you want to cancel this interview? This will remove it from the schedule."
        confirmText="Cancel Interview"
        onConfirm={() => {
          if (cancellingInterviewId) {
            handleStatusChange(cancellingInterviewId, 'cancelled');
            setCancellingInterviewId(null);
          }
        }}
        onCancel={() => setCancellingInterviewId(null)}
      />
    </div>
  );
}
