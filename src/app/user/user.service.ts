import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// ===== Student Portal Interfaces (Updated for new backend) =====

/**
 * Base API Response - sử dụng chung cho tất cả API responses
 */
export interface ApiResponse {
    success: boolean;
    message: string;
}

/**
 * DTO trả về từ backend - lấy từ bảng student_schedule
 * Join với teaching, course, lecturer để có thông tin đầy đủ
 */
export interface StudentScheduleDetail {
    id: number;
    studentId: number;
    enrollmentId: number;
    teachingId: number;
    semester: string;
    // Thông tin từ teaching và course
    courseId: number;
    courseCode: string;
    courseName: string;
    credit: number;
    dayOfWeek: string;
    period: string;
    classroom: string;
    // Thông tin giảng viên
    lecturerId: number;
    lecturerName: string;
}

/**
 * @deprecated - Dùng StudentScheduleDetail thay thế
 * Giữ lại để tương thích với code cũ
 */
export interface ScheduleItem {
    courseId: number;
    courseCode: string;
    courseName: string;
    credit: number;
    period: string;
    dayOfWeek: string;
    lecturerName: string;
    room: string;
    classroom?: string;
}

export interface GradeItem {
    courseId: number;
    courseCode: string;
    courseName: string;
    credit: number;
    componentScore1?: number | null;
    componentScore2?: number | null;
    finalExamScore?: number | null;
    totalScore?: number | null;
    scoreCoefficient4?: number | null;
    grade?: string | null;
    semester: string;
    status: string;
}

export interface StudentGrades {
    studentId: number;
    studentCode: string;
    studentName: string;
    gpa: number;
    totalCredits: number;
    completedCredits: number;
    gradeItems: GradeItem[];
    // Statistics from backend
    totalCourses: number;
    completedCourses: number;
    inProgressCourses: number;
}

export interface CourseInfo {
    courseId: number;
    courseCode: string;
    courseName: string;
    credit: number;
    canRegister: boolean;
    reason?: string;
    availableSlots?: number;
    maxSlots?: number;
    lecturerName?: string;
    period?: string;
    dayOfWeek?: string;
    classroom?: string;
    semester?: string;
    canUnregister?: boolean;
    registrationStatus?: string;
}

export interface CourseRegistrationRequest {
    courseId: number;
    semester: string;
}

export interface CourseRegistrationResponse {
    success: boolean;
    message: string;
}

export interface SemesterInfo {
    id: number;
    semester: string;
    displayName: string;
}

export interface StudentProfile {
    studentId: number;
    studentCode: string;
    fullName: string;
    email: string;
    phone: string;
    className: string;
    departmentName: string;
    year: string;
}

export interface ChangePasswordRequest {
    newPassword: string;
    confirmPassword: string;
}

/**
 * @deprecated - Sử dụng ApiResponse thay thế
 * Giữ lại để tương thích với code cũ
 */
export interface ChangePasswordResponse extends ApiResponse {
}

/**
 * DTO từ bảng payment_details - tương ứng với PaymentDetailDTO trong backend
 */
export interface PaymentDetailDTO {
    id?: number;
    paymentId?: number;
    enrollmentId: number;
    semester: string;
    courseId: number;
    courseCode: string;
    courseName: string;
    credit: number;
    fee: number;
}

/**
 * @deprecated - Sử dụng PaymentSummaryDTO thay thế từ Share.java
 * Giữ lại để tương thích với code cũ
 */
export interface PaymentInfo {
    semesterId: number;
    semester: string;
    semesterDisplayName: string;
    totalAmount: number;
    paidAmount: number;
    remainingAmount: number;
    paymentStatus: string;
    paymentDate?: string;
    paymentDetails: PaymentDetailDTO[];
    canCreatePayment: boolean;
}

/**
 * @deprecated - Đã bị XÓA từ backend
 * Giữ lại để tương thích với code cũ
 */
export interface CoursePaymentDetail {
    courseId: number;
    courseCode: string;
    courseName: string;
    credits: number;
    fee: number;
    enrollmentStatus: string;
}

@Injectable({
    providedIn: 'root'
})
export class UserService {
    private baseUrl = 'http://localhost:8080/api/student';

    constructor(private http: HttpClient) { }

    /**
     * Lấy thời khóa biểu từ bảng student_schedule (API mới)
     * Trả về List<StudentScheduleDetail> từ backend
     */
    getStudentScheduleList(semester: string = '2024-1'): Observable<StudentScheduleDetail[]> {
        return this.http.get<StudentScheduleDetail[]>(`${this.baseUrl}/schedule-list?semester=${semester}`);
    }

    /**
     * Tạo/cập nhật thời khóa biểu cho sinh viên
     */
    generateSchedule(semester: string = '2024-1'): Observable<string> {
        return this.http.post(`${this.baseUrl}/schedule/generate?semester=${semester}`, {}, { responseType: 'text' });
    }

    /**
     * Kiểm tra sinh viên đã có thời khóa biểu chưa
     */
    hasSchedule(semester: string = '2024-1'): Observable<boolean> {
        return this.http.get<boolean>(`${this.baseUrl}/schedule/exists?semester=${semester}`);
    }

    /**
     * Lấy bảng điểm của sinh viên hiện tại theo semester
     */
    getStudentGrades(semester?: string): Observable<StudentGrades> {
        const url = semester ? `${this.baseUrl}/grades?semester=${semester}` : `${this.baseUrl}/grades`;
        return this.http.get<StudentGrades>(url);
    }

    /**
     * Đăng ký môn học
     */
    registerCourse(request: CourseRegistrationRequest): Observable<CourseRegistrationResponse> {
        return this.http.post<CourseRegistrationResponse>(`${this.baseUrl}/register-course`, request);
    }

    /**
     * Lấy danh sách môn học có thể đăng ký
     */
    getAvailableCourses(semester: string = '2024-1'): Observable<CourseInfo[]> {
        return this.http.get<CourseInfo[]>(`${this.baseUrl}/available-courses?semester=${semester}`);
    }

    /**
     * Hủy đăng ký môn học
     */
    unregisterCourse(courseId: number): Observable<CourseRegistrationResponse> {
        return this.http.delete<CourseRegistrationResponse>(`${this.baseUrl}/courses/${courseId}`);
    }

    /**
     * Lấy danh sách tất cả semesters từ database
     */
    getAllSemesters(): Observable<SemesterInfo[]> {
        return this.http.get<SemesterInfo[]>(`${this.baseUrl}/semesters`);
    }

    /**
     * Lấy thông tin cá nhân của sinh viên
     */
    getStudentProfile(): Observable<StudentProfile> {
        return this.http.get<StudentProfile>(`${this.baseUrl}/profile`);
    }

    /**
     * Thay đổi mật khẩu
     */
    changePassword(request: ChangePasswordRequest): Observable<ApiResponse> {
        return this.http.post<ApiResponse>(`${this.baseUrl}/change-password`, request);
    }

    /**
     * Xuất bảng điểm ra file CSV
     */
    exportGrades(semester?: string): Observable<Blob> {
        const url = semester ? `${this.baseUrl}/grades/export?semester=${semester}` : `${this.baseUrl}/grades/export`;
        return this.http.get(url, { responseType: 'blob' });
    }

    /**
     * Lấy thông tin thanh toán học phí theo semester
     */
    getPaymentInfo(semester?: string): Observable<PaymentInfo> {
        let url = `${this.baseUrl}/payment`;
        if (semester) {
            url += `?semester=${semester}`;
        }
        return this.http.get<PaymentInfo>(url);
    }

    /**
     * Lấy thông tin thanh toán học phí của tất cả semester
     */
    getAllPaymentInfo(): Observable<PaymentInfo[]> {
        return this.http.get<PaymentInfo[]>(`${this.baseUrl}/payments/all`);
    }

    /**
     * Tạo payment record
     */
    createPayment(semester?: string): Observable<string> {
        let url = `${this.baseUrl}/payment/create`;
        if (semester) {
            url += `?semester=${semester}`;
        }
        return this.http.post(url, null, { responseType: 'text' });
    }
}
