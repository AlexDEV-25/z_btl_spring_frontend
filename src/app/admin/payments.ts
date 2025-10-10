import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { LayoutComponent } from '../shared/layout.component';
import { MenuItem } from '../shared/sidebar.component';

// Interfaces merged from admin.ts
export interface Payment {
    id: number;
    studentId: number;
    studentCode?: string;
    semesterId: number;
    semesterName?: string;
    paymentDate: string;
    status: 'PENDING' | 'PAID' | 'FAILED';
}

export interface PaymentDetail {
    id: number;
    studentId: number;
    studentName: string;
    studentClass: string;
    semesterId: number;
    semesterName: string;
    paymentDate: string;
    status: 'PENDING' | 'PAID' | 'FAILED';
    courses: CoursePaymentDetail[];
    totalAmount: number;
}

export interface CoursePaymentDetail {
    courseId: number;
    courseCode: string;
    courseName: string;
    credits: number;
    fee: number;
}

export interface PaymentStatusUpdateRequest {
    status: string;
    reason?: string;
}

export interface PaymentStatusUpdateResponse {
    success: boolean;
    message: string;
    payment?: Payment;
}

export interface PaymentStatistics {
    totalPayments: number;
    paidPayments: number;
    pendingPayments: number;
    failedPayments: number;
    totalAmount: number;
    paidAmount: number;
    pendingAmount: number;
}

export interface SemesterInfo {
    id: number;
    semester: string;
    displayName?: string;
}

@Component({
    selector: 'app-admin-payments',
    standalone: true,
    imports: [CommonModule, FormsModule, LayoutComponent],
    templateUrl: './payments.html',
    styleUrls: ['../shared/modern-theme.css']
})
export class AdminPaymentsComponent implements OnInit {
    payments: Payment[] = [];
    filteredPayments: Payment[] = [];
    statistics: PaymentStatistics | null = null;
    availableSemesters: SemesterInfo[] = [];

    loading = false;
    error = '';
    successMessage = '';

    // Filters
    statusFilter = '';
    semesterFilter = '';
    searchTerm = '';

    // Selected payment for status update
    selectedPayment: Payment | null = null;
    selectedPaymentDetail: PaymentDetail | null = null;
    showUpdateModal = false;
    newStatus = '';
    updateReason = '';
    updating = false;
    loadingDetail = false;

    userName = 'Admin';

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

    private baseUrl = 'http://localhost:8080/api/payments';

    constructor(
        private http: HttpClient,
        private router: Router
    ) { }

    ngOnInit() {
        this.loadSemesters();
        this.loadPayments();
        this.loadStatistics();
    }

    // Service methods (merged from admin-payment.service.ts)

    /**
     * Lấy tất cả payments với filtering
     */
    getAllPayments(status?: string, semester?: string): Observable<Payment[]> {
        let url = this.baseUrl;
        const params: string[] = [];

        if (status) {
            params.push(`status=${status}`);
        }
        if (semester) {
            params.push(`semester=${semester}`);
        }

        if (params.length > 0) {
            url += '?' + params.join('&');
        }

        return this.http.get<Payment[]>(url);
    }

    /**
     * Lấy payment theo ID
     */
    getPaymentById(id: number): Observable<Payment> {
        return this.http.get<Payment>(`${this.baseUrl}/${id}`);
    }

    /**
     * Lấy payment detail với thông tin đầy đủ
     */
    getPaymentDetail(id: number): Observable<PaymentDetail> {
        return this.http.get<PaymentDetail>(`${this.baseUrl}/${id}/detail`);
    }

    /**
     * Cập nhật trạng thái thanh toán
     */
    updatePaymentStatus(id: number, request: PaymentStatusUpdateRequest): Observable<PaymentStatusUpdateResponse> {
        return this.http.put<PaymentStatusUpdateResponse>(`${this.baseUrl}/${id}/status`, request);
    }

    /**
     * Lấy payments theo student ID
     */
    getPaymentsByStudentId(studentId: number): Observable<Payment[]> {
        return this.http.get<Payment[]>(`${this.baseUrl}/student/${studentId}`);
    }

    /**
     * Lấy thống kê payments
     */
    getPaymentStatistics(semester?: string): Observable<PaymentStatistics> {
        let url = `${this.baseUrl}/statistics`;
        if (semester) {
            url += `?semester=${semester}`;
        }
        return this.http.get<PaymentStatistics>(url);
    }

    /**
     * Lấy danh sách semesters
     */
    getAllSemesters(): Observable<SemesterInfo[]> {
        return this.http.get<SemesterInfo[]>('http://localhost:8080/api/semesters');
    }

    // Component methods

    loadSemesters() {
        this.getAllSemesters().subscribe({
            next: (semesters: SemesterInfo[]) => {
                this.availableSemesters = semesters.map(s => ({
                    id: s.id,
                    semester: s.semester,
                    displayName: s.displayName || s.semester
                }));
            },
            error: (error: any) => {
                console.error('Error loading semesters:', error);
                this.availableSemesters = [];
            }
        });
    }

    loadPayments() {
        this.loading = true;
        this.error = '';

        this.getAllPayments(this.statusFilter, this.semesterFilter).subscribe({
            next: (data: Payment[]) => {
                this.payments = data || [];
                this.applyFilters();
                this.loading = false;
            },
            error: (error: any) => {
                console.error('Error loading payments:', error);
                this.error = `Lỗi khi tải danh sách thanh toán: ${error.status} - ${error.statusText}`;
                this.loading = false;
            }
        });
    }

    loadStatistics() {
        this.getPaymentStatistics(this.semesterFilter).subscribe({
            next: (stats: PaymentStatistics) => {
                this.statistics = stats;
            },
            error: (error: any) => {
                console.error('Error loading statistics:', error);
            }
        });
    }

    applyFilters() {
        this.filteredPayments = this.payments.filter(payment => {
            const searchTerm = this.searchTerm?.toLowerCase() || '';
            const studentCode = payment.studentCode?.toLowerCase() || '';

            const matchesSearch = searchTerm === '' ||
                studentCode.includes(searchTerm) ||
                payment.id.toString().includes(searchTerm);

            const matchesStatus = !this.statusFilter ||
                payment.status === this.statusFilter;

            const matchesSemester = !this.semesterFilter ||
                payment.semesterName === this.semesterFilter;

            return matchesSearch && matchesStatus && matchesSemester;
        });
    }

    onSearchChange() {
        this.applyFilters();
    }

    onStatusFilterChange() {
        this.loadPayments();
        if (this.semesterFilter) {
            this.loadStatistics();
        }
    }

    onSemesterFilterChange() {
        this.loadPayments();
        this.loadStatistics();
    }

    onFilterChange() {
        this.loadPayments();
        if (this.semesterFilter) {
            this.loadStatistics();
        }
    }

    openUpdateModal(payment: Payment) {
        this.selectedPayment = payment;
        this.selectedPaymentDetail = null;
        this.newStatus = payment.status;
        this.updateReason = '';
        this.showUpdateModal = true;
        this.loadingDetail = true;

        // Load payment detail
        this.getPaymentDetail(payment.id).subscribe({
            next: (detail: PaymentDetail) => {
                this.selectedPaymentDetail = detail;
                this.loadingDetail = false;
            },
            error: (error: any) => {
                console.error('Error loading payment detail:', error);
                this.loadingDetail = false;
                this.error = 'Không thể tải chi tiết thanh toán';
            }
        });
    }

    closeUpdateModal() {
        this.selectedPayment = null;
        this.selectedPaymentDetail = null;
        this.showUpdateModal = false;
        this.newStatus = '';
        this.updateReason = '';
        this.updating = false;
        this.loadingDetail = false;
    }

    onUpdatePaymentStatus() {
        if (!this.selectedPayment || !this.newStatus) {
            return;
        }

        if (this.newStatus === this.selectedPayment.status) {
            this.closeUpdateModal();
            return;
        }

        const confirmMessage = `🔄 Bạn có chắc chắn muốn thay đổi trạng thái thanh toán từ "${this.getStatusText(this.selectedPayment.status)}" thành "${this.getStatusText(this.newStatus)}"?`;

        if (!confirm(confirmMessage)) {
            return;
        }

        this.updating = true;
        this.error = '';

        const request: PaymentStatusUpdateRequest = {
            status: this.newStatus,
            reason: this.updateReason
        };

        this.updatePaymentStatus(this.selectedPayment.id, request).subscribe({
            next: (response: PaymentStatusUpdateResponse) => {
                if (response.success) {
                    this.successMessage = response.message;
                    this.loadPayments();
                    this.loadStatistics();
                    this.closeUpdateModal();

                    // Clear success message after 3 seconds
                    setTimeout(() => {
                        this.successMessage = '';
                    }, 3000);
                } else {
                    this.error = response.message;
                }
                this.updating = false;
            },
            error: (error: any) => {
                console.error('Error updating payment status:', error);
                this.error = `Lỗi khi cập nhật trạng thái: ${error.status} - ${error.statusText}`;
                this.updating = false;
            }
        });
    }

    // Method for HTML template (without parameters)
    updatePaymentStatusFromUI() {
        this.onUpdatePaymentStatus();
    }

    getStatusBadgeClass(status: string): string {
        switch (status) {
            case 'PAID':
                return 'status-paid';
            case 'PENDING':
                return 'status-pending';
            case 'FAILED':
                return 'status-failed';
            default:
                return 'status-unknown';
        }
    }

    getStatusText(status: string): string {
        switch (status) {
            case 'PAID':
                return 'Đã thanh toán';
            case 'PENDING':
                return 'Chờ thanh toán';
            case 'FAILED':
                return 'Thanh toán thất bại';
            default:
                return 'Không xác định';
        }
    }

    formatCurrency(amount: number): string {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(amount);
    }

    formatDate(dateString: string): string {
        return new Date(dateString).toLocaleString('vi-VN');
    }
    /**
     * Export payments to CSV
     */
    exportPayments() {
        this.loading = true;
        this.http.get(`${this.baseUrl}/export`, {
            params: this.statusFilter ? { status: this.statusFilter } : {},
            responseType: 'blob'
        }).subscribe({
            next: (blob: Blob) => {
                // Create download link
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;

                // Update filename to reflect payment status instead of semester
                const statusText = this.statusFilter ? this.getStatusText(this.statusFilter).toLowerCase().replace(/\s+/g, '_') : 'tat_ca_trang_thai';
                a.download = `danh_sach_thanh_toan_${statusText}.csv`;

                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);

                this.loading = false;
                this.successMessage = '✅ Xuất file CSV thành công!';
                setTimeout(() => {
                    this.successMessage = '';
                }, 3000);
            },
            error: (error: any) => {
                console.error('Error exporting payments:', error);
                this.error = '❌ Lỗi khi xuất file CSV';
                this.loading = false;
                setTimeout(() => {
                    this.error = '';
                }, 5000);
            }
        });
    }
}
