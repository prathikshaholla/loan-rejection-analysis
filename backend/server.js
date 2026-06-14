import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { getDatabase } from './database.js';
import { analyzeRejection, matchLenders, auditFileQuality, generateBorrowerReport } from './services/llmService.js';
import { parsePdfText, generatePdfReport } from './services/pdfService.js';
import crypto from 'crypto';

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Setup Multer for in-memory file uploads
const storage = multer.memoryStorage();
const uploadInstance = multer({ storage: storage });
const uploadFields = uploadInstance.fields([
  { name: 'rejectionLetter', maxCount: 1 },
  { name: 'cibilReport', maxCount: 1 },
  { name: 'incomeDocs', maxCount: 1 }
]);

/**
 * Endpoint to retrieve all lenders in the database
 */
app.get('/api/lenders', async (req, res) => {
  try {
    const db = await getDatabase();
    const lenders = await db.all('SELECT * FROM lenders ORDER BY name ASC');
    res.json(lenders);
  } catch (error) {
    console.error('Error fetching lenders:', error);
    res.status(500).json({ error: 'Failed to fetch lenders list' });
  }
});

/**
 * Endpoint to retrieve application history
 */
app.get('/api/applications', async (req, res) => {
  try {
    const db = await getDatabase();
    const applications = await db.all('SELECT id, borrower_name, employment_type, cibil_score, monthly_income, loan_amount_requested, status, created_at FROM applications ORDER BY created_at DESC');
    res.json(applications);
  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json({ error: 'Failed to fetch application list' });
  }
});

/**
 * Endpoint to get details of a specific application
 */
app.get('/api/applications/:id', async (req, res) => {
  try {
    const db = await getDatabase();
    const appData = await db.get('SELECT * FROM applications WHERE id = ?', req.params.id);
    
    if (!appData) {
      return res.status(404).json({ error: 'Application not found' });
    }

    // Parse JSON fields
    const parsedData = {
      ...appData,
      rejection_analysis: JSON.parse(appData.rejection_analysis),
      file_quality_audit: JSON.parse(appData.file_quality_audit),
      matching_lenders: JSON.parse(appData.matching_lenders)
    };

    res.json(parsedData);
  } catch (error) {
    console.error('Error fetching application details:', error);
    res.status(500).json({ error: 'Failed to fetch application details' });
  }
});

/**
 * Endpoint to analyze loan applications (Main Core Workflow)
 */
app.post('/api/analyze', uploadFields, async (req, res) => {
  try {
    const db = await getDatabase();

    // 1. Gather text inputs
    const {
      borrower_name,
      pan,
      aadhaar,
      age,
      employment_type,
      cibil_score,
      monthly_income,
      existing_obligations,
      property_value,
      property_type,
      property_location,
      loan_amount_requested,
      loan_tenure_requested,
      apiKey // API Key optionally sent from frontend Settings
    } = req.body;

    const borrowerProfile = {
      borrower_name,
      pan: pan || '',
      aadhaar: aadhaar || '',
      age: parseInt(age) || 30,
      employment_type: employment_type || 'Salaried',
      cibil_score: parseInt(cibil_score) || 700,
      monthly_income: parseFloat(monthly_income) || 0,
      existing_obligations: parseFloat(existing_obligations) || 0,
      property_value: parseFloat(property_value) || 0,
      property_type: property_type || 'Residential',
      property_location: property_location || '',
      loan_amount_requested: parseFloat(loan_amount_requested) || 0,
      loan_tenure_requested: parseInt(loan_tenure_requested) || 15
    };

    // 2. Parse text from uploaded files (if any)
    let rejectionLetterText = '';
    let cibilReportText = '';

    if (req.files) {
      if (req.files.rejectionLetter) {
        const file = req.files.rejectionLetter[0];
        if (file.mimetype === 'application/pdf') {
          rejectionLetterText = await parsePdfText(file.buffer);
        } else {
          rejectionLetterText = file.buffer.toString('utf-8');
        }
      }
      
      if (req.files.cibilReport) {
        const file = req.files.cibilReport[0];
        if (file.mimetype === 'application/pdf') {
          cibilReportText = await parsePdfText(file.buffer);
        } else {
          cibilReportText = file.buffer.toString('utf-8');
        }
      }
    }

    // 3. Step 2 in Workflow: AI Rejection Analyzer
    const rejectionAnalysis = await analyzeRejection(borrowerProfile, rejectionLetterText, apiKey);

    // 4. Step 3 & 4 in Workflow: CIBIL & Income Evaluator & File Quality Scorer
    const fileQualityAudit = await auditFileQuality(borrowerProfile, rejectionLetterText, apiKey);

    // 5. Step 5 in Workflow: Bank Matching Engine (Programmatic Cutoff filtering first, then LLM ranking)
    // Query database for all lenders to filter
    const allLenders = await db.all('SELECT * FROM lenders');
    
    // Programmatic Pre-filtration to narrow down matching candidates
    let candidateLenders = allLenders.filter(lender => {
      // 1. CIBIL score within distance of cutoff (let's say score has to be at least cutoff - 60)
      if (borrowerProfile.cibil_score < lender.min_cibil - 60) return false;

      // 2. Property Type match
      const supportedProps = lender.supported_properties.split(',');
      if (borrowerProfile.property_type && !supportedProps.includes(borrowerProfile.property_type)) return false;

      // 3. Employment Type match
      const supportedEmps = lender.supported_employment.split(',');
      if (!supportedEmps.includes(borrowerProfile.employment_type)) return false;

      return true;
    });

    // If pre-filtration is too strict, default to all NBFCs/Lenders so the matching engine has options
    if (candidateLenders.length < 5) {
      candidateLenders = allLenders.filter(l => l.type === 'NBFC' || l.min_cibil <= borrowerProfile.cibil_score + 30);
    }

    // Rank matching lenders using AI Matching Agent
    const matchedLenders = await matchLenders(borrowerProfile, candidateLenders, rejectionAnalysis, apiKey);

    // 6. Step 6 in Workflow: Borrower Report Letter Generation
    const borrowerReportText = await generateBorrowerReport(borrowerProfile, rejectionAnalysis, matchedLenders, fileQualityAudit, apiKey);

    // 7. Save to Database
    const applicationId = crypto.randomUUID();
    await db.run(
      `INSERT INTO applications (
        id, borrower_name, pan, aadhaar, age, employment_type, cibil_score, 
        monthly_income, existing_obligations, property_value, property_type, 
        property_location, loan_amount_requested, loan_tenure_requested, 
        rejection_letter_text, rejection_analysis, file_quality_audit, 
        matching_lenders, borrower_report, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        applicationId,
        borrowerProfile.borrower_name,
        borrowerProfile.pan,
        borrowerProfile.aadhaar,
        borrowerProfile.age,
        borrowerProfile.employment_type,
        borrowerProfile.cibil_score,
        borrowerProfile.monthly_income,
        borrowerProfile.existing_obligations,
        borrowerProfile.property_value,
        borrowerProfile.property_type,
        borrowerProfile.property_location,
        borrowerProfile.loan_amount_requested,
        borrowerProfile.loan_tenure_requested,
        rejectionLetterText,
        JSON.stringify(rejectionAnalysis),
        JSON.stringify(fileQualityAudit),
        JSON.stringify(matchedLenders),
        borrowerReportText,
        'Analyzed' // Initial status after run
      ]
    );

    res.json({
      applicationId,
      rejectionAnalysis,
      fileQualityAudit,
      matchedLenders,
      borrowerReportText
    });

  } catch (error) {
    console.error('Error during loan analysis workflow:', error);
    res.status(500).json({ error: 'An error occurred during application analysis. Please check your inputs and try again.' });
  }
});

/**
 * Endpoint to download generated PDF report
 */
app.get('/api/applications/:id/report', async (req, res) => {
  try {
    const db = await getDatabase();
    const appData = await db.get('SELECT * FROM applications WHERE id = ?', req.params.id);
    
    if (!appData) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const borrowerProfile = {
      borrower_name: appData.borrower_name,
      cibil_score: appData.cibil_score,
      employment_type: appData.employment_type,
      monthly_income: appData.monthly_income,
      existing_obligations: appData.existing_obligations,
      loan_amount_requested: appData.loan_amount_requested,
      property_value: appData.property_value,
      property_type: appData.property_type
    };

    const rejectionAnalysis = JSON.parse(appData.rejection_analysis);
    const fileAudit = JSON.parse(appData.file_quality_audit);
    const matchedLenders = JSON.parse(appData.matching_lenders);
    const reportText = appData.borrower_report;

    const pdfBuffer = await generatePdfReport(
      borrowerProfile,
      rejectionAnalysis,
      matchedLenders,
      fileAudit,
      reportText
    );

    res.contentType('application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Loan_Resubmission_Report_${appData.borrower_name.replace(/\s+/g, '_')}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating PDF report:', error);
    res.status(500).json({ error: 'Failed to generate PDF report' });
  }
});

/**
 * Endpoint to update status (e.g. mark as re-submitted)
 */
app.post('/api/applications/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const db = await getDatabase();
    const result = await db.run('UPDATE applications SET status = ? WHERE id = ?', [status, req.params.id]);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    res.json({ success: true, message: `Application status updated to ${status}` });
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ error: 'Failed to update application status' });
  }
});

app.listen(port, () => {
  console.log(`Loan Analysis Server running on port ${port}`);
});
