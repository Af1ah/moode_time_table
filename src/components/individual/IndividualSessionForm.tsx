'use client';

import { useState, useEffect } from 'react';
import { Cohort, Subject } from '@/lib/types';
import CohortSelector from '@/components/CohortSelector';

export default function IndividualSessionForm() {
    const [selectedCohorts, setSelectedCohorts] = useState<Cohort[]>([]);
    const [courses, setCourses] = useState<Subject[]>([]);
    const [selectedCourse, setSelectedCourse] = useState<number | null>(null);
    const [attendanceInstances, setAttendanceInstances] = useState<any[]>([]);
    const [selectedAttendanceId, setSelectedAttendanceId] = useState<number | string | null>(null); // Can be number (existing) or 'CREATE_NEW'
    const [teachers, setTeachers] = useState<any[]>([]);
    const [loadingTeachers, setLoadingTeachers] = useState(false);
    const [date, setDate] = useState('');
    const [time, setTime] = useState('09:00');
    const [duration, setDuration] = useState(60); // minutes
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingInstances, setLoadingInstances] = useState(false);
    const [creatingInstance, setCreatingInstance] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [pendingInstanceName, setPendingInstanceName] = useState('');
    const [pendingSubmitData, setPendingSubmitData] = useState<any>(null);

    // Fetch courses when cohort changes
    useEffect(() => {
        async function fetchCourses() {
            if (selectedCohorts.length === 0) {
                setCourses([]);
                setSelectedCourse(null);
                return;
            }

            try {
                const allCourses: Record<number, Subject> = {};

                for (const cohort of selectedCohorts) {
                    const res = await fetch(`/api/moodle/cohort-courses?cohortId=${cohort.id}`);
                    if (res.ok) {
                        const cohortCourses = await res.json();
                        cohortCourses.forEach((c: any) => {
                            if (!allCourses[c.id]) {
                                allCourses[c.id] = {
                                    id: c.id,
                                    name: c.fullname,
                                    cohortIds: [cohort.id]
                                };
                            } else {
                                if (!allCourses[c.id].cohortIds.includes(cohort.id)) {
                                    allCourses[c.id].cohortIds.push(cohort.id);
                                }
                            }
                        });
                    }
                }

                setCourses(Object.values(allCourses));
            } catch (e) {
                console.error('Failed to fetch courses', e);
                setMessage({ type: 'error', text: 'Failed to load courses' });
            }
        }
        fetchCourses();
    }, [selectedCohorts]);

    // Fetch attendance instances when course changes
    useEffect(() => {
        async function fetchAttendanceInstances() {
            if (!selectedCourse) {
                setAttendanceInstances([]);
                setSelectedAttendanceId(null);
                return;
            }

            setLoadingInstances(true);
            try {
                const course = courses.find(c => c.id === selectedCourse);
                const courseName = course?.name || '';
                const res = await fetch(
                    `/api/individual/attendance-instances?courseId=${selectedCourse}&courseName=${encodeURIComponent(courseName)}`
                );
                if (res.ok) {
                    const instances = await res.json();
                    setAttendanceInstances(instances);
                    // Auto-select if only one instance
                    if (instances.length === 1) {
                        setSelectedAttendanceId(instances[0].instance);
                    }
                } else {
                    setMessage({ type: 'error', text: 'Failed to load attendance instances' });
                }
            } catch (e) {
                console.error('Failed to fetch attendance instances', e);
                setMessage({ type: 'error', text: 'Failed to load attendance instances' });
            } finally {
                setLoadingInstances(false);
            }
        }
        fetchAttendanceInstances();
    }, [selectedCourse, courses]);

    // Fetch teachers when course changes
    useEffect(() => {
        async function fetchTeachers() {
            if (!selectedCourse) {
                setTeachers([]);
                return;
            }

            setLoadingTeachers(true);
            try {
                const res = await fetch(`/api/moodle/course-teachers?courseId=${selectedCourse}`);
                if (res.ok) {
                    const teacherData = await res.json();
                    setTeachers(teacherData);
                    console.log('[Teachers] Fetched teachers:', teacherData);
                } else {
                    console.error('[Teachers] Failed to load teachers');
                    setTeachers([]);
                }
            } catch (e) {
                console.error('[Teachers] Failed to fetch teachers', e);
                setTeachers([]);
            } finally {
                setLoadingTeachers(false);
            }
        }
        fetchTeachers();
    }, [selectedCourse]);

    // Handle creating a new attendance instance
    const handleCreateNewInstance = async () => {
        if (!selectedCourse) return;

        const courseName = courses.find(c => c.id === selectedCourse)?.name || 'Course';
        setCreatingInstance(true);
        setMessage(null);

        try {
            const res = await fetch('/api/moodle/create-attendance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    courseId: selectedCourse,
                    name: `${courseName} + Attendance`,
                }),
            });

            const data = await res.json();

            if (res.ok && data.instanceId) {
                setMessage({ type: 'success', text: 'Attendance instance created successfully!' });

                // Refresh the attendance instances list
                const instancesRes = await fetch(`/api/individual/attendance-instances?courseId=${selectedCourse}`);
                if (instancesRes.ok) {
                    const instances = await instancesRes.json();
                    setAttendanceInstances(instances);

                    // Auto-select the newly created instance
                    setSelectedAttendanceId(data.instanceId);
                }
            } else {
                setMessage({ type: 'error', text: data.error || 'Failed to create attendance instance' });
            }
        } catch (error) {
            console.error('Failed to create attendance instance', error);
            setMessage({ type: 'error', text: 'Failed to create attendance instance' });
        } finally {
            setCreatingInstance(false);
        }
    };

    // Handle attendance selection change - just set the value, don't create yet
    const handleAttendanceChange = (value: string) => {
        if (value === '') {
            setSelectedAttendanceId(null);
        } else if (value === 'CREATE_NEW') {
            // Just mark it as "create new", don't create yet
            setSelectedAttendanceId('CREATE_NEW');
        } else {
            // Existing instance selected
            const instanceId = Number(value);
            if (!isNaN(instanceId)) {
                setSelectedAttendanceId(instanceId);
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);

        if (!selectedAttendanceId || !date || !time) {
            setMessage({ type: 'error', text: 'Please fill in all required fields' });
            return;
        }

        setLoading(true);

        try {
            let finalAttendanceId = selectedAttendanceId;

            // If user selected "Create New", create the instance first
            if (selectedAttendanceId === 'CREATE_NEW') {
                console.log('[Form Submit] Creating new instance');

                if (!selectedCourse) {
                    setMessage({ type: 'error', text: 'No course selected' });
                    setLoading(false);
                    return;
                }

                const courseName = courses.find(c => c.id === selectedCourse)?.name || 'Course';
                const newInstanceName = `${courseName} + Attendance`;

                console.log('[Form Submit] New instance name:', newInstanceName);
                console.log('[Form Submit] Existing instances:', attendanceInstances);
                console.log('[Form Submit] Existing instances names:', attendanceInstances.map(i => i.name));

                // Check if instance with same name already exists
                const existingInstance = attendanceInstances.find(
                    instance => {
                        console.log('[Form Submit] Comparing:', instance.name, '===', newInstanceName, '?', instance.name === newInstanceName);
                        return instance.name === newInstanceName;
                    }
                );

                console.log('[Form Submit] Existing instance found:', existingInstance);

                if (existingInstance) {
                    console.log('[Form Submit] Duplicate found, showing confirmation modal');
                    // Store the pending data and show confirmation modal
                    setPendingInstanceName(newInstanceName);
                    setPendingSubmitData({ date, time, duration, description, selectedCourse, courseName, newInstanceName });
                    setShowConfirmation(true);
                    setLoading(false);
                    return;
                }

                // No duplicate, proceed with creation
                await createNewInstanceAndSession(selectedCourse, newInstanceName, date, time, duration, description);
            } else {
                // Existing instance selected, just create session
                console.log('[Form Submit] Creating session with attendanceId:', finalAttendanceId);
                await createSessionOnly(finalAttendanceId, date, time, duration, description);
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Network error. Please try again.' });
        } finally {
            setLoading(false);
            setCreatingInstance(false);
        }
    };

    // Function to create new instance and session
    const createNewInstanceAndSession = async (
        courseId: number,
        instanceName: string,
        date: string,
        time: string,
        duration: number,
        description: string
    ) => {
        // Create the new instance
        setCreatingInstance(true);
        console.log('[Form Submit] Calling create-attendance API');

        const createRes = await fetch('/api/moodle/create-attendance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                courseId: courseId,
                name: instanceName,
            }),
        });

        const createData = await createRes.json();
        setCreatingInstance(false);

        console.log('[Form Submit] Create attendance response:', createData);

        if (!createRes.ok || !createData.instanceId) {
            console.error('[Form Submit] Failed to create instance:', createData);
            setMessage({
                type: 'error',
                text: `Failed: ${createData.error || 'Unknown error'}` + (createData.details ? ` - ${JSON.stringify(createData.details)}` : '')
            });
            setLoading(false);
            return;
        }

        const newInstanceId = createData.instanceId;
        console.log('[Form Submit] Instance created with ID:', newInstanceId);
        setMessage({ type: 'success', text: 'Attendance instance created! Now creating session...' });

        // Create session with new instance
        await createSessionOnly(newInstanceId, date, time, duration, description);
    };

    // Function to create session only
    const createSessionOnly = async (
        attendanceId: number | string,
        date: string,
        time: string,
        duration: number,
        description: string
    ) => {
        console.log('[Form Submit] Creating session with attendanceId:', attendanceId);

        const res = await fetch('/api/individual/create-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                attendanceId: attendanceId,
                date,
                time,
                duration,
                description: description || 'Individual Session',
            }),
        });

        const data = await res.json();
        console.log('[Form Submit] Create session response:', data);

        if (res.ok) {
            setMessage({ type: 'success', text: 'Session created successfully in Moodle!' });

            // Reset form
            setDescription('');
            setDate('');
            setTime('09:00');
            setSelectedAttendanceId(null);

            // Refresh instances list
            if (selectedCourse) {
                const instancesRes = await fetch(`/api/individual/attendance-instances?courseId=${selectedCourse}`);
                if (instancesRes.ok) {
                    const instances = await instancesRes.json();
                    setAttendanceInstances(instances);
                }
            }
        } else {
            setMessage({ type: 'error', text: data.error || 'Failed to create session' });
        }
    };

    // Handle confirmation modal response
    const handleConfirmationResponse = async (confirmed: boolean) => {
        setShowConfirmation(false);

        if (!confirmed) {
            console.log('[Confirmation] User cancelled');
            setPendingSubmitData(null);
            setPendingInstanceName('');
            return;
        }

        console.log('[Confirmation] User confirmed, proceeding with creation');

        if (pendingSubmitData) {
            setLoading(true);
            const { selectedCourse, newInstanceName, date, time, duration, description } = pendingSubmitData;
            await createNewInstanceAndSession(selectedCourse, newInstanceName, date, time, duration, description);
            setLoading(false);
            setPendingSubmitData(null);
            setPendingInstanceName('');
        }
    };

    return (
        <>
            {/* Confirmation Modal */}
            {showConfirmation && (
                <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}>
                    <div className="bg-white rounded-lg p-6 max-w-md mx-4">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Duplicate Instance Detected</h3>
                        <p className="text-gray-700 mb-6">
                            An attendance instance named <strong>"{pendingInstanceName}"</strong> already exists.
                            Are you sure you want to create another one with the same name?
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => handleConfirmationResponse(false)}
                                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleConfirmationResponse(true)}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                            >
                                Yes, Create Anyway
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="max-w-2xl mx-auto">
                <div className="bg-white shadow-md rounded-lg p-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Create Individual Session</h2>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Cohort Selection */}
                        <div>
                            <CohortSelector onSelect={setSelectedCohorts} />
                        </div>

                        {/* Course Selection */}
                        <div>
                            <label htmlFor="course" className="block text-sm font-medium text-gray-700 mb-2">
                                Select Course <span className="text-red-500">*</span>
                            </label>
                            <select
                                id="course"
                                value={selectedCourse || ''}
                                onChange={(e) => setSelectedCourse(Number(e.target.value))}
                                disabled={courses.length === 0}
                                className="block w-full pl-3 pr-10 py-2 text-base text-gray-900 bg-white border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                                required
                            >
                                <option value="">-- Select a course --</option>
                                {courses.map((course) => (
                                    <option key={course.id} value={course.id}>
                                        {course.name}
                                    </option>
                                ))}
                            </select>
                            {selectedCohorts.length === 0 && (
                                <p className="mt-1 text-sm text-gray-500">Please select a cohort first</p>
                            )}
                        </div>

                        {/* Teachers Display */}
                        {selectedCourse && (
                            <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                                <h4 className="text-sm font-medium text-gray-700 mb-2">Course Teachers</h4>
                                {loadingTeachers ? (
                                    <p className="text-sm text-gray-500">Loading teachers...</p>
                                ) : teachers.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {teachers.map((teacher: any) => (
                                            <span
                                                key={teacher.id}
                                                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800"
                                            >
                                                {teacher.fullname}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-500">No teachers found for this course</p>
                                )}
                            </div>
                        )}

                        {/* Attendance Instance Selection */}
                        <div>
                            <label htmlFor="attendance" className="block text-sm font-medium text-gray-700 mb-2">
                                Select Attendance Module <span className="text-red-500">*</span>
                            </label>
                            <select
                                id="attendance"
                                value={selectedAttendanceId?.toString() || ''}
                                onChange={(e) => handleAttendanceChange(e.target.value)}
                                disabled={!selectedCourse || loadingInstances}
                                className="block w-full pl-3 pr-10 py-2 text-base text-gray-900 bg-white border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                                required
                            >
                                <option value="">-- Select attendance module --</option>
                                {attendanceInstances.map((instance) => (
                                    <option key={instance.instance} value={instance.instance}>
                                        {instance.name}
                                    </option>
                                ))}
                                {selectedCourse && !loadingInstances && (
                                    <option value="CREATE_NEW">
                                        ➕ Create New: {courses.find(c => c.id === selectedCourse)?.name} + Attendance
                                    </option>
                                )}
                            </select>
                            {loadingInstances && (
                                <p className="mt-1 text-sm text-gray-500">Loading attendance modules...</p>
                            )}
                            {!selectedCourse && (
                                <p className="mt-1 text-sm text-gray-500">Please select a course first</p>
                            )}
                            {selectedCourse && !loadingInstances && attendanceInstances.length === 0 && (
                                <p className="mt-1 text-sm text-blue-600">No attendance modules found. Select "Create New" to create one.</p>
                            )}
                            {selectedAttendanceId === 'CREATE_NEW' && (
                                <p className="mt-1 text-sm text-green-600">✓ New instance will be created when you submit the form</p>
                            )}
                        </div>

                        {/* Date */}
                        <div>
                            <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
                                Date <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="date"
                                id="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="block w-full px-3 py-2 text-base text-gray-900 bg-white border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                                required
                            />
                        </div>

                        {/* Time */}
                        <div>
                            <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-2">
                                Start Time <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="time"
                                id="time"
                                value={time}
                                onChange={(e) => setTime(e.target.value)}
                                className="block w-full px-3 py-2 text-base text-gray-900 bg-white border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                                required
                            />
                        </div>

                        {/* Duration */}
                        <div>
                            <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-2">
                                Duration (minutes)
                            </label>
                            <select
                                id="duration"
                                value={duration}
                                onChange={(e) => setDuration(Number(e.target.value))}
                                className="block w-full pl-3 pr-10 py-2 text-base text-gray-900 bg-white border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                            >
                                <option value={30}>30 minutes</option>
                                <option value={45}>45 minutes</option>
                                <option value={60}>60 minutes (1 hour)</option>
                                <option value={90}>90 minutes (1.5 hours)</option>
                                <option value={120}>120 minutes (2 hours)</option>
                            </select>
                        </div>

                        {/* Description */}
                        <div>
                            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                                Description (optional)
                            </label>
                            <textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={3}
                                placeholder="Enter session description..."
                                className="block w-full px-3 py-2 text-base text-gray-900 bg-white border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                            />
                        </div>

                        {/* Message Display */}
                        {message && (
                            <div
                                className={`p-4 rounded-md ${message.type === 'success'
                                    ? 'bg-green-50 text-green-800 border border-green-200'
                                    : 'bg-red-50 text-red-800 border border-red-200'
                                    }`}
                            >
                                {message.text}
                            </div>
                        )}

                        {/* Submit Button */}
                        <div>
                            <button
                                type="submit"
                                disabled={loading || !selectedAttendanceId}
                                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                            >
                                {loading ? (creatingInstance ? 'Creating Instance & Session...' : 'Creating Session...') : 'Create Session in Moodle'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}
