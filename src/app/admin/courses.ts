import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { LayoutComponent } from '../shared/layout.component';
import { MenuItem } from '../shared/sidebar.component';

interface Course {
    id?: number;
    courseCode: string;
    name: string;
    credit: number | null;
    slot?: number | null;
    fee?: number | null;
    semesterId?: number | null;
}

interface Semester {
    id: number;
    semester: string;
}

@Component({
    selector: 'admin-courses',
    standalone: true,
    imports: [CommonModule, FormsModule, LayoutComponent],
    templateUrl: './courses.html',
    styleUrls: ['../shared/modern-theme.css']
})
export class AdminCoursesComponent {
    baseUrl: string = 'http://localhost:8080/api/courses';
    semestersUrl: string = 'http://localhost:8080/api/semesters';
    courses: Course[] = [];
    filteredCourses: Course[] = [];
    semesters: Semester[] = [];
    searchText: string = '';
    form: Course = { courseCode: '', name: '', credit: null, slot: null, fee: null, semesterId: null };
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
        this.loadCourses();
        this.loadSemesters();
    }

    loadCourses() {
        this.http.get<Course[]>(this.baseUrl).subscribe({
            next: data => { this.courses = data || []; this.applyFilter(); },
            error: err => console.error('Load courses failed', err)
        });
    }

    loadSemesters() {
        this.http.get<Semester[]>(this.semestersUrl).subscribe({
            next: data => this.semesters = data || [],
            error: err => console.error('Load semesters failed', err)
        });
    }

    applyFilter() {
        const q = (this.searchText || '').trim().toLowerCase();
        if (!q) { this.filteredCourses = [...this.courses]; return; }
        this.filteredCourses = this.courses.filter(c => {
            const sem = this.getSemesterName(c.semesterId ?? null).toLowerCase();
            return (
                (c.courseCode || '').toLowerCase().includes(q) ||
                (c.name || '').toLowerCase().includes(q) ||
                sem.includes(q)
            );
        });
    }

    reset() {
        this.form = { courseCode: '', name: '', credit: null, slot: null, fee: null, semesterId: null };
        this.editingId = null;
    }

    selectForEdit(c: Course) {
        this.editingId = c.id ?? null;
        this.form = {
            id: c.id,
            courseCode: c.courseCode,
            name: c.name,
            credit: c.credit ?? null,
            slot: c.slot ?? null,
            fee: c.fee ?? null,
            semesterId: c.semesterId ?? null
        };
    }

    save() {
        const code = (this.form.courseCode || '').trim().toUpperCase();
        const name = (this.form.name || '').trim();
        const creditVal = this.form.credit !== null && this.form.credit !== undefined
            ? Number(this.form.credit) : null;
        const payload: Course = {
            courseCode: code,
            name,
            credit: creditVal,
            slot: (this.form.slot !== null && this.form.slot !== undefined) ? Number(this.form.slot) : null,
            fee: (this.form.fee !== null && this.form.fee !== undefined) ? Number(this.form.fee) : null,
            semesterId: (this.form.semesterId !== null && this.form.semesterId !== undefined) ? Number(this.form.semesterId) : null
        };
        if (!payload.courseCode || !payload.name || !payload.credit) return;

        if (this.editingId) {
            const body: any = { id: this.editingId, ...payload };
            this.http.put(`${this.baseUrl}/${this.editingId}`, body, { responseType: 'text' }).subscribe({
                next: () => { this.loadCourses(); this.reset(); },
                error: err => console.error('Update failed', err)
            });
        } else {
            this.http.post(this.baseUrl, payload, { responseType: 'text' }).subscribe({
                next: () => { this.loadCourses(); this.reset(); },
                error: err => console.error('Create failed', err)
            });
        }
    }

    getSemesterName(semesterId: number | null): string {
        if (!semesterId) return 'N/A';
        const s = this.semesters.find(x => x.id === semesterId);
        return s ? s.semester : 'Unknown';
    }

    remove(id?: number) {
        if (!id) return;
        if (!confirm('⚠️ Bạn có chắc chắn muốn xóa khóa học này?\n\nThao tác này không thể hoàn tác!')) return;
        this.http.delete(`${this.baseUrl}/${id}`, { responseType: 'text' }).subscribe({
            next: () => this.loadCourses(),
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


