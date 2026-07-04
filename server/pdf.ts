import PDFDocument from 'pdfkit';
import { CompanyResearchResult } from '../src/types';

/**
 * Generate a highly polished, professional PDF report of the researched company.
 */
export function generateCompanyReportPdf(data: CompanyResearchResult): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      // Create A4 PDF Document
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 40, bottom: 40, left: 45, right: 45 },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      // Colors
      const slateDark = '#0F172A'; // Slate 900
      const goldAccent = '#D97706'; // Dark Amber/Gold
      const textMain = '#1E293B'; // Slate 800
      const textMuted = '#64748B'; // Slate 500
      const lightBg = '#F8FAFC'; // Slate 50
      const borderLine = '#E2E8F0'; // Slate 200

      // --- PAGE HEADER BLOCK ---
      // Draw solid header rectangle
      const headerHeight = 75;
      doc.rect(45, 40, 505, headerHeight).fill(slateDark);

      // Header Labels
      doc.fillColor('#EAB308') // Gold yellow
         .font('Helvetica-Bold')
         .fontSize(9)
         .text('RELU CONSULTANCY · COMPANY RESEARCH REPORT', 60, 52, { characterSpacing: 1.5 });

      // Company Name
      doc.fillColor('#FFFFFF')
         .font('Helvetica-Bold')
         .fontSize(22)
         .text(data.companyName, 60, 70);

      let currentY = 40 + headerHeight + 25;

      // Check page overflow helper
      const checkSpace = (neededSpace: number) => {
        if (currentY + neededSpace > doc.page.height - 40) {
          doc.addPage();
          currentY = 40;
        }
      };

      // --- COMPANY INFORMATION ---
      checkSpace(110);
      doc.fillColor(goldAccent)
         .font('Helvetica-Bold')
         .fontSize(11)
         .text('COMPANY INFORMATION', 45, currentY);
      
      currentY += 14;
      doc.strokeColor(borderLine).lineWidth(1).moveTo(45, currentY).lineTo(550, currentY).stroke();
      currentY += 10;

      // Info container box
      const boxHeight = 65;
      doc.rect(45, currentY, 505, boxHeight).fill(lightBg);

      doc.fillColor(textMain).font('Helvetica-Bold').fontSize(10);
      doc.text('Website', 60, currentY + 10, { width: 100 });
      doc.text('Phone', 60, currentY + 28, { width: 100 });
      doc.text('Address', 60, currentY + 46, { width: 100 });

      doc.font('Helvetica').fillColor(goldAccent);
      doc.text(data.website || 'Not publicly listed', 160, currentY + 10);
      doc.fillColor(textMain);
      doc.text(data.phone || 'Not publicly listed', 160, currentY + 28);
      doc.text(data.address || 'Not publicly listed', 160, currentY + 46);

      currentY += boxHeight + 25;

      // --- PRODUCTS & SERVICES ---
      checkSpace(120);
      doc.fillColor(goldAccent)
         .font('Helvetica-Bold')
         .fontSize(11)
         .text('PRODUCTS & SERVICES', 45, currentY);

      currentY += 14;
      doc.strokeColor(borderLine).lineWidth(1).moveTo(45, currentY).lineTo(550, currentY).stroke();
      currentY += 10;

      doc.fillColor(textMain).font('Helvetica').fontSize(10);
      if (data.products && data.products.length > 0) {
        for (const prod of data.products) {
          checkSpace(20);
          doc.text(`•  ${prod}`, 60, currentY, { lineGap: 4 });
          currentY += 18;
        }
      } else {
        doc.text('No detailed product information collected.', 60, currentY);
        currentY += 18;
      }
      currentY += 15;

      // --- AI-GENERATED PAIN POINTS ---
      checkSpace(120);
      doc.fillColor(goldAccent)
         .font('Helvetica-Bold')
         .fontSize(11)
         .text('AI-GENERATED PAIN POINTS', 45, currentY);

      currentY += 14;
      doc.strokeColor(borderLine).lineWidth(1).moveTo(45, currentY).lineTo(550, currentY).stroke();
      currentY += 10;

      doc.fillColor(textMain).font('Helvetica').fontSize(10);
      if (data.painPoints && data.painPoints.length > 0) {
        for (const point of data.painPoints) {
          checkSpace(35);
          // Highlight the first part if it has a colon
          const colonIndex = point.indexOf(':');
          if (colonIndex > -1) {
            const boldPart = point.substring(0, colonIndex + 1);
            const regularPart = point.substring(colonIndex + 1);
            
            doc.font('Helvetica-Bold').text('•  ' + boldPart, 60, currentY, { continued: true });
            doc.font('Helvetica').text(regularPart, { lineGap: 4 });
          } else {
            doc.text('•  ' + point, 60, currentY, { lineGap: 4 });
          }
          currentY += 26;
        }
      } else {
        doc.text('No specific business pain points identified.', 60, currentY);
        currentY += 18;
      }
      currentY += 15;

      // --- COMPETITORS ---
      checkSpace(120);
      doc.fillColor(goldAccent)
         .font('Helvetica-Bold')
         .fontSize(11)
         .text('COMPETITORS', 45, currentY);

      currentY += 14;
      doc.strokeColor(borderLine).lineWidth(1).moveTo(45, currentY).lineTo(550, currentY).stroke();
      currentY += 10;

      if (data.competitors && data.competitors.length > 0) {
        for (const comp of data.competitors) {
          checkSpace(25);
          doc.fillColor(textMain).font('Helvetica-Bold').fontSize(10).text(comp.name, 60, currentY, { continued: true });
          doc.fillColor(goldAccent).font('Helvetica').fontSize(10).text(`     ${comp.website || ''}`, 200, currentY);
          currentY += 18;
        }
      } else {
        doc.fillColor(textMain).font('Helvetica').fontSize(10).text('No competitors analyzed or available.', 60, currentY);
        currentY += 18;
      }

      // Finalize document
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
