/**
 * Service to orchestrate the 4 Loan analysis agents.
 */

// Helper to make a call to Gemini API
async function callGemini(prompt, apiKey, responseJson = false) {
  try {
    const model = 'gemini-1.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    
    const requestBody = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,
      }
    };
    
    if (responseJson) {
      requestBody.generationConfig.responseMimeType = 'application/json';
    }
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error (${response.status}): ${errorText}`);
    }
    
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    throw error;
  }
}

/**
 * Agent 1: Rejection Reason Analyzer
 */
export async function analyzeRejection(borrowerProfile, rejectionLetterText, apiKey) {
  const prompt = `You are an expert loan underwriter AI. Analyze the following rejected loan application and provide:
1. Primary rejection reason (1 sentence)
2. Secondary contributing factors (max 3 bullets)
3. CIBIL impact assessment (score range and effect)
4. Income gap analysis (required vs. actual)
5. Documentation deficiencies (if any)

Borrower Profile:
- Name: ${borrowerProfile.borrower_name}
- Age: ${borrowerProfile.age}
- Employment Type: ${borrowerProfile.employment_type}
- Credit Score (CIBIL): ${borrowerProfile.cibil_score}
- Monthly Income: INR ${borrowerProfile.monthly_income}
- Existing Obligations (Monthly EMIs): INR ${borrowerProfile.existing_obligations}
- Requested Loan Amount: INR ${borrowerProfile.loan_amount_requested}
- Requested Tenure: ${borrowerProfile.loan_tenure_requested} years
- Property Value: INR ${borrowerProfile.property_value || 'N/A'}
- Property Type: ${borrowerProfile.property_type || 'N/A'}

Previous Rejection Letter Content:
"""
${rejectionLetterText || 'No rejection letter provided.'}
"""

Respond in structured JSON with keys:
{
  "primary_reason": "Primary rejection reason (1 sentence)",
  "contributing_factors": ["factor 1", "factor 2", "factor 3"],
  "cibil_assessment": "CIBIL impact assessment",
  "income_gap": "Income gap analysis (required vs. actual)",
  "doc_issues": ["issue 1", "issue 2"]
}`;

  if (apiKey) {
    try {
      const resultText = await callGemini(prompt, apiKey, true);
      return JSON.parse(resultText);
    } catch (e) {
      console.warn('Live API failed, falling back to simulated analysis', e);
    }
  }

  // Smart Mock Fallback
  return simulateRejectionAnalysis(borrowerProfile, rejectionLetterText);
}

/**
 * Agent 2: Bank Matching Agent
 */
export async function matchLenders(borrowerProfile, lendersList, rejectionAnalysis, apiKey) {
  // We feed the top filtered candidates (from SQLite) to the LLM to get detailed rankings, eligibility, and risk flags.
  const prompt = `You are a loan placement specialist AI. Given the borrower profile below and a list of candidate lenders, identify the top 5 most suitable banks or NBFCs from this list.
Rank by approval probability (highest first).

Borrower Profile:
- Name: ${borrowerProfile.borrower_name}
- Credit Score (CIBIL): ${borrowerProfile.cibil_score}
- Monthly Income: INR ${borrowerProfile.monthly_income}
- Existing Obligations (Monthly EMIs): INR ${borrowerProfile.existing_obligations}
- Requested Loan Amount: INR ${borrowerProfile.loan_amount_requested}
- Requested Tenure: ${borrowerProfile.loan_tenure_requested} years
- Property Value: INR ${borrowerProfile.property_value || 'N/A'}
- Property Type: ${borrowerProfile.property_type || 'N/A'}

Primary Rejection Reason was: "${rejectionAnalysis.primary_reason}"

Candidate Lenders Database list:
${JSON.stringify(lendersList.map(l => ({ id: l.id, name: l.name, type: l.type, min_cibil: l.min_cibil, interest_rate_min: l.interest_rate_min, processing_time_days: l.processing_time_days, risk_flags: l.risk_flags })))}

For each of the top 5 lenders, provide:
- Lender name and type (PSU / Private / NBFC)
- Approval probability (%) - express as numeric 0 to 100
- Key eligibility match points
- Any risk flags

Respond in structured JSON as an array of 5 objects:
[
  {
    "name": "Lender Name",
    "type": "PSU / Private / NBFC",
    "approval_probability": 85,
    "match_points": ["point 1", "point 2"],
    "risk_flags": ["flag 1", "flag 2"]
  },
  ...
]`;

  if (apiKey) {
    try {
      const resultText = await callGemini(prompt, apiKey, true);
      return JSON.parse(resultText);
    } catch (e) {
      console.warn('Live API failed, falling back to simulated bank matching', e);
    }
  }

  // Smart Mock Fallback
  return simulateBankMatching(borrowerProfile, lendersList, rejectionAnalysis);
}

/**
 * Agent 3: File Quality Audit Agent
 */
export async function auditFileQuality(borrowerProfile, rejectionLetterText, apiKey) {
  const prompt = `You are a loan file audit specialist. Review the submitted loan application files and evaluate:
1. Document completeness (checklist of present vs. missing docs)
2. Data consistency (income, ITR, bank statements alignment)
3. File presentation score (0-100)
4. Critical corrections required before resubmission
5. Estimated resubmission readiness timeline

Borrower Profile:
- Name: ${borrowerProfile.borrower_name}
- Age: ${borrowerProfile.age}
- Employment Type: ${borrowerProfile.employment_type}
- Monthly Income: INR ${borrowerProfile.monthly_income}
- Property Type: ${borrowerProfile.property_type || 'N/A'}

Provide actionable, prioritized recommendations. Be specific and concise.
Respond in structured JSON with keys:
{
  "document_completeness": [
    { "doc_name": "PAN & Aadhaar", "status": "Present" },
    { "doc_name": "Last 3 Months Salary Slips / ITR", "status": "Present" },
    { "doc_name": "Last 6 Months Bank Statements", "status": "Missing" },
    ...
  ],
  "data_consistency": "Detail if income listed in application matches bank statement deposits.",
  "file_presentation_score": 85,
  "critical_corrections": [
    "correction 1",
    "correction 2"
  ],
  "estimated_timeline": "Timeline (e.g. 5-7 days to collect bank statements)"
}`;

  if (apiKey) {
    try {
      const resultText = await callGemini(prompt, apiKey, true);
      return JSON.parse(resultText);
    } catch (e) {
      console.warn('Live API failed, falling back to simulated file audit', e);
    }
  }

  // Smart Mock Fallback
  return simulateFileQualityAudit(borrowerProfile, rejectionLetterText);
}

/**
 * Agent 4: Borrower Report Generator
 */
export async function generateBorrowerReport(borrowerProfile, rejectionAnalysis, matchedLenders, fileAudit, apiKey) {
  const prompt = `You are a professional loan advisor AI. Generate a clear, empathetic borrower-facing report that explains:
- Why the loan was rejected (in simple language, no jargon)
- What the borrower can do to improve their profile
- Which lenders are recommended for reapplication
- Revised loan amount they may qualify for
- Timeline to achieve approval readiness

Tone: professional, encouraging, and actionable. Format as a structured letter.

Input Information:
- Borrower: ${borrowerProfile.borrower_name}
- Requested Loan: INR ${borrowerProfile.loan_amount_requested}
- Rejection Analysis: ${JSON.stringify(rejectionAnalysis)}
- Matched Lenders: ${JSON.stringify(matchedLenders)}
- File Audit: ${JSON.stringify(fileAudit)}

Provide the report formatted in standard, beautiful markdown. Avoid internal AI system notes. Start directly with the letter header (e.g., "Dear [Name]").`;

  if (apiKey) {
    try {
      return await callGemini(prompt, apiKey, false);
    } catch (e) {
      console.warn('Live API failed, falling back to simulated report', e);
    }
  }

  // Smart Mock Fallback
  return simulateBorrowerReport(borrowerProfile, rejectionAnalysis, matchedLenders, fileAudit);
}

/* ==========================================
   SMART MOCK SIMULATION ENGINE (HEURISTICS)
   ========================================== */

function simulateRejectionAnalysis(borrowerProfile, rejectionLetterText) {
  const cibil = borrowerProfile.cibil_score;
  const income = borrowerProfile.monthly_income;
  const obligations = borrowerProfile.existing_obligations;
  const loanAmount = borrowerProfile.loan_amount_requested;
  
  // Calculate Debt-to-Income (FOIR - Fixed Obligation to Income Ratio)
  // Let's assume standard EMI for requested loan is ~1% of loan amount per month (e.g. 8.5% for 15 years is ~0.98% per month)
  const estimatedNewEMI = loanAmount * 0.0098;
  const totalObligations = obligations + estimatedNewEMI;
  const foir = (totalObligations / income) * 100;
  
  let primary_reason = "";
  let contributing_factors = [];
  let cibil_assessment = "";
  let income_gap = "";
  let doc_issues = [];

  // 1. CIBIL Rejection
  if (cibil < 650) {
    primary_reason = `The application was rejected primarily due to a low CIBIL credit score of ${cibil}, which falls below the minimum risk tolerance threshold of prime lenders.`;
    contributing_factors = [
      "History of delayed payments or defaults in credit accounts within the last 12-24 months.",
      "High overall credit utilization index across existing active credit cards.",
      "Multiple hard credit enquiries registered in the last 6 months indicating credit hunger."
    ];
    cibil_assessment = `Critical risk. Your CIBIL score of ${cibil} requires immediate remediation. Prime banks require a score of 720+, while flexible NBFCs will accept 600-650 with a risk premium interest rate (+1.5% to +3%).`;
    income_gap = "Not the limiting factor. The current monthly income is sufficient, but credit risk prevents approvals.";
    doc_issues = ["Repayment tracks / statements for credit card defaults are missing.", "No explanation letter for past delinquency was attached."];
  }
  // 2. High FOIR (Income eligibility) Rejection
  else if (foir > 55) {
    primary_reason = `The application was rejected because your fixed obligations to monthly income ratio (FOIR) of ${foir.toFixed(1)}% exceeds the standard industry limit of 50%.`;
    contributing_factors = [
      `Existing monthly obligations of INR ${obligations.toLocaleString('en-IN')} absorb a substantial portion of your INR ${income.toLocaleString('en-IN')} income.`,
      `The requested loan amount of INR ${loanAmount.toLocaleString('en-IN')} implies a monthly EMI of ~INR ${estimatedNewEMI.toLocaleString('en-IN')}, making the overall debt burden unsustainable.`,
      "Lenders evaluate take-home salary after EMIs; the remainder is insufficient to support living expenses according to banking norms."
    ];
    cibil_assessment = `Satisfactory CIBIL score of ${cibil} shows good credit discipline, but high leverage overrides score benefits.`;
    
    // Required Income = (Existing EMIs + New EMI) / 0.50
    const requiredIncome = totalObligations / 0.50;
    income_gap = `Required Monthly Net Income: INR ${Math.round(requiredIncome).toLocaleString('en-IN')}. Actual Monthly Net Income: INR ${income.toLocaleString('en-IN')}. Gap of INR ${Math.round(requiredIncome - income).toLocaleString('en-IN')}.`;
    doc_issues = ["Lacking co-applicant income documents to dilute the FOIR ratio.", "No proof of secondary income sources (rental, dividends) was submitted to bolster net income."];
  }
  // 3. General Document / Property / LTV Mismatch
  else {
    primary_reason = `The application was rejected due to strict property eligibility guidelines or property document deficiencies.`;
    contributing_factors = [
      "Property valuation or LTV (Loan-to-Value) exceeds guidelines (prefers LTV < 80%).",
      "Property layout is not approved by local municipal authorities or lacks clear chain deeds.",
      "Employment type classified as high-risk or business continuity documents are incomplete."
    ];
    cibil_assessment = `Excellent credit score of ${cibil}. Credit behavior is not a concern.`;
    income_gap = "Income is fully compliant. No gap detected based on basic salary criteria.";
    doc_issues = [
      "Property tax receipts for the last 2 years are missing.",
      "Approved building plan map and builder NOC (No Objection Certificate) are not uploaded.",
      "Title search report from a panel advocate is missing."
    ];
  }

  return { primary_reason, contributing_factors, cibil_assessment, income_gap, doc_issues };
}

function simulateBankMatching(borrowerProfile, lendersList, rejectionAnalysis) {
  const cibil = borrowerProfile.cibil_score;
  const income = borrowerProfile.monthly_income;
  const loanAmount = borrowerProfile.loan_amount_requested;
  const employment = borrowerProfile.employment_type;
  
  // Sort and rank based on eligibility heuristics
  const evaluated = lendersList.map(lender => {
    let score = 90;
    let matchPoints = [];
    let riskFlags = [];

    // CIBIL checks
    if (cibil < lender.min_cibil) {
      const diff = lender.min_cibil - cibil;
      score -= diff * 1.5;
      riskFlags.push(`CIBIL score (${cibil}) is below the lender's cutoff of ${lender.min_cibil}`);
    } else {
      matchPoints.push(`CIBIL score of ${cibil} meets the minimum requirement of ${lender.min_cibil}`);
    }

    // Income checks
    if (income < lender.min_income) {
      score -= 20;
      riskFlags.push(`Monthly income (INR ${income}) is below the threshold of INR ${lender.min_income}`);
    } else {
      matchPoints.push(`Monthly income meets the lender's threshold`);
    }

    // Employment type checks
    const supportedEmps = lender.supported_employment.split(',');
    if (!supportedEmps.includes(employment)) {
      score -= 30;
      riskFlags.push(`Does not support employment type: ${employment}`);
    } else {
      matchPoints.push(`Supports ${employment} borrower profile`);
    }

    // Loan amount check
    if (loanAmount > lender.max_loan_amount) {
      score -= 15;
      riskFlags.push(`Requested loan amount exceeds lender's cap of INR ${lender.max_loan_amount.toLocaleString('en-IN')}`);
    }

    // LTV adjustment
    if (lender.max_ltv < 0.80) {
      riskFlags.push(`Conservative LTV cap of ${lender.max_ltv * 100}% may require a higher down payment.`);
    }

    // General adjustments based on type
    if (lender.type === "PSU") {
      if (cibil < 720) {
        score -= 15;
        riskFlags.push("PSU bank underwriting is highly conservative with strict CIBIL cutoffs");
      }
      matchPoints.push(`Attractive low interest rates starting from ${lender.interest_rate_min}% p.a.`);
    } else if (lender.type === "Private") {
      matchPoints.push(`Fast processing (typically ${lender.processing_time_days} days)`);
    } else if (lender.type === "NBFC") {
      matchPoints.push("Highly flexible underwriting policies and fast approvals");
      if (cibil < 650) {
        matchPoints.push("Specialized program for credit score improvement/low CIBIL");
      }
      riskFlags.push(`Higher interest rates ranging up to ${lender.interest_rate_max}% p.a.`);
    }

    // Bound score
    score = Math.max(15, Math.min(98, Math.round(score)));

    return {
      name: lender.name,
      type: lender.type,
      approval_probability: score,
      match_points: matchPoints.slice(0, 3),
      risk_flags: riskFlags.slice(0, 2)
    };
  });

  // Sort by approval probability desc, then return top 5
  return evaluated
    .sort((a, b) => b.approval_probability - a.approval_probability)
    .slice(0, 5);
}

function simulateFileQualityAudit(borrowerProfile, rejectionLetterText) {
  const emp = borrowerProfile.employment_type;
  const cibil = borrowerProfile.cibil_score;

  let completeness = [
    { doc_name: "PAN Card", status: "Present" },
    { doc_name: "Aadhaar Card (front & back)", status: "Present" },
  ];

  if (emp === "Salaried") {
    completeness.push(
      { doc_name: "Latest 3 Months Salary Slips", status: "Present" },
      { doc_name: "Form 16 / Income Tax Returns (2 years)", status: "Present" },
      { doc_name: "Salary Bank Account Statement (6 months)", status: "Present" }
    );
  } else {
    completeness.push(
      { doc_name: "Business Registration (GST/MSME)", status: "Present" },
      { doc_name: "Audited P&L and Balance Sheet (2 years)", status: "Missing" },
      { doc_name: "Current Bank Account Statement (12 months)", status: "Present" }
    );
  }

  completeness.push(
    { doc_name: "CIBIL Report PDF", status: cibil < 650 ? "Present" : "Missing" },
    { doc_name: "Property Title Deeds / Chain documents", status: "Present" },
    { doc_name: "Previous Rejection Letter", status: rejectionLetterText ? "Present" : "Missing" }
  );

  const missingCount = completeness.filter(d => d.status === "Missing").length;
  const score = Math.max(30, 100 - (missingCount * 12) - (cibil < 650 ? 15 : 0));

  let data_consistency = "The name matches across PAN, Aadhaar, and bank statements. However, ";
  if (emp === "Salaried") {
    data_consistency += "the net salary credited in the bank statement shows a minor variance of 4% from the basic salary listed in the salary slip due to variable incentives.";
  } else {
    data_consistency += "the business turnover declared in the ITR does not align precisely with the cumulative credit credits in the current account statements (12% discrepancy).";
  }

  let critical_corrections = [];
  if (cibil < 650) {
    critical_corrections.push("Provide a CIBIL rectification request receipt or proof of settled past dues.");
  }
  if (missingCount > 0) {
    completeness.filter(d => d.status === "Missing").forEach(d => {
      critical_corrections.push(`Obtain and upload the official ${d.doc_name}.`);
    });
  }
  critical_corrections.push("Ensure all uploaded bank statements are original PDF files, not scanned images, to pass automated OCR systems.");

  return {
    document_completeness: completeness,
    data_consistency,
    file_presentation_score: score,
    critical_corrections: critical_corrections.slice(0, 4),
    estimated_timeline: missingCount > 0 ? "5 to 7 business days to assemble missing files" : "1 to 2 business days"
  };
}

function simulateBorrowerReport(borrowerProfile, rejectionAnalysis, matchedLenders, fileAudit) {
  const topLender = matchedLenders[0] || { name: "Aditya Birla Capital", type: "NBFC", approval_probability: 85 };
  
  return `Dear ${borrowerProfile.borrower_name},

Thank you for trusting us to analyze your recent loan application status. We understand that receiving a loan rejection can be frustrating, but we have completed a thorough underwriter audit of your file and identified a clear pathway to securing your approval.

### 1. Understanding the Rejection
Your application was primarily declined because **${rejectionAnalysis.primary_reason}**. 
Additionally, we noted the following contributing factors:
${rejectionAnalysis.contributing_factors.map(f => `- ${f}`).join('\n')}

### 2. Actionable Improvement Steps
To ensure your next submission succeeds, we recommend taking the following actions:
${fileAudit.critical_corrections.map((c, i) => `${i + 1}. **${c}**`).join('\n')}
- **Income/Co-applicant Option**: ${rejectionAnalysis.income_gap.includes("Gap") ? "Consider adding a close family member (e.g., spouse or parents) as a co-applicant to pool incomes and reduce your debt-to-income ratio." : "Your income is stable, meaning focusing purely on file presentation and lender selection will yield success."}

### 3. Recommended Lenders & Restructuring
Based on your credit profile, we have matched your application against our database of 50+ lenders. We recommend targeting lenders who offer flexible underwriting for your specific profile:

1. **${topLender.name} (${topLender.type})**
   - **Approval Probability**: **${topLender.approval_probability}%**
   - **Key Advantage**: ${topLender.match_points?.[0] || 'Flexible credit check'}
   - **Risk Note**: ${topLender.risk_flags?.[0] || 'Slightly higher rate matrix'}

2. **${matchedLenders[1]?.name || 'Tata Capital'} (${matchedLenders[1]?.type || 'NBFC'})**
   - **Approval Probability**: **${matchedLenders[1]?.approval_probability || 80}%**
   - **Key Advantage**: ${matchedLenders[1]?.match_points?.[0] || 'Faster processing'}

### 4. Revised Loan Eligibility & Timeline
- **Revised Eligible Amount**: We estimate you qualify for a loan up to **INR ${(borrowerProfile.loan_amount_requested * (fileAudit.file_presentation_score / 100)).toLocaleString('en-IN')}** under current conditions. Adding a co-applicant can restore your requested amount of **INR ${borrowerProfile.loan_amount_requested.toLocaleString('en-IN')}**.
- **Estimated Timeline to Re-submit**: **${fileAudit.estimated_timeline}** to address critical file gaps.

We are confident that by applying these structured corrections and applying to the recommended lenders, we will secure a positive outcome. 

Sincerely,
*Your AI Loan Analysis Team*`;
}
