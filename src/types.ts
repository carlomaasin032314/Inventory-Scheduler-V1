export type InterviewStatus = 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
export type AccreditationType = 'Practitioner' | 'Consultant';
export type InterviewType = 'Face to Face' | 'Online Interview';

export interface Interview {
  id: string;
  candidateName: string;
  candidateEmail?: string;
  accreditationType: string;
  interviewType?: InterviewType;
  zoomLink?: string;
  comments?: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  status: InterviewStatus;
  notes?: string;
  isRescheduled?: boolean;
}

export const MOCK_INTERVIEWS: Interview[] = [
  {
    id: '1',
    candidateName: 'Alice Smith',
    accreditationType: 'Frontend Engineer',
    date: new Date().toISOString().split('T')[0],
    startTime: '10:00',
    endTime: '11:00',
    status: 'scheduled',
  },
  {
    id: '2',
    candidateName: 'Bob Jones',
    accreditationType: 'Backend Engineer',
    date: new Date().toISOString().split('T')[0],
    startTime: '13:00',
    endTime: '14:30',
    status: 'scheduled',
  },
  {
    id: '3',
    candidateName: 'Charlie Brown',
    accreditationType: 'Product Manager',
    date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '10:00',
    status: 'scheduled',
  },
];
