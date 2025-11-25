'use client';

import { useRouter } from 'next/navigation';
import IndividualSessionForm from '@/components/individual/IndividualSessionForm';

export default function IndividualPage() {
    const router = useRouter();

    return (
        <main className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Individual Session Creator</h1>
                        <p className="text-gray-500 mt-2">Create attendance sessions directly in Moodle</p>
                    </div>
                    <button
                        onClick={() => router.push('/')}
                        className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                        ← Back to Scheduler
                    </button>
                </div>

                {/* Info Banner */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-blue-800">Quick Session Creation</h3>
                            <div className="mt-2 text-sm text-blue-700">
                                <p>This tool creates attendance sessions directly in Moodle without saving to the database. Perfect for one-off sessions or quick scheduling.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Form */}
                <IndividualSessionForm />
            </div>
        </main>
    );
}
