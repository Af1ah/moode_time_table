

// Types for our internal scheduler
interface Slot {
  day: number; // 0-4 (Mon-Fri)
  period: number; // 0-7
  courseId: number | null;
  isLocked: boolean;
  cohortId?: number; // Added to track which cohort this slot belongs to
}

interface Teacher {
    id: number;
    fullname: string;
}

interface SchedulerInput {
  lockedSlots: Slot[];
  workload: { [courseId: number]: number }; // courseId -> hours needed
  periodsPerDay: number;
  // blockedConstraints?: { [courseId: number]: string[] }; // Deprecated in favor of teacher constraints
  courseTeachers?: Record<number, Teacher[]>;
  teacherConstraints?: Record<number, string[]>;
  existingSlots?: Slot[]; // Slots from other cohorts to check for conflicts
}

export class Scheduler {
  private grid: Slot[][]; // [day][period]
  private periodsPerDay = 8;
  private daysPerWeek = 5;

  constructor() {
    this.grid = this.initializeGrid();
  }

  private initializeGrid(): Slot[][] {
    const grid: Slot[][] = [];
    for (let d = 0; d < this.daysPerWeek; d++) {
      grid[d] = [];
      for (let p = 0; p < this.periodsPerDay; p++) {
        grid[d][p] = { day: d, period: p, courseId: null, isLocked: false };
      }
    }
    return grid;
  }

  public generate(input: SchedulerInput): Slot[] {
    // 0. Set Configuration
    this.periodsPerDay = input.periodsPerDay || 8;

    // 1. Reset Grid
    this.grid = this.initializeGrid();

    // 2. Place Locked Slots
    input.lockedSlots.forEach((slot) => {
      if (slot.day >= 0 && slot.day < this.daysPerWeek && slot.period >= 0 && slot.period < this.periodsPerDay) {
        this.grid[slot.day][slot.period] = { ...slot, isLocked: true };
      }
    });

    // 3. Sort Subjects by Difficulty (Heuristic: Most hours first)
    const sortedSubjects = Object.entries(input.workload)
      .map(([courseId, hours]) => ({ courseId: Number(courseId), hours }))
      .sort((a, b) => b.hours - a.hours);

    // 4. Fill Slots
    for (const subject of sortedSubjects) {
      let hoursRemaining = subject.hours;
      const teachers = input.courseTeachers?.[subject.courseId] || [];
      
      // Attempt to place sessions
      while (hoursRemaining > 0) {
        let placed = false;
        
        // Find all available slots
        const candidates: {d: number, p: number, dailyCount: number}[] = [];
        
        for (let d = 0; d < this.daysPerWeek; d++) {
          // Count existing sessions for this subject on this day
          let dailyCount = 0;
          for (let p = 0; p < this.periodsPerDay; p++) {
            if (this.grid[d][p].courseId === subject.courseId) {
              dailyCount++;
            }
          }

          // Hard Constraint: Max 2 sessions per day
          if (dailyCount >= 2) continue;

          for (let p = 0; p < this.periodsPerDay; p++) {
            // Check if slot is already taken in current grid
            if (this.grid[d][p].courseId) continue;

            // Check Teacher Constraints & Conflicts
            let teacherConflict = false;
            
            for (const teacher of teachers) {
                // A. Check Teacher Constraints (Blocked Slots)
                const blockedSlots = input.teacherConstraints?.[teacher.id];
                if (blockedSlots && blockedSlots.includes(`${d}-${p}`)) {
                    teacherConflict = true;
                    break;
                }

                // B. Check Cross-Cohort Conflicts (Existing Slots)
                // If this teacher is teaching ANY course in ANY other cohort at this time
                if (input.existingSlots) {
                    const isBusy = input.existingSlots.some(slot => {
                        if (slot.day === d && slot.period === p) {
                            // Check if the course in the other slot is taught by this teacher
                            const otherCourseId = slot.courseId;
                            if (otherCourseId) {
                                const otherTeachers = input.courseTeachers?.[otherCourseId];
                                if (otherTeachers && otherTeachers.some(t => t.id === teacher.id)) {
                                    return true;
                                }
                            }
                        }
                        return false;
                    });

                    if (isBusy) {
                        teacherConflict = true;
                        break;
                    }
                }
            }

            if (teacherConflict) continue;

            candidates.push({ d, p, dailyCount });
          }
        }

        if (candidates.length === 0) {
          console.warn(`No slots available for course ${subject.courseId}`);
          break; // Cannot place anymore
        }

        // Sort candidates:
        // 1. Prefer days with fewer sessions of this subject (Spread)
        // 2. Randomize periods to avoid patterns
        candidates.sort((a, b) => {
          if (a.dailyCount !== b.dailyCount) return a.dailyCount - b.dailyCount;
          return Math.random() - 0.5;
        });

        // Pick the best candidate
        const best = candidates[0];
        this.grid[best.d][best.p].courseId = subject.courseId;
        hoursRemaining--;
        placed = true;
      }
    }

    // 5. Flatten and Return
    const result: Slot[] = [];
    for (let d = 0; d < this.daysPerWeek; d++) {
      for (let p = 0; p < this.periodsPerDay; p++) {
        if (this.grid[d][p].courseId) {
          result.push(this.grid[d][p]);
        }
      }
    }
    return result;
  }
}

export const scheduler = new Scheduler();
