// ============================================================================
// TESDH Community Hub - Bilingual Translations (English & Bahasa Melayu)
// ============================================================================

export type Language = 'en' | 'bm' | 'ms-MY';

const englishStrings = {
  appTitle: 'TESDH Community Hub',
  townshipName: 'Bandar Elmina / Denai Alam',
  brandTagline: 'Sime Darby Property Smart & Resilient Township Community Hub',
  
  // Navigation
  navHome: 'Home',
  navFeed: 'Community Feed',
  navResilience: 'Resilience Map',
  navExchange: 'Exchange',
  navServices: 'Local Services',
  navMessages: 'Chat',
  navManagement: 'Bilik JMB Console',
  navSettings: 'Settings & Theme',
  navKiosk: 'Kiosk Mode',
  
  // Roles & Badges
  roleResident: 'Resident',
  roleModerator: 'Community Moderator',
  roleManagement: 'Management Office (JMB/RA)',
  roleSecurity: 'Security & Auxiliary Police',
  statusVerified: 'Verified Resident',
  statusPending: 'Pending Verification',
  statusUnverified: 'Unverified',
  anonymousNeighbour: 'Anonymous Neighbour (Elmina)',
  privacyProtected: 'Privacy Protected: Unit address & phone number kept confidential',
  
  // Categories
  catAll: 'All',
  catAnnouncement: 'Official Announcement',
  catSecurityAlert: 'Security Alert',
  catEvent: 'Activities & Events',
  catComplaint: 'Resident Complaint',
  catDiscussion: 'Discussion',
  
  // Resilience
  incidentFlood: 'Flash Flood / Waterlogging',
  incidentDrain: 'Blocked Drain',
  incidentTree: 'Fallen Tree / Broken Branch',
  incidentPothole: 'Damaged Road / Pothole',
  incidentLight: 'Street Light Outage',
  incidentWater: 'Water Disruption',
  incidentOther: 'Other Issues',
  
  severityCritical: 'Critical',
  severityHigh: 'High',
  severityMedium: 'Medium',
  severityLow: 'Low',
  
  statusReported: 'Reported',
  statusUnderReview: 'Under Review',
  statusDispatched: 'Dispatched / In Progress',
  statusResolved: 'Resolved',
  
  // Actions & Buttons
  btnNewPost: 'Create Post',
  btnReportIncident: 'Report Incident',
  btnNewService: 'Offer Service / Request Help',
  btnNewExchange: 'Donate / Exchange Item',
  btnReserve: 'Reserve / Claim',
  btnContactSecurely: 'Contact Through Platform',
  btnVerifyResident: 'Verify Resident Account',
  btnFilter: 'Filter',
  btnSearch: 'Search the hub...',
  btnSubmit: 'Submit',
  btnCancel: 'Cancel',
  btnSave: 'Save',
  btnDelete: 'Delete',
  btnEdit: 'Edit',
  btnClose: 'Close',
  btnSwitchRole: 'Switch Demo Role',
  switchProfileError: 'Account Switch Failed',
  switchedAccountTitle: 'Active Account Switched',
  btnAnonymousToggle: 'Submit Anonymously to Neighbours',
  anonymousNotice: 'Confidentiality Notice: Your identity is masked from neighbours on the public board, but township management retains verified accountability records for resolution.',
  pinnedPost: 'Pinned Announcement',
  btnPublish: 'Publish Post',
  signIn: 'Sign In',
  signOut: 'Sign Out',
  contactUs: 'Contact Us',
  
  // Circular Exchange
  exchangeDivertedMetric: 'Household Items Diverted from Landfill',
  exchangeTypeGiveaway: 'Free Giveaway',
  exchangeTypeExchange: 'Barter / Direct Exchange',
  exchangeTypeLoan: 'Community Tool Loan',
  conditionBrandNew: 'Brand New In Box',
  conditionLikeNew: 'Like New (9/10)',
  conditionGood: 'Good Condition (7/10)',
  conditionFair: 'Functional / Fair (5/10)',
  
  // Local Services
  servicesOffering: 'Offering Service',
  servicesRequesting: 'Requesting Help',
  
  // Management Console
  mgmtStatsTitle: 'Township Management Console',
  mgmtActiveIncidents: 'Active Incidents',
  mgmtPendingVerification: 'Resident Verifications',
  mgmtReportedFlags: 'Moderation Reports',
  mgmtAuditTrail: 'Administrative Audit Trail',
  
  // AI Assistant
  aiAssistant: 'AI Assistant',
  aiThinking: 'Thinking...',
  aiAskPlaceholder: 'Ask AI Assistant...',
  aiWelcome: 'Hi! I am your TESDH Township AI Assistant. How can I help you today?',
  aiClearChat: 'Clear Chat',
  aiSuggestedQuestions: 'Suggested Questions',
  
  // Settings & Localization
  settingsTitle: 'Settings & Preferences',
  settingsLanguage: 'Language & Localization',
  settingsLanguageDesc: 'Choose your preferred display language for system prompts, municipal guidelines, and buttons.',
  settingsAppearance: 'Appearance & Theme',
  settingsNotifications: 'Notifications',
  settingsPrivacy: 'Privacy & Security',
  settingsAccount: 'Resident Profile',
  
  // Form Validation & Feedback
  msgRequiredField: 'This field is required.',
  msgWriteSuccess: 'Changes successfully saved to database.',
  msgWriteError: 'Database synchronization failed. Please check your connection or permissions.',
  msgPostCreated: 'Post published successfully.',
  msgIncidentReported: 'Incident report submitted to management dispatch.',
  msgItemCreated: 'Exchange listing published successfully.',
  msgServiceCreated: 'Service listing created successfully.',
  
  // Empty States
  emptyPosts: 'No community dispatches yet. Be the first to share an update!',
  emptyIncidents: 'No incidents reported in this precinct. The neighborhood is clear.',
  emptyExchange: 'No items currently listed for exchange or giveaway.',
  emptyServices: 'No local services offered yet in this category.',
  emptyNotifications: 'You have no new notifications.',
  
  // Home & Welcome
  welcomeTitle: 'Welcome to Your Community',
  welcomeSubtitle: "Stay connected, lend a hand and discover what's happening around Elmina.",
  feedTitle: 'Community Feed',
  feedSubtitle: 'See what your neighbours are talking about.',
  resilienceTitle: 'Resilience Map',
  resilienceSubtitle: 'Stay updated on incidents and local conditions.',
  exchangeTitle: 'Exchange',
  exchangeSubtitle: 'Give away, swap, or borrow items within the township.',
  servicesTitle: 'Local Services',
  servicesSubtitle: 'Find and offer skills, errands, or help with neighbours.',
  messagesTitle: 'Secure Messages',
  messagesSubtitle: 'Private, mediated communication with verified residents.',
  settingsSectionTitle: 'Settings & Preferences',
  settingsSectionSubtitle: 'Manage your preferences and local interface.',
  
  // Demo Mode Notice
  demoActiveBanner: 'Demo Mode Active (Bandar Elmina dataset). You can switch between resident, management, and security roles to test all journeys!',
  liveConnectedBanner: 'Connected to Supabase Live Database',

  // Phase 4 Management Console
  mgmtOverview: 'Overview',
  mgmtAiInsights: 'AI Insights',
  mgmtAnalytics: 'Analytics & Reports',
  mgmtModeration: 'Reports & Moderation',
  mgmtIncidents: 'Incident Management',
  mgmtResidents: 'Resident Governance',
  mgmtContent: 'Community Content',
  mgmtNotices: 'Official Notices',
  mgmtEvents: 'Upcoming Events',
  mgmtAlerts: 'Alerts & Broadcasts',
  mgmtAudit: 'Activity & Audit Logs',
  mgmtSettings: 'Management Settings',
  
  mgmtPeriod7d: 'Last 7 Days',
  mgmtPeriod30d: 'Last 30 Days',
  mgmtPeriod90d: 'Last 90 Days',
  mgmtPeriodCustom: 'Custom Range',
  
  mgmtAskAiTitle: 'Ask Management AI',
  mgmtAskAiPlaceholder: 'Ask an operational question (e.g., "Summarize unresolved incidents this month")...',
  mgmtViewRecords: 'View Supporting Records',
  mgmtExportPdf: 'Print / Export PDF',
  mgmtExportCsv: 'Export CSV',
  mgmtAcknowledgeAlert: 'Acknowledge',
  mgmtAlertsActive: 'Active Operational Alerts',
  mgmtMttr: 'Mean Time to Resolution (MTTR)',
  mgmtResolutionVelocity: 'Incident Resolution Rate',
};

const malayStrings: typeof englishStrings = {
  appTitle: 'Hab Komuniti TESDH',
  townshipName: 'Bandar Elmina / Denai Alam',
  brandTagline: 'Hab Komuniti Perbandaran Pintar & Berdaya Tahan Sime Darby Property',
  
  // Navigation
  navHome: 'Utama',
  navFeed: 'Suapan Komuniti',
  navResilience: 'Peta Ketahanan',
  navExchange: 'Pusat Pertukaran',
  navServices: 'Perkhidmatan Setempat',
  navMessages: 'Sembang',
  navManagement: 'Bilik JMB Console',
  navSettings: 'Tetapan & Tema',
  navKiosk: 'Mod Kiosk',
  
  // Roles & Badges
  roleResident: 'Penduduk',
  roleModerator: 'Moderator Komuniti',
  roleManagement: 'Pejabat Pengurusan (JMB/RA)',
  roleSecurity: 'Keselamatan & Polis Bantuan',
  statusVerified: 'Penduduk Disahkan',
  statusPending: 'Menunggu Pengesahan',
  statusUnverified: 'Belum Disahkan',
  anonymousNeighbour: 'Jiran Tanpa Nama (Elmina)',
  privacyProtected: 'Privasi Dilindungi: Alamat unit & nombor telefon dirahsiakan',
  
  // Categories
  catAll: 'Semua',
  catAnnouncement: 'Pengumuman Rasmi',
  catSecurityAlert: 'Amaran Keselamatan',
  catEvent: 'Aktiviti & Acara',
  catComplaint: 'Aduan Penduduk',
  catDiscussion: 'Perbincangan Komuniti',
  
  // Resilience
  incidentFlood: 'Banjir Kilat / Air Bertakung',
  incidentDrain: 'Longkang Tersumbat',
  incidentTree: 'Pokok Tumbang / Dahan Patah',
  incidentPothole: 'Jalan Rosak / Lubang',
  incidentLight: 'Lampu Jalan Terpadam',
  incidentWater: 'Gangguan Bekalan Air',
  incidentOther: 'Isu Lain',
  
  severityCritical: 'Kritikal',
  severityHigh: 'Tinggi',
  severityMedium: 'Sederhana',
  severityLow: 'Rendah',
  
  statusReported: 'Dilaporkan',
  statusUnderReview: 'Dalam Semakan',
  statusDispatched: 'Tindakan Dihantar / Sedang Dijalankan',
  statusResolved: 'Selesai',
  
  // Actions & Buttons
  btnNewPost: 'Cipta Hantaran',
  btnReportIncident: 'Lapor Insiden',
  btnNewService: 'Tawar Khidmat / Mohon Bantuan',
  btnNewExchange: 'Sumbang / Tukar Barangan',
  btnReserve: 'Tempah / Tuntut',
  btnContactSecurely: 'Hubungi Melalui Platform',
  btnVerifyResident: 'Sahkan Akaun Penduduk',
  btnFilter: 'Tapis',
  btnSearch: 'Cari di hab komuniti...',
  btnSubmit: 'Hantar',
  btnCancel: 'Batal',
  btnSave: 'Simpan',
  btnDelete: 'Padam',
  btnEdit: 'Sunting',
  btnClose: 'Tutup',
  btnSwitchRole: 'Tukar Peranan Ujian',
  switchProfileError: 'Pertukaran Akaun Gagal',
  switchedAccountTitle: 'Akaun Aktif Ditukar',
  btnAnonymousToggle: 'Hantar Tanpa Nama kepada Jiran',
  anonymousNotice: 'Notis Kerahsiaan: Identiti anda dilindungi daripada jiran di papan awam, namun pihak pengurusan perbandaran menyimpan rekod kebertanggungjawaban untuk penyelesaian.',
  pinnedPost: 'Pengumuman Disematkan',
  btnPublish: 'Terbitkan Hantaran',
  signIn: 'Log Masuk',
  signOut: 'Log Keluar',
  contactUs: 'Hubungi Kami',
  
  // Circular Exchange
  exchangeDivertedMetric: 'Barangan Rumah Dielakkan dari Tapak Pelupusan',
  exchangeTypeGiveaway: 'Pemberian Percuma',
  exchangeTypeExchange: 'Barter / Pertukaran Terus',
  exchangeTypeLoan: 'Pinjaman Alatan Komuniti',
  conditionBrandNew: 'Baru Dalam Kotak',
  conditionLikeNew: 'Seperti Baru (9/10)',
  conditionGood: 'Keadaan Baik (7/10)',
  conditionFair: 'Berfungsi / Sederhana (5/10)',
  
  // Local Services
  servicesOffering: 'Menawarkan Khidmat',
  servicesRequesting: 'Memohon Bantuan',
  
  // Management Console
  mgmtStatsTitle: 'Konsol Pengurusan Perbandaran',
  mgmtActiveIncidents: 'Insiden Aktif',
  mgmtPendingVerification: 'Pengesahan Penduduk',
  mgmtReportedFlags: 'Laporan Moderasi',
  mgmtAuditTrail: 'Jejak Audit Pentadbiran',
  
  // AI Assistant
  aiAssistant: 'AI Assistant',
  aiThinking: 'Sedang memproses...',
  aiAskPlaceholder: 'Tanya AI Assistant...',
  aiWelcome: 'Hai! Saya Pembantu AI TESDH perbandaran anda. Bagaimana saya boleh bantu anda hari ini?',
  aiClearChat: 'Kosongkan Perbualan',
  aiSuggestedQuestions: 'Cadangan Soalan',
  
  // Settings & Localization
  settingsTitle: 'Tetapan & Keutamaan',
  settingsLanguage: 'Bahasa & Penyetempatan',
  settingsLanguageDesc: 'Pilih bahasa paparan keutamaan anda untuk gesaan sistem, panduan perbandaran, dan butang tindakan.',
  settingsAppearance: 'Rupa & Tema',
  settingsNotifications: 'Pemberitahuan',
  settingsPrivacy: 'Privasi & Keselamatan',
  settingsAccount: 'Profil Penduduk',
  
  // Form Validation & Feedback
  msgRequiredField: 'Medan ini diperlukan.',
  msgWriteSuccess: 'Perubahan berjaya disimpan ke pangkalan data.',
  msgWriteError: 'Penyegerakan pangkalan data gagal. Sila semak sambungan atau kebenaran akaun anda.',
  msgPostCreated: 'Hantaran berjaya diterbitkan.',
  msgIncidentReported: 'Laporan insiden berjaya dihantar ke pasukan tindakan pengurusan.',
  msgItemCreated: 'Penyenaraian pertukaran berjaya diterbitkan.',
  msgServiceCreated: 'Penyenaraian perkhidmatan berjaya dicipta.',
  
  // Empty States
  emptyPosts: 'Tiada hantaran komuniti lagi. Jadilah yang pertama berkongsi perkembangan!',
  emptyIncidents: 'Tiada insiden dilaporkan di presint ini. Keadaan persekitaran adalah selamat.',
  emptyExchange: 'Tiada barangan disenaraikan untuk pertukaran atau sumbangan percuma pada masa ini.',
  emptyServices: 'Tiada perkhidmatan setempat ditawarkan dalam kategori ini lagi.',
  emptyNotifications: 'Anda tiada pemberitahuan baharu.',
  
  // Home & Welcome
  welcomeTitle: 'Selamat Datang ke Komuniti Anda',
  welcomeSubtitle: 'Kekal berhubung, hulurkan bantuan dan terokai apa yang berlaku di sekitar Elmina.',
  feedTitle: 'Suapan Komuniti',
  feedSubtitle: 'Ketahui apa yang sedang dibincangkan oleh jiran tetangga anda.',
  resilienceTitle: 'Peta Ketahanan',
  resilienceSubtitle: 'Kekal maklum tentang insiden dan keadaan setempat.',
  exchangeTitle: 'Pusat Pertukaran',
  exchangeSubtitle: 'Beri percuma, tukar, atau pinjam barangan dalam perbandaran.',
  servicesTitle: 'Perkhidmatan Setempat',
  servicesSubtitle: 'Cari dan tawarkan kemahiran, bantuan, atau perkhidmatan dengan jiran.',
  messagesTitle: 'Mesej Selamat',
  messagesSubtitle: 'Komunikasi peribadi yang selamat dengan penduduk disahkan.',
  settingsSectionTitle: 'Tetapan & Keutamaan',
  settingsSectionSubtitle: 'Urus keutamaan dan antara muka peranti anda.',
  
  // Demo Mode Notice
  demoActiveBanner: 'Mod Demo Aktif (set data Bandar Elmina). Anda boleh menukar peranan penduduk, pengurusan, dan keselamatan untuk menguji semua aliran!',
  liveConnectedBanner: 'Tersambung ke Pangkalan Data Langsung Supabase',

  // Phase 4 Management Console
  mgmtOverview: 'Gambaran Keseluruhan',
  mgmtAiInsights: 'Kecerdasan AI',
  mgmtAnalytics: 'Analitik & Laporan',
  mgmtModeration: 'Laporan & Moderasi',
  mgmtIncidents: 'Pengurusan Insiden',
  mgmtResidents: 'Tadbir Urus Penduduk',
  mgmtContent: 'Kandungan Komuniti',
  mgmtNotices: 'Notis Rasmi',
  mgmtEvents: 'Acara Perbandaran',
  mgmtAlerts: 'Amaran & Siaran',
  mgmtAudit: 'Log Aktiviti & Audit',
  mgmtSettings: 'Tetapan Pengurusan',
  
  mgmtPeriod7d: '7 Hari Terakhir',
  mgmtPeriod30d: '30 Hari Terakhir',
  mgmtPeriod90d: '90 Hari Terakhir',
  mgmtPeriodCustom: 'Julat Tersuai',
  
  mgmtAskAiTitle: 'Tanya AI Pengurusan',
  mgmtAskAiPlaceholder: 'Tanya soalan operasi (cth: "Ringkaskan laporan yang belum diselesaikan bulan ini")...',
  mgmtViewRecords: 'Lihat Rekod Berkaitan',
  mgmtExportPdf: 'Cetak / Simpan PDF',
  mgmtExportCsv: 'Eksport CSV',
  mgmtAcknowledgeAlert: 'Maklum Balas',
  mgmtAlertsActive: 'Amaran Operasi Aktif',
  mgmtMttr: 'Purata Masa Penyelesaian (MTTR)',
  mgmtResolutionVelocity: 'Kadar Penyelesaian Insiden',
};

export const translations = {
  en: englishStrings,
  bm: malayStrings,
  'ms-MY': malayStrings,
};
