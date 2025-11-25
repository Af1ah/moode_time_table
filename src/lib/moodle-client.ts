import axios from 'axios';

const BASE_URL = process.env.BASE_URL;
const MOODLE_TOKEN = process.env.MOODLE_TOKEN;

if (!BASE_URL || !MOODLE_TOKEN) {
  console.warn('Missing Moodle Environment Variables');
}

class MoodleClient {
  private async call(functionName: string, token: string, params: any = {}) {
    try {
      const paramsWithToken = new URLSearchParams({
        wstoken: token,
        wsfunction: functionName,
        moodlewsrestformat: 'json',
        ...params,
      });

      // Handle array parameters for URLSearchParams
      // Moodle expects arrays like courseids[0]=1, courseids[1]=2
      Object.keys(params).forEach(key => {
        if (Array.isArray(params[key])) {
          paramsWithToken.delete(key);
          params[key].forEach((value: any, index: number) => {
            paramsWithToken.append(`${key}[${index}]`, value);
          });
        }
      });

      const response = await axios.post(`${BASE_URL}/webservice/rest/server.php`, paramsWithToken);

      if (response.data.exception) {
        throw new Error(`Moodle Error: ${response.data.message}`);
      }

      return response.data;
    } catch (error) {
      console.error(`Error calling ${functionName}:`, error);
      throw error;
    }
  }

  // --- Core Functions (Using Mobile Token) ---

  async getCourses() {
    // core_course_get_courses is a good start, or core_course_get_enrolled_courses_by_timeline_classification
    // Let's try to get all courses if possible, or search.
    // core_course_search_courses might be safer to get a list.
    // Or just get all courses.
    return this.call('core_course_get_courses', MOODLE_TOKEN!, {});
  }

  async getCohorts() {
    // Try to fetch cohorts using the standard API
    // Note: This requires the token to have 'core_cohort_get_cohorts' capability
    return this.call('core_cohort_get_cohorts', MOODLE_TOKEN!, {});
  }

  async getCohortMembers(cohortId: number) {
    return this.call('core_cohort_get_cohort_members', MOODLE_TOKEN!, {
      cohortids: [cohortId]
    });
  }

  async getUserCourses(userId: number) {
    return this.call('core_enrol_get_users_courses', MOODLE_TOKEN!, {
      userid: userId
    });
  }
  
  async searchUsers(query: string) {
      return this.call('core_user_get_users', MOODLE_TOKEN!, {
          criteria: [{ key: 'lastname', value: query }] // Example
      });
  }

  // --- Attendance Functions (Using Attendance Token) ---

  async addAttendance(courseId: number, name: string) {
    return this.call('mod_attendance_add_attendance', MOODLE_TOKEN!, {
      courseid: courseId,
      name: name,
    });
  }

  async addSession(attendanceId: number, sessionData: any) {
    return this.call('mod_attendance_add_session', MOODLE_TOKEN!, {
      attendanceid: attendanceId,
      ...sessionData,
    });
  }

  async getSessions(attendanceId: number) {
    return this.call('mod_attendance_get_sessions', MOODLE_TOKEN!, {
      attendanceid: attendanceId,
    });
  }
  
  async getAttendanceInstances(courseId: number) {
      // We need to find the attendance instance id for a course.
      // Usually `core_course_get_contents` returns modules.
      // We can filter for "attendance" modname.
      const contents = await this.call('core_course_get_contents', MOODLE_TOKEN!, {
          courseid: courseId
      });
      
      const attendanceInstances: any[] = [];
      contents.forEach((section: any) => {
          section.modules.forEach((mod: any) => {
              if (mod.modname === 'attendance') {
                  attendanceInstances.push(mod);
              }
          });
      });
      return attendanceInstances;
  }

  async ensureAttendanceInstance(courseId: number, courseName: string, shortName: string) {
    const instances = await this.getAttendanceInstances(courseId);
    if (instances.length > 0) {
      return instances[0].id;
    }

    // Create new instance
    const name = `${courseName} ${shortName}`; // As requested
    const newInstance = await this.addAttendance(courseId, name);
    return newInstance.id;
  }
  // --- Auth Functions ---

  async getToken(username: string, password: string, service: string = 'moodle_mobile_app') {
    try {
      const response = await axios.post(`${BASE_URL}/login/token.php`, null, {
        params: {
          username,
          password,
          service,
        },
      });

      if (response.data.error) {
        throw new Error(response.data.error);
      }

      return response.data.token;
    } catch (error: any) {
      console.error('Get Token Error:', error);
      throw new Error(error.message || 'Login failed');
    }
  }

  async getSiteInfo(token: string) {
    return this.call('core_webservice_get_site_info', token);
  }
}

export const moodleClient = new MoodleClient();
