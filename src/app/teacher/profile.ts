import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TeacherService, TeacherProfile, ChangePasswordRequest, ApiResponse } from './teacher.service';
import { Router } from '@angular/router';
import { LayoutComponent } from '../shared/layout.component';
import { MenuItem } from '../shared/sidebar.component';

@Component({
    selector: 'app-teacher-profile',
    standalone: true,
    imports: [CommonModule, FormsModule, LayoutComponent],
    templateUrl: './profile.html',
    styleUrls: ['../shared/modern-theme.css']
})
export class TeacherProfileComponent implements OnInit {
    profile: TeacherProfile | null = null;
    loading = false;
    error = '';
    userName = 'Giảng viên';

    // Password change form
    showPasswordForm = false;
    passwordRequest: ChangePasswordRequest = {
        newPassword: '',
        confirmPassword: ''
    };
    passwordLoading = false;
    passwordMessage = '';
    passwordError = '';

    // Menu items for teacher sidebar
    menuItems: MenuItem[] = [
        { icon: '📅', label: 'Lịch dạy', route: '/teacher/classes' },
        { icon: '📝', label: 'Chấm điểm', route: '/teacher/grading' },
        { icon: '👤', label: 'Thông tin cá nhân', route: '/teacher/profile' }
    ];

    constructor(private teacherService: TeacherService, private router: Router) { }

    ngOnInit() {
        this.loadProfile();
    }

    loadProfile() {
        this.loading = true;
        this.error = '';

        this.teacherService.getTeacherProfile().subscribe({
            next: (data) => {
                console.log('Profile loaded successfully:', data);
                this.profile = data;
                this.userName = data.fullName || 'Giảng viên';
                this.loading = false;
            },
            error: (error) => {
                console.error('Error loading profile:', error);
                this.error = `Lỗi khi tải thông tin cá nhân: ${error.status} - ${error.statusText}`;
                this.loading = false;
            }
        });
    }

    togglePasswordForm() {
        this.showPasswordForm = !this.showPasswordForm;
        if (!this.showPasswordForm) {
            this.resetPasswordForm();
        }
    }

    resetPasswordForm() {
        this.passwordRequest = {
            newPassword: '',
            confirmPassword: ''
        };
        this.passwordMessage = '';
        this.passwordError = '';
    }

    changePassword() {
        // Validate form - không cần mật khẩu hiện tại

        if (!this.passwordRequest.newPassword) {
            this.passwordError = 'Vui lòng nhập mật khẩu mới';
            return;
        }

        if (this.passwordRequest.newPassword.length < 6) {
            this.passwordError = 'Mật khẩu mới phải có ít nhất 6 ký tự';
            return;
        }

        if (this.passwordRequest.newPassword !== this.passwordRequest.confirmPassword) {
            this.passwordError = 'Xác nhận mật khẩu không khớp';
            return;
        }

        this.passwordLoading = true;
        this.passwordError = '';
        this.passwordMessage = '';

        this.teacherService.changePassword(this.passwordRequest).subscribe({
            next: (response: ApiResponse) => {
                console.log('Password change response:', response);
                this.passwordLoading = false;
                
                if (response.success) {
                    this.passwordMessage = response.message;
                    this.resetPasswordForm();
                    this.showPasswordForm = false;
                } else {
                    this.passwordError = response.message;
                }
            },
            error: (error) => {
                console.error('Error changing password:', error);
                this.passwordError = `Lỗi hệ thống: ${error.status} - ${error.statusText}`;
                this.passwordLoading = false;
            }
        });
    }

    logout() {
        if (confirm('🚪 Bạn có chắc chắn muốn đăng xuất?')) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            sessionStorage.clear();
            this.router.navigate(['/login']);
        }
    }
}
