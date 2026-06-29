import React, { useState } from 'react';
import { 
  Table, 
  ChevronRight, 
  Copy, 
  Check, 
  HelpCircle, 
  BookOpen, 
  Settings, 
  Percent, 
  Briefcase, 
  Wrench, 
  AlertCircle, 
  ShieldAlert, 
  FileSpreadsheet,
  Cpu,
  Layers,
  Search,
  CheckCircle,
  Database,
  Download,
  FileDown,
  Calendar
} from 'lucide-react';

interface SheetInfo {
  name: string;
  description: string;
  columns: string[];
}

export default function MasterArchitect({ token }: { token: string }) {
  const [activeSubTab, setActiveSubTab] = useState<'sheets' | 'dropdowns' | 'formulas' | 'spoc' | 'rules' | 'migration' | 'reports'>('sheets');
  const [fromDate, setFromDate] = useState(() => new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // States for interactive dependent dropdown simulator
  const [selectedProfile, setSelectedProfile] = useState<string>('Web Developer');
  const [selectedCategory, setSelectedCategory] = useState<string>('New Page Development');

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // 1. All 25 requested sheets & column schemas
  const sheets: SheetInfo[] = [
    {
      name: 'Daily_Timesheet',
      description: 'The core transactional sheet populated daily by employees. Contains log times, tasks, status, metrics, tools, and approval states.',
      columns: [
        'Entry ID', 'Date', 'Employee ID', 'Employee Name', 'Department', 'Profile / Role', 'Designation', 'Reporting Manager', 'HOD', 'Company / Brand',
        'Project / Process', 'Work Location', 'Attendance Status', 'Login Time', 'Logout Time', 'Break Time', 'Total Working Hours', 'Effective Working Hours',
        'Work Type', 'Work Category', 'Task Type', 'Task Title', 'Task Description', 'Assigned By', 'SPOC / PIC', 'Priority', 'Assigned Date', 'Deadline',
        'Planned Start Time', 'Planned End Time', 'Actual Start Time', 'Actual End Time', 'Estimated Hours', 'Actual Hours', 'Task Status', 'Completion %',
        'KPI Metric', 'Measurement Unit', 'Target', 'Actual', 'Achievement %', 'Tool Used', 'Tool Purpose', 'Proof Type', 'Proof Link', 'Output Delivered',
        'Approval Required', 'Approval Status', 'Approved By', 'Delay Reason', 'Blocker / Dependency', 'Support Required From', 'Next Action',
        'Escalation Required', 'Escalation Level', 'Escalation To', 'Remarks', 'HOD Remarks', 'MD Remarks', 'Created Timestamp', 'Updated Timestamp'
      ]
    },
    {
      name: 'Task_Master',
      description: 'Master list of all active, recurring, and planned tasks assigned across the organization.',
      columns: [
        'Task ID', 'Task Title', 'Task Description', 'Department', 'Profile / Role', 'Assigned To', 'Assigned By', 'SPOC / PIC', 'Priority', 'Assigned Date',
        'Deadline', 'Estimated Hours', 'Status', 'Completion %', 'Proof Link', 'Approval Status', 'Delay Reason', 'Escalation Level', 'Remarks'
      ]
    },
    {
      name: 'Employee_Master',
      description: 'Central directory of all staff, including designations, HODs, assigned brands, tools, and access controls.',
      columns: [
        'Employee ID', 'Employee Name', 'Department', 'Designation', 'Profile / Role', 'Reporting Manager', 'HOD', 'Company / Brand Assigned', 'Work Location',
        'Joining Date', 'Status', 'Email ID', 'Mobile Number', 'Core Responsibilities', 'Secondary Responsibilities', 'SPOC/PIC Responsibility', 'Backup Person',
        'Tools Assigned', 'Dashboard Access Level'
      ]
    },
    {
      name: 'Department_Master',
      description: 'List of departments (e.g. Development, SEO, Paid Ads, CRM, Telecalling) and associated HODs.',
      columns: ['Department ID', 'Department Name', 'HOD Name', 'Reporting Manager', 'Total Team Size', 'Status']
    },
    {
      name: 'Profile_Master',
      description: 'Defines roles and overall target productivity and key skills required.',
      columns: ['Profile ID', 'Profile / Role', 'Core Domain', 'Standard Grade', 'Daily Min Hours Required', 'Status']
    },
    {
      name: 'Profile_Task_Master',
      description: 'Stores the specific dependent mapping of Profile -> Work Category -> Task Type.',
      columns: ['Mapping ID', 'Profile / Role', 'Work Category', 'Task Type', 'Default Duration (Mins)', 'Proof Required', 'Status']
    },
    {
      name: 'KPI_Master',
      description: 'Master KPI list defining weights, metrics, targets, and how they impact overall group performance.',
      columns: [
        'KPI ID', 'Profile / Role', 'KPI Metric', 'KPI Description', 'Measurement Unit', 'Daily Target', 'Weekly Target', 'Monthly Target', 'Weightage', 'Data Source',
        'Proof Required', 'Quality Check', 'Performance Impact'
      ]
    },
    {
      name: 'Tool_Master',
      description: 'Software/tools approved for business use. Categorized by profile mapping.',
      columns: ['Tool ID', 'Tool Name', 'Tool Category', 'Approved Usage Policy', 'Cost Type', 'Owner SPOC', 'Status']
    },
    {
      name: 'SPOC_PIC_Master',
      description: 'Drives ownership across tools, brands, processes, and responsibilities. Tracks backup and escalation paths.',
      columns: [
        'SPOC/PIC ID', 'Responsibility Area', 'Process Name', 'Tool/Software Name', 'Department', 'Primary PIC', 'Secondary PIC', 'Backup Person',
        'Reporting HOD', 'Escalation Person', 'Review Frequency', 'Status'
      ]
    },
    {
      name: 'Status_Master',
      description: 'Predefined status items for tasks and timesheets.',
      columns: ['Status ID', 'Status Code', 'Display Name', 'Category (Task/Timesheet)', 'Color Code', 'Remarks']
    },
    {
      name: 'Priority_Master',
      description: 'Defines task priority tiers and maximum SLA resolution times.',
      columns: ['Priority ID', 'Priority Name', 'SLA (Hours)', 'SLA Level', 'Color Code', 'Auto Escalation (Yes/No)']
    },
    {
      name: 'Delay_Reason_Master',
      description: 'Predefined delay justifications used to block arbitrary user excuses.',
      columns: ['Reason ID', 'Delay Code', 'Delay Reason Text', 'Action Owner Department', 'Escalation Trigger Day']
    },
    {
      name: 'Approval_Master',
      description: 'Defines state management for HOD / MD approvals.',
      columns: ['Approval State ID', 'Approval Status Name', 'Allows Timesheet Closure', 'Triggers Notification', 'Action Code']
    },
    {
      name: 'Escalation_Master',
      description: 'Rules routing delay, quality or absence alerts to HOD, HODs to MD, or vendors.',
      columns: ['Escalation Level ID', 'Level Name', 'Max Ageing (Days)', 'Assigned Authority', 'Immediate SLA (Hours)', 'Channel']
    },
    {
      name: 'Dashboard_Data',
      description: 'Flattened aggregation layer dynamically generated from Timesheet and KPIs, powering charts.',
      columns: ['Record Date', 'Employee ID', 'Completed Tasks', 'Pending Tasks', 'Overdue Tasks', 'Avg KPI Ach %', 'Final score', 'Category']
    },
    {
      name: 'MD_Dashboard',
      description: 'Excel visual layer mapping cards, KPIs, workload charts, and group bottlenecks for the CEO.',
      columns: ['Card Title', 'Current Value', 'Target Value', 'Variance', 'Indicator Sparkline', 'Alert Level']
    },
    {
      name: 'HOD_Dashboard',
      description: 'Team performance charts, approval cues, and individual alert reports for HOD/Team Lead view.',
      columns: ['Employee Name', 'Shift Hours Logged', 'Task Completeness %', 'KPI Achievement %', 'Outstanding Tasks', 'Escalations Today']
    },
    {
      name: 'Individual_Dashboard',
      description: 'Daily checklist, personalized targets vs actuals, and local scoreboards for employees.',
      columns: ['Section Name', 'Metrics', 'Goal', 'Today Actual', 'Target Met (Yes/No)', 'Highlight Action Link']
    },
    {
      name: 'Pending_Task_Report',
      description: 'Consolidated report of tasks marked "In Progress", "On Hold", "Delayed", or "Not Started".',
      columns: ['Task ID', 'Assigned To', 'Task Title', 'Duration Pending', 'Target Completion', 'Blocker Remarks']
    },
    {
      name: 'Overdue_Task_Report',
      description: 'List of all tasks where Today > Deadline and Task Status is not Completed.',
      columns: ['Task ID', 'Employee Name', 'Deadline Date', 'Ageing Days', 'Priority', 'Delay Reason', 'Escalated Level']
    },
    {
      name: 'Approval_Report',
      description: 'Audit log of timesheet approvals, rejection comments, and revision turnarounds.',
      columns: ['Sheet Date', 'Submitted By', 'Total Hours Logged', 'Submitted TS', 'Approved/Rejected TS', 'Approver Name', 'Rejection Comment']
    },
    {
      name: 'Tool_Usage_Report',
      description: 'System-wide compliance audit showing which software was utilized for how many hours per person.',
      columns: ['Log Date', 'Employee Name', 'Tool Utilized', 'Purpose Category', 'Proof Live URL', 'Hourly Contribution']
    },
    {
      name: 'Performance_Score',
      description: 'Historic repository of scorecards across the six parameters scoring individuals, HODs, and departments.',
      columns: ['Month/Year', 'Entity ID', 'Entity Name', 'Type (Emp/Dept/HOD)', 'KPI Ach (40)', 'Task Comp (25)', 'Timeliness (15)', 'Attendance (10)', 'Proof (5)', 'Tool (5)', 'Total Score (100)', 'Rating Tier']
    },
    {
      name: 'Weekly_Report',
      description: 'Weekly automated performance aggregations for the business group.',
      columns: ['Week Range', 'Employee Name', 'Average Logged Hours', 'Tasks Closed', 'Avg KPI %', 'Weekly Compliance Flag']
    },
    {
      name: 'Monthly_Report',
      description: 'HOD monthly summaries, KPI scorecards, and departmental trends presented to the MD.',
      columns: ['Month', 'Department Name', 'Total Output Value', 'Avg Performance Score', 'Overdue Count', 'Top Core Performer', 'Weakest Link']
    }
  ];

  // 2. Interactive Dropdown simulator options and dependencies mapping
  const dependentDropdowns: {
    [role: string]: {
      categories: {
        [category: string]: {
          taskTypes: string[];
          kpiMetrics: string[];
          unit: 'Count' | 'Percentage' | 'Seconds' | 'Score' | 'Yes/No' | 'Rupees' | 'Ratio' | 'Views' | 'Watch Time' | 'Word Count' | 'Hours' | 'Rank Position';
          toolsUsed: string[];
          proofRequired: string;
          qualityCheck: string;
          performanceImpact: string;
        }
      }
    }
  } = {
    'Web Developer': {
      categories: {
        'New Page Development': {
          taskTypes: ['Service Page', 'Location Page', 'Landing Page', 'Blog Page', 'Campaign Page', 'Thank You Page', 'Offer Page', 'Lead Form Page', 'Dealer Page', 'Brand Page'],
          kpiMetrics: ['Landing Pages Delivered', 'Pages Created'],
          unit: 'Count',
          toolsUsed: ['WordPress', 'cPanel', 'Hosting Panel', 'Cloudflare'],
          proofRequired: 'Published Page Link or URL',
          qualityCheck: 'Mobile Responsive, Desktop Responsive, Form Working, SSL Working',
          performanceImpact: 'Lead Generation, User Experience, Brand Authority'
        },
        'Page Optimization': {
          taskTypes: ['Layout Improvement', 'CTA Improvement', 'Image Optimization', 'Content Placement', 'Internal Linking', 'Form Placement', 'Mobile View Fix', 'Desktop View Fix', 'Conversion Optimization'],
          kpiMetrics: ['Pages Optimized', 'Website Speed Improved', 'Core Web Vitals Improved'],
          unit: 'Seconds',
          toolsUsed: ['WordPress', 'Google Analytics 4', 'ChatGPT'],
          proofRequired: 'GTmetrix Report or PageSpeed Report',
          qualityCheck: 'Speed Improved, No Broken Elements, CTA highly visible',
          performanceImpact: 'Speed Improvement, Conversion Improvement'
        },
        'Page Integration': {
          taskTypes: ['CRM Form Integration', 'WhatsApp Button Integration', 'Call Button Integration', 'Google Sheet Integration', 'Payment Link Integration', 'API Integration', 'Lead Source Mapping'],
          kpiMetrics: ['Forms Integrated', 'Integrations Completed'],
          unit: 'Count',
          toolsUsed: ['WordPress', 'Google Tag Manager', 'CRM'],
          proofRequired: 'CRM Lead Test Screenshot or Live URL',
          qualityCheck: 'Form Working, Tracking Working, Leads Matching CRM',
          performanceImpact: 'Tracking Accuracy, Lead Capture Rate'
        },
        'Website Monitoring': {
          taskTypes: ['Uptime Check', 'Broken Link Check', 'Form Testing', 'Page Speed Check', 'Mobile Testing', 'Desktop Testing', 'Error Page Check', 'SSL Check', 'Plugin Check'],
          kpiMetrics: ['Uptime Maintained', 'Bugs Fixed'],
          unit: 'Percentage',
          toolsUsed: ['Cloudflare', 'Hosting Panel', 'Google Search Console'],
          proofRequired: 'Uptime Report Screenshot or Form Test Screenshot',
          qualityCheck: 'SSL Working, No 404 Errors, Form Submission OK',
          performanceImpact: 'Bug Reduction, User Experience, System Stability'
        }
      }
    },
    'SEO Executive': {
      categories: {
        'Keyword Research': {
          taskTypes: ['New Keywords', 'Service Keywords', 'Location Keywords', 'Competitor Keywords', 'Blog Keywords', 'Long-Tail Keywords'],
          kpiMetrics: ['Keywords Improved', 'Technical Issues Found'],
          unit: 'Rank Position',
          toolsUsed: ['SEMrush', 'Google Search Console', 'Google Sheets'],
          proofRequired: 'SEO Sheet Link or Keyword Report',
          qualityCheck: 'Intent Validated, Search Volume Checked, Approved by HOD',
          performanceImpact: 'Ranking Growth, Organic Search Traffic'
        },
        'On-Page SEO': {
          taskTypes: ['Meta Title', 'Meta Description', 'H1/H2 Update', 'Internal Linking', 'Image Alt Tags', 'URL Optimization', 'Content Optimization'],
          kpiMetrics: ['Pages Optimized', 'CTR Improved'],
          unit: 'Percentage',
          toolsUsed: ['SEMrush', 'WordPress', 'Google Sheets', 'ChatGPT'],
          proofRequired: 'Search Console Screenshot or Live URL',
          qualityCheck: 'Keywords Added, Meta Updated, Page Indexing checked',
          performanceImpact: 'CTR Improvement, Ranking Growth'
        },
        'Off-Page SEO': {
          taskTypes: ['Backlink Creation', 'Citation Submission', 'Guest Posting', 'Directory Submission', 'Classified Submission', 'Profile Creation'],
          kpiMetrics: ['Backlinks Created', 'Local Visibility Improved'],
          unit: 'Count',
          toolsUsed: ['Google Sheets', 'Google Drive', 'SEMrush'],
          proofRequired: 'Backlink Live URL or Submission Screenshot',
          qualityCheck: 'High DA (>40) Backlink, Spam Score < 2%, Live Status checked',
          performanceImpact: 'Ranking Growth, Domain Authority Improvement'
        },
        'Google Business Profile': {
          taskTypes: ['GBP Post', 'Service Update', 'Photo Upload', 'Review Reply', 'Q&A Update', 'Product Update'],
          kpiMetrics: ['GBP Posts Done', 'Local Visibility Improved'],
          unit: 'Count',
          toolsUsed: ['Google Business Profile', 'Canva', 'ChatGPT'],
          proofRequired: 'GBP Post URL or Admin Panel Screenshot',
          qualityCheck: 'Address & Phone consistent, Image optimized, Hashtags Added',
          performanceImpact: 'Local Visibility, Direct Phone Calls, Local Leads'
        }
      }
    },
    'Performance Marketer / Paid Ads Executive': {
      categories: {
        'Google Ads': {
          taskTypes: ['Search Campaign', 'Display Campaign', 'Performance Max', 'Lead Campaign', 'Call Campaign', 'Location Campaign', 'Remarketing Campaign'],
          kpiMetrics: ['Leads Generated', 'CPL', 'CTR', 'Spend Utilization'],
          unit: 'Rupees',
          toolsUsed: ['Google Ads', 'Google Analytics 4', 'Google Tag Manager', 'Looker Studio'],
          proofRequired: 'Google Ads Admin Panel Screenshot',
          qualityCheck: 'Budget capped correctly, Tracking tags active, Conversions firing',
          performanceImpact: 'Lead Growth, CPA optimization, ROI'
        },
        'Meta Ads': {
          taskTypes: ['Lead Campaign', 'Traffic Campaign', 'Engagement Campaign', 'Retargeting Campaign', 'Offer Campaign', 'Video Campaign'],
          kpiMetrics: ['Leads Generated', 'CPL', 'Conversion Rate', 'Lead Quality %'],
          unit: 'Count',
          toolsUsed: ['Meta Ads Manager', 'Canva', 'CRM', 'Google Sheets'],
          proofRequired: 'Ads Manager Spend/Leads Screenshot',
          qualityCheck: 'Audience targeted, Meta Pixel working, Lead form matching CRM',
          performanceImpact: 'Lead Quality Improvement, Campaign Scale'
        },
        'Campaign Optimization': {
          taskTypes: ['Budget Optimization', 'Bid Optimization', 'Keyword Pause', 'Search Term Review', 'Placement Review', 'Audience Refinement', 'Ad Copy Testing'],
          kpiMetrics: ['Campaign ROAS', 'CPL', 'Budget Utilization'],
          unit: 'Percentage',
          toolsUsed: ['Google Ads', 'Meta Ads Manager', 'Google Sheets'],
          proofRequired: 'Before/After CPL Screenshot or Campaign Sheet',
          qualityCheck: 'Junk keywords excluded, Low-performing ad sets paused',
          performanceImpact: 'Budget Efficiency, Lower Cost Per Acquisition'
        }
      }
    },
    'Social Media Executive': {
      categories: {
        'Content Calendar': {
          taskTypes: ['Monthly Calendar', 'Weekly Calendar', 'Festival Calendar', 'Campaign Calendar', 'Offer Calendar'],
          kpiMetrics: ['Stories Published', 'Engagement Rate'],
          unit: 'Percentage',
          toolsUsed: ['Canva', 'Meta Business Suite', 'Google Sheets', 'ChatGPT'],
          proofRequired: 'Content Calendar Link or Sheet Link',
          qualityCheck: 'Visual consistency, approved hashtags, brand guidelines followed',
          performanceImpact: 'Brand Visibility, Audience Growth'
        },
        'Post Publishing': {
          taskTypes: ['Static Post', 'Carousel Post', 'Service Post', 'Offer Post', 'Testimonial Post', 'Awareness Post'],
          kpiMetrics: ['Posts Published', 'Reach', 'Impressions'],
          unit: 'Count',
          toolsUsed: ['Meta Business Suite', 'Instagram', 'Facebook'],
          proofRequired: 'Published Post Link',
          qualityCheck: 'Posted on time, correct tags, no spelling errors, graphic approved',
          performanceImpact: 'Brand Engagement, Offer Traction'
        }
      }
    },
    'Graphic Designer': {
      categories: {
        'Social Media Creative': {
          taskTypes: ['Static Post', 'Carousel', 'Festival Post', 'Offer Post', 'Testimonial Post', 'Service Post'],
          kpiMetrics: ['Creatives Delivered', 'Approved Creatives', 'First-Time Approval %'],
          unit: 'Count',
          toolsUsed: ['Canva', 'Photoshop', 'Illustrator'],
          proofRequired: 'Canva Link or JPG/PNG Live Link',
          qualityCheck: 'Correct sizes, high resolution, company logo branding, no spelling issues',
          performanceImpact: 'Social Media Output, Brand Quality, CTR support'
        },
        'Ad Creative': {
          taskTypes: ['Google Display Banner', 'Meta Ad Creative', 'Lead Ad Creative', 'Retargeting Creative', 'Video Thumbnail'],
          kpiMetrics: ['Creatives Delivered', 'Design Quality Score'],
          unit: 'Score',
          toolsUsed: ['Canva', 'Photoshop', 'Google Drive'],
          proofRequired: 'Drive link or Campaign Ad screenshot',
          qualityCheck: 'CTA visible, proper aspect ratio, legible text under overlay',
          performanceImpact: 'PPC CTR support, Lead Quality support'
        }
      }
    }
  };

  const currentRoleConfig = dependentDropdowns[selectedProfile] || { categories: {} };
  const categoriesList = Object.keys(currentRoleConfig.categories);
  const currentCategoryConfig = currentRoleConfig.categories[selectedCategory] || (categoriesList[0] ? currentRoleConfig.categories[categoriesList[0]] : null);

  const handleProfileChange = (profile: string) => {
    setSelectedProfile(profile);
    const configs = dependentDropdowns[profile];
    if (configs && Object.keys(configs.categories).length > 0) {
      setSelectedCategory(Object.keys(configs.categories)[0]);
    }
  };

  const downloadReport = async (type: 'attendance' | 'timesheet') => {
    try {
      setDownloading(type);
      const res = await fetch(`/api/admin/reports/${type}?from=${fromDate}&to=${toDate}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch report data');
      const data = await res.json();

      // Dynamically import xlsx
      const XLSX = await import('xlsx');
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, type === 'attendance' ? 'Attendance' : 'Timesheet');
      XLSX.writeFile(wb, `${type}_report_${fromDate}_to_${toDate}.xlsx`);
    } catch (err) {
      alert('Download failed. Please try again.');
      console.error(err);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="flex-1 p-6 lg:p-8 space-y-6 max-w-7xl mx-auto overflow-y-auto">
      
      {/* Visual Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-150 pb-5">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider mb-1">
            <Layers className="h-4 w-4" /> System blueprint & mappings
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-gray-900 font-display">
            Excel & System Architect
          </h2>
          <p className="text-sm text-gray-500 mt-1 max-w-2xl">
            View the absolute professional spreadsheet layout, formulas, validations, and mapping configurations required for TSG Digital & Tech business tracking.
          </p>
        </div>
        <div className="flex gap-2">
          <a 
            href="#interactive-dropdowns"
            onClick={() => setActiveSubTab('dropdowns')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-semibold hover:bg-indigo-100 transition-all border border-indigo-150"
          >
            <Cpu className="h-3.5 w-3.5" /> Dropdown Simulator
          </a>
        </div>
      </div>

      {/* Subtab Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setActiveSubTab('sheets')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold border-b-2 transition-all ${
            activeSubTab === 'sheets' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <FileSpreadsheet className="h-4 w-4" /> All 25 Sheets & Columns
        </button>
        <button
          onClick={() => {
            setActiveSubTab('dropdowns');
            // Trigger setup
            const initialRole = Object.keys(dependentDropdowns)[0];
            setSelectedProfile(initialRole);
            setSelectedCategory(Object.keys(dependentDropdowns[initialRole].categories)[0]);
          }}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold border-b-2 transition-all ${
            activeSubTab === 'dropdowns' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Cpu className="h-4 w-4" /> Dependent Dropdown Logic
        </button>
        <button
          onClick={() => setActiveSubTab('formulas')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold border-b-2 transition-all ${
            activeSubTab === 'formulas' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Percent className="h-4 w-4" /> Performance Scores & Formulas
        </button>
        <button
          onClick={() => setActiveSubTab('spoc')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold border-b-2 transition-all ${
            activeSubTab === 'spoc' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Briefcase className="h-4 w-4" /> SPOC PIC & Tool Masters
        </button>
        <button
          onClick={() => setActiveSubTab('rules')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold border-b-2 transition-all ${
            activeSubTab === 'rules' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <ShieldAlert className="h-4 w-4" /> Formatting & Validations
        </button>
        <button
          onClick={() => setActiveSubTab('migration')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold border-b-2 transition-all ${
            activeSubTab === 'migration' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Database className="h-4 w-4" /> Excel to Web App Migration
        </button>
        <button
          onClick={() => setActiveSubTab('reports')}
          className={`flex items-center gap-1.5 px-3 py-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeSubTab === 'reports' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <FileDown className="h-4 w-4" /> Download Reports
        </button>
      </div>

      {/* RENDER CONTENT PANELS */}
      {activeSubTab === 'sheets' && (
        <div className="space-y-6">
          <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl text-xs text-indigo-800 flex gap-2.5 items-start">
            <BookOpen className="h-5 w-5 shrink-0 text-indigo-600" />
            <div>
              <p className="font-bold">25 Core Sheets / Tabs Architecture</p>
              <p className="mt-1 leading-relaxed">
                Below is the comprehensive database of 25 sheets requested. Each card details the precise columns needed to implement the schema in Google Sheets or a relational database, complete with ready-to-copy lists.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sheets.map((sheet, index) => (
              <div key={sheet.name} className="bg-white border border-gray-200 rounded-xl shadow-xs flex flex-col hover:shadow-md transition-all">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                  <div className="flex items-center gap-2">
                    <span className="h-5 w-5 rounded bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-700">
                      {index + 1}
                    </span>
                    <p className="text-xs font-bold text-gray-900 font-mono">{sheet.name}</p>
                  </div>
                  <button
                    onClick={() => handleCopy(sheet.columns.join('\n'), sheet.name)}
                    className="p-1 text-gray-400 hover:text-indigo-600 transition-all rounded hover:bg-gray-100"
                    title="Copy Column List"
                  >
                    {copiedText === sheet.name ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <p className="text-[11px] text-gray-500 leading-relaxed mb-3">
                    {sheet.description}
                  </p>
                  <div className="border-t border-dashed border-gray-150 pt-3">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 flex justify-between">
                      <span>Columns ({sheet.columns.length})</span>
                      <span className="text-[9px] font-normal text-indigo-600 hover:underline cursor-pointer" onClick={() => handleCopy(sheet.columns.join(','), `${sheet.name}-csv`)}>
                        Copy CSV
                      </span>
                    </p>
                    <div className="max-h-24 overflow-y-auto bg-gray-50 p-2 rounded-lg border border-gray-150 text-[10px] text-gray-600 font-mono leading-tight space-y-1 scrollbar-thin">
                      {sheet.columns.map((col, idx) => (
                        <div key={idx} className="flex gap-1.5">
                          <span className="text-gray-300 select-none">#{(idx+1).toString().padStart(2, '0')}</span>
                          <span className="text-gray-800">{col}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeSubTab === 'dropdowns' && (
        <div className="space-y-6" id="interactive-dropdowns">
          <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-xs text-emerald-800 flex gap-2.5 items-start">
            <Cpu className="h-5 w-5 shrink-0 text-emerald-600" />
            <div>
              <p className="font-bold">Profile-Driven Dependent Dropdowns</p>
              <p className="mt-1 leading-relaxed">
                To guarantee zero-error compliance, users must never write random text. Selecting a **Profile** automatically restricts and locks down the subsequent fields. Test the interactive simulator below.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-white p-6 border border-gray-200 rounded-2xl shadow-xs">
            {/* Control Panel (left side) */}
            <div className="lg:col-span-4 space-y-4 border-r border-gray-150 pr-0 lg:pr-6">
              <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">Select Mock Profile</h4>
              
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">1. Profile / Role Dropdown</label>
                <select
                  value={selectedProfile}
                  onChange={(e) => handleProfileChange(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-800"
                >
                  {Object.keys(dependentDropdowns).map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">2. Work Category (Dependent)</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-800"
                >
                  {categoriesList.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100 text-[10px] text-indigo-700 leading-normal">
                <p className="font-bold flex items-center gap-1.5"><HelpCircle className="h-3.5 w-3.5" /> Dependent Logic Sequence</p>
                <p className="mt-1">
                  Profile <ChevronRight className="inline-block h-3 w-3" /> Work Category <ChevronRight className="inline-block h-3 w-3" /> Task Type <ChevronRight className="inline-block h-3 w-3" /> KPI Metric <ChevronRight className="inline-block h-3 w-3" /> Measurement Unit <ChevronRight className="inline-block h-3 w-3" /> Tool Used <ChevronRight className="inline-block h-3 w-3" /> Proof Required <ChevronRight className="inline-block h-3 w-3" /> Quality Check <ChevronRight className="inline-block h-3 w-3" /> Performance Impact
                </p>
              </div>
            </div>

            {/* Simulated locked outputs */}
            <div className="lg:col-span-8 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Locked Dropdown Options for {selectedProfile}</h4>
                <span className="text-[10px] font-bold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full uppercase">Dynamic lock active</span>
              </div>

              {currentCategoryConfig ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Task Types */}
                  <div className="bg-gray-50 p-4 border border-gray-200 rounded-xl">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">3. Task Type Dropdown</p>
                    <ul className="text-xs text-gray-800 space-y-1 font-mono">
                      {currentCategoryConfig.taskTypes.map((type, i) => (
                        <li key={i} className="flex items-center gap-1.5 bg-white px-2 py-1 rounded border border-gray-150">
                          <CheckCircle className="h-3 w-3 text-emerald-500 shrink-0" />
                          <span>{type}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* KPI Metrics */}
                  <div className="bg-gray-50 p-4 border border-gray-200 rounded-xl">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">4. KPI Metric & Unit (Dependent)</p>
                    <div className="space-y-2">
                      <div className="bg-white px-2 py-1.5 rounded border border-gray-150 text-xs font-mono">
                        <p className="text-[9px] font-semibold text-gray-400">Restricted Metric:</p>
                        <p className="text-gray-900 font-bold">{currentCategoryConfig.kpiMetrics.join(', ')}</p>
                      </div>
                      <div className="bg-white px-2 py-1.5 rounded border border-gray-150 text-xs font-mono">
                        <p className="text-[9px] font-semibold text-gray-400">Measurement Unit:</p>
                        <p className="text-gray-900 font-bold">{currentCategoryConfig.unit}</p>
                      </div>
                    </div>
                  </div>

                  {/* Tools Used */}
                  <div className="bg-gray-50 p-4 border border-gray-200 rounded-xl">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">5. Tool Used Dropdown (Dependent)</p>
                    <ul className="text-xs text-gray-800 space-y-1 font-mono">
                      {currentCategoryConfig.toolsUsed.map((tool, i) => (
                        <li key={i} className="flex items-center gap-1.5 bg-white px-2 py-1 rounded border border-gray-150">
                          <span className="h-1.5 w-1.5 rounded-full bg-indigo-500"></span>
                          <span>{tool}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Standardized Metadata */}
                  <div className="bg-gray-50 p-4 border border-gray-200 rounded-xl space-y-3">
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">6. Proof Required</p>
                      <p className="text-xs font-semibold text-gray-800 font-mono bg-white px-2.5 py-1.5 rounded border border-gray-150">
                        {currentCategoryConfig.proofRequired}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">7. Quality Check</p>
                      <p className="text-xs font-semibold text-gray-800 font-mono bg-white px-2.5 py-1.5 rounded border border-gray-150 leading-snug">
                        {currentCategoryConfig.qualityCheck}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">8. Performance Impact</p>
                      <p className="text-xs font-semibold text-gray-800 font-mono bg-white px-2.5 py-1.5 rounded border border-gray-150">
                        {currentCategoryConfig.performanceImpact}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-500">Choose a valid role and category to load dependencies.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'formulas' && (
        <div className="space-y-6">
          <div className="p-4 bg-purple-50 border border-purple-100 rounded-xl text-xs text-purple-800 flex gap-2.5 items-start">
            <Percent className="h-5 w-5 shrink-0 text-purple-600" />
            <div>
              <p className="font-bold">Dynamic Performance Scoring System (Out of 100)</p>
              <p className="mt-1 leading-relaxed">
                The business group tracks performance objectively based on exactly 6 parameters. Formulas must be mapped directly in the dashboard tabs using conditional logic.
              </p>
            </div>
          </div>

          {/* Formulas breakdown card */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-6">
            <h3 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-3">Parameter Weightages & Spreadsheet Formulas</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-gray-50 p-4 border border-gray-200 rounded-xl relative">
                <span className="absolute top-3 right-3 text-xs font-extrabold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">40%</span>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">1. KPI Achievement Score</p>
                <p className="text-xs text-gray-600 mb-2 leading-relaxed">Tracks actual KPI metrics submitted compared directly to targets.</p>
                <div className="bg-white p-2 rounded border border-gray-150 font-mono text-[10px] text-gray-800">
                  <p className="text-[8px] text-gray-400 uppercase font-semibold">Google Sheets Formula:</p>
                  <p className="mt-1 font-bold">=IF(Target=0, 100, (Actual/Target)*100)</p>
                </div>
              </div>

              <div className="bg-gray-50 p-4 border border-gray-200 rounded-xl relative">
                <span className="absolute top-3 right-3 text-xs font-extrabold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">25%</span>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">2. Task Completion Score</p>
                <p className="text-xs text-gray-600 mb-2 leading-relaxed">Percentage of assigned tasks completed successfully.</p>
                <div className="bg-white p-2 rounded border border-gray-150 font-mono text-[10px] text-gray-800">
                  <p className="text-[8px] text-gray-400 uppercase font-semibold">Google Sheets Formula:</p>
                  <p className="mt-1 font-bold">=(COUNTIF(StatusRange, &quot;Completed&quot;)/COUNTA(StatusRange))*100</p>
                </div>
              </div>

              <div className="bg-gray-50 p-4 border border-gray-200 rounded-xl relative">
                <span className="absolute top-3 right-3 text-xs font-extrabold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">15%</span>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">3. Timeliness Score</p>
                <p className="text-xs text-gray-600 mb-2 leading-relaxed">Tracks tasks closed before the specified Deadline date.</p>
                <div className="bg-white p-2 rounded border border-gray-150 font-mono text-[10px] text-gray-800">
                  <p className="text-[8px] text-gray-400 uppercase font-semibold">Google Sheets Formula:</p>
                  <p className="mt-1 font-bold">=COUNTIFS(StatusRange, &quot;Completed&quot;, ActualDateRange, &quot;&lt;=&quot;&amp;DeadlineRange)/COUNTIF(StatusRange, &quot;Completed&quot;)*100</p>
                </div>
              </div>

              <div className="bg-gray-50 p-4 border border-gray-200 rounded-xl relative">
                <span className="absolute top-3 right-3 text-xs font-extrabold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">10%</span>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">4. Attendance Score</p>
                <p className="text-xs text-gray-600 mb-2 leading-relaxed">Discipline and presence tracker of working days.</p>
                <div className="bg-white p-2 rounded border border-gray-150 font-mono text-[10px] text-gray-800">
                  <p className="text-[8px] text-gray-400 uppercase font-semibold">Google Sheets Formula:</p>
                  <p className="mt-1 font-bold">=COUNTIF(AttendanceRange, &quot;Present&quot;)/TotalWorkingDays*100</p>
                </div>
              </div>

              <div className="bg-gray-50 p-4 border border-gray-200 rounded-xl relative">
                <span className="absolute top-3 right-3 text-xs font-extrabold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">5%</span>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">5. Proof Quality Score</p>
                <p className="text-xs text-gray-600 mb-2 leading-relaxed">Audit checking that proof links (URLs, drive links) are uploaded.</p>
                <div className="bg-white p-2 rounded border border-gray-150 font-mono text-[10px] text-gray-800">
                  <p className="text-[8px] text-gray-400 uppercase font-semibold">Google Sheets Formula:</p>
                  <p className="mt-1 font-bold">=COUNTIFS(StatusRange, &quot;Completed&quot;, ProofRange, &quot;&lt;&gt;&quot;&amp;&quot;&quot;)/COUNTIF(StatusRange, &quot;Completed&quot;)*100</p>
                </div>
              </div>

              <div className="bg-gray-50 p-4 border border-gray-200 rounded-xl relative">
                <span className="absolute top-3 right-3 text-xs font-extrabold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">5%</span>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">6. Tool Compliance Score</p>
                <p className="text-xs text-gray-600 mb-2 leading-relaxed">Compliance showing that the standardized software was logged.</p>
                <div className="bg-white p-2 rounded border border-gray-150 font-mono text-[10px] text-gray-800">
                  <p className="text-[8px] text-gray-400 uppercase font-semibold">Google Sheets Formula:</p>
                  <p className="mt-1 font-bold">=COUNTIFS(ToolLoggedRange, &quot;&lt;&gt;&quot;&amp;&quot;&quot;)/COUNTA(ToolLoggedRange)*100</p>
                </div>
              </div>
            </div>

            {/* Performance Ranking Matrix */}
            <div className="border-t border-gray-100 pt-5 space-y-3">
              <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Group Rating & Category Thresholds</h4>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
                  <p className="text-xs font-bold text-emerald-800 font-mono">90 - 100</p>
                  <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide mt-1">Excellent</p>
                </div>
                <div className="bg-teal-50 border border-teal-200 rounded-xl p-3 text-center">
                  <p className="text-xs font-bold text-teal-800 font-mono">75 - 89</p>
                  <p className="text-[10px] font-bold text-teal-600 uppercase tracking-wide mt-1">Good</p>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
                  <p className="text-xs font-bold text-amber-800 font-mono">60 - 74</p>
                  <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wide mt-1">Average</p>
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-center">
                  <p className="text-xs font-bold text-orange-800 font-mono">40 - 59</p>
                  <p className="text-[10px] font-bold text-orange-600 uppercase tracking-wide mt-1">Needs Imp.</p>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center col-span-2 sm:col-span-1">
                  <p className="text-xs font-bold text-red-800 font-mono">&lt; 40</p>
                  <p className="text-[10px] font-bold text-red-600 uppercase tracking-wide mt-1">Critical</p>
                </div>
              </div>
            </div>

            {/* Combined Formula */}
            <div className="bg-slate-900 p-4 rounded-xl text-white font-mono text-[10px] space-y-2">
              <p className="text-[8px] text-gray-400 uppercase font-semibold">Ultimate Final Performance Formula (Excel cell compilation):</p>
              <p className="text-indigo-300 whitespace-pre-wrap leading-relaxed">
                =IFERROR((KPI_Score*0.4) + (Task_Comp_Score*0.25) + (Timeliness_Score*0.15) + (Attendance_Score*0.1) + (Proof_Score*0.05) + (Tool_Score*0.05), 0)
              </p>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'spoc' && (
        <div className="space-y-6">
          <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-800 flex gap-2.5 items-start">
            <Briefcase className="h-5 w-5 shrink-0 text-blue-600" />
            <div>
              <p className="font-bold">SPOC/PIC Process Ownership & Tool Mappings</p>
              <p className="mt-1 leading-relaxed">
                Standardized tool mapping by role and designated Process Areas (Single Point of Contact / Person in Charge) across all of TSG Digital and Brand operations.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* SPOC Mappings */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider border-b border-gray-100 pb-3 flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-indigo-600" /> Process Ownership (SPOC/PIC Area Master)
              </h3>
              <div className="space-y-2">
                {[
                  { area: 'Website Management', process: 'Portal Speed, SSL, cPanel', primary: 'Harsh / Atul', hod: 'Alka Rawat' },
                  { area: 'Google Business Profile', process: 'Daily posting & reviews replies', primary: 'Dev Sharma', hod: 'Ganesh Kumar' },
                  { area: 'Paid Ads Optimization', process: 'Lead counts & CPA audits', primary: 'Ravi Kumar', hod: 'Head of Digital' },
                  { area: 'CRM Workflow Automation', process: 'Bitrix24 integration & triggers', primary: 'Arpan / Keshav', hod: 'Head of Digital' },
                  { area: 'Social Media Posts', process: 'Video releases & stories tracking', primary: 'Divya Goel', hod: 'Alka Rawat' },
                  { area: 'Video Production', process: 'AI Editor & Voiceover checks', primary: 'Pratyaksh Kain', hod: 'Alka Rawat' }
                ].map((item, i) => (
                  <div key={i} className="p-3 bg-gray-50 rounded-xl border border-gray-150 flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold text-gray-900 font-mono">{item.area}</p>
                      <p className="text-[10px] text-gray-500">{item.process}</p>
                    </div>
                    <div className="text-right text-[10px]">
                      <p className="font-bold text-indigo-700">PIC: {item.primary}</p>
                      <p className="text-gray-400">HOD: {item.hod}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Approved Tools Mapping */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider border-b border-gray-100 pb-3 flex items-center gap-1.5">
                <Wrench className="h-4 w-4 text-indigo-600" /> Pre-Approved Tool Mapping List
              </h3>
              <div className="space-y-2">
                {[
                  { role: 'Web Developer', tools: 'WordPress, cPanel, Hosting Panel, Cloudflare, GTM, Google Analytics 4, Google Sheets' },
                  { role: 'SEO Executive', tools: 'SEMrush, GSC, Google Analytics 4, WordPress, Google Sheets, ChatGPT, GBP' },
                  { role: 'Paid Ads Executive', tools: 'Google Ads, Meta Ads Manager, GA4, GTM, CRM, Looker Studio, Google Sheets' },
                  { role: 'Social Media', tools: 'Meta Business Suite, Canva, Google Drive, Instagram, Facebook, ChatGPT' },
                  { role: 'Graphic Designer', tools: 'Canva, Photoshop, Illustrator, Google Drive' },
                  { role: 'Video Editor', tools: 'Premiere Pro, CapCut, Canva, Google Drive' },
                  { role: 'Content Writer', tools: 'Google Docs, WordPress, SEMrush, ChatGPT, Google Sheets' },
                  { role: 'CRM / Telecaller', tools: 'CRM, MCube, CloudConnect, Freshworks, Bitrix24, AutoSherpa, Wati, Excel' }
                ].map((item, i) => (
                  <div key={i} className="p-3 bg-gray-50 rounded-xl border border-gray-150 text-xs">
                    <p className="font-bold text-indigo-600 font-mono">{item.role}</p>
                    <p className="text-[10px] text-gray-600 mt-1 font-mono leading-relaxed">{item.tools}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'rules' && (
        <div className="space-y-6">
          <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl text-xs text-orange-800 flex gap-2.5 items-start">
            <AlertCircle className="h-5 w-5 shrink-0 text-orange-600" />
            <div>
              <p className="font-bold">Automations, Validations & Conditional Formatting Rules</p>
              <p className="mt-1 leading-relaxed">
                Rules embedded in the tracking sheets to force maximum compliance, prevent fake data, and highlight issues for HODs and the MD.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Conditional Formatting */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider border-b border-gray-100 pb-3 flex items-center gap-1.5 text-indigo-600">
                <Layers className="h-4 w-4" /> Conditional Formatting
              </h3>
              <div className="space-y-2">
                {[
                  { text: 'Green', usage: 'Completed Status / Approved timesheets', color: 'bg-emerald-50 text-emerald-800 border-emerald-150' },
                  { text: 'Yellow', usage: 'Pending Status / Pending HOD approval', color: 'bg-amber-50 text-amber-800 border-amber-150' },
                  { text: 'Red', usage: 'Overdue Tasks / Rejected timesheets', color: 'bg-red-50 text-red-800 border-red-150' },
                  { text: 'Orange', usage: 'Waiting for Approval state', color: 'bg-orange-50 text-orange-800 border-orange-150' },
                  { text: 'Dark Red', usage: 'Critical Escalations directly to MD', color: 'bg-rose-900 text-white border-rose-950' },
                  { text: 'Blue', usage: 'In Progress / Active Shift statuses', color: 'bg-indigo-50 text-indigo-800 border-indigo-150' },
                  { text: 'Purple', usage: 'Rework Required state', color: 'bg-purple-50 text-purple-800 border-purple-150' }
                ].map((item, i) => (
                  <div key={i} className={`p-2.5 rounded-xl border flex justify-between text-xs font-semibold ${item.color}`}>
                    <span>{item.text}</span>
                    <span className="text-[10px] font-normal opacity-80">{item.usage}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Validation Rules */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider border-b border-gray-100 pb-3 flex items-center gap-1.5 text-indigo-600">
                <ShieldAlert className="h-4 w-4" /> Hard Validation Rules
              </h3>
              <div className="space-y-2 text-xs leading-relaxed text-gray-700">
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl">
                  <p className="font-bold text-gray-900">1. Proof of Work Rule</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">Employee CANNOT submit a completed task without an active Proof URL/screenshot path if requested by the KPI Master.</p>
                </div>
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl">
                  <p className="font-bold text-gray-900">2. Completion % Lock</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">If status is &quot;Not Started&quot;, completion % must lock to 0%. If status is &quot;Completed&quot;, it must lock to 100%.</p>
                </div>
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl">
                  <p className="font-bold text-gray-900">3. Overdue Escalation Logic</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">Any critical task remaining overdue past its deadline automatically overrides of &quot;Escalation Required = Yes&quot;.</p>
                </div>
              </div>
            </div>

            {/* Automation Mappings */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider border-b border-gray-100 pb-3 flex items-center gap-1.5 text-indigo-600">
                <Cpu className="h-4 w-4" /> Automations & Triggers
              </h3>
              <div className="space-y-2 text-xs leading-relaxed text-gray-700">
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl">
                  <p className="font-bold text-gray-900">Automatic Hours Calc</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">Total Working Hours and Effective Working Hours (Subtracting breaks) are computed automatically based on clock-in and out timestamps.</p>
                </div>
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl">
                  <p className="font-bold text-gray-900">Notifications Engine</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">Approvals trigger real-time notification records in the system. Rejection states force the timesheet state back to Rework Required.</p>
                </div>
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl">
                  <p className="font-bold text-gray-900">Absence & Submission Reminders</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">Any active user with no clock-in log by 11:00 AM triggers an immediate alert. Missing timesheets are highlighted at 6:30 PM.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'migration' && (
        <div className="space-y-6">
          <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl text-xs text-indigo-800 flex gap-2.5 items-start">
            <Database className="h-5 w-5 shrink-0 text-indigo-600" />
            <div>
              <p className="font-bold">Spreadsheet to Web App Migration Playbook</p>
              <p className="mt-1 leading-relaxed">
                Step-by-step methodology to configure these 25 tabs in Excel/Google Sheets first, followed by our enterprise React & Node web application blueprint.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Sheet Implementation */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider border-b border-gray-100 pb-3 flex items-center gap-1.5">
                <FileSpreadsheet className="h-4 w-4 text-indigo-600" /> Excel & Google Sheet Implementation Guide
              </h3>
              <div className="space-y-3 text-xs text-gray-700 leading-relaxed">
                <p>
                  <strong className="text-gray-900">Phase 1: Configure Masters.</strong> Create the master tabs for Employees, SPOC, Tools, KPI, Departments, and Statuses first. Fill them with pre-vetted dropdown values.
                </p>
                <p>
                  <strong className="text-gray-900">Phase 2: Data Validation.</strong> Use the Excel / Google Sheets <code className="bg-gray-100 px-1 py-0.5 rounded font-mono font-bold">Data Validation</code> option on Daily_Timesheet columns like Profile, Category, Tools, and Status.
                </p>
                <p>
                  <strong className="text-gray-900">Phase 3: Dependent Logic.</strong> Implement dependent dropdown validation by using the <code className="bg-gray-100 px-1 py-0.5 rounded font-mono font-bold">=INDIRECT()</code> function or Google Apps Script. This maps the Profile chosen in column F to categories dynamically loaded from the Master sheet.
                </p>
                <p>
                  <strong className="text-gray-900">Phase 4: Aggregation.</strong> Use <code className="bg-gray-100 px-1 py-0.5 rounded font-mono font-bold">SUMIFS</code>, <code className="bg-gray-100 px-1 py-0.5 rounded font-mono font-bold">COUNTIFS</code>, and Pivot Tables in the Dashboard_Data sheet to compile live HOD and MD charts.
                </p>
              </div>
            </div>

            {/* Web App Integration */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider border-b border-gray-100 pb-3 flex items-center gap-1.5">
                <Cpu className="h-4 w-4 text-indigo-600" /> Web App Architecture & Database Mapping
              </h3>
              <div className="space-y-3 text-xs text-gray-700 leading-relaxed">
                <p>
                  Our built application acts as the perfect evolution of this Excel template! It runs a full-stack platform consisting of:
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-gray-600 font-mono text-[11px]">
                  <li><strong className="text-gray-900 font-sans">Durable Database (JSON/NoSQL):</strong> Persistent storage in <code className="bg-gray-100 px-1 rounded">/data/db.json</code>, tracking users, logs, tasks, and KPIs.</li>
                  <li><strong className="text-gray-900 font-sans">Role-Based Gateways:</strong> Secure backend REST APIs routing individual, HOD, and MD access levels.</li>
                  <li><strong className="text-gray-900 font-sans">Real-time KPI calculations:</strong> Formulas run instantly on submission, providing up-to-the-minute metrics.</li>
                  <li><strong className="text-gray-900 font-sans">Interactive Interfaces:</strong> Beautiful frontend with clock-in controls, task checkers, and visual metrics.</li>
                </ul>
                <p className="mt-2 text-[10px] text-gray-400">
                  This system successfully bridges standard spreadsheet discipline with automated enterprise software!
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'reports' && (
        <div className="space-y-6">
          <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl text-xs text-indigo-800 flex gap-2.5 items-start">
            <FileDown className="h-5 w-5 shrink-0 text-indigo-600" />
            <div>
              <p className="font-bold">Download Reports</p>
              <p className="mt-1 leading-relaxed">Select a date range and download attendance or timesheet data as Excel files directly from the database.</p>
            </div>
          </div>

          {/* Date Range Picker */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider border-b border-gray-100 pb-3 flex items-center gap-1.5 mb-4">
              <Calendar className="h-4 w-4 text-indigo-600" /> Select Date Range
            </h3>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">From</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={e => setFromDate(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">To</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={e => setToDate(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
            </div>
          </div>

          {/* Report Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Attendance Report */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider border-b border-gray-100 pb-3 flex items-center gap-1.5">
                <Download className="h-4 w-4 text-indigo-600" /> Login History Report
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Downloads clock-in / clock-out times, break minutes, active hours, and device info for all employees in the selected date range.
              </p>
              <div className="text-[10px] text-gray-400 font-mono space-y-1">
                <p>Columns: Emp Code · Name · Designation · Date · Clock In · Clock Out · Active Hours · Break Minutes · Device</p>
              </div>
              <button
                onClick={() => downloadReport('attendance')}
                disabled={downloading === 'attendance'}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors"
              >
                {downloading === 'attendance' ? (
                  <><span className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full inline-block" /> Preparing...</>
                ) : (
                  <><FileDown className="h-3.5 w-3.5" /> Download Attendance Report</>
                )}
              </button>
            </div>

            {/* Timesheet Report */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider border-b border-gray-100 pb-3 flex items-center gap-1.5">
                <Download className="h-4 w-4 text-indigo-600" /> Timesheet Report
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Downloads all task entries per employee with task name, brand, duration, status, and submission info for the selected date range.
              </p>
              <div className="text-[10px] text-gray-400 font-mono space-y-1">
                <p>Columns: Emp Code · Name · Date · Task · Sub Task · Brand · Duration (min) · Status · Submitted · Notes</p>
              </div>
              <button
                onClick={() => downloadReport('timesheet')}
                disabled={downloading === 'timesheet'}
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors"
              >
                {downloading === 'timesheet' ? (
                  <><span className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full inline-block" /> Preparing...</>
                ) : (
                  <><FileDown className="h-3.5 w-3.5" /> Download Timesheet Report</>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
