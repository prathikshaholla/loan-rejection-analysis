import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'loan_analysis.db');

let db = null;

export async function getDatabase() {
  if (db) return db;

  db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  await initDatabase(db);
  return db;
}

async function initDatabase(database) {
  // Create tables
  await database.exec(`
    CREATE TABLE IF NOT EXISTS lenders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL, -- PSU, Private, NBFC
      min_cibil INTEGER NOT NULL,
      min_income REAL NOT NULL, -- monthly salary / income in INR
      max_ltv REAL NOT NULL, -- e.g. 0.85 (85%)
      interest_rate_min REAL NOT NULL,
      interest_rate_max REAL NOT NULL,
      processing_time_days INTEGER NOT NULL,
      supported_employment TEXT NOT NULL, -- comma-separated e.g. "Salaried,Self-Employed,Business"
      supported_properties TEXT NOT NULL, -- comma-separated e.g. "Residential,Commercial,Plot"
      max_loan_amount REAL NOT NULL,
      risk_flags TEXT -- comma-separated warnings/conditions
    );

    CREATE TABLE IF NOT EXISTS applications (
      id TEXT PRIMARY KEY,
      borrower_name TEXT NOT NULL,
      pan TEXT,
      aadhaar TEXT,
      age INTEGER NOT NULL,
      employment_type TEXT NOT NULL,
      cibil_score INTEGER NOT NULL,
      monthly_income REAL NOT NULL,
      existing_obligations REAL NOT NULL,
      property_value REAL,
      property_type TEXT,
      property_location TEXT,
      loan_amount_requested REAL NOT NULL,
      loan_tenure_requested INTEGER NOT NULL,
      rejection_letter_text TEXT,
      rejection_analysis TEXT, -- JSON string
      file_quality_audit TEXT, -- JSON string
      matching_lenders TEXT, -- JSON string
      borrower_report TEXT, -- HTML / formatted report text
      status TEXT NOT NULL, -- "Draft", "Analyzed", "Re-Submitted"
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed lenders if empty
  const count = await database.get('SELECT COUNT(*) as count FROM lenders');
  if (count.count === 0) {
    console.log('Seeding lender database with 50+ lenders...');
    const lendersSeed = [
      // PSU Banks (typically low rates, high CIBIL requirements, longer processing)
      { name: "State Bank of India (SBI)", type: "PSU", min_cibil: 740, min_income: 25000, max_ltv: 0.85, interest_rate_min: 8.40, interest_rate_max: 9.10, processing_time_days: 15, supported_employment: "Salaried,Self-Employed", supported_properties: "Residential,Plot", max_loan_amount: 100000000, risk_flags: "Strict income documentation,Lengthy verification process" },
      { name: "Bank of Baroda (BoB)", type: "PSU", min_cibil: 720, min_income: 20000, max_ltv: 0.85, interest_rate_min: 8.50, interest_rate_max: 9.30, processing_time_days: 12, supported_employment: "Salaried,Self-Employed,Business", supported_properties: "Residential,Commercial,Plot", max_loan_amount: 75000000, risk_flags: "Requires clean property chain" },
      { name: "Punjab National Bank (PNB)", type: "PSU", min_cibil: 720, min_income: 20000, max_ltv: 0.80, interest_rate_min: 8.60, interest_rate_max: 9.45, processing_time_days: 14, supported_employment: "Salaried,Self-Employed", supported_properties: "Residential,Plot", max_loan_amount: 50000000, risk_flags: "Frequent physical verification needed" },
      { name: "Canara Bank", type: "PSU", min_cibil: 730, min_income: 22000, max_ltv: 0.80, interest_rate_min: 8.55, interest_rate_max: 9.40, processing_time_days: 12, supported_employment: "Salaried,Self-Employed,Business", supported_properties: "Residential,Commercial", max_loan_amount: 60000000, risk_flags: "Strict property valuation checks" },
      { name: "Union Bank of India", type: "PSU", min_cibil: 710, min_income: 18000, max_ltv: 0.85, interest_rate_min: 8.60, interest_rate_max: 9.50, processing_time_days: 13, supported_employment: "Salaried,Self-Employed,Business", supported_properties: "Residential,Commercial,Plot", max_loan_amount: 75000000, risk_flags: "Average digital execution" },
      { name: "Indian Bank", type: "PSU", min_cibil: 715, min_income: 18000, max_ltv: 0.80, interest_rate_min: 8.65, interest_rate_max: 9.60, processing_time_days: 14, supported_employment: "Salaried,Self-Employed", supported_properties: "Residential,Plot", max_loan_amount: 40000000, risk_flags: "Paperwork heavy" },
      { name: "Bank of India", type: "PSU", min_cibil: 700, min_income: 18000, max_ltv: 0.80, interest_rate_min: 8.70, interest_rate_max: 9.75, processing_time_days: 13, supported_employment: "Salaried,Self-Employed,Business", supported_properties: "Residential,Commercial", max_loan_amount: 50000000, risk_flags: "Requires high collateral coverage" },
      { name: "Central Bank of India", type: "PSU", min_cibil: 700, min_income: 15000, max_ltv: 0.80, interest_rate_min: 8.75, interest_rate_max: 9.90, processing_time_days: 15, supported_employment: "Salaried,Self-Employed", supported_properties: "Residential", max_loan_amount: 30000000, risk_flags: "Slow turnaround times" },
      { name: "Indian Overseas Bank", type: "PSU", min_cibil: 700, min_income: 15000, max_ltv: 0.75, interest_rate_min: 8.80, interest_rate_max: 9.95, processing_time_days: 15, supported_employment: "Salaried,Business", supported_properties: "Residential", max_loan_amount: 30000000, risk_flags: "Limited geographical support" },
      { name: "UCO Bank", type: "PSU", min_cibil: 720, min_income: 18000, max_ltv: 0.80, interest_rate_min: 8.70, interest_rate_max: 9.80, processing_time_days: 14, supported_employment: "Salaried,Self-Employed", supported_properties: "Residential", max_loan_amount: 25000000, risk_flags: "Restrictive criteria for self-employed" },
      { name: "Bank of Maharashtra", type: "PSU", min_cibil: 710, min_income: 16000, max_ltv: 0.80, interest_rate_min: 8.65, interest_rate_max: 9.70, processing_time_days: 12, supported_employment: "Salaried,Self-Employed,Business", supported_properties: "Residential,Plot", max_loan_amount: 20000000, risk_flags: "Requires local guarantor sometimes" },

      // Private Banks (Medium-high rates, moderate CIBIL, fast processing, tech-driven)
      { name: "HDFC Bank", type: "Private", min_cibil: 720, min_income: 30000, max_ltv: 0.80, interest_rate_min: 8.65, interest_rate_max: 9.50, processing_time_days: 5, supported_employment: "Salaried,Self-Employed,Business", supported_properties: "Residential,Commercial,Plot", max_loan_amount: 150000000, risk_flags: "Strict checks on cash income,Requires formal bank statements" },
      { name: "ICICI Bank", type: "Private", min_cibil: 700, min_income: 25000, max_ltv: 0.80, interest_rate_min: 8.70, interest_rate_max: 9.60, processing_time_days: 6, supported_employment: "Salaried,Self-Employed,Business", supported_properties: "Residential,Commercial,Plot", max_loan_amount: 120000000, risk_flags: "Verifies internal negative area lists" },
      { name: "Axis Bank", type: "Private", min_cibil: 700, min_income: 25000, max_ltv: 0.80, interest_rate_min: 8.75, interest_rate_max: 9.75, processing_time_days: 6, supported_employment: "Salaried,Self-Employed,Business", supported_properties: "Residential,Commercial", max_loan_amount: 100000000, risk_flags: "Strict boundary mapping for agricultural lands" },
      { name: "Kotak Mahindra Bank", type: "Private", min_cibil: 730, min_income: 35000, max_ltv: 0.80, interest_rate_min: 8.60, interest_rate_max: 9.35, processing_time_days: 5, supported_employment: "Salaried,Self-Employed", supported_properties: "Residential,Commercial", max_loan_amount: 80000000, risk_flags: "Prefers high-salaried corporate employees" },
      { name: "IndusInd Bank", type: "Private", min_cibil: 680, min_income: 20000, max_ltv: 0.80, interest_rate_min: 8.85, interest_rate_max: 10.50, processing_time_days: 7, supported_employment: "Salaried,Self-Employed,Business", supported_properties: "Residential,Commercial,Plot", max_loan_amount: 75000000, risk_flags: "High processing fees,Strict on past dues" },
      { name: "Yes Bank", type: "Private", min_cibil: 690, min_income: 25000, max_ltv: 0.75, interest_rate_min: 8.95, interest_rate_max: 10.95, processing_time_days: 7, supported_employment: "Salaried,Self-Employed,Business", supported_properties: "Residential,Commercial", max_loan_amount: 50000000, risk_flags: "Conservative property valuation margins" },
      { name: "IDFC First Bank", type: "Private", min_cibil: 680, min_income: 22000, max_ltv: 0.85, interest_rate_min: 8.85, interest_rate_max: 11.50, processing_time_days: 5, supported_employment: "Salaried,Self-Employed,Business", supported_properties: "Residential,Commercial,Plot", max_loan_amount: 60000000, risk_flags: "Higher rate of interest for lower credit tiers" },
      { name: "Federal Bank", type: "Private", min_cibil: 700, min_income: 20000, max_ltv: 0.80, interest_rate_min: 8.80, interest_rate_max: 9.80, processing_time_days: 8, supported_employment: "Salaried,Self-Employed", supported_properties: "Residential,Plot", max_loan_amount: 40000000, risk_flags: "Slow legal audit" },
      { name: "South Indian Bank", type: "Private", min_cibil: 700, min_income: 18000, max_ltv: 0.80, interest_rate_min: 8.90, interest_rate_max: 10.00, processing_time_days: 9, supported_employment: "Salaried,Self-Employed,Business", supported_properties: "Residential", max_loan_amount: 30000000, risk_flags: "Prefers South India based properties" },
      { name: "Karur Vysya Bank", type: "Private", min_cibil: 710, min_income: 18000, max_ltv: 0.80, interest_rate_min: 8.85, interest_rate_max: 10.10, processing_time_days: 8, supported_employment: "Salaried,Self-Employed,Business", supported_properties: "Residential,Commercial", max_loan_amount: 30000000, risk_flags: "Strict CIBIL validation" },
      { name: "Karnataka Bank", type: "Private", min_cibil: 700, min_income: 18000, max_ltv: 0.75, interest_rate_min: 8.90, interest_rate_max: 10.25, processing_time_days: 10, supported_employment: "Salaried,Self-Employed,Business", supported_properties: "Residential", max_loan_amount: 25000000, risk_flags: "Requires clean repayment records" },
      { name: "Bandhan Bank", type: "Private", min_cibil: 650, min_income: 15000, max_ltv: 0.80, interest_rate_min: 9.15, interest_rate_max: 12.00, processing_time_days: 8, supported_employment: "Salaried,Self-Employed,Business", supported_properties: "Residential", max_loan_amount: 20000000, risk_flags: "High interest rates for lower CIBIL segments" },
      { name: "RBL Bank", type: "Private", min_cibil: 690, min_income: 25000, max_ltv: 0.75, interest_rate_min: 9.00, interest_rate_max: 11.50, processing_time_days: 7, supported_employment: "Salaried,Self-Employed,Business", supported_properties: "Residential,Commercial", max_loan_amount: 40000000, risk_flags: "High credit assessment checks" },
      { name: "Standard Chartered", type: "Private", min_cibil: 730, min_income: 50000, max_ltv: 0.75, interest_rate_min: 8.70, interest_rate_max: 9.50, processing_time_days: 8, supported_employment: "Salaried", supported_properties: "Residential,Commercial", max_loan_amount: 100000000, risk_flags: "Only supports metro cities,Salaried focus only" },
      { name: "DBS Bank India", type: "Private", min_cibil: 720, min_income: 40000, max_ltv: 0.75, interest_rate_min: 8.75, interest_rate_max: 9.65, processing_time_days: 7, supported_employment: "Salaried,Self-Employed", supported_properties: "Residential,Commercial", max_loan_amount: 80000000, risk_flags: "Urban focus,Requires premium properties" },

      // NBFCs & HFCs (Flexible criteria, higher interest rates, fast approvals, higher risk tolerance)
      { name: "Bajaj Housing Finance", type: "NBFC", min_cibil: 650, min_income: 20000, max_ltv: 0.80, interest_rate_min: 8.80, interest_rate_max: 11.50, processing_time_days: 4, supported_employment: "Salaried,Self-Employed,Business", supported_properties: "Residential,Commercial,Plot", max_loan_amount: 150000000, risk_flags: "Higher administrative charges" },
      { name: "Tata Capital", type: "NBFC", min_cibil: 650, min_income: 20000, max_ltv: 0.80, interest_rate_min: 8.90, interest_rate_max: 12.00, processing_time_days: 5, supported_employment: "Salaried,Self-Employed,Business", supported_properties: "Residential,Commercial", max_loan_amount: 100000000, risk_flags: "Requires stable business operations for self-employed" },
      { name: "LIC Housing Finance", type: "NBFC", min_cibil: 700, min_income: 20000, max_ltv: 0.85, interest_rate_min: 8.65, interest_rate_max: 9.75, processing_time_days: 10, supported_employment: "Salaried,Self-Employed", supported_properties: "Residential", max_loan_amount: 150000000, risk_flags: "Slow disbursement speed,Rigid documentation checklist" },
      { name: "PNB Housing Finance", type: "NBFC", min_cibil: 650, min_income: 18000, max_ltv: 0.80, interest_rate_min: 8.85, interest_rate_max: 11.20, processing_time_days: 7, supported_employment: "Salaried,Self-Employed,Business", supported_properties: "Residential,Commercial,Plot", max_loan_amount: 80000000, risk_flags: "Strict on structural compliance of building" },
      { name: "L&T Finance", type: "NBFC", min_cibil: 640, min_income: 18000, max_ltv: 0.75, interest_rate_min: 9.20, interest_rate_max: 12.50, processing_time_days: 6, supported_employment: "Salaried,Self-Employed,Business", supported_properties: "Residential,Commercial", max_loan_amount: 50000000, risk_flags: "Slightly higher rate matrix" },
      { name: "Aditya Birla Capital", type: "NBFC", min_cibil: 650, min_income: 20000, max_ltv: 0.80, interest_rate_min: 9.10, interest_rate_max: 12.50, processing_time_days: 5, supported_employment: "Salaried,Self-Employed,Business", supported_properties: "Residential,Commercial,Plot", max_loan_amount: 75000000, risk_flags: "Requires high credit assurance cover" },
      { name: "HDB Financial Services", type: "NBFC", min_cibil: 620, min_income: 15000, max_ltv: 0.75, interest_rate_min: 9.50, interest_rate_max: 13.50, processing_time_days: 4, supported_employment: "Salaried,Self-Employed,Business", supported_properties: "Residential,Commercial", max_loan_amount: 40000000, risk_flags: "Very high interest rates for borderline CIBIL profiles" },
      { name: "Muthoot Homefin", type: "NBFC", min_cibil: 600, min_income: 12000, max_ltv: 0.80, interest_rate_min: 9.75, interest_rate_max: 14.00, processing_time_days: 6, supported_employment: "Salaried,Self-Employed,Business", supported_properties: "Residential", max_loan_amount: 20000000, risk_flags: "High risk premium added to base rate" },
      { name: "Manappuram Home Finance", type: "NBFC", min_cibil: 600, min_income: 12000, max_ltv: 0.75, interest_rate_min: 10.00, interest_rate_max: 15.00, processing_time_days: 5, supported_employment: "Salaried,Self-Employed,Business", supported_properties: "Residential", max_loan_amount: 15000000, risk_flags: "Higher risk margins,Prefers smaller ticket sizes" },
      { name: "Cholamandalam Investment & Finance", type: "NBFC", min_cibil: 620, min_income: 15000, max_ltv: 0.75, interest_rate_min: 9.40, interest_rate_max: 13.00, processing_time_days: 6, supported_employment: "Salaried,Self-Employed,Business", supported_properties: "Residential,Commercial,Plot", max_loan_amount: 50000000, risk_flags: "Strong rural footprint,Strict recovery clauses" },
      { name: "Shriram Housing Finance", type: "NBFC", min_cibil: 600, min_income: 12000, max_ltv: 0.75, interest_rate_min: 9.60, interest_rate_max: 14.50, processing_time_days: 6, supported_employment: "Salaried,Self-Employed,Business", supported_properties: "Residential,Commercial", max_loan_amount: 30000000, risk_flags: "Supports self-employed with cash-based income verification" },
      { name: "Mahindra Home Finance", type: "NBFC", min_cibil: 600, min_income: 10000, max_ltv: 0.70, interest_rate_min: 10.25, interest_rate_max: 15.50, processing_time_days: 7, supported_employment: "Salaried,Self-Employed,Business", supported_properties: "Residential", max_loan_amount: 15000000, risk_flags: "High interest rates,Rural focus only" },
      { name: "Poonawalla Fincorp", type: "NBFC", min_cibil: 660, min_income: 22000, max_ltv: 0.75, interest_rate_min: 9.00, interest_rate_max: 12.00, processing_time_days: 4, supported_employment: "Salaried,Self-Employed,Business", supported_properties: "Residential,Commercial", max_loan_amount: 50000000, risk_flags: "Quick digital checks,LTV capped tightly" },
      { name: "Piramal Capital", type: "NBFC", min_cibil: 620, min_income: 15000, max_ltv: 0.80, interest_rate_min: 9.25, interest_rate_max: 13.00, processing_time_days: 5, supported_employment: "Salaried,Self-Employed,Business", supported_properties: "Residential,Commercial", max_loan_amount: 60000000, risk_flags: "Accepts co-applicants with alternative income" },
      { name: "IIFL Home Finance", type: "NBFC", min_cibil: 630, min_income: 15000, max_ltv: 0.80, interest_rate_min: 9.15, interest_rate_max: 12.75, processing_time_days: 5, supported_employment: "Salaried,Self-Employed,Business", supported_properties: "Residential,Plot", max_loan_amount: 40000000, risk_flags: "High processing fees" },
      { name: "Hero Fincorp", type: "NBFC", min_cibil: 640, min_income: 18000, max_ltv: 0.75, interest_rate_min: 9.30, interest_rate_max: 12.90, processing_time_days: 5, supported_employment: "Salaried,Self-Employed,Business", supported_properties: "Residential,Commercial", max_loan_amount: 35000000, risk_flags: "Mainly urban and semi-urban limits" },
      { name: "Grihashakti (Fullerton)", type: "NBFC", min_cibil: 620, min_income: 15000, max_ltv: 0.80, interest_rate_min: 9.50, interest_rate_max: 13.50, processing_time_days: 6, supported_employment: "Salaried,Self-Employed,Business", supported_properties: "Residential", max_loan_amount: 30000000, risk_flags: "Strict checks on property location legality" },
      { name: "Godrej Housing Finance", type: "NBFC", min_cibil: 670, min_income: 25000, max_ltv: 0.80, interest_rate_min: 8.90, interest_rate_max: 11.00, processing_time_days: 5, supported_employment: "Salaried,Self-Employed", supported_properties: "Residential", max_loan_amount: 80000000, risk_flags: "Only selects premium developer projects" },
      { name: "Incred Financial Services", type: "NBFC", min_cibil: 630, min_income: 20000, max_ltv: 0.75, interest_rate_min: 9.80, interest_rate_max: 14.00, processing_time_days: 4, supported_employment: "Salaried,Self-Employed,Business", supported_properties: "Residential,Commercial", max_loan_amount: 25000000, risk_flags: "Aggressive digital verification checks" },
      { name: "Clix Capital", type: "NBFC", min_cibil: 640, min_income: 20000, max_ltv: 0.75, interest_rate_min: 9.65, interest_rate_max: 13.80, processing_time_days: 4, supported_employment: "Salaried,Self-Employed,Business", supported_properties: "Residential", max_loan_amount: 20000000, risk_flags: "CIBIL defaults within 1 year are rejected" },
      { name: "Navi Technologies", type: "NBFC", min_cibil: 650, min_income: 25000, max_ltv: 0.75, interest_rate_min: 9.20, interest_rate_max: 12.00, processing_time_days: 2, supported_employment: "Salaried", supported_properties: "Residential", max_loan_amount: 20000000, risk_flags: "App-only processing,Strictly no manual files accepted,Salaried only" },
      { name: "Northern Arc Capital", type: "NBFC", min_cibil: 610, min_income: 15000, max_ltv: 0.70, interest_rate_min: 10.50, interest_rate_max: 16.00, processing_time_days: 5, supported_employment: "Salaried,Self-Employed,Business", supported_properties: "Residential,Commercial", max_loan_amount: 15000000, risk_flags: "Underwrites subprime borrowers,High cost of funds" },
      { name: "Home Credit India", type: "NBFC", min_cibil: 600, min_income: 12000, max_ltv: 0.70, interest_rate_min: 11.00, interest_rate_max: 18.00, processing_time_days: 3, supported_employment: "Salaried,Self-Employed", supported_properties: "Residential", max_loan_amount: 10000000, risk_flags: "Very high interest rates,Micro housing focus" },
      { name: "Aavas Financiers", type: "NBFC", min_cibil: 610, min_income: 12000, max_ltv: 0.75, interest_rate_min: 9.50, interest_rate_max: 13.00, processing_time_days: 6, supported_employment: "Salaried,Self-Employed,Business", supported_properties: "Residential", max_loan_amount: 25000000, risk_flags: "Expertise in informal document checks" },
      { name: "Aadhar Housing Finance", type: "NBFC", min_cibil: 600, min_income: 10000, max_ltv: 0.80, interest_rate_min: 9.75, interest_rate_max: 14.50, processing_time_days: 6, supported_employment: "Salaried,Self-Employed,Business", supported_properties: "Residential", max_loan_amount: 20000000, risk_flags: "Focuses on low-income groups" },
      { name: "Repco Home Finance", type: "NBFC", min_cibil: 620, min_income: 15000, max_ltv: 0.75, interest_rate_min: 9.35, interest_rate_max: 12.80, processing_time_days: 8, supported_employment: "Salaried,Self-Employed,Business", supported_properties: "Residential,Plot", max_loan_amount: 30000000, risk_flags: "Strict checks on land zoning" }
    ];

    const stmt = await database.prepare(`
      INSERT INTO lenders (
        name, type, min_cibil, min_income, max_ltv, 
        interest_rate_min, interest_rate_max, processing_time_days, 
        supported_employment, supported_properties, max_loan_amount, risk_flags
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const lender of lendersSeed) {
      await stmt.run(
        lender.name,
        lender.type,
        lender.min_cibil,
        lender.min_income,
        lender.max_ltv,
        lender.interest_rate_min,
        lender.interest_rate_max,
        lender.processing_time_days,
        lender.supported_employment,
        lender.supported_properties,
        lender.max_loan_amount,
        lender.risk_flags
      );
    }
    await stmt.finalize();
    console.log('Seeded ' + lendersSeed.length + ' lenders successfully.');
  }
}
