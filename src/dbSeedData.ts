/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { User, TaskLibraryItem, KPIMetric } from './types';

export const SEED_USERS: User[] = [
  {
      "id": "user_admin",
      "name": "Admin Head",
      "emp_code": "EMP000",
      "email": "an.digi@thesachdevgroup.com",
      "password_hash": "admin123",
      "role": "admin",
      "designation": "Head of Digital & Technology",
      "brand_focus": "All",
      "doj": "2020-01-01",
      "status": "active",
      "must_reset_password": false
    },
    {
      "id": "user_alka",
      "name": "Alka Rawat",
      "emp_code": "GT8685",
      "email": "alka@thesachdevgroup.com",
      "password_hash": "alka123",
      "role": "member",
      "designation": "Sr. Digital Marketing Manager",
      "brand_focus": "GT",
      "doj": "2022-04-15",
      "status": "active",
      "must_reset_password": false
    },
    {
      "id": "user_ravi",
      "name": "Ravi Kumar",
      "emp_code": "EMP002",
      "email": "ravi@thesachdevgroup.com",
      "password_hash": "ravi123",
      "role": "member",
      "designation": "PPC Manager",
      "brand_focus": "HH",
      "doj": "2022-06-10",
      "status": "active",
      "must_reset_password": true
    },
    {
      "id": "user_deepti",
      "name": "Deepti",
      "emp_code": "GT8981",
      "email": "deepti@thesachdevgroup.com",
      "password_hash": "deepti123",
      "role": "member",
      "designation": "Digital Marketing Manager",
      "brand_focus": "ACR",
      "doj": "2023-01-15",
      "status": "active",
      "must_reset_password": true
    },
    {
      "id": "user_ganesh",
      "name": "Ganesh Kumar",
      "emp_code": "GT8656",
      "email": "ganesh@thesachdevgroup.com",
      "password_hash": "ganesh123",
      "role": "member",
      "designation": "SEO Manager",
      "brand_focus": "All",
      "doj": "2021-09-01",
      "status": "active",
      "must_reset_password": true
    },
    {
      "id": "user_dev",
      "name": "Dev Sharma",
      "emp_code": "GT8802",
      "email": "dev@thesachdevgroup.com",
      "password_hash": "dev123",
      "role": "member",
      "designation": "SEO TL",
      "brand_focus": "All",
      "doj": "2023-05-20",
      "status": "active",
      "must_reset_password": true
    },
    {
      "id": "user_bhawna",
      "name": "Bhawna Tagra",
      "emp_code": "GT6977",
      "email": "bhawna@thesachdevgroup.com",
      "password_hash": "bhawna123",
      "role": "member",
      "designation": "Content Marketing Manager",
      "brand_focus": "All",
      "doj": "2022-11-01",
      "status": "active",
      "must_reset_password": true
    },
    {
      "id": "user_pratyaksh",
      "name": "Pratyaksh Kain",
      "emp_code": "EMP007",
      "email": "pratyaksh@thesachdevgroup.com",
      "password_hash": "pratyaksh123",
      "role": "member",
      "designation": "AI Video Maker / Editor",
      "brand_focus": "All",
      "doj": "2024-02-10",
      "status": "active",
      "must_reset_password": true
    },
    {
      "id": "user_atul",
      "name": "Atul Tiwari",
      "emp_code": "EMP008",
      "email": "atul@thesachdevgroup.com",
      "password_hash": "atul123",
      "role": "member",
      "designation": "Web Dev - ACR/Portals",
      "brand_focus": "ACR",
      "doj": "2021-03-15",
      "status": "active",
      "must_reset_password": true
    },
    {
      "id": "user_harsh",
      "name": "Harsh Sharma",
      "emp_code": "GT7325",
      "email": "harsh@thesachdevgroup.com",
      "password_hash": "harsh123",
      "role": "member",
      "designation": "Web Dev - GT/HH",
      "brand_focus": "GT",
      "doj": "2023-08-01",
      "status": "active",
      "must_reset_password": true
    },
    {
      "id": "user_vikash",
      "name": "Vikash Pandey",
      "emp_code": "GT7422",
      "email": "vikash@thesachdevgroup.com",
      "password_hash": "vikash123",
      "role": "member",
      "designation": "Sr. Graphic Designer",
      "brand_focus": "All",
      "doj": "2022-01-10",
      "status": "active",
      "must_reset_password": true
    },
    {
      "id": "user_akshita",
      "name": "Akshita",
      "emp_code": "GT8348",
      "email": "akshita@thesachdevgroup.com",
      "password_hash": "akshita123",
      "role": "member",
      "designation": "PPC Executive",
      "brand_focus": "All",
      "doj": "2023-10-01",
      "status": "active",
      "must_reset_password": true
    },
    {
      "id": "user_divya",
      "name": "Divya Goel",
      "emp_code": "EMP012",
      "email": "divya@thesachdevgroup.com",
      "password_hash": "divya123",
      "role": "member",
      "designation": "Social Media Manager",
      "brand_focus": "All",
      "doj": "2022-03-22",
      "status": "active",
      "must_reset_password": true
    },
    {
      "id": "user_vanshika",
      "name": "Vanshika Saini",
      "emp_code": "EMP013",
      "email": "vanshika@thesachdevgroup.com",
      "password_hash": "vanshika123",
      "role": "member",
      "designation": "Video Presenter",
      "brand_focus": "All",
      "doj": "2024-01-15",
      "status": "active",
      "must_reset_password": true
    },
    {
      "id": "user_arpan",
      "name": "Arpan Tanwar",
      "emp_code": "GT8424",
      "email": "arpan@thesachdevgroup.com",
      "password_hash": "arpan123",
      "role": "member",
      "designation": "CRM Tech Manager",
      "brand_focus": "All",
      "doj": "2023-04-01",
      "status": "active",
      "must_reset_password": true
    },
    {
      "id": "user_keshav",
      "name": "Keshav Saxena",
      "emp_code": "EMP015",
      "email": "keshav@thesachdevgroup.com",
      "password_hash": "keshav123",
      "role": "member",
      "designation": "CRM Ops / IVR",
      "brand_focus": "All",
      "doj": "2023-07-20",
      "status": "active",
      "must_reset_password": true
    },
    {
      "id": "user_dharmendra",
      "name": "Dharmendra Singh",
      "emp_code": "GT8594",
      "email": "dharmendra@thesachdevgroup.com",
      "password_hash": "dharmendra123",
      "role": "member",
      "designation": "Technology Manager",
      "brand_focus": "All",
      "doj": "2022-05-15",
      "status": "active",
      "must_reset_password": true
    },
    {
      "id": "user_vimlesh",
      "name": "Vimlesh Verma",
      "emp_code": "EMP017",
      "email": "vimlesh@thesachdevgroup.com",
      "password_hash": "vimlesh123",
      "role": "member",
      "designation": "Automation & AI Engineer",
      "brand_focus": "All",
      "doj": "2023-09-01",
      "status": "active",
      "must_reset_password": true
    },
    {
      "id": "user_yashraj",
      "name": "Yashraj (Yash Raj Dubey)",
      "emp_code": "INT0893",
      "email": "yashraj@thesachdevgroup.com",
      "password_hash": "yashraj123",
      "role": "member",
      "designation": "AI Engineer Intern",
      "brand_focus": "All",
      "doj": "2024-05-01",
      "status": "active",
      "must_reset_password": true
    },
    {
      "id": "user_anuj",
      "name": "Anuj Singh Rajawat",
      "emp_code": "GT8974",
      "email": "anuj@thesachdevgroup.com",
      "password_hash": "anuj123",
      "role": "member",
      "designation": "Digital Operation Executive",
      "brand_focus": "All",
      "doj": "2023-11-15",
      "status": "active",
      "must_reset_password": true
    },
    {
      "id": "user_karan",
      "name": "Karan Singh",
      "emp_code": "GT9043",
      "email": "karan@thesachdevgroup.com",
      "password_hash": "karan123",
      "role": "member",
      "designation": "AI Prompt Engineer",
      "brand_focus": "All",
      "doj": "2024-06-15",
      "status": "active",
      "must_reset_password": true
    },
    {
      "id": "user_1782384391873",
      "name": "Test",
      "emp_code": "Test123",
      "email": "Test@test.com",
      "password_hash": "test321",
      "role": "member",
      "designation": "SEO Manager",
      "brand_focus": "GT",
      "doj": "2026-06-25",
      "status": "active",
      "must_reset_password": false
    }
];

export const SEED_TASK_LIBRARIES: any[] = [
  {
    id: "lib_seo_mgr",
    role: "SEO Manager",
    task_name: "SEO Manager Tasks",
    subtasks: [
      "Keyword research & mapping",
      "On-page metadata & H-tags optimization",
      "Technical SEO audit (Sitemap, robots, crawl errors)",
      "Spam/toxic backlink cleanup",
      "Google Business Profile (GMB) optimization",
      "Local pack tracking & optimization",
      "Organic traffic & GSC/GA4 analysis",
      "Monthly SEO progress report compile"
    ]
  },
  {
    id: "lib_seo_exec",
    role: "SEO Executive",
    task_name: "SEO Executive Tasks",
    subtasks: [
      "Page submission (Google Search Console)",
      "Directory listing & GMB verification",
      "GMB post publication",
      "Local citation building",
      "Meta title / Description update",
      "Schema markup implementation",
      "Broken links fix & redirect mapping",
      "Internal linking & content mapping",
      "Backlink generation (High DA submissions)",
      "Weekly submission & ranking report"
    ]
  },
  {
    id: "lib_content_mgr",
    role: "Content Manager",
    task_name: "Content Manager Tasks",
    subtasks: [
      "Blog draft writing (GT/HH/ACR)",
      "CMS uploading & publishing",
      "Content calendar planning",
      "WhatsApp campaign copy & layout design",
      "TKM T3DR billing submissions",
      "HH claim processing review",
      "Content optimization for SEO keywords"
    ]
  },
  {
    id: "lib_designer",
    role: "Sr. Graphic Designer",
    task_name: "Graphic Design Tasks",
    subtasks: [
      "Campaign master creative design",
      "Creative resizing & adaptation",
      "Client/Admin revision cycle",
      "Brand asset collection & guidelines",
      "Social media post creative",
      "Multi-brand coverage (GT/HH/ACR)"
    ]
  },
  {
    id: "lib_video_ai",
    role: "AI Video Maker / Editor",
    task_name: "AI Video & Editing Tasks",
    subtasks: [
      "AI video generation & prompt engineering",
      "AI digital avatar host video setup",
      "Reels / Shorts video editing & subtitle burnt",
      "On-site video shoot session planning",
      "Photoshoot session & post-process editing",
      "Sound design & background score mix"
    ]
  },
  {
    id: "lib_video_presenter",
    role: "Video Presenter",
    task_name: "Video Presenter Tasks",
    subtasks: [
      "On-camera present sessions",
      "Concept outline & scripting",
      "Brand promotion coverage (GT/HH/ACR)",
      "User engagement & feedback review",
      "Video upload check & live quality review"
    ]
  },
  {
    id: "lib_social_media",
    role: "Social Media Manager",
    task_name: "Social Media Management Tasks",
    subtasks: [
      "Instagram post & story upload",
      "Facebook page updates & boosting",
      "YouTube long & short upload (with description & tags)",
      "LinkedIn corporate update publish",
      "X (Twitter) brand communication",
      "Locobuzz ORM responses & escalations",
      "Localo GMB tracking & review reply"
    ]
  },
  {
    id: "lib_ppc_exec",
    role: "PPC Executive",
    task_name: "PPC Execution Tasks",
    subtasks: [
      "Google/FB Campaign optimization",
      "New ad group launch & budget update",
      "Lead quality audits & score profiling",
      "Same-day portal delivery check",
      "Ad copy/scheme verification",
      "Conversion tracking tag & pixel health check"
    ]
  },
  {
    id: "lib_ppc_mgr",
    role: "PPC Manager",
    task_name: "PPC Management Tasks",
    subtasks: [
      "Media plan planning & budget drafting",
      "Core campaign strategy review",
      "Budget utilization & lead CPA review",
      "SPOC lead-to-booking funnel tracking",
      "Weekly brand performance report compilation"
    ]
  },
  {
    id: "lib_srdmm",
    role: "Sr. Digital Marketing Manager",
    task_name: "Sr. Digital Marketing Management Tasks",
    subtasks: [
      "Weekly team KPI review & tracking",
      "Monthly media budget planning (GT focus)",
      "General Manager & location coordination meeting",
      "Team mentoring & skill transfer session",
      "Calendar adherence check"
    ]
  },
  {
    id: "lib_dmm",
    role: "Digital Marketing Manager",
    task_name: "Digital Marketing Management Tasks",
    subtasks: [
      "Monthly lead targets alignment (ACR focus)",
      "Lead funnel analysis (Lead->Enquiry->Booking)",
      "Quality assurance & junk lead check",
      "Location-wise CPL verification",
      "Campaign copy check & error log"
    ]
  },
  {
    id: "lib_crm_tech",
    role: "CRM Tech Manager",
    task_name: "CRM Technical Tasks",
    subtasks: [
      "Bitrix24 workflow mapping & field config",
      "API integration health check",
      "Lead routing & vendor connection review",
      "AI voice calling campaign setup & analytics",
      "Team training on CRM fields & updates"
    ]
  },
  {
    id: "lib_crm_ops",
    role: "CRM Ops / IVR",
    task_name: "CRM Operations & IVR Tasks",
    subtasks: [
      "Mcube incoming call log auditing",
      "CloudConnect outgoing call analysis",
      "IVR number configuration & testing",
      "Vendor invoice processing",
      "PO creation & release",
      "Software recurring subscription tracking",
      "Vendor bill master sheet update"
    ]
  },
  {
    id: "lib_tech_mgr",
    role: "Technology Manager",
    task_name: "Technology Management Tasks",
    subtasks: [
      "Zoho Books config & custom module creation",
      "Transactions posting check & logs analysis",
      "Bank/Vendor reconciliation config",
      "Zoho Procurement mapping",
      "PO workflow management",
      "Vendor master directory audit",
      "User adoption & training checks"
    ]
  },
  {
    id: "lib_automation",
    role: "Automation & AI Engineer",
    task_name: "Automation & Chatbot Tasks",
    subtasks: [
      "Chatbot deployment & logs check (GT/HH/ACR)",
      "WhatsApp API campaign trigger",
      "Flow build in chatbot panel",
      "Language-accuracy QA checks on LLM replies",
      "Lead-capture routing verification",
      "Chatbot SLA tracking"
    ]
  },
  {
    id: "lib_ai_intern",
    role: "AI Engineer Intern",
    task_name: "AI Engineer Intern Tasks",
    subtasks: [
      "Automated dashboard reports compilation",
      "Claude API workflows monitoring",
      "AI call transcription auditing",
      "AI script writing & validation check",
      "Custom tool integrations validation"
    ]
  },
  {
    id: "lib_web_acr",
    role: "Web Dev - ACR/Portals",
    task_name: "ACR & Agent Portal Web Tasks",
    subtasks: [
      "ACR payment gateway success rate monitoring",
      "ACR customer site speed & security update",
      "Agent portal updates & bug fix",
      "AuctionMart staging testing & release",
      "Payment gateway API endpoint update",
      "SSL certificate & server resource check"
    ]
  },
  {
    id: "lib_web_gt_hh",
    role: "Web Dev - GT/HH",
    task_name: "GT & HH Web Tasks",
    subtasks: [
      " hanshyundai.com / galaxytoyota.in speed audits",
      "Promo landing pages upload & testing",
      "Blog posting & image WebP optimization",
      "Tech SEO tags check & redirection",
      "Core Web Vitals load-speed optimizations",
      "SSL verification & emergency server checks"
    ]
  },
  {
    id: "lib_used_car",
    role: "Used Car Ops",
    task_name: "Used Car Operations Tasks",
    subtasks: [
      "Lead closure audit & CRM flags verification",
      "Hpromise & UTrust listings published check",
      "Website inventory count audit",
      "Listing accuracy & vehicle photography review",
      "Zoho Inventory stock aging tracking"
    ]
  },
  {
    id: "lib_intern",
    role: "Intern",
    task_name: "Intern Tasks",
    subtasks: [
      "Ad-hoc data entry & sheet mapping",
      "Assigned learning course module study",
      "Supporting team SPOCs in data pulling",
      "GMB post proofreading help"
    ]
  }
];

export const SEED_KPI_METRICS: KPIMetric[] = [
  // Ganesh (SEO Manager)
  { id: "kpi_ganesh_1", user_id: "user_ganesh", name: "Organic Traffic Growth % (GT/HH/ACR)", category: "Traffic", weight: 20, target: 15, lower_is_better: false, is_percentage: true },
  { id: "kpi_ganesh_2", user_id: "user_ganesh", name: "Keywords in Top 10 Search Results", category: "Ranking", weight: 20, target: 50, lower_is_better: false, is_percentage: false },
  { id: "kpi_ganesh_3", user_id: "user_ganesh", name: "Web pages SEO Optimized & Audited", category: "Optimization", weight: 20, target: 30, lower_is_better: false, is_percentage: false },
  { id: "kpi_ganesh_4", user_id: "user_ganesh", name: "Toxic/Spam Backlinks removed", category: "Audit", weight: 15, target: 200, lower_is_better: false, is_percentage: false },
  { id: "kpi_ganesh_5", user_id: "user_ganesh", name: "GMB Local SEO Actions Taken", category: "Local SEO", weight: 15, target: 40, lower_is_better: false, is_percentage: false },
  { id: "kpi_ganesh_6", user_id: "user_ganesh", name: "Monthly SEO Report Submitted", category: "Reporting", weight: 10, target: 1, lower_is_better: false, is_percentage: false },

  // Dev (SEO Executive)
  { id: "kpi_dev_1", user_id: "user_dev", name: "GMB Daily Posts Published", category: "Social SEO", weight: 20, target: 30, lower_is_better: false, is_percentage: false },
  { id: "kpi_dev_2", user_id: "user_dev", name: "Meta Descriptions & Titles updated", category: "On-Page", weight: 20, target: 100, lower_is_better: false, is_percentage: false },
  { id: "kpi_dev_3", user_id: "user_dev", name: "Directory listings completed & verified", category: "Local Citations", weight: 20, target: 50, lower_is_better: false, is_percentage: false },
  { id: "kpi_dev_4", user_id: "user_dev", name: "Broken-link errors resolved", category: "Technical", weight: 20, target: 15, lower_is_better: false, is_percentage: false },
  { id: "kpi_dev_5", user_id: "user_dev", name: "Website Organic Traffic Growth %", category: "Output", weight: 20, target: 10, lower_is_better: false, is_percentage: true },

  // Bhawna (Content Manager)
  { id: "kpi_bhawna_1", user_id: "user_bhawna", name: "Blogs written & published per brand", category: "Content", weight: 25, target: 12, lower_is_better: false, is_percentage: false },
  { id: "kpi_bhawna_2", user_id: "user_bhawna", name: "Content calendar timeline adherence %", category: "Scheduling", weight: 20, target: 100, lower_is_better: false, is_percentage: true },
  { id: "kpi_bhawna_3", user_id: "user_bhawna", name: "WhatsApp Campaigns formatted & queued", category: "Campaigns", weight: 15, target: 6, lower_is_better: false, is_percentage: false },
  { id: "kpi_bhawna_4", user_id: "user_bhawna", name: "TKM T3DR Invoice submissions accuracy %", category: "Finance", weight: 20, target: 100, lower_is_better: false, is_percentage: true },
  { id: "kpi_bhawna_5", user_id: "user_bhawna", name: "Hyundai billing claim error rate %", category: "Claims", weight: 20, target: 2, lower_is_better: true, is_percentage: true },

  // Vikash (Graphic Designer)
  { id: "kpi_vikash_1", user_id: "user_vikash", name: "Creative layouts delivered", category: "Design", weight: 30, target: 60, lower_is_better: false, is_percentage: false },
  { id: "kpi_vikash_2", user_id: "user_vikash", name: "Turnaround Time (TAT) compliance %", category: "Delivery", weight: 30, target: 95, lower_is_better: false, is_percentage: true },
  { id: "kpi_vikash_3", user_id: "user_vikash", name: "Brand Guidelines Compliance %", category: "Quality", weight: 20, target: 100, lower_is_better: false, is_percentage: true },
  { id: "kpi_vikash_4", user_id: "user_vikash", name: "Creative revision requests rate %", category: "Revisions", weight: 20, target: 10, lower_is_better: true, is_percentage: true },

  // Pratyaksh (AI Video)
  { id: "kpi_pratyaksh_1", user_id: "user_pratyaksh", name: "AI Videos produced & edited", category: "Production", weight: 35, target: 15, lower_is_better: false, is_percentage: false },
  { id: "kpi_pratyaksh_2", user_id: "user_pratyaksh", name: "Editing TAT compliance %", category: "Delivery", weight: 25, target: 90, lower_is_better: false, is_percentage: true },
  { id: "kpi_pratyaksh_3", user_id: "user_pratyaksh", name: "Revision requests rate %", category: "Quality", weight: 20, target: 12, lower_is_better: true, is_percentage: true },
  { id: "kpi_pratyaksh_4", user_id: "user_pratyaksh", name: "AI video generation tools coverage %", category: "Adoption", weight: 20, target: 100, lower_is_better: false, is_percentage: true },

  // Vanshika (Presenter)
  { id: "kpi_vanshika_1", user_id: "user_vanshika", name: "On-camera videos shot", category: "Production", weight: 40, target: 10, lower_is_better: false, is_percentage: false },
  { id: "kpi_vanshika_2", user_id: "user_vanshika", name: "Concept notes drafted & approved", category: "Ideation", weight: 30, target: 12, lower_is_better: false, is_percentage: false },
  { id: "kpi_vanshika_3", user_id: "user_vanshika", name: "Brand coverage criteria met", category: "Coverage", weight: 20, target: 3, lower_is_better: false, is_percentage: false },
  { id: "kpi_vanshika_4", user_id: "user_vanshika", name: "Audience average retention rate %", category: "Performance", weight: 10, target: 45, lower_is_better: false, is_percentage: true },

  // Divya (Social Media Manager)
  { id: "kpi_divya_1", user_id: "user_divya", name: "Total posts published across channels", category: "Posting", weight: 20, target: 120, lower_is_better: false, is_percentage: false },
  { id: "kpi_divya_2", user_id: "user_divya", name: "Average engagement rate growth %", category: "Engagement", weight: 20, target: 8, lower_is_better: false, is_percentage: true },
  { id: "kpi_divya_3", user_id: "user_divya", name: "Follower base growth rate %", category: "Growth", weight: 20, target: 5, lower_is_better: false, is_percentage: true },
  { id: "kpi_divya_4", user_id: "user_divya", name: "Social leads generated", category: "Leads", weight: 20, target: 50, lower_is_better: false, is_percentage: false },
  { id: "kpi_divya_5", user_id: "user_divya", name: "Locobuzz ORM response rate within SLA %", category: "Reputation", weight: 10, target: 98, lower_is_better: false, is_percentage: true },
  { id: "kpi_divya_6", user_id: "user_divya", name: "Social content calendar adherence %", category: "Scheduling", weight: 10, target: 100, lower_is_better: false, is_percentage: true },

  // Akshita (PPC Executive)
  { id: "kpi_akshita_1", user_id: "user_akshita", name: "Paid leads count (GT/HH)", category: "Volume", weight: 25, target: 400, lower_is_better: false, is_percentage: false },
  { id: "kpi_akshita_2", user_id: "user_akshita", name: "Quality leads ratio % (Enquiries)", category: "Quality", weight: 25, target: 35, lower_is_better: false, is_percentage: true },
  { id: "kpi_akshita_3", user_id: "user_akshita", name: "Junk leads ratio %", category: "Waste", weight: 20, target: 15, lower_is_better: true, is_percentage: true },
  { id: "kpi_akshita_4", user_id: "user_akshita", name: "Leads push same-day ratio %", category: "TAT", weight: 15, target: 95, lower_is_better: false, is_percentage: true },
  { id: "kpi_akshita_5", user_id: "user_akshita", name: "Cost Per Lead (CPL) Target Ratio %", category: "Cost", weight: 15, target: 250, lower_is_better: true, is_percentage: false },

  // Ravi (PPC Manager / HH SPOC) - Business 70%, Role 30%
  { id: "kpi_ravi_1", user_id: "user_ravi", name: "[HH] Total Paid Leads Count (Business)", category: "Business", weight: 30, target: 800, lower_is_better: false, is_percentage: false },
  { id: "kpi_ravi_2", user_id: "user_ravi", name: "[HH] Lead Growth % (Business)", category: "Business", weight: 15, target: 10, lower_is_better: false, is_percentage: true },
  { id: "kpi_ravi_3", user_id: "user_ravi", name: "[HH] Lead -> Enquiry Conversion % (Business)", category: "Business", weight: 15, target: 40, lower_is_better: false, is_percentage: true },
  { id: "kpi_ravi_4", user_id: "user_ravi", name: "[HH] Lead -> Booking Conversion % (Business)", category: "Business", weight: 10, target: 5, lower_is_better: false, is_percentage: true },
  { id: "kpi_ravi_5", user_id: "user_ravi", name: "PPC Campaigns optimized (Role)", category: "Role", weight: 10, target: 15, lower_is_better: false, is_percentage: false },
  { id: "kpi_ravi_6", user_id: "user_ravi", name: "New ad creative groups launched (Role)", category: "Role", weight: 10, target: 5, lower_is_better: false, is_percentage: false },
  { id: "kpi_ravi_7", user_id: "user_ravi", name: "Average CPL target vs actual (Role)", category: "Role", weight: 10, target: 300, lower_is_better: true, is_percentage: false },

  // Alka (Sr. DMM / GT SPOC) - Business 70%, Role 30%
  { id: "kpi_alka_1", user_id: "user_alka", name: "[GT] Total Paid Leads Count (Business)", category: "Business", weight: 30, target: 1200, lower_is_better: false, is_percentage: false },
  { id: "kpi_alka_2", user_id: "user_alka", name: "[GT] Lead Growth % (Business)", category: "Business", weight: 15, target: 12, lower_is_better: false, is_percentage: true },
  { id: "kpi_alka_3", user_id: "user_alka", name: "[GT] Lead -> Enquiry Conversion % (Business)", category: "Business", weight: 15, target: 45, lower_is_better: false, is_percentage: true },
  { id: "kpi_alka_4", user_id: "user_alka", name: "[GT] Lead -> Booking Conversion % (Business)", category: "Business", weight: 10, target: 6, lower_is_better: false, is_percentage: true },
  { id: "kpi_alka_5", user_id: "user_alka", name: "Weekly Team KPI reviews completed (Role)", category: "Role", weight: 10, target: 4, lower_is_better: false, is_percentage: false },
  { id: "kpi_alka_6", user_id: "user_alka", name: "Lead strategy plan document drafted (Role)", category: "Role", weight: 10, target: 1, lower_is_better: false, is_percentage: false },
  { id: "kpi_alka_7", user_id: "user_alka", name: "General Manager alignment meetings (Role)", category: "Role", weight: 10, target: 3, lower_is_better: false, is_percentage: false },

  // Deepti (DMM / ACR SPOC) - Business 70%, Role 30%
  { id: "kpi_deepti_1", user_id: "user_deepti", name: "[ACR] Total Leads by Location (Business)", category: "Business", weight: 30, target: 500, lower_is_better: false, is_percentage: false },
  { id: "kpi_deepti_2", user_id: "user_deepti", name: "[ACR] Lead Growth % (Business)", category: "Business", weight: 15, target: 8, lower_is_better: false, is_percentage: true },
  { id: "kpi_deepti_3", user_id: "user_deepti", name: "[ACR] Lead -> Enquiry Conversion % (Business)", category: "Business", weight: 15, target: 35, lower_is_better: false, is_percentage: true },
  { id: "kpi_deepti_4", user_id: "user_deepti", name: "[ACR] Lead -> Booking Conversion % (Business)", category: "Business", weight: 10, target: 8, lower_is_better: false, is_percentage: true },
  { id: "kpi_deepti_5", user_id: "user_deepti", name: "Quality lead ratio % (Role)", category: "Role", weight: 10, target: 40, lower_is_better: false, is_percentage: true },
  { id: "kpi_deepti_6", user_id: "user_deepti", name: "Junk lead ratio % (Role)", category: "Role", weight: 10, target: 12, lower_is_better: true, is_percentage: true },
  { id: "kpi_deepti_7", user_id: "user_deepti", name: "Landing page error checks completed (Role)", category: "Role", weight: 10, target: 12, lower_is_better: true, is_percentage: false },

  // Arpan (CRM Tech Manager)
  { id: "kpi_arpan_1", user_id: "user_arpan", name: "Bitrix active users & log-ins", category: "CRM Integration", weight: 20, target: 18, lower_is_better: false, is_percentage: false },
  { id: "kpi_arpan_2", user_id: "user_arpan", name: "Daily CRM field compliance rate %", category: "CRM Governance", weight: 20, target: 98, lower_is_better: false, is_percentage: true },
  { id: "kpi_arpan_3", user_id: "user_arpan", name: "API Lead capture integration success %", category: "Integration", weight: 20, target: 99, lower_is_better: false, is_percentage: true },
  { id: "kpi_arpan_4", user_id: "user_arpan", name: "Lead database completeness score %", category: "CRM Governance", weight: 20, target: 95, lower_is_better: false, is_percentage: true },
  { id: "kpi_arpan_5", user_id: "user_arpan", name: "CRM system uptime %", category: "System", weight: 20, target: 99.9, lower_is_better: false, is_percentage: true },

  // Keshav (CRM Ops / IVR)
  { id: "kpi_keshav_1", user_id: "user_keshav", name: "IVR incoming call completion rate %", category: "IVR Ops", weight: 20, target: 96, lower_is_better: false, is_percentage: true },
  { id: "kpi_keshav_2", user_id: "user_keshav", name: "Telecom issue turnaround time (TAT) hours", category: "IVR Ops", weight: 20, target: 4, lower_is_better: true, is_percentage: false },
  { id: "kpi_keshav_3", user_id: "user_keshav", name: "Vendor invoices processed without errors", category: "Finance", weight: 20, target: 15, lower_is_better: false, is_percentage: false },
  { id: "kpi_keshav_4", user_id: "user_keshav", name: "Purchase Orders (PO) released", category: "Procurement", weight: 20, target: 10, lower_is_better: false, is_percentage: false },
  { id: "kpi_keshav_5", user_id: "user_keshav", name: "Software bill tracking sheet accuracy %", category: "Admin", weight: 20, target: 100, lower_is_better: false, is_percentage: true },

  // Dharmendra (Technology Manager)
  { id: "kpi_dharmendra_1", user_id: "user_dharmendra", name: "Zoho Books transaction processing accuracy %", category: "ERP", weight: 25, target: 100, lower_is_better: false, is_percentage: true },
  { id: "kpi_dharmendra_2", user_id: "user_dharmendra", name: "Monthly bank & ledger reconciliation %", category: "Reconciliation", weight: 25, target: 100, lower_is_better: false, is_percentage: true },
  { id: "kpi_dharmendra_3", user_id: "user_dharmendra", name: "Zoho Procurement PO generation accuracy %", category: "Procurement", weight: 25, target: 99, lower_is_better: false, is_percentage: true },
  { id: "kpi_dharmendra_4", user_id: "user_dharmendra", name: "Zoho module active user adoption rate %", category: "System", weight: 25, target: 90, lower_is_better: false, is_percentage: true },

  // Vimlesh (Automation & AI)
  { id: "kpi_vimlesh_1", user_id: "user_vimlesh", name: "Chatbots live & routing leads properly", category: "AI Chatbots", weight: 20, target: 3, lower_is_better: false, is_percentage: false },
  { id: "kpi_vimlesh_2", user_id: "user_vimlesh", name: "Chatbot system uptime %", category: "Systems", weight: 20, target: 99.5, lower_is_better: false, is_percentage: true },
  { id: "kpi_vimlesh_3", user_id: "user_vimlesh", name: "AI conversation language QA errors", category: "AI Chatbots", weight: 20, target: 5, lower_is_better: true, is_percentage: false },
  { id: "kpi_vimlesh_4", user_id: "user_vimlesh", name: "WhatsApp Campaign message delivery %", category: "WhatsApp", weight: 20, target: 98, lower_is_better: false, is_percentage: true },
  { id: "kpi_vimlesh_5", user_id: "user_vimlesh", name: "Chatbot lead-capture SLA compliance %", category: "AI Chatbots", weight: 20, target: 95, lower_is_better: false, is_percentage: true },

  // Yashraj (AI Intern)
  { id: "kpi_yashraj_1", user_id: "user_yashraj", name: "Automated activity reports generated", category: "Reporting", weight: 25, target: 20, lower_is_better: false, is_percentage: false },
  { id: "kpi_yashraj_2", user_id: "user_yashraj", name: "Team dashboard uptime %", category: "Systems", weight: 25, target: 98, lower_is_better: false, is_percentage: true },
  { id: "kpi_yashraj_3", user_id: "user_yashraj", name: "AI workflow integrations active", category: "Integrations", weight: 25, target: 4, lower_is_better: false, is_percentage: false },
  { id: "kpi_yashraj_4", user_id: "user_yashraj", name: "AI transcription audit success %", category: "Quality", weight: 25, target: 90, lower_is_better: false, is_percentage: true },

  // Atul (Web Dev ACR)
  { id: "kpi_atul_1", user_id: "user_atul", name: "ACR Payment Gateway success rate %", category: "E-Commerce", weight: 20, target: 92, lower_is_better: false, is_percentage: true },
  { id: "kpi_atul_2", user_id: "user_atul", name: "Payment Gateway down-time hours", category: "E-Commerce", weight: 20, target: 2, lower_is_better: true, is_percentage: false },
  { id: "kpi_atul_3", user_id: "user_atul", name: "Agent portal uptime %", category: "Systems", weight: 20, target: 99.9, lower_is_better: false, is_percentage: true },
  { id: "kpi_atul_4", user_id: "user_atul", name: "ACR main website load speed (seconds)", category: "Performance", weight: 20, target: 2.5, lower_is_better: true, is_percentage: false },
  { id: "kpi_atul_5", user_id: "user_atul", name: "Core Web Vitals compliance score %", category: "Performance", weight: 20, target: 85, lower_is_better: false, is_percentage: true },

  // Harsh (Web Dev GT/HH)
  { id: "kpi_harsh_1", user_id: "user_harsh", name: "Main sites uptime % (Hans & Galaxy)", category: "Systems", weight: 25, target: 99.9, lower_is_better: false, is_percentage: true },
  { id: "kpi_harsh_2", user_id: "user_harsh", name: "Blogs & media landing pages uploaded", category: "Content", weight: 25, target: 15, lower_is_better: false, is_percentage: false },
  { id: "kpi_harsh_3", user_id: "user_harsh", name: "New landing page on-time delivery %", category: "Delivery", weight: 25, target: 95, lower_is_better: false, is_percentage: true },
  { id: "kpi_harsh_4", user_id: "user_harsh", name: " Hans & Galaxy page load speed (seconds)", category: "Performance", weight: 25, target: 2.8, lower_is_better: true, is_percentage: false },

  // Anuj (Used Car Ops)
  { id: "kpi_anuj_1", user_id: "user_anuj", name: "Used-car sales leads captured & catalogued", category: "Operations", weight: 25, target: 150, lower_is_better: false, is_percentage: false },
  { id: "kpi_anuj_2", user_id: "user_anuj", name: "Lead -> Enquiry conversion %", category: "Performance", weight: 25, target: 20, lower_is_better: false, is_percentage: true },
  { id: "kpi_anuj_3", user_id: "user_anuj", name: "Listings publish on-time index %", category: "Operations", weight: 25, target: 95, lower_is_better: false, is_percentage: true },
  { id: "kpi_anuj_4", user_id: "user_anuj", name: "Stock sheet audits completed", category: "Audits", weight: 25, target: 4, lower_is_better: false, is_percentage: false },

  // Puneet (Intern)
  { id: "kpi_puneet_1", user_id: "user_puneet", name: "Structured training hours completed", category: "Learning", weight: 40, target: 40, lower_is_better: false, is_percentage: false },
  { id: "kpi_puneet_2", user_id: "user_puneet", name: "Assigned project support tasks done", category: "Execution", weight: 40, target: 30, lower_is_better: false, is_percentage: false },
  { id: "kpi_puneet_3", user_id: "user_puneet", name: "Intern attendance rate %", category: "Presence", weight: 20, target: 95, lower_is_better: false, is_percentage: true }
];
