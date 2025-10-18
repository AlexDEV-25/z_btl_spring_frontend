import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { LayoutComponent } from '../shared/layout.component';
import { MenuItem } from '../shared/sidebar.component';

interface Teaching {
    id?: number;
    lecturerId: number | null;
    courseId: number | null;
    period?: string;
    dayOfWeek?: string;
    classRoom?: string;
}

interface Lecturer {
    id: number;
    lecturerCode: string;
    department: string;
    fullName?: string;
    userId?: number;
}

interface Course {
    id: number;
    courseCode: string;
    name: string;
}


@Component({
    selector: 'admin-teachings',
    standalone: true,
    imports: [CommonModule, FormsModule, LayoutComponent],
    templateUrl: './teachings.html',
    styleUrls: ['../shared/modern-theme.css']
})
export class AdminTeachingsComponent {
    baseUrl: string = 'http://localhost:8080/api/teachings';
    lecturersUrl: string = 'http://localhost:8080/api/lecturers';
    coursesUrl: string = 'http://localhost:8080/api/courses';
    teachings: Teaching[] = [];
    filteredTeachings: Teaching[] = [];
    lecturers: Lecturer[] = [];
    courses: Course[] = [];
    searchText: string = '';
    form: Teaching = { lecturerId: null, courseId: null, period: '', dayOfWeek: '', classRoom: '' };
    editingId: number | null = null;
    userName = 'Nguyễn Văn Hiệu Trưởng';

    // Menu items for admin sidebar
    menuItems: MenuItem[] = [
        { icon: '👥', label: 'Sinh viên', route: '/admin/students' },
        { icon: '📚', label: 'Học phần', route: '/admin/courses' },
        { icon: '🏢', label: 'Lớp học', route: '/admin/classes' },
        { icon: '👨‍🏫', label: 'Giảng viên', route: '/admin/lecturers' },
        { icon: '📅', label: 'Học kỳ', route: '/admin/semesters' },
        { icon: '🏆', label: 'Học bổng', route: '/admin/enrollments' },
        { icon: '👤', label: 'Người dùng', route: '/admin/users' },
        { icon: '🏛️', label: 'Khoa', route: '/admin/departments' },
        { icon: '📖', label: 'Phân công', route: '/admin/teachings' },
        { icon: '💰', label: 'Học phí', route: '/admin/payments' }
    ];

    constructor(private http: HttpClient, private router: Router) {
        this.loadTeachings();
        this.loadLecturers();
        this.loadCourses();
    }

    loadTeachings() {
        this.http.get<Teaching[]>(this.baseUrl).subscribe({
            next: data => { this.teachings = data || []; this.applyFilter(); },
            error: err => console.error('Load teachings failed', err)
        });
    }

    applyFilter() {
        const q = (this.searchText || '').trim().toLowerCase();
        if (!q) { this.filteredTeachings = [...this.teachings]; return; }
        this.filteredTeachings = this.teachings.filter(t => {
            const lecturerName = this.getLecturerName(t.lecturerId).toLowerCase();
            const courseName = this.getCourseName(t.courseId).toLowerCase();
            return (
                lecturerName.includes(q) ||
                courseName.includes(q) ||
                (t.period || '').toLowerCase().includes(q) ||
                (t.dayOfWeek || '').toLowerCase().includes(q) ||
                (t.classRoom || '').toLowerCase().includes(q)
            );
        });
    }

    loadLecturers() {
        this.http.get<Lecturer[]>(`${this.lecturersUrl}/with-details`).subscribe({
            next: data => this.lecturers = data || [],
            error: err => console.error('Load lecturers failed', err)
        });
    }

    loadCourses() {
        this.http.get<Course[]>(this.coursesUrl).subscribe({
            next: data => this.courses = data || [],
            error: err => console.error('Load courses failed', err)
        });
    }

    getLecturerName(lecturerId: number | null): string {
        if (!lecturerId) return 'N/A';
        const lecturer = this.lecturers.find(l => l.id === lecturerId);
        if (!lecturer) return 'Unknown';

        // Hiển thị tên thật nếu có, nếu không thì hiển thị mã giảng viên
        const displayName = lecturer.fullName || lecturer.lecturerCode;
        return `${displayName}`;
    }

    getCourseName(courseId: number | null): string {
        if (!courseId) return 'N/A';
        const course = this.courses.find(c => c.id === courseId);
        return course ? `${course.courseCode} - ${course.name}` : 'Unknown';
    }

    reset() {
        this.form = { lecturerId: null, courseId: null, period: '', dayOfWeek: '', classRoom: '' };
        this.editingId = null;
    }

    selectForEdit(t: Teaching) {
        this.editingId = t.id ?? null;
        this.form = {
            id: t.id,
            lecturerId: t.lecturerId ?? null,
            courseId: t.courseId ?? null,
            period: t.period || '',
            dayOfWeek: t.dayOfWeek || '',
            classRoom: t.classRoom || ''
        };
    }

    save() {
        const payload: Teaching = {
            lecturerId: this.form.lecturerId ? Number(this.form.lecturerId) : null,
            courseId: this.form.courseId ? Number(this.form.courseId) : null,
            period: (this.form.period || '').trim(),
            dayOfWeek: (this.form.dayOfWeek || '').trim(),
            classRoom: (this.form.classRoom || '').trim()
        };
        if (!payload.lecturerId || !payload.courseId) return;

        if (this.editingId) {
            this.http.put(`${this.baseUrl}/${this.editingId}`, payload, { responseType: 'text' }).subscribe({
                next: () => { this.loadTeachings(); this.reset(); },
                error: err => console.error('Update failed', err)
            });
        } else {
            this.http.post(this.baseUrl, payload, { responseType: 'text' }).subscribe({
                next: () => { this.loadTeachings(); this.reset(); },
                error: err => console.error('Create failed', err)
            });
        }
    }

    remove(id?: number) {
        if (!id) return;
        if (!confirm('⚠️ Bạn có chắc chắn muốn xóa phân công giảng dạy này?\n\nThao tác này không thể hoàn tác!')) return;
        this.http.delete(`${this.baseUrl}/${id}`, { responseType: 'text' }).subscribe({
            next: () => this.loadTeachings(),
            error: err => console.error('Delete failed', err)
        });
    }

    logout() {
        if (confirm('🚪 Bạn có chắc chắn muốn đăng xuất?')) {
            // Clear any stored authentication data
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            sessionStorage.clear();

            // Redirect to login page
            this.router.navigate(['/login']);
        }
    }
}


