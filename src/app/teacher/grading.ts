import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TeacherService, TeacherScheduleInfo, StudentInfo, EnrollmentDTO, SemesterInfo } from './teacher.service';
import { Router } from '@angular/router';
import { LayoutComponent } from '../shared/layout.component';
import { MenuItem } from '../shared/sidebar.component';
@Component({
    selector: 'app-teacher-grading',
    standalone: true,
    imports: [CommonModule, FormsModule, LayoutComponent],
    templateUrl: './grading.html',
    styles: []
})
export class TeacherGradingComponent implements OnInit {
    classes: TeacherScheduleInfo[] = [];
    selectedClass: TeacherScheduleInfo | null = null;
    loading = false;
    error = '';
    saving = false;
    saveMessage = '';
    userName = 'Giảng viên';
    selectedSemester = '2024-1';
    availableSemesters: SemesterInfo[] = [];

    // Menu items for teacher sidebar
    menuItems: MenuItem[] = [
        { icon: '📅', label: 'Lịch dạy', route: '/teacher/classes' },
        { icon: '📝', label: 'Chấm điểm', route: '/teacher/grading' },
        { icon: '👤', label: 'Thông tin cá nhân', route: '/teacher/profile' }
    ];

    // No static grade options; grade is computed server-side from scores

    constructor(private teacherService: TeacherService, private router: Router) { }

    ngOnInit() {
        this.loadSemesters();
        this.loadClasses();
    }

    loadSemesters() {
        this.teacherService.getAllSemesters().subscribe({
            next: (semesters) => {
                console.log('Semesters loaded:', semesters);
                this.availableSemesters = semesters;
                // Set selected semester to the first one (newest) if not set
                if (semesters.length > 0 && !this.selectedSemester) {
                    this.selectedSemester = semesters[0].semester;
                }
            },
            error: (error) => {
                console.error('Error loading semesters:', error);
                // Fallback to hardcoded semesters
                this.availableSemesters = [
                    { id: 1, semester: '2024-2', displayName: 'Học kỳ 2 (2024-2025)' },
                    { id: 2, semester: '2024-1', displayName: 'Học kỳ 1 (2024-2025)' },
                    { id: 3, semester: '2024-3', displayName: 'Học kỳ hè (2024-2025)' }
                ];
            }
        });
    }

    onSemesterChange() {
        console.log('Semester changed to:', this.selectedSemester);
        this.selectedClass = null; // Reset selected class when semester changes
        this.loadClasses();
    }

    loadClasses() {
        this.loading = true;
        this.error = '';

        this.teacherService.getTeacherClasses(this.selectedSemester).subscribe({
            next: (data) => {
                console.log('Classes loaded successfully:', data);
                this.classes = data;
                this.loading = false;
            },
            error: (error) => {
                console.error('Error loading classes:', error);
                this.error = `Lỗi khi tải danh sách lớp học: ${error.status} - ${error.statusText}`;
                this.loading = false;
            }
        });
    }

    selectClass(classInfo: TeacherScheduleInfo) {
        this.selectedClass = { ...classInfo, students: [...(classInfo.students || [])] };
        this.saveMessage = '';
        // Reload students for this teaching from backend to ensure latest scores
        this.teacherService.getStudentsForClass(classInfo.teachingId).subscribe({
            next: (students) => {
                if (this.selectedClass && this.selectedClass.teachingId === classInfo.teachingId) {
                    this.selectedClass.students = students || [];
                }
            },
            error: (err) => {
                console.error('Error loading students for class', err);
            }
        });
    }

    saveScores(student: StudentInfo) {
        if (!this.selectedClass) return;

        const req: EnrollmentDTO = {
            studentId: student.studentId,
            courseId: this.selectedClass.courseId,
            componentScore1: student.componentScore1 ?? null,
            componentScore2: student.componentScore2 ?? null,
            finalExamScore: student.finalExamScore ?? null
        };

        this.saving = true;
        this.saveMessage = '';

        this.teacherService.gradeStudent(req).subscribe({
            next: (enrollment) => {
                // Cập nhật tất cả thông tin điểm từ backend
                student.grade = enrollment.grade ?? student.grade;
                student.totalScore = enrollment.totalScore ?? student.totalScore;
                student.scoreCoefficient4 = enrollment.scoreCoefficient4 ?? student.scoreCoefficient4;
                this.saveMessage = 'Đã lưu điểm thành công!';
                this.saving = false;
                setTimeout(() => this.saveMessage = '', 3000);
            },
            error: (error) => {
                this.saveMessage = 'Lỗi khi lưu điểm';
                this.saving = false;
                console.error('Error saving grade:', error);
                setTimeout(() => this.saveMessage = '', 3000);
            }
        });
    }

    getGradedCount(students: StudentInfo[]): number {
        return students.filter(s => s.grade !== null).length;
    }

    getTotalCount(students: StudentInfo[]): number {
        return students.length;
    }

    getProgressPercentage(students: StudentInfo[]): number {
        const total = this.getTotalCount(students);
        if (total === 0) return 0;
        return Math.round((this.getGradedCount(students) / total) * 100);
    }

    // Điểm sẽ được tính tự động bởi backend khi lưu điểm

    // Save all scores for all students in the class
    saveAllScores() {
        if (!this.selectedClass || this.selectedClass.students.length === 0) return;

        this.saving = true;
        this.saveMessage = '';
        let savedCount = 0;
        let errorCount = 0;
        const totalStudents = this.selectedClass.students.length;

        this.selectedClass.students.forEach(student => {
            const req: EnrollmentDTO = {
                studentId: student.studentId,
                courseId: this.selectedClass!.courseId,
                componentScore1: student.componentScore1 ?? null,
                componentScore2: student.componentScore2 ?? null,
                finalExamScore: student.finalExamScore ?? null
            };

            this.teacherService.gradeStudent(req).subscribe({
                next: (enrollment) => {
                    // Cập nhật tất cả thông tin điểm từ backend
                    student.grade = enrollment.grade ?? student.grade;
                    student.totalScore = enrollment.totalScore ?? student.totalScore;
                    student.scoreCoefficient4 = enrollment.scoreCoefficient4 ?? student.scoreCoefficient4;
                    savedCount++;

                    if (savedCount + errorCount === totalStudents) {
                        this.saving = false;
                        if (errorCount === 0) {
                            this.saveMessage = `✅ Đã lưu điểm cho tất cả ${savedCount} sinh viên!`;
                        } else {
                            this.saveMessage = `⚠️ Đã lưu ${savedCount}/${totalStudents} sinh viên. ${errorCount} lỗi.`;
                        }
                        setTimeout(() => this.saveMessage = '', 5000);
                    }
                },
                error: (error) => {
                    errorCount++;
                    console.error('Error saving grade for student:', student.studentCode, error);

                    if (savedCount + errorCount === totalStudents) {
                        this.saving = false;
                        if (savedCount === 0) {
                            this.saveMessage = `❌ Lỗi khi lưu điểm cho tất cả sinh viên!`;
                        } else {
                            this.saveMessage = `⚠️ Đã lưu ${savedCount}/${totalStudents} sinh viên. ${errorCount} lỗi.`;
                        }
                        setTimeout(() => this.saveMessage = '', 5000);
                    }
                }
            });
        });
    }

    // Export grades to CSV or print
    exportGrades() {
        if (!this.selectedClass || this.selectedClass.students.length === 0) {
            alert('⚠️ Không có dữ liệu để xuất!');
            return;
        }

        // Call backend API to generate and download CSV
        this.teacherService.exportClassGrades(this.selectedClass.teachingId).subscribe({
            next: (blob) => {
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `bang_diem_${this.selectedClass?.courseCode || 'class'}_${new Date().toISOString().split('T')[0]}.csv`;
                link.click();
                window.URL.revokeObjectURL(url);
                this.saveMessage = '📄 Đã xuất bảng điểm thành công!';
                setTimeout(() => this.saveMessage = '', 3000);
            },
            error: (error) => {
                console.error('Error exporting grades:', error);
                alert('Có lỗi xảy ra khi xuất bảng điểm!');
            }
        });
    }     

    logout() {
        if (confirm('🚪 Bạn có chắc chắn muốn đăng xuất?')) {

            localStorage.removeItem('user');
            sessionStorage.clear();
            this.router.navigate(['/login']);
        }
    }
}
