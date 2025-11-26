'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';

interface Session {
  id: number;
  time: string;
  courseName: string;
  cohortName: string;
  period: number;
  sessionId: number;
  courseModuleId?: number;
  attendanceId?: number;
  description?: string;
}

export default function TeacherViewPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [date, setDate] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchTodaySessions();
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchTodaySessions, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchTodaySessions = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/sessions/today?t=${Date.now()}`);
      if (res.status === 401) {
        router.push('/login');
        return;
      }

      if (!res.ok) {
        throw new Error("Failed to fetch today's sessions");
      }

      const data = await res.json();
      console.log("Fetched sessions:", data.sessions);

      // ⭐ FIX: Save array to state
      setSessions(data.sessions);

      // Save fetched date
      setDate(data.date || new Date().toISOString().split('T')[0]);

    } catch (err: any) {
      console.error("Error fetching sessions:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };


  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleCardClick = (session: Session) => {
    console.log('Card clicked (Full Object):', JSON.stringify(session, null, 2));
    const moodleBaseUrl = 'http://localhost'; // Or get from env if exposed

    if (session.courseModuleId) {
      // Redirect using Course Module ID (Preferred)
      const url = `${moodleBaseUrl}/mod/attendance/take.php?id=${session.courseModuleId}&sessionid=${session.sessionId}&grouptype=0`;
      console.log('Opening (CMID):', url);
      window.open(url, '_self');
    } else if (session.attendanceId) {
      // Fallback to Attendance Instance ID (might not work for take.php)
      const url = `${moodleBaseUrl}/mod/attendance/take.php?a=${session.attendanceId}&sessionid=${session.sessionId}&grouptype=0`;
      console.log('Opening (AttendanceID):', url);
      window.open(url, '_self');
    } else {
      console.error('Missing IDs for session:', session);
      alert('Missing Moodle IDs for this session. Cannot redirect.\nCheck console for details.');
    }
  };

  return (
    <main className="min-h-screen bg-[#F9FAFB] py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Today's Sessions</h1>
            {date && (
              <p className="text-base sm:text-lg text-gray-500 mt-0.5 sm:mt-1">{formatDate(date)}</p>
            )}
          </div>
          <div className="flex gap-2 self-start sm:self-auto">
            <button
              onClick={() => router.push('/wizard')}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium shadow-sm hover:bg-indigo-700 transition-colors"
            >
              Manage Timetable
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 sm:h-28 bg-white rounded-xl border border-gray-100 shadow-sm animate-pulse" />
            ))}
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-center">
            <h3 className="text-red-800 font-semibold mb-2">Unable to load sessions</h3>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={fetchTodaySessions}
              className="px-6 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium"
            >
              Retry
            </button>
          </div>
        )}

        {/* Sessions List */}
        {!loading && !error && (
          <div className="space-y-4">
            {sessions.length > 0 ? (
              sessions.map((session, index) => (
                <div
                  key={index}
                  onClick={() => handleCardClick(session)}
                  className="group bg-white rounded-xl border border-gray-200 p-4 sm:p-5 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all duration-200 cursor-pointer active:scale-[0.99]"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg sm:text-xl font-bold text-gray-900 group-hover:text-indigo-700 transition-colors leading-tight">
                        {session.courseName}
                      </h3>
                      <p className="text-gray-500 text-sm font-medium mt-1">
                        {session.cohortName}
                      </p>
                    </div>
                    <span className="inline-flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-indigo-50 text-indigo-700 font-bold text-xs sm:text-sm shrink-0 ml-3">
                      P{session.period + 1}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="font-medium text-sm">{session.time}</span>
                    </div>

                    <div className="flex items-center gap-1 text-indigo-600 font-medium text-xs sm:text-sm group-hover:translate-x-1 transition-transform">
                      Take Attendance
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No Sessions Today</h3>
                <p className="text-gray-500">You don't have any classes scheduled for today.</p>
              </div>
            )}

            {/* Auto-refresh indicator */}
            <div className="flex justify-center items-center gap-2 text-sm text-gray-400 pt-4">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
              <p>Live updates • Last checked: {new Date().toLocaleTimeString()}</p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
