'use client';

import { useState, useEffect } from 'react';
import { Subject, Teacher } from '@/lib/types';
import AdvancedConstraintsModal from './AdvancedConstraintsModal';
import clsx from 'clsx';

interface TeachersSectionProps {
    subjects: Subject[];
    onUpdate: (
        courseTeachers: Record<number, Teacher[]>,
        teacherConstraints: Record<number, string[]>
    ) => void;
    periodsPerDay: number;
}

export default function TeachersSection({ subjects, onUpdate, periodsPerDay }: TeachersSectionProps) {
    const [courseTeachers, setCourseTeachers] = useState<Record<number, Teacher[]>>({});
    const [teacherConstraints, setTeacherConstraints] = useState<Record<number, string[]>>({});
    const [loading, setLoading] = useState(false);
    const [activeTeacher, setActiveTeacher] = useState<{ teacher: Teacher, courseName: string } | null>(null);

    // Fetch teachers when subjects change
    useEffect(() => {
        async function fetchTeachers() {
            if (subjects.length === 0) return;

            // Identify new subjects that we haven't fetched yet
            const newSubjectIds = subjects
                .map(s => s.id)
                .filter(id => !courseTeachers[id]);

            if (newSubjectIds.length === 0) return;

            setLoading(true);
            try {
                const res = await fetch('/api/moodle/teachers', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ courseIds: newSubjectIds }),
                });

                if (res.ok) {
                    const data = await res.json();
                    if (data.success) {
                        setCourseTeachers(prev => ({ ...prev, ...data.teachers }));
                    }
                }
            } catch (error) {
                console.error('Failed to fetch teachers', error);
            } finally {
                setLoading(false);
            }
        }

        fetchTeachers();
    }, [subjects]);

    // Notify parent when teachers or constraints change
    useEffect(() => {
        onUpdate(courseTeachers, teacherConstraints);
    }, [courseTeachers, teacherConstraints]);


    const handleRemoveTeacher = (courseId: number, teacherId: number) => {
        setCourseTeachers(prev => {
            const next = { ...prev };
            if (next[courseId]) {
                next[courseId] = next[courseId].filter(t => t.id !== teacherId);
            }
            return next;
        });
    };

    const handleConstraintsSave = (teacherId: number, blockedSlots: string[]) => {
        setTeacherConstraints(prev => ({ ...prev, [teacherId]: blockedSlots }));
    };

    if (subjects.length === 0) return null;

    return (
        <>
            <div className="space-y-4">
                {subjects.map(subject => {
                    const teachers = courseTeachers[subject.id] || [];
                    const isLoading = loading && !courseTeachers[subject.id];

                    return (
                        <div key={subject.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                            <div className="flex justify-between items-start mb-3">
                                <h4 className="font-semibold text-gray-900">{subject.name}</h4>
                                <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                    {teachers.length} Assigned
                                </span>
                            </div>

                            {isLoading ? (
                                <div className="animate-pulse flex gap-2">
                                    <div className="h-8 w-24 bg-gray-100 rounded-full"></div>
                                    <div className="h-8 w-32 bg-gray-100 rounded-full"></div>
                                </div>
                            ) : teachers.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {teachers.map(teacher => {
                                        const isBlocked = (teacherConstraints[teacher.id]?.length || 0) > 0;
                                        const initials = teacher.fullname.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

                                        return (
                                            <div
                                                key={teacher.id}
                                                className={clsx(
                                                    "inline-flex items-center gap-2 pl-1 pr-2 py-1 rounded-full border transition-colors",
                                                    isBlocked
                                                        ? "bg-indigo-50 border-indigo-200"
                                                        : "bg-gray-50 border-gray-200 hover:border-gray-300"
                                                )}
                                            >
                                                <div className={clsx(
                                                    "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold",
                                                    isBlocked ? "bg-indigo-200 text-indigo-800" : "bg-gray-200 text-gray-700"
                                                )}>
                                                    {initials}
                                                </div>

                                                <span className="text-sm font-medium text-gray-700 max-w-[100px] truncate">
                                                    {teacher.fullname}
                                                </span>

                                                {/* Constraints Button */}
                                                <button
                                                    onClick={() => setActiveTeacher({ teacher, courseName: subject.name })}
                                                    className={clsx(
                                                        "p-0.5 rounded-full transition-colors",
                                                        isBlocked ? "text-indigo-600 hover:bg-indigo-100" : "text-gray-400 hover:text-gray-600 hover:bg-gray-200"
                                                    )}
                                                    title="Availability Constraints"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                                                    </svg>
                                                </button>

                                                {/* Remove Button */}
                                                <button
                                                    onClick={() => handleRemoveTeacher(subject.id, teacher.id)}
                                                    className="p-0.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                                                    title="Remove"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                                    </svg>
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-sm text-gray-500 italic bg-gray-50 p-3 rounded-lg border border-dashed border-gray-200 text-center">
                                    No teachers assigned.
                                    <br />
                                    <span className="text-xs text-gray-400">Sync from Moodle to populate.</span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {activeTeacher && (
                <AdvancedConstraintsModal
                    isOpen={!!activeTeacher}
                    onClose={() => setActiveTeacher(null)}
                    entityName={activeTeacher.teacher.fullname}
                    entityId={activeTeacher.teacher.id}
                    periodsPerDay={periodsPerDay}
                    onSave={handleConstraintsSave}
                    initialBlockedSlots={teacherConstraints[activeTeacher.teacher.id] || []}
                    type="teacher"
                />
            )}
        </>
    );
}
