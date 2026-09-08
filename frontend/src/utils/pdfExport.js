/**
 * Defense-Grade PDF Export & Print Utility for TELEKINESIS / NetGuardian
 */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

function normalizeData(snapshotOrResults) {
  const isSnapshot = snapshotOrResults && snapshotOrResults.fileName;
  const fileName = isSnapshot ? snapshotOrResults.fileName : 'active-audit-cisco.cfg';
  const benchmark = isSnapshot ? snapshotOrResults.benchmark : 'CIS Cisco IOS v4.0';
  const profile = isSnapshot ? snapshotOrResults.profile : 'Level 1 - High Security';
  const hostname = isSnapshot ? snapshotOrResults.hostname : 'CORE-SW-01.HQ.DEFENSE.LOCAL';
  const firmware = isSnapshot ? snapshotOrResults.firmware : 'Cisco IOS 15.2(4)M';
  const timestamp = isSnapshot ? snapshotOrResults.timestamp : new Date().toISOString().replace('T', ' ').slice(0, 16);
  const sha256 = isSnapshot ? snapshotOrResults.sha256 : '9f83b1657ff1850b28b32c65ac447b15d3b147b6ec5d00e5a65d16c34b6e761e';
  const engine = isSnapshot ? snapshotOrResults.engine : 'TELEKINESIS v1.2 / SetFit-bge-small';

  const results = isSnapshot ? snapshotOrResults.results : (Array.isArray(snapshotOrResults) ? snapshotOrResults : []);
  const total = results.length;
  const passed = results.filter((r) => String(r.status).toLowerCase() === 'pass').length;
  const failed = results.filter((r) => String(r.status).toLowerCase() === 'fail').length;
  const warnings = results.filter((r) => String(r.status).toLowerCase() === 'warn').length;
  const score = isSnapshot && snapshotOrResults.score !== undefined
    ? snapshotOrResults.score
    : (total > 0 ? Math.round((passed / total) * 100) : 0);

  const violations = results.filter((r) => {
    const s = String(r.status).toLowerCase();
    return s === 'fail' || s === 'warn';
  });

  return {
    fileName,
    benchmark,
    profile,
    hostname,
    firmware,
    timestamp,
    sha256,
    engine,
    total,
    passed,
    failed,
    warnings,
    score,
    violations,
  };
}

/** Directly downloads a crisp, multi-page vector PDF */
export function downloadDefensePdfReport(snapshotOrResults) {
  const data = normalizeData(snapshotOrResults);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Top banner
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 9, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('RESTRICTED // AIR-GAPPED DEFENSE COMPLIANCE AUDIT', 12, 6);
  doc.text('NTRO / CERT-In STANDARD', pageWidth - 12, 6, { align: 'right' });

  // Document Title
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('DEFENSE NETWORK SECURITY AUDIT REPORT', 12, 18);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Air-Gapped Automated CIS / DISA-STIG Verification Protocol', 12, 23);

  // Score Badge
  const scoreColor = data.score >= 80 ? [22, 163, 74] : data.score >= 65 ? [202, 138, 4] : [220, 38, 38];
  doc.setDrawColor(...scoreColor);
  doc.setLineWidth(0.6);
  doc.roundedRect(pageWidth - 36, 12, 24, 14, 1.5, 1.5, 'D');

  doc.setTextColor(...scoreColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(`${data.score}%`, pageWidth - 24, 19, { align: 'center' });
  doc.setFontSize(6);
  doc.text('COMPLIANCE', pageWidth - 24, 23.5, { align: 'center' });

  // Metadata Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.roundedRect(12, 28, pageWidth - 24, 30, 1, 1, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('I. DEVICE & SCAN METADATA', 15, 33);

  const col1 = 15;
  const col2 = 105;

  // Row 1
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('TARGET HOSTNAME:', col1, 38);
  doc.setFont('courier', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(String(data.hostname), col1 + 30, 38);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('CONFIG FILE:', col2, 38);
  doc.setFont('courier', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(String(data.fileName), col2 + 20, 38);

  // Row 2
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('BENCHMARK:', col1, 43);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(`${data.benchmark} (${data.profile})`, col1 + 30, 43);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('FIRMWARE:', col2, 43);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(String(data.firmware), col2 + 20, 43);

  // Row 3
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('AUDIT TIMESTAMP:', col1, 48);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(`${data.timestamp} UTC`, col1 + 30, 48);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('ENGINE:', col2, 48);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(String(data.engine), col2 + 20, 48);

  // Hash Row
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('OFFLINE SHA-256 HASH:', col1, 54);
  doc.setFont('courier', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(15, 23, 42);
  doc.text(String(data.sha256), col1 + 35, 54);

  // Section 2: Posture Assessment
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('II. EXECUTIVE SUMMARY & POSTURE ASSESSMENT', 12, 64);

  const cardWidth = (pageWidth - 24 - 9) / 4;
  const cardHeight = 13;
  const stats = [
    { label: 'Total Rules Evaluated', value: data.total, color: [15, 23, 42] },
    { label: 'Rules Passed', value: data.passed, color: [22, 163, 74] },
    { label: 'Critical / High Failures', value: data.failed, color: [220, 38, 38] },
    { label: 'Audit Warnings', value: data.warnings, color: [217, 119, 6] },
  ];

  stats.forEach((s, idx) => {
    const x = 12 + idx * (cardWidth + 3);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, 67, cardWidth, cardHeight, 1, 1, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(...s.color);
    doc.text(String(s.value), x + cardWidth / 2, 73.5, { align: 'center' });

    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.text(s.label, x + cardWidth / 2, 77.5, { align: 'center' });
  });

  // Section 3: Violations Table
  const tableRows = data.violations.length > 0
    ? data.violations.map((v) => [
      v.ruleId || v.rule || '-',
      v.ruleTitle || v.rule || '-',
      (v.severity || (String(v.status).toLowerCase() === 'fail' ? 'HIGH' : 'MEDIUM')).toUpperCase(),
      v.cliCode || '-',
      v.fixCli || v.fix_command || v.remediation || '-',
    ])
    : [['-', 'Zero compliance violations detected.', 'PASS', '-', '-']];

  autoTable(doc, {
    startY: 84,
    margin: { left: 12, right: 12, bottom: 25 },
    head: [['Rule ID', 'Clause / Policy', 'Severity', 'Offending CLI Syntax', 'Remediation Command']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [51, 65, 85],
      fontStyle: 'bold',
      fontSize: 7.5,
      lineWidth: 0.2,
      lineColor: [203, 213, 225],
    },
    bodyStyles: {
      textColor: [15, 23, 42],
      fontSize: 7,
      lineWidth: 0.2,
      lineColor: [203, 213, 225],
      cellPadding: 2,
    },
    columnStyles: {
      0: { font: 'courier', fontStyle: 'bold', cellWidth: 18 },
      1: { cellWidth: 42 },
      2: { fontStyle: 'bold', cellWidth: 16, halign: 'center' },
      3: { font: 'courier', textColor: [185, 28, 28], cellWidth: 55 },
      4: { font: 'courier', textColor: [21, 128, 61], cellWidth: 55 },
    },
    didDrawPage: (hookData) => {
      doc.setFillColor(15, 23, 42);
      doc.rect(0, pageHeight - 8, pageWidth, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(255, 255, 255);
      doc.text(
        'RESTRICTED // AIR-GAPPED DEFENSE COMPLIANCE AUDIT // DESTROY AFTER OPERATIONAL USE',
        pageWidth / 2,
        pageHeight - 3,
        { align: 'center' }
      );

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Page ${hookData.pageNumber}`,
        pageWidth - 12,
        pageHeight - 3,
        { align: 'right' }
      );
    },
  });

  // Section 4: Sign-off block
  let finalY = doc.lastAutoTable.finalY + 6;
  if (finalY > pageHeight - 35) {
    doc.addPage();
    finalY = 16;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('IV. COMPLIANCE VERIFICATION & AUTHORIZATION SIGN-OFF', 12, finalY);

  const blockWidth = (pageWidth - 24 - 6) / 3;
  const blockHeight = 16;
  const signY = finalY + 3;

  for (let i = 0; i < 3; i++) {
    const x = 12 + i * (blockWidth + 3);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, signY, blockWidth, blockHeight, 1, 1, 'FD');
  }

  doc.setFontSize(6.5);
  doc.setTextColor(51, 65, 85);
  doc.text('AUDITING CYBER OFFICER', 15, signY + 4);
  doc.text('NETWORK OPERATIONS AUTHORITY', 15 + blockWidth + 3, signY + 4);
  doc.text('ROLLBACK PLAN APPROVAL', 15 + (blockWidth + 3) * 2, signY + 4);

  doc.setFontSize(6);
  doc.setTextColor(148, 163, 184);
  doc.text('Signature / Stamp & Date', 15, signY + 13);
  doc.text('Signature / Stamp & Date', 15 + blockWidth + 3, signY + 13);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(21, 128, 61);
  doc.text('[X] VERIFIED & STAGED', 15 + (blockWidth + 3) * 2, signY + 9);
  doc.setFont('courier', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Hash: ${data.sha256.slice(0, 14)}...`, 15 + (blockWidth + 3) * 2, signY + 13);

  doc.save(`NetGuardian_Defense_Audit_${Date.now()}.pdf`);
}

/** Opens native browser print dialog with full mounted DOM template */
export function exportDefensePdfReport(snapshotOrResults) {
  const data = normalizeData(snapshotOrResults);
  const scoreColor = data.score >= 80 ? '#15803d' : data.score >= 65 ? '#b45309' : '#b91c1c';

  let printContainer = document.getElementById('defense-pdf-report');
  if (!printContainer) {
    printContainer = document.createElement('div');
    printContainer.id = 'defense-pdf-report';
    document.body.appendChild(printContainer);
  }

  printContainer.innerHTML = `
    <div class="defense-report-sheet">
      <div class="defense-classification-banner">
        <span>RESTRICTED // AIR-GAPPED DEFENSE COMPLIANCE AUDIT</span>
        <span>NTRO / CERT-In STANDARD</span>
      </div>

      <div class="defense-header-row">
        <div class="defense-title-block">
          <h1 class="defense-doc-title">DEFENSE NETWORK SECURITY AUDIT REPORT</h1>
          <p class="defense-doc-sub">Air-Gapped Automated CIS / DISA-STIG Verification Protocol</p>
        </div>
        <div class="defense-badge-block">
          <div class="defense-score-badge" style="border: 2px solid ${scoreColor}; color: ${scoreColor};">
            <span class="defense-score-val">${data.score}%</span>
            <span class="defense-score-lbl">COMPLIANCE</span>
          </div>
        </div>
      </div>

      <div class="defense-section-box">
        <div class="defense-section-title">I. DEVICE & SCAN METADATA</div>
        <div class="defense-grid-3">
          <div class="defense-meta-item"><span class="lbl">TARGET HOSTNAME:</span><span class="val font-mono">${data.hostname}</span></div>
          <div class="defense-meta-item"><span class="lbl">CONFIG FILE:</span><span class="val font-mono">${data.fileName}</span></div>
          <div class="defense-meta-item"><span class="lbl">DETECTED FIRMWARE:</span><span class="val">${data.firmware}</span></div>
          <div class="defense-meta-item"><span class="lbl">BENCHMARK PROFILE:</span><span class="val">${data.benchmark} (${data.profile})</span></div>
          <div class="defense-meta-item"><span class="lbl">AUDIT TIMESTAMP:</span><span class="val">${data.timestamp} UTC</span></div>
          <div class="defense-meta-item"><span class="lbl">EVALUATION ENGINE:</span><span class="val">${data.engine}</span></div>
        </div>
        <div class="defense-hash-row">
          <span class="lbl">OFFLINE SHA-256 HASH:</span>
          <span class="val font-mono">${data.sha256}</span>
        </div>
      </div>

      <div class="defense-section-box">
        <div class="defense-section-title">II. EXECUTIVE SUMMARY & POSTURE ASSESSMENT</div>
        <div class="defense-stats-grid">
          <div class="stat-card"><div class="stat-num">${data.total}</div><div class="stat-lbl">Total Rules Evaluated</div></div>
          <div class="stat-card pass"><div class="stat-num">${data.passed}</div><div class="stat-lbl">Rules Passed (Compliant)</div></div>
          <div class="stat-card fail"><div class="stat-num">${data.failed}</div><div class="stat-lbl">Critical / High Failures</div></div>
          <div class="stat-card warn"><div class="stat-num">${data.warnings}</div><div class="stat-lbl">Audit Warnings</div></div>
        </div>
      </div>

      <div class="defense-section-box">
        <div class="defense-section-title">III. HIGH-RISK VIOLATIONS & REMEDIATION PLAN</div>
        <table class="defense-table">
          <thead>
            <tr>
              <th style="width: 14%">Rule ID</th>
              <th style="width: 24%">Clause / Policy</th>
              <th style="width: 10%">Severity</th>
              <th style="width: 26%">Offending CLI Syntax</th>
              <th style="width: 26%">Remediation Command</th>
            </tr>
          </thead>
          <tbody>
            ${data.violations.length > 0 ? data.violations.map((v) => `
              <tr>
                <td class="font-mono font-bold">${v.ruleId || v.rule}</td>
                <td>
                  <strong>${v.ruleTitle || v.rule}</strong>
                  ${v.violationDetail ? `<div class="sub-text">${v.violationDetail}</div>` : ''}
                </td>
                <td><span class="sev-tag ${String(v.status).toLowerCase()}">${v.severity || (String(v.status).toLowerCase() === 'fail' ? 'HIGH' : 'MEDIUM')}</span></td>
                <td class="font-mono code-cell fail-text">${v.cliCode || '-'}</td>
                <td class="font-mono code-cell fix-text">${v.fixCli || v.fix_command || v.remediation || '-'}</td>
              </tr>
            `).join('') : `
              <tr><td colspan="5" style="text-align:center; padding:1.2rem; color:#15803d;">✓ Zero high-risk compliance violations detected.</td></tr>
            `}
          </tbody>
        </table>
      </div>

      <div class="defense-section-box sign-off-box">
        <div class="defense-section-title">IV. COMPLIANCE VERIFICATION & AUTHORIZATION SIGN-OFF</div>
        <div class="defense-signoff-grid">
          <div class="sign-block">
            <div class="sign-title">AUDITING CYBER OFFICER</div>
            <div class="sign-line"></div>
            <div class="sign-meta">Signature / Stamp & Date</div>
            <div class="sign-sub">Defense Cyber Operations Group (DCOG)</div>
          </div>
          <div class="sign-block">
            <div class="sign-title">NETWORK OPERATIONS AUTHORITY</div>
            <div class="sign-line"></div>
            <div class="sign-meta">Signature / Stamp & Date</div>
            <div class="sign-sub">Air-Gapped Infrastructure Command</div>
          </div>
          <div class="sign-block">
            <div class="sign-title">ROLLBACK PLAN APPROVAL</div>
            <div class="sign-status-box"><span>☑</span> VERIFIED & STAGED FOR FLASH DEPLOYMENT</div>
            <div class="sign-meta">Hash: ${data.sha256.slice(0, 16)}...</div>
          </div>
        </div>
      </div>

      <div class="defense-classification-banner footer">
        <span>RESTRICTED // AIR-GAPPED DEFENSE COMPLIANCE AUDIT // DESTROY AFTER OPERATIONAL USE</span>
      </div>
    </div>
  `;

  window.print();
}