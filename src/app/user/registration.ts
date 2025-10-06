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

    private partitionCourses(available: CourseInfo[], grades: StudentGrades, payment: PaymentInfo | null): void {
        this.availableCourses = [];
        this.enrolledCourses = [];
        this.pendingCourses = [];
        this.completedCourses = [];

        const gradeItems = grades?.gradeItems ?? [];
        const gradeMap = new Map<number, GradeItem>();
        const completedIds = new Set<number>();
        const assumedEnrolledIds = new Set<number>();
        const completedMap = new Map<number, CourseInfo>();

        gradeItems.forEach(item => {
            if (!item || !item.courseId) {
                return;
            }
            gradeMap.set(item.courseId, item);

            if (item.grade != null) {
                completedIds.add(item.courseId);
                if (!completedMap.has(item.courseId)) {
                    completedMap.set(item.courseId, this.mapGradeItemToCourseInfo(item));
                }
            } else {
                assumedEnrolledIds.add(item.courseId);
            }
        });

        this.completedCourses = Array.from(completedMap.values());

        const paymentDetails = payment?.courseDetails ?? [];
        const enrolledIds = new Set<number>();
        const pendingIds = new Set<number>();

        paymentDetails.forEach(detail => {
            if (!detail || !detail.courseId) {
                return;
            }

            if (detail.enrollmentStatus === 'ENROLLED') {
                enrolledIds.add(detail.courseId);
            } else if (detail.enrollmentStatus === 'PENDING_PAYMENT') {
                pendingIds.add(detail.courseId);
            }
        });

        const courseLookup = new Map<number, CourseInfo>();
        available.forEach(course => {
            courseLookup.set(course.courseId, course);
        });

        const finalEnrolledIds = new Set<number>([...enrolledIds]);
        assumedEnrolledIds.forEach(id => {
            if (!pendingIds.has(id) && !completedIds.has(id)) {
                finalEnrolledIds.add(id);
            }
        });

        finalEnrolledIds.forEach(courseId => {
            const course = this.composeCourseInfo(courseId, courseLookup, gradeMap);
            this.enrolledCourses.push({
                ...course,
                canRegister: false,
                canUnregister: false,
                reason: 'Đang học'
            });
        });

        pendingIds.forEach(courseId => {
            const course = this.composeCourseInfo(courseId, courseLookup, gradeMap);
            this.pendingCourses.push({
                ...course,
                canRegister: false,
                canUnregister: true,
                reason: 'Chờ thanh toán'
            });
        });

        const unavailableIds = new Set<number>([...completedIds, ...finalEnrolledIds, ...pendingIds]);

        this.availableCourses = available
            .filter(course => !unavailableIds.has(course.courseId))
            .map(course => ({
                ...course,
                canRegister: true,
                canUnregister: false,
                reason: undefined
            }));
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

    private composeCourseInfo(courseId: number, courseLookup: Map<number, CourseInfo>, gradeMap: Map<number, GradeItem>): CourseInfo {
        const course = courseLookup.get(courseId);
        if (course) {
            return course;
        }

        const gradeItem = gradeMap.get(courseId);
        if (gradeItem) {
            return this.mapGradeItemToCourseInfo(gradeItem);
        }

        return {
            courseId,
            courseCode: '---',
            courseName: 'Môn học chưa rõ',
            credit: 0,
            canRegister: false
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

    getTotalEnrolledCredits(): number {
        return [...this.enrolledCourses, ...this.pendingCourses].reduce((total, course) => total + (course.credit || 0), 0);
    }
    getAvailableCoursesCount(): number {
        return this.availableCourses.filter(c => c.canRegister).length;
    }

    isEnrolled(courseId: number): boolean {
        return this.enrolledCourses.some(c => c.courseId === courseId);
    }

    isCompleted(courseId: number): boolean {
        return this.completedCourses.some(c => c.courseId === courseId);
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
