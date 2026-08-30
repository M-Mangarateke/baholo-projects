const BAHOLO = Object.freeze({
  LEADS_SHEET: 'Leads',
  LOG_SHEET: 'System Log',
  DEFAULT_NOTIFICATION_EMAIL: 'info@baholoprojects.co.za',
  DEFAULT_TARGET_ORIGIN: 'https://www.baholoprojects.co.za',
  RATE_LIMIT_PER_HOUR: 4,
  GLOBAL_RATE_LIMIT_PER_HOUR: 30,
  DUPLICATE_WINDOW_MINUTES: 15,
  MAX_DUPLICATE_SCAN_ROWS: 250,
  SERVICES: Object.freeze([
    'Industrial supplies',
    'Welding & fabrication',
    'Consulting',
    'Scaffolding',
    'Other'
  ]),
  LEAD_HEADERS: Object.freeze([
    'Received at',
    'Lead ID',
    'Status',
    'Name',
    'Company',
    'Email',
    'Phone',
    'Service',
    'Message',
    'Consent',
    'Form version',
    'Privacy version',
    'Page URL',
    'Landing page',
    'Referrer',
    'UTM source',
    'UTM medium',
    'UTM campaign',
    'UTM term',
    'UTM content',
    'Duplicate hash',
    'Email status',
    'Notes'
  ]),
  LOG_HEADERS: Object.freeze(['Timestamp', 'Level', 'Event', 'Lead ID', 'Detail'])
});

/**
 * Run once before deploying the web app. It creates the private workbook on
 * first run (or reuses the workbook in SPREADSHEET_ID), creates the required
 * tabs and stores operational configuration in Script Properties.
 */
function setup() {
  const properties = PropertiesService.getScriptProperties();
  const current = properties.getProperties();
  const spreadsheet = current.SPREADSHEET_ID
    ? SpreadsheetApp.openById(current.SPREADSHEET_ID)
    : SpreadsheetApp.create('Baholo Projects Website Leads');

  spreadsheet.setSpreadsheetTimeZone('Africa/Johannesburg');
  spreadsheet.setSpreadsheetLocale('en_ZA');

  const desired = {
    SPREADSHEET_ID: spreadsheet.getId(),
    NOTIFICATION_EMAIL: current.NOTIFICATION_EMAIL || BAHOLO.DEFAULT_NOTIFICATION_EMAIL,
    TARGET_ORIGIN: current.TARGET_ORIGIN || BAHOLO.DEFAULT_TARGET_ORIGIN
  };
  properties.setProperties(desired, false);

  const leads = ensureSheet_(spreadsheet, BAHOLO.LEADS_SHEET, BAHOLO.LEAD_HEADERS);
  const log = ensureSheet_(spreadsheet, BAHOLO.LOG_SHEET, BAHOLO.LOG_HEADERS);
  leads.setFrozenRows(1);
  log.setFrozenRows(1);
  leads.getRange('A:A').setNumberFormat('yyyy-mm-dd hh:mm:ss');
  log.getRange('A:A').setNumberFormat('yyyy-mm-dd hh:mm:ss');
  leads.autoResizeColumns(1, BAHOLO.LEAD_HEADERS.length);
  log.autoResizeColumns(1, BAHOLO.LOG_HEADERS.length);

  logEvent_(spreadsheet, 'INFO', 'setup_complete', '', 'Lead workbook initialised.');
  return {
    ok: true,
    spreadsheetId: spreadsheet.getId(),
    notificationEmail: desired.NOTIFICATION_EMAIL,
    targetOrigin: desired.TARGET_ORIGIN
  };
}

function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({
      ok: true,
      service: 'Baholo Projects lead endpoint',
      version: '2026-08-30'
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(event) {
  let spreadsheet;
  let leadId = '';
  let responseToken = '';

  try {
    const properties = PropertiesService.getScriptProperties();
    const spreadsheetId = properties.getProperty('SPREADSHEET_ID');
    if (!spreadsheetId) throw new Error('Backend setup is incomplete: SPREADSHEET_ID is not configured.');

    spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    const raw = event && event.parameter ? event.parameter : {};
    responseToken = clean_(raw.submissionToken, 80);

    if (clean_(raw.website, 200)) {
      logEvent_(spreadsheet, 'WARN', 'honeypot_rejected', '', 'A non-empty honeypot field was rejected.');
      return response_({ ok: false, reason: 'validation_failed', message: 'The enquiry could not be accepted.' }, responseToken);
    }

    const formAge = validateFormAge_(raw.formLoadedAt);
    const submissionToken = responseToken;
    if (!submissionToken || !/^[a-f0-9-]{20,80}$/i.test(submissionToken)) {
      throw validationError_('submission_token', 'Please reload the page and try again.');
    }

    const lead = validateLead_(raw);
    const identityHash = hash_(`${lead.email.toLowerCase()}|${lead.service}|${lead.message.toLowerCase()}`);
    const rateKey = `rate:${hash_(lead.email.toLowerCase()).slice(0, 32)}`;
    const tokenKey = `token:${hash_(submissionToken).slice(0, 48)}`;
    let leadsSheet;
    let receivedAt;
    let row;

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);

    try {
      const replayLeadId = CacheService.getScriptCache().get(tokenKey);
      if (replayLeadId) {
        logEvent_(spreadsheet, 'INFO', 'submission_replayed', replayLeadId, 'An already processed submission token was returned.');
        return response_({ ok: true, duplicate: true, leadId: replayLeadId }, responseToken);
      }

      enforceGlobalRateLimit_();
      enforceRateLimit_(rateKey);
      const duplicate = findRecentDuplicate_(spreadsheet, identityHash);
      if (duplicate) {
        logEvent_(spreadsheet, 'INFO', 'duplicate_returned', duplicate.leadId, `Duplicate within ${BAHOLO.DUPLICATE_WINDOW_MINUTES} minutes.`);
        return response_({ ok: true, duplicate: true, leadId: duplicate.leadId }, responseToken);
      }

      leadId = createLeadId_();
      leadsSheet = ensureSheet_(spreadsheet, BAHOLO.LEADS_SHEET, BAHOLO.LEAD_HEADERS);
      receivedAt = new Date();
      leadsSheet.appendRow([
        receivedAt,
        leadId,
        'New',
        safeCell_(lead.name),
        safeCell_(lead.company),
        safeCell_(lead.email),
        safeCell_(lead.phone),
        safeCell_(lead.service),
        safeCell_(lead.message),
        'Yes',
        safeCell_(lead.formVersion),
        safeCell_(lead.privacyVersion),
        safeCell_(lead.pageUrl),
        safeCell_(lead.landingPage),
        safeCell_(lead.referrer),
        safeCell_(lead.utmSource),
        safeCell_(lead.utmMedium),
        safeCell_(lead.utmCampaign),
        safeCell_(lead.utmTerm),
        safeCell_(lead.utmContent),
        identityHash,
        'Pending',
        `Form age: ${formAge} seconds`
      ]);

      row = leadsSheet.getLastRow();
      SpreadsheetApp.flush();
      CacheService.getScriptCache().put(tokenKey, leadId, 21600);
    } finally {
      lock.releaseLock();
    }

    const emailStatus = sendLeadEmails_(lead, leadId, receivedAt, properties);
    leadsSheet.getRange(row, 22).setValue(emailStatus);
    logEvent_(spreadsheet, emailStatus === 'Admin sent; visitor sent' ? 'INFO' : 'WARN', 'lead_stored', leadId, emailStatus);

    return response_({ ok: true, duplicate: false, leadId: leadId }, responseToken);
  } catch (error) {
    const reason = error && error.name === 'ValidationError' ? error.reason : 'server_error';
    const publicMessage = error && error.name === 'ValidationError'
      ? error.publicMessage
      : 'We could not accept the enquiry. Please email info@baholoprojects.co.za or continue on WhatsApp.';

    if (spreadsheet) {
      logEvent_(spreadsheet, 'ERROR', reason, leadId, safeError_(error));
    }
    return response_({ ok: false, reason: reason, message: publicMessage }, responseToken);
  }
}

function validateLead_(raw) {
  const lead = {
    name: singleLine_(raw.name, 100),
    company: singleLine_(raw.company, 120),
    email: singleLine_(raw.email, 254).toLowerCase(),
    phone: singleLine_(raw.phone, 50),
    service: singleLine_(raw.service, 80),
    message: clean_(raw.message, 4000),
    consent: singleLine_(raw.consent, 10).toLowerCase(),
    formVersion: singleLine_(raw.formVersion, 40),
    privacyVersion: singleLine_(raw.privacyVersion, 40),
    pageUrl: canonicalPageUrl_(raw.pageUrl),
    landingPage: safePath_(raw.landingPage),
    referrer: safeReferrer_(raw.referrer),
    utmSource: singleLine_(raw.utmSource, 120),
    utmMedium: singleLine_(raw.utmMedium, 120),
    utmCampaign: singleLine_(raw.utmCampaign, 160),
    utmTerm: singleLine_(raw.utmTerm, 160),
    utmContent: singleLine_(raw.utmContent, 160)
  };

  if (lead.name.length < 2) throw validationError_('name', 'Please enter your name.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(lead.email)) throw validationError_('email', 'Please enter a valid email address.');
  if (lead.phone && lead.phone.replace(/\D/g, '').length < 7) throw validationError_('phone', 'Please enter a valid phone number or leave it blank.');
  if (BAHOLO.SERVICES.indexOf(lead.service) === -1) throw validationError_('service', 'Please choose a valid service.');
  if (lead.message.length < 10) throw validationError_('message', 'Please provide a little more detail about what you need.');
  if (lead.consent !== 'yes') throw validationError_('consent', 'Please confirm the enquiry privacy notice.');
  if (!lead.formVersion || !lead.privacyVersion) throw validationError_('form_version', 'Please reload the page and try again.');

  return lead;
}

function validateFormAge_(value) {
  const loadedAt = Number(value);
  const now = Date.now();
  if (!Number.isFinite(loadedAt)) throw validationError_('form_age', 'Please reload the page and try again.');
  const ageSeconds = Math.floor((now - loadedAt) / 1000);
  if (ageSeconds < 2) throw validationError_('form_too_fast', 'Please review your enquiry and try again.');
  if (ageSeconds > 604800) throw validationError_('form_expired', 'This page has been open for a while. Please reload it and try again.');
  return ageSeconds;
}

function enforceRateLimit_(key) {
  const cache = CacheService.getScriptCache();
  const count = Number(cache.get(key) || 0);
  if (count >= BAHOLO.RATE_LIMIT_PER_HOUR) {
    throw validationError_('rate_limited', 'Too many enquiries were sent recently. Please wait before trying again or email info@baholoprojects.co.za.');
  }
  cache.put(key, String(count + 1), 3600);
}

function enforceGlobalRateLimit_() {
  const cache = CacheService.getScriptCache();
  const key = 'rate:global';
  const count = Number(cache.get(key) || 0);
  if (count >= BAHOLO.GLOBAL_RATE_LIMIT_PER_HOUR) {
    throw validationError_('temporarily_busy', 'The enquiry service is temporarily busy. Please email us or try again later.');
  }
  cache.put(key, String(count + 1), 3600);
}

function findRecentDuplicate_(spreadsheet, duplicateHash) {
  const sheet = ensureSheet_(spreadsheet, BAHOLO.LEADS_SHEET, BAHOLO.LEAD_HEADERS);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;

  const firstRow = Math.max(2, lastRow - BAHOLO.MAX_DUPLICATE_SCAN_ROWS + 1);
  const values = sheet.getRange(firstRow, 1, lastRow - firstRow + 1, 21).getValues();
  const cutoff = Date.now() - BAHOLO.DUPLICATE_WINDOW_MINUTES * 60 * 1000;

  for (let index = values.length - 1; index >= 0; index -= 1) {
    const receivedAt = values[index][0];
    const timestamp = receivedAt instanceof Date ? receivedAt.getTime() : new Date(receivedAt).getTime();
    if (timestamp < cutoff) break;
    if (values[index][20] === duplicateHash) return { leadId: String(values[index][1]) };
  }
  return null;
}

function sendLeadEmails_(lead, leadId, receivedAt, properties) {
  const notificationEmail = properties.getProperty('NOTIFICATION_EMAIL') || BAHOLO.DEFAULT_NOTIFICATION_EMAIL;
  const timestamp = Utilities.formatDate(receivedAt, 'Africa/Johannesburg', 'yyyy-MM-dd HH:mm:ss z');
  const safe = Object.fromEntries(Object.entries(lead).map(([key, value]) => [key, escapeHtml_(value)]));
  const accent = '#f58220';
  let adminSent = false;
  let visitorSent = false;

  try {
    MailApp.sendEmail({
      to: notificationEmail,
      replyTo: lead.email,
      name: 'Baholo Projects Website',
      subject: `[Website enquiry ${leadId}] ${lead.service} — ${lead.name}`,
      body: `New Baholo Projects website enquiry\n\nReference: ${leadId}\nReceived: ${timestamp}\nName: ${lead.name}\nCompany: ${lead.company || 'Not supplied'}\nEmail: ${lead.email}\nPhone: ${lead.phone || 'Not supplied'}\nService: ${lead.service}\n\nMessage:\n${lead.message}`,
      htmlBody: `<div style="font-family:Arial,sans-serif;color:#181818;line-height:1.55;max-width:680px"><div style="border-top:6px solid ${accent};padding:24px 0"><h1 style="font-size:24px;margin:0 0 8px">New website enquiry</h1><p style="margin:0;color:#666">Reference <strong>${escapeHtml_(leadId)}</strong> · ${escapeHtml_(timestamp)}</p></div><table role="presentation" style="border-collapse:collapse;width:100%"><tr><td style="padding:8px 12px 8px 0;color:#666;width:130px">Name</td><td>${safe.name}</td></tr><tr><td style="padding:8px 12px 8px 0;color:#666">Company</td><td>${safe.company || 'Not supplied'}</td></tr><tr><td style="padding:8px 12px 8px 0;color:#666">Email</td><td>${safe.email}</td></tr><tr><td style="padding:8px 12px 8px 0;color:#666">Phone</td><td>${safe.phone || 'Not supplied'}</td></tr><tr><td style="padding:8px 12px 8px 0;color:#666">Service</td><td>${safe.service}</td></tr></table><div style="background:#f4f4f4;margin-top:20px;padding:18px"><strong>Requirement</strong><p style="white-space:pre-wrap;margin-bottom:0">${safe.message}</p></div><p style="font-size:12px;color:#777;margin-top:24px">Reply to this email to respond to the visitor. Do not forward enquiry details outside the authorised Baholo team.</p></div>`
    });
    adminSent = true;
  } catch (error) {
    console.error(`Admin email failed for ${leadId}: ${safeError_(error)}`);
  }

  try {
    MailApp.sendEmail({
      to: lead.email,
      replyTo: notificationEmail,
      name: 'Baholo Projects',
      subject: `We received your Baholo Projects enquiry — ${leadId}`,
      body: `Hello ${lead.name},\n\nThank you for contacting Baholo Projects. We received your ${lead.service} enquiry at ${timestamp}.\n\nReference: ${leadId}\n\nOur team will review the requirement and respond using the contact details you supplied.\n\nBaholo Projects\ninfo@baholoprojects.co.za\nhttps://www.baholoprojects.co.za/`,
      htmlBody: `<div style="font-family:Arial,sans-serif;color:#181818;line-height:1.6;max-width:620px"><div style="background:#111;color:#fff;padding:24px;border-top:6px solid ${accent}"><strong style="letter-spacing:.08em">BAHOLO PROJECTS</strong><h1 style="font-size:25px;margin:16px 0 0">We received your enquiry.</h1></div><div style="padding:26px;border:1px solid #e5e5e5;border-top:0"><p>Hello ${safe.name},</p><p>Thank you for contacting Baholo Projects. We received your <strong>${safe.service}</strong> enquiry and our team will review it.</p><p style="background:#f4f4f4;padding:16px">Reference: <strong>${escapeHtml_(leadId)}</strong><br>Received: ${escapeHtml_(timestamp)}</p><p>Please keep the reference above if you follow up. This acknowledgement confirms receipt; it is not a quotation or acceptance of work.</p><p style="margin-top:26px">Baholo Projects<br><a href="mailto:${escapeHtml_(notificationEmail)}" style="color:${accent}">${escapeHtml_(notificationEmail)}</a><br><a href="https://www.baholoprojects.co.za/" style="color:${accent}">www.baholoprojects.co.za</a></p></div></div>`
    });
    visitorSent = true;
  } catch (error) {
    console.error(`Visitor email failed for ${leadId}: ${safeError_(error)}`);
  }

  return `${adminSent ? 'Admin sent' : 'Admin failed'}; ${visitorSent ? 'visitor sent' : 'visitor failed'}`;
}

function response_(payload, submissionToken) {
  const properties = PropertiesService.getScriptProperties();
  const configuredOrigin = properties.getProperty('TARGET_ORIGIN') || BAHOLO.DEFAULT_TARGET_ORIGIN;
  const targetOrigin = /^https:\/\/[a-z0-9.-]+$/i.test(configuredOrigin)
    ? configuredOrigin
    : BAHOLO.DEFAULT_TARGET_ORIGIN;
  const clientPayload = Object.assign({
    source: 'baholo-lead-form',
    submissionToken: clean_(submissionToken, 80)
  }, payload);
  const serialized = JSON.stringify(clientPayload).replace(/</g, '\\u003c');
  const message = payload.ok ? 'Submission processed.' : 'Submission could not be processed.';
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="robots" content="noindex"><title>Baholo Projects enquiry</title></head><body><p>${message}</p><script>window.top.postMessage(${serialized}, ${JSON.stringify(targetOrigin)});<\/script></body></html>`;
  return HtmlService.createHtmlOutput(html)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function ensureSheet_(spreadsheet, name, headers) {
  const sheet = spreadsheet.getSheetByName(name) || spreadsheet.insertSheet(name);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#111111').setFontColor('#ffffff');
  }
  return sheet;
}

function logEvent_(spreadsheet, level, eventName, leadId, detail) {
  try {
    const sheet = ensureSheet_(spreadsheet, BAHOLO.LOG_SHEET, BAHOLO.LOG_HEADERS);
    sheet.appendRow([
      new Date(),
      safeCell_(clean_(level, 12)),
      safeCell_(clean_(eventName, 80)),
      safeCell_(clean_(leadId, 40)),
      safeCell_(clean_(detail, 500))
    ]);
  } catch (error) {
    console.error(`Logging failed: ${safeError_(error)}`);
  }
}

function createLeadId_() {
  const date = Utilities.formatDate(new Date(), 'Africa/Johannesburg', 'yyyyMMdd');
  const suffix = Utilities.getUuid().replace(/-/g, '').slice(0, 8).toUpperCase();
  return `BP-${date}-${suffix}`;
}

function hash_(value) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, value, Utilities.Charset.UTF_8);
  return bytes.map((byte) => ((byte + 256) % 256).toString(16).padStart(2, '0')).join('');
}

function canonicalPageUrl_(value) {
  const cleaned = singleLine_(value, 500).split(/[?#]/)[0];
  if (/^https:\/\/(www\.)?baholoprojects\.co\.za(?:\/[^\s]*)?$/i.test(cleaned)) return cleaned;
  return BAHOLO.DEFAULT_TARGET_ORIGIN + '/';
}

function safePath_(value) {
  const cleaned = singleLine_(value, 300).split(/[?#]/)[0];
  return /^\/[^\s]*$/.test(cleaned) ? cleaned : '/';
}

function safeReferrer_(value) {
  const cleaned = singleLine_(value, 500).split(/[?#]/)[0];
  return /^https?:\/\/[^\s]+$/i.test(cleaned) ? cleaned : '';
}

function clean_(value, maxLength) {
  return String(value == null ? '' : value)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
    .slice(0, maxLength);
}

function singleLine_(value, maxLength) {
  return clean_(value, maxLength).replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
}

function safeCell_(value) {
  const text = String(value == null ? '' : value);
  return /^\s*[=+\-@]/.test(text) ? `'${text}` : text;
}

function escapeHtml_(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function validationError_(reason, publicMessage) {
  const error = new Error(publicMessage);
  error.name = 'ValidationError';
  error.reason = reason;
  error.publicMessage = publicMessage;
  return error;
}

function safeError_(error) {
  const message = error && error.message ? error.message : String(error || 'Unknown error');
  return clean_(message, 500);
}
