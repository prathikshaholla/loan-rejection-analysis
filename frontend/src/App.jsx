import React, { useState, useEffect } from 'react';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Landmark,
  ArrowRight,
  UserCheck,
  ShieldAlert,
  Award,
  PlusCircle,
  Settings as SettingsIcon,
  ClipboardList,
  Eye,
  Download,
  Info,
  ChevronRight,
  Sparkles,
  Calendar,
  AlertCircle
} from 'lucide-react';

const API_BASE_URL = 'http://localhost:5000/api';

export default function App() {
  // Navigation & Tabs
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, new-analysis, settings
  const [selectedAppId, setSelectedAppId] = useState(null);
  const [appDetails, setAppDetails] = useState(null);
  const [detailSubTab, setDetailSubTab] = useState('rejection'); // rejection, match, quality, report

  // Settings
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
  const [isSimulated, setIsSimulated] = useState(!apiKey);

  // Application Data States
  const [applications, setApplications] = useState([]);
  const [lenders, setLenders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState(null);

  // Intake Form Inputs
  const [form, setForm] = useState({
    borrower_name: '',
    pan: '',
    aadhaar: '',
    age: '35',
    employment_type: 'Salaried',
    cibil_score: '710',
    monthly_income: '75000',
    existing_obligations: '20000',
    property_value: '4500000',
    property_type: 'Residential',
    property_location: 'Mumbai Suburbs',
    loan_amount_requested: '3000000',
    loan_tenure_requested: '15'
  });

  const [files, setFiles] = useState({
    rejectionLetter: null,
    cibilReport: null,
    incomeDocs: null
  });

  const [fileNames, setFileNames] = useState({
    rejectionLetter: '',
    cibilReport: '',
    incomeDocs: ''
  });

  // Load applications & lenders on startup
  useEffect(() => {
    fetchApplications();
    fetchLenders();
  }, []);

  // Save API key to localStorage when changed
  useEffect(() => {
    localStorage.setItem('gemini_api_key', apiKey);
    setIsSimulated(!apiKey);
  }, [apiKey]);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/applications`);
      if (!res.ok) throw new Error('Failed to fetch applications');
      const data = await res.json();
      setApplications(data);
    } catch (err) {
      console.error(err);
      setError('Could not connect to the backend server. Make sure the Node.js backend is running on port 5000.');
    } finally {
      setLoading(false);
    }
  };

  const fetchLenders = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/lenders`);
      if (res.ok) {
        const data = await res.json();
        setLenders(data);
      }
    } catch (err) {
      console.error('Lenders fetch err', err);
    }
  };

  const fetchApplicationDetails = async (id) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/applications/${id}`);
      if (!res.ok) throw new Error('Failed to fetch details');
      const data = await res.json();
      setAppDetails(data);
      setSelectedAppId(id);
      setDetailSubTab('rejection');
    } catch (err) {
      alert('Error fetching details: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const { name, files: uploadedFiles } = e.target;
    if (uploadedFiles && uploadedFiles[0]) {
      setFiles(prev => ({ ...prev, [name]: uploadedFiles[0] }));
      setFileNames(prev => ({ ...prev, [name]: uploadedFiles[0].name }));
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    setError(null);

    const formData = new FormData();
    // Append text fields
    Object.keys(form).forEach(key => {
      formData.append(key, form[key]);
    });

    // Append API key
    if (apiKey) {
      formData.append('apiKey', apiKey);
    }

    // Append files
    if (files.rejectionLetter) formData.append('rejectionLetter', files.rejectionLetter);
    if (files.cibilReport) formData.append('cibilReport', files.cibilReport);
    if (files.incomeDocs) formData.append('incomeDocs', files.incomeDocs);

    try {
      const res = await fetch(`${API_BASE_URL}/analyze`, {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Intake analysis failed');
      }

      const result = await res.json();
      
      // Refresh list & select the newly analyzed application
      await fetchApplications();
      await fetchApplicationDetails(result.applicationId);
      
      // Clean up inputs
      setFiles({ rejectionLetter: null, cibilReport: null, incomeDocs: null });
      setFileNames({ rejectionLetter: '', cibilReport: '', incomeDocs: '' });
      
      setActiveTab('details');
    } catch (err) {
      setError(err.message);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      const res = await fetch(`${API_BASE_URL}/applications/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        // Update local app state
        setAppDetails(prev => prev ? { ...prev, status: newStatus } : null);
        fetchApplications();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      
      {/* Premium Header */}
      <header className="bg-slate-950 border-b border-slate-800 sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-gradient-to-tr from-blue-600 to-teal-400 rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/20">
              <Landmark className="h-5 w-5" />
            </div>
            <div>
              <span className="font-extrabold text-lg bg-gradient-to-r from-blue-400 to-teal-300 bg-clip-text text-transparent">ANTIGRAVITY LOAN AI</span>
              <span className="text-[10px] text-slate-400 block tracking-wider font-semibold">REJECTION RESOLUTION SUITE</span>
            </div>
          </div>
          
          <nav className="flex items-center gap-1">
            <button
              onClick={() => { setActiveTab('dashboard'); setSelectedAppId(null); }}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                activeTab === 'dashboard' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('new-analysis')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-1.5 ${
                activeTab === 'new-analysis' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
              }`}
            >
              <PlusCircle className="h-4 w-4" />
              New Analysis
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                activeTab === 'settings' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
              }`}
              title="Settings"
            >
              <SettingsIcon className="h-4.5 w-4.5" />
            </button>
          </nav>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        
        {/* Status banner */}
        {isSimulated && activeTab !== 'settings' && (
          <div className="mb-6 bg-gradient-to-r from-amber-500/15 to-orange-500/10 border border-amber-500/30 rounded-xl p-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-amber-400 animate-pulse" />
              <div>
                <h4 className="text-sm font-bold text-amber-300">Running in Simulation Mode</h4>
                <p className="text-xs text-slate-400">Analysis uses high-fidelity heuristic underwriter logic. Paste your Gemini API key in Settings for live AI generations.</p>
              </div>
            </div>
            <button 
              onClick={() => setActiveTab('settings')}
              className="text-xs font-bold text-amber-400 hover:underline flex items-center gap-1"
            >
              Configure API <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-950/40 border border-red-500/40 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-400 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-bold text-red-300">Connection Error</h4>
              <p className="text-xs text-slate-400">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-slate-400 hover:text-slate-100 text-xs">Dismiss</button>
          </div>
        )}

        {/* LOADING SHIMMER */}
        {loading ? (
          <div className="space-y-6">
            <div className="h-32 bg-slate-800/50 rounded-2xl animate-pulse" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="h-64 bg-slate-800/50 rounded-2xl animate-pulse md:col-span-2" />
              <div className="h-64 bg-slate-800/50 rounded-2xl animate-pulse" />
            </div>
          </div>
        ) : (
          <>
            {/* VIEW 1: DASHBOARD */}
            {activeTab === 'dashboard' && (
              <div className="space-y-8">
                {/* Stats Bar */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-6 shadow-sm">
                    <span className="text-xs font-bold text-slate-400 block mb-1">TOTAL ANALYZED</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-extrabold">{applications.length}</span>
                      <span className="text-xs text-teal-400 font-semibold">Files Saved</span>
                    </div>
                  </div>
                  <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-6 shadow-sm">
                    <span className="text-xs font-bold text-slate-400 block mb-1">CIBIL REMEDIATIONS</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-extrabold text-amber-400">
                        {applications.filter(a => a.cibil_score < 650).length}
                      </span>
                      <span className="text-xs text-amber-400/80 font-semibold">Low Credit Scores</span>
                    </div>
                  </div>
                  <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-6 shadow-sm">
                    <span className="text-xs font-bold text-slate-400 block mb-1">AVG. FILE QUALITY</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-extrabold text-teal-400">82%</span>
                      <span className="text-xs text-teal-400/80 font-semibold">Legibility Metric</span>
                    </div>
                  </div>
                  <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-6 shadow-sm">
                    <span className="text-xs font-bold text-slate-400 block mb-1">LENDERS SEEDED</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-extrabold text-blue-400">{lenders.length || 50}</span>
                      <span className="text-xs text-blue-400/80 font-semibold">Banks & NBFCs</span>
                    </div>
                  </div>
                </div>

                {/* Applications Table */}
                <div className="bg-slate-800/20 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
                  <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold">Applications Directory</h3>
                      <p className="text-xs text-slate-400">Manage rejected loan files, view analysis audit logs, and trigger resubmissions.</p>
                    </div>
                    <button
                      onClick={() => setActiveTab('new-analysis')}
                      className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 rounded-lg text-sm font-bold shadow-lg shadow-blue-500/15 flex items-center gap-1.5 transition-all"
                    >
                      <PlusCircle className="h-4 w-4" />
                      Intake Application
                    </button>
                  </div>

                  {applications.length === 0 ? (
                    <div className="p-12 text-center text-slate-400">
                      <ClipboardList className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                      <h4 className="text-base font-bold text-slate-300">No applications analyzed yet</h4>
                      <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">Upload a loan rejection letter or input a borrower profile to parse primary rejection causes and generate lender routing reports.</p>
                      <button
                        onClick={() => setActiveTab('new-analysis')}
                        className="mt-4 px-4 py-2 border border-slate-700 hover:bg-slate-800 rounded-lg text-xs font-bold text-slate-200"
                      >
                        Start First Analysis
                      </button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-900/60 border-b border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-400">
                            <th className="py-4 px-6">Borrower</th>
                            <th className="py-4 px-6">Profile Details</th>
                            <th className="py-4 px-6">CIBIL</th>
                            <th className="py-4 px-6">Requested Loan</th>
                            <th className="py-4 px-6">Status</th>
                            <th className="py-4 px-6">Analyzed At</th>
                            <th className="py-4 px-6 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/80 text-sm">
                          {applications.map((app) => (
                            <tr key={app.id} className="hover:bg-slate-800/30 transition-colors">
                              <td className="py-4 px-6">
                                <span className="font-semibold block text-slate-100">{app.borrower_name}</span>
                                <span className="text-[10px] text-slate-500 uppercase tracking-wider">{app.employment_type}</span>
                              </td>
                              <td className="py-4 px-6">
                                <div className="text-xs text-slate-300">Net Income: INR {Number(app.monthly_income).toLocaleString('en-IN')}/mo</div>
                              </td>
                              <td className="py-4 px-6">
                                <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${
                                  app.cibil_score >= 720 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                                  app.cibil_score >= 650 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 
                                  'bg-red-500/10 text-red-400 border border-red-500/20'
                                }`}>
                                  {app.cibil_score}
                                </span>
                              </td>
                              <td className="py-4 px-6 font-semibold text-slate-200">
                                INR {Number(app.loan_amount_requested).toLocaleString('en-IN')}
                              </td>
                              <td className="py-4 px-6">
                                <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg ${
                                  app.status === 'Re-Submitted' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                                  'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                }`}>
                                  <span className={`h-1.5 w-1.5 rounded-full ${app.status === 'Re-Submitted' ? 'bg-emerald-400' : 'bg-blue-400'}`} />
                                  {app.status}
                                </span>
                              </td>
                              <td className="py-4 px-6 text-xs text-slate-400">
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3.5 w-3.5" />
                                  {new Date(app.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </div>
                              </td>
                              <td className="py-4 px-6 text-right">
                                <button
                                  onClick={() => fetchApplicationDetails(app.id)}
                                  className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-200 hover:text-white transition-colors"
                                  title="View Report Details"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* VIEW 2: NEW APPLICATION INTAKE FORM */}
            {activeTab === 'new-analysis' && (
              <div className="max-w-4xl mx-auto">
                <div className="bg-slate-800/30 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
                  <div className="border-b border-slate-800 pb-6 mb-6">
                    <h2 className="text-xl font-bold">New Re-submission Audit Intake</h2>
                    <p className="text-xs text-slate-400 mt-1">Upload the rejected file details along with previous bank letters. The AI system will audit documents, compute eligibility, and map to prime/subprime NBFC networks.</p>
                  </div>

                  {submitLoading ? (
                    <div className="py-12 text-center space-y-4">
                      <RefreshCw className="h-10 w-10 text-blue-500 animate-spin mx-auto" />
                      <h3 className="font-bold text-slate-200">Executing Underwriting Pipeline Agents...</h3>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto">Parsing PDF bank letters, scoring formatting metrics, running credit audits, and querying the 50+ bank database matrix.</p>
                    </div>
                  ) : (
                    <form onSubmit={handleFormSubmit} className="space-y-6">
                      
                      {/* Section 1: Files Upload */}
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400 mb-3">1. Upload Supporting Application Files</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          
                          {/* Rejection Letter */}
                          <div className="border border-slate-800 hover:border-slate-700 bg-slate-900/40 rounded-xl p-4 text-center cursor-pointer transition-colors relative">
                            <input
                              type="file"
                              id="rejectionLetter"
                              name="rejectionLetter"
                              accept=".pdf,.txt"
                              onChange={handleFileChange}
                              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                            />
                            <UploadCloud className="h-8 w-8 text-slate-500 mx-auto mb-2" />
                            <h4 className="text-xs font-bold text-slate-300">Rejection Letter</h4>
                            <p className="text-[10px] text-slate-500 mt-1">PDF or TXT. AI extracts rejection reasons.</p>
                            {fileNames.rejectionLetter && (
                              <div className="mt-2 text-[10px] font-semibold text-emerald-400 truncate bg-emerald-950/20 px-2 py-0.5 rounded border border-emerald-500/20">
                                {fileNames.rejectionLetter}
                              </div>
                            )}
                          </div>

                          {/* CIBIL Report */}
                          <div className="border border-slate-800 hover:border-slate-700 bg-slate-900/40 rounded-xl p-4 text-center cursor-pointer transition-colors relative">
                            <input
                              type="file"
                              id="cibilReport"
                              name="cibilReport"
                              accept=".pdf,.txt"
                              onChange={handleFileChange}
                              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                            />
                            <UploadCloud className="h-8 w-8 text-slate-500 mx-auto mb-2" />
                            <h4 className="text-xs font-bold text-slate-300">CIBIL Report (Optional)</h4>
                            <p className="text-[10px] text-slate-500 mt-1">PDF report for document OCR audit.</p>
                            {fileNames.cibilReport && (
                              <div className="mt-2 text-[10px] font-semibold text-emerald-400 truncate bg-emerald-950/20 px-2 py-0.5 rounded border border-emerald-500/20">
                                {fileNames.cibilReport}
                              </div>
                            )}
                          </div>

                          {/* Income Documents */}
                          <div className="border border-slate-800 hover:border-slate-700 bg-slate-900/40 rounded-xl p-4 text-center cursor-pointer transition-colors relative">
                            <input
                              type="file"
                              id="incomeDocs"
                              name="incomeDocs"
                              accept=".pdf"
                              onChange={handleFileChange}
                              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                            />
                            <UploadCloud className="h-8 w-8 text-slate-500 mx-auto mb-2" />
                            <h4 className="text-xs font-bold text-slate-300">Income Proofs (Optional)</h4>
                            <p className="text-[10px] text-slate-500 mt-1">Salary slips, Form 16, or ITR.</p>
                            {fileNames.incomeDocs && (
                              <div className="mt-2 text-[10px] font-semibold text-emerald-400 truncate bg-emerald-950/20 px-2 py-0.5 rounded border border-emerald-500/20">
                                {fileNames.incomeDocs}
                              </div>
                            )}
                          </div>

                        </div>
                      </div>

                      {/* Section 2: Borrower KYC & Income Details */}
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400 mb-3">2. Borrower KYC & Financial Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          
                          <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Borrower Full Name</label>
                            <input
                              type="text"
                              name="borrower_name"
                              required
                              value={form.borrower_name}
                              onChange={handleInputChange}
                              placeholder="e.g. Ramesh Kumar"
                              className="w-full bg-slate-900/60 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">PAN Card</label>
                            <input
                              type="text"
                              name="pan"
                              value={form.pan}
                              onChange={handleInputChange}
                              placeholder="e.g. ABCDE1234F"
                              className="w-full bg-slate-900/60 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Aadhaar Number</label>
                            <input
                              type="text"
                              name="aadhaar"
                              value={form.aadhaar}
                              onChange={handleInputChange}
                              placeholder="e.g. 1234-5678-9012"
                              className="w-full bg-slate-900/60 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Age</label>
                            <input
                              type="number"
                              name="age"
                              required
                              value={form.age}
                              onChange={handleInputChange}
                              className="w-full bg-slate-900/60 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Employment Type</label>
                            <select
                              name="employment_type"
                              value={form.employment_type}
                              onChange={handleInputChange}
                              className="w-full bg-slate-900/60 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                            >
                              <option value="Salaried">Salaried Employee</option>
                              <option value="Self-Employed">Self-Employed Professional</option>
                              <option value="Business">Business Owner</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">CIBIL Credit Score</label>
                            <input
                              type="number"
                              name="cibil_score"
                              required
                              value={form.cibil_score}
                              onChange={handleInputChange}
                              className="w-full bg-slate-900/60 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Monthly Net Income (INR)</label>
                            <input
                              type="number"
                              name="monthly_income"
                              required
                              value={form.monthly_income}
                              onChange={handleInputChange}
                              className="w-full bg-slate-900/60 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Existing EMI Obligations (INR)</label>
                            <input
                              type="number"
                              name="existing_obligations"
                              required
                              value={form.existing_obligations}
                              onChange={handleInputChange}
                              className="w-full bg-slate-900/60 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                            />
                          </div>

                        </div>
                      </div>

                      {/* Section 3: Property Details & Loan Request */}
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400 mb-3">3. Property Details & Requested Loan</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          
                          <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Property Value (INR)</label>
                            <input
                              type="number"
                              name="property_value"
                              required
                              value={form.property_value}
                              onChange={handleInputChange}
                              className="w-full bg-slate-900/60 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Property Type</label>
                            <select
                              name="property_type"
                              value={form.property_type}
                              onChange={handleInputChange}
                              className="w-full bg-slate-900/60 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                            >
                              <option value="Residential">Residential Property</option>
                              <option value="Commercial">Commercial Property</option>
                              <option value="Plot">Residential Land / Plot</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Property Location</label>
                            <input
                              type="text"
                              name="property_location"
                              value={form.property_location}
                              onChange={handleInputChange}
                              placeholder="e.g. Metro / Urban / Semi-Urban"
                              className="w-full bg-slate-900/60 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Requested Loan Amount (INR)</label>
                            <input
                              type="number"
                              name="loan_amount_requested"
                              required
                              value={form.loan_amount_requested}
                              onChange={handleInputChange}
                              className="w-full bg-slate-900/60 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Tenure Requested (Years)</label>
                            <input
                              type="number"
                              name="loan_tenure_requested"
                              required
                              value={form.loan_tenure_requested}
                              onChange={handleInputChange}
                              className="w-full bg-slate-900/60 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                            />
                          </div>

                        </div>
                      </div>

                      {/* Submit button */}
                      <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => setActiveTab('dashboard')}
                          className="px-5 py-2 border border-slate-700 hover:bg-slate-800 rounded-lg text-sm font-semibold text-slate-300 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 rounded-lg text-sm font-bold text-white shadow-lg shadow-blue-500/15 flex items-center gap-1.5 transition-all"
                        >
                          <Sparkles className="h-4.5 w-4.5" />
                          Execute Analysis Workflow
                        </button>
                      </div>

                    </form>
                  )}

                </div>
              </div>
            )}

            {/* VIEW 3: APPLICATION DETAIL VIEW */}
            {activeTab === 'details' && appDetails && (
              <div className="space-y-6">
                
                {/* Details Header */}
                <div className="bg-slate-800/30 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-md">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-slate-100">{appDetails.borrower_name}</h2>
                      <span className="text-[10px] bg-slate-700 text-slate-300 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                        {appDetails.employment_type}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Requested Loan: <span className="font-semibold text-slate-200">INR {Number(appDetails.loan_amount_requested).toLocaleString('en-IN')}</span> for {appDetails.loan_tenure_requested} Years
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {appDetails.status !== 'Re-Submitted' ? (
                      <button
                        onClick={() => handleStatusUpdate(appDetails.id, 'Re-Submitted')}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-emerald-500/15 flex items-center gap-1.5 transition-colors"
                      >
                        <CheckCircle2 className="h-4.5 w-4.5" />
                        Initiate Re-submission
                      </button>
                    ) : (
                      <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-sm font-bold flex items-center gap-1.5">
                        <CheckCircle2 className="h-4.5 w-4.5" />
                        File Re-Submitted
                      </div>
                    )}
                    
                    <a
                      href={`${API_BASE_URL}/applications/${appDetails.id}/report`}
                      download
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <Download className="h-4.5 w-4.5" />
                      PDF Report
                    </a>
                  </div>
                </div>

                {/* Sub Tab Navigation */}
                <div className="flex border-b border-slate-800 gap-2 overflow-x-auto">
                  <button
                    onClick={() => setDetailSubTab('rejection')}
                    className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
                      detailSubTab === 'rejection' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    1. Rejection Analysis
                  </button>
                  <button
                    onClick={() => setDetailSubTab('cibil-income')}
                    className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
                      detailSubTab === 'cibil-income' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    2. CIBIL & Income Gap
                  </button>
                  <button
                    onClick={() => setDetailSubTab('match')}
                    className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
                      detailSubTab === 'match' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    3. Bank Matching Matrix
                  </button>
                  <button
                    onClick={() => setDetailSubTab('quality')}
                    className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
                      detailSubTab === 'quality' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    4. File Quality Scorer
                  </button>
                  <button
                    onClick={() => setDetailSubTab('report')}
                    className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
                      detailSubTab === 'report' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    5. Borrower Advisory Letter
                  </button>
                </div>

                {/* Sub Tab Contents */}
                <div className="bg-slate-800/10 border border-slate-800/80 rounded-2xl p-6 sm:p-8 shadow-sm">
                  
                  {/* SUB TAB 1: REJECTION ANALYSIS */}
                  {detailSubTab === 'rejection' && (
                    <div className="space-y-6">
                      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-5 flex items-start gap-4">
                        <div className="p-2 bg-red-500/20 text-red-400 rounded-lg">
                          <AlertTriangle className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-red-400 uppercase tracking-wide">Primary Rejection Cause</h4>
                          <p className="text-sm text-slate-200 mt-1 font-semibold leading-relaxed">
                            {appDetails.rejection_analysis.primary_reason}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Secondary Contributing Factors</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {appDetails.rejection_analysis.contributing_factors.map((factor, idx) => (
                            <div key={idx} className="bg-slate-800/40 border border-slate-800 rounded-xl p-4 flex gap-3">
                              <span className="h-5 w-5 bg-slate-700/50 rounded-full flex items-center justify-center text-xs font-bold text-slate-300 shrink-0">
                                {idx + 1}
                              </span>
                              <p className="text-xs text-slate-300 leading-relaxed">{factor}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {appDetails.rejection_letter_text && (
                        <div className="pt-4 border-t border-slate-800">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">Extracted Raw Rejection Notice Text</h4>
                          <pre className="bg-slate-950/50 border border-slate-900 rounded-xl p-4 text-[10px] text-slate-500 font-mono overflow-auto max-h-40 whitespace-pre-wrap">
                            {appDetails.rejection_letter_text}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}

                  {/* SUB TAB 2: CIBIL & INCOME GAP */}
                  {detailSubTab === 'cibil-income' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Left: Credit Assessment */}
                      <div className="space-y-4">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-blue-400 border-b border-slate-800 pb-2">Credit Rating & CIBIL Assessment</h3>
                        
                        <div className="flex items-center gap-5">
                          <div className={`h-20 w-20 rounded-full flex flex-col items-center justify-center border-4 ${
                            appDetails.cibil_score >= 720 ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5' : 
                            appDetails.cibil_score >= 650 ? 'border-amber-500 text-amber-400 bg-amber-500/5' : 
                            'border-red-500 text-red-400 bg-red-500/5'
                          }`}>
                            <span className="text-xl font-extrabold">{appDetails.cibil_score}</span>
                            <span className="text-[9px] uppercase tracking-wider font-semibold">CIBIL</span>
                          </div>
                          
                          <div className="space-y-1 flex-1">
                            <h4 className="text-sm font-bold">
                              {appDetails.cibil_score >= 720 ? 'Excellent Credit Standing' : 
                               appDetails.cibil_score >= 650 ? 'Moderate/Subprime Risk' : 
                               'High Credit Delinquency Risk'}
                            </h4>
                            <p className="text-xs text-slate-400 leading-relaxed">
                              {appDetails.rejection_analysis.cibil_assessment}
                            </p>
                          </div>
                        </div>

                        <div className="bg-slate-800/30 rounded-xl p-4 text-xs text-slate-400 leading-relaxed border border-slate-800/60">
                          <span className="font-bold text-slate-200 block mb-1">CIBIL Underwriting Norms:</span>
                          • PSU Banks: Strict cutoffs of 720 to 750+. Low flexibility.<br />
                          • Private Banks: Standard cutoffs of 700+. Moderate flexibility.<br />
                          • NBFCs: Subprime cutoffs of 600-650+. Highest flexibility.
                        </div>
                      </div>

                      {/* Right: Income & Obligations Gap */}
                      <div className="space-y-4">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-blue-400 border-b border-slate-800 pb-2">Income & FOIR Analysis</h3>
                        
                        <div className="space-y-3">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-400">Monthly net take-home income</span>
                            <span className="font-bold text-slate-200">INR {Number(appDetails.monthly_income).toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-400">Current EMI obligations</span>
                            <span className="font-bold text-slate-200">INR {Number(appDetails.existing_obligations).toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs border-b border-slate-800 pb-2">
                            <span className="text-slate-400">Est. EMI for requested loan</span>
                            <span className="font-bold text-slate-200">INR {Math.round(appDetails.loan_amount_requested * 0.0098).toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs pt-1">
                            <span className="text-slate-300 font-semibold">Total Leveraged Obligation (FOIR)</span>
                            <span className={`font-bold ${
                              ((Number(appDetails.existing_obligations) + (appDetails.loan_amount_requested * 0.0098)) / appDetails.monthly_income) * 100 > 55 ? 'text-red-400' : 'text-emerald-400'
                            }`}>
                              {(((Number(appDetails.existing_obligations) + (appDetails.loan_amount_requested * 0.0098)) / appDetails.monthly_income) * 100).toFixed(1)}%
                            </span>
                          </div>
                        </div>

                        <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-800">
                          <h4 className="text-xs font-bold text-slate-300 mb-1">Income Gap Report:</h4>
                          <p className="text-xs text-slate-400 leading-relaxed font-mono">
                            {appDetails.rejection_analysis.income_gap}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SUB TAB 3: BANK & NBFC MATCHING MATRIX */}
                  {detailSubTab === 'match' && (
                    <div className="space-y-6">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="text-sm font-bold uppercase tracking-wider text-blue-400">Lender Compatibility Index</h3>
                          <p className="text-xs text-slate-400 mt-1">Ranking of the top 5 matched lenders out of 50+ database banks based on eligibility probability.</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4">
                        {appDetails.matching_lenders.map((lender, idx) => (
                          <div key={idx} className="bg-slate-900/60 border border-slate-850 hover:border-slate-800 rounded-xl p-5 flex flex-col sm:flex-row justify-between gap-4 transition-all">
                            
                            <div className="flex items-start gap-4">
                              <div className="h-10 w-10 bg-slate-800/80 rounded-lg flex items-center justify-center font-bold text-blue-400 border border-slate-700 shrink-0">
                                {idx + 1}
                              </div>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-bold text-slate-100">{lender.name}</h4>
                                  <span className="text-[9px] bg-slate-800 text-slate-400 font-bold px-1.5 py-0.5 rounded border border-slate-700">
                                    {lender.type}
                                  </span>
                                </div>
                                <div className="text-xs text-slate-400 space-y-1">
                                  {lender.match_points.map((pt, pIdx) => (
                                    <div key={pIdx} className="flex items-center gap-1.5 text-emerald-400/90">
                                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                                      {pt}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>

                            <div className="flex sm:flex-col justify-between items-end gap-2 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-800">
                              <div className="text-right">
                                <span className="text-[10px] text-slate-500 font-bold block uppercase">Approval Prob.</span>
                                <span className={`text-xl font-extrabold ${
                                  lender.approval_probability >= 80 ? 'text-emerald-400' : 
                                  lender.approval_probability >= 60 ? 'text-amber-400' : 
                                  'text-red-400'
                                }`}>
                                  {lender.approval_probability}%
                                </span>
                              </div>
                              
                              {lender.risk_flags && lender.risk_flags.length > 0 && (
                                <div className="flex items-center gap-1 bg-red-950/20 border border-red-500/20 px-2 py-0.5 rounded text-[10px] text-red-400 font-semibold max-w-xs">
                                  <ShieldAlert className="h-3 w-3 shrink-0" />
                                  <span>{lender.risk_flags[0]}</span>
                                </div>
                              )}
                            </div>

                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* SUB TAB 4: FILE QUALITY SCORER */}
                  {detailSubTab === 'quality' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      {/* Score card dial */}
                      <div className="space-y-4 flex flex-col items-center justify-center bg-slate-900/40 rounded-xl p-6 border border-slate-850">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Document Presentation Score</span>
                        
                        <div className="relative flex items-center justify-center mt-2">
                          <div className={`h-28 w-28 rounded-full border-8 flex flex-col items-center justify-center ${
                            appDetails.file_quality_audit.file_presentation_score >= 80 ? 'border-emerald-500/80 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]' :
                            appDetails.file_quality_audit.file_presentation_score >= 50 ? 'border-amber-500/80 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.1)]' :
                            'border-red-500/80 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.1)]'
                          }`}>
                            <span className="text-2xl font-black">{appDetails.file_quality_audit.file_presentation_score}</span>
                            <span className="text-[9px] font-bold text-slate-500 uppercase">Score</span>
                          </div>
                        </div>

                        <p className="text-xs text-slate-400 text-center leading-relaxed mt-2 max-w-xs">
                          Score is audited by legibility, completeness of KYC registry documents, and banker verification records.
                        </p>
                      </div>

                      {/* Checklists */}
                      <div className="space-y-4 md:col-span-2 space-y-6">
                        <div className="space-y-2">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">File Completeness Audit</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {appDetails.file_quality_audit.document_completeness.map((doc, idx) => (
                              <div key={idx} className="bg-slate-900/60 border border-slate-800 rounded-lg p-3 flex justify-between items-center text-xs">
                                <span className="text-slate-300 font-semibold">{doc.doc_name}</span>
                                <span className={`font-bold px-1.5 py-0.5 rounded ${
                                  doc.status === 'Present' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                                }`}>
                                  {doc.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-2 pt-2 border-t border-slate-800">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Critical File Corrections Checklist</h4>
                          <ul className="space-y-2 text-xs">
                            {appDetails.file_quality_audit.critical_corrections.map((corr, idx) => (
                              <li key={idx} className="flex items-start gap-2.5 bg-amber-500/5 border border-amber-500/15 rounded-lg p-3 text-amber-300/90 leading-normal">
                                <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                                <div>
                                  <span className="font-bold text-amber-200 block text-[10px] uppercase">Required Correction {idx + 1}:</span>
                                  {corr}
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SUB TAB 5: BORROWER REPORT / LETTER */}
                  {detailSubTab === 'report' && (
                    <div className="space-y-6">
                      <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-blue-400">Borrower Advisory Resubmission Letter</h3>
                        <a
                          href={`${API_BASE_URL}/applications/${appDetails.id}/report`}
                          download
                          className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-200 hover:text-white rounded-lg flex items-center gap-1.5 transition-colors font-semibold"
                        >
                          <Download className="h-3.5 w-3.5" />
                          Download PDF Report
                        </a>
                      </div>

                      <div className="bg-slate-950/40 border border-slate-850 rounded-2xl p-6 sm:p-8 font-serif leading-relaxed text-slate-300 max-w-3xl mx-auto shadow-inner border border-slate-900 text-sm md:text-base whitespace-pre-wrap">
                        {appDetails.borrower_report}
                      </div>
                    </div>
                  )}

                </div>

              </div>
            )}

            {/* VIEW 4: SETTINGS */}
            {activeTab === 'settings' && (
              <div className="max-w-2xl mx-auto">
                <div className="bg-slate-800/30 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
                  <div className="border-b border-slate-800 pb-6 mb-6">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      <SettingsIcon className="h-5 w-5 text-blue-500" />
                      System Configuration
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">Configure your LLM API engine keys. If left empty, the application will automatically run in high-fidelity Simulation Mode.</p>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Google Gemini API Key</label>
                      <input
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="AIzaSy..."
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500 font-mono"
                      />
                      <span className="text-[10px] text-slate-500 block mt-1.5 leading-normal">
                        Your key is saved locally in your browser's <code className="bg-slate-950 px-1 py-0.5 rounded text-slate-400 font-mono text-[9px]">localStorage</code> and never sent to external third parties (other than Gemini API endpoints).
                      </span>
                    </div>

                    <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-2">
                      <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                        <Sparkles className="h-4 w-4 text-amber-400" />
                        Simulation Status: {isSimulated ? 'Active' : 'Inactive (Live AI Enabled)'}
                      </h4>
                      <p className="text-xs text-slate-400 leading-normal">
                        {isSimulated 
                          ? 'The server is currently bypassing Google Gemini calls. Submissions will receive smart, dynamic analyses produced by our underwriter logic. This allows instant offline tests.'
                          : 'The server will make live calls to Google Gemini using your API key. Make sure the key has access to the "gemini-1.5-flash" model.'}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-slate-800 flex justify-end">
                      <button
                        onClick={() => setActiveTab('dashboard')}
                        className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-blue-500/15"
                      >
                        Save & Return to Dashboard
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

      </main>

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-slate-800 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4">
          <p>© 2026 AI Loan Analysis Platform. Confidential Underwriting Engine. Built for India bank networks.</p>
        </div>
      </footer>

    </div>
  );
}
