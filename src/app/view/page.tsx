'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Session {
    time: string;
    courseName: string;
    cohortName: string;
    period: number;
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
            const res = await fetch('/api/sessions/today');

            if (res.status === 401) {
                // Not authenticated, redirect to login
                router.push('/login');
                return;
            }

            if (!res.ok) {
                throw new Error('Failed to fetch today\'s sessions');
            }

            const data = await res.json();
            setSessions(data.sessions || []);
            setDate(data.date || new Date().toISOString().split('T')[0]);
        } catch (err: any) {
            console.error('Error fetching sessions:', err);
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

    return (
        <main className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="bg-white shadow-lg rounded-lg p-8 mb-6">
                    <div className="flex justify-between items-center mb-4">
                        <h1 className="text-3xl font-bold text-gray-900">Today's Sessions</h1>
                        <button
                            onClick={() => router.push('/')}
                            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                        >
                            ← Home
                        </button>
                    </div>
                    {date && (
                        <p className="text-xl text-gray-600">{formatDate(date)}</p>
                    )}
                </div>

                {/* Loading State */}
                {loading && (
                    <div className="bg-white shadow-lg rounded-lg p-12 text-center">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                        <p className="mt-4 text-gray-600">Loading your sessions...</p>
                    </div>
                )}

                {/* Error State */}
                {error && !loading && (
                    <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6">
                        <h3 className="text-red-800 font-semibold mb-2">Error Loading Sessions</h3>
                        <p className="text-red-700">{error}</p>
                        <button
                            onClick={fetchTodaySessions}
                            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                        >
                            Retry
                        </button>
                    </div>
                )}

                {/* Sessions List */}
                {!loading && !error && (
                    <>
                        {sessions.length > 0 ? (
                            <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-100">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-gray-50/50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500 font-semibold">
                                                <th className="px-6 py-4">Time</th>
                                                <th className="px-6 py-4">Period</th>
                                                <th className="px-6 py-4">Course</th>
                                                <th className="px-6 py-4">Details</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {sessions.map((session, index) => (
                                                <tr key={index} className="hover:bg-gray-50/50 transition-colors group">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center gap-2 text-gray-700 font-medium">
                                                            <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                            {session.time}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 text-sm font-bold group-hover:bg-indigo-100 transition-colors">
                                                            P{session.period + 1}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="font-semibold text-gray-900 text-lg">{session.courseName}</div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="text-gray-500 text-sm bg-gray-100 inline-block px-2 py-1 rounded-md">
                                                            {session.cohortName}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white shadow-lg rounded-2xl p-12 text-center border border-gray-100">
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
                        <div className="mt-6 flex justify-center items-center gap-2 text-sm text-gray-400">
                            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                            <p>
                                Live updates • Last checked: {new Date().toLocaleTimeString()}
                            </p>
                        </div>
                    </>
                )}
            </div>
        </main>
    );
}
