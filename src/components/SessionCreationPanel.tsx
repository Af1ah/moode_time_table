'use client';

import { useState } from 'react';

interface SessionCreationPanelProps {
    slots: any[];
    cohortIds: number[];
    onSessionsCreated: () => void;
}

export default function SessionCreationPanel({ slots, cohortIds, onSessionsCreated }: SessionCreationPanelProps) {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [mode, setMode] = useState<'manual' | 'cron'>('manual');
    const [creating, setCreating] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const handleCreateSessions = async () => {
        if (!startDate || !endDate) {
            setMessage({ type: 'error', text: 'Please select both start and end dates' });
            return;
        }

        if (cohortIds.length === 0) {
            setMessage({ type: 'error', text: 'Please select at least one cohort' });
            return;
        }

        if (slots.length === 0) {
            setMessage({ type: 'error', text: 'No timetable slots available. Please generate a schedule first.' });
            return;
        }

        setCreating(true);
        setMessage(null);

        try {
            const res = await fetch('/api/schedule/create-recurring', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cohortIds,
                    startDate,
                    endDate,
                    slots,
                    mode
                }),
            });

            const data = await res.json();

            if (res.ok && data.success) {
                setMessage({
                    type: 'success',
                    text: `Successfully created ${data.sessionsCreated} sessions in Moodle!`
                });
                onSessionsCreated();
            } else {
                setMessage({
                    type: 'error',
                    text: data.error || 'Failed to create sessions'
                });
            }
        } catch (error) {
            console.error('Session creation error:', error);
            setMessage({
                type: 'error',
                text: 'An error occurred while creating sessions'
            });
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6 mt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Recurring Session Creation</h3>
            <p className="text-sm text-gray-500 mb-6">
                Create Moodle attendance sessions for the generated timetable over a date range.
                Sessions will be created for all scheduled slots with description "regular class".
            </p>

            <div className="space-y-4">
                {/* Mode Toggle */}
                {/* Mode Toggle - Hidden as Cron is not ready */}
                {/* 
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Scheduling Mode
                    </label>
                    <div className="flex gap-4">
                        <button
                            onClick={() => setMode('manual')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${mode === 'manual'
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            Manual (Create Now)
                        </button>
                        <button
                            onClick={() => setMode('cron')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${mode === 'cron'
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            disabled
                            title="Cron mode coming soon"
                        >
                            Cron (Scheduled) - Coming Soon
                        </button>
                    </div>
                </div> 
                */}

                {/* Date Range */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
                            Start Date <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="date"
                            id="startDate"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="block w-full px-3 py-2 text-base text-gray-900 bg-white border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-2">
                            End Date <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="date"
                            id="endDate"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            min={startDate}
                            className="block w-full px-3 py-2 text-base text-gray-900 bg-white border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                            required
                        />
                    </div>
                </div>

                {/* Info Box */}
                {slots.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                        <p className="text-sm text-blue-800">
                            <strong>{slots.filter(s => s.courseId).length} scheduled slots</strong> found in timetable.
                            Sessions will be created for matching weekdays between the selected dates.
                        </p>
                    </div>
                )}

                {/* Message */}
                {message && (
                    <div
                        className={`rounded-md p-4 ${message.type === 'success'
                            ? 'bg-green-50 border border-green-200 text-green-800'
                            : 'bg-red-50 border border-red-200 text-red-800'
                            }`}
                    >
                        <p className="text-sm font-medium">{message.text}</p>
                    </div>
                )}

                {/* Create Button */}
                <div className="pt-2">
                    <button
                        onClick={handleCreateSessions}
                        disabled={creating || !startDate || !endDate}
                        className="w-full bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                        {creating ? 'Creating Sessions...' : 'Create Sessions in Moodle'}
                    </button>
                </div>
            </div>
        </div>
    );
}
