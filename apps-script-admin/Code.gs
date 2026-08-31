const ADMIN = Object.freeze({
  APP_NAME: 'Baholo Operations',
  TIME_ZONE: 'Africa/Johannesburg',
  USERS_SHEET: 'Admin Users',
  LINKS_SHEET: 'Admin Magic Links',
  SESSIONS_SHEET: 'Admin Sessions',
  AUDIT_SHEET: 'Admin Audit',
  LEADS_SHEET: 'Leads',
  MAGIC_TTL_MINUTES: 15,
  SESSION_TTL_HOURS: 8,
  MAX_AUTH_SCAN_ROWS: 1000,
  MAX_LEAD_SCAN_ROWS: 5000,
  PAGE_SIZE: 50,
  MAX_PAGE_SIZE: 100,
  MAGIC_REQUESTS_PER_30_MINUTES: 3,
  MAGIC_REQUESTS_GLOBAL_PER_30_MINUTES: 30,
  ROLES: Object.freeze({
    owner: Object.freeze({ label: 'Owner', permissions: ['leads:view', 'leads:edit', 'analytics:view'] }),
    operations_manager: Object.freeze({ label: 'Operations Manager', permissions: ['leads:view', 'leads:edit', 'analytics:view'] }),
    administrative_officer: Object.freeze({ label: 'Administrative Officer', permissions: ['leads:view', 'leads:edit', 'analytics:view'] })
  }),
  USER_HEADERS: Object.freeze(['Email', 'Name', 'Role', 'Active', 'Created at', 'Updated at']),
  LINK_HEADERS: Object.freeze(['Created at', 'Token hash', 'Email', 'Expires at', 'Used at', 'Request ID']),
  SESSION_HEADERS: Object.freeze(['Created at', 'Session hash', 'Email', 'Expires at', 'Revoked at', 'Last seen at']),
  AUDIT_HEADERS: Object.freeze(['Timestamp', 'Event ID', 'Actor email', 'Actor name', 'Role', 'Action', 'Lead ID', 'Field', 'Before', 'After', 'Detail']),
  LEAD_ADMIN_HEADERS: Object.freeze(['Updated at', 'Assigned to', 'Priority', 'Next action at', 'Last updated by', 'Revision']),
  LEAD_STATUSES: Object.freeze(['New', 'Contacted', 'Qualified', 'Quoted', 'Won', 'Lost', 'Closed']),
  LEAD_PRIORITIES: Object.freeze(['Normal', 'High', 'Urgent']),
  SERVICES: Object.freeze(['Industrial supplies', 'Welding & fabrication', 'Consulting', 'Scaffolding', 'Other'])
});

/**
 * Run setupAdmin_ manually from the Apps Script editor as the deploying owner.
 * The trailing underscore prevents browser clients from invoking it through
 * google.script.run.
 */
function setupAdmin_() {
  const properties = PropertiesService.getScriptProperties();
  const config = properties.getProperties();
  if (!/^[-\w]{20,}$/.test(config.LEADS_SPREADSHEET_ID || '')) {
    throw new Error('Set LEADS_SPREADSHEET_ID in Script Properties before setup.');
  }
  if (!/^\d+$/.test(config.GA4_PROPERTY_ID || '')) {
    throw new Error('Set GA4_PROPERTY_ID in Script Properties before setup.');
  }

  let seedUsers;
  try {
    seedUsers = JSON.parse(config.ADMIN_USERS_JSON || '[]');
  } catch (error) {
    throw new Error('ADMIN_USERS_JSON must be valid JSON.');
  }
  if (!Array.isArray(seedUsers) || seedUsers.length === 0) {
    throw new Error('ADMIN_USERS_JSON must contain at least one active owner.');
  }

  const normalisedUsers = seedUsers.map(validateSeedUser_);
  if (!normalisedUsers.some((user) => user.active && user.role === 'owner')) {
    throw new Error('ADMIN_USERS_JSON must contain at least one active owner.');
  }

  const spreadsheet = SpreadsheetApp.openById(config.LEADS_SPREADSHEET_ID);
  const userSheet = ensureSheet_(spreadsheet, ADMIN.USERS_SHEET, ADMIN.USER_HEADERS);
  ensureSheet_(spreadsheet, ADMIN.LINKS_SHEET, ADMIN.LINK_HEADERS);
  ensureSheet_(spreadsheet, ADMIN.SESSIONS_SHEET, ADMIN.SESSION_HEADERS);
  ensureSheet_(spreadsheet, ADMIN.AUDIT_SHEET, ADMIN.AUDIT_HEADERS);
  const leadSheet = spreadsheet.getSheetByName(ADMIN.LEADS_SHEET);
  if (!leadSheet) throw new Error('The configured workbook does not contain a Leads sheet.');
  ensureLeadAdminColumns_(leadSheet);

  upsertSeedUsers_(userSheet, normalisedUsers);
  [userSheet, spreadsheet.getSheetByName(ADMIN.LINKS_SHEET), spreadsheet.getSheetByName(ADMIN.SESSIONS_SHEET), spreadsheet.getSheetByName(ADMIN.AUDIT_SHEET)]
    .forEach((sheet) => sheet.setFrozenRows(1));
  audit_(spreadsheet, systemActor_(), 'admin_setup_completed', '', '', '', '', 'Admin workbook tables and users initialised.');

  return {
    ok: true,
    spreadsheetName: spreadsheet.getName(),
    activeUsers: normalisedUsers.filter((user) => user.active).length,
    analyticsProperty: config.GA4_PROPERTY_ID
  };
}

function doGet(event) {
  const rawMagic = event && event.parameter ? clean_(event.parameter.magic, 160) : '';
  const magicToken = /^[a-f0-9]{64,128}$/i.test(rawMagic) ? rawMagic : '';
  const template = HtmlService.createTemplateFromFile('Index');
  template.magicToken = magicToken;
  template.serviceUrl = ScriptApp.getService().getUrl() || '';
  return template.evaluate()
    .setTitle(ADMIN.APP_NAME)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}

function requestMagicLink(emailValue) {
  const generic = {
    ok: true,
    message: 'If that address is authorised, a sign-in link will arrive shortly. The link expires after 15 minutes.'
  };
  const email = normaliseEmail_(emailValue);
  if (!isEmail_(email)) return generic;

  try {
    enforceMagicRequestLimit_(email);
    const spreadsheet = getWorkbook_();
    const user = getActiveUserByEmail_(spreadsheet, email);
    if (!user) return generic;

    const token = randomToken_();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + magicTtlMinutes_() * 60 * 1000);
    const requestId = Utilities.getUuid();
    ensureSheet_(spreadsheet, ADMIN.LINKS_SHEET, ADMIN.LINK_HEADERS).appendRow([
      now,
      hash_(token),
      safeCell_(user.email),
      expiresAt,
      '',
      requestId
    ]);

    const baseUrl = ScriptApp.getService().getUrl();
    if (!baseUrl) throw new Error('The admin web app has not been deployed.');
    const link = `${baseUrl}?magic=${encodeURIComponent(token)}`;
    sendMagicEmail_(user, link, expiresAt);
    audit_(spreadsheet, user, 'magic_link_sent', '', '', '', '', requestId);
    return generic;
  } catch (error) {
    console.error(`Magic-link request failed: ${safeError_(error)}`);
    return generic;
  }
}

function redeemMagicLink(tokenValue) {
  const token = clean_(tokenValue, 160);
  if (!/^[a-f0-9]{64,128}$/i.test(token)) return authFailure_('This sign-in link is invalid or has expired.');

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const spreadsheet = getWorkbook_();
    const sheet = ensureSheet_(spreadsheet, ADMIN.LINKS_SHEET, ADMIN.LINK_HEADERS);
    const row = findRecentHashRow_(sheet, 2, hash_(token));
    if (!row) return authFailure_('This sign-in link is invalid or has expired.');

    const values = sheet.getRange(row, 1, 1, ADMIN.LINK_HEADERS.length).getValues()[0];
    const email = normaliseEmail_(values[2]);
    const expiresAt = asDate_(values[3]);
    const usedAt = asDate_(values[4]);
    const user = getActiveUserByEmail_(spreadsheet, email);
    if (!user || usedAt || !expiresAt || expiresAt.getTime() <= Date.now()) {
      return authFailure_('This sign-in link is invalid or has expired.');
    }

    sheet.getRange(row, 5).setValue(new Date());
    const sessionToken = randomToken_();
    const sessionExpiresAt = new Date(Date.now() + sessionTtlHours_() * 60 * 60 * 1000);
    ensureSheet_(spreadsheet, ADMIN.SESSIONS_SHEET, ADMIN.SESSION_HEADERS).appendRow([
      new Date(),
      hash_(sessionToken),
      safeCell_(user.email),
      sessionExpiresAt,
      '',
      new Date()
    ]);
    audit_(spreadsheet, user, 'login_succeeded', '', '', '', '', `Session expires ${sessionExpiresAt.toISOString()}`);
    return {
      ok: true,
      data: {
        sessionToken: sessionToken,
        expiresAt: sessionExpiresAt.toISOString(),
        user: publicUser_(user)
      }
    };
  } catch (error) {
    console.error(`Magic-link redemption failed: ${safeError_(error)}`);
    return authFailure_('This sign-in link is invalid or has expired.');
  } finally {
    try { lock.releaseLock(); } catch (error) { /* lock was not acquired */ }
  }
}

function getAdminBootstrap(sessionToken) {
  return withAdminSession_(sessionToken, 'leads:view', (context) => {
    const summary = buildLeadSummary_(context.spreadsheet);
    return {
      user: publicUser_(context.user),
      summary: summary,
      options: {
        statuses: ADMIN.LEAD_STATUSES,
        priorities: ADMIN.LEAD_PRIORITIES,
        services: ADMIN.SERVICES,
        assignees: getActiveUsers_(context.spreadsheet).map(publicUser_)
      },
      sessionExpiresAt: context.expiresAt.toISOString()
    };
  });
}

function getAdminLeads(sessionToken, filters) {
  return withAdminSession_(sessionToken, 'leads:view', (context) => listLeads_(context.spreadsheet, filters || {}));
}

function getAdminLead(sessionToken, leadIdValue) {
  return withAdminSession_(sessionToken, 'leads:view', (context) => {
    const lead = findLead_(context.spreadsheet, clean_(leadIdValue, 50));
    if (!lead) throw publicError_('not_found', 'The requested enquiry could not be found.');
    return lead;
  });
}

function saveAdminLead(sessionToken, leadIdValue, patch, expectedRevision) {
  return withAdminSession_(sessionToken, 'leads:edit', (context) => {
    return updateLead_(context.spreadsheet, context.user, clean_(leadIdValue, 50), patch || {}, expectedRevision);
  });
}

function getAdminAnalytics(sessionToken, rangeDaysValue) {
  return withAdminSession_(sessionToken, 'analytics:view', (context) => {
    try {
      const data = loadAnalytics_(rangeDaysValue);
      audit_(context.spreadsheet, context.user, 'analytics_viewed', '', '', '', '', `${data.rangeDays} days`);
      return data;
    } catch (error) {
      console.error(`Analytics report failed: ${safeError_(error)}`);
      audit_(context.spreadsheet, context.user, 'analytics_failed', '', '', '', '', safeError_(error));
      return {
        available: false,
        message: 'Analytics is temporarily unavailable. Confirm that the GA4 Data API is enabled and the deploying owner can access the property.'
      };
    }
  });
}

function signOutAdmin(sessionToken) {
  const token = clean_(sessionToken, 160);
  if (!/^[a-f0-9]{64,128}$/i.test(token)) return { ok: true, data: { signedOut: true } };
  try {
    const spreadsheet = getWorkbook_();
    const sheet = ensureSheet_(spreadsheet, ADMIN.SESSIONS_SHEET, ADMIN.SESSION_HEADERS);
    const row = findRecentHashRow_(sheet, 2, hash_(token));
    if (row) {
      const email = normaliseEmail_(sheet.getRange(row, 3).getValue());
      const user = getActiveUserByEmail_(spreadsheet, email) || systemActor_();
      sheet.getRange(row, 5).setValue(new Date());
      audit_(spreadsheet, user, 'logout', '', '', '', '', 'Session revoked by user.');
    }
  } catch (error) {
    console.error(`Sign-out audit failed: ${safeError_(error)}`);
  }
  return { ok: true, data: { signedOut: true } };
}

function withAdminSession_(sessionToken, permission, work) {
  try {
    const context = requireSession_(sessionToken, permission);
    return { ok: true, data: work(context) };
  } catch (error) {
    const code = error && error.publicCode ? error.publicCode : 'request_failed';
    const message = error && error.publicMessage ? error.publicMessage : 'The request could not be completed.';
    console.error(`Admin request failed (${code}): ${safeError_(error)}`);
    return { ok: false, error: { code: code, message: message } };
  }
}

function requireSession_(sessionTokenValue, permission) {
  const sessionToken = clean_(sessionTokenValue, 160);
  if (!/^[a-f0-9]{64,128}$/i.test(sessionToken)) throw publicError_('session_required', 'Your session has expired. Request a new sign-in link.');

  const spreadsheet = getWorkbook_();
  const sessionSheet = ensureSheet_(spreadsheet, ADMIN.SESSIONS_SHEET, ADMIN.SESSION_HEADERS);
  const row = findRecentHashRow_(sessionSheet, 2, hash_(sessionToken));
  if (!row) throw publicError_('session_required', 'Your session has expired. Request a new sign-in link.');
  const values = sessionSheet.getRange(row, 1, 1, ADMIN.SESSION_HEADERS.length).getValues()[0];
  const expiresAt = asDate_(values[3]);
  const revokedAt = asDate_(values[4]);
  const user = getActiveUserByEmail_(spreadsheet, values[2]);
  if (!user || revokedAt || !expiresAt || expiresAt.getTime() <= Date.now()) {
    throw publicError_('session_required', 'Your session has expired. Request a new sign-in link.');
  }
  if (!hasPermission_(user, permission)) throw publicError_('forbidden', 'Your account is not permitted to perform this action.');

  sessionSheet.getRange(row, 6).setValue(new Date());
  return { spreadsheet: spreadsheet, user: user, expiresAt: expiresAt };
}

function listLeads_(spreadsheet, rawFilters) {
  const filters = normaliseFilters_(rawFilters);
  const sheet = spreadsheet.getSheetByName(ADMIN.LEADS_SHEET);
  if (!sheet || sheet.getLastRow() < 2) return { rows: [], total: 0, page: 1, pageSize: filters.pageSize, pages: 0 };
  ensureLeadAdminColumns_(sheet);
  const headerMap = getHeaderMap_(sheet);
  const lastRow = sheet.getLastRow();
  const firstRow = Math.max(2, lastRow - ADMIN.MAX_LEAD_SCAN_ROWS + 1);
  const values = sheet.getRange(firstRow, 1, lastRow - firstRow + 1, sheet.getLastColumn()).getValues();
  const filtered = [];

  for (let index = values.length - 1; index >= 0; index -= 1) {
    const lead = rowToLead_(values[index], headerMap);
    if (matchesLeadFilters_(lead, filters)) filtered.push(lead);
  }

  const total = filtered.length;
  const pages = total ? Math.ceil(total / filters.pageSize) : 0;
  const page = pages ? Math.min(filters.page, pages) : 1;
  const offset = (page - 1) * filters.pageSize;
  return {
    rows: filtered.slice(offset, offset + filters.pageSize).map(listLead_),
    total: total,
    page: page,
    pageSize: filters.pageSize,
    pages: pages
  };
}

function findLead_(spreadsheet, leadId) {
  if (!/^BP-[A-Z0-9-]+$/i.test(leadId)) return null;
  const sheet = spreadsheet.getSheetByName(ADMIN.LEADS_SHEET);
  if (!sheet || sheet.getLastRow() < 2) return null;
  ensureLeadAdminColumns_(sheet);
  const headerMap = getHeaderMap_(sheet);
  const leadIdColumn = requiredColumn_(headerMap, 'Lead ID');
  const finder = sheet.getRange(2, leadIdColumn, sheet.getLastRow() - 1, 1)
    .createTextFinder(leadId)
    .matchEntireCell(true)
    .findNext();
  if (!finder) return null;
  const values = sheet.getRange(finder.getRow(), 1, 1, sheet.getLastColumn()).getValues()[0];
  return rowToLead_(values, headerMap);
}

function updateLead_(spreadsheet, actor, leadId, rawPatch, expectedRevisionValue) {
  if (!/^BP-[A-Z0-9-]+$/i.test(leadId)) throw publicError_('not_found', 'The requested enquiry could not be found.');
  const patch = validateLeadPatch_(rawPatch, spreadsheet);
  const expectedRevision = Number(expectedRevisionValue || 0);
  if (!Number.isInteger(expectedRevision) || expectedRevision < 0) throw publicError_('invalid_revision', 'Refresh the enquiry and try again.');

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  let updatedLead;
  let assignedTo = '';
  try {
    const sheet = spreadsheet.getSheetByName(ADMIN.LEADS_SHEET);
    ensureLeadAdminColumns_(sheet);
    const headerMap = getHeaderMap_(sheet);
    const leadIdColumn = requiredColumn_(headerMap, 'Lead ID');
    const finder = sheet.getRange(2, leadIdColumn, sheet.getLastRow() - 1, 1)
      .createTextFinder(leadId)
      .matchEntireCell(true)
      .findNext();
    if (!finder) throw publicError_('not_found', 'The requested enquiry could not be found.');
    const row = finder.getRow();
    const currentRevision = Number(sheet.getRange(row, requiredColumn_(headerMap, 'Revision')).getValue() || 0);
    if (currentRevision !== expectedRevision) {
      throw publicError_('conflict', 'This enquiry changed after you opened it. Refresh it before saving.');
    }

    const fieldHeaders = {
      status: 'Status', name: 'Name', company: 'Company', email: 'Email', phone: 'Phone',
      service: 'Service', message: 'Message', notes: 'Notes', assignedTo: 'Assigned to',
      priority: 'Priority', nextActionAt: 'Next action at'
    };
    const changes = [];
    Object.keys(patch).forEach((field) => {
      const header = fieldHeaders[field];
      const column = requiredColumn_(headerMap, header);
      const beforeRaw = sheet.getRange(row, column).getValue();
      const afterRaw = field === 'nextActionAt' && patch[field] ? new Date(`${patch[field]}T12:00:00+02:00`) : patch[field];
      const before = serialiseCell_(beforeRaw);
      const after = serialiseCell_(afterRaw);
      if (before === after) return;
      sheet.getRange(row, column).setValue(safeCell_(afterRaw));
      changes.push({ field: field, before: before, after: after });
    });

    if (changes.length) {
      const now = new Date();
      sheet.getRange(row, requiredColumn_(headerMap, 'Updated at')).setValue(now);
      sheet.getRange(row, requiredColumn_(headerMap, 'Last updated by')).setValue(safeCell_(actor.email));
      sheet.getRange(row, requiredColumn_(headerMap, 'Revision')).setValue(currentRevision + 1);
      changes.forEach((change) => audit_(spreadsheet, actor, 'lead_updated', leadId, change.field, change.before, change.after, ''));
      const assignmentChange = changes.find((change) => change.field === 'assignedTo');
      assignedTo = assignmentChange ? assignmentChange.after : '';
      SpreadsheetApp.flush();
    }
    updatedLead = findLead_(spreadsheet, leadId);
  } finally {
    lock.releaseLock();
  }
  if (assignedTo) sendAssignmentNotification_(spreadsheet, actor, updatedLead, assignedTo);
  return updatedLead;
}

function validateLeadPatch_(rawPatch, spreadsheet) {
  const allowed = ['status', 'name', 'company', 'email', 'phone', 'service', 'message', 'notes', 'assignedTo', 'priority', 'nextActionAt'];
  const patch = {};
  Object.keys(rawPatch || {}).forEach((field) => {
    if (allowed.indexOf(field) === -1) return;
    const value = rawPatch[field];
    if (field === 'status') {
      const status = singleLine_(value, 40);
      if (ADMIN.LEAD_STATUSES.indexOf(status) === -1) throw publicError_('validation', 'Choose a valid status.');
      patch[field] = status;
    } else if (field === 'priority') {
      const priority = singleLine_(value || 'Normal', 20);
      if (ADMIN.LEAD_PRIORITIES.indexOf(priority) === -1) throw publicError_('validation', 'Choose a valid priority.');
      patch[field] = priority;
    } else if (field === 'service') {
      const service = singleLine_(value, 80);
      if (ADMIN.SERVICES.indexOf(service) === -1) throw publicError_('validation', 'Choose a valid service.');
      patch[field] = service;
    } else if (field === 'email') {
      const email = normaliseEmail_(value);
      if (!isEmail_(email)) throw publicError_('validation', 'Enter a valid email address.');
      patch[field] = email;
    } else if (field === 'assignedTo') {
      const email = normaliseEmail_(value);
      if (email && !getActiveUserByEmail_(spreadsheet, email)) throw publicError_('validation', 'Choose an active assignee.');
      patch[field] = email;
    } else if (field === 'nextActionAt') {
      const date = singleLine_(value, 10);
      if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw publicError_('validation', 'Choose a valid next-action date.');
      patch[field] = date;
    } else if (field === 'phone') {
      const phone = singleLine_(value, 50);
      if (phone && phone.replace(/\D/g, '').length < 7) throw publicError_('validation', 'Enter a valid phone number or leave it blank.');
      patch[field] = phone;
    } else {
      const limits = { name: 100, company: 120, message: 4000, notes: 4000 };
      const limit = limits[field] || 500;
      const text = field === 'message' || field === 'notes' ? clean_(value, limit) : singleLine_(value, limit);
      if (field === 'name' && text.length < 2) throw publicError_('validation', 'Enter the contact name.');
      if (field === 'message' && text.length < 10) throw publicError_('validation', 'Keep at least ten characters in the enquiry message.');
      patch[field] = text;
    }
  });
  if (!Object.keys(patch).length) throw publicError_('validation', 'No supported changes were supplied.');
  return patch;
}

function buildLeadSummary_(spreadsheet) {
  const sheet = spreadsheet.getSheetByName(ADMIN.LEADS_SHEET);
  const summary = { total: 0, new: 0, active: 0, won: 0, needsFollowUp: 0 };
  if (!sheet || sheet.getLastRow() < 2) return summary;
  ensureLeadAdminColumns_(sheet);
  const headerMap = getHeaderMap_(sheet);
  const lastRow = sheet.getLastRow();
  const firstRow = Math.max(2, lastRow - ADMIN.MAX_LEAD_SCAN_ROWS + 1);
  const values = sheet.getRange(firstRow, 1, lastRow - firstRow + 1, sheet.getLastColumn()).getValues();
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  values.forEach((row) => {
    const lead = rowToLead_(row, headerMap);
    summary.total += 1;
    if (lead.status === 'New') summary.new += 1;
    if (['New', 'Contacted', 'Qualified', 'Quoted'].indexOf(lead.status) !== -1) summary.active += 1;
    if (lead.status === 'Won') summary.won += 1;
    const nextAction = lead.nextActionAt ? new Date(lead.nextActionAt) : null;
    if (nextAction && nextAction.getTime() <= today.getTime() && ['Won', 'Lost', 'Closed'].indexOf(lead.status) === -1) summary.needsFollowUp += 1;
  });
  return summary;
}

function loadAnalytics_(rangeDaysValue) {
  const propertyId = PropertiesService.getScriptProperties().getProperty('GA4_PROPERTY_ID');
  if (!/^\d+$/.test(propertyId || '')) throw new Error('GA4_PROPERTY_ID is not configured.');
  const rangeDays = [7, 28, 90].indexOf(Number(rangeDaysValue)) !== -1 ? Number(rangeDaysValue) : 28;
  const dateRange = [{ startDate: `${rangeDays - 1}daysAgo`, endDate: 'today' }];

  const summaryReport = runGaReport_(propertyId, {
    dateRanges: dateRange,
    metrics: ['activeUsers', 'sessions', 'screenPageViews', 'eventCount', 'keyEvents'].map((name) => ({ name: name }))
  });
  const trendReport = runGaReport_(propertyId, {
    dateRanges: dateRange,
    dimensions: [{ name: 'date' }],
    metrics: [{ name: 'activeUsers' }, { name: 'screenPageViews' }],
    orderBys: [{ dimension: { dimensionName: 'date' } }],
    limit: '100'
  });
  const pagesReport = runGaReport_(propertyId, {
    dateRanges: dateRange,
    dimensions: [{ name: 'pageTitle' }, { name: 'pagePath' }],
    metrics: [{ name: 'screenPageViews' }, { name: 'activeUsers' }],
    orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
    limit: '8'
  });
  const channelsReport = runGaReport_(propertyId, {
    dateRanges: dateRange,
    dimensions: [{ name: 'sessionDefaultChannelGroup' }],
    metrics: [{ name: 'sessions' }],
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    limit: '8'
  });
  const eventsReport = runGaReport_(propertyId, {
    dateRanges: dateRange,
    dimensions: [{ name: 'eventName' }],
    metrics: [{ name: 'eventCount' }, { name: 'keyEvents' }],
    orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
    limit: '12'
  });

  const totals = summaryReport.rows && summaryReport.rows[0] ? summaryReport.rows[0].metricValues || [] : [];
  return {
    available: true,
    rangeDays: rangeDays,
    summary: {
      activeUsers: numberMetric_(totals[0]),
      sessions: numberMetric_(totals[1]),
      pageViews: numberMetric_(totals[2]),
      events: numberMetric_(totals[3]),
      keyEvents: numberMetric_(totals[4])
    },
    trend: reportRows_(trendReport).map((row) => ({
      date: row.dimensions[0] || '', users: numberValue_(row.metrics[0]), pageViews: numberValue_(row.metrics[1])
    })),
    pages: reportRows_(pagesReport).map((row) => ({
      title: row.dimensions[0] || 'Untitled page', path: row.dimensions[1] || '/', pageViews: numberValue_(row.metrics[0]), users: numberValue_(row.metrics[1])
    })),
    channels: reportRows_(channelsReport).map((row) => ({
      channel: row.dimensions[0] || 'Unassigned', sessions: numberValue_(row.metrics[0])
    })),
    events: reportRows_(eventsReport).map((row) => ({
      name: row.dimensions[0] || 'Unknown event', count: numberValue_(row.metrics[0]), keyEvents: numberValue_(row.metrics[1])
    })),
    generatedAt: new Date().toISOString()
  };
}

function runGaReport_(propertyId, body) {
  const response = UrlFetchApp.fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: `Bearer ${ScriptApp.getOAuthToken()}` },
    payload: JSON.stringify(body),
    muteHttpExceptions: true
  });
  const status = response.getResponseCode();
  const text = response.getContentText();
  if (status < 200 || status >= 300) throw new Error(`GA4 Data API ${status}: ${clean_(text, 500)}`);
  return JSON.parse(text);
}

function reportRows_(report) {
  return (report.rows || []).map((row) => ({
    dimensions: (row.dimensionValues || []).map((value) => value.value || ''),
    metrics: (row.metricValues || []).map((value) => value.value || '0')
  }));
}

function numberMetric_(metric) {
  return numberValue_(metric && metric.value);
}

function numberValue_(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
}

function normaliseFilters_(raw) {
  const page = Math.max(1, Number.parseInt(raw.page, 10) || 1);
  const pageSize = Math.min(ADMIN.MAX_PAGE_SIZE, Math.max(10, Number.parseInt(raw.pageSize, 10) || ADMIN.PAGE_SIZE));
  const status = singleLine_(raw.status, 40);
  const service = singleLine_(raw.service, 80);
  const assignee = normaliseEmail_(raw.assignee);
  const priority = singleLine_(raw.priority, 20);
  return {
    page: page,
    pageSize: pageSize,
    search: singleLine_(raw.search, 120).toLowerCase(),
    status: ADMIN.LEAD_STATUSES.indexOf(status) !== -1 ? status : '',
    service: ADMIN.SERVICES.indexOf(service) !== -1 ? service : '',
    assignee: assignee,
    priority: ADMIN.LEAD_PRIORITIES.indexOf(priority) !== -1 ? priority : '',
    dateFrom: /^\d{4}-\d{2}-\d{2}$/.test(raw.dateFrom || '') ? raw.dateFrom : '',
    dateTo: /^\d{4}-\d{2}-\d{2}$/.test(raw.dateTo || '') ? raw.dateTo : ''
  };
}

function matchesLeadFilters_(lead, filters) {
  if (filters.status && lead.status !== filters.status) return false;
  if (filters.service && lead.service !== filters.service) return false;
  if (filters.assignee && lead.assignedTo !== filters.assignee) return false;
  if (filters.priority && lead.priority !== filters.priority) return false;
  const receivedDate = (lead.receivedAt || '').slice(0, 10);
  if (filters.dateFrom && receivedDate < filters.dateFrom) return false;
  if (filters.dateTo && receivedDate > filters.dateTo) return false;
  if (filters.search) {
    const haystack = [lead.leadId, lead.name, lead.company, lead.email, lead.phone, lead.service, lead.message]
      .join(' ').toLowerCase();
    if (haystack.indexOf(filters.search) === -1) return false;
  }
  return true;
}

function rowToLead_(row, headerMap) {
  const value = (name) => row[(headerMap[name] || 1) - 1];
  return {
    receivedAt: isoString_(value('Received at')),
    leadId: String(value('Lead ID') || ''),
    status: String(value('Status') || 'New'),
    name: String(value('Name') || ''),
    company: String(value('Company') || ''),
    email: String(value('Email') || ''),
    phone: String(value('Phone') || ''),
    service: String(value('Service') || ''),
    message: String(value('Message') || ''),
    consent: String(value('Consent') || ''),
    formVersion: String(value('Form version') || ''),
    privacyVersion: String(value('Privacy version') || ''),
    pageUrl: String(value('Page URL') || ''),
    landingPage: String(value('Landing page') || ''),
    referrer: String(value('Referrer') || ''),
    utmSource: String(value('UTM source') || ''),
    utmMedium: String(value('UTM medium') || ''),
    utmCampaign: String(value('UTM campaign') || ''),
    emailStatus: String(value('Email status') || ''),
    notes: String(value('Notes') || ''),
    updatedAt: isoString_(value('Updated at')),
    assignedTo: normaliseEmail_(value('Assigned to')),
    priority: String(value('Priority') || 'Normal'),
    nextActionAt: isoString_(value('Next action at')),
    lastUpdatedBy: String(value('Last updated by') || ''),
    revision: Number(value('Revision') || 0)
  };
}

function listLead_(lead) {
  return {
    receivedAt: lead.receivedAt,
    leadId: lead.leadId,
    status: lead.status,
    name: lead.name,
    company: lead.company,
    email: lead.email,
    phone: lead.phone,
    service: lead.service,
    assignedTo: lead.assignedTo,
    priority: lead.priority,
    nextActionAt: lead.nextActionAt,
    revision: lead.revision
  };
}

function ensureLeadAdminColumns_(sheet) {
  if (!sheet) throw new Error('The Leads sheet is missing.');
  const existing = sheet.getLastColumn() ? sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0] : [];
  ADMIN.LEAD_ADMIN_HEADERS.forEach((header) => {
    if (existing.indexOf(header) !== -1) return;
    sheet.getRange(1, existing.length + 1).setValue(header);
    existing.push(header);
  });
  sheet.getRange(1, 1, 1, existing.length).setFontWeight('bold');
}

function getHeaderMap_(sheet) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
  return headers.reduce((map, header, index) => {
    map[String(header).trim()] = index + 1;
    return map;
  }, {});
}

function requiredColumn_(headerMap, name) {
  if (!headerMap[name]) throw new Error(`Required Leads column is missing: ${name}`);
  return headerMap[name];
}

function enforceMagicRequestLimit_(email) {
  const cache = CacheService.getScriptCache();
  const emailKey = `admin-magic:${hash_(email).slice(0, 32)}`;
  const globalKey = 'admin-magic:global';
  const emailCount = Number(cache.get(emailKey) || 0);
  const globalCount = Number(cache.get(globalKey) || 0);
  if (emailCount >= ADMIN.MAGIC_REQUESTS_PER_30_MINUTES || globalCount >= ADMIN.MAGIC_REQUESTS_GLOBAL_PER_30_MINUTES) {
    throw new Error('Magic-link request limit reached.');
  }
  cache.put(emailKey, String(emailCount + 1), 1800);
  cache.put(globalKey, String(globalCount + 1), 1800);
}

function sendMagicEmail_(user, link, expiresAt) {
  const expires = Utilities.formatDate(expiresAt, ADMIN.TIME_ZONE, 'HH:mm z');
  const safeName = escapeHtml_(user.name);
  const safeLink = escapeHtml_(link);
  MailApp.sendEmail({
    to: user.email,
    name: 'Baholo Operations',
    subject: 'Your Baholo Operations sign-in link',
    body: `Hello ${user.name},\n\nUse this one-time link to sign in to Baholo Operations:\n${link}\n\nThe link expires at ${expires} and can be used once. If you did not request it, ignore this email.\n\nBaholo Projects`,
    htmlBody: `<div style="font-family:Arial,sans-serif;color:#181818;line-height:1.6;max-width:620px"><div style="background:#111;color:#fff;padding:24px;border-top:6px solid #f58220"><strong style="letter-spacing:.08em">BAHOLO PROJECTS</strong><h1 style="font-size:24px;margin:14px 0 0">Secure staff sign-in</h1></div><div style="padding:26px;border:1px solid #e5e5e5;border-top:0"><p>Hello ${safeName},</p><p>Use the button below to sign in to Baholo Operations. This link expires at <strong>${escapeHtml_(expires)}</strong> and can be used once.</p><p style="margin:26px 0"><a href="${safeLink}" style="background:#f58220;color:#111;text-decoration:none;font-weight:bold;padding:13px 20px;display:inline-block">Sign in to Baholo Operations</a></p><p style="font-size:13px;color:#666">If you did not request this link, ignore this email. Do not forward it.</p></div></div>`
  });
}

function sendAssignmentNotification_(spreadsheet, actor, lead, assigneeEmail) {
  const assignee = getActiveUserByEmail_(spreadsheet, assigneeEmail);
  if (!assignee || !lead) return;
  try {
    const portalUrl = ScriptApp.getService().getUrl();
    const received = lead.receivedAt
      ? Utilities.formatDate(new Date(lead.receivedAt), ADMIN.TIME_ZONE, 'yyyy-MM-dd HH:mm z')
      : 'Not recorded';
    MailApp.sendEmail({
      to: assignee.email,
      name: 'Baholo Operations',
      subject: `Enquiry assigned to you — ${lead.leadId}`,
      body: `Hello ${assignee.name},\n\n${actor.name} assigned website enquiry ${lead.leadId} to you.\n\nContact: ${lead.name}\nCompany: ${lead.company || 'Not supplied'}\nService: ${lead.service}\nReceived: ${received}\n\nOpen Baholo Operations to review and update it:\n${portalUrl}\n\nThis is an internal notification. Do not forward it outside the authorised Baholo team.`,
      htmlBody: `<div style="font-family:Arial,sans-serif;color:#181818;line-height:1.6;max-width:620px"><div style="background:#111;color:#fff;padding:24px;border-top:6px solid #f58220"><strong style="letter-spacing:.08em">BAHOLO OPERATIONS</strong><h1 style="font-size:24px;margin:14px 0 0">An enquiry was assigned to you.</h1></div><div style="padding:26px;border:1px solid #e5e5e5;border-top:0"><p>Hello ${escapeHtml_(assignee.name)},</p><p>${escapeHtml_(actor.name)} assigned enquiry <strong>${escapeHtml_(lead.leadId)}</strong> to you.</p><table role="presentation" style="border-collapse:collapse;width:100%;margin:18px 0"><tr><td style="padding:7px 12px 7px 0;color:#666">Contact</td><td>${escapeHtml_(lead.name)}</td></tr><tr><td style="padding:7px 12px 7px 0;color:#666">Company</td><td>${escapeHtml_(lead.company || 'Not supplied')}</td></tr><tr><td style="padding:7px 12px 7px 0;color:#666">Service</td><td>${escapeHtml_(lead.service)}</td></tr><tr><td style="padding:7px 12px 7px 0;color:#666">Received</td><td>${escapeHtml_(received)}</td></tr></table><p><a href="${escapeHtml_(portalUrl)}" style="background:#f58220;color:#111;text-decoration:none;font-weight:bold;padding:12px 18px;display:inline-block">Open Baholo Operations</a></p><p style="font-size:12px;color:#777;margin-top:24px">This is an internal notification. Do not forward it outside the authorised Baholo team.</p></div></div>`
    });
    audit_(spreadsheet, actor, 'assignment_notification_sent', lead.leadId, 'assignedTo', '', assignee.email, '');
  } catch (error) {
    console.error(`Assignment notification failed: ${safeError_(error)}`);
    audit_(spreadsheet, actor, 'assignment_notification_failed', lead.leadId, 'assignedTo', '', assignee.email, safeError_(error));
  }
}

function getWorkbook_() {
  const id = PropertiesService.getScriptProperties().getProperty('LEADS_SPREADSHEET_ID');
  if (!/^[-\w]{20,}$/.test(id || '')) throw new Error('Admin workbook is not configured.');
  return SpreadsheetApp.openById(id);
}

function getActiveUsers_(spreadsheet) {
  const sheet = ensureSheet_(spreadsheet, ADMIN.USERS_SHEET, ADMIN.USER_HEADERS);
  if (sheet.getLastRow() < 2) return [];
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, ADMIN.USER_HEADERS.length).getValues()
    .map((row) => ({ email: normaliseEmail_(row[0]), name: singleLine_(row[1], 120), role: singleLine_(row[2], 40), active: isTrue_(row[3]) }))
    .filter((user) => user.email && user.active && ADMIN.ROLES[user.role]);
}

function getActiveUserByEmail_(spreadsheet, emailValue) {
  const email = normaliseEmail_(emailValue);
  return getActiveUsers_(spreadsheet).find((user) => user.email === email) || null;
}

function validateSeedUser_(raw) {
  const email = normaliseEmail_(raw && raw.email);
  const name = singleLine_(raw && raw.name, 120);
  const role = singleLine_(raw && raw.role, 40);
  if (!isEmail_(email) || name.length < 2 || !ADMIN.ROLES[role]) throw new Error('Each admin user needs a valid email, name and supported role.');
  return { email: email, name: name, role: role, active: raw.active !== false };
}

function upsertSeedUsers_(sheet, users) {
  const existing = {};
  if (sheet.getLastRow() >= 2) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, ADMIN.USER_HEADERS.length).getValues().forEach((row, index) => {
      existing[normaliseEmail_(row[0])] = index + 2;
    });
  }
  users.forEach((user) => {
    const now = new Date();
    const row = existing[user.email];
    if (row) {
      sheet.getRange(row, 1, 1, 4).setValues([[safeCell_(user.email), safeCell_(user.name), user.role, user.active]]);
      sheet.getRange(row, 6).setValue(now);
    } else {
      sheet.appendRow([safeCell_(user.email), safeCell_(user.name), user.role, user.active, now, now]);
    }
  });
}

function findRecentHashRow_(sheet, hashColumn, targetHash) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;
  const firstRow = Math.max(2, lastRow - ADMIN.MAX_AUTH_SCAN_ROWS + 1);
  const hashes = sheet.getRange(firstRow, hashColumn, lastRow - firstRow + 1, 1).getDisplayValues();
  for (let index = hashes.length - 1; index >= 0; index -= 1) {
    if (hashes[index][0] === targetHash) return firstRow + index;
  }
  return 0;
}

function hasPermission_(user, permission) {
  const role = ADMIN.ROLES[user.role];
  return Boolean(role && role.permissions.indexOf(permission) !== -1);
}

function publicUser_(user) {
  const role = ADMIN.ROLES[user.role];
  return { email: user.email, name: user.name, role: user.role, roleLabel: role ? role.label : user.role };
}

function audit_(spreadsheet, actor, action, leadId, field, before, after, detail) {
  try {
    ensureSheet_(spreadsheet, ADMIN.AUDIT_SHEET, ADMIN.AUDIT_HEADERS).appendRow([
      new Date(),
      Utilities.getUuid(),
      safeCell_(clean_(actor.email, 254)),
      safeCell_(clean_(actor.name, 120)),
      safeCell_(clean_(actor.role, 40)),
      safeCell_(clean_(action, 80)),
      safeCell_(clean_(leadId, 50)),
      safeCell_(clean_(field, 80)),
      safeCell_(clean_(before, 2000)),
      safeCell_(clean_(after, 2000)),
      safeCell_(clean_(detail, 1000))
    ]);
  } catch (error) {
    console.error(`Admin audit failed: ${safeError_(error)}`);
  }
}

function ensureSheet_(spreadsheet, name, headers) {
  const sheet = spreadsheet.getSheetByName(name) || spreadsheet.insertSheet(name);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#111111').setFontColor('#ffffff');
  }
  return sheet;
}

function magicTtlMinutes_() {
  const value = Number(PropertiesService.getScriptProperties().getProperty('MAGIC_LINK_TTL_MINUTES'));
  return Number.isFinite(value) && value >= 5 && value <= 30 ? value : ADMIN.MAGIC_TTL_MINUTES;
}

function sessionTtlHours_() {
  const value = Number(PropertiesService.getScriptProperties().getProperty('SESSION_TTL_HOURS'));
  return Number.isFinite(value) && value >= 1 && value <= 24 ? value : ADMIN.SESSION_TTL_HOURS;
}

function authFailure_(message) {
  return { ok: false, error: { code: 'invalid_magic_link', message: message } };
}

function publicError_(code, message) {
  const error = new Error(message);
  error.publicCode = code;
  error.publicMessage = message;
  return error;
}

function systemActor_() {
  return { email: 'system', name: 'Baholo Operations', role: 'system' };
}

function randomToken_() {
  return `${Utilities.getUuid().replace(/-/g, '')}${Utilities.getUuid().replace(/-/g, '')}`;
}

function hash_(value) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, value, Utilities.Charset.UTF_8);
  return bytes.map((byte) => ((byte + 256) % 256).toString(16).padStart(2, '0')).join('');
}

function normaliseEmail_(value) {
  return singleLine_(value, 254).toLowerCase();
}

function isEmail_(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value || '');
}

function isTrue_(value) {
  return value === true || String(value).toLowerCase() === 'true' || String(value).toLowerCase() === 'yes';
}

function asDate_(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isoString_(value) {
  const date = asDate_(value);
  return date ? date.toISOString() : '';
}

function serialiseCell_(value) {
  const date = asDate_(value);
  if (value instanceof Date && date) return date.toISOString();
  return String(value == null ? '' : value);
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
  if (value instanceof Date || typeof value === 'boolean' || typeof value === 'number') return value;
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

function safeError_(error) {
  return clean_(error && error.message ? error.message : String(error || 'Unknown error'), 800);
}

function include_(name) {
  return HtmlService.createHtmlOutputFromFile(name).getContent();
}
