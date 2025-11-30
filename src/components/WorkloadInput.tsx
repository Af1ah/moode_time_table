import { useState, useEffect } from 'react';
import { Subject, Teacher } from '@/lib/types';
import SubjectCard from './SubjectCard';
import AdvancedConstraintsModal from './AdvancedConstraintsModal';

interface WorkloadInputProps {
    cohortIds: number[];
    onScheduleGenerated: (slots: any[]) => void;
    allSlots: any[];
    subjects: Subject[];
    periodsPerDay: number;
    courseTeachers: Record<number, Teacher[]>;
    teacherConstraints: Record<number, string[]>;
    onTeachersUpdate: (courseTeachers: Record<number, Teacher[]>, teacherConstraints: Record<number, string[]>) => void;
}

export default function WorkloadInput(props: WorkloadInputProps) {
    const { cohortIds, onScheduleGenerated, allSlots, subjects, courseTeachers, teacherConstraints, onTeachersUpdate } = props;
    const [workloads, setWorkloads] = useState<Record<number, number>>({});
    const [generating, setGenerating] = useState(false);
    const [activeTeacher, setActiveTeacher] = useState<{ teacher: Teacher, courseName: string } | null>(null);
    const [attendanceInstances, setAttendanceInstances] = useState<Record<number, any[]>>({});
    const [selectedInstances, setSelectedInstances] = useState<Record<number, number>>({});

    // Filter subjects based on selected cohorts
    const filteredSubjects = subjects.filter(s =>
        !s.cohortIds || s.cohortIds.length === 0 || s.cohortIds.some(id => cohortIds.includes(id))
    );

    const maxWorkload = Math.min(props.periodsPerDay * 5, 15);

    // Fetch all teachers for the dropdown
    useEffect(() => {
        async function fetchAllTeachers() {
            try {
                // We need to fetch teachers for ALL subjects to populate the dropdown
                // Or maybe just fetch all teachers in the system?
                // For now, let's fetch teachers for the current subjects
                const subjectIds = filteredSubjects.map(s => s.id);
                if (subjectIds.length === 0) return;

                const res = await fetch('/api/moodle/teachers', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ courseIds: subjectIds }),
                });

                if (res.ok) {
                    const data = await res.json();
                    if (data.success) {
                        // Flatten and unique teachers
                        const all: Teacher[] = [];
                        const seen = new Set();
                        Object.values(data.teachers).forEach((list: any) => {
                            (list as Teacher[]).forEach(t => {
                                if (!seen.has(t.id)) {
                                    seen.add(t.id);
                                    all.push(t);
                                }
                            });
                        });

                        // Also update courseTeachers if not already set
                        // Actually, we should merge with existing
                        const merged = { ...courseTeachers, ...data.teachers };
                        onTeachersUpdate(merged, teacherConstraints);
                    }
                }
            } catch (e) {
                console.error(e);
            }
        }
        fetchAllTeachers();
    }, [subjects]); // Run when subjects change

    // Fetch attendance instances
    useEffect(() => {
        async function fetchAttendanceInstances() {
            try {
                const subjectIds = filteredSubjects.map(s => s.id);
                if (subjectIds.length === 0) return;

                const res = await fetch('/api/moodle/attendance-instances', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ courseIds: subjectIds }),
                });

                if (res.ok) {
                    const data = await res.json();
                    if (data.instances) {
                        setAttendanceInstances(data.instances);

                        // Auto-select logic
                        const newSelected = { ...selectedInstances };
                        Object.entries(data.instances).forEach(([courseId, instances]) => {
                            const cId = Number(courseId);
                            const instList = instances as any[];
                            if (!newSelected[cId]) {
                                if (instList.length > 0) {
                                    // Default to first instance? Or maybe "Create New" if user prefers?
                                    // User said: "if no instence auto select new session"
                                    // So if instances exist, maybe select the first one?
                                    // Let's select the first one if exists, else -1 (New)
                                    newSelected[cId] = instList[0].id;
                                } else {
                                    newSelected[cId] = -1; // -1 for Create New
                                }
                            }
                        });
                        setSelectedInstances(newSelected);
                    }
                }
            } catch (e) {
                console.error('Failed to fetch attendance instances', e);
            }
        }
        fetchAttendanceInstances();
    }, [subjects]);

    const handleHourChange = (subjectId: number, hours: number) => {
        // Enforce max limit
        const validHours = Math.min(Math.max(0, hours), maxWorkload);
        setWorkloads((prev) => ({
            ...prev,
            [subjectId]: validHours,
        }));
    };

    const handleRemoveTeacher = (courseId: number, teacherId: number) => {
        const currentTeachers = courseTeachers[courseId] || [];
        const newCourseTeachers = {
            ...courseTeachers,
            [courseId]: currentTeachers.filter(t => t.id !== teacherId)
        };
        onTeachersUpdate(newCourseTeachers, teacherConstraints);
    };

    const handleConstraintsSave = (teacherId: number, blockedSlots: string[]) => {
        const newConstraints = {
            ...teacherConstraints,
            [teacherId]: blockedSlots
        };
        onTeachersUpdate(courseTeachers, newConstraints);
    };

    const handleInstanceChange = (courseId: number, instanceId: number) => {
        setSelectedInstances(prev => ({
            ...prev,
            [courseId]: instanceId
        }));
    };

    const handleGenerate = async () => {
        if (cohortIds.length === 0) return;
        setGenerating(true);
        try {
            // Map locked slots to format expected by API (day index)
            const daysMap: Record<string, number> = { 'Monday': 0, 'Tuesday': 1, 'Wednesday': 2, 'Thursday': 3, 'Friday': 4 };
            const apiLockedSlots = allSlots.filter(s => s.isLocked).map(s => ({
                ...s,
                day: daysMap[s.day] ?? 0,
            }));

            // Group workloads by cohort
            const cohortWorkloads: Record<number, Record<number, number>> = {};

            // Initialize for selected cohorts
            cohortIds.forEach(id => {
                cohortWorkloads[id] = {};
            });

            // Distribute workloads
            Object.entries(workloads).forEach(([courseIdStr, hours]) => {
                const courseId = Number(courseIdStr);
                const subject = subjects.find(s => s.id === courseId);
                if (subject && subject.cohortIds) {
                    subject.cohortIds.forEach(cId => {
                        if (cohortIds.includes(cId)) {
                            cohortWorkloads[cId][courseId] = hours;
                        }
                    });
                }
            });

            const res = await fetch('/api/schedule/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cohortWorkloads, // Send grouped workloads
                    lockedSlots: apiLockedSlots,
                    periodsPerDay: props.periodsPerDay,
                    teacherConstraints, // Pass teacher constraints
                    courseTeachers,      // Pass teacher mappings
                    attendanceInstances: selectedInstances // Pass selected instances
                }),
            });

            const data = await res.json();
            if (data.success) {
                // Map back to UI format
                const daysInv: Record<number, string> = { 0: 'Monday', 1: 'Tuesday', 2: 'Wednesday', 3: 'Thursday', 4: 'Friday' };
                const uiSlots = data.schedule.map((s: any) => ({
                    ...s,
                    day: daysInv[s.day],
                    subject: subjects.find(sub => sub.id === s.courseId)?.name || 'Unknown'
                }));
                onScheduleGenerated(uiSlots);
            } else {
                alert('Generation failed: ' + data.error);
            }
        } catch (e) {
            console.error(e);
            alert('Generation error');
        } finally {
            setGenerating(false);
        }
    };

    if (cohortIds.length === 0) return null;

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
                {filteredSubjects.map((subject) => {
                    const scheduledCount = allSlots.filter(s => s.courseId === subject.id).length;

                    return (
                        <SubjectCard
                            key={subject.id}
                            subject={subject}
                            hours={workloads[subject.id] || 0}
                            maxHours={maxWorkload}
                            scheduledCount={scheduledCount}
                            onHoursChange={(h) => handleHourChange(subject.id, h)}
                            assignedTeachers={courseTeachers[subject.id] || []}
                            onRemoveTeacher={(tId) => handleRemoveTeacher(subject.id, tId)}
                            onAdvancedConstraints={(t) => setActiveTeacher({ teacher: t, courseName: subject.name })}
                            attendanceInstances={attendanceInstances[subject.id] || []}
                            selectedInstanceId={selectedInstances[subject.id]}
                            onInstanceChange={(id) => handleInstanceChange(subject.id, id)}
                        />
                    );
                })}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200 flex justify-end">
                <button
                    onClick={handleGenerate}
                    disabled={generating}
                    className="hidden md:block w-full sm:w-auto bg-indigo-600 text-white px-6 py-4 rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:shadow-none font-bold text-lg"
                >
                    {generating ? 'Generating Schedule...' : 'Auto-Generate Schedule'}
                </button>
            </div>

            {activeTeacher && (
                <AdvancedConstraintsModal
                    isOpen={!!activeTeacher}
                    onClose={() => setActiveTeacher(null)}
                    entityName={activeTeacher.teacher.fullname}
                    entityId={activeTeacher.teacher.id}
                    periodsPerDay={props.periodsPerDay}
                    onSave={handleConstraintsSave}
                    initialBlockedSlots={teacherConstraints[activeTeacher.teacher.id] || []}
                    type="teacher"
                />
            )}
        </div>
    );
}
