import type { Student, AttendanceConfig } from '../types';

export function exportCSV(students: Student[], filename = 'attendance_report.csv') {
  const rows = [
    ['Name', 'ID', 'Normal', 'Late', 'Absent', 'Score'],
    ...students.map(s => [s.name, s.id || '', s.normal, s.late, s.absent, s.score.toFixed(1)]),
  ];
  const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
  downloadText(csv, filename, 'text/csv');
}

export function exportTXT(students: Student[], config: AttendanceConfig, numSessions = 1, filename = 'attendance_report.txt') {
  const effectiveMax = config.maxScore * numSessions;
  const lines = [
    'ATTENDANCE REPORT',
    '=================',
    `Generated: ${new Date().toLocaleString()}`,
    `Sessions: ${numSessions}  |  Max Score: ${config.maxScore} × ${numSessions} = ${effectiveMax}`,
    `Formula: Score = ${effectiveMax} - (Late × ${config.latePenalty}) - (Absent × ${config.absentPenalty})`,
    '',
    `${'Name'.padEnd(30)} ${'ID'.padEnd(20)} ${'Norm'.padStart(5)} ${'Late'.padStart(5)} ${'Abs'.padStart(5)} ${'Score'.padStart(12)}`,
    '-'.repeat(80),
    ...students.map(s =>
      `${s.name.padEnd(30)} ${(s.id || '-').padEnd(20)} ${String(s.normal).padStart(5)} ${String(s.late).padStart(5)} ${String(s.absent).padStart(5)} ${(s.score.toFixed(1) + '/' + effectiveMax).padStart(12)}`
    ),
  ];
  downloadText(lines.join('\n'), filename, 'text/plain');
}

export async function exportPDF(students: Student[], config: AttendanceConfig, numSessions = 1, filename = 'attendance_report.pdf') {
  const effectiveMax = config.maxScore * numSessions;
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({ orientation: 'landscape' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('Attendance Report', 14, 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
  doc.text(`Sessions: ${numSessions}  |  Max Score: ${config.maxScore} × ${numSessions} = ${effectiveMax}`, 14, 37);
  doc.text(`Score = ${effectiveMax} − (Late × ${config.latePenalty}) − (Absent × ${config.absentPenalty})`, 14, 44);

  autoTable(doc, {
    startY: 52,
    head: [['Name', 'ID', 'Normal', 'Late', 'Absent', `Score /${effectiveMax}`]],
    body: students.map(s => [s.name, s.id || '—', s.normal, s.late, s.absent, s.score.toFixed(1)]),
    styles: { font: 'helvetica', fontSize: 9 },
    headStyles: { fillColor: [20, 20, 15], textColor: [232, 255, 71] },
    alternateRowStyles: { fillColor: [240, 240, 235] },
    columnStyles: {
      2: { halign: 'center' }, 3: { halign: 'center' },
      4: { halign: 'center' }, 5: { halign: 'right', fontStyle: 'bold' },
    },
  });

  doc.save(filename);
}

function downloadText(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
