import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

/**
 * Base API Response - sử dụng chung cho tất cả API responses
 */
export interface ApiResponse {
    success: boolean;
    message: string;
}

export interface ScheduleTime {
    period: string;
    dayOfWeek: string;
    classroom: string;
}

export interface TeacherScheduleInfo {
    teachingId: number;
    courseId: number;
    courseCode: string;
    courseName: string;
    credit: number;
    period: string; // For backward compatibility, contains combined schedule info
    dayOfWeek: string; // For backward compatibility
    classroom: string; // For backward compatibility
    periods: ScheduleTime[]; // New field to store all schedule times
    students: StudentInfo[];
    gradedCount?: number; // Backend tính sẵn số sinh viên đã có điểm
}

export interface StudentInfo {
    studentId: number;
    studentCode: string;
    fullName: string;
    email: string;
    className: string;
    grade: string | null;
    componentScore1?: number | null;
    componentScore2?: number | null;
    finalExamScore?: number | null;
    totalScore?: number | null;
    scoreCoefficient4?: number | null;
}

export interface EnrollmentDTO {
    id?: number;
    studentId: number;
    courseId: number;
    grade?: string | null;
    componentScore1?: number | null;
    componentScore2?: number | null;
    finalExamScore?: number | null;
}

export interface Enrollment {
    id: number;
    studentId: number;
    courseId: number;
    grade: string | null;
    totalScore?: number | null;
    scoreCoefficient4?: number | null;
}

export interface SemesterInfo {
    id: number;
    semester: string;
    displayName: string;
}

export interface TeacherProfile {
    lecturerId: number;
    lecturerCode: string;
    fullName: string;
    email: string;
    phone: string;
    department: string;
    position: string;
    specialization: string;
}

export interface ChangePasswordRequest {
    newPassword: string;
    confirmPassword: string;
}

/**
 * @deprecated - Sử dụng ApiResponse thay thế
 * Giữ lại để tương thích với code cũ
 */
export interface ChangePasswordResponse {
    success: boolean;
    message: string;
}

@Injectable({
    providedIn: 'root'
})
export class TeacherService {
    private baseUrl = 'http://localhost:8080/api/teacher';

    constructor(private http: HttpClient) { }

    /**
     * Lấy danh sách tất cả semesters từ database
     */
    getAllSemesters(): Observable<SemesterInfo[]> {
        return this.http.get<SemesterInfo[]>(`${this.baseUrl}/semesters`);
    }

    /**
     * Lấy danh sách lớp học mà giảng viên được phân công dạy theo semester
     */
    getTeacherClasses(semester?: string): Observable<TeacherScheduleInfo[]> {
        const url = semester ? `${this.baseUrl}/classes?semester=${semester}` : `${this.baseUrl}/classes`;
        return new Observable(observer => {
            this.http.get<TeacherScheduleInfo[]>(url).subscribe({
                next: (classes) => {
                    // Use a Map to store unique courses by courseId
                    const uniqueCourses = new Map<number, TeacherScheduleInfo>();

                    classes.forEach(cls => {
                        if (!uniqueCourses.has(cls.courseId)) {
                            const courseSchedules = classes.filter(c => c.courseId === cls.courseId);
                            uniqueCourses.set(cls.courseId, {
                                ...cls,
                                // For backward compatibility
                                period: courseSchedules
                                    .map(c => `${c.dayOfWeek} (${c.period})`)
                                    .join(', '),
                                dayOfWeek: courseSchedules[0]?.dayOfWeek || '',
                                classroom: courseSchedules[0]?.classroom || '',
                                // Store all schedule times
                                periods: courseSchedules.map(s => ({
                                    period: s.period,
                                    dayOfWeek: s.dayOfWeek,
                                    classroom: s.classroom
                                }))
                            });
                        }
                    });

                    observer.next(Array.from(uniqueCourses.values()));
                    observer.complete();
                },
                error: (err) => observer.error(err)
            });
        });
    }

    /**
     * Lấy danh sách sinh viên trong một lớp học cụ thể
     */
    getStudentsForClass(teachingId: number): Observable<StudentInfo[]> {
        return this.http.get<StudentInfo[]>(`${this.baseUrl}/classes/${teachingId}/students`);
    }

    /**
     * Chấm điểm cho sinh viên
     */
    gradeStudent(enrollmentDTO: EnrollmentDTO): Observable<Enrollment> {
        return this.http.post<Enrollment>(`${this.baseUrl}/grade`, enrollmentDTO);
    }

    /**
     * Lấy thông tin cá nhân của giảng viên
     */
    getTeacherProfile(): Observable<TeacherProfile> {
        return this.http.get<TeacherProfile>(`${this.baseUrl}/profile`);
    }

    /**
     * Thay đổi mật khẩu
     */
    changePassword(request: ChangePasswordRequest): Observable<ApiResponse> {
        return this.http.post<ApiResponse>(`${this.baseUrl}/change-password`, request);
    }

    /**
     * Xuất bảng điểm lớp học ra file CSV
     */
    exportClassGrades(teachingId: number): Observable<Blob> {
        return this.http.get(`${this.baseUrl}/classes/${teachingId}/export`, { responseType: 'blob' });
    }
}
