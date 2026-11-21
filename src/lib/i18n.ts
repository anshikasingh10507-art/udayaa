export type LanguageCode = 'en' | 'hi' | 'mr' | 'ta' | 'te' | 'es';

export interface LanguageOption {
  code: LanguageCode;
  label: string;
  nativeName: string;
  englishName: string;
  bcp47: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', label: 'EN', nativeName: 'English', englishName: 'English', bcp47: 'en-IN' },
  { code: 'hi', label: 'हिन्दी', nativeName: 'हिन्दी', englishName: 'Hindi', bcp47: 'hi-IN' },
  { code: 'mr', label: 'मराठी', nativeName: 'मराठी', englishName: 'Marathi', bcp47: 'mr-IN' },
  { code: 'ta', label: 'தமிழ்', nativeName: 'தமிழ்', englishName: 'Tamil', bcp47: 'ta-IN' },
  { code: 'te', label: 'తెలుగు', nativeName: 'తెలుగు', englishName: 'Telugu', bcp47: 'te-IN' },
  { code: 'es', label: 'ES', nativeName: 'Español', englishName: 'Spanish', bcp47: 'es-ES' },
];

export type TranslationKey =
  | 'nav.marketplace'
  | 'nav.zeroIdle'
  | 'nav.costEstimator'
  | 'nav.howItWorks'
  | 'nav.about'
  | 'nav.signIn'
  | 'nav.signOut'
  | 'hero.kicker'
  | 'hero.title'
  | 'hero.subtitle'
  | 'hero.searchPlaceholder'
  | 'hero.allLocations'
  | 'hero.findEquipment'
  | 'hero.listEquipment'
  | 'hero.postJob'
  | 'hero.positioningLabel'
  | 'hero.positioningText'
  | 'home.categoriesTitle'
  | 'home.categoriesSubtitle'
  | 'home.viewMarketplace'
  | 'home.featuredTitle'
  | 'home.featuredSubtitle'
  | 'home.browseAll'
  | 'home.highCapexTitle'
  | 'home.highCapexSubtitle'
  | 'home.workflowKicker'
  | 'home.workflowTitle'
  | 'home.workflowSubtitle'
  | 'home.tryZeroIdle'
  | 'home.readWorkflow'
  | 'market.title'
  | 'market.subtitle'
  | 'market.postJobInstead'
  | 'market.filterHeader'
  | 'market.keywordLabel'
  | 'market.keywordPlaceholder'
  | 'market.sectorLabel'
  | 'market.sectorAll'
  | 'market.sectorConstruction'
  | 'market.sectorLab'
  | 'market.sectorCnc'
  | 'market.sectorSurvey'
  | 'market.categoryLabel'
  | 'market.allCategories'
  | 'market.cityLabel'
  | 'market.allCities'
  | 'market.maxRateLabel'
  | 'market.verifiedOnly'
  | 'market.highCapexOnly'
  | 'market.excludeUnavailable'
  | 'market.operatorAvailable'
  | 'market.transportAvailable'
  | 'market.resetFilters'
  | 'market.applyFilters'
  | 'badge.verifiedMachinery'
  | 'badge.documentsReviewed'
  | 'badge.highCapexRentOnly'
  | 'card.openForRequests'
  | 'card.underMaintenance'
  | 'card.paused'
  | 'card.perDay'
  | 'card.operatorOption'
  | 'card.dryHire'
  | 'card.deliveryAvailable'
  | 'card.pickupTransport'
  | 'card.assetValue'
  | 'escrow.title'
  | 'escrow.subtitle'
  | 'escrow.fundButton'
  | 'escrow.confirmHandover'
  | 'escrow.releaseFunds'
  | 'escrow.openDispute'
  | 'escrow.protectedBadge'
  | 'escrow.statusPending'
  | 'escrow.statusFunded'
  | 'escrow.statusHandover'
  | 'escrow.statusReleased'
  | 'escrow.statusRefunded'
  | 'escrow.statusDisputed'
  | 'voice.buttonLabel'
  | 'voice.title'
  | 'voice.subtitle'
  | 'voice.placeholder'
  | 'voice.startRecording'
  | 'voice.stopRecording'
  | 'voice.listening'
  | 'voice.transcribing'
  | 'voice.thinking'
  | 'voice.autoSpeak'
  | 'voice.playAudio'
  | 'voice.stopAudio'
  | 'voice.quickPrompt1'
  | 'voice.quickPrompt2'
  | 'voice.quickPrompt3'
  | 'voice.quickPrompt4'
  | 'footer.tagline'
  | 'footer.escrowNote';

type Dict = Record<TranslationKey, string>;

export const TRANSLATIONS: Record<LanguageCode, Dict> = {
  en: {
    'nav.marketplace': 'Marketplace',
    'nav.zeroIdle': 'Zero-Idle Match',
    'nav.costEstimator': 'Cost Estimator',
    'nav.howItWorks': 'How It Works',
    'nav.about': 'About',
    'nav.signIn': 'Sign In',
    'nav.signOut': 'Sign Out',
    'hero.kicker': 'Multi-Sector Zero-Idle Equipment & Lab Network',
    'hero.title': 'Make Equipment Work. Not Sit Idle.',
    'hero.subtitle':
      'Rent construction machinery, costly laboratory instruments, 5-axis CNC centers, and 3D survey scanners with escrow protection and verified inspection records.',
    'hero.searchPlaceholder': 'Search HPLC lab, microscope, JCB, CNC, generator...',
    'hero.allLocations': 'All locations',
    'hero.findEquipment': 'Find Equipment',
    'hero.listEquipment': 'List Your Equipment',
    'hero.postJob': 'Post a Job Request',
    'hero.positioningLabel': 'Core positioning',
    'hero.positioningText': 'Udaya helps idle machinery—from excavators to ₹1 Cr+ lab gear—find demand.',
    'home.categoriesTitle': 'Equipment & Lab Categories',
    'home.categoriesSubtitle':
      'From heavy construction machinery to high-capex analytical lab instruments and precision CNC systems that organizations rent instead of buying.',
    'home.viewMarketplace': 'View full marketplace',
    'home.featuredTitle': 'Verified & High-Value Equipment',
    'home.featuredSubtitle':
      'Demonstration inventory is clearly marked. Look for the Udaya Verified Machinery Badge and Escrow protection.',
    'home.browseAll': 'Browse all listings',
    'home.highCapexTitle': 'Rent-Only High-Capex Lab & Precision Machinery',
    'home.highCapexSubtitle':
      'Access ₹45L–₹1.5Cr+ spectrometers, confocal microscopes, 5-axis CNC centers, and 3D LiDAR systems on-demand between institutional projects.',
    'home.workflowKicker': 'Zero-Idle Matching & Escrow Protection',
    'home.workflowTitle': 'Beyond passive browsing: connect jobs directly to verified idle machinery',
    'home.workflowSubtitle':
      'Describe your project once. Udaya matches verified equipment, protects both sides via Escrow holds, and speaks your language.',
    'home.tryZeroIdle': 'Try Zero-Idle Job Request',
    'home.readWorkflow': 'Read Workflow Details',
    'market.title': 'Equipment & Lab Marketplace',
    'market.subtitle':
      'Filter verified construction machinery, high-capex laboratory instruments, CNC machines, and survey systems by location and dates.',
    'market.postJobInstead': 'Post a Job Request Instead',
    'market.filterHeader': 'Search & Filter Equipment',
    'market.keywordLabel': 'Keyword or model',
    'market.keywordPlaceholder': 'e.g. HPLC, microscope, CNC, JCB, LiDAR',
    'market.sectorLabel': 'Equipment Sector',
    'market.sectorAll': 'All sectors',
    'market.sectorConstruction': 'Construction & Heavy Site',
    'market.sectorLab': 'Laboratory & Biotech (Rent-Only)',
    'market.sectorCnc': 'Precision CNC & Metrology',
    'market.sectorSurvey': '3D LiDAR & Survey',
    'market.categoryLabel': 'Category',
    'market.allCategories': 'All categories',
    'market.cityLabel': 'Location city',
    'market.allCities': 'All cities',
    'market.maxRateLabel': 'Max daily rate (₹)',
    'market.verifiedOnly': 'Verified Machinery Badge only',
    'market.highCapexOnly': 'High-capex / Rent-only lab & precision',
    'market.excludeUnavailable': 'Exclude maintenance / unavailable',
    'market.operatorAvailable': 'Operator / technician available',
    'market.transportAvailable': 'Transport available',
    'market.resetFilters': 'Reset filters',
    'market.applyFilters': 'Apply Filters',
    'badge.verifiedMachinery': 'Verified Machinery',
    'badge.documentsReviewed': 'Docs Submitted',
    'badge.highCapexRentOnly': 'High-Capex · Rent Only',
    'card.openForRequests': 'Open for requests',
    'card.underMaintenance': 'Under maintenance',
    'card.paused': 'Paused by owner',
    'card.perDay': '/ day',
    'card.operatorOption': 'Operator / tech option',
    'card.dryHire': 'Dry hire / self-run',
    'card.deliveryAvailable': 'Delivery available',
    'card.pickupTransport': 'On-site / lab access',
    'card.assetValue': 'Asset value',
    'escrow.title': 'Udaya Escrow Payment Protection',
    'escrow.subtitle': 'Rental fees & refundable security deposit are held safely until handover and return inspection.',
    'escrow.fundButton': 'Fund Escrow & Confirm Booking',
    'escrow.confirmHandover': 'Confirm Equipment Handover',
    'escrow.releaseFunds': 'Confirm Return & Release Escrow',
    'escrow.openDispute': 'Freeze & Open Dispute',
    'escrow.protectedBadge': 'Escrow Protected',
    'escrow.statusPending': 'Awaiting Escrow Funding',
    'escrow.statusFunded': 'Escrow Funded & Held Safely',
    'escrow.statusHandover': 'Handover Confirmed · Funds Held',
    'escrow.statusReleased': 'Released to Owner · Deposit Refunded',
    'escrow.statusRefunded': 'Refunded to Renter',
    'escrow.statusDisputed': 'Frozen — Dispute Under Admin Review',
    'voice.buttonLabel': 'Voice Assistant',
    'voice.title': 'Udaya Voice Assistant',
    'voice.subtitle': 'Speak or type in 6 languages to search verified machinery, lab gear, or escrow bookings.',
    'voice.placeholder': 'Ask about lab HPLC, verified JCBs, or escrow...',
    'voice.startRecording': 'Tap to Speak',
    'voice.stopRecording': 'Stop & Send',
    'voice.listening': 'Recording voice...',
    'voice.transcribing': 'Transcribing speech...',
    'voice.thinking': 'Finding best matches...',
    'voice.autoSpeak': 'Read replies aloud',
    'voice.playAudio': 'Listen',
    'voice.stopAudio': 'Stop',
    'voice.quickPrompt1': 'Find verified lab equipment in Pune',
    'voice.quickPrompt2': 'Show 5-axis CNC or microscope for rent',
    'voice.quickPrompt3': 'How does escrow payment protection work?',
    'voice.quickPrompt4': 'Help me post a Zero-Idle job request',
    'footer.tagline':
      'Udaya helps equipment find demand. Connecting construction fleets, high-capex R&D labs, and precision workshops with verified transparency and escrow protection.',
    'footer.escrowNote':
      'Escrow ledger workflows operate in sandbox demonstration mode with server-verified state transitions. Sample listings are clearly labeled.',
  },
  hi: {
    'nav.marketplace': 'मार्केटप्लेस',
    'nav.zeroIdle': 'ज़ीरो-आइडल मैच',
    'nav.costEstimator': 'लागत अनुमान',
    'nav.howItWorks': 'यह कैसे काम करता है',
    'nav.about': 'हमारे बारे में',
    'nav.signIn': 'साइन इन',
    'nav.signOut': 'साइन आउट',
    'hero.kicker': 'मल्टी-सेक्टर ज़ीरो-आइडल उपकरण और लैब नेटवर्क',
    'hero.title': 'मशीनों को काम पर लगाएं। खाली न बैठने दें।',
    'hero.subtitle':
      'निर्माण मशीनरी, महंगे लैब उपकरण (HPLC, माइक्रोस्कोप), 5-एक्सिस CNC और 3D LiDAR स्कैनर एस्क्रो सुरक्षा और सत्यापित बैज के साथ किराए पर लें।',
    'hero.searchPlaceholder': 'HPLC लैब, माइक्रोस्कोप, JCB, CNC, जनरेटर खोजें...',
    'hero.allLocations': 'सभी शहर',
    'hero.findEquipment': 'उपकरण खोजें',
    'hero.listEquipment': 'अपना उपकरण सूचीबद्ध करें',
    'hero.postJob': 'जॉब रिक्वेस्ट पोस्ट करें',
    'hero.positioningLabel': 'मुख्य उद्देश्य',
    'hero.positioningText': 'उदय खाली मशीनों—जेसीबी से लेकर ₹1 करोड़+ लैब उपकरणों तक—को सही मांग से जोड़ता है।',
    'home.categoriesTitle': 'उपकरण और लैब श्रेणियां',
    'home.categoriesSubtitle':
      'भारी निर्माण मशीनों से लेकर महंगे रिसर्च लैब उपकरणों और सटीक CNC मशीनों तक, जिन्हें खरीदना कठिन है और किराए पर लेना आसान।',
    'home.viewMarketplace': 'पूरा मार्केटप्लेस देखें',
    'home.featuredTitle': 'सत्यापित और उच्च-मूल्य उपकरण',
    'home.featuredSubtitle':
      'सैंपल लिस्टिंग स्पष्ट रूप से चिह्नित हैं। उदय वेरिफाइड मशीनरी बैज और एस्क्रो सुरक्षा देखें।',
    'home.browseAll': 'सभी उपकरण देखें',
    'home.highCapexTitle': 'उच्च-लागत लैब और सटीक मशीनरी (केवल किराए के लिए)',
    'home.highCapexSubtitle':
      '₹45 लाख से ₹1.5 करोड़+ कीमत वाले स्पेक्ट्रोमीटर, कॉन्फोकल माइक्रोस्कोप और CNC मशीनें जरूरत के अनुसार किराए पर प्राप्त करें।',
    'home.workflowKicker': 'ज़ीरो-आइडल मैचिंग और एस्क्रो सुरक्षा',
    'home.workflowTitle': 'केवल ब्राउज़िंग नहीं: अपने काम को सीधे सत्यापित खाली मशीनों से जोड़ें',
    'home.workflowSubtitle':
      'अपनी जरूरत एक बार दर्ज करें। उदय सही मशीनें मिलाता है, एस्क्रो से भुगतान सुरक्षित रखता है और आपकी भाषा में सहायता करता है।',
    'home.tryZeroIdle': 'ज़ीरो-आइडल रिक्वेस्ट आज़माएं',
    'home.readWorkflow': 'कार्यप्रणाली पढ़ें',
    'market.title': 'उपकरण और लैब मार्केटप्लेस',
    'market.subtitle':
      'सत्यापित निर्माण मशीनरी, लैब उपकरण, CNC और सर्वे स्कैनर को शहर, श्रेणी और तारीख से फ़िल्टर करें।',
    'market.postJobInstead': 'इसके बजाय जॉब रिक्वेस्ट पोस्ट करें',
    'market.filterHeader': 'उपकरण खोजें और फ़िल्टर करें',
    'market.keywordLabel': 'कीवर्ड या मॉडल',
    'market.keywordPlaceholder': 'जैसे HPLC, माइक्रोस्कोप, CNC, JCB',
    'market.sectorLabel': 'उपकरण क्षेत्र',
    'market.sectorAll': 'सभी क्षेत्र',
    'market.sectorConstruction': 'निर्माण और भारी मशीनरी',
    'market.sectorLab': 'लैब और बायोटेक उपकरण (केवल किराए पर)',
    'market.sectorCnc': 'प्रिसिजन CNC और मेट्रोलॉजी',
    'market.sectorSurvey': '3D LiDAR और सर्वेक्षण',
    'market.categoryLabel': 'श्रेणी',
    'market.allCategories': 'सभी श्रेणियां',
    'market.cityLabel': 'शहर',
    'market.allCities': 'सभी शहर',
    'market.maxRateLabel': 'अधिकतम दैनिक दर (₹)',
    'market.verifiedOnly': 'केवल सत्यापित मशीनरी बैज',
    'market.highCapexOnly': 'केवल उच्च-लागत लैब और प्रिसिजन',
    'market.excludeUnavailable': 'अनुपलब्ध / मेंटेनेंस हटाएं',
    'market.operatorAvailable': 'ऑपरेटर / तकनीशियन उपलब्ध',
    'market.transportAvailable': 'ट्रांसपोर्ट उपलब्ध',
    'market.resetFilters': 'फ़िल्टर रीसेट करें',
    'market.applyFilters': 'फ़िल्टर लागू करें',
    'badge.verifiedMachinery': 'सत्यापित मशीनरी',
    'badge.documentsReviewed': 'दस्तावेज़ जमा',
    'badge.highCapexRentOnly': 'उच्च-लागत · केवल किराया',
    'card.openForRequests': 'अनुरोध के लिए उपलब्ध',
    'card.underMaintenance': 'रखरखाव में',
    'card.paused': 'मालिक द्वारा रोका गया',
    'card.perDay': '/ दिन',
    'card.operatorOption': 'ऑपरेटर / टेक विकल्प',
    'card.dryHire': 'बिना ऑपरेटर',
    'card.deliveryAvailable': 'डिलीवरी उपलब्ध',
    'card.pickupTransport': 'लैब / साइट एक्सेस',
    'card.assetValue': 'मशीन मूल्य',
    'escrow.title': 'उदय एस्क्रो भुगतान सुरक्षा',
    'escrow.subtitle': 'किराया और रिफंडेबल सुरक्षा जमा राशि सुरक्षित रूप से एस्क्रो में रखी जाती है जब तक मशीन सही सलामत वापस न हो जाए।',
    'escrow.fundButton': 'एस्क्रो में जमा करें और बुकिंग पक्की करें',
    'escrow.confirmHandover': 'मशीन हैंडओवर की पुष्टि करें',
    'escrow.releaseFunds': 'वापसी की पुष्टि करें और एस्क्रो रिलीज़ करें',
    'escrow.openDispute': 'भुगतान रोकें / विवाद दर्ज करें',
    'escrow.protectedBadge': 'एस्क्रो सुरक्षित',
    'escrow.statusPending': 'एस्क्रो भुगतान प्रतीक्षित',
    'escrow.statusFunded': 'एस्क्रो सुरक्षित रूप से जमा',
    'escrow.statusHandover': 'हैंडओवर पक्का · राशि सुरक्षित',
    'escrow.statusReleased': 'मालिक को भुगतान · जमा राशि वापस',
    'escrow.statusRefunded': 'किराएदार को वापस किया गया',
    'escrow.statusDisputed': 'रोका गया — एडमिन जांच जारी',
    'voice.buttonLabel': 'वॉइस असिस्टेंट',
    'voice.title': 'उदय वॉइस असिस्टेंट',
    'voice.subtitle': 'सत्यापित मशीनें, लैब उपकरण या एस्क्रो जानकारी खोजने के लिए 6 भाषाओं में बोलें या लिखें।',
    'voice.placeholder': 'लैब HPLC, सत्यापित JCB या एस्क्रो के बारे में पूछें...',
    'voice.startRecording': 'बोलने के लिए टैप करें',
    'voice.stopRecording': 'रोकें और भेजें',
    'voice.listening': 'आवाज़ रिकॉर्ड हो रही है...',
    'voice.transcribing': 'आवाज़ को टेक्स्ट में बदल रहे हैं...',
    'voice.thinking': 'सही उपकरण खोज रहे हैं...',
    'voice.autoSpeak': 'जवाब बोलकर सुनाएं',
    'voice.playAudio': 'सुनें',
    'voice.stopAudio': 'रोकें',
    'voice.quickPrompt1': 'पुणे में सत्यापित लैब उपकरण दिखाएं',
    'voice.quickPrompt2': 'किराए के लिए CNC या माइक्रोस्कोप दिखाएं',
    'voice.quickPrompt3': 'एस्क्रो भुगतान सुरक्षा कैसे काम करती है?',
    'voice.quickPrompt4': 'ज़ीरो-आइडल जॉब रिक्वेस्ट पोस्ट करने में मदद करें',
    'footer.tagline':
      'उदय उपकरणों को मांग से जोड़ता है। निर्माण फ्लीट, उच्च-लागत रिसर्च लैब और प्रिसिजन वर्कशॉप के लिए पारदर्शी किराया और एस्क्रो नेटवर्क।',
    'footer.escrowNote':
      'एस्क्रो लेजर सैंडबॉक्स डेमो मोड में सर्वर-सत्यापित ट्रांजिशन के साथ चलता है। सैंपल लिस्टिंग स्पष्ट रूप से चिह्नित हैं।',
  },
  mr: {
    'nav.marketplace': 'मार्केटप्लेस',
    'nav.zeroIdle': 'झिरो-आयडल मॅच',
    'nav.costEstimator': 'खर्च अंदाज',
    'nav.howItWorks': 'हे कसे चालते',
    'nav.about': 'आमच्याबद्दल',
    'nav.signIn': 'साइन इन',
    'nav.signOut': 'साइन आउट',
    'hero.kicker': 'मल्टी-सेक्टर झिरो-आयडल यंत्रसामग्री आणि लॅब नेटवर्क',
    'hero.title': 'यंत्रसामग्री कामावर लावा. रिकामी ठेवू नका.',
    'hero.subtitle':
      'बांधकाम यंत्रे, महागडी प्रयोगशाळा उपकरणे (HPLC, मायक्रोस्कोप), 5-अ‍ॅक्सिस CNC आणि 3D LiDAR स्कॅनर एस्क्रो सुरक्षेसह आणि प्रमाणित बॅजसह भाड्याने घ्या.',
    'hero.searchPlaceholder': 'HPLC लॅब, मायक्रोस्कोप, JCB, CNC, जनरेटर शोधा...',
    'hero.allLocations': 'सर्व शहरे',
    'hero.findEquipment': 'यंत्रे शोधा',
    'hero.listEquipment': 'तुमचे यंत्र जोडा',
    'hero.postJob': 'कामाची विनंती पोस्ट करा',
    'hero.positioningLabel': 'मुख्य ध्येय',
    'hero.positioningText': 'उदय रिकाम्या यंत्रसामग्रीला—जेसीबीपासून ₹1 कोटी+ लॅब उपकरणांपर्यंत—योग्य मागणीशी जोडते.',
    'home.categoriesTitle': 'यंत्रसामग्री आणि लॅब श्रेणी',
    'home.categoriesSubtitle':
      'बांधकाम यंत्रांपासून महागड्या वैज्ञानिक प्रयोगशाळा उपकरणांपर्यंत आणि प्रिसिजन CNC केंद्रांपर्यंत सर्व एकाच ठिकाणी.',
    'home.viewMarketplace': 'संपूर्ण मार्केटप्लेस पहा',
    'home.featuredTitle': 'प्रमाणित आणि उच्च-मूल्य यंत्रसामग्री',
    'home.featuredSubtitle': 'नमुना यादी स्पष्टपणे दर्शविली आहे. उदय प्रमाणित यंत्रसामग्री बॅज आणि एस्क्रो सुरक्षा पहा.',
    'home.browseAll': 'सर्व यंत्रे पहा',
    'home.highCapexTitle': 'केवळ भाड्यासाठी महागडी लॅब आणि प्रिसिजन यंत्रे',
    'home.highCapexSubtitle':
      '₹45 लाख ते ₹1.5 कोटी+ किमतीचे स्पेक्ट्रोमीटर, कॉन्फोकल मायक्रोस्कोप आणि 5-अ‍ॅक्सिस CNC यंत्रे प्रकल्पासाठी भाड्याने घ्या.',
    'home.workflowKicker': 'झिरो-आयडल मॅचिंग आणि एस्क्रो सुरक्षा',
    'home.workflowTitle': 'केवळ शोध नाही: तुमचे काम थेट प्रमाणित रिकाम्या यंत्रांशी जोडा',
    'home.workflowSubtitle':
      'कामाचा तपशील एकदाच नोंदवा. उदय सुसंगत यंत्रे जुळवते, एस्क्रोद्वारे रक्कम सुरक्षित ठेवते आणि तुमच्या भाषेत मदत करते.',
    'home.tryZeroIdle': 'झिरो-आयडल विनंती करून पहा',
    'home.readWorkflow': 'कार्यपद्धती वाचा',
    'market.title': 'यंत्रसामग्री आणि लॅब मार्केटप्लेस',
    'market.subtitle': 'प्रमाणित बांधकाम यंत्रे, लॅब उपकरणे, CNC आणि सर्वे स्कॅनर शहर व तारखेनुसार शोधा.',
    'market.postJobInstead': 'त्याऐवजी कामाची विनंती पोस्ट करा',
    'market.filterHeader': 'यंत्रे शोधा आणि फिल्टर करा',
    'market.keywordLabel': 'कीवर्ड किंवा मॉडेल',
    'market.keywordPlaceholder': 'उदा. HPLC, मायक्रोस्कोप, CNC, JCB',
    'market.sectorLabel': 'यंत्रसामग्री विभाग',
    'market.sectorAll': 'सर्व विभाग',
    'market.sectorConstruction': 'बांधकाम आणि अवजड यंत्रे',
    'market.sectorLab': 'लॅब आणि बायोटेक (केवळ भाड्याने)',
    'market.sectorCnc': 'प्रिसिजन CNC आणि मेट्रोलॉजी',
    'market.sectorSurvey': '3D LiDAR आणि सर्वेक्षण',
    'market.categoryLabel': 'श्रेणी',
    'market.allCategories': 'सर्व श्रेणी',
    'market.cityLabel': 'शहर',
    'market.allCities': 'सर्व शहरे',
    'market.maxRateLabel': 'कमाल दैनिक दर (₹)',
    'market.verifiedOnly': 'केवळ प्रमाणित यंत्रसामग्री बॅज',
    'market.highCapexOnly': 'केवळ महागडी लॅब व प्रिसिजन यंत्रे',
    'market.excludeUnavailable': 'देखभालीखालील यंत्रे वगळा',
    'market.operatorAvailable': 'ऑपरेटर / तंत्रज्ञ उपलब्ध',
    'market.transportAvailable': 'वाहतूक उपलब्ध',
    'market.resetFilters': 'फिल्टर रीसेट करा',
    'market.applyFilters': 'फिल्टर लागू करा',
    'badge.verifiedMachinery': 'प्रमाणित यंत्रसामग्री',
    'badge.documentsReviewed': 'कागदपत्रे सादर',
    'badge.highCapexRentOnly': 'उच्च-भांडवल · केवळ भाडे',
    'card.openForRequests': 'विनंतीसाठी उपलब्ध',
    'card.underMaintenance': 'देखभालीखाली',
    'card.paused': 'मालकाने थांबवले',
    'card.perDay': '/ दिवस',
    'card.operatorOption': 'ऑपरेटर / टेक पर्याय',
    'card.dryHire': 'ऑपरेटरशिवाय',
    'card.deliveryAvailable': 'डिलिव्हरी उपलब्ध',
    'card.pickupTransport': 'लॅब / साइट वापर',
    'card.assetValue': 'यंत्राचे मूल्य',
    'escrow.title': 'उदय एस्क्रो पेमेंट सुरक्षा',
    'escrow.subtitle': 'भाडे व परत मिळणारी सुरक्षा ठेव यंत्र सुरक्षित परत येईपर्यंत एस्क्रोमध्ये सुरक्षित ठेवली जाते.',
    'escrow.fundButton': 'एस्क्रो भरा आणि बुकिंग पक्के करा',
    'escrow.confirmHandover': 'यंत्र हस्तांतरण निश्चित करा',
    'escrow.releaseFunds': 'परतफेडीची पुष्टी करा व एस्क्रो सोडा',
    'escrow.openDispute': 'रक्कम थांबवा / तक्रार नोंदवा',
    'escrow.protectedBadge': 'एस्क्रो सुरक्षित',
    'escrow.statusPending': 'एस्क्रो भरणा प्रलंबित',
    'escrow.statusFunded': 'एस्क्रो सुरक्षितपणे जमा',
    'escrow.statusHandover': 'हस्तांतरण पूर्ण · रक्कम सुरक्षित',
    'escrow.statusReleased': 'मालकाला रक्कम अदा · ठेव परत',
    'escrow.statusRefunded': 'भाडेकरूला रक्कम परत',
    'escrow.statusDisputed': 'गोठवले — प्रशासन तपासणी सुरू',
    'voice.buttonLabel': 'व्हॉइस असिस्टंट',
    'voice.title': 'उदय व्हॉइस असिस्टंट',
    'voice.subtitle': 'प्रमाणित यंत्रे, लॅब उपकरणे किंवा एस्क्रोसाठी 6 भाषांमध्ये बोला किंवा टाइप करा.',
    'voice.placeholder': 'पुण्यातील लॅब HPLC, JCB किंवा एस्क्रोबद्दल विचारा...',
    'voice.startRecording': 'बोलण्यासाठी टॅप करा',
    'voice.stopRecording': 'थांबवा आणि पाठवा',
    'voice.listening': 'आवाज रेकॉर्ड होत आहे...',
    'voice.transcribing': 'बोलणे मजकुरात रूपांतरित करत आहे...',
    'voice.thinking': 'योग्य यंत्रे शोधत आहे...',
    'voice.autoSpeak': 'उत्तरे मोठ्याने ऐका',
    'voice.playAudio': 'ऐका',
    'voice.stopAudio': 'थांबवा',
    'voice.quickPrompt1': 'पुण्यातील प्रमाणित लॅब उपकरणे दाखवा',
    'voice.quickPrompt2': 'भाड्यासाठी 5-अ‍ॅक्सिस CNC किंवा मायक्रोस्कोप दाखवा',
    'voice.quickPrompt3': 'एस्क्रो पेमेंट सुरक्षा कशी काम करते?',
    'voice.quickPrompt4': 'झिरो-आयडल जॉब रिक्वेस्ट पोस्ट करायला मदत करा',
    'footer.tagline':
      'उदय यंत्रसामग्रीला मागणीशी जोडते. बांधकाम, वैज्ञानिक लॅब आणि प्रिसिजन वर्कशॉपसाठी पारदर्शक व एस्क्रो-सुरक्षित प्लॅटफॉर्म.',
    'footer.escrowNote':
      'एस्क्रो व्यवहार डेमो मोडमध्ये सर्व्हर-प्रमाणित स्थितीसह चालतात. नमुना नोंदी स्पष्टपणे दर्शवल्या आहेत.',
  },
  ta: {
    'nav.marketplace': 'சந்தை',
    'nav.zeroIdle': 'ஜீரோ-ஐடில் பொருத்தம்',
    'nav.costEstimator': 'செலவு மதிப்பீடு',
    'nav.howItWorks': 'எப்படி செயல்படுகிறது',
    'nav.about': 'எங்களை பற்றி',
    'nav.signIn': 'உள்நுழைக',
    'nav.signOut': 'வெளியேறு',
    'hero.kicker': 'பல்துறை ஜீரோ-ஐடில் இயந்திரம் & ஆய்வக நெட்வொர்க்',
    'hero.title': 'இயந்திரங்களை செயல்படுத்துங்கள். சும்மா இருக்க விடாதீர்கள்.',
    'hero.subtitle':
      'கட்டுமான இயந்திரங்கள், விலை உயர்ந்த ஆய்வக கருவிகள் (HPLC, நுண்ணோக்கி), 5-அச்சு CNC மற்றும் 3D LiDAR ஸ்கேனர்களை எஸ்க்ரோ பாதுகாப்புடன் வாடகைக்கு பெறுங்கள்.',
    'hero.searchPlaceholder': 'HPLC ஆய்வகம், நுண்ணோக்கி, JCB, CNC தேடுங்கள்...',
    'hero.allLocations': 'அனைத்து நகரங்கள்',
    'hero.findEquipment': 'கருவிகளை தேடு',
    'hero.listEquipment': 'உங்கள் கருவியை சேர்க்கவும்',
    'hero.postJob': 'வேலை கோரிக்கை இடுங்கள்',
    'hero.positioningLabel': 'முக்கிய நோக்கம்',
    'hero.positioningText': 'உதயா சும்மா இருக்கும் இயந்திரங்களை—JCB முதல் ₹1 கோடி+ ஆய்வக கருவிகள் வரை—தேவையுடன் இணைக்கிறது.',
    'home.categoriesTitle': 'இயந்திரம் & ஆய்வக பிரிவுகள்',
    'home.categoriesSubtitle': 'கனரக கட்டுமான இயந்திரங்கள் மற்றும் வாடகைக்கு மட்டுமே கிடைக்கும் உயர்தர ஆய்வக/CNC கருவிகள்.',
    'home.viewMarketplace': 'முழு சந்தையை காண்க',
    'home.featuredTitle': 'சரிபார்க்கப்பட்ட & உயர்மதிப்பு கருவிகள்',
    'home.featuredSubtitle': 'மாதிரி பட்டியல்கள் தெளிவாகக் குறிக்கப்பட்டுள்ளன. சரிபார்க்கப்பட்ட முத்திரை மற்றும் எஸ்க்ரோ பாதுகாப்பை காண்க.',
    'home.browseAll': 'அனைத்தையும் காண்க',
    'home.highCapexTitle': 'வாடகைக்கு மட்டுமேயான உயர்-மூலதன ஆய்வக & CNC கருவிகள்',
    'home.highCapexSubtitle': '₹45 லட்சம்–₹1.5 கோடி+ மதிப்புள்ள ஆய்வக கருவிகளை திட்டத் தேவைக்கேற்ப வாடகைக்கு பெறுங்கள்.',
    'home.workflowKicker': 'ஜீரோ-ஐடில் பொருத்தம் & எஸ்க்ரோ பாதுகாப்பு',
    'home.workflowTitle': 'நேரடியாக சரிபார்க்கப்பட்ட இயந்திரங்களுடன் உங்கள் வேலையை இணைக்கவும்',
    'home.workflowSubtitle': 'ஒருமுறை தேவையைப் பதிவு செய்யுங்கள். உதயா பொருத்தமான கருவிகளை கண்டறிந்து எஸ்க்ரோ மூலம் பணத்தை பாதுகாக்கும்.',
    'home.tryZeroIdle': 'ஜீரோ-ஐடில் கோரிக்கை முயற்சிக்கவும்',
    'home.readWorkflow': 'விவரங்களை படிக்கவும்',
    'market.title': 'இயந்திரம் & ஆய்வக சந்தை',
    'market.subtitle': 'சரிபார்க்கப்பட்ட கட்டுமான இயந்திரங்கள், ஆய்வக கருவிகள் மற்றும் CNC இயந்திரங்களை வடிகட்டி தேடுங்கள்.',
    'market.postJobInstead': 'வேலை கோரிக்கை இடுங்கள்',
    'market.filterHeader': 'தேடல் & வடிகட்டிகள்',
    'market.keywordLabel': 'முக்கிய சொல் / மாடல்',
    'market.keywordPlaceholder': 'எ.கா. HPLC, நுண்ணோக்கி, CNC, JCB',
    'market.sectorLabel': 'துறை',
    'market.sectorAll': 'அனைத்து துறைகள்',
    'market.sectorConstruction': 'கட்டுமானம் & கனரக இயந்திரம்',
    'market.sectorLab': 'ஆய்வகம் & பயோடெக் (வாடகைக்கு மட்டும்)',
    'market.sectorCnc': 'துல்லிய CNC & அளவியல்',
    'market.sectorSurvey': '3D LiDAR & நில அளவை',
    'market.categoryLabel': 'பிரிவு',
    'market.allCategories': 'அனைத்து பிரிவுகள்',
    'market.cityLabel': 'நகரம்',
    'market.allCities': 'அனைத்து நகரங்கள்',
    'market.maxRateLabel': 'அதிகபட்ச தினசரி கட்டணம் (₹)',
    'market.verifiedOnly': 'சரிபார்க்கப்பட்ட இயந்திரம் மட்டும்',
    'market.highCapexOnly': 'உயர்-மூலதன ஆய்வக/துல்லிய கருவிகள் மட்டும்',
    'market.excludeUnavailable': 'பராமரிப்பில் உள்ளதை நீக்கு',
    'market.operatorAvailable': 'ஆபரேட்டர் / நிபுணர் உள்ளார்',
    'market.transportAvailable': 'போக்குவரத்து வசதி',
    'market.resetFilters': 'மீட்டமை',
    'market.applyFilters': 'வடிகட்டியைப் பயன்படுத்து',
    'badge.verifiedMachinery': 'சரிபார்க்கப்பட்ட இயந்திரம்',
    'badge.documentsReviewed': 'ஆவணங்கள் சமர்ப்பிக்கப்பட்டன',
    'badge.highCapexRentOnly': 'உயர்-மூலதனம் · வாடகை மட்டும்',
    'card.openForRequests': 'கோரிக்கைக்கு திறந்துள்ளது',
    'card.underMaintenance': 'பராமரிப்பில் உள்ளது',
    'card.paused': 'நிறுத்தப்பட்டுள்ளது',
    'card.perDay': '/ நாள்',
    'card.operatorOption': 'ஆபரேட்டர் விருப்பம்',
    'card.dryHire': 'ஆபரேட்டர் இன்றி',
    'card.deliveryAvailable': 'டெலிவரி உள்ளது',
    'card.pickupTransport': 'ஆய்வக / தள அணுகல்',
    'card.assetValue': 'கருவி மதிப்பு',
    'escrow.title': 'உதயா எஸ்க்ரோ கட்டணப் பாதுகாப்பு',
    'escrow.subtitle': 'வாடகை மற்றும் திரும்பப் பெறும் வைப்புத்தொகை கருவி திரும்பும் வரை எஸ்க்ரோவில் பாதுகாக்கப்படும்.',
    'escrow.fundButton': 'எஸ்க்ரோ செலுத்தி முன்பதிவை உறுதி செய்',
    'escrow.confirmHandover': 'கருவி ஒப்படைப்பை உறுதி செய்',
    'escrow.releaseFunds': 'திரும்புதலை உறுதி செய்து எஸ்க்ரோவை விடுவி',
    'escrow.openDispute': 'பணத்தை முடக்கு / புகார்',
    'escrow.protectedBadge': 'எஸ்க்ரோ பாதுகாப்பு',
    'escrow.statusPending': 'எஸ்க்ரோ செலுத்தல் நிலுவை',
    'escrow.statusFunded': 'எஸ்க்ரோ பாதுகாப்பாக வைக்கப்பட்டுள்ளது',
    'escrow.statusHandover': 'ஒப்படைப்பு உறுதி · பணம் பாதுகாப்பில்',
    'escrow.statusReleased': 'உரிமையாளருக்கு விடுவிக்கப்பட்டது · வைப்பு திரும்பியது',
    'escrow.statusRefunded': 'வாடகைதாரருக்கு திரும்பியது',
    'escrow.statusDisputed': 'முடக்கப்பட்டது — நிர்வாக பரிசீலனை',
    'voice.buttonLabel': 'குரல் உதவியாளர்',
    'voice.title': 'உதயா குரல் உதவியாளர்',
    'voice.subtitle': '6 மொழிகளில் பேசி அல்லது தட்டச்சு செய்து சரிபார்க்கப்பட்ட இயந்திரம் மற்றும் ஆய்வக கருவிகளைத் தேடுங்கள்.',
    'voice.placeholder': 'HPLC ஆய்வகம், JCB அல்லது எஸ்க்ரோ பற்றி கேளுங்கள்...',
    'voice.startRecording': 'பேச தட்டவும்',
    'voice.stopRecording': 'நிறுத்தி அனுப்பு',
    'voice.listening': 'குரல் பதிவு செய்யப்படுகிறது...',
    'voice.transcribing': 'குரலை உரையாக மாற்றுகிறது...',
    'voice.thinking': 'சிறந்த பொருத்தங்களை தேடுகிறது...',
    'voice.autoSpeak': 'பதில்களை வாசித்து காட்டு',
    'voice.playAudio': 'கேள்',
    'voice.stopAudio': 'நிறுத்து',
    'voice.quickPrompt1': 'புனேவில் சரிபார்க்கப்பட்ட ஆய்வக கருவிகளை காட்டு',
    'voice.quickPrompt2': 'வாடகைக்கு CNC அல்லது நுண்ணோக்கி காட்டு',
    'voice.quickPrompt3': 'எஸ்க்ரோ கட்டணப் பாதுகாப்பு எப்படி செயல்படும்?',
    'voice.quickPrompt4': 'ஜீரோ-ஐடில் வேலை கோரிக்கை இட உதவு',
    'footer.tagline': 'உதயா இயந்திரங்களை தேவையுடன் இணைக்கிறது. கட்டுமானம் மற்றும் உயர்-மதிப்பு ஆய்வகங்களுக்கான நம்பகமான வாடகை தளம்.',
    'footer.escrowNote': 'எஸ்க்ரோ செயல்முறை டெமோ பயன்முறையில் சேவையக சரிபார்ப்புடன் செயல்படுகிறது.',
  },
  te: {
    'nav.marketplace': 'మార్కెట్‌ప్లేస్',
    'nav.zeroIdle': 'జీరో-ఐడిల్ మ్యాచ్',
    'nav.costEstimator': 'ఖర్చు అంచనా',
    'nav.howItWorks': 'ఇది ఎలా పనిచేస్తుంది',
    'nav.about': 'మా గురించి',
    'nav.signIn': 'సైన్ ఇన్',
    'nav.signOut': 'సైన్ అవుట్',
    'hero.kicker': 'మల్టీ-సెక్టార్ జీరో-ఐడిల్ మెషినరీ & ల్యాబ్ నెట్‌వర్క్',
    'hero.title': 'యంత్రాలను పనిలో పెట్టండి. ఖాళీగా ఉంచకండి.',
    'hero.subtitle':
      'నిర్మాణ యంత్రాలు, ఖరీదైన ల్యాబ్ పరికరాలు (HPLC, మైక్రోస్కోప్), 5-యాక్సిస్ CNC మరియు 3D LiDAR స్కానర్లను ఎస్క్రో రక్షణ మరియు ధృవీకరించిన బ్యాడ్జ్‌తో అద్దెకు పొందండి.',
    'hero.searchPlaceholder': 'HPLC ల్యాబ్, మైక్రోస్కోప్, JCB, CNC వెతకండి...',
    'hero.allLocations': 'అన్ని నగరాలు',
    'hero.findEquipment': 'పరికరాలు వెతకండి',
    'hero.listEquipment': 'మీ పరికరాన్ని చేర్చండి',
    'hero.postJob': 'జాబ్ రిక్వెస్ట్ పోస్ట్ చేయండి',
    'hero.positioningLabel': 'ప్రధాన లక్ష్యం',
    'hero.positioningText': 'ఉదయ ఖాళీ యంత్రాలను—JCB నుండి ₹1 కోటి+ ల్యాబ్ పరికరాల వరకు—సరైన డిమాండ్‌తో కలుపుతుంది.',
    'home.categoriesTitle': 'పరికరాలు & ల్యాబ్ విభాగాలు',
    'home.categoriesSubtitle': 'నిర్మాణ యంత్రాలతో పాటు కొనడానికి ఖరీదైన శాస్త్రీయ ల్యాబ్ మరియు CNC పరికరాలు అద్దెకు అందుబాటులో ఉన్నాయి.',
    'home.viewMarketplace': 'పూర్తి మార్కెట్‌ప్లేస్ చూడండి',
    'home.featuredTitle': 'ధృవీకరించబడిన & అధిక-విలువ పరికరాలు',
    'home.featuredSubtitle': 'నమూనా జాబితాలు స్పష్టంగా గుర్తించబడ్డాయి. ధృవీకరించిన బ్యాడ్జ్ మరియు ఎస్క్రో రక్షణను చూడండి.',
    'home.browseAll': 'అన్నీ చూడండి',
    'home.highCapexTitle': 'అద్దెకు మాత్రమే ఖరీదైన ల్యాబ్ & ప్రిసిషన్ మెషినరీ',
    'home.highCapexSubtitle': '₹45 లక్షలు–₹1.5 కోటి+ విలువైన ల్యాబ్ పరికరాలు మరియు 5-యాక్సిస్ CNC యంత్రాలను ప్రాజెక్టు అవసరాలకు అద్దెకు పొందండి.',
    'home.workflowKicker': 'జీరో-ఐడిల్ మ్యాచింగ్ & ఎస్క్రో రక్షణ',
    'home.workflowTitle': 'మీ పనిని నేరుగా ధృవీకరించిన ఖాళీ యంత్రాలతో అనుసంధానించండి',
    'home.workflowSubtitle': 'మీ అవసరాన్ని ఒకసారి నమోదు చేయండి. ఉదయ సరైన యంత్రాలను చూపి, ఎస్క్రో ద్వారా చెల్లింపును సురక్షితంగా ఉంచుతుంది.',
    'home.tryZeroIdle': 'జీరో-ఐడిల్ రిక్వెస్ట్ ప్రయత్నించండి',
    'home.readWorkflow': 'వివరాలు చదవండి',
    'market.title': 'పరికరాలు & ల్యాబ్ మార్కెట్‌ప్లేస్',
    'market.subtitle': 'ధృవీకరించిన నిర్మాణ యంత్రాలు, ల్యాబ్ పరికరాలు, CNC మరియు సర్వే స్కానర్లను ఫిల్టర్ చేయండి.',
    'market.postJobInstead': 'బదులుగా జాబ్ రిక్వెస్ట్ పోస్ట్ చేయండి',
    'market.filterHeader': 'శోధన & ఫిల్టర్లు',
    'market.keywordLabel': 'కీవర్డ్ లేదా మోడల్',
    'market.keywordPlaceholder': 'ఉదా. HPLC, మైక్రోస్కోప్, CNC, JCB',
    'market.sectorLabel': 'విభాగం',
    'market.sectorAll': 'అన్ని విభాగాలు',
    'market.sectorConstruction': 'నిర్మాణ & భారీ యంత్రాలు',
    'market.sectorLab': 'ల్యాబ్ & బయోటెక్ (అద్దెకు మాత్రమే)',
    'market.sectorCnc': 'ప్రిసిషన్ CNC & మెట్రాలజీ',
    'market.sectorSurvey': '3D LiDAR & సర్వే',
    'market.categoryLabel': 'వర్గం',
    'market.allCategories': 'అన్ని వర్గాలు',
    'market.cityLabel': 'నగరం',
    'market.allCities': 'అన్ని నగరాలు',
    'market.maxRateLabel': 'గరిష్ట రోజువారీ ధర (₹)',
    'market.verifiedOnly': 'ధృవీకరించిన యంత్రాలు మాత్రమే',
    'market.highCapexOnly': 'ఖరీదైన ల్యాబ్ & ప్రిసిషన్ మాత్రమే',
    'market.excludeUnavailable': 'అందుబాటులో లేనివి తీసివేయండి',
    'market.operatorAvailable': 'ఆపరేటర్ / టెక్నీషియన్ అందుబాటు',
    'market.transportAvailable': 'రవాణా అందుబాటు',
    'market.resetFilters': 'రీసెట్',
    'market.applyFilters': 'ఫిల్టర్లు వర్తించు',
    'badge.verifiedMachinery': 'ధృవీకరించిన యంత్రం',
    'badge.documentsReviewed': 'పత్రాలు సమర్పించబడ్డాయి',
    'badge.highCapexRentOnly': 'అధిక-విలువ · అద్దెకు మాత్రమే',
    'card.openForRequests': 'అభ్యర్థనలకు తెరిచి ఉంది',
    'card.underMaintenance': 'నిర్వహణలో ఉంది',
    'card.paused': 'తాత్కాలికంగా నిలిపివేయబడింది',
    'card.perDay': '/ రోజు',
    'card.operatorOption': 'ఆపరేటర్ ఎంపిక',
    'card.dryHire': 'ఆపరేటర్ లేకుండా',
    'card.deliveryAvailable': 'డెలివరీ అందుబాటు',
    'card.pickupTransport': 'ల్యాబ్ / సైట్ యాక్సెస్',
    'card.assetValue': 'యంత్ర విలువ',
    'escrow.title': 'ఉదయ ఎస్క్రో చెల్లింపు రక్షణ',
    'escrow.subtitle': 'యంత్రం సురక్షితంగా తిరిగి ఇచ్చే వరకు అద్దె మరియు డిపాజిట్ ఎస్క్రోలో భద్రంగా ఉంటాయి.',
    'escrow.fundButton': 'ఎస్క్రో చెల్లించి బుకింగ్ నిర్ధారించండి',
    'escrow.confirmHandover': 'యంత్ర హ్యాండోవర్ నిర్ధారించండి',
    'escrow.releaseFunds': 'రిటర్న్ నిర్ధారించి ఎస్క్రో విడుదల చేయండి',
    'escrow.openDispute': 'నిధులు నిలిపివేయి / ఫిర్యాదు',
    'escrow.protectedBadge': 'ఎస్క్రో రక్షితం',
    'escrow.statusPending': 'ఎస్క్రో చెల్లింపు పెండింగ్',
    'escrow.statusFunded': 'ఎస్క్రో సురక్షితంగా జమ అయింది',
    'escrow.statusHandover': 'హ్యాండోవర్ పూర్తయింది · నిధులు భద్రం',
    'escrow.statusReleased': 'యజమానికి విడుదల · డిపాజిట్ వాపసు',
    'escrow.statusRefunded': 'అద్దెదారుకు వాపసు చేయబడింది',
    'escrow.statusDisputed': 'నిలిపివేయబడింది — అడ్మిన్ సమీక్షలో',
    'voice.buttonLabel': 'వాయిస్ అసిస్టెంట్',
    'voice.title': 'ఉదయ వాయిస్ అసిస్టెంట్',
    'voice.subtitle': 'ధృవీకరించిన యంత్రాలు, ల్యాబ్ పరికరాలు లేదా ఎస్క్రో గురించి 6 భాషల్లో మాట్లాడండి లేదా టైప్ చేయండి.',
    'voice.placeholder': 'HPLC ల్యాబ్, JCB లేదా ఎస్క్రో గురించి అడగండి...',
    'voice.startRecording': 'మాట్లాడటానికి ట్యాప్ చేయండి',
    'voice.stopRecording': 'ఆపి పంపండి',
    'voice.listening': 'వాయిస్ రికార్డ్ అవుతోంది...',
    'voice.transcribing': 'మాటను టెక్స్ట్‌గా మారుస్తోంది...',
    'voice.thinking': 'సరైన పరికరాలు వెతుకుతోంది...',
    'voice.autoSpeak': 'సమాధానాలు వినిపించు',
    'voice.playAudio': 'వినండి',
    'voice.stopAudio': 'ఆపు',
    'voice.quickPrompt1': 'పుణెలో ధృవీకరించిన ల్యాబ్ పరికరాలు చూపించు',
    'voice.quickPrompt2': 'అద్దెకు CNC లేదా మైక్రోస్కోప్ చూపించు',
    'voice.quickPrompt3': 'ఎస్క్రో చెల్లింపు రక్షణ ఎలా పనిచేస్తుంది?',
    'voice.quickPrompt4': 'జీరో-ఐడిల్ జాబ్ రిక్వెస్ట్ పోస్ట్ చేయడానికి సహాయం చేయి',
    'footer.tagline': 'ఉదయ యంత్రాలను డిమాండ్‌తో కలుపుతుంది. నిర్మాణ మరియు శాస్త్రీయ ల్యాబ్ పరికరాల కోసం పారదర్శక ఎస్క్రో ప్లాట్‌ఫారమ్.',
    'footer.escrowNote': 'ఎస్క్రో లావాదేవీలు డెమో మోడ్‌లో సర్వర్-ధృవీకరించిన దశలతో పనిచేస్తాయి.',
  },
  es: {
    'nav.marketplace': 'Mercado',
    'nav.zeroIdle': 'Cero Inactividad',
    'nav.costEstimator': 'Estimador de Costos',
    'nav.howItWorks': 'Cómo Funciona',
    'nav.about': 'Acerca de',
    'nav.signIn': 'Iniciar Sesión',
    'nav.signOut': 'Cerrar Sesión',
    'hero.kicker': 'Red Multisectorial de Maquinaria y Laboratorios',
    'hero.title': 'Pon la Maquinaria a Trabajar. No Inactiva.',
    'hero.subtitle':
      'Alquila maquinaria de construcción, equipos costosos de laboratorio (HPLC, microscopios), centros CNC de 5 ejes y escáneres LiDAR 3D con depósito en garantía (Escrow) y verificación oficial.',
    'hero.searchPlaceholder': 'Buscar HPLC, microscopio, JCB, CNC, generador...',
    'hero.allLocations': 'Todas las ciudades',
    'hero.findEquipment': 'Buscar Equipos',
    'hero.listEquipment': 'Publicar Equipo',
    'hero.postJob': 'Publicar Solicitud de Trabajo',
    'hero.positioningLabel': 'Posicionamiento central',
    'hero.positioningText': 'Udaya conecta equipos inactivos—desde excavadoras hasta laboratorios de alto costo—con demanda real.',
    'home.categoriesTitle': 'Categorías de Maquinaria y Laboratorio',
    'home.categoriesSubtitle':
      'Desde maquinaria pesada de obra hasta instrumentos analíticos y CNC de alto capital disponibles solo en alquiler.',
    'home.viewMarketplace': 'Ver todo el mercado',
    'home.featuredTitle': 'Equipos Verificados y de Alto Valor',
    'home.featuredSubtitle': 'El inventario de demostración está etiquetado. Busca la insignia de Maquinaria Verificada y protección Escrow.',
    'home.browseAll': 'Explorar catálogo',
    'home.highCapexTitle': 'Equipos de Laboratorio y Precisión de Alto Costo (Solo Alquiler)',
    'home.highCapexSubtitle':
      'Accede a espectrómetros, microscopios confocales, CNC de 5 ejes y escáneres LiDAR por día entre proyectos institucionales.',
    'home.workflowKicker': 'Emparejamiento Cero-Inactividad y Escrow',
    'home.workflowTitle': 'Más allá de anuncios pasivos: conecta proyectos con equipos verificados',
    'home.workflowSubtitle':
      'Describe tu trabajo una sola vez. Udaya encuentra maquinaria verificada, protege el pago en Escrow y responde en tu idioma.',
    'home.tryZeroIdle': 'Probar Solicitud Cero-Inactividad',
    'home.readWorkflow': 'Ver Flujo Completo',
    'market.title': 'Mercado de Maquinaria y Laboratorios',
    'market.subtitle': 'Filtra maquinaria de construcción verificada, instrumentos de laboratorio, CNC y escáneres LiDAR.',
    'market.postJobInstead': 'Publicar Solicitud de Trabajo',
    'market.filterHeader': 'Buscar y Filtrar Equipos',
    'market.keywordLabel': 'Palabra clave o modelo',
    'market.keywordPlaceholder': 'ej. HPLC, microscopio, CNC, JCB',
    'market.sectorLabel': 'Sector',
    'market.sectorAll': 'Todos los sectores',
    'market.sectorConstruction': 'Construcción y Obra Pesada',
    'market.sectorLab': 'Laboratorio y Biotecnología (Solo Alquiler)',
    'market.sectorCnc': 'CNC de Precisión y Metrología',
    'market.sectorSurvey': 'LiDAR 3D y Topografía',
    'market.categoryLabel': 'Categoría',
    'market.allCategories': 'Todas las categorías',
    'market.cityLabel': 'Ciudad',
    'market.allCities': 'Todas las ciudades',
    'market.maxRateLabel': 'Tarifa diaria máx. (₹)',
    'market.verifiedOnly': 'Solo Maquinaria Verificada',
    'market.highCapexOnly': 'Solo Alto Capital / Laboratorio',
    'market.excludeUnavailable': 'Excluir mantenimiento / no disponible',
    'market.operatorAvailable': 'Operador / técnico disponible',
    'market.transportAvailable': 'Transporte disponible',
    'market.resetFilters': 'Restablecer',
    'market.applyFilters': 'Aplicar Filtros',
    'badge.verifiedMachinery': 'Maquinaria Verificada',
    'badge.documentsReviewed': 'Docs Enviados',
    'badge.highCapexRentOnly': 'Alto Capital · Solo Alquiler',
    'card.openForRequests': 'Abierto a solicitudes',
    'card.underMaintenance': 'En mantenimiento',
    'card.paused': 'Pausado',
    'card.perDay': '/ día',
    'card.operatorOption': 'Opción de operador',
    'card.dryHire': 'Sin operador',
    'card.deliveryAvailable': 'Entrega disponible',
    'card.pickupTransport': 'Acceso en sitio / lab',
    'card.assetValue': 'Valor del equipo',
    'escrow.title': 'Protección de Pago Escrow de Udaya',
    'escrow.subtitle': 'El alquiler y el depósito reembolsable permanecen custodiados hasta la entrega e inspección de retorno.',
    'escrow.fundButton': 'Depositar en Escrow y Confirmar',
    'escrow.confirmHandover': 'Confirmar Entrega del Equipo',
    'escrow.releaseFunds': 'Confirmar Devolución y Liberar Escrow',
    'escrow.openDispute': 'Congelar / Abrir Disputa',
    'escrow.protectedBadge': 'Protegido por Escrow',
    'escrow.statusPending': 'Pendiente de Fondos Escrow',
    'escrow.statusFunded': 'Fondos en Custodia Escrow',
    'escrow.statusHandover': 'Entrega Confirmada · Fondos Retenidos',
    'escrow.statusReleased': 'Liberado al Propietario · Depósito Devuelto',
    'escrow.statusRefunded': 'Reembolsado al Arrendatario',
    'escrow.statusDisputed': 'Congelado — Revisión Administrativa',
    'voice.buttonLabel': 'Asistente de Voz',
    'voice.title': 'Asistente de Voz Udaya',
    'voice.subtitle': 'Habla o escribe en 6 idiomas para buscar equipos verificados, instrumentos de laboratorio o pagos Escrow.',
    'voice.placeholder': 'Pregunta sobre HPLC, JCB verificado o Escrow...',
    'voice.startRecording': 'Toca para Hablar',
    'voice.stopRecording': 'Detener y Enviar',
    'voice.listening': 'Grabando voz...',
    'voice.transcribing': 'Transcribiendo audio...',
    'voice.thinking': 'Buscando mejores opciones...',
    'voice.autoSpeak': 'Leer respuestas en voz alta',
    'voice.playAudio': 'Escuchar',
    'voice.stopAudio': 'Detener',
    'voice.quickPrompt1': 'Buscar equipos de laboratorio verificados en Pune',
    'voice.quickPrompt2': 'Mostrar CNC de 5 ejes o microscopio en alquiler',
    'voice.quickPrompt3': '¿Cómo funciona la protección de pagos Escrow?',
    'voice.quickPrompt4': 'Ayúdame a publicar una solicitud Cero-Inactividad',
    'footer.tagline':
      'Udaya conecta maquinaria inactiva, laboratorios de alto capital y talleres de precisión con transparencia y protección Escrow.',
    'footer.escrowNote':
      'El libro mayor Escrow funciona en modo demostración con transiciones validadas en servidor.',
  },
};
