import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { CalendarView } from './components/CalendarView';
import { InterviewList } from './components/InterviewList';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="calendar" element={<CalendarView />} />
          <Route path="interviews" element={<InterviewList />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
