import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { UserService, CourseRegistrationRequest, CourseInfo, SemesterInfo, StudentGrades, PaymentInfo, GradeItem } from './user.service';
import { LayoutComponent } from '../shared/layout.component';
import { MenuItem } from '../shared/sidebar.component';

@Component({
    selector: 'app-user-registration',
    standalone: true,
    imports: [CommonModule, FormsModule, LayoutComponent],
    templateUrl: './registration.html',
    styleUrls: ['../shared/modern-theme.css']
})
export class UserRegistrationComponent implements OnInit {
    availableCourses: CourseInfo[] = [];
    enrolledCourses: CourseInfo[] = [];
    pendingCourses: CourseInfo[] = [];
    completedCourses: CourseInfo[] = [];
    loading = false;
    processing = false;
    error = '';
    successMessage = '';
    selectedSemester = '';
    userName = '';
    availableSemesters: SemesterInfo[] = [];

    // Menu items for sidebar
    menuItems: MenuItem[] = [
        { icon: '📅', label: 'Thời khóa biểu', route: '/user/schedule' },
        { icon: '📊', label: 'Bảng điểm', route: '/user/grades' },
        { icon: '📚', label: 'Đăng ký môn học', route: '/user/registration' },
        { icon: '💰', label: 'Học phí', route: '/user/payment' },
        { icon: '👤', label: 'Thông tin cá nhân', route: '/user/profile' }
    ];

    constructor(
        private userService: UserService,
        private router: Router
    ) { }

    async ngOnInit(): Promise<void> {
        this.userName = 'Sinh viên';
        await this.initializeSemesters();
        await this.reloadSemesterData();
    }

    private async initializeSemesters(): Promise<void> {
        try {
            const semesters = await firstValueFrom(this.userService.getAllSemesters());
            console.log('Semesters loaded:', semesters);
            this.availableSemesters = semesters || [];
            if (!this.selectedSemester && this.availableSemesters.length > 0) {
                this.selectedSemester = this.availableSemesters[0].semester;
            }
        } catch (error) {
            console.error('Error loading semesters:', error);
            this.availableSemesters = [];
        }
    }

    private async reloadSemesterData(): Promise<void> {
        const semester = this.selectedSemester || this.availableSemesters[0]?.semester || '2024-1';
        this.selectedSemester = semester;
        await this.loadSemesterData(semester);
    }

    private async loadSemesterData(semester: string): Promise<void> {
        this.loading = true;
        this.error = '';

        try {
            const result = await firstValueFrom(forkJoin({
                available: this.userService.getAvailableCourses(semester),
                grades: this.userService.getStudentGrades(semester),
                payment: this.userService.getPaymentInfo(semester).pipe(catchError(() => of(null)))
            }));

            this.partitionCourses(result.available ?? [], result.grades, result.payment);
        } catch (error) {
            console.error('Error loading registration data:', error);
            this.error = 'Lỗi khi tải dữ liệu đăng ký môn học';
            this.availableCourses = [];
            this.enrolledCourses = [];
            this.pendingCourses = [];
            this.completedCourses = [];
        } finally {
            this.loading = false;
        }
    }

    // Backend đã xử lý logic phân loại courses, frontend chỉ cần hiển thị
    private partitionCourses(available: CourseInfo[], grades: StudentGrades, payment: PaymentInfo | null): void {
        // Sử dụng trực tiếp dữ liệu từ backend thay vì tính toán phức tạp
        this.availableCourses = available.filter(course => course.canRegister);

        // Lấy thông tin từ payment details nếu có
        const paymentDetails = payment?.courseDetails ?? [];

        this.enrolledCourses = paymentDetails
            .filter(detail => detail.enrollmentStatus === 'ENROLLED')
            .map(detail => {
                const courseInfo = this.mapPaymentDetailToCourseInfo(detail, available);
                return {
                    ...courseInfo,
                    canUnregister: false, // Môn đã enrolled không thể hủy
                    reason: 'Đang học'
                };
            });

        this.pendingCourses = paymentDetails
            .filter(detail => detail.enrollmentStatus === 'PENDING_PAYMENT')
            .map(detail => {
                const courseInfo = this.mapPaymentDetailToCourseInfo(detail, available);
                return {
                    ...courseInfo,
                    canUnregister: true, // Môn pending có thể hủy
                    reason: 'Chờ thanh toán'
                };
            });

        // Lấy môn đã hoàn thành từ grades
        this.completedCourses = (grades?.gradeItems ?? [])
            .filter(item => item.grade != null)
            .map(item => this.mapGradeItemToCourseInfo(item));
    }

    private mapGradeItemToCourseInfo(item: GradeItem): CourseInfo {
        return {
            courseId: item.courseId,
            courseCode: item.courseCode,
            courseName: item.courseName,
            credit: item.credit ?? 0,
            canRegister: false,
            reason: item.status,
            semester: item.semester
        };
    }

    // Helper method để map payment detail sang course info
    private mapPaymentDetailToCourseInfo(detail: any, available: CourseInfo[]): CourseInfo {
        const course = available.find(c => c.courseId === detail.courseId);
        if (course) {
            // Nếu tìm thấy course trong available list, cập nhật canUnregister
            return {
                ...course,
                canRegister: false,
                canUnregister: detail.enrollmentStatus === 'PENDING_PAYMENT'
            };
        }
        
        // Nếu không tìm thấy, tạo course info mới
        return {
            courseId: detail.courseId,
            courseCode: detail.courseCode || '---',
            courseName: detail.courseName || 'Môn học chưa rõ',
            credit: detail.credits || 0,
            canRegister: false,
            canUnregister: detail.enrollmentStatus === 'PENDING_PAYMENT'
        };
    }

    async registerCourse(courseId: number) {
        this.processing = true;
        this.error = '';
        this.successMessage = '';

        try {
            const request: CourseRegistrationRequest = {
                courseId: courseId,
                semester: this.selectedSemester
            };

            const response = await firstValueFrom(this.userService.registerCourse(request));

            if (response?.success) {
                this.successMessage = response.message || 'Đăng ký môn học thành công!';
                await this.reloadSemesterData();
            } else {
                this.error = response?.message || 'Lỗi khi đăng ký môn học';
            }
        } catch (error) {
            console.error('Error registering course:', error);
            this.error = 'Lỗi khi đăng ký môn học';
        } finally {
            this.processing = false;
        }
    }

    confirmUnregister(course: CourseInfo) {
        if (confirm(`🤔 Bạn có chắc chắn muốn hủy đăng ký môn "${course.courseName}" (${course.courseCode})?`)) {
            this.unregisterCourse(course.courseId);
        }
    }

    async unregisterCourse(courseId: number) {
        this.processing = true;
        try {
            const response = await firstValueFrom(this.userService.unregisterCourse(courseId));

            if (response?.success) {
                this.successMessage = response.message || 'Hủy đăng ký môn học thành công!';
                await this.reloadSemesterData();
            } else {
                this.error = response?.message || 'Lỗi khi hủy đăng ký môn học';
            }
        } catch (error) {
            console.error('Error unregistering course:', error);
            this.error = 'Lỗi khi hủy đăng ký môn học';
        } finally {
            this.processing = false;
        }
    }

    // Các hàm helper đơn giản - không cần tính toán phức tạp
    getTotalEnrolledCredits(): number {
        return [...this.enrolledCourses, ...this.pendingCourses].reduce((total, course) => total + (course.credit || 0), 0);
    }

    getAvailableCoursesCount(): number {
        return this.availableCourses.length; // Backend đã filter canRegister
    }

    logout() {
        if (confirm('🚪 Bạn có chắc chắn muốn đăng xuất?')) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            sessionStorage.clear();
            this.router.navigate(['/login']);
        }
    }

    goToSchedule() {
        this.router.navigate(['/user/schedule']);
    }

    goToGrades() {
        this.router.navigate(['/user/grades']);
    }

    async onSemesterChange() {
        console.log('Semester changed to:', this.selectedSemester);
        await this.reloadSemesterData();
    }
}
