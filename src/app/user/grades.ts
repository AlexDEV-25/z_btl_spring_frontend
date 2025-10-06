import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { UserService, StudentGrades, GradeItem, SemesterInfo } from './user.service';
import { AuthService } from '../auth.service';
import { LayoutComponent } from '../shared/layout.component';
import { MenuItem } from '../shared/sidebar.component';
import { forkJoin } from 'rxjs';

interface StatusOption {
    label: string;
    value: string;
}

@Component({
    selector: 'app-user-grades',
    standalone: true,
    imports: [CommonModule, FormsModule, LayoutComponent],
    templateUrl: './grades.html',
    styleUrls: ['../shared/modern-theme.css']
})
export class UserGradesComponent implements OnInit {
    grades: StudentGrades | null = null;
    filteredGrades: GradeItem[] = [];
    loading = false;
    error = '';
    userName = '';
    selectedSemester = '';
    availableSemesters: SemesterInfo[] = [];
    displayGpa = 0;

    searchTerm = '';
    statusFilter = '';
    semesterFilter = '';

    menuItems: MenuItem[] = [
        { icon: '📅', label: 'Thời khóa biểu', route: '/user/schedule' },
        { icon: '📊', label: 'Bảng điểm', route: '/user/grades' },
        { icon: '📚', label: 'Đăng ký môn học', route: '/user/registration' },
        { icon: '💰', label: 'Học phí', route: '/user/payment' },
        { icon: '👤', label: 'Thông tin cá nhân', route: '/user/profile' }
    ];

    constructor(
        private userService: UserService,
        private router: Router,
        private authService: AuthService
    ) { }

    ngOnInit(): void {
        const currentUser = this.authService.getCurrentUser();
        this.userName = currentUser?.fullName || 'Sinh viên';
        this.loadSemesters();
    }

    loadSemesters(): void {
        this.userService.getAllSemesters().subscribe({
            next: (semesters) => {
                this.availableSemesters = semesters || [];
                if (this.availableSemesters.length > 0 && !this.selectedSemester) {
                    this.selectedSemester = this.availableSemesters[0].semester;
                }
                this.loadGrades();
            },
            error: (error) => {
                console.error('Error loading semesters:', error);
                this.loadGrades();
            }
        });
    }

    loadGrades(): void {
        this.loading = true;
        this.error = '';

        if (!this.selectedSemester) {
            this.fetchGradesForAllSemesters();
            return;
        }

        this.fetchGradesForSemester(this.selectedSemester);
    }

    filterGrades(): void {
        if (!this.grades) {
            this.filteredGrades = [];
            return;
        }

        const normalizedSearch = this.searchTerm.trim().toLowerCase();

        this.filteredGrades = this.grades.gradeItems.filter((item) => {
            const matchesSearch = !normalizedSearch ||
                item.courseCode.toLowerCase().includes(normalizedSearch) ||
                item.courseName.toLowerCase().includes(normalizedSearch);

            const matchesStatus = !this.statusFilter || item.status === this.statusFilter;
            const matchesSemester = !this.semesterFilter || item.semester === this.semesterFilter;

            return matchesSearch && matchesStatus && matchesSemester;
        });
    }

    setStatusFilter(value: string): void {
        this.statusFilter = value;
        this.filterGrades();
    }

    onSemesterFilterChange(): void {
        this.filterGrades();
    }

    clearFilters(): void {
        if (!this.hasActiveFilters()) {
            return;
        }
        this.searchTerm = '';
        this.statusFilter = '';
        this.semesterFilter = '';
        this.filterGrades();
    }

    hasActiveFilters(): boolean {
        return !!(this.searchTerm || this.statusFilter || this.semesterFilter);
    }

    onSemesterChange(): void {
        this.loadGrades();
    }

    getGPAClassification(gpa: number): string {
        if (gpa >= 3.6) return 'Xuất sắc';
        if (gpa >= 3.2) return 'Giỏi';
        if (gpa >= 2.5) return 'Khá';
        if (gpa >= 2.0) return 'Trung bình';
        return 'Yếu';
    }

    getCompletionPercentage(): number {
        if (!this.grades || this.grades.totalCredits === 0) {
            return 0;
        }
        return (this.grades.completedCredits / this.grades.totalCredits) * 100;
    }

    getCompletedCount(): number {
        return this.grades?.completedCourses || 0;
    }

    getInProgressCount(): number {
        return this.grades?.inProgressCourses || 0;
    }

    getGradeClass(grade: string | null | undefined): string {
        if (!grade) {
            return '';
        }

        const gradeMap: Record<string, string> = {
            'A+': 'grade-a-plus',
            'A': 'grade-a',
            'B+': 'grade-b-plus',
            'B': 'grade-b',
            'C+': 'grade-c-plus',
            'C': 'grade-c',
            'D+': 'grade-d-plus',
            'D': 'grade-d',
            'F': 'grade-f'
        };

        return gradeMap[grade] || '';
    }


    getClassificationClass(totalScore?: number | null): string {
        if (totalScore == null) {
            return '';
        }

        if (totalScore >= 9.5) return 'classification-excellent';
        if (totalScore >= 8.5) return 'classification-good';
        if (totalScore >= 8.0) return 'classification-fairly-good';
        if (totalScore >= 7.0) return 'classification-fair';
        if (totalScore >= 6.5) return 'classification-average-fair';
        if (totalScore >= 5.5) return 'classification-average';
        if (totalScore >= 5.0) return 'classification-weak-average';
        if (totalScore >= 4.0) return 'classification-weak';
        return 'classification-fail';
    }

    getStatusClass(status: string): string {
        const statusMap: Record<string, string> = {
            'Đã hoàn thành': 'completed',
            'Đang học': 'in-progress',
            'Chưa học': 'not-started'
        };

        return statusMap[status] || '';
    }

    exportGrades(): void {
        if (!this.grades) {
            return;
        }

        const semesterParam = this.selectedSemester ? this.selectedSemester : undefined;

        this.userService.exportGrades(semesterParam).subscribe({
            next: (blob) => {
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `bang_diem_${this.grades?.studentCode}_${new Date().toISOString().split('T')[0]}.csv`;
                link.click();
                window.URL.revokeObjectURL(url);
            },
            error: (error) => {
                console.error('Error exporting grades:', error);
                alert('Có lỗi xảy ra khi xuất bảng điểm!');
            }
        });
    }

    goToSchedule(): void {
        this.router.navigate(['/user/schedule']);
    }

    goToRegistration(): void {
        this.router.navigate(['/user/registration']);
    }

    logout(): void {
        if (confirm('🚪 Bạn có chắc chắn muốn đăng xuất?')) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            sessionStorage.clear();
            this.router.navigate(['/login']);
        }
    }

    private resolveDisplayGpa(data: StudentGrades): number {
        const backendGpa = data?.gpa ?? 0;
        if (backendGpa && backendGpa > 0) {
            return Math.round(backendGpa * 100) / 100;
        }
        return this.calculateGpa(data.gradeItems);
    }

    private fetchGradesForSemester(semester: string): void {
        this.userService.getStudentGrades(semester).subscribe({
            next: (data) => this.applyGradesData(data),
            error: (error) => this.handleGradesError(error)
        });
    }

    private fetchGradesForAllSemesters(): void {
        const semesterCodes = this.availableSemesters.map(item => item.semester).filter(code => !!code);

        if (semesterCodes.length === 0) {
            this.userService.getStudentGrades().subscribe({
                next: (data) => this.applyGradesData(data),
                error: (error) => this.handleGradesError(error)
            });
            return;
        }

        forkJoin(semesterCodes.map(code => this.userService.getStudentGrades(code))).subscribe({
            next: (results) => {
                const aggregated = this.aggregateGrades(results);
                this.applyGradesData(aggregated);
            },
            error: (error) => this.handleGradesError(error)
        });
    }

    private aggregateGrades(gradeSets: StudentGrades[]): StudentGrades {
        if (!gradeSets.length) {
            return this.createEmptyGrades();
        }

        const first = gradeSets.find(item => item != null);
        const allItems = gradeSets.flatMap(item => item.gradeItems || []);
        const sortedItems = [...allItems].sort((a, b) => {
            if (a.semester === b.semester) {
                return a.courseCode.localeCompare(b.courseCode);
            }
            return b.semester.localeCompare(a.semester);
        });

        const completedItems = sortedItems.filter(item => item.status === 'Đã hoàn thành');
        const inProgressItems = sortedItems.filter(item => item.status === 'Đang học');

        const totalCredits = sortedItems.reduce((sum, item) => sum + (item.credit || 0), 0);
        const completedCredits = completedItems.reduce((sum, item) => sum + (item.credit || 0), 0);

        return {
            studentId: first?.studentId || 0,
            studentCode: first?.studentCode || '',
            studentName: first?.studentName || '',
            gpa: this.calculateGpa(sortedItems),
            totalCredits,
            completedCredits,
            gradeItems: sortedItems,
            totalCourses: sortedItems.length,
            completedCourses: completedItems.length,
            inProgressCourses: inProgressItems.length
        };
    }

    private applyGradesData(data: StudentGrades): void {
        this.grades = data;
        this.displayGpa = this.resolveDisplayGpa(data);
        this.semesterFilter = '';
        this.filterGrades();
        this.loading = false;
    }

    private handleGradesError(error: any): void {
        console.error('Error loading grades:', error);
        this.error = `Lỗi khi tải bảng điểm: ${error.status} - ${error.message || error.statusText}`;
        this.loading = false;
    }

    private createEmptyGrades(): StudentGrades {
        return {
            studentId: 0,
            studentCode: '',
            studentName: '',
            gpa: 0,
            totalCredits: 0,
            completedCredits: 0,
            gradeItems: [],
            totalCourses: 0,
            completedCourses: 0,
            inProgressCourses: 0
        };
    }

    private calculateGpa(items: GradeItem[]): number {
        if (!items || items.length === 0) {
            return 0;
        }

        const coefficientItems = items.filter(item => item.scoreCoefficient4 != null && item.credit != null);
        const coefficientCredits = coefficientItems.reduce((sum, item) => sum + (item.credit || 0), 0);

        if (coefficientCredits > 0) {
            const weightedSum = coefficientItems.reduce((sum, item) => {
                const credit = item.credit || 0;
                const coefficient = item.scoreCoefficient4 || 0;
                return sum + (coefficient * credit);
            }, 0);

            return Math.round((weightedSum / coefficientCredits) * 100) / 100;
        }

        const gradePointMap: Record<string, number> = {
            'A+': 4.0,
            'A': 3.7,
            'B+': 3.5,
            'B': 3.0,
            'C+': 2.5,
            'C': 2.0,
            'D+': 1.5,
            'D': 1.0,
            'F': 0.0
        };

        const letterItems = items.filter(item => item.grade && item.credit != null && gradePointMap[item.grade]);
        const letterCredits = letterItems.reduce((sum, item) => sum + (item.credit || 0), 0);

        if (letterCredits === 0) {
            return 0;
        }

        const letterWeighted = letterItems.reduce((sum, item) => {
            const credit = item.credit || 0;
            const point = gradePointMap[item.grade || 'F'] || 0;
            return sum + (point * credit);
        }, 0);

        return Math.round((letterWeighted / letterCredits) * 100) / 100;
    }
}
