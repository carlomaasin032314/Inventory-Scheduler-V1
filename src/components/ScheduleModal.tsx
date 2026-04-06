import React, { useState } from 'react';
import { X } from 'lucide-react';
import { format } from 'date-fns';
import { Interview, AccreditationType, InterviewType, InterviewStatus } from '../types';
import { cn } from '../utils';
import { ConfirmModal } from './ConfirmModal';

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (interview: Omit<Interview, 'id'>) => void;
  onDelete?: (id: string) => void;
  initialData?: Interview;
  existingInterviews?: Interview[];
}

export function ScheduleModal({ isOpen, onClose, onSave, onDelete, initialData, existingInterviews = [] }: ScheduleModalProps) {
  const [candidateName, setCandidateName] = useState(initialData?.candidateName || '');
  const [candidateEmail, setCandidateEmail] = useState(initialData?.candidateEmail || '');
  const [accreditationType, setAccreditationType] = useState<AccreditationType>((initialData?.accreditationType as AccreditationType) || 'Practitioner');
  const [interviewType, setInterviewType] = useState<InterviewType>((initialData?.interviewType as InterviewType) || 'Face to Face');
  const [zoomLink, setZoomLink] = useState(initialData?.zoomLink || '');
  const [comments, setComments] = useState(initialData?.comments || '');
  const [date, setDate] = useState(initialData?.date || '');
  const [startTime, setStartTime] = useState(initialData?.startTime || '');
  const [endTime, setEndTime] = useState(initialData?.endTime || '');
  const [status, setStatus] = useState<InterviewStatus>(initialData?.status || 'scheduled');
  const [selectedSlot, setSelectedSlot] = useState<string>('Custom');
  const [error, setError] = useState('');
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const isCompleted = initialData?.status === 'completed';

  const checkOverlap = (start: string, end: string) => {
    if (!date || !start || !end) return false;
    
    const newStart = new Date(`${date}T${start}`);
    const newEnd = new Date(`${date}T${end}`);

    return existingInterviews.some(interview => {
      if (initialData && interview.id === initialData.id) return false;
      if (interview.status !== 'scheduled' && interview.status !== 'confirmed') return false;
      if (interview.date !== date) return false;

      const existingStart = new Date(`${interview.date}T${interview.startTime}`);
      const existingEnd = new Date(`${interview.date}T${interview.endTime}`);

      return newStart < existingEnd && newEnd > existingStart;
    });
  };

  const slots = [
    { label: '9:00 AM - 10:30 AM', start: '09:00', end: '10:30' },
    { label: '10:30 AM - 12:00 PM', start: '10:30', end: '12:00' },
    { label: '1:00 PM - 2:30 PM', start: '13:00', end: '14:30' },
    { label: '2:30 PM - 4:00 PM', start: '14:30', end: '16:00' },
    { label: 'Custom', start: '', end: '' },
  ].map(slot => {
    const isOverlapping = slot.label !== 'Custom' ? checkOverlap(slot.start, slot.end) : false;
    return {
      ...slot,
      isOverlapping,
      displayLabel: isOverlapping ? `${slot.label} (Reserved)` : slot.label
    };
  });

  const isCurrentTimeOverlapping = checkOverlap(startTime, endTime);

  React.useEffect(() => {
    if (isOpen) {
      setCandidateName(initialData?.candidateName || '');
      setCandidateEmail(initialData?.candidateEmail || '');
      setAccreditationType((initialData?.accreditationType as AccreditationType) || 'Practitioner');
      setInterviewType((initialData?.interviewType as InterviewType) || 'Face to Face');
      setZoomLink(initialData?.zoomLink || '');
      setComments(initialData?.comments || '');
      setDate(initialData?.date || '');
      setStartTime(initialData?.startTime || '');
      setEndTime(initialData?.endTime || '');
      setStatus(initialData?.status || 'scheduled');
      
      // Determine selected slot based on initial times
      const matchingSlot = slots.find(s => s.start === initialData?.startTime && s.end === initialData?.endTime);
      setSelectedSlot(matchingSlot ? matchingSlot.label : 'Custom');
      
      setError('');
      setShowCancelConfirm(false);
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSlotChange = (slotLabel: string) => {
    setSelectedSlot(slotLabel);
    const slot = slots.find(s => s.label === slotLabel);
    if (slot && slotLabel !== 'Custom') {
      setStartTime(slot.start);
      setEndTime(slot.end);
    } else if (slotLabel === 'Custom') {
      // Keep existing times or clear them if they were from a slot
      const isCurrentlySlot = slots.some(s => s.label === selectedSlot && s.label !== 'Custom');
      if (isCurrentlySlot) {
        setStartTime('');
        setEndTime('');
      }
    }
  };

  const today = format(new Date(), 'yyyy-MM-dd');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (date < today) {
      setError('Cannot schedule an interview in the past');
      return;
    }

    if (startTime >= endTime) {
      setError('End time must be after start time');
      return;
    }

    if (date === today) {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const [startHour, startMinute] = startTime.split(':').map(Number);
      
      if (startHour < currentHour || (startHour === currentHour && startMinute < currentMinute)) {
        setError('Cannot schedule an interview in the past');
        return;
      }
    }

    // Check for overlaps
    const newStart = new Date(`${date}T${startTime}`);
    const newEnd = new Date(`${date}T${endTime}`);

    const hasOverlap = existingInterviews.some(interview => {
      // Skip checking against itself if editing
      if (initialData && interview.id === initialData.id) return false;
      
      // Only check scheduled or confirmed interviews
      if (interview.status !== 'scheduled' && interview.status !== 'confirmed') return false;

      const existingStart = new Date(`${interview.date}T${interview.startTime}`);
      const existingEnd = new Date(`${interview.date}T${interview.endTime}`);

      // Overlap condition:
      // (StartA < EndB) and (EndA > StartB)
      return newStart < existingEnd && newEnd > existingStart;
    });

    if (hasOverlap) {
      setError('Warning: This schedule overlaps with an existing interview.');
      return;
    }

    onSave({
      candidateName,
      candidateEmail,
      accreditationType,
      interviewType,
      zoomLink: interviewType === 'Online Interview' ? zoomLink : undefined,
      comments,
      date,
      startTime,
      endTime,
      status,
    });
    setCandidateName('');
    setCandidateEmail('');
    setAccreditationType('Practitioner');
    setInterviewType('Face to Face');
    setZoomLink('');
    setComments('');
    setDate('');
    setStartTime('');
    setEndTime('');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            {isCompleted ? 'Interview Details' : initialData ? 'Edit Interview' : 'Schedule Interview'}
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {isCompleted && (
            <div className="bg-emerald-50 text-emerald-700 p-3 rounded-lg text-sm font-medium border border-emerald-200 mb-4">
              This interview is completed and cannot be edited.
            </div>
          )}
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium">
              {error}
            </div>
          )}
          {isCurrentTimeOverlapping && (
            <div className="bg-amber-50 text-amber-700 p-3 rounded-lg text-sm font-medium border border-amber-200">
              Warning: This schedule overlaps with an existing interview.
            </div>
          )}
          {initialData && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as InterviewStatus)}
                disabled={isCompleted}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white disabled:bg-gray-50 disabled:text-gray-500"
              >
                <option value="scheduled">Scheduled</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              required
              type="text"
              value={candidateName}
              onChange={(e) => setCandidateName(e.target.value)}
              disabled={isCompleted}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-50 disabled:text-gray-500"
              placeholder="e.g. Jane Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              required
              type="email"
              value={candidateEmail}
              onChange={(e) => setCandidateEmail(e.target.value)}
              disabled={isCompleted}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-50 disabled:text-gray-500"
              placeholder="e.g. jane@example.com"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type of Accreditation</label>
            <select
              required
              value={accreditationType}
              onChange={(e) => setAccreditationType(e.target.value as AccreditationType)}
              disabled={isCompleted}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white disabled:bg-gray-50 disabled:text-gray-500"
            >
              <option value="Practitioner">Practitioner</option>
              <option value="Consultant">Consultant</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type of Interview</label>
            <select
              required
              value={interviewType}
              onChange={(e) => setInterviewType(e.target.value as InterviewType)}
              disabled={isCompleted}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white disabled:bg-gray-50 disabled:text-gray-500"
            >
              <option value="Face to Face">Face to Face</option>
              <option value="Online Interview">Online Interview</option>
            </select>
          </div>

          {interviewType === 'Online Interview' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Zoom Meeting Link</label>
              <input
                required
                type="url"
                value={zoomLink}
                onChange={(e) => setZoomLink(e.target.value)}
                disabled={isCompleted}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-50 disabled:text-gray-500"
                placeholder="https://zoom.us/j/..."
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              required
              type="date"
              min={today}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={isCompleted}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-50 disabled:text-gray-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Schedule Slot</label>
            <div className="grid grid-cols-2 gap-2">
              {slots.map(slot => (
                <button
                  key={slot.label}
                  type="button"
                  disabled={slot.isOverlapping || isCompleted}
                  onClick={() => handleSlotChange(slot.label)}
                  className={cn(
                    "px-3 py-2 text-sm font-medium rounded-lg border transition-all text-center flex flex-col items-center justify-center min-h-[52px]",
                    selectedSlot === slot.label
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                      : (slot.isOverlapping || isCompleted)
                        ? "bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed italic"
                        : "bg-white text-gray-700 border-gray-300 hover:border-indigo-500 hover:text-indigo-600"
                  )}
                >
                  <span className={cn((slot.isOverlapping || isCompleted) && "opacity-60")}>{slot.displayLabel}</span>
                </button>
              ))}
            </div>
          </div>

          {selectedSlot === 'Custom' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                <input
                  required
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  disabled={isCompleted}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                <input
                  required
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  disabled={isCompleted}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Comments</label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={3}
              disabled={isCompleted}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none disabled:bg-gray-50 disabled:text-gray-500"
              placeholder="Add any additional comments here..."
            />
          </div>

          <div className="pt-4 flex justify-between items-center">
            <div>
              {initialData && onDelete && status !== 'cancelled' && !isCompleted && (
                <button
                  type="button"
                  onClick={() => setShowCancelConfirm(true)}
                  className="px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Cancel Interview
                </button>
              )}
            </div>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                {isCompleted ? 'Close' : 'Cancel'}
              </button>
              {!isCompleted && (
                <button
                  type="submit"
                  disabled={isCurrentTimeOverlapping}
                  className={cn(
                    "px-4 py-2 text-sm font-medium text-white border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors",
                    isCurrentTimeOverlapping 
                      ? "bg-gray-400 cursor-not-allowed" 
                      : "bg-indigo-600 hover:bg-indigo-700"
                  )}
                >
                  {initialData ? 'Save Changes' : 'Schedule'}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>

      <ConfirmModal
        isOpen={showCancelConfirm}
        title="Cancel Interview"
        message="Are you sure you want to cancel this interview? This will remove it from the schedule."
        confirmText="Cancel Interview"
        onConfirm={() => {
          if (initialData && onDelete) {
            onDelete(initialData.id);
            setShowCancelConfirm(false);
          }
        }}
        onCancel={() => setShowCancelConfirm(false)}
      />
    </div>
  );
}
