'use client';

import { useState, useEffect } from 'react';
import clsx from 'clsx';
import { Subject, Cohort } from '@/lib/types';

// Types
type Day = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday';
const DAYS: Day[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export interface Slot {
    day: string;
    period: number;
    isLocked: boolean;
    subject?: string;
    courseId?: number;
    startTime?: string; // HH:mm
    endTime?: string;   // HH:mm
    cohortId?: number;
    cohortName?: string;
}

interface WeeklyGridProps {
    selectedCohorts: Cohort[];
    slots: Slot[];
    subjects: Subject[];
    onSlotChange: (slot: Slot) => void;
    onPeriodsChange?: (periods: number) => void;
}

export default function WeeklyGrid({ selectedCohorts, slots, subjects, onSlotChange, onPeriodsChange }: WeeklyGridProps) {
    const [periodCount, setPeriodCount] = useState(5);

    // Default times for each period (0-indexed)
    const [periodTimes, setPeriodTimes] = useState<{ start: string, end: string }[]>([]);

    // Initialize times when periodCount changes
    useEffect(() => {
        setPeriodTimes(prev => {
            const newTimes = [...prev];

            // Define default times based on index
            const defaults = [
                { start: '09:30', end: '10:30' },
                { start: '10:30', end: '11:25' },
                { start: '11:40', end: '12:30' },
                { start: '13:30', end: '14:30' },
                { start: '14:30', end: '15:30' },
            ];

            // Add missing times if count increased
            for (let i = prev.length; i < periodCount; i++) {
                if (i < defaults.length) {
                    newTimes.push(defaults[i]);
                } else {
                    // Fallback for extra periods
                    newTimes.push({
                        start: `${9 + i}:00`.padStart(5, '0'),
                        end: `${10 + i}:00`.padStart(5, '0')
                    });
                }
            }
            return newTimes;
        });

        // Notify parent of period count change
        if (onPeriodsChange) {
            onPeriodsChange(periodCount);
        }
    }, [periodCount, onPeriodsChange]);

    const getSlot = (day: string, period: number, cohortId: number) => {
        return slots.find((s) => s.day === day && s.period === period && s.cohortId === cohortId);
    };

    const handleTimeChange = (index: number, field: 'start' | 'end', value: string) => {
        const newTimes = [...periodTimes];
        newTimes[index] = { ...newTimes[index], [field]: value };
        setPeriodTimes(newTimes);
    };

    const handleSubjectChange = (day: string, period: number, cohortId: number, courseIdStr: string) => {
        const courseId = Number(courseIdStr);
        const selectedSubject = subjects.find(s => s.id === courseId);
        const times = periodTimes[period];

        onSlotChange({
            day,
            period,
            cohortId,
            isLocked: true, // Auto-lock
            courseId: courseId || undefined,
            subject: selectedSubject?.name,
            startTime: times?.start || '09:00',
            endTime: times?.end || '10:00'
        });
    };

    const addPeriod = () => {
        setPeriodCount(prev => prev + 1);
    };

    const removePeriod = () => {
        setPeriodCount(prev => Math.max(1, prev - 1));
    };

    if (selectedCohorts.length === 0) {
        return (
            <div className="flex items-center justify-center h-96 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg">
                <p className="text-gray-500 text-lg">Please select at least one cohort to view the timetable.</p>
            </div>
        );
    }

    return (
        <div className="mt-6 overflow-x-auto">
            <table className="min-w-full border-collapse border border-gray-200">
                <thead>
                    <tr>
                        <th className="p-2 border border-gray-200 bg-gray-50 text-left text-sm font-semibold text-gray-600 w-24">
                            Day
                        </th>
                        <th className="p-2 border border-gray-200 bg-gray-50 text-left text-sm font-semibold text-gray-600 w-32">
                            Cohort
                        </th>
                        {Array.from({ length: periodCount }).map((_, i) => (
                            <th key={i} className="p-2 border border-gray-200 bg-gray-50 text-center min-w-[180px]">
                                <div className="text-sm font-bold text-gray-700 mb-1">Period {i + 1}</div>
                                <div className="flex items-center justify-center gap-1">
                                    <input
                                        type="time"
                                        value={periodTimes[i]?.start || ''}
                                        onChange={(e) => handleTimeChange(i, 'start', e.target.value)}
                                        className="text-sm border rounded px-1 w-24 text-center text-gray-900 bg-white"
                                    />
                                    <span className="text-gray-400">-</span>
                                    <input
                                        type="time"
                                        value={periodTimes[i]?.end || ''}
                                        onChange={(e) => handleTimeChange(i, 'end', e.target.value)}
                                        className="text-sm border rounded px-1 w-24 text-center text-gray-900 bg-white"
                                    />
                                </div>
                            </th>
                        ))}
                        <th className="p-2 border border-gray-200 bg-gray-50 text-center w-24 align-middle">
                            <div className="flex gap-1 justify-center">
                                <button
                                    onClick={removePeriod}
                                    className="w-8 h-8 flex items-center justify-center rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition-colors font-bold text-lg"
                                    title="Remove Period"
                                    disabled={periodCount <= 1}
                                >
                                    -
                                </button>
                                <button
                                    onClick={addPeriod}
                                    className="w-8 h-8 flex items-center justify-center rounded-full bg-indigo-100 text-indigo-600 hover:bg-indigo-200 transition-colors font-bold text-lg"
                                    title="Add Period"
                                >
                                    +
                                </button>
                            </div>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {DAYS.map((day) => (
                        selectedCohorts.map((cohort, cohortIndex) => {
                            const isFirstCohort = cohortIndex === 0;
                            // Filter subjects for this cohort
                            const cohortSubjects = subjects.filter(s => !s.cohortIds || s.cohortIds.length === 0 || s.cohortIds.includes(cohort.id));

                            return (
                                <tr key={`${day}-${cohort.id}`}>
                                    {isFirstCohort && (
                                        <td
                                            className="p-3 border border-gray-200 bg-gray-50 font-semibold text-gray-700 text-sm align-top pt-4"
                                            rowSpan={selectedCohorts.length}
                                        >
                                            {day}
                                        </td>
                                    )}
                                    <td className="p-2 border border-gray-200 bg-white text-sm font-medium text-gray-600">
                                        {cohort.idnumber || cohort.shortname || cohort.name}
                                    </td>
                                    {Array.from({ length: periodCount }).map((_, periodIndex) => {
                                        const slot = getSlot(day, periodIndex, cohort.id);

                                        return (
                                            <td key={`${day}-${cohort.id}-${periodIndex}`} className="p-1 border border-gray-200 relative h-16">
                                                <select
                                                    value={slot?.courseId || ''}
                                                    onChange={(e) => handleSubjectChange(day, periodIndex, cohort.id, e.target.value)}
                                                    className={clsx(
                                                        "w-full h-full p-2 text-sm border-none focus:ring-2 focus:ring-indigo-500 rounded transition-colors cursor-pointer appearance-none text-center font-medium",
                                                        slot?.courseId
                                                            ? "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                                                            : "bg-white text-gray-900 hover:bg-gray-50"
                                                    )}
                                                >
                                                    <option value="" className="text-gray-500 bg-white">-- Empty --</option>
                                                    {slot?.courseId && !cohortSubjects.find(s => s.id === slot.courseId) && (
                                                        <option value={slot.courseId} className="text-gray-900 bg-white">
                                                            {slot.subject || `Course ${slot.courseId}`} (Saved)
                                                        </option>
                                                    )}
                                                    {cohortSubjects.map(s => (
                                                        <option key={s.id} value={s.id} className="text-gray-900 bg-white">{s.name}</option>
                                                    ))}
                                                </select>
                                                {/* Visual indicator for locked/assigned */}
                                                {slot?.courseId && (
                                                    <div className="absolute top-1 right-1 w-2 h-2 bg-indigo-500 rounded-full pointer-events-none" title="Locked" />
                                                )}
                                            </td>
                                        );
                                    })}
                                    <td className="border border-gray-200 bg-gray-50"></td>
                                </tr>
                            );
                        })
                    ))}
                </tbody>
            </table>
        </div>
    );
}

