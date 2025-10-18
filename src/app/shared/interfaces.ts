/**
 * Common interfaces used across the application
 * Centralized DTO definitions for consistency
 */

export interface ApiResponse {
    success: boolean;
    message: string;
}

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
 * @deprecated - Sử dụng PaymentSummaryDTO từ backend thay thế
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
 * @deprecated - Sử dụng ApiResponse thay thế
 * Giữ lại để tương thích với code cũ
 */
export interface ChangePasswordResponse extends ApiResponse {
}

export interface ChangePasswordRequest {
    newPassword: string;
    confirmPassword: string;
}
