'use client';

import { useState, useEffect } from 'react';
import { Cohort } from '@/lib/types';

interface CohortSelectorProps {
    onSelect: (cohorts: Cohort[]) => void;
}

export default function CohortSelector({ onSelect }: CohortSelectorProps) {
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [cohorts, setCohorts] = useState<Cohort[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchCohorts() {
            try {
                // Try to find cohorts in localStorage first
                let localCohorts: Cohort[] | null = null;
                if (typeof window !== 'undefined') {
                    for (let i = 0; i < localStorage.length; i++) {
                        const key = localStorage.key(i);
                        if (key && key.startsWith('user_cohorts_')) {
                            try {
                                const stored = localStorage.getItem(key);
                                if (stored) {
                                    const parsed = JSON.parse(stored);
                                    if (parsed.cohorts && Array.isArray(parsed.cohorts)) {
                                        localCohorts = parsed.cohorts;
                                        break; // Found it
                                    }
                                }
                            } catch (e) {
                                console.warn('Error parsing local cohorts', e);
                            }
                        }
                    }
                }

                if (localCohorts) {
                    console.log('Loaded cohorts from localStorage', localCohorts);
                    setCohorts(localCohorts);
                    setLoading(false);
                    return;
                }

                // Fallback to API
                const res = await fetch('/api/moodle/cohorts');
                if (res.ok) {
                    const data = await res.json();
                    setCohorts(data);
                }
            } catch (error) {
                console.error('Failed to fetch cohorts', error);
            } finally {
                setLoading(false);
            }
        }
        fetchCohorts();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const options = Array.from(e.target.selectedOptions);
        const ids = options.map(option => Number(option.value));
        setSelectedIds(ids);

        const selectedCohorts = cohorts.filter(c => ids.includes(c.id));
        onSelect(selectedCohorts);
    };

    return (
        <div className="p-4 bg-white shadow-sm rounded-lg border border-gray-200">
            <label htmlFor="cohort-select" className="block text-sm font-medium text-gray-700 mb-2">
                Select Cohort / Batch (Hold Ctrl/Cmd to select multiple)
            </label>
            <select
                id="cohort-select"
                multiple
                value={selectedIds.map(String)}
                onChange={handleChange}
                disabled={loading}
                className="block w-full pl-3 pr-10 py-2 text-base text-gray-900 bg-white border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md h-32"
            >
                {cohorts.map((cohort) => (
                    <option key={cohort.id} value={cohort.id} className="text-gray-900">
                        {cohort.name || cohort.fullname} ({cohort.idnumber || cohort.shortname})
                    </option>
                ))}
            </select>
            <p className="mt-2 text-sm text-gray-500">
                Selecting a cohort will filter the schedule view.
            </p>
        </div>
    );
}
