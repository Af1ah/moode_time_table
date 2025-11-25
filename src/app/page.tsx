'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CohortSelector from '@/components/CohortSelector';
import WeeklyGrid, { Slot } from '@/components/WeeklyGrid';
import WorkloadInput from '@/components/WorkloadInput';
import { Cohort, Subject, MOCK_SUBJECTS } from '@/lib/types';

export default function Home() {
  const [selectedCohorts, setSelectedCohorts] = useState<Cohort[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [periodCount, setPeriodCount] = useState(5);
  const [subjects, setSubjects] = useState<Subject[]>([]);
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

  return (
    <main className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Moodle Attendance Automation
            </h1>
            <div className="flex gap-4 items-center">
              <button
                onClick={() => router.push('/individual')}
                className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
              >
                Individual Session →
              </button>
              <button
                onClick={handleLogout}
                className="text-sm text-gray-600 hover:text-gray-900 font-medium"
              >
                Sign Out
              </button>
            </div>
          </div>
          <p className="text-center text-gray-500 mb-8 -mt-6">Set-and-Forget Hybrid Scheduling Engine</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar / Controls */}
          <div className="lg:col-span-1 space-y-6">
            <CohortSelector onSelect={setSelectedCohorts} />
            <WorkloadInput
              cohortIds={selectedCohorts.map(c => c.id)}
              onScheduleGenerated={handleScheduleGenerated}
              allSlots={slots}
              subjects={subjects.length > 0 ? subjects : MOCK_SUBJECTS}
              periodsPerDay={periodCount}
            />
          </div>

          {/* Main Grid */}
          <div className="lg:col-span-3">
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-800 mb-2">Weekly Timetable</h2>
                  <p className="text-sm text-gray-500">
                    <strong>Double-click</strong> any slot to edit and lock it.
                  </p>
                </div>
                <div className="flex gap-2">
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
                    className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors shadow-sm text-sm"
                  >
                    Save Master Timetable
                  </button>
                  <button
                    onClick={async () => {
                      if (selectedCohorts.length === 0) return alert('Select at least one cohort');
                      const date = new Date().toISOString().split('T')[0]; // Today
                      try {
                        const res = await fetch('/api/schedule/sync', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ date, cohortIds: selectedCohorts.map(c => c.id) }),
                        });
                        const data = await res.json();
                        alert(JSON.stringify(data, null, 2));
                      } catch (e) {
                        alert('Sync failed');
                      }
                    }}
                    className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors shadow-sm text-sm"
                  >
                    Sync Today to Moodle
                  </button>
                </div>
              </div>
              <WeeklyGrid
                selectedCohorts={selectedCohorts}
                slots={slots}
                onSlotChange={handleSlotChange}
                subjects={subjects.length > 0 ? subjects : MOCK_SUBJECTS}
                onPeriodsChange={setPeriodCount}
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
