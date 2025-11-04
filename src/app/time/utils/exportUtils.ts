import type { Task, StudySession, Reminder } from '../types';

export interface ExportData {
  tasks: Task[];
  studySessions: StudySession[];
  reminders: Reminder[];
  exportDate: string;
  period: {
    start: string;
    end: string;
  };
}

/**
 * Export data to CSV format
 */
export function exportToCSV(data: ExportData): string {
  const rows: string[] = [];
  
  // Header
  rows.push('Time Management Export');
  rows.push(`Export Date: ${data.exportDate}`);
  rows.push(`Period: ${data.period.start} to ${data.period.end}`);
  rows.push('');
  
  // Tasks section
  rows.push('Tasks');
  rows.push('ID,Title,Status,Priority,Subject,Due Date,Completed At,Created At');
  data.tasks.forEach(task => {
    rows.push([
      task.id,
      `"${task.title.replace(/"/g, '""')}"`,
      task.status || 'PENDING',
      task.priority || 'MEDIUM',
      task.subject || '',
      task.dueAt || '',
      task.completedAt || '',
      task.createdAt || ''
    ].join(','));
  });
  rows.push('');
  
  // Study Sessions section
  rows.push('Study Sessions');
  rows.push('ID,Subject,Start Time,End Time,Duration (minutes),Task ID');
  data.studySessions.forEach(session => {
    rows.push([
      session.id,
      session.subject || '',
      session.startTime,
      session.endTime,
      session.durationMin,
      session.taskId || ''
    ].join(','));
  });
  rows.push('');
  
  // Reminders section
  rows.push('Reminders');
  rows.push('ID,Title,Message,Remind At,Type,Priority,Is Completed');
  data.reminders.forEach(reminder => {
    rows.push([
      reminder.id,
      `"${reminder.title.replace(/"/g, '""')}"`,
      `"${(reminder.message || '').replace(/"/g, '""')}"`,
      reminder.remindAt,
      reminder.type || 'CUSTOM',
      reminder.priority || 'MEDIUM',
      reminder.isCompleted ? 'Yes' : 'No'
    ].join(','));
  });
  
  return rows.join('\n');
}

/**
 * Export data to JSON format
 */
export function exportToJSON(data: ExportData): string {
  return JSON.stringify(data, null, 2);
}

/**
 * Download file with given content and filename
 */
export function downloadFile(content: string, filename: string, mimeType: string = 'text/plain'): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate PDF report (simplified version - creates HTML that can be printed)
 */
export function generatePDFReport(data: ExportData): string {
  const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>تقرير إدارة الوقت</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      direction: rtl;
      padding: 40px;
      line-height: 1.6;
    }
    h1 {
      color: #3b82f6;
      border-bottom: 3px solid #3b82f6;
      padding-bottom: 10px;
    }
    h2 {
      color: #6366f1;
      margin-top: 30px;
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 5px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th, td {
      border: 1px solid #e5e7eb;
      padding: 12px;
      text-align: right;
    }
    th {
      background-color: #f3f4f6;
      font-weight: bold;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin: 20px 0;
    }
    .stat-card {
      background: #f9fafb;
      padding: 15px;
      border-radius: 8px;
      border-right: 4px solid #3b82f6;
    }
    .stat-value {
      font-size: 24px;
      font-weight: bold;
      color: #3b82f6;
    }
    @media print {
      body { padding: 20px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <h1>تقرير إدارة الوقت</h1>
  <p><strong>تاريخ التصدير:</strong> ${data.exportDate}</p>
  <p><strong>الفترة:</strong> ${data.period.start} إلى ${data.period.end}</p>
  
  <div class="stats">
    <div class="stat-card">
      <div>إجمالي المهام</div>
      <div class="stat-value">${data.tasks.length}</div>
    </div>
    <div class="stat-card">
      <div>المهام المكتملة</div>
      <div class="stat-value">${data.tasks.filter(t => t.status === 'COMPLETED').length}</div>
    </div>
    <div class="stat-card">
      <div>جلسات المذاكرة</div>
      <div class="stat-value">${data.studySessions.length}</div>
    </div>
    <div class="stat-card">
      <div>إجمالي ساعات المذاكرة</div>
      <div class="stat-value">${(data.studySessions.reduce((sum, s) => sum + s.durationMin, 0) / 60).toFixed(1)}</div>
    </div>
    <div class="stat-card">
      <div>التذكيرات</div>
      <div class="stat-value">${data.reminders.length}</div>
    </div>
  </div>
  
  <h2>المهام</h2>
  <table>
    <thead>
      <tr>
        <th>العنوان</th>
        <th>الحالة</th>
        <th>الأولوية</th>
        <th>المادة</th>
        <th>موعد الاستحقاق</th>
        <th>تاريخ الإكمال</th>
      </tr>
    </thead>
    <tbody>
      ${data.tasks.map(task => `
        <tr>
          <td>${task.title}</td>
          <td>${task.status || 'PENDING'}</td>
          <td>${task.priority || 'MEDIUM'}</td>
          <td>${task.subject || '-'}</td>
          <td>${task.dueAt ? new Date(task.dueAt).toLocaleDateString('ar-EG') : '-'}</td>
          <td>${task.completedAt ? new Date(task.completedAt).toLocaleDateString('ar-EG') : '-'}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  
  <h2>جلسات المذاكرة</h2>
  <table>
    <thead>
      <tr>
        <th>المادة</th>
        <th>وقت البدء</th>
        <th>وقت الانتهاء</th>
        <th>المدة (دقيقة)</th>
      </tr>
    </thead>
    <tbody>
      ${data.studySessions.map(session => `
        <tr>
          <td>${session.subject || '-'}</td>
          <td>${new Date(session.startTime).toLocaleString('ar-EG')}</td>
          <td>${new Date(session.endTime).toLocaleString('ar-EG')}</td>
          <td>${session.durationMin}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  
  <h2>التذكيرات</h2>
  <table>
    <thead>
      <tr>
        <th>العنوان</th>
        <th>الرسالة</th>
        <th>وقت التذكير</th>
        <th>النوع</th>
        <th>الأولوية</th>
      </tr>
    </thead>
    <tbody>
      ${data.reminders.map(reminder => `
        <tr>
          <td>${reminder.title}</td>
          <td>${reminder.message || '-'}</td>
          <td>${new Date(reminder.remindAt).toLocaleString('ar-EG')}</td>
          <td>${reminder.type || 'CUSTOM'}</td>
          <td>${reminder.priority || 'MEDIUM'}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
</body>
</html>
  `;
  
  return html;
}

/**
 * Print PDF report
 */
export function printPDFReport(html: string): void {
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  }
}

