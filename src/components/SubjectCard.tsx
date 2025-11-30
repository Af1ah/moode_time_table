'use client';

import { useState } from 'react';
import { Subject, Teacher } from '@/lib/types';
import clsx from 'clsx';

interface SubjectCardProps {
    subject: Subject;
    hours: number;
    maxHours: number;
    scheduledCount: number;
    onHoursChange: (hours: number) => void;
    assignedTeachers: Teacher[];
    onRemoveTeacher: (teacherId: number) => void;
    onAdvancedConstraints: (teacher: Teacher) => void;
    attendanceInstances?: any[];
    selectedInstanceId?: number;
    onInstanceChange?: (instanceId: number) => void;
}

export default function SubjectCard({
    subject,
    hours,
    maxHours,
    scheduledCount,
    onHoursChange,
    assignedTeachers,
    onRemoveTeacher,
    onAdvancedConstraints,
    attendanceInstances = [],
    selectedInstanceId,
    onInstanceChange
}: SubjectCardProps) {
    const [isOpen, setIsOpen] = useState(false);

    const remaining = Math.max(0, hours - scheduledCount);
    const isOverScheduled = scheduledCount > hours;

    const handleIncrement = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (hours < maxHours) onHoursChange(hours + 1);
    };

    const handleDecrement = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (hours > 0) onHoursChange(hours - 1);
    };

    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden transition-all duration-200 shadow-sm hover:shadow-md">
            {/* Header - Always visible */}
            <div
                onClick={() => setIsOpen(!isOpen)}
                className="p-5 flex items-center justify-between cursor-pointer bg-white active:bg-gray-50"
            >
                <div className="flex-1 min-w-0 pr-4">
                    <h3 className="text-lg font-bold text-gray-900 truncate">{subject.name}</h3>
                    <div className="flex items-center gap-2 mt-1.5 text-base">
                        <span className="text-gray-500">Target: {hours ? hours : 'N/A'} h</span>
                        {scheduledCount > 0 && (
                            <>
                                <span className="text-gray-300">|</span>
                                <span className={clsx(
                                    "font-medium",
                                    isOverScheduled ? "text-red-600" : remaining === 0 ? "text-green-600" : "text-amber-600"
                                )}>
                                    {isOverScheduled ? `Over: ${scheduledCount - hours}` : remaining === 0 ? "Done" : `Left: ${remaining}`}
                                </span>
                            </>
                        )}
                        {assignedTeachers.length > 0 && (
                            <>
                                <span className="text-gray-300">|</span>
                                <span className="text-indigo-600 font-medium bg-indigo-50 px-2 py-0.5 rounded-full text-sm">
                                    {assignedTeachers.length} T
                                </span>
                            </>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {/* Stepper - Visible in header for quick access */}
                    <div className="hidden md:flex items-center bg-gray-100 rounded-xl p-1.5" onClick={e => e.stopPropagation()}>
                        <button
                            onClick={handleDecrement}
                            disabled={hours < 1}
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-white text-gray-600 shadow-sm disabled:opacity-50 disabled:shadow-none hover:text-indigo-600 transition-colors"
                        >
                            <span className="text-xl font-bold">-</span>
                        </button>
                        <span className="w-7 text-center font-bold text-lg text-gray-900">{hours}</span>
                        <button
                            onClick={handleIncrement}
                            disabled={hours >= maxHours}
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-white text-gray-600 shadow-sm disabled:opacity-50 disabled:shadow-none hover:text-indigo-600 transition-colors"
                        >
                            <span className="text-xl font-bold">+</span>
                        </button>
                    </div>

                    {/* Chevron */}
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className={clsx("h-6 w-6 text-gray-400 transition-transform duration-200", isOpen && "rotate-180")}
                        viewBox="0 0 20 20"
                        fill="currentColor"
                    >
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                </div>
            </div>

            {/* Expanded Content */}
            <div className={clsx(
                "border-t border-gray-100 bg-gray-50 transition-all duration-300 ease-in-out overflow-hidden",
                isOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
            )}>
                <div className="p-4 space-y-4">
                    {/* Teachers Section */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-gray-700">Assigned Teachers</span>
                        </div>

                        {/* Assigned Teachers List */}
                        <div className="flex flex-wrap gap-2">
                            {assignedTeachers.length > 0 ? (
                                assignedTeachers.map(teacher => (
                                    <div key={teacher.id} className="inline-flex items-center gap-2 pl-2 pr-1 py-1 bg-white border border-gray-200 rounded-full shadow-sm">
                                        <span className="text-sm text-gray-700">{teacher.fullname}</span>
                                        <button
                                            onClick={() => onAdvancedConstraints(teacher)}
                                            className="p-1 text-gray-400 hover:text-indigo-600 rounded-full hover:bg-indigo-50 transition-colors"
                                            title="Advanced Constraints"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => onRemoveTeacher(teacher.id)}
                                            className="p-1 text-gray-400 hover:text-red-600 rounded-full hover:bg-red-50 transition-colors"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <span className="text-sm text-gray-400 italic">No teachers assigned</span>
                            )}
                        </div>
                    </div>

                    {/* Attendance Instance Section */}
                    {onInstanceChange && (
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-medium text-gray-700">Attendance Instance</span>
                            </div>
                            <select
                                value={selectedInstanceId || -1}
                                onChange={(e) => onInstanceChange(Number(e.target.value))}
                                className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value={-1}>Create New</option>
                                {attendanceInstances.map((instance: any) => (
                                    <option key={instance.id} value={instance.id}>
                                        {instance.name} (ID: {instance.id})
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
