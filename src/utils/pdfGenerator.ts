import { getTranslations } from '../i18n/i18n';
import { UserNode } from '../model/user';
import { calculateGhostScore } from './ghostScore';

export const generateHealthReportPDF = async (
  nonFollowers: readonly UserNode[],
  whitelisted: readonly UserNode[],
  t: any,
): Promise<void> => {
  if (typeof t === 'function') {
    t = getTranslations();
  }
  const [{ jsPDF }, { default: autoTable }, { default: Chart }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
    import('chart.js/auto'),
  ]);

  const doc = new jsPDF();
  const dateStr = new Date().toLocaleDateString();

  let bots = 0;
  let ghosts = 0;
  let suspicious = 0;
  let safe = 0;

  const analyzedUsers = nonFollowers.map(user => {
    const analysis = calculateGhostScore(user, t);
    if (analysis.level === 'bot') {
      bots++;
    } else if (analysis.level === 'ghost') {
      ghosts++;
    } else if (analysis.level === 'suspicious') {
      suspicious++;
    } else {
      safe++;
    }
    return { user, analysis };
  });

  analyzedUsers.sort((a, b) => b.analysis.score - a.analysis.score);

  // --- Donut chart ---
  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 400;
  canvas.style.position = 'absolute';
  canvas.style.left = '-9999px';
  document.body.appendChild(canvas);

  let chartImageBase64 = '';

  try {
    const chart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: [
          (t.healthSafe || 'Safe').replace(':', ''),
          (t.healthSuspicious || 'Suspicious').replace(':', ''),
          (t.healthGhosts || 'Ghosts').replace(':', ''),
          (t.healthBots || 'Bots').replace(':', ''),
        ],
        datasets: [
          {
            data: [safe, suspicious, ghosts, bots],
            backgroundColor: ['#4ade80', '#fbbf24', '#f87171', '#ef4444'],
            borderWidth: 0,
          },
        ],
      },
      options: {
        animation: false,
        responsive: false,
        cutout: '65%',
        plugins: {
          legend: {
            position: 'right',
            labels: { font: { size: 12 }, boxWidth: 12, padding: 10 },
          },
        },
      },
    });
    chartImageBase64 = chart.toBase64Image();
    chart.destroy();
  } finally {
    canvas.parentNode?.removeChild(canvas);
  }

  // --- Cálculos de salud ---
  const totalRisky = bots + ghosts + Math.round(suspicious * 0.5);
  const riskyPercentage =
    nonFollowers.length > 0 ? Math.round((totalRisky / nonFollowers.length) * 100) : 0;
  const healthScore = 100 - riskyPercentage;

  let healthMessage: string;
  let healthColor: [number, number, number] = [34, 197, 94];

  if (nonFollowers.length === 0) {
    healthMessage = t.pdfMsgNoData || 'No data available.';
    healthColor = [59, 130, 246]; // Azul
  } else if (riskyPercentage > 30) {
    healthMessage =
      typeof t.pdfMsgWarning === 'function'
        ? t.pdfMsgWarning(riskyPercentage)
        : `Warning: ${riskyPercentage}% of users show bot/ghost activity.`;
    healthColor = [239, 68, 68]; // Rojo
  } else {
    healthMessage =
      typeof t.pdfMsgHealthy === 'function'
        ? t.pdfMsgHealthy(riskyPercentage)
        : `Your account is healthy (${riskyPercentage}% ghost accounts).`;
    healthColor = [34, 197, 94]; // Verde
  }

  // --- CABECERA ---
  doc.setFontSize(20);
  doc.setTextColor(6, 182, 212);
  doc.text(t.pdfTitle || 'Instagram Community Health Report', 14, 20);

  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(`${t.generated || 'Generated:'} ${dateStr}`, 14, 27);
  doc.text('Instagram Unfollowers PRO', 14, 32);

  // --- RESUMEN ---
  doc.setFontSize(13);
  doc.setTextColor(0, 0, 0);
  doc.text(t.accountOverview || 'Account Overview', 14, 44);

  doc.setFontSize(10);
  doc.setTextColor(40, 40, 40);
  doc.text(`${t.nonFollowersAnalyzed || 'Analyzed:'} ${nonFollowers.length}`, 14, 52);
  doc.text(`${t.protectedWhitelist || 'Protected:'} ${whitelisted.length}`, 14, 58);
  doc.text(
    `${t.healthSafe || 'Safe:'} ${safe}  |  ${t.healthSuspicious || 'Suspicious:'} ${suspicious}  |  ${t.healthGhosts || 'Ghosts:'} ${ghosts}  |  ${t.healthBots || 'Bots:'} ${bots}`,
    14,
    64,
  );

  // --- DONUT ---
  doc.addImage(chartImageBase64, 'PNG', 110, 16, 85, 85);

  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...healthColor);
  doc.text(`${healthScore}%`, 137, 62, { align: 'center' });

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(t.healthWord || 'HEALTH', 137, 68, { align: 'center' });

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...healthColor);
  const wrappedMsg = doc.splitTextToSize(healthMessage, 85);
  doc.text(wrappedMsg, 152, 106, { align: 'center' });

  // --- TABLA ---
  const tableData = analyzedUsers.map(item => [
    `@${item.user.username}`,
    item.analysis.score.toString(),
    item.analysis.level.toUpperCase(),
    item.analysis.reasons.join(', ') || 'N/A', // Por si falla alguna razón
  ]);

  autoTable(doc, {
    startY: 118,
    head: [
      [
        t.pdfTableUsername || 'Username',
        t.pdfTableScore || 'Score',
        t.pdfTableLevel || 'Level',
        t.pdfTableFlags || 'Flags',
      ],
    ],
    body: tableData,
    headStyles: { fillColor: [6, 182, 212], fontSize: 9 },
    alternateRowStyles: { fillColor: [241, 245, 249] },
    styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
    columnStyles: {
      0: { cellWidth: 38 },
      1: { cellWidth: 14, halign: 'center' },
      2: { cellWidth: 22, halign: 'center' },
      3: { cellWidth: 'auto' },
    },
    margin: { left: 14, right: 14 },
  });

  const filename = `IG_Health_Report_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
};
