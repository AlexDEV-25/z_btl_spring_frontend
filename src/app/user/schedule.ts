import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { UserService, StudentSchedule, ScheduleItem, SemesterInfo } from './user.service';
import { AuthService } from '../auth.service';
import { LayoutComponent } from '../shared/layout.component';
import { MenuItem } from '../shared/sidebar.component';

@Component({
    selector: 'app-user-schedule',
    standalone: true,
    imports: [CommonModule, FormsModule, LayoutComponent],
    templateUrl: './schedule.html',
    styleUrls: ['../shared/modern-theme.css']
})
export class UserScheduleComponent implements OnInit {
    schedule: StudentSchedule | null = null;
    loading = false;
    error = '';
    selectedSemester = '2024-1';
    studentId: number = 1;
    userName = '';
    availableSemesters: SemesterInfo[] = [];

    // Timetable configuration used by the template
    periods: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    days: { label: string; value: string; index: number; date: string }[] = [
        { label: 'Mon', value: 'Monday', index: 1, date: '' },
        { label: 'Tue', value: 'Tuesday', index: 2, date: '' },
        { label: 'Wed', value: 'Wednesday', index: 3, date: '' },
        { label: 'Thu', value: 'Thursday', index: 4, date: '' },
        { label: 'Fri', value: 'Friday', index: 5, date: '' },
        { label: 'Sat', value: 'Saturday', index: 6, date: '' },
        { label: 'Sun', value: 'Sunday', index: 7, date: '' }
    ];

    // Menu items for sidebar
    menuItems: MenuItem[] = [
        { icon: '📅', label: 'Thời khóa biểu', route: '/user/schedule' },
        { icon: '📊', label: 'Bảng điểm', route: '/user/grades' },
        { icon: '📚', label: 'Đăng ký môn học', route: '/user/registration' },
        { icon: '💰', label: 'Học phí', route: '/user/payment' },
        { icon: '👤', label: 'Thông tin cá nhân', route: '/user/profile' }
    ];

    events: Array<{
        dayIndex: number;
        start: number;
        end: number;
        title: string;
        lecturer?: string;
        room?: string;
        credit: number;
        color: string;
    }> = [];

    constructor(
        private userService: UserService,
        private router: Router,
        private authService: AuthService
    ) { }

    ngOnInit() {
        const currentUser = this.authService.getCurrentUser();
        this.studentId = 1; // Set default student ID
        this.userName = currentUser?.fullName || 'Sinh viên';
        this.loadSemesters();
        this.loadSchedule();
    }

    loadSemesters() {
        this.userService.getAllSemesters().subscribe({
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

    loadSchedule() {
        this.loading = true;
        this.error = '';

        this.userService.getStudentSchedule(this.selectedSemester).subscribe({
            next: (data) => {
                console.log('Schedule loaded successfully:', data);
                this.schedule = data;
                this.events = this.toEvents(data.scheduleItems);
                this.loading = false;
            },
            error: (error) => {
                console.error('Error loading schedule:', error);
                this.error = `Lỗi khi tải thời khóa biểu: ${error.status} - ${error.statusText}`;
                this.loading = false;
            }
        });
    }

    // Backend đã cung cấp dữ liệu đầy đủ, frontend chỉ cần convert đơn giản
    private toEvents(scheduleItems: ScheduleItem[]) {
        const palette = ['#ff6b35', '#3182ce', '#38a169', '#805ad5', '#319795', '#d53f8c', '#ecc94b'];
        let idx = 0;

        return scheduleItems.map(item => {
            const { start, end } = this.parsePeriod(item.period);
            const color = palette[idx++ % palette.length];

            return {
                dayIndex: this.dayToIndex(item.dayOfWeek),
                start,
                end: end + 1,
                title: `${item.courseCode} - ${item.courseName}`,
                lecturer: item.lecturerName,
                room: item.classroom || item.room || 'Chưa xác định',
                credit: item.credit,
                color
            };
        });
    }
    
    private parsePeriod(period?: string): { start: number; end: number } {
        if (!period) return { start: 1, end: 1 };
        const match = period.match(/(\d+)\s*-\s*(\d+)/);
        if (match) {
            return { start: Number(match[1]), end: Number(match[2]) };
        }
        const num = Number(period);
        return { start: num || 1, end: num || 1 };
    }
    
    private dayToIndex(day?: string): number {
        const dayMap: { [key: string]: number } = {
            'Thứ 2': 1, 'Monday': 1, 'Thứ 3': 2, 'Tuesday': 2,
            'Thứ 4': 3, 'Wednesday': 3, 'Thứ 5': 4, 'Thursday': 4,
            'Thứ 6': 5, 'Friday': 5, 'Thứ 7': 6, 'Saturday': 6,
            'Chủ nhật': 7, 'Sunday': 7
        };
        return dayMap[day || ''] || 1;
    }

    onSemesterChange() {
        this.loadSchedule();
    }

    // Đơn giản hóa việc hiển thị thời gian
    getPeriodTime(period: number, isEnd: boolean = false): string {
        const times = [
            ['07:00', '07:45'], ['07:50', '08:35'], ['08:40', '09:25'], 
            ['09:45', '10:30'], ['10:35', '11:20'], ['11:25', '12:10'],
            ['13:00', '13:45'], ['13:50', '14:35'], ['14:40', '15:25'], 
            ['15:45', '16:30'], ['16:35', '17:20']
        ];
        
        if (period < 1 || period > 10) return '';
        return times[period - 1][isEnd ? 1 : 0];
    }

    getEventTooltip(event: any): string {
        return `${event.title}\nGiảng viên: ${event.lecturer}\nPhòng: ${event.room}\nTín chỉ: ${event.credit}`;
    }
    goToGrades() {
        this.router.navigate(['/user/grades']);
    }

    goToRegistration() {
        this.router.navigate(['/user/registration']);
    }

    exportSchedule() {
        // Implementation for exporting schedule
        console.log('Exporting schedule...');
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
