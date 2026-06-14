import pdfParse from 'pdf-parse';
import PDFDocument from 'pdfkit';

/**
 * Parses the text content of a PDF file buffer.
 */
export async function parsePdfText(fileBuffer) {
  try {
    const data = await pdfParse(fileBuffer);
    return data.text || '';
  } catch (error) {
    console.error('Error parsing PDF text:', error);
    return '';
  }
}

/**
 * Generates a beautiful PDF report using PDFKit.
 * Returns a Promise that resolves to a PDF Buffer.
 */
export function generatePdfReport(borrowerProfile, rejectionAnalysis, matchedLenders, fileAudit, reportText) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers = [];
      
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      // Colors
      const primaryColor = '#1A365D'; // Dark blue
      const secondaryColor = '#2B6CB0'; // Slate blue
      const accentGreen = '#2F855A'; // Forest green
      const lightBg = '#F7FAFC'; // Light grey/blue
      const darkText = '#2D3748';
      const borderGrey = '#E2E8F0';

      // Header Block
      doc.rect(0, 0, 595.28, 120).fill(primaryColor);
      doc.fillColor('#FFFFFF')
         .fontSize(22)
         .font('Helvetica-Bold')
         .text('AI-POWERED LOAN ANALYSIS SYSTEM', 50, 40)
         .fontSize(12)
         .font('Helvetica')
         .text('Restructured Loan Eligibility & Re-Submission Advisory Report', 50, 70);

      // Footer
      let pageNumber = 1;
      doc.on('page', () => {
        pageNumber++;
        addFooter(doc, pageNumber);
      });
      
      // Document Metadata info block
      doc.fillColor(darkText)
         .fontSize(14)
         .font('Helvetica-Bold')
         .text('BORROWER PROFILE & CASE METRICS', 50, 150);

      doc.rect(50, 170, 495.28, 70).fill(lightBg);
      
      doc.fillColor(darkText)
         .fontSize(9)
         .font('Helvetica-Bold');
      
      // Grid elements
      doc.text('Borrower Name:', 60, 180).font('Helvetica').text(borrowerProfile.borrower_name, 150, 180);
      doc.font('Helvetica-Bold').text('CIBIL Score:', 60, 195).font('Helvetica').text(`${borrowerProfile.cibil_score}`, 150, 195);
      doc.font('Helvetica-Bold').text('Employment:', 60, 210).font('Helvetica').text(borrowerProfile.employment_type, 150, 210);
      
      doc.font('Helvetica-Bold').text('Requested Loan:', 280, 180).font('Helvetica').text(`INR ${Number(borrowerProfile.loan_amount_requested).toLocaleString('en-IN')}`, 370, 180);
      doc.font('Helvetica-Bold').text('Monthly Income:', 280, 195).font('Helvetica').text(`INR ${Number(borrowerProfile.monthly_income).toLocaleString('en-IN')}`, 370, 195);
      doc.font('Helvetica-Bold').text('Existing EMIs:', 280, 210).font('Helvetica').text(`INR ${Number(borrowerProfile.existing_obligations).toLocaleString('en-IN')}`, 370, 210);

      // Rejection Analysis Section
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .text('REJECTION REASON ANALYSIS', 50, 265);

      doc.fontSize(10)
         .font('Helvetica-Bold')
         .text('Primary Reason:', 50, 285)
         .font('Helvetica')
         .fillColor('#C53030') // Red for primary rejection
         .text(rejectionAnalysis.primary_reason, 140, 285, { width: 400 });

      doc.fillColor(darkText)
         .font('Helvetica-Bold')
         .text('Secondary Contributing Factors:', 50, 315);
      
      let y = 330;
      rejectionAnalysis.contributing_factors.forEach(factor => {
        doc.font('Helvetica').text(`• ${factor}`, 65, y, { width: 480 });
        y += doc.heightOfString(`• ${factor}`, { width: 480 }) + 5;
      });

      // Credit & Income Audit
      y += 10;
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .text('CREDIT & INCOME GAP EVALUATION', 50, y);
      
      y += 20;
      doc.rect(50, y, 495.28, 55).fill(lightBg);
      doc.fillColor(darkText);

      doc.fontSize(10).font('Helvetica-Bold').text('CIBIL Audit:', 60, y + 10)
         .font('Helvetica').text(rejectionAnalysis.cibil_assessment, 140, y + 10, { width: 390 });
      
      doc.fontSize(10).font('Helvetica-Bold').text('Income Gap:', 60, y + 30)
         .font('Helvetica').text(rejectionAnalysis.income_gap, 140, y + 30, { width: 390 });

      // File Quality Scorecard
      y += 75;
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .text('FILE QUALITY AUDIT', 50, y);
      
      // Score badge
      const score = fileAudit.file_presentation_score;
      const badgeColor = score > 80 ? accentGreen : score > 50 ? '#D69E2E' : '#C53030';
      
      doc.save();
      doc.rect(420, y - 5, 125, 45).fill(lightBg);
      doc.rect(425, y, 115, 5).fill(badgeColor);
      doc.fillColor(darkText).fontSize(8).font('Helvetica-Bold').text('PRESENTATION SCORE', 432, y + 12);
      doc.fontSize(16).fillColor(badgeColor).text(`${score}/100`, 468, y + 23);
      doc.restore();

      y += 20;
      doc.fontSize(10).font('Helvetica-Bold').text('Data Consistency:', 50, y)
         .font('Helvetica').text(fileAudit.data_consistency, 150, y, { width: 260 });
      
      y += doc.heightOfString(fileAudit.data_consistency, { width: 260 }) + 10;
      
      doc.font('Helvetica-Bold').text('Critical Corrections Checklist:', 50, y);
      y += 15;
      fileAudit.critical_corrections.forEach(correction => {
        doc.font('Helvetica').text(`[ ]  ${correction}`, 65, y, { width: 480 });
        y += doc.heightOfString(`[ ]  ${correction}`, { width: 480 }) + 5;
      });

      // Page break for Lenders & Advisory Letter
      doc.addPage();
      
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .text('BANK & NBFC MATCHING MATRIX', 50, 50);

      doc.fontSize(9)
         .font('Helvetica')
         .text('The following lenders have been selected and ranked based on their compatibility with your financial profile, CIBIL standing, and property type.', 50, 70);

      // Table Header
      let tableY = 95;
      doc.rect(50, tableY, 495.28, 20).fill(primaryColor);
      doc.fillColor('#FFFFFF').font('Helvetica-Bold');
      doc.text('Lender Name', 60, tableY + 6, { width: 180 });
      doc.text('Type', 250, tableY + 6, { width: 70 });
      doc.text('Approval Prob.', 330, tableY + 6, { width: 90 });
      doc.text('Key Advantage', 420, tableY + 6, { width: 115 });

      tableY += 20;
      matchedLenders.forEach((lender, index) => {
        // Alternate row background
        if (index % 2 === 0) {
          doc.rect(50, tableY, 495.28, 45).fill('#F7FAFC');
        } else {
          doc.rect(50, tableY, 495.28, 45).fill('#FFFFFF');
        }
        
        doc.fillColor(darkText).font('Helvetica-Bold');
        doc.text(lender.name, 60, tableY + 10, { width: 180 });
        
        doc.font('Helvetica');
        doc.text(lender.type, 250, tableY + 10, { width: 70 });
        
        // Probability color
        const probColor = lender.approval_probability > 80 ? accentGreen : lender.approval_probability > 60 ? '#D69E2E' : '#C53030';
        doc.fillColor(probColor).font('Helvetica-Bold');
        doc.text(`${lender.approval_probability}%`, 330, tableY + 10, { width: 90 });
        
        doc.fillColor(darkText).font('Helvetica');
        const adv = lender.match_points?.[0] || 'Standard guidelines';
        doc.text(adv, 420, tableY + 10, { width: 115, height: 30 });
        
        tableY += 45;
      });

      // Advisory Letter
      tableY += 15;
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .fillColor(primaryColor)
         .text('OFFICIAL ADVISORY NOTE', 50, tableY);
      
      tableY += 20;
      doc.fontSize(9)
         .font('Helvetica')
         .fillColor(darkText)
         .text(reportText, 50, tableY, { width: 495.28, align: 'justify', lineGap: 3 });

      // Sign-off
      addFooter(doc, 1);
      doc.end();

    } catch (error) {
      reject(error);
    }
  });
}

function addFooter(doc, page) {
  doc.save();
  doc.strokeColor('#E2E8F0').lineWidth(0.5).moveTo(50, 790).lineTo(545, 790).stroke();
  doc.fillColor('#A0AEC0')
     .fontSize(8)
     .font('Helvetica')
     .text('Confidential - AI Loan Analysis Advisory Report', 50, 798)
     .text(`Page ${page}`, 500, 798);
  doc.restore();
}
