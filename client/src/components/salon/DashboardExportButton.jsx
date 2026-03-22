import { Download } from 'lucide-react';

const DashboardExport = ({
    stats,
    revenueData = [],
    bookingsData = [],
    todaySchedule = [],
    topServices = []
}) => {
    const handleExportExcel = async () => {
        const XLSX = await import('xlsx');

        const workbook = XLSX.utils.book_new();

        const summarySheet = XLSX.utils.json_to_sheet([
            { Metric: 'Total Revenue', Value: stats.totalRevenue },
            { Metric: 'Total Bookings', Value: stats.totalBookings },
            { Metric: 'New Customers (30d)', Value: stats.newCustomers },
            { Metric: 'Avg Rating', Value: stats.avgRating },
            { Metric: 'Exported At', Value: new Date().toLocaleString('vi-VN') }
        ]);

        const revenueSheet = XLSX.utils.json_to_sheet(
            revenueData.map((item) => ({
                Period: item.name,
                Revenue: item.revenue
            }))
        );

        const bookingsSheet = XLSX.utils.json_to_sheet(
            bookingsData.map((item) => ({
                Period: item.name,
                Bookings: item.bookings
            }))
        );

        const scheduleSheet = XLSX.utils.json_to_sheet(
            todaySchedule.map((item) => ({
                Time: item.time,
                Duration: item.duration,
                Customer: item.customer,
                Service: item.service,
                Stylist: item.stylist,
                Status: item.status
            }))
        );

        const servicesSheet = XLSX.utils.json_to_sheet(
            topServices.map((item, index) => ({
                Rank: index + 1,
                Service: item.name,
                Bookings: item.bookings,
                Revenue: item.revenue
            }))
        );

        XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
        XLSX.utils.book_append_sheet(workbook, revenueSheet, 'Revenue');
        XLSX.utils.book_append_sheet(workbook, bookingsSheet, 'Bookings');
        XLSX.utils.book_append_sheet(workbook, scheduleSheet, 'TodaySchedule');
        XLSX.utils.book_append_sheet(workbook, servicesSheet, 'TopServices');

        const datePart = new Date().toISOString().slice(0, 10);
        XLSX.writeFile(workbook, `salon-dashboard-report-${datePart}.xlsx`);
    };

    return (
        <button className="dash-btn" onClick={handleExportExcel}>
            <Download size={16} />
            Export Excel
        </button>
    );
};

export default DashboardExport;
