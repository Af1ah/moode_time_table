'use client';

import { ReactNode } from 'react';
import clsx from 'clsx';

interface WizardLayoutProps {
    currentStep: number;
    totalSteps: number;
    title: string;
    subtitle: string;
    onBack?: () => void;
    onNext?: () => void;
    isNextDisabled?: boolean;
    nextLabel?: string;
    children: ReactNode;
}

export default function WizardLayout({
    currentStep,
    totalSteps,
    title,
    subtitle,
    onBack,
    onNext,
    isNextDisabled = false,
    nextLabel = 'Next',
    children,
}: WizardLayoutProps) {
    return (
        <div className="min-h-screen flex flex-col bg-[var(--background)] font-sans">
            {/* Header / Top Bar */}
            <header className="bg-white/80 backdrop-blur-md border-b border-[var(--border)] sticky top-0 z-20 transition-all duration-200">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {/* Logo / Icon */}
                        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-sm shadow-indigo-200">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <h1 className="text-lg font-bold text-gray-900 tracking-tight">AutoSchedule</h1>
                    </div>

                    {/* Step Indicator */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:inline-block">Step</span>
                        <div className="flex items-center bg-gray-100 rounded-full px-3 py-1">
                            <span className="text-sm font-bold text-indigo-600">{currentStep}</span>
                            <span className="text-sm text-gray-400 mx-1">/</span>
                            <span className="text-sm font-medium text-gray-500">{totalSteps}</span>
                        </div>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="h-1 w-full bg-gray-100">
                    <div
                        className="h-full bg-indigo-600 transition-all duration-500 ease-out shadow-[0_0_10px_rgba(79,70,229,0.3)]"
                        style={{ width: `${(currentStep / totalSteps) * 100}%` }}
                    />
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 max-w-3xl mx-auto w-full p-4 sm:p-6 pb-32 sm:pb-24">
                <div className="mb-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">{title}</h2>
                    <p className="text-gray-500 text-lg leading-relaxed">{subtitle}</p>
                </div>
                {children}
            </main>

            {/* Desktop Navigation Footer */}
            <div className="hidden sm:block fixed bottom-0 left-0 right-0 bg-white border-t border-[var(--border)] p-4 z-10">
                <div className="max-w-3xl mx-auto flex justify-between items-center">
                    <button
                        onClick={onBack}
                        disabled={!onBack}
                        className={clsx(
                            "px-6 py-2.5 rounded-xl font-medium transition-colors",
                            onBack
                                ? "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                                : "text-gray-300 cursor-not-allowed"
                        )}
                    >
                        Back
                    </button>

                    {onNext && (
                        <button
                            onClick={onNext}
                            disabled={isNextDisabled}
                            className={clsx(
                                "px-8 py-2.5 rounded-xl font-semibold shadow-lg shadow-indigo-200 transition-all transform active:scale-95",
                                isNextDisabled
                                    ? "bg-gray-100 text-gray-400 cursor-not-allowed shadow-none"
                                    : "bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-indigo-300"
                            )}
                        >
                            {nextLabel}
                        </button>
                    )}
                </div>
            </div>

            {/* Mobile FAB Navigation */}
            <div className="sm:hidden fixed bottom-6 left-6 right-6 z-30 flex justify-between items-end pointer-events-none">
                {/* Back Button (Left Aligned) */}
                <div className="pointer-events-auto">
                    {onBack && (
                        <button
                            onClick={onBack}
                            className="w-14 h-14 rounded-full bg-white text-gray-700 shadow-lg border border-gray-200 flex items-center justify-center active:scale-90 transition-transform"
                            aria-label="Go Back"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                    )}
                </div>

                {/* Next Button (Right Aligned) */}
                <div className="pointer-events-auto">
                    {onNext && (
                        <button
                            onClick={onNext}
                            disabled={isNextDisabled}
                            className={clsx(
                                "w-16 h-16 rounded-2xl shadow-xl flex items-center justify-center transition-all transform active:scale-90",
                                isNextDisabled
                                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                                    : "bg-indigo-600 text-white shadow-indigo-300 hover:bg-indigo-700"
                            )}
                            aria-label={nextLabel}
                        >
                            {nextLabel === 'Finish' ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                </svg>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
