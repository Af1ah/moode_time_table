export interface Teacher {
  id: number;
  fullname: string;
  email?: string;
  roles?: any[];
}

export interface Subject {
  id: number;
  name: string;
  cohortIds: number[];
  teachers?: Teacher[];
}

export const MOCK_SUBJECTS: Subject[] = [
  { id: 101, name: 'Advanced Chemistry', cohortIds: [1, 2] },
  { id: 102, name: 'Organic Chemistry Lab', cohortIds: [1] },
  { id: 103, name: 'Mathematics II', cohortIds: [2, 3] },
  { id: 104, name: 'English Literature', cohortIds: [1, 3] },
  { id: 105, name: 'Computer Science Core', cohortIds: [3] },
];
export interface Cohort {
    id: number;
    name: string; // Used in real data
    idnumber: string; // Used in real data
    fullname?: string; // Optional, from legacy/mock
    shortname?: string; // Optional, from legacy/mock
    description?: string;
}
