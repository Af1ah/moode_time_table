'use client';

import { useState, useEffect } from 'react';
import { Slot } from './WeeklyGrid';
import { Subject, Cohort } from '@/lib/types';
import clsx from 'clsx';

interface TimetableAgendaProps {
    selectedCohorts: Cohort[];
    slots: Slot[];
    subjects: Subject[];
    onSlotChange: (slot: Slot) => void;
    periodCount: number;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const PERIOD_TIMES = [
    { start: '09:30', end: '10:30' },
    { start: '10:30', end: '11:25' },
    { start: '11:40', end: '12:30' },
    { start: '13:30', end: '14:30' },
    { start: '14:30', end: '15:30' },
];

export default function TimetableAgenda({ selectedCohorts, slots, subjects, onSlotChange, periodCount }: TimetableAgendaProps) {
    const [selectedDay, setSelectedDay] = useState('Monday');
    const [editingSlot, setEditingSlot] = useState<{ slot: Slot, periodIndex: number, cohortId: number } | null>(null);

    // Bottom Sheet State
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    const openEditSheet = (periodIndex: number, cohortId: number) => {
        const existingSlot = slots.find(s => s.day === selectedDay && s.period === periodIndex && s.cohortId === cohortId);
        const times = PERIOD_TIMES[periodIndex] || { start: `${9 + periodIndex}:00`, end: `${10 + periodIndex}:00` };

        setEditingSlot({
            slot: existingSlot || {
                day: selectedDay,
                period: periodIndex,
                cohortId: cohortId,
                isLocked: false,
                startTime: times.start,
                endTime: times.end
            },
            periodIndex,
            cohortId
        });
        setIsSheetOpen(true);
    };

    const handleSaveSlot = (courseIdStr: string) => {
        if (!editingSlot) return;

        const courseId = Number(courseIdStr);
        const selectedSubject = subjects.find(s => s.id === courseId);

        onSlotChange({
            ...editingSlot.slot,
            isLocked: true,
            courseId: courseId || undefined,
            subject: selectedSubject?.name,
        });
        setIsSheetOpen(false);
    };

    if (selectedCohorts.length === 0) return null;

    return (
        <div className="flex flex-col h-full">
            {/* Day Tabs */}
            <div className="flex overflow-x-auto pb-2 mb-2 no-scrollbar gap-2 snap-x">
                {DAYS.map(day => (
                    <button
                        key={day}
                        onClick={() => setSelectedDay(day)}
                        className={clsx(
                            "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap snap-start transition-colors",
                            selectedDay === day
                                ? "bg-indigo-600 text-white shadow-md"
                                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                        )}
                    >
                        {day.substring(0, 3)}
                    </button>
                ))}
            </div>

            {/* Agenda List */}
            <div className="space-y-6 pb-24">
                {selectedCohorts.map(cohort => {
                    // Filter subjects for this cohort
                    const cohortSubjects = subjects.filter(s => !s.cohortIds || s.cohortIds.length === 0 || s.cohortIds.includes(cohort.id));

                    return (
                        <div key={cohort.id} className="space-y-3">
                            <h3 className="font-semibold text-gray-800 sticky top-0 bg-gray-50 py-2 z-10 border-b border-gray-200">
                                {cohort.name}
                            </h3>

                            {Array.from({ length: periodCount }).map((_, i) => {
                                const slot = slots.find(s => s.day === selectedDay && s.period === i && s.cohortId === cohort.id);
                                const times = PERIOD_TIMES[i] || { start: `${9 + i}:00`, end: `${10 + i}:00` };
                                const startTime = times.start;
                                const endTime = times.end;

                                return (
                                    <div
                                        key={i}
                                        onClick={() => openEditSheet(i, cohort.id)}
                                        className={clsx(
                                            "bg-white p-4 rounded-xl border-l-4 shadow-sm active:scale-[0.99] transition-all cursor-pointer flex items-center justify-between",
                                            slot?.courseId ? "border-l-indigo-500" : "border-l-gray-300"
                                        )}
                                    >
                                        <div className="flex flex-col">
                                            <span className="text-xs font-mono text-gray-400 mb-1">
                                                {startTime} - {endTime}
                                            </span>
                                            <span className={clsx(
                                                "font-medium text-lg",
                                                slot?.courseId ? "text-indigo-900" : "text-gray-400 italic"
                                            )}>
                                                {slot?.subject || "Free Slot"}
                                            </span>
                                        </div>

                                        <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                            </svg>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    );
                })}
            </div>

            {/* Bottom Sheet Overlay */}
            {isSheetOpen && (
                <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
                        onClick={() => setIsSheetOpen(false)}
                    />

                    {/* Sheet Content */}
                    <div className="relative w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl p-6 shadow-xl animate-in slide-in-from-bottom duration-300">
                        <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6" />

                        <h3 className="text-xl font-bold text-gray-900 mb-1">Edit Slot</h3>
                        <p className="text-sm text-gray-500 mb-6">
                            {selectedDay}, Period {editingSlot ? editingSlot.periodIndex + 1 : ''}
                        </p>

                        <div className="space-y-4">
                            <label className="block text-sm font-medium text-gray-700">Select Subject</label>
                            <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto">
                                <button
                                    onClick={() => handleSaveSlot('')}
                                    className={clsx(
                                        "w-full text-left px-4 py-3 rounded-lg border transition-colors",
                                        !editingSlot?.slot.courseId
                                            ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                                            : "border-gray-200 hover:bg-gray-50"
                                    )}
                                >
                                    -- Free / Empty --
                                </button>
                                {subjects
                                    .filter(s => !s.cohortIds || s.cohortIds.length === 0 || (editingSlot && s.cohortIds.includes(editingSlot.cohortId)))
                                    .map(subject => (
                                        <button
                                            key={subject.id}
                                            onClick={() => handleSaveSlot(String(subject.id))}
                                            className={clsx(
                                                "w-full text-left px-4 py-3 rounded-lg border transition-colors",
                                                editingSlot?.slot.courseId === subject.id
                                                    ? "border-indigo-600 bg-indigo-50 text-indigo-700 font-medium"
                                                    : "border-gray-200 hover:bg-gray-50 text-gray-700"
                                            )}
                                        >
                                            {subject.name}
                                        </button>
                                    ))
                                }
                            </div>
                        </div>

                        <button
                            onClick={() => setIsSheetOpen(false)}
                            className="mt-6 w-full py-3 text-gray-500 font-medium hover:text-gray-700"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
