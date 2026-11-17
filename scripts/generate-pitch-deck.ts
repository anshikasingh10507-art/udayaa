import PDFDocument from 'pdfkit';
import fs from 'node:fs';
import path from 'node:path';

const W = 960;
const H = 540;

const COLORS = {
  navy: '#0F172A',
  navyMid: '#1E293B',
  teal: '#0D9488',
  tealDark: '#0F766E',
  tealBg: '#F0FDFA',
  orange: '#EA580C',
  bg: '#F8FAFC',
  white: '#FFFFFF',
  border: '#E2E8F0',
  slate700: '#334155',
  slate600: '#475569',
  slate500: '#64748B',
  slate400: '#94A3B8',
};

const IMAGES = {
  hero: path.resolve(process.cwd(), 'src/assets/images/hero_excavator_site_1794920310287.jpg'),
  jcb: path.resolve(process.cwd(), 'src/assets/images/eq_jcb_backhoe_1794920310957.jpg'),
  tractor: path.resolve(process.cwd(), 'src/assets/images/eq_tractor_utility_1794920313456.jpg'),
  mixer: path.resolve(process.cwd(), 'src/assets/images/eq_concrete_mixer_1794920312061.jpg'),
  generator: path.resolve(process.cwd(), 'src/assets/images/eq_diesel_generator_1794920312999.jpg'),
  loader: path.resolve(process.cwd(), 'src/assets/images/eq_skid_loader_1794920313017.jpg'),
};

function drawSlideChrome(
  doc: PDFKit.PDFDocument,
  slideNum: number,
  totalSlides: number,
  kicker: string,
  title: string,
  dark = false
) {
  if (dark) {
    doc.rect(0, 0, W, H).fill(COLORS.navy);
  } else {
    doc.rect(0, 0, W, H).fill(COLORS.bg);
    doc.rect(0, 0, W, 4).fill(COLORS.teal);
  }

  doc
    .font('Helvetica-Bold')
    .fontSize(9.5)
    .fillColor(dark ? '#5EEAD4' : COLORS.tealDark)
    .text(kicker.toUpperCase(), 48, 28, { characterSpacing: 0.8 });

  doc
    .font('Helvetica-Bold')
    .fontSize(22)
    .fillColor(dark ? COLORS.white : COLORS.navy)
    .text(title, 48, 45, { width: W - 96 });

  doc
    .moveTo(48, H - 36)
    .lineTo(W - 48, H - 36)
    .lineWidth(0.75)
    .strokeColor(dark ? '#334155' : COLORS.border)
    .stroke();

  doc
    .font('Helvetica')
    .fontSize(9)
    .fillColor(dark ? COLORS.slate400 : COLORS.slate500)
    .text('Udaya — Zero-Idle Equipment Marketplace  ·  Investor & Competition Pitch Deck', 48, H - 24);

  doc
    .font('Helvetica-Bold')
    .fontSize(9)
    .fillColor(dark ? COLORS.slate400 : COLORS.slate500)
    .text(`${slideNum} / ${totalSlides}`, W - 100, H - 24, { width: 52, align: 'right' });
}

function drawCard(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  w: number,
  h: number,
  opts: { fill?: string; stroke?: string; radius?: number } = {}
) {
  doc
    .roundedRect(x, y, w, h, opts.radius ?? 8)
    .fillAndStroke(opts.fill ?? COLORS.white, opts.stroke ?? COLORS.border);
}

function drawBullets(
  doc: PDFKit.PDFDocument,
  items: string[],
  x: number,
  y: number,
  width: number,
  fontSize = 11,
  color = COLORS.slate700,
  gap = 8
) {
  let cursorY = y;
  for (const item of items) {
    doc.circle(x + 4, cursorY + 5.5, 2.2).fill(COLORS.teal);
    doc.font('Helvetica').fontSize(fontSize).fillColor(color).text(item, x + 15, cursorY, {
      width: width - 15,
      lineGap: 2,
    });
    cursorY = doc.y + gap;
  }
}

function generatePitchDeck(outputPaths: string[]) {
  const doc = new PDFDocument({
    size: [W, H],
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
    info: {
      Title: 'Udaya — Zero-Idle Equipment Marketplace Pitch Deck',
      Author: 'Udaya Team',
      Subject: 'Comprehensive Startup Pitch Deck: Problem, Zero-Idle Solution, Global & India Market Size, Competitive Advantage, Business Model, Roadmap',
    },
  });

  const chunks: Buffer[] = [];
  doc.on('data', (chunk) => chunks.push(chunk));

  const totalSlides = 14;

  // ===========================================================================
  // SLIDE 1: COVER SLIDE
  // ===========================================================================
  doc.rect(0, 0, W, H).fill(COLORS.navy);
  doc.rect(0, 0, 8, H).fill(COLORS.teal);

  if (fs.existsSync(IMAGES.hero)) {
    doc.save();
    doc.rect(520, 0, W - 520, H).clip();
    doc.image(IMAGES.hero, 470, 0, { height: H });
    doc.restore();
    doc.rect(520, 0, 60, H).fillOpacity(0.35).fill(COLORS.navy);
    doc.fillOpacity(1);
  }

  doc
    .font('Helvetica-Bold')
    .fontSize(12)
    .fillColor('#5EEAD4')
    .text('UDAYA  ·  ZERO-IDLE EQUIPMENT MARKETPLACE', 56, 72, { characterSpacing: 1.2 });

  doc
    .font('Helvetica-Bold')
    .fontSize(34)
    .fillColor(COLORS.white)
    .text('Make Equipment Work.\nNot Sit Idle.', 56, 118, { width: 430, lineGap: 4 });

  doc
    .font('Helvetica')
    .fontSize(13.5)
    .fillColor('#CBD5E1')
    .text(
      'A data-driven equipment marketplace and proactive job-matching network connecting machinery owners with contractors.',
      56,
      226,
      { width: 430, lineGap: 4 }
    );

  doc.roundedRect(56, 336, 410, 66, 6).fillAndStroke('#1E293B', '#334155');
  doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#5EEAD4').text('CORE POSITIONING', 74, 351);
  doc
    .font('Helvetica-Bold')
    .fontSize(15.5)
    .fillColor(COLORS.white)
    .text('Udaya helps equipment find demand.', 74, 370);

  doc
    .font('Helvetica')
    .fontSize(10)
    .fillColor(COLORS.slate400)
    .text('Startup Pitching Competition Deck  ·  November 2026  ·  Working MVP Live', 56, H - 44);

  // ===========================================================================
  // SLIDE 2: EXECUTIVE SUMMARY
  // ===========================================================================
  doc.addPage();
  drawSlideChrome(
    doc,
    2,
    totalSlides,
    'Executive Summary',
    'Transforming passive equipment listings into a proactive utilization network'
  );

  const execMetrics = [
    { label: 'Global Rental Market (2025)', value: '$122B–$132B', sub: 'Projected $143B–$187B by 2030' },
    { label: 'India Rental Market (2025)', value: '$13.0B–$15.4B', sub: 'Projected $18B–$29B by 2030–34' },
    { label: 'Earthmoving Share (India)', value: '54%–70%', sub: 'Core Phase 1 launch category' },
    { label: 'Product Readiness', value: '20 Screens', sub: 'Full-stack working MVP live' },
  ];

  execMetrics.forEach((m, i) => {
    const x = 48 + i * 220;
    drawCard(doc, x, 108, 204, 108);
    doc.font('Helvetica').fontSize(10).fillColor(COLORS.slate500).text(m.label, x + 16, 124, { width: 172 });
    doc.font('Helvetica-Bold').fontSize(21).fillColor(COLORS.tealDark).text(m.value, x + 16, 146, { width: 172 });
    doc.font('Helvetica').fontSize(9.5).fillColor(COLORS.slate600).text(m.sub, x + 16, 182, { width: 172 });
  });

  drawCard(doc, 48, 236, 420, 244);
  doc.font('Helvetica-Bold').fontSize(14).fillColor(COLORS.navy).text('Why Traditional Marketplaces Fall Short', 70, 256);
  drawBullets(
    doc,
    [
      'Classified portals rely on passive browsing—contractors waste hours calling yards only to learn machines are unavailable.',
      'Ancillary charges (delivery, operator wages, fuel, security deposits) are rarely itemized upfront.',
      'Small fleet owners lack structured workflows to prove maintenance condition or capture short project gaps.',
    ],
    70,
    290,
    376,
    11,
    COLORS.slate700,
    11
  );

  drawCard(doc, 492, 236, 420, 244);
  doc.font('Helvetica-Bold').fontSize(14).fillColor(COLORS.navy).text('The Udaya Approach', 514, 256);
  drawBullets(
    doc,
    [
      'Zero-Idle Matching: Contractors post a job once; rule-based matching alerts nearby compatible owners.',
      'Truthful Availability: Owners are never labeled available until confirmed; accepted bookings lock dates.',
      'Cost & Condition Clarity: Separates deposits from rental fees and labels maintenance provenance honestly.',
    ],
    514,
    290,
    376,
    11,
    COLORS.slate700,
    11
  );

  // ===========================================================================
  // SLIDE 3: THE PROBLEM
  // ===========================================================================
  doc.addPage();
  drawSlideChrome(
    doc,
    3,
    totalSlides,
    'The Problem',
    'High-value machinery sits idle while nearby contractors struggle to source'
  );

  drawCard(doc, 48, 108, 420, 310);
  doc.rect(48, 108, 420, 6).fill(COLORS.navy);
  doc.font('Helvetica-Bold').fontSize(15).fillColor(COLORS.navy).text('For Equipment Owners (Supply Friction)', 70, 132);
  doc
    .font('Helvetica')
    .fontSize(10.5)
    .fillColor(COLORS.slate500)
    .text('JCBs, excavators, tractors, mixers, compressors, generators', 70, 152);
  drawBullets(
    doc,
    [
      'Heavy machinery ($20K–$150K+ capex per unit) frequently sits idle between multi-week infrastructure or building contracts.',
      'Passive listings and broker word-of-mouth fail to surface short-term (1–7 day) local demand.',
      'Managing calendar conflicts across offline contracts and phone enquiries causes double-bookings or missed rentals.',
      'Independent fleet owners have no simple standard way to document service history to win contractor trust.',
    ],
    70,
    186,
    376,
    11,
    COLORS.slate700,
    11
  );

  drawCard(doc, 492, 108, 420, 310);
  doc.rect(492, 108, 420, 6).fill(COLORS.orange);
  doc.font('Helvetica-Bold').fontSize(15).fillColor(COLORS.navy).text('For Contractors & Renters (Demand Friction)', 514, 132);
  doc
    .font('Helvetica')
    .fontSize(10.5)
    .fillColor(COLORS.slate500)
    .text('Small civil contractors, independent builders, site managers', 514, 152);
  drawBullets(
    doc,
    [
      'Manual phone discovery wastes project hours checking whether listed machines are actually free.',
      'Total job cost uncertainty: transport, operator charges, fuel policies, and deposits are often unconfirmed until late.',
      'Opaque mechanical condition leads to costly mid-job breakdowns and project schedule slippage.',
      'No single workspace to broadcast job specs and compare confirmed quotes side-by-side.',
    ],
    514,
    186,
    376,
    11,
    COLORS.slate700,
    11
  );

  drawCard(doc, 48, 434, 864, 50, { fill: COLORS.navy, stroke: COLORS.navy });
  doc
    .font('Helvetica-Bold')
    .fontSize(11.5)
    .fillColor(COLORS.white)
    .text(
      'Core Market Gap: Construction rental lacks a unified system for proactive matching, true calendar availability, and total cost clarity.',
      70,
      453
    );

  // ===========================================================================
  // SLIDE 4: THE SOLUTION (ZERO-IDLE)
  // ===========================================================================
  doc.addPage();
  drawSlideChrome(
    doc,
    4,
    totalSlides,
    'The Solution',
    'A two-sided marketplace engineered around Zero-Idle utilization'
  );

  const pillars = [
    {
      num: '01',
      title: 'Structured Equipment Marketplace',
      desc: 'Search and filter verified construction categories by city, max daily rate, operator support, delivery capability, and open calendar dates.',
    },
    {
      num: '02',
      title: 'Zero-Idle Job Matching Engine',
      desc: 'Renters post job specs once. Rule-based matching scores compatible listings by category, distance radius, budget fit, and conflict-free dates.',
    },
    {
      num: '03',
      title: 'Total Job Cost Estimator',
      desc: 'Itemizes base rental, transport, operator, fuel, and other charges separately from refundable deposits—explicitly flagging unconfirmed items.',
    },
    {
      num: '04',
      title: 'Maintenance & Moderation Layer',
      desc: 'Structured inspection checklists and service document uploads with explicit verification labels plus admin dispute/listing moderation.',
    },
  ];

  pillars.forEach((p, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const x = 48 + col * 444;
    const y = 112 + row * 186;
    drawCard(doc, x, y, 420, 168);
    doc.font('Helvetica-Bold').fontSize(22).fillColor(COLORS.teal).text(p.num, x + 24, y + 20);
    doc.font('Helvetica-Bold').fontSize(15).fillColor(COLORS.navy).text(p.title, x + 24, y + 52, { width: 372 });
    doc
      .font('Helvetica')
      .fontSize(11.5)
      .fillColor(COLORS.slate600)
      .text(p.desc, x + 24, y + 82, { width: 372, lineGap: 3 });
  });

  // ===========================================================================
  // SLIDE 5: HOW ZERO-IDLE MATCHING WORKS
  // ===========================================================================
  doc.addPage();
  drawSlideChrome(
    doc,
    5,
    totalSlides,
    'Solution Architecture · Zero-Idle Workflow',
    'Transparent rule-based matching from job post to confirmed booking',
    true
  );

  const steps = [
    {
      step: '01 · Job Request Posted',
      body: 'Renter enters category, job city/area, start date, duration, target budget, and operator/transport needs.',
    },
    {
      step: '02 · Rule-Based Scoring',
      body: 'Engine excludes paused, maintenance, and date-conflicting units. Computes Haversine distance vs service radius and explains match reasons.',
    },
    {
      step: '03 · Owner Confirms & Quotes',
      body: 'Matched owners receive in-app alerts, confirm availability, and submit itemized pricing—or propose an alternative fleet unit.',
    },
    {
      step: '04 · Compare & Lock Dates',
      body: 'Renter compares quotes side-by-side and submits a rental request. Owner acceptance blocks dates server-side.',
    },
  ];

  steps.forEach((s, i) => {
    const x = 48 + i * 220;
    drawCard(doc, x, 112, 204, 224, { fill: COLORS.navyMid, stroke: '#334155' });
    doc.rect(x, 112, 204, 5).fill(i === 1 ? COLORS.orange : COLORS.teal);
    doc.font('Helvetica-Bold').fontSize(12.5).fillColor('#5EEAD4').text(s.step, x + 16, 134, { width: 172 });
    doc
      .font('Helvetica')
      .fontSize(10.8)
      .fillColor('#E2E8F0')
      .text(s.body, x + 16, 170, { width: 172, lineGap: 3 });
  });

  drawCard(doc, 48, 358, 864, 122, { fill: '#132238', stroke: '#334155' });
  doc
    .font('Helvetica-Bold')
    .fontSize(12)
    .fillColor('#5EEAD4')
    .text('Implemented Integrity Rules (Verified in End-to-End Tests)', 70, 374);
  drawBullets(
    doc,
    [
      'Truthful Status Labeling: Unconfirmed matches explicitly read "Calendar open on file · Owner confirmation pending"—never falsely claiming availability.',
      'Server-Side Overlap Prevention: Confirmed bookings insert records into availability_blocks; overlapping rental requests return HTTP 409 Conflict.',
      'Role-Based Access Control: Scrypt auth + server-side checks prevent unauthorized cross-owner edits or admin access (HTTP 403).',
    ],
    70,
    398,
    820,
    10.5,
    '#CBD5E1',
    5
  );

  // ===========================================================================
  // SLIDE 6: TRUST & PRICING CLARITY
  // ===========================================================================
  doc.addPage();
  drawSlideChrome(
    doc,
    6,
    totalSlides,
    'Trust & Cost Transparency',
    'Solving hidden rental fees and unverified condition claims'
  );

  drawCard(doc, 48, 108, 420, 376);
  doc.font('Helvetica-Bold').fontSize(15).fillColor(COLORS.navy).text('Total Job Cost Estimator', 70, 128);
  doc
    .font('Helvetica')
    .fontSize(10.5)
    .fillColor(COLORS.slate500)
    .text('Sample 3-day JCB 3CX quotation breakdown', 70, 148);

  const costRows: Array<[string, string, string]> = [
    ['Base Rental (3d x INR 6,200)', 'INR 18,600', 'Owner-confirmed'],
    ['Transport / Delivery', 'INR 2,500', 'Owner-confirmed'],
    ['Operator Charges', 'INR 4,200', 'Owner-confirmed'],
    ['Diesel / Fuel Charge', 'Not yet confirmed', 'Unconfirmed (never treated as INR 0)'],
    ['Other Additional Fees', 'INR 0', 'Owner-confirmed'],
  ];
  let cy = 182;
  costRows.forEach(([label, val, status]) => {
    doc.font('Helvetica-Bold').fontSize(10.5).fillColor(COLORS.navy).text(label, 70, cy);
    doc
      .font('Helvetica-Bold')
      .fontSize(10.5)
      .fillColor(val === 'Not yet confirmed' ? COLORS.orange : COLORS.navy)
      .text(val, 290, cy, { width: 156, align: 'right' });
    doc.font('Helvetica').fontSize(9).fillColor(COLORS.slate500).text(status, 70, cy + 14);
    doc.moveTo(70, cy + 30).lineTo(446, cy + 30).lineWidth(0.5).strokeColor(COLORS.border).stroke();
    cy += 38;
  });

  doc.roundedRect(70, 384, 376, 76, 6).fillAndStroke(COLORS.bg, COLORS.border);
  doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.navy).text('Refundable Security Deposit: INR 15,000', 84, 396);
  doc
    .font('Helvetica')
    .fontSize(9.5)
    .fillColor(COLORS.slate600)
    .text(
      'Tracked separately from rental expenses. Payable prior to dispatch and refundable upon return inspection. Payment is handled outside app during demo.',
      84,
      414,
      { width: 348, lineGap: 2 }
    );

  drawCard(doc, 492, 108, 420, 376);
  doc.font('Helvetica-Bold').fontSize(15).fillColor(COLORS.navy).text('Maintenance Verification Provenance', 514, 128);
  doc
    .font('Helvetica')
    .fontSize(10.5)
    .fillColor(COLORS.slate500)
    .text('Explicit provenance tiers—no invented health scores', 514, 148);

  const badges = [
    {
      label: '1. Owner-provided',
      bg: '#FFFBEB',
      border: '#FDE68A',
      text: '#92400E',
      desc: 'Self-reported condition summary, last service date, and inspection checklist without attached documents.',
    },
    {
      label: '2. Documents submitted',
      bg: COLORS.tealBg,
      border: '#99F6E4',
      text: COLORS.tealDark,
      desc: 'Owner uploaded supporting service invoices or inspection photographs pending admin review.',
    },
    {
      label: '3. Independently verified',
      bg: '#ECFDF5',
      border: '#A7F3D0',
      text: '#065F46',
      desc: 'Assigned strictly after an authorized Udaya administrator reviews submitted maintenance documentation.',
    },
  ];
  let by = 186;
  badges.forEach((b) => {
    doc.roundedRect(514, by, 376, 86, 6).fillAndStroke(b.bg, b.border);
    doc.font('Helvetica-Bold').fontSize(11.5).fillColor(b.text).text(b.label, 530, by + 12);
    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor(COLORS.slate700)
      .text(b.desc, 530, by + 34, { width: 344, lineGap: 2 });
    by += 98;
  });

  // ===========================================================================
  // SLIDE 7: GLOBAL MARKET SIZE ANALYSIS (TAM)
  // ===========================================================================
  doc.addPage();
  drawSlideChrome(
    doc,
    7,
    totalSlides,
    'Market Size · Global Construction Equipment Rental (TAM)',
    '$122B–$132B global market driven by APAC growth & earthmoving share'
  );

  // Left: Global TAM Bar Chart
  drawCard(doc, 48, 108, 456, 336);
  doc.font('Helvetica-Bold').fontSize(13.5).fillColor(COLORS.navy).text('Global Rental Market Trajectory (USD Billions)', 68, 126);
  doc
    .font('Helvetica')
    .fontSize(9.5)
    .fillColor(COLORS.slate500)
    .text('Analyst consensus range (3.9%–5.9% CAGR through 2030)', 68, 144);

  const globalBars = [
    { year: '2024', mid: 122.6, label: '$112.4B – $132.8B' },
    { year: '2025', mid: 127.4, label: '$122.4B – $132.4B' },
    { year: '2030 (Proj.)', mid: 164.8, label: '$142.9B – $186.6B' },
  ];
  const chartBaseY = 368;
  const maxVal = 200;
  const maxBarH = 165;

  [50, 100, 150, 200].forEach((tick) => {
    const ty = chartBaseY - (tick / maxVal) * maxBarH;
    doc.moveTo(88, ty).lineTo(480, ty).lineWidth(0.5).strokeColor(COLORS.border).stroke();
    doc.font('Helvetica').fontSize(8.5).fillColor(COLORS.slate500).text(`$${tick}B`, 56, ty - 4);
  });

  globalBars.forEach((b, idx) => {
    const bx = 118 + idx * 124;
    const bh = (b.mid / maxVal) * maxBarH;
    const barColor = idx === 2 ? COLORS.teal : COLORS.navy;
    doc.roundedRect(bx, chartBaseY - bh, 60, bh, 4).fill(barColor);
    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .fillColor(barColor)
      .text(b.label, bx - 24, chartBaseY - bh - 18, { width: 108, align: 'center' });
    doc
      .font('Helvetica-Bold')
      .fontSize(10.5)
      .fillColor(COLORS.navy)
      .text(b.year, bx - 14, chartBaseY + 10, { width: 88, align: 'center' });
  });

  doc
    .font('Helvetica')
    .fontSize(8.5)
    .fillColor(COLORS.slate500)
    .text('Note: Bars plot midpoint of published industry research ranges.', 68, 416);

  // Right Top: Regional Share Horizontal Bars
  drawCard(doc, 524, 108, 388, 178);
  doc.font('Helvetica-Bold').fontSize(13.5).fillColor(COLORS.navy).text('Regional Share Benchmarks', 544, 126);

  const regions = [
    { name: 'Asia-Pacific (Fastest Growing)', pct: 44, label: '42% – 45%', color: COLORS.teal },
    { name: 'Europe', pct: 30, label: '~30%', color: COLORS.navy },
    { name: 'North America', pct: 28, label: '21% – 36%', color: COLORS.navyMid },
  ];
  let ry = 158;
  regions.forEach((reg) => {
    doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.slate700).text(reg.name, 544, ry);
    doc.font('Helvetica-Bold').fontSize(10).fillColor(reg.color).text(reg.label, 790, ry, { width: 102, align: 'right' });
    doc.roundedRect(544, ry + 16, 348, 10, 3).fill('#E2E8F0');
    doc.roundedRect(544, ry + 16, (348 * reg.pct) / 100, 10, 3).fill(reg.color);
    ry += 40;
  });

  // Right Bottom: Product Segment Dominance
  drawCard(doc, 524, 300, 388, 144);
  doc.font('Helvetica-Bold').fontSize(13.5).fillColor(COLORS.navy).text('Segment Leader: Earthmoving', 544, 318);
  doc.font('Helvetica-Bold').fontSize(24).fillColor(COLORS.orange).text('> 50% – 54%', 544, 342);
  doc
    .font('Helvetica')
    .fontSize(10.5)
    .fillColor(COLORS.slate600)
    .text(
      'of global rental revenue comes from earthmoving machinery (excavators alone ~28%). High unit cost pushes contractors to rent rather than buy.',
      544,
      376,
      { width: 348, lineGap: 2 }
    );

  doc
    .font('Helvetica')
    .fontSize(8.5)
    .fillColor(COLORS.slate500)
    .text(
      'Sources: MarketsandMarkets, Fortune Business Insights, Market Research Future, Data Bridge, Dataintelo, SkyQuest, Technavio (2024–2030).',
      48,
      458,
      { width: 864 }
    );

  // ===========================================================================
  // SLIDE 8: INDIA-SPECIFIC INSIGHTS (SAM & BEACHHEAD)
  // ===========================================================================
  doc.addPage();
  drawSlideChrome(
    doc,
    8,
    totalSlides,
    'Market Size · India Construction Equipment Rental (SAM)',
    'A $13B–$15B+ market anchored by record public infrastructure capex'
  );

  // Left: India Bar Chart
  drawCard(doc, 48, 108, 456, 336);
  doc.font('Helvetica-Bold').fontSize(13.5).fillColor(COLORS.navy).text('India Equipment Rental Market (USD Billions)', 68, 126);
  doc
    .font('Helvetica')
    .fontSize(9.5)
    .fillColor(COLORS.slate500)
    .text('Projected 4.3%–6.8%+ CAGR (up to 8.9% in high-growth machinery subsets)', 68, 144);

  const indiaBars = [
    { year: '2024', mid: 12.75, label: '$12.5B – $13.0B' },
    { year: '2025', mid: 14.2, label: '$13.0B – $15.4B' },
    { year: '2030–34 (Proj.)', mid: 23.5, label: '$18.0B – $29.0B' },
  ];
  const indiaMax = 30;
  [10, 20, 30].forEach((tick) => {
    const ty = chartBaseY - (tick / indiaMax) * maxBarH;
    doc.moveTo(88, ty).lineTo(480, ty).lineWidth(0.5).strokeColor(COLORS.border).stroke();
    doc.font('Helvetica').fontSize(8.5).fillColor(COLORS.slate500).text(`$${tick}B`, 56, ty - 4);
  });

  indiaBars.forEach((b, idx) => {
    const bx = 118 + idx * 124;
    const bh = (b.mid / indiaMax) * maxBarH;
    const barColor = idx === 2 ? COLORS.orange : COLORS.tealDark;
    doc.roundedRect(bx, chartBaseY - bh, 60, bh, 4).fill(barColor);
    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .fillColor(barColor)
      .text(b.label, bx - 24, chartBaseY - bh - 18, { width: 108, align: 'center' });
    doc
      .font('Helvetica-Bold')
      .fontSize(10.5)
      .fillColor(COLORS.navy)
      .text(b.year, bx - 14, chartBaseY + 10, { width: 88, align: 'center' });
  });

  doc
    .font('Helvetica')
    .fontSize(8.5)
    .fillColor(COLORS.slate500)
    .text('Note: Range reflects scope variations across IMARC, Mordor Intelligence, MRFR.', 68, 416);

  // Right Top: Macro Infrastructure Capex
  drawCard(doc, 524, 108, 388, 164);
  doc.font('Helvetica-Bold').fontSize(13.5).fillColor(COLORS.navy).text('Union Budget Infrastructure Capex Tailwind', 544, 126);
  drawBullets(
    doc,
    [
      'FY 2024–25 Capex Outlay: INR 11.11 Lakh Crore earmarked for roads, railways, and urban metros.',
      'FY 2026–27 Capex Outlay: Raised to INR 12.2 Lakh Crore (~INR 15.48L Cr effective public capex with grants).',
      'National pipeline targets >INR 143 Trillion across PM Gati Shakti & Bharatmala corridors.',
    ],
    544,
    154,
    348,
    10,
    COLORS.slate700,
    7
  );

  // Right Bottom: Earthmoving & SMB Rental Dynamics
  drawCard(doc, 524, 286, 388, 158);
  doc.font('Helvetica-Bold').fontSize(13.5).fillColor(COLORS.navy).text('India Segment & Beachhead Dynamics', 544, 304);
  drawBullets(
    doc,
    [
      'Earthmoving dominates 54%–70% of India rental deployment (70%–75% of overall CE market value with mining).',
      'Unit machinery prices ($20K–$150K+) drive mid & small contractors toward short-term rentals.',
      'Beachhead SOM: High-density Pune, Pimpri-Chinchwad, Mumbai & Nashik construction corridors.',
    ],
    544,
    332,
    348,
    10,
    COLORS.slate700,
    7
  );

  doc
    .font('Helvetica')
    .fontSize(8.5)
    .fillColor(COLORS.slate500)
    .text(
      'Sources: PIB / Union Budget 2024–27, Mordor Intelligence, IMARC Group, Market Research Future, MarkNtel Advisors, ICEMA.',
      48,
      458,
      { width: 864 }
    );

  // ===========================================================================
  // SLIDE 9: EQUIPMENT TAXONOMY & EXPANSION
  // ===========================================================================
  doc.addPage();
  drawSlideChrome(
    doc,
    9,
    totalSlides,
    'Category Architecture',
    'Construction machinery at launch, architected for multi-vertical scale'
  );

  const equipmentShowcase = [
    { title: 'Excavators & JCBs', img: IMAGES.jcb, tag: 'Phase 1 Core' },
    { title: 'Utility Tractors', img: IMAGES.tractor, tag: 'Phase 1 Core' },
    { title: 'Loaders & Earthmovers', img: IMAGES.loader, tag: 'Phase 1 Core' },
    { title: 'Concrete Mixers', img: IMAGES.mixer, tag: 'Phase 1 Core' },
    { title: 'Mobile Generators', img: IMAGES.generator, tag: 'Phase 1 Core' },
  ];

  equipmentShowcase.forEach((eq, i) => {
    const x = 48 + i * 176;
    drawCard(doc, x, 112, 162, 185);
    if (fs.existsSync(eq.img)) {
      doc.save();
      doc.roundedRect(x + 1, 113, 160, 112, 6).clip();
      doc.image(eq.img, x + 1, 113, { width: 160, height: 112 });
      doc.restore();
    }
    doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.navy).text(eq.title, x + 12, 236, { width: 138 });
    doc.font('Helvetica').fontSize(9.5).fillColor(COLORS.tealDark).text(eq.tag, x + 12, 268);
  });

  drawCard(doc, 48, 318, 420, 160);
  doc.font('Helvetica-Bold').fontSize(14).fillColor(COLORS.navy).text('Additional Phase 1 Construction Categories', 70, 336);
  drawBullets(
    doc,
    [
      'Air Compressors (pneumatic breakers, site testing, spray coatings)',
      'Other Construction Equipment (plate compactors, vibrators, scaffolding)',
    ],
    70,
    368,
    376,
    11,
    COLORS.slate700,
    10
  );

  drawCard(doc, 492, 318, 420, 160, { fill: COLORS.bg });
  doc.font('Helvetica-Bold').fontSize(14).fillColor(COLORS.navy).text('Future Category Expansion (Schema Ready)', 514, 336);
  drawBullets(
    doc,
    [
      'Power tools, gardening & landscaping equipment',
      'Household tools, event gear & small-business machinery',
      'Database category table already supports phased activation without re-architecture.',
    ],
    514,
    368,
    376,
    10.5,
    COLORS.slate600,
    8
  );

  // ===========================================================================
  // SLIDE 10: COMPETITIVE ADVANTAGE
  // ===========================================================================
  doc.addPage();
  drawSlideChrome(
    doc,
    10,
    totalSlides,
    'Competitive Advantage',
    'How Udaya outperforms brokers, classifieds, and single-fleet portals'
  );

  drawCard(doc, 48, 110, 864, 370);
  const cols = [264, 150, 150, 150, 150];
  const headers = ['Capability', 'Local Brokers', 'Static Classifieds', 'Single-Fleet Portals', 'Udaya'];
  const rows = [
    ['Proactive Job-to-Owner Matching', 'Manual phone calls', 'None (passive ads)', 'Own fleet only', 'Rule-based Zero-Idle'],
    ['Multi-Fee Quote Transparency', 'Opaque / bundled', 'Rarely itemized', 'Corporate SLAs', 'Itemized + Unconfirmed flags'],
    ['Separate Refundable Deposit', 'Informal terms', 'Not standardized', 'Contract-dependent', 'Explicitly separated'],
    ['Date Overlap Prevention', 'Paper notebooks', 'None', 'Internal ERP only', 'Server-side calendar locks'],
    ['Maintenance Provenance Labels', 'Verbal claims', 'None', 'Internal logs', '3-tier explicit provenance'],
    ['SMB & 1–5 Machine Owners', 'Regional only', 'Paid ad listings', 'Excluded', 'Core marketplace supply'],
  ];

  let tx = 48;
  doc.rect(48, 110, 864, 42).fill(COLORS.navy);
  headers.forEach((h, i) => {
    doc
      .font('Helvetica-Bold')
      .fontSize(10.5)
      .fillColor(i === 4 ? '#5EEAD4' : COLORS.white)
      .text(h, tx + 14, 125, { width: cols[i] - 20 });
    tx += cols[i];
  });

  rows.forEach((r, rIdx) => {
    const rowY = 152 + rIdx * 54;
    if (rIdx % 2 === 1) {
      doc.rect(48, rowY, 864, 54).fill('#F8FAFC');
    }
    doc.rect(48 + cols[0] + cols[1] + cols[2] + cols[3], rowY, cols[4], 54).fill(rIdx % 2 === 1 ? '#E6FFFA' : COLORS.tealBg);

    let cx = 48;
    r.forEach((cell, cIdx) => {
      doc
        .font(cIdx === 0 || cIdx === 4 ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(10)
        .fillColor(cIdx === 4 ? COLORS.tealDark : COLORS.slate700)
        .text(cell, cx + 14, rowY + 19, { width: cols[cIdx] - 24 });
      cx += cols[cIdx];
    });
    doc.moveTo(48, rowY + 54).lineTo(912, rowY + 54).lineWidth(0.5).strokeColor(COLORS.border).stroke();
  });

  // ===========================================================================
  // SLIDE 11: BUSINESS MODEL & ILLUSTRATIVE UNIT ECONOMICS
  // ===========================================================================
  doc.addPage();
  drawSlideChrome(
    doc,
    11,
    totalSlides,
    'Business Model (Planned Post-Demo)',
    'Revenue tied to utilization, plus illustrative booking economics'
  );

  const revenueStreams = [
    {
      title: '1. Booking Commission',
      desc: 'Planned 4%–8% take-rate on confirmed rental value once online payment & escrow are integrated.',
      note: 'Demo status: Payments handled outside app.',
    },
    {
      title: '2. Fleet Subscriptions',
      desc: 'Optional monthly SaaS tier for multi-unit owners: priority Zero-Idle job alerts and operator scheduling.',
      note: 'Free basic listing tier to grow supply.',
    },
    {
      title: '3. Verification Add-Ons',
      desc: 'Paid third-party physical inspection audits to qualify machines for "Independently verified" status.',
      note: 'Strict audit requirement—never auto-granted.',
    },
  ];

  revenueStreams.forEach((rs, idx) => {
    const x = 48 + idx * 296;
    drawCard(doc, x, 108, 272, 184);
    doc.rect(x, 108, 272, 5).fill(idx === 0 ? COLORS.teal : idx === 1 ? COLORS.navy : COLORS.orange);
    doc.font('Helvetica-Bold').fontSize(13.5).fillColor(COLORS.navy).text(rs.title, x + 18, 126, { width: 236 });
    doc
      .font('Helvetica')
      .fontSize(10.5)
      .fillColor(COLORS.slate600)
      .text(rs.desc, x + 18, 154, { width: 236, lineGap: 2 });
    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .fillColor(COLORS.tealDark)
      .text(rs.note, x + 18, 258, { width: 236 });
  });

  // Illustrative Unit Economics Table
  drawCard(doc, 48, 310, 864, 174);
  doc
    .font('Helvetica-Bold')
    .fontSize(12.5)
    .fillColor(COLORS.navy)
    .text('Illustrative Target Unit Economics (Pre-Revenue Benchmark Model — Not Actuals)', 68, 326);

  const ueHeaders = ['Sample Scenario', 'Duration', 'Rental GMV', 'Target Take-Rate (6%)', 'Platform Revenue', 'Owner Net (Before Ops)'];
  const ueCols = [210, 88, 130, 146, 126, 124];
  let uex = 68;
  ueHeaders.forEach((uh, i) => {
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor(COLORS.slate600).text(uh, uex, 354, { width: ueCols[i] - 8 });
    uex += ueCols[i];
  });
  doc.moveTo(68, 370).lineTo(892, 370).lineWidth(0.75).strokeColor(COLORS.border).stroke();

  const ueRows = [
    ['JCB 3CX Backhoe (w/ Operator)', '3 days', 'INR 25,300', '6.0% (illustrative)', 'INR 1,518', 'INR 23,782'],
    ['100 kW Mobile Diesel Generator', '7 days', 'INR 36,600', '6.0% (illustrative)', 'INR 2,196', 'INR 34,404'],
    ['Portable Concrete Mixer (12 Cu.Ft.)', '5 days', 'INR 7,900', '6.0% (illustrative)', 'INR 474', 'INR 7,426'],
  ];
  ueRows.forEach((ur, rIdx) => {
    const uy = 382 + rIdx * 28;
    let cx = 68;
    ur.forEach((cell, cIdx) => {
      doc
        .font(cIdx === 4 ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(10)
        .fillColor(cIdx === 4 ? COLORS.tealDark : COLORS.slate700)
        .text(cell, cx, uy, { width: ueCols[cIdx] - 8 });
      cx += ueCols[cIdx];
    });
  });

  // ===========================================================================
  // SLIDE 12: GO-TO-MARKET STRATEGY
  // ===========================================================================
  doc.addPage();
  drawSlideChrome(
    doc,
    12,
    totalSlides,
    'Go-To-Market Strategy',
    'Clustered supply-first onboarding in high-density construction belts'
  );

  const gtmSteps = [
    {
      title: '1. Dense Micro-Market Supply',
      points: [
        'Start in Pune–Pimpri-Chinchwad–Chakan industrial & real-estate belt rather than spreading thin nationally.',
        'Target owners with 1–10 machines (JCBs, tractors, generators) who experience frequent 2–10 day idle gaps.',
        'White-glove onboarding: digitize fleet specs, service radius, and initial maintenance records in <15 minutes.',
      ],
    },
    {
      title: '2. Contractor Demand Wedge',
      points: [
        'Acquire independent civil contractors and sub-contractors frustrated by broker delays and opaque pricing.',
        'Lead with the Zero-Idle Job Request flow + Total Job Cost Estimator as free utility tools.',
        'Measure pilot response SLA (<4 hours from job post to owner quote) to build repeat usage.',
      ],
    },
  ];

  gtmSteps.forEach((g, idx) => {
    const x = 48 + idx * 444;
    drawCard(doc, x, 112, 420, 260);
    doc.rect(x, 112, 420, 6).fill(idx === 0 ? COLORS.navy : COLORS.teal);
    doc.font('Helvetica-Bold').fontSize(14.5).fillColor(COLORS.navy).text(g.title, x + 22, 136);
    drawBullets(doc, g.points, x + 22, 172, 376, 11, COLORS.slate700, 12);
  });

  drawCard(doc, 48, 392, 864, 88, { fill: COLORS.white });
  doc.font('Helvetica-Bold').fontSize(12.5).fillColor(COLORS.navy).text('Pilot Validation KPIs (90-Day Field Trial)', 70, 410);
  doc
    .font('Helvetica')
    .fontSize(11)
    .fillColor(COLORS.slate700)
    .text(
      '1) Supply Liquidity: >=40 active listings in 25 km radius   ·   2) Response Speed: Median owner quote <4 hrs   ·   3) Quote-to-Booking Conversion & Repeat Rate.',
      70,
      436,
      { width: 820 }
    );

  // ===========================================================================
  // SLIDE 13: FUTURE ROADMAP & INTEGRATIONS
  // ===========================================================================
  doc.addPage();
  drawSlideChrome(
    doc,
    13,
    totalSlides,
    'Future Roadmap',
    'Phased execution from working MVP to automated telematics & escrow'
  );

  const phases = [
    {
      phase: 'Phase 1 · Working MVP (Now)',
      items: [
        '20-screen full-stack web app with RBAC auth (Renter, Owner, Admin).',
        'Rule-based Zero-Idle matching with explainable reasons & overlap locks.',
        'Total Job Cost Estimator & 3-tier Maintenance provenance records.',
      ],
    },
    {
      phase: 'Phase 2 · City Pilot (Mo 1–4)',
      items: [
        'WhatsApp Business & SMS alerts so field owners quote in minutes.',
        'GST/KYC verification workflow & pilot field inspection partnerships.',
        'Clustered supply onboarding across Pune, Pimpri-Chinchwad, and Mumbai.',
      ],
    },
    {
      phase: 'Phase 3 · Scale Tech (Mo 5–12)',
      items: [
        'Online UPI / escrow milestone payments & refundable deposit holds.',
        'Optional GPS / engine-hour telematics to auto-detect idle windows.',
        'Expand into power tools, event gear, and Tier-1/Tier-2 corridors.',
      ],
    },
  ];

  phases.forEach((ph, i) => {
    const x = 48 + i * 296;
    drawCard(doc, x, 112, 272, 360);
    doc.rect(x, 112, 272, 42).fill(i === 0 ? COLORS.teal : i === 1 ? COLORS.navy : COLORS.navyMid);
    doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.white).text(ph.phase, x + 14, 127, { width: 244 });
    drawBullets(doc, ph.items, x + 18, 176, 236, 11, COLORS.slate700, 14);
  });

  // ===========================================================================
  // SLIDE 14: LIVE PROTOTYPE & PILOT ASK
  // ===========================================================================
  doc.addPage();
  drawSlideChrome(
    doc,
    14,
    totalSlides,
    'Live Demonstration & Pilot Ask',
    'Built, verified end-to-end, and ready for field pilot validation',
    true
  );

  drawCard(doc, 48, 116, 420, 352, { fill: COLORS.navyMid, stroke: '#334155' });
  doc.font('Helvetica-Bold').fontSize(15).fillColor('#5EEAD4').text('Live Prototype Demo Credentials', 70, 138);
  drawBullets(
    doc,
    [
      'Renter Demo: renter@udaya.demo / demo1234 — Search marketplace, post Zero-Idle job request, compare quotes, track bookings.',
      'Owner Demo: owner@udaya.demo / demo1234 — Manage fleet, respond to matched jobs with quotes, log maintenance.',
      'Admin Demo: admin@udaya.demo / admin1234 — Review reports, moderate listings, verify maintenance documents.',
    ],
    70,
    176,
    376,
    11,
    '#E2E8F0',
    14
  );

  drawCard(doc, 492, 116, 420, 352, { fill: COLORS.white, stroke: COLORS.white });
  doc.font('Helvetica-Bold').fontSize(15).fillColor(COLORS.navy).text('Competition & Incubation Ask', 514, 138);
  drawBullets(
    doc,
    [
      'Seed / Incubation Grant to execute a 90-day live supply-demand pilot in Pune & Pimpri-Chinchwad construction zones.',
      'Ecosystem introductions to regional equipment owner associations, civil contractor guilds, and machinery financiers.',
      'Technical partnerships for WhatsApp Business notifications, escrow payment rails, and third-party inspection audits.',
    ],
    514,
    176,
    376,
    11,
    COLORS.slate700,
    14
  );

  doc
    .font('Helvetica-Bold')
    .fontSize(14)
    .fillColor(COLORS.tealDark)
    .text('Udaya — Make Equipment Work. Not Sit Idle.', 514, 422);

  doc.end();

  doc.on('end', () => {
    const buffer = Buffer.concat(chunks);
    for (const outPath of outputPaths) {
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, buffer);
      console.log('Generated PDF:', outPath, `(${Math.round(buffer.length / 1024)} KB)`);
    }
  });
}

generatePitchDeck([
  path.resolve(process.cwd(), 'public/udaya-pitch-deck.pdf'),
  path.resolve(process.cwd(), 'udaya-pitch-deck.pdf'),
]);
