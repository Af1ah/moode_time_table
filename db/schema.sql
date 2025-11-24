-- Create MasterSchedule table
CREATE TABLE IF NOT EXISTS "MasterSchedule" (
    "id" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "periodIndex" INTEGER NOT NULL,
    "courseId" INTEGER NOT NULL,
    "courseName" TEXT NOT NULL,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "cohortId" INTEGER NOT NULL,
    "cohortName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MasterSchedule_pkey" PRIMARY KEY ("id")
);

-- Create unique index for MasterSchedule
CREATE UNIQUE INDEX IF NOT EXISTS "MasterSchedule_dayOfWeek_periodIndex_cohortId_key" ON "MasterSchedule"("dayOfWeek", "periodIndex", "cohortId");

-- Create Settings table
CREATE TABLE IF NOT EXISTS "Settings" (
    "idKey" TEXT NOT NULL DEFAULT 'global',
    "periodsPerDay" INTEGER NOT NULL DEFAULT 8,
    "semesterStart" TIMESTAMP(3),
    "semesterEnd" TIMESTAMP(3),
    "workingDays" TEXT NOT NULL DEFAULT '1,2,3,4,5',

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("idKey")
);

-- Create SubjectConstraint table
CREATE TABLE IF NOT EXISTS "SubjectConstraint" (
    "id" TEXT NOT NULL,
    "courseId" INTEGER NOT NULL,
    "courseName" TEXT NOT NULL,
    "cohortId" INTEGER NOT NULL,
    "requiredHours" INTEGER NOT NULL DEFAULT 0,
    "preferredDays" TEXT,
    "blockedPeriods" TEXT,
    "consecutiveHours" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "SubjectConstraint_pkey" PRIMARY KEY ("id")
);

-- Create unique index for SubjectConstraint
CREATE UNIQUE INDEX IF NOT EXISTS "SubjectConstraint_courseId_cohortId_key" ON "SubjectConstraint"("courseId", "cohortId");

-- Create SyncLog table
CREATE TABLE IF NOT EXISTS "SyncLog" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "sessionsCreated" INTEGER NOT NULL,

    CONSTRAINT "SyncLog_pkey" PRIMARY KEY ("id")
);
