'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface SessionInstance {
    id: string;
    sessionDate: Date;
    period: number;
    courseId: number;
    cohortId: number;
}

interface RecurringSessionGroup {
    recurringSessionId: string;
    courseName: string;
    cohortName: string;
    courseId: number;
    cohortId: number;
    dayOfWeek: number;
    period: number;
    startDate: Date;
    endDate: Date;
    instances: SessionInstance[];
    instanceCount: number;
}

export default function HistoryPage() {
    const [recurringSessions, setRecurringSessions] = useState<RecurringSessionGroup[]>([]);
    const [individualSessions, setIndividualSessions] = useState<SessionInstance[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await fetch('/api/sessions/history');

            if (!res.ok) {
                throw new Error('Failed to fetch session history');
            }

            const data = await res.json();
            setRecurringSessions(data.recurringSessions || []);
            setIndividualSessions(data.individualSessions || []);
        } catch (err: any) {
            console.error('Error fetching history:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const toggleGroup = (groupId: string) => {
        setExpandedGroups(prev => {
            const newSet = new Set(prev);
            if (newSet.has(groupId)) {
                newSet.delete(groupId);
            } else {
                newSet.add(groupId);
            }
            return newSet;
        });
    };

    const deleteIndividualSession = async (sessionId: string) => {
        if (!confirm('Are you sure you want to delete this session?')) return;

        try {
            const res = await fetch('/api/sessions/delete', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionInstanceId: sessionId }),
            });

            if (!res.ok) {
                throw new Error('Failed to delete session');
            }

            alert('Session deleted successfully');
            fetchHistory(); // Refresh the list
        } catch (err: any) {
            console.error('Error deleting session:', err);
            alert('Failed to delete session: ' + err.message);
        }
    };

    const deleteRecurringGroup = async (recurringSessionId: string, instanceCount: number) => {
        if (!confirm(`Are you sure you want to delete all ${instanceCount} sessions in this recurring group?`)) return;

        try {
            const res = await fetch('/api/sessions/delete-recurring', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ recurringSessionId }),
            });

            if (!res.ok) {
                throw new Error('Failed to delete recurring sessions');
            }

            const data = await res.json();
            alert(`Deleted ${data.deletedCount} sessions successfully`);
            fetchHistory(); // Refresh the list
        } catch (err: any) {
            console.error('Error deleting recurring sessions:', err);
            alert('Failed to delete recurring sessions: ' + err.message);
        }
    };

    return (
        <main className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Session History</h1>
                    <button
                        onClick={() => router.push('/')}
                        className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                        ← Back to Home
                    </button>
                </div>

                {loading && (
                    <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                        <p className="mt-4 text-gray-600">Loading sessions...</p>
                    </div>
                )}

                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                        <p className="text-red-800">Error: {error}</p>
                    </div>
                )}

                {!loading && !error && (
                    <>
                        {/* Recurring Sessions */}
                        {recurringSessions.length > 0 && (
                            <div className="bg-white shadow rounded-lg p-6 mb-6">
                                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                                    Recurring Sessions ({recurringSessions.length})
                                </h2>
                                <div className="space-y-3">
                                    {recurringSessions.map(group => (
                                        <div key={group.recurringSessionId} className="border border-gray-200 rounded-lg">
                                            <div className="p-4 flex items-center justify-between hover:bg-gray-50">
                                                <div className="flex items-center flex-1 cursor-pointer" onClick={() => toggleGroup(group.recurringSessionId)}>
                                                    <button className="mr-3 text-gray-500 hover:text-gray-700">
                                                        {expandedGroups.has(group.recurringSessionId) ? '▼' : '▶'}
                                                    </button>
                                                    <div className="flex-1">
                                                        <div className="font-medium text-gray-900">
                                                            {group.courseName} | {group.cohortName}
                                                        </div>
                                                        <div className="text-sm text-gray-600">
                                                            {dayNames[group.dayOfWeek]} Period {group.period + 1} • {group.instanceCount} sessions
                                                            <span className="ml-2">
                                                                ({new Date(group.startDate).toLocaleDateString()} - {new Date(group.endDate).toLocaleDateString()})
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => deleteRecurringGroup(group.recurringSessionId, group.instanceCount)}
                                                    className="ml-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
                                                >
                                                    Delete All ({group.instanceCount})
                                                </button>
                                            </div>

                                            {/* Expanded instances */}
                                            {expandedGroups.has(group.recurringSessionId) && (
                                                <div className="border-t border-gray-200 bg-gray-50 p-4">
                                                    <div className="space-y-2">
                                                        {group.instances.map(instance => (
                                                            <div key={instance.id} className="flex items-center justify-between bg-white p-3 rounded border border-gray-200">
                                                                <div className="text-sm">
                                                                    <span className="font-medium">{new Date(instance.sessionDate).toLocaleDateString()}</span>
                                                                    <span className="ml-3 text-gray-600">Period {instance.period + 1}</span>
                                                                </div>
                                                                <button
                                                                    onClick={() => deleteIndividualSession(instance.id)}
                                                                    className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors text-sm"
                                                                >
                                                                    Delete
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Individual Sessions */}
                        {individualSessions.length > 0 && (
                            <div className="bg-white shadow rounded-lg p-6">
                                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                                    Individual Sessions ({individualSessions.length})
                                </h2>
                                <div className="space-y-2">
                                    {individualSessions.map(session => (
                                        <div key={session.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                                            <div>
                                                <div className="font-medium text-gray-900">
                                                    Course {session.courseId} | Cohort {session.cohortId}
                                                </div>
                                                <div className="text-sm text-gray-600">
                                                    {new Date(session.sessionDate).toLocaleDateString()} • Period {session.period + 1}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => deleteIndividualSession(session.id)}
                                                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Empty state */}
                        {recurringSessions.length === 0 && individualSessions.length === 0 && (
                            <div className="bg-white shadow rounded-lg p-12 text-center">
                                <p className="text-gray-500 text-lg">No sessions found</p>
                                <p className="text-gray-400 mt-2">Create some recurring or individual sessions to see them here</p>
                            </div>
                        )}
                    </>
                )}
            </div>
        </main>
    );
}
