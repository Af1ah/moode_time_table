# Moodle API Usage & Permissions

This document tracks the Moodle Web Service APIs used in this application and their permission requirements.

## Current APIs in Use

### ✅ Working APIs

| API Function | Purpose | Status |
|--------------|---------|--------|
| `core_course_get_courses` | Get all courses | ✅ Working |
| `core_cohort_get_cohorts` | Get cohorts | ✅ Working |
| `core_cohort_get_cohort_members` | Get cohort members | ✅ Working |
| `core_course_get_contents` | Get course contents (modules) | ✅ Working |
| `mod_attendance_add_attendance` | Create attendance instance | ✅ Working |
| `mod_attendance_add_session` | Create attendance session | ✅ Working |
| `mod_attendance_get_sessions` | Get attendance sessions | ✅ Working |

### ⚠️ Permission-Restricted APIs

| API Function | Purpose | Status | Solution |
|--------------|---------|--------|----------|
| `core_enrol_get_enrolled_users` | Get enrolled users (teachers) for a course | ❌ Permission Denied | Admin needs to add to web service |

## How to Enable Restricted APIs

If you want to enable teacher fetching functionality:

1. **Go to Moodle Admin Panel**
   - Navigate to: `Site Administration` → `Server` → `Web services` → `External services`

2. **Find your service** (e.g., "my tame table")

3. **Add Functions**
   - Click on "Functions" link
   - Click "Add functions"
   - Search for: `core_enrol_get_enrolled_users`
   - Add it to the service

4. **Alternative: Use Different API**
   - `core_enrol_get_enrolled_users_with_capability` - Get users with specific capability
   - This might require different permissions but could work

## Teacher Fetching Implementation

### Current Implementation
```typescript
// src/lib/moodle-client.ts
async getCourseTeachers(courseId: number) {
  const users = await this.call('core_enrol_get_enrolled_users', MOODLE_TOKEN!, {
    courseid: courseId
  });
  
  // Filter for teachers by role
  const teachers = users.filter((user: any) => {
    return user.roles && user.roles.some((role: any) => 
      role.shortname === 'editingteacher' || 
      role.shortname === 'teacher' ||
      role.roleid === 3 || 
      role.roleid === 4
    );
  });
  
  return teachers;
}
```

### Graceful Degradation
The app currently handles permission errors gracefully:
- Returns empty array if API is not accessible
- Shows "No teachers found" instead of error message
- App continues to function normally without teacher data

## Future Enhancements

### Option 1: Manual Teacher Assignment
If API permissions can't be granted, consider:
- Adding a teacher selection dropdown
- Storing teacher assignments in database
- Allowing manual teacher-course mapping

### Option 2: Alternative Data Source
- Use course metadata fields
- Parse from course description
- Use custom course fields

### Option 3: Different Moodle API
Try alternative APIs that might have different permission requirements:
- `core_user_get_course_user_profiles` - Get user profiles for course
- `core_enrol_get_users_courses` - Get courses for a user (reverse lookup)

## Notes
- The Moodle token service configuration determines which functions are available
- Contact your Moodle administrator to add required functions to the web service
- Always check Admin → Server → Web services → External services → Functions
