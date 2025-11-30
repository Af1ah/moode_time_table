'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CohortSelector from '@/components/CohortSelector';
import WeeklyGrid, { Slot } from '@/components/WeeklyGrid';
import WorkloadInput from '@/components/WorkloadInput';
import TeachersSection from '@/components/TeachersSection';
import SessionCreationPanel from '@/components/SessionCreationPanel';
import WizardLayout from '@/components/WizardLayout';
import TimetableAgenda from '@/components/TimetableAgenda';
import { Cohort, Subject, MOCK_SUBJECTS, Teacher } from '@/lib/types';

export default function Home() {
  // Wizard State
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 2; // Reduced to 2 steps

  // Data State
  const [selectedCohorts, setSelectedCohorts] = useState<Cohort[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [periodCount, setPeriodCount] = useState(5);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [courseTeachers, setCourseTeachers] = useState<Record<number, Teacher[]>>({});
  const [teacherConstraints, setTeacherConstraints] = useState<Record<number, string[]>>({});

  // Overwrite Modal State
  const [showOverwriteModal, setShowOverwriteModal] = useState(false);
  const [overwriteMessage, setOverwriteMessage] = useState('');
  const router = useRouter();

  useEffect(() => {
    async function fetchSubjects() {
      if (selectedCohorts.length === 0) {
        setSubjects([]);
        return;
      }

      try {
        const allCourses: Record<number, Subject> = {};

        for (const cohort of selectedCohorts) {
          const res = await fetch(`/api/moodle/cohort-courses?cohortId=${cohort.id}`);
          if (res.ok) {
            const courses = await res.json();
            courses.forEach((c: any) => {
              if (!allCourses[c.id]) {
                allCourses[c.id] = {
                  id: c.id,
                  name: c.fullname,
                  cohortIds: [cohort.id]
                };
              } else {
                // Add cohortId if not already present
                if (!allCourses[c.id].cohortIds.includes(cohort.id)) {
                  allCourses[c.id].cohortIds.push(cohort.id);
                }
              }
            });
          }
        }

        setSubjects(Object.values(allCourses));
      } catch (e) {
        console.error('Failed to fetch subjects', e);
      }
    }
    fetchSubjects();
  }, [selectedCohorts]);

  // Load recurring sessions when cohorts are selected
  useEffect(() => {
    async function loadRecurringSessions() {
      if (selectedCohorts.length === 0) {
        return;
      }

      try {
        const cohortIdsParam = selectedCohorts.map(c => c.id).join(',');
        const res = await fetch(`/api/schedule/recurring?cohortIds=${cohortIdsParam}`);

        if (res.ok) {
          const recurringSessions = await res.json();

          // Convert recurring sessions to Slot format
          const recurringSlots: Slot[] = recurringSessions.map((session: any) => ({
            day: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'][session.dayOfWeek],
            period: session.period,
            subject: session.courseName,
            cohortId: session.cohortId,
            cohortName: session.cohortName,
            courseId: session.courseId,
            isLocked: true,
          }));

          setSlots(prevSlots => {
            const manualSlots = prevSlots.filter(s => !s.isLocked);
            // Filter out any manual slots that conflict with loaded ones? 
            // Or just merge.
            return [...manualSlots, ...recurringSlots];
          });
        }
      } catch (e) {
        console.error('Failed to load recurring sessions', e);
      }
    }

    loadRecurringSessions();
  }, [selectedCohorts]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  const handleScheduleGenerated = (newSlots: Slot[]) => {
    setSlots(newSlots);
  };

  const handleSlotChange = (updatedSlot: Slot) => {
    setSlots((prev) => {
      const existingIndex = prev.findIndex(s => s.day === updatedSlot.day && s.period === updatedSlot.period && s.cohortId === updatedSlot.cohortId);
      if (existingIndex >= 0) {
        const newSlots = [...prev];
        newSlots[existingIndex] = updatedSlot;
        return newSlots;
      }
      return [...prev, updatedSlot];
    });
  };

  const handleTeachersUpdate = (
    newCourseTeachers: Record<number, Teacher[]>,
    newTeacherConstraints: Record<number, string[]>
  ) => {
    setCourseTeachers(newCourseTeachers);
    setTeacherConstraints(newTeacherConstraints);
  };

  // Wizard Navigation
  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  // Step Titles
  const getStepTitle = () => {
    switch (currentStep) {
      case 1: return 'Select Cohort';
      case 2: return 'Schedule & Timetable';
      default: return '';
    }
  };

  const getStepSubtitle = () => {
    switch (currentStep) {
      case 1: return 'Choose the batch you want to schedule for.';
      case 2: return 'Define workload, assign teachers, and finalize the timetable.';
      default: return '';
    }
  };

  // Step Validation
  const isNextDisabled = () => {
    if (currentStep === 1) return selectedCohorts.length === 0;
    return false;
  };

  const executeSave = async (force = false) => {
    try {
      const res = await fetch('/api/schedule/recurring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cohortIds: selectedCohorts.map(c => c.id),
          slots,
          force
        }),
      });
      const data = await res.json();

      if (data.warning) {
        setOverwriteMessage(data.message);
        setShowOverwriteModal(true);
      } else if (data.success) {
        alert('Timetable Saved to Database!');
        setShowOverwriteModal(false);
      } else {
        alert('Save failed: ' + data.error);
        setShowOverwriteModal(false);
      }
    } catch (e) {
      alert('Save error');
      setShowOverwriteModal(false);
    }
  };

  const handleConfirmOverwrite = () => {
    executeSave(true);
    setShowOverwriteModal(false);
  };

  return (
    <WizardLayout
      currentStep={currentStep}
      totalSteps={totalSteps}
      title={getStepTitle()}
      subtitle={getStepSubtitle()}
      onBack={currentStep > 1 ? handleBack : () => router.push('/')}
      onNext={currentStep < totalSteps ? handleNext : undefined}
      isNextDisabled={isNextDisabled()}
      nextLabel={currentStep === totalSteps ? 'Finish' : 'Next'}
      maxWidth={currentStep === 2 ? 'max-w-[95rem]' : undefined}
    >
      {/* Step 1: Cohort Selection */}
      {currentStep === 1 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
          <CohortSelector onSelect={setSelectedCohorts} />
          {selectedCohorts.length > 0 && (
            <div className="p-4 bg-indigo-50 text-indigo-700 rounded-lg text-sm">
              Selected: {selectedCohorts.map(c => c.name || c.idnumber).join(', ')}
            </div>
          )}
        </div>
      )}

      {/* Step 2: Merged Workload & Timetable */}
      {currentStep === 2 && (
        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">

            {/* Left Column: Workload Input */}
            <div className="xl:col-span-3 space-y-6">
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Workload & Teachers</h3>
                <WorkloadInput
                  cohortIds={selectedCohorts.map(c => c.id)}
                  onScheduleGenerated={handleScheduleGenerated}
                  allSlots={slots}
                  subjects={subjects.length > 0 ? subjects : MOCK_SUBJECTS}
                  periodsPerDay={periodCount}
                  courseTeachers={courseTeachers}
                  teacherConstraints={teacherConstraints}
                  onTeachersUpdate={handleTeachersUpdate}
                />
              </div>
            </div>

            {/* Right Column: Timetable */}
            <div className="xl:col-span-9 space-y-6">
              <div className="bg-white shadow rounded-lg p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-800 mb-1">Weekly Timetable</h2>
                    <p className="text-sm text-gray-500">
                      <strong>Double-click</strong> any slot to edit and lock it.
                    </p>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button
                      onClick={async () => {
                        if (selectedCohorts.length === 0) return alert('Select at least one cohort');
                        try {
                          const res = await fetch('/api/schedule/save', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ cohortIds: selectedCohorts.map(c => c.id), slots }),
                          });
                          if (res.ok) alert('Master Timetable Saved!');
                          else alert('Save failed');
                        } catch (e) {
                          alert('Save error');
                        }
                      }}
                      className="hidden md:block flex-1 sm:flex-none bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors shadow-sm text-sm font-medium"
                    >
                      Save Master
                    </button>
                    <button
                      onClick={() => {
                        if (selectedCohorts.length === 0) return alert('Select at least one cohort');
                        executeSave(false);
                      }}
                      className="hidden md:block flex-1 sm:flex-none bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors shadow-sm text-sm font-medium"
                    >
                      Save Timetable
                    </button>
                  </div>
                </div>

                {/* Desktop View */}
                <div className="hidden md:block overflow-x-auto">
                  <WeeklyGrid
                    selectedCohorts={selectedCohorts}
                    slots={slots}
                    onSlotChange={handleSlotChange}
                    subjects={subjects.length > 0 ? subjects : MOCK_SUBJECTS}
                    onPeriodsChange={setPeriodCount}
                  />
                </div>

                {/* Mobile View */}
                <div className="block md:hidden">
                  <TimetableAgenda
                    selectedCohorts={selectedCohorts}
                    slots={slots}
                    onSlotChange={handleSlotChange}
                    subjects={subjects.length > 0 ? subjects : MOCK_SUBJECTS}
                    periodCount={periodCount}
                  />
                </div>
              </div>

              <SessionCreationPanel
                slots={slots}
                cohortIds={selectedCohorts.map(c => c.id)}
                onSessionsCreated={() => {
                  console.log('Sessions created successfully');
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Overwrite Confirmation Modal */}
      {showOverwriteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4 text-amber-600">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h3 className="text-lg font-bold text-gray-900">Warning</h3>
            </div>

            <p className="text-gray-600 mb-6">
              {overwriteMessage || 'A timetable already exists for these cohorts. Do you want to overwrite it?'}
            </p>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowOverwriteModal(false)}
                className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmOverwrite}
                className="px-4 py-2 bg-amber-600 text-white font-medium rounded-lg hover:bg-amber-700 transition-colors shadow-sm"
              >
                Overwrite
              </button>
            </div>
          </div>
        </div>
      )}
    </WizardLayout>
  );
}
