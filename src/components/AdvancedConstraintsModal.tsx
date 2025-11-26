'use client';

import { useState, useEffect } from 'react';
import clsx from 'clsx';
import { Subject } from '@/lib/types';

interface AdvancedConstraintsModalProps {
    isOpen: boolean;
    onClose: () => void;
    entityName: string;
    entityId: number;
    periodsPerDay: number;
    onSave: (id: number, blockedSlots: string[]) => void; // blockedSlots: "day-period" strings
    initialBlockedSlots: string[];
    type?: 'subject' | 'teacher';
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export default function AdvancedConstraintsModal({
    isOpen, onClose, entityName, entityId, periodsPerDay, onSave, initialBlockedSlots, type = 'subject'
}: AdvancedConstraintsModalProps) {
    const [blocked, setBlocked] = useState<Set<string>>(new Set(initialBlockedSlots));

    useEffect(() => {
        setBlocked(new Set(initialBlockedSlots));
    }, [initialBlockedSlots, isOpen]);

    if (!isOpen) return null;

    const toggleSlot = (dayIndex: number, periodIndex: number) => {
        const key = `${dayIndex}-${periodIndex}`;
        const newBlocked = new Set(blocked);
        if (newBlocked.has(key)) {
            newBlocked.delete(key);
        } else {
            newBlocked.add(key);
        }
        setBlocked(newBlocked);
    };

    const toggleDay = (dayIndex: number) => {
        // Check if all are blocked
        let allBlocked = true;
        for (let p = 0; p < periodsPerDay; p++) {
            if (!blocked.has(`${dayIndex}-${p}`)) {
                allBlocked = false;
                break;
            }
        }

        const newBlocked = new Set(blocked);
        for (let p = 0; p < periodsPerDay; p++) {
            const key = `${dayIndex}-${p}`;
            if (allBlocked) {
                newBlocked.delete(key); // Unblock all
            } else {
                newBlocked.add(key); // Block all
            }
        }
        setBlocked(newBlocked);
    };

    const togglePeriod = (periodIndex: number) => {
        // Check if all days for this period are blocked
        let allBlocked = true;
        for (let d = 0; d < DAYS.length; d++) {
            if (!blocked.has(`${d}-${periodIndex}`)) {
                allBlocked = false;
                break;
            }
        }

        const newBlocked = new Set(blocked);
        for (let d = 0; d < DAYS.length; d++) {
            const key = `${d}-${periodIndex}`;
            if (allBlocked) {
                newBlocked.delete(key);
            } else {
                newBlocked.add(key);
            }
        }
        setBlocked(newBlocked);
    };

    const toggleAll = () => {
        const totalSlots = DAYS.length * periodsPerDay;
        if (blocked.size === totalSlots) {
            setBlocked(new Set()); // Clear all
        } else {
            const newBlocked = new Set<string>();
            for (let d = 0; d < DAYS.length; d++) {
                for (let p = 0; p < periodsPerDay; p++) {
                    newBlocked.add(`${d}-${p}`);
                }
            }
            setBlocked(newBlocked);
        }
    };

    const handleSave = () => {
        onSave(entityId, Array.from(blocked));
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl p-6 m-4 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-900">
                        Advanced Constraints: <span className="text-indigo-600">{entityName}</span>
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <p className="text-sm text-gray-500 mb-4">
                    Uncheck the boxes to <strong>BLOCK</strong> specific periods for this subject.
                    Checked (Green) means <strong>AVAILABLE</strong>.
                </p>

                <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse">
                        <thead>
                            <tr>
                                <th className="p-2 border bg-gray-50">
                                    <button
                                        onClick={toggleAll}
                                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 uppercase"
                                    >
                                        {blocked.size === DAYS.length * periodsPerDay ? 'Check All' : 'Uncheck All'}
                                    </button>
                                </th>
                                {Array.from({ length: periodsPerDay }).map((_, p) => (
                                    <th key={p} className="p-2 border bg-gray-50 text-center">
                                        <div className="text-xs font-bold text-gray-700 mb-1">P{p + 1}</div>
                                        <button
                                            onClick={() => togglePeriod(p)}
                                            className="text-[10px] text-gray-500 hover:text-indigo-600"
                                        >
                                            Toggle
                                        </button>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {DAYS.map((day, d) => (
                                <tr key={day}>
                                    <td className="p-2 border bg-gray-50 font-medium text-gray-700 text-sm">
                                        <div className="flex items-center justify-between">
                                            <span>{day}</span>
                                            <button
                                                onClick={() => toggleDay(d)}
                                                className="text-[10px] text-gray-500 hover:text-indigo-600 ml-2"
                                            >
                                                Toggle
                                            </button>
                                        </div>
                                    </td>
                                    {Array.from({ length: periodsPerDay }).map((_, p) => {
                                        const isBlocked = blocked.has(`${d}-${p}`);
                                        return (
                                            <td key={`${d}-${p}`} className="p-1 border text-center">
                                                <button
                                                    onClick={() => toggleSlot(d, p)}
                                                    className={clsx(
                                                        "w-full h-10 rounded transition-colors flex items-center justify-center",
                                                        isBlocked
                                                            ? "bg-red-50 text-red-300 hover:bg-red-100"
                                                            : "bg-green-50 text-green-600 hover:bg-green-100"
                                                    )}
                                                >
                                                    {isBlocked ? (
                                                        <span className="text-xs font-bold">X</span>
                                                    ) : (
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    )}
                                                </button>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
                    >
                        Save Constraints
                    </button>
                </div>
            </div>
        </div>
    );
}
