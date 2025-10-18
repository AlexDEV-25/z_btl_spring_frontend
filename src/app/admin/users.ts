import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { LayoutComponent } from '../shared/layout.component';
import { MenuItem } from '../shared/sidebar.component';

interface User {
    id?: number;
    username: string;
    password: string;
    fullName: string;
    email: string;
    roleId: number | null;
    departmentId?: number | null;
    gender?: 'MALE' | 'FEMALE' | 'OTHER';
    phone?: string;
    dateOfBirth?: string;
    address?: string;
}

interface Role {
    id: number;
    name: string;
}

interface Department {
    id: number;
    name: string;
    code: string;
}

@Component({
    selector: 'admin-users',
    standalone: true,
    imports: [CommonModule, FormsModule, LayoutComponent],
    templateUrl: './users.html',
    styleUrls: ['../shared/modern-theme.css']
})
export class AdminUsersComponent {
    baseUrl: string = 'http://localhost:8080/api/user';
    users: User[] = [];
    filteredUsers: User[] = [];
    departmentsUrl: string = 'http://localhost:8080/api/departments';
    departments: Department[] = [];
    roles: Role[] = [
        { id: 2, name: 'ROLE_GIẢNG_VIÊN' },
        { id: 1, name: 'ROLE_HIỆU_TRƯỞNG' },
        { id: 3, name: 'ROLE_SINH_VIÊN' }
    ];
    genders = [
        { key: 'MALE', label: 'Nam' },
        { key: 'FEMALE', label: 'Nữ' },
        { key: 'OTHER', label: 'Khác' }
    ];
    searchText: string = '';
    form: User = { username: '', password: '', fullName: '', email: '', roleId: null, departmentId: null, gender: 'MALE', phone: '', dateOfBirth: '', address: '' };
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
        this.loadUsers();
        this.loadDepartments();
    }
    loadUsers() {
        // Always fetch full list; filter client-side for responsiveness
        this.http.get<User[]>(this.baseUrl).subscribe({
            next: data => { this.users = data || []; this.applyFilter(); },
            error: err => console.error('Load users failed', err)
        });
    }

    applyFilter() {
        const q = (this.searchText || '').trim().toLowerCase();
        if (!q) { this.filteredUsers = [...this.users]; return; }
        this.filteredUsers = this.users.filter(u => {
            const roleName = this.getRoleName(u.roleId).toLowerCase();
            const deptName = this.getDepartmentName(u.departmentId || null).toLowerCase();
            const gender = (u.gender || '').toString().toLowerCase();
            return (
                (u.username || '').toLowerCase().includes(q) ||
                (u.fullName || '').toLowerCase().includes(q) ||
                (u.email || '').toLowerCase().includes(q) ||
                (u.phone || '').toLowerCase().includes(q) ||
                (u.dateOfBirth || '').toLowerCase().includes(q) ||
                (u.address || '').toLowerCase().includes(q) ||
                roleName.includes(q) ||
                deptName.includes(q) ||
                gender.includes(q)
            );
        });
    }

    getRoleName(roleId: number | null): string {
        if (!roleId) return 'N/A';
        const role = this.roles.find(r => r.id === roleId);
        return role ? role.name : 'Unknown';
    }

    loadDepartments() {
        this.http.get<Department[]>(this.departmentsUrl).subscribe({
            next: data => this.departments = data || [],
            error: err => console.error('Load departments failed', err)
        });
    }

    getDepartmentName(departmentId: number | null): string {
        if (!departmentId) return 'N/A';
        const d = this.departments.find(x => x.id === departmentId);
        return d ? `${d.code} - ${d.name}` : 'Unknown';
    }

    reset() {
        this.form = { username: '', password: '', fullName: '', email: '', roleId: null, departmentId: null, gender: 'OTHER', phone: '', dateOfBirth: '', address: '' };
        this.editingId = null;
    }

    selectForEdit(u: User) {
        this.editingId = u.id ?? null;
        this.form = {
            id: u.id,
            username: u.username,
            password: u.password, // Load password gốc từ backend (đã được giải mã)
            fullName: u.fullName,
            email: u.email,
            roleId: u.roleId ?? null,
            departmentId: u.departmentId ?? null,
            gender: (u.gender as any) || 'OTHER',
            phone: u.phone || '',
            dateOfBirth: u.dateOfBirth || '',
            address: u.address || ''
        };
    }

    save() {
        const payload: User = {
            username: (this.form.username || '').trim(),
            password: (this.form.password || '').trim(),
            fullName: (this.form.fullName || '').trim(),
            email: (this.form.email || '').trim(),
            roleId: this.form.roleId ? Number(this.form.roleId) : null,
            departmentId: this.form.departmentId ? Number(this.form.departmentId) : null,
            gender: (this.form.gender as any) || 'OTHER',
            phone: (this.form.phone || '').trim(),
            dateOfBirth: (this.form.dateOfBirth || '').substring(0, 10),
            address: (this.form.address || '').trim()
        };

        if (!payload.username || !payload.fullName || !payload.email || !payload.roleId) return;
        if (!this.editingId && !payload.password) return; // Yêu cầu password khi tạo mới

        if (this.editingId) {
            this.http.put(`${this.baseUrl}/${this.editingId}`, payload, { responseType: 'text' }).subscribe({
                next: () => { this.loadUsers(); this.reset(); },
                error: err => console.error('Update failed', err)
            });
        } else {
            this.http.post(this.baseUrl, payload, { responseType: 'text' }).subscribe({
                next: () => { this.loadUsers(); this.reset(); },
                error: err => console.error('Create failed', err)
            });
        }
    }

    remove(id?: number) {
        if (!id) return;
        if (!confirm('⚠️ Bạn có chắc chắn muốn xóa user này?\n\nThao tác này không thể hoàn tác!')) return;
        this.http.delete(`${this.baseUrl}/${id}`, { responseType: 'text' }).subscribe({
            next: () => this.loadUsers(),
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


