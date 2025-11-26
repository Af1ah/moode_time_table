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

                
                

                {/* Form */}
                <IndividualSessionForm />
            </div>
        </main>
    );
}
