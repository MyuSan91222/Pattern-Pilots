import { HelpCircle, FileText, BarChart3, Upload, Download, Settings, Users, Shield, BookOpen, AlertCircle, Database, Bookmark, Zap } from 'lucide-react';

export default function HelpPage() {
  return (
    <div className="flex-1 overflow-y-auto bg-ink-950">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-10 h-10 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0">
              <HelpCircle size={20} className="text-accent" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-ink-100" style={{ fontFamily: 'Syne' }}>Help & Documentation</h1>
              <p className="text-ink-500 mt-2">Complete guide to using Attendance Analyzer effectively</p>
            </div>
          </div>
        </div>

        {/* Quick Start */}
        <div className="card mb-8 p-6 border border-accent/20 bg-accent/5">
          <div className="flex items-start gap-3 mb-3">
            <FileText size={18} className="text-accent flex-shrink-0 mt-0.5" />
            <div>
              <h2 className="font-semibold text-ink-100 text-lg mb-2">Quick Start Guide</h2>
              <ol className="space-y-2 text-sm text-ink-400">
                <li className="flex gap-3">
                  <span className="font-semibold text-accent flex-shrink-0">1.</span>
                  <span>Upload an Excel or Word file containing your attendance data</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-semibold text-accent flex-shrink-0">2.</span>
                  <span>Configure class times and scoring penalties in the Appearance settings</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-semibold text-accent flex-shrink-0">3.</span>
                  <span>Click "Analyze" on the Dashboard to process the attendance data</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-semibold text-accent flex-shrink-0">4.</span>
                  <span>View results in the interactive table with sorting and filtering</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-semibold text-accent flex-shrink-0">5.</span>
                  <span>Export results in your preferred format (CSV, TXT, or PDF)</span>
                </li>
              </ol>
            </div>
          </div>
        </div>

        {/* Uploading Files */}
        <div className="card mb-6 overflow-hidden">
          <div className="p-5 border-b border-ink-800 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0">
              <Upload size={15} className="text-accent" />
            </div>
            <h2 className="text-sm font-semibold text-ink-100" style={{ fontFamily: 'Syne' }}>Uploading Attendance Files</h2>
          </div>
          <div className="p-5">
            <ul className="space-y-3">
              <li className="flex gap-3 text-sm text-ink-300">
                <span className="text-accent font-bold flex-shrink-0">•</span>
                <span>Supported formats: Excel (.xlsx, .xls) and Word Documents (.docx)</span>
              </li>
              <li className="flex gap-3 text-sm text-ink-300">
                <span className="text-accent font-bold flex-shrink-0">•</span>
                <span>The system reads student names, ID numbers, and attendance data from your files</span>
              </li>
              <li className="flex gap-3 text-sm text-ink-300">
                <span className="text-accent font-bold flex-shrink-0">•</span>
                <span>Ensure your file has clear headers with student information</span>
              </li>
              <li className="flex gap-3 text-sm text-ink-300">
                <span className="text-accent font-bold flex-shrink-0">•</span>
                <span>Your files are processed locally in your browser and never stored on any server</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Running Analysis */}
        <div className="card mb-6 overflow-hidden">
          <div className="p-5 border-b border-ink-800 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0">
              <BarChart3 size={15} className="text-accent" />
            </div>
            <h2 className="text-sm font-semibold text-ink-100" style={{ fontFamily: 'Syne' }}>Running Analysis</h2>
          </div>
          <div className="p-5">
            <ul className="space-y-3">
              <li className="flex gap-3 text-sm text-ink-300">
                <span className="text-accent font-bold flex-shrink-0">•</span>
                <span>Click "Analyze" on the Dashboard to process your attendance data</span>
              </li>
              <li className="flex gap-3 text-sm text-ink-300">
                <span className="text-accent font-bold flex-shrink-0">•</span>
                <span>The system will calculate attendance percentages based on class sessions</span>
              </li>
              <li className="flex gap-3 text-sm text-ink-300">
                <span className="text-accent font-bold flex-shrink-0">•</span>
                <span>Late arrivals are automatically penalized according to your configured threshold</span>
              </li>
              <li className="flex gap-3 text-sm text-ink-300">
                <span className="text-accent font-bold flex-shrink-0">•</span>
                <span>Results are displayed in an interactive table with sorting and filtering</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Appearance */}
        <div className="card mb-6 overflow-hidden">
          <div className="p-5 border-b border-ink-800 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0">
              <Settings size={15} className="text-accent" />
            </div>
            <h2 className="text-sm font-semibold text-ink-100" style={{ fontFamily: 'Syne' }}>Appearance & Customization</h2>
          </div>
          <div className="p-5">
            <ul className="space-y-3">
              <li className="flex gap-3 text-sm text-ink-300">
                <span className="text-accent font-bold flex-shrink-0">•</span>
                <span>Choose from 6 accent colors: Teal, Blue, Violet, Emerald, Amber, and Rose</span>
              </li>
              <li className="flex gap-3 text-sm text-ink-300">
                <span className="text-accent font-bold flex-shrink-0">•</span>
                <span>Select your preferred body font from available options</span>
              </li>
              <li className="flex gap-3 text-sm text-ink-300">
                <span className="text-accent font-bold flex-shrink-0">•</span>
                <span>Font changes are applied instantly across the entire application</span>
              </li>
              <li className="flex gap-3 text-sm text-ink-300">
                <span className="text-accent font-bold flex-shrink-0">•</span>
                <span>Your appearance preferences are saved automatically to browser storage</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Scoring Presets */}
        <div className="card mb-6 overflow-hidden">
          <div className="p-5 border-b border-ink-800 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0">
              <Bookmark size={15} className="text-accent" />
            </div>
            <h2 className="text-sm font-semibold text-ink-100" style={{ fontFamily: 'Syne' }}>Scoring Presets</h2>
          </div>
          <div className="p-5">
            <ul className="space-y-3">
              <li className="flex gap-3 text-sm text-ink-300">
                <span className="text-accent font-bold flex-shrink-0">•</span>
                <span>Built-in presets: Standard, Strict (high penalties), Lenient (low penalties)</span>
              </li>
              <li className="flex gap-3 text-sm text-ink-300">
                <span className="text-accent font-bold flex-shrink-0">���</span>
                <span>Create custom presets by configuring scoring rules and saving them with a name</span>
              </li>
              <li className="flex gap-3 text-sm text-ink-300">
                <span className="text-accent font-bold flex-shrink-0">•</span>
                <span>Load any preset instantly to apply different scoring configurations</span>
              </li>
              <li className="flex gap-3 text-sm text-ink-300">
                <span className="text-accent font-bold flex-shrink-0">•</span>
                <span>Rename or delete custom presets anytime; built-in presets cannot be modified</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Exporting */}
        <div className="card mb-6 overflow-hidden">
          <div className="p-5 border-b border-ink-800 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0">
              <Download size={15} className="text-accent" />
            </div>
            <h2 className="text-sm font-semibold text-ink-100" style={{ fontFamily: 'Syne' }}>Exporting Results</h2>
          </div>
          <div className="p-5">
            <ul className="space-y-3">
              <li className="flex gap-3 text-sm text-ink-300">
                <span className="text-accent font-bold flex-shrink-0">•</span>
                <span>Three export formats available: CSV, TXT, and PDF</span>
              </li>
              <li className="flex gap-3 text-sm text-ink-300">
                <span className="text-accent font-bold flex-shrink-0">•</span>
                <span>Set your preferred default format in Settings → Advanced for faster exports</span>
              </li>
              <li className="flex gap-3 text-sm text-ink-300">
                <span className="text-accent font-bold flex-shrink-0">•</span>
                <span>Enable "Anonymize Exports" to replace student names with numbered IDs</span>
              </li>
              <li className="flex gap-3 text-sm text-ink-300">
                <span className="text-accent font-bold flex-shrink-0">•</span>
                <span>PDF exports include formatted tables suitable for reports</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Security */}
        <div className="card mb-6 overflow-hidden">
          <div className="p-5 border-b border-ink-800 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0">
              <Shield size={15} className="text-accent" />
            </div>
            <h2 className="text-sm font-semibold text-ink-100" style={{ fontFamily: 'Syne' }}>Security & Privacy</h2>
          </div>
          <div className="p-5">
            <ul className="space-y-3">
              <li className="flex gap-3 text-sm text-ink-300">
                <span className="text-accent font-bold flex-shrink-0">•</span>
                <span>All data is processed locally in your browser—nothing is stored on servers except user accounts</span>
              </li>
              <li className="flex gap-3 text-sm text-ink-300">
                <span className="text-accent font-bold flex-shrink-0">•</span>
                <span>Authentication uses secure httpOnly cookies and JWT tokens</span>
              </li>
              <li className="flex gap-3 text-sm text-ink-300">
                <span className="text-accent font-bold flex-shrink-0">•</span>
                <span>Passwords are hashed using bcrypt with salt rounds for maximum security</span>
              </li>
              <li className="flex gap-3 text-sm text-ink-300">
                <span className="text-accent font-bold flex-shrink-0">•</span>
                <span>Email verification protects your account from unauthorized access</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Admin Features */}
        <div className="card mb-6 overflow-hidden">
          <div className="p-5 border-b border-ink-800 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0">
              <Users size={15} className="text-accent" />
            </div>
            <h2 className="text-sm font-semibold text-ink-100" style={{ fontFamily: 'Syne' }}>Admin Features</h2>
          </div>
          <div className="p-5">
            <ul className="space-y-3">
              <li className="flex gap-3 text-sm text-ink-300">
                <span className="text-accent font-bold flex-shrink-0">•</span>
                <span>Only users with admin role can access the Admin panel (shield icon in navbar)</span>
              </li>
              <li className="flex gap-3 text-sm text-ink-300">
                <span className="text-accent font-bold flex-shrink-0">•</span>
                <span>View all registered users, their email addresses, and account creation dates</span>
              </li>
              <li className="flex gap-3 text-sm text-ink-300">
                <span className="text-accent font-bold flex-shrink-0">•</span>
                <span>Track user activity logs with timestamps and action details</span>
              </li>
              <li className="flex gap-3 text-sm text-ink-300">
                <span className="text-accent font-bold flex-shrink-0">•</span>
                <span>Monitor last login times and reset user passwords securely</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Advanced Settings */}
        <div className="card mb-6 overflow-hidden">
          <div className="p-5 border-b border-ink-800 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0">
              <Zap size={15} className="text-accent" />
            </div>
            <h2 className="text-sm font-semibold text-ink-100" style={{ fontFamily: 'Syne' }}>Advanced Settings</h2>
          </div>
          <div className="p-5">
            <ul className="space-y-3">
              <li className="flex gap-3 text-sm text-ink-300">
                <span className="text-accent font-bold flex-shrink-0">•</span>
                <span>Auto-Reanalyze: Automatically re-analyzes when scoring settings change</span>
              </li>
              <li className="flex gap-3 text-sm text-ink-300">
                <span className="text-accent font-bold flex-shrink-0">•</span>
                <span>Anonymize Exports: Replace student names with numbered IDs in all exports</span>
              </li>
              <li className="flex gap-3 text-sm text-ink-300">
                <span className="text-accent font-bold flex-shrink-0">•</span>
                <span>Persist Results: Save analysis data to browser storage across sessions</span>
              </li>
              <li className="flex gap-3 text-sm text-ink-300">
                <span className="text-accent font-bold flex-shrink-0">•</span>
                <span>Default Export Format: Pre-select your preferred export format (CSV, TXT, PDF)</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Data Management */}
        <div className="card mb-6 overflow-hidden">
          <div className="p-5 border-b border-ink-800 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0">
              <Database size={15} className="text-accent" />
            </div>
            <h2 className="text-sm font-semibold text-ink-100" style={{ fontFamily: 'Syne' }}>Data Management</h2>
          </div>
          <div className="p-5">
            <ul className="space-y-3">
              <li className="flex gap-3 text-sm text-ink-300">
                <span className="text-accent font-bold flex-shrink-0">•</span>
                <span>Storage Usage: View how much browser storage your settings and results use</span>
              </li>
              <li className="flex gap-3 text-sm text-ink-300">
                <span className="text-accent font-bold flex-shrink-0">•</span>
                <span>Settings Backup: Export your entire configuration as JSON for backup</span>
              </li>
              <li className="flex gap-3 text-sm text-ink-300">
                <span className="text-accent font-bold flex-shrink-0">•</span>
                <span>Settings Import: Restore a previously saved configuration by importing JSON</span>
              </li>
              <li className="flex gap-3 text-sm text-ink-300">
                <span className="text-accent font-bold flex-shrink-0">•</span>
                <span>Clear Saved Results: Remove analysis data from browser storage safely</span>
              </li>
            </ul>
          </div>
        </div>

        {/* FAQ */}
        <div className="card mb-8 p-6">
          <h2 className="text-lg font-semibold text-ink-100 mb-4" style={{ fontFamily: 'Syne' }}>Frequently Asked Questions</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-ink-200 mb-1.5">Is my data secure?</h3>
              <p className="text-sm text-ink-400">Yes. All analysis is performed in your browser. Only your user account is stored on the server. Files you upload are never saved—they're processed and discarded immediately.</p>
            </div>
            <div className="border-t border-ink-800 pt-4">
              <h3 className="font-medium text-ink-200 mb-1.5">What file formats are supported?</h3>
              <p className="text-sm text-ink-400">Excel files (.xlsx, .xls) and Word documents (.docx). Ensure files have clear headers and recognizable date formats for best results.</p>
            </div>
            <div className="border-t border-ink-800 pt-4">
              <h3 className="font-medium text-ink-200 mb-1.5">Can I export anonymized data?</h3>
              <p className="text-sm text-ink-400">Yes. Enable "Anonymize Exports" in Settings → Advanced. Student names will be replaced with numbered IDs (Student 001, 002, etc.).</p>
            </div>
            <div className="border-t border-ink-800 pt-4">
              <h3 className="font-medium text-ink-200 mb-1.5">How do I backup my settings?</h3>
              <p className="text-sm text-ink-400">Go to Settings → Data → Settings Backup. Click "Export JSON" to download your configuration. Import it anytime to restore your preferences.</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-ink-600 pb-6">
          <p>For additional support, contact your system administrator</p>
          <p className="mt-1">Attendance Analyzer © 2026</p>
          <div className="flex items-center justify-center gap-5 mt-3">
            <a href="https://www.instagram.com/tangbaumyusanaung?igsh=MXBub28xcDd3ZWEzeA%3D%3D&utm_source=qr" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-ink-500 hover:text-ink-300 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
              </svg>
              Instagram
            </a>
            <a href="https://x.com/TangBauMyuSan?s=21" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-ink-500 hover:text-ink-300 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
              Twitter / X
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

