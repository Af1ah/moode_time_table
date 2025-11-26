'use client';

import { useState, useEffect } from 'react';
import { Cohort } from '@/lib/types';
import clsx from 'clsx';

interface CohortSelectorProps {
    onSelect: (cohorts: Cohort[]) => void;
}

export default function CohortSelector({ onSelect }: CohortSelectorProps) {
    const [cohorts, setCohorts] = useState<Cohort[]>([]);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchCohorts() {
            try {
                // Try local storage first
                const cached = localStorage.getItem('user_cohorts_v1');
                if (cached) {
                    setCohorts(JSON.parse(cached));
                    setLoading(false);
                }

                // Fetch from API
                const res = await fetch('/api/moodle/cohorts');
                if (res.ok) {
                    const data = await res.json();
                    setCohorts(data);
                    localStorage.setItem('user_cohorts_v1', JSON.stringify(data));
                }
            } catch (e) {
                console.error('Failed to fetch cohorts', e);
            } finally {
                setLoading(false);
            }
        }
        fetchCohorts();
    }, []);

    const toggleCohort = (cohort: Cohort) => {
        const newSelectedIds = selectedIds.includes(cohort.id)
            ? selectedIds.filter(id => id !== cohort.id)
            : [...selectedIds, cohort.id];

        setSelectedIds(newSelectedIds);

        // Find full cohort objects
        const selectedCohorts = cohorts.filter(c => newSelectedIds.includes(c.id));
        onSelect(selectedCohorts);
    };

    if (loading) {
        return (
            <div className="space-y-3">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <p className="text-base text-gray-500 mb-4 px-1">Select one or more batches from the list below.</p>
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                {cohorts.map((cohort, index) => {
                    const isSelected = selectedIds.includes(cohort.id);
                    return (
                        <div
                            key={cohort.id}
                            onClick={() => toggleCohort(cohort)}
                            className={clsx(
                                "flex items-center justify-between p-5 cursor-pointer transition-colors hover:bg-gray-50 active:bg-gray-100",
                                isSelected ? "bg-indigo-50/50 hover:bg-indigo-50" : "",
                                index !== cohorts.length - 1 && "border-b border-gray-100"
                            )}
                        >
                            <div className="flex items-center gap-4">
                                <div className={clsx(
                                    "w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors",
                                    isSelected ? "bg-indigo-600 border-indigo-600" : "border-gray-300 bg-white"
                                )}>
                                    {isSelected && (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    )}
                                </div>
                                <div>
                                    <span className={clsx("block text-lg font-medium", isSelected ? "text-indigo-900" : "text-gray-900")}>
                                        {cohort.name || cohort.fullname}
                                    </span>
                                    {(cohort.idnumber || cohort.shortname) && (
                                        <span className="text-sm text-gray-500 mt-0.5 block">
                                            {cohort.idnumber || cohort.shortname}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
