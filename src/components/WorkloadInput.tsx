import { useState } from 'react';
import { Subject, Teacher } from '@/lib/types';
// import AdvancedConstraintsModal from './AdvancedConstraintsModal'; // Removed
// import clsx from 'clsx'; // Removed

interface WorkloadInputProps {
    cohortIds: number[];
    onScheduleGenerated: (slots: any[]) => void;
    allSlots: any[]; // Changed from lockedSlots to allSlots to count everything
    subjects: Subject[];
    periodsPerDay: number;
    courseTeachers: Record<number, Teacher[]>;
    teacherConstraints: Record<number, string[]>;
}

export default function WorkloadInput(props: WorkloadInputProps) {
    const { cohortIds, onScheduleGenerated, allSlots, subjects, courseTeachers, teacherConstraints } = props;
    const [workloads, setWorkloads] = useState<Record<number, number>>({});
    const [generating, setGenerating] = useState(false);
    // const [activeSubject, setActiveSubject] = useState<Subject | null>(null); // Removed
    // const [blockedConstraints, setBlockedConstraints] = useState<Record<number, string[]>>({}); // subjectId -> ["0-1", "2-3"] // Removed

    // Filter subjects based on selected cohorts
    const filteredSubjects = subjects.filter(s =>
        !s.cohortIds || s.cohortIds.length === 0 || s.cohortIds.some(id => cohortIds.includes(id))
    );

    const maxWorkload = Math.min(props.periodsPerDay * 5, 15);

    const handleHourChange = (subjectId: number, hours: number) => {
        // Enforce max limit
        const validHours = Math.min(Math.max(0, hours), maxWorkload);
        setWorkloads((prev) => ({
            ...prev,
            [subjectId]: validHours,
        }));
    };

    // const handleConstraintsSave = (subjectId: number, blockedSlots: string[]) => { // Removed
    //     setBlockedConstraints(prev => ({
    //         ...prev,
    //         [subjectId]: blockedSlots
    //     }));
    // };

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
                    // A subject might belong to multiple cohorts, but usually in a timetable context
                    // a specific instance belongs to one.
                    // However, our mock data says `cohortIds: [1, 2]`.
                    // If a subject is shared, does it mean they attend together?
                    // If so, it's one session for both.
                    // But the scheduler generates per cohort.
                    // If they attend together, it's a constraint that they must be at the same time.
                    // For simplicity, let's assume if a subject is in multiple cohorts,
                    // we schedule it for EACH cohort independently (separate sessions)
                    // OR we pick the first matching selected cohort.
                    // Given "row wise only allow thier courses only", let's assign to all matching selected cohorts.
                    // But wait, if I assign 5 hours of Math to Cohort A and 5 to Cohort B, is it the same teacher?
                    // The user didn't specify teacher constraints.
                    // Let's add the workload to ALL matching selected cohorts.

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
                    courseTeachers      // Pass teacher mappings
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
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-4 mt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Step 3: Define Workload</h3>
            <div className="space-y-4">
                {filteredSubjects.map((subject) => {
                    const scheduledCount = allSlots.filter(s => s.courseId === subject.id).length;
                    // Actually, we should pass ALL slots to count properly if we want to show "Remaining" after generation.
                    // But props.lockedSlots only has locked ones.
                    // Let's assume for now we only count locked ones until we update the prop.

                    const target = workloads[subject.id] || 0;
                    const remaining = Math.max(0, target - scheduledCount);
                    // const isBlocked = (blockedConstraints[subject.id]?.length || 0) > 0; // Removed

                    return (
                        <div key={subject.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-gray-50 rounded-md gap-3">
                            <div className="flex-1 min-w-0">
                                <span className="font-medium text-gray-700 block truncate" title={subject.name}>{subject.name}</span>
                                <div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-x-2 gap-y-1">
                                    <span className={scheduledCount > target ? "text-red-600 font-bold" : ""}>
                                        Sch: {scheduledCount}
                                    </span>
                                    <span className="text-gray-300">|</span>
                                    <span className={remaining > 0 ? "text-amber-600" : "text-green-600"}>
                                        Rem: {remaining}
                                    </span>
                                    {/* {isBlocked && ( // Removed
                                        <div className="w-full sm:w-auto pt-1 sm:pt-0">
                                            <span className="text-indigo-600 font-medium text-[10px] bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                                                Constraints Active
                                            </span>
                                        </div>
                                    )} */}
                                </div>
                            </div>
                            <div className="flex items-center justify-end space-x-2 shrink-0">
                                <label htmlFor={`hours-${subject.id}`} className="text-sm text-gray-500">
                                    Max:
                                </label>
                                <input
                                    id={`hours-${subject.id}`}
                                    type="number"
                                    min="0"
                                    max={maxWorkload}
                                    className="w-16 p-1 border border-gray-300 rounded text-center text-gray-900 bg-white focus:ring-indigo-500 focus:border-indigo-500"
                                    value={workloads[subject.id] || 0}
                                    onChange={(e) => handleHourChange(subject.id, parseInt(e.target.value) || 0)}
                                />
                                {/* <button // Removed
                                    className={clsx(
                                        "w-8 h-8 flex items-center justify-center rounded transition-colors",
                                        isBlocked
                                            ? "bg-indigo-600 text-white hover:bg-indigo-700"
                                            : "bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
                                    )}
                                    title="Advanced Constraints"
                                    onClick={() => setActiveSubject(subject)}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                                    </svg>
                                </button> */}
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200 flex justify-end">
                <button
                    onClick={handleGenerate}
                    disabled={generating}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50"
                >
                    {generating ? 'Generating...' : 'Auto-Generate Schedule'}
                </button>
            </div>
        </div>
    );
}
