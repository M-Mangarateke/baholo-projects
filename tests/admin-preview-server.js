'use strict';

const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const root = path.resolve(__dirname, '..', 'apps-script-admin');
const port = Number(process.argv[2] || 4174);
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

const mockData = {
  bootstrap: {
    user: { email: 'operations@example.test', name: 'Lerato Mokoena', role: 'operations_manager', roleLabel: 'Operations Manager' },
    summary: { total: 18, new: 4, active: 11, won: 3, needsFollowUp: 2 },
    options: {
      statuses: ['New', 'Contacted', 'Qualified', 'Quoted', 'Won', 'Lost', 'Closed'],
      priorities: ['Normal', 'High', 'Urgent'],
      services: ['Industrial supplies', 'Welding & fabrication', 'Consulting', 'Scaffolding', 'Other'],
      assignees: [
        { email: 'admin@example.test', name: 'Naledi Dlamini', role: 'administrative_officer', roleLabel: 'Administrative Officer' },
        { email: 'operations@example.test', name: 'Lerato Mokoena', role: 'operations_manager', roleLabel: 'Operations Manager' }
      ]
    },
    sessionExpiresAt: '2026-08-31T18:00:00.000Z'
  },
  leads: [
    { receivedAt: '2026-08-31T08:15:00.000Z', leadId: 'BP-20260831-A1B2C3D4', status: 'New', name: 'Sample Contact', company: 'Example Engineering', email: 'contact@example.test', phone: '+27 11 000 0000', service: 'Industrial supplies', assignedTo: '', priority: 'Urgent', nextActionAt: '2026-09-01T10:00:00.000Z', revision: 0 },
    { receivedAt: '2026-08-30T12:30:00.000Z', leadId: 'BP-20260830-E5F6A7B8', status: 'Qualified', name: 'Demo Buyer', company: 'Sample Manufacturing', email: 'buyer@example.test', phone: '+27 12 000 0000', service: 'Welding & fabrication', assignedTo: 'operations@example.test', priority: 'High', nextActionAt: '2026-09-03T10:00:00.000Z', revision: 2 },
    { receivedAt: '2026-08-29T09:00:00.000Z', leadId: 'BP-20260829-C9D0E1F2', status: 'Quoted', name: 'Test Planner', company: 'Illustrative Projects', email: 'planner@example.test', phone: '', service: 'Scaffolding', assignedTo: 'admin@example.test', priority: 'Normal', nextActionAt: '', revision: 1 }
  ],
  analytics: {
    available: true,
    rangeDays: 28,
    summary: { activeUsers: 124, sessions: 161, pageViews: 248, events: 672, keyEvents: 9 },
    trend: Array.from({ length: 14 }, (_, index) => ({ date: `202608${String(18 + index).padStart(2, '0')}`, users: 4 + (index * 3) % 13, pageViews: 7 + (index * 5) % 21 })),
    pages: [
      { title: 'Baholo Projects | Industrial Supply, Pipework & Fabrication', path: '/', pageViews: 218, users: 119 },
      { title: 'Privacy Policy | Baholo Projects', path: '/privacy.html', pageViews: 18, users: 12 },
      { title: 'Terms of Use | Baholo Projects', path: '/terms.html', pageViews: 12, users: 9 }
    ],
    channels: [{ channel: 'Organic Search', sessions: 76 }, { channel: 'Direct', sessions: 52 }, { channel: 'Organic Social', sessions: 21 }, { channel: 'Referral', sessions: 12 }],
    events: [
      { name: 'cta_click', count: 38, keyEvents: 0 }, { name: 'contact_click', count: 21, keyEvents: 0 },
      { name: 'lead_form_start', count: 17, keyEvents: 0 }, { name: 'lead_form_submit_attempt', count: 11, keyEvents: 0 },
      { name: 'generate_lead', count: 9, keyEvents: 9 }
    ],
    generatedAt: '2026-08-31T12:00:00.000Z'
  }
};

const mockBridge = `<script>
  (() => {
    const responses = ${JSON.stringify(mockData)};
    const detail = (leadId) => {
      const lead = responses.leads.find((item) => item.leadId === leadId) || responses.leads[0];
      return { ...lead, message: 'This is illustrative preview data for checking the staff workflow and layout. No real visitor information is used.', consent: 'Yes', formVersion: 'preview', privacyVersion: 'preview', pageUrl: 'https://www.baholoprojects.co.za/', landingPage: '/', referrer: '', utmSource: 'google', utmMedium: 'organic', utmCampaign: '', emailStatus: 'Admin sent; visitor sent', notes: 'Follow up with a scoped requirement list.', updatedAt: '2026-08-31T10:00:00.000Z', lastUpdatedBy: 'operations@example.test' };
    };
    const methods = {
      redeemMagicLink: () => ({ ok: true, data: { sessionToken: '${'a'.repeat(64)}', expiresAt: '2026-08-31T18:00:00.000Z', user: responses.bootstrap.user } }),
      getAdminBootstrap: () => ({ ok: true, data: responses.bootstrap }),
      getAdminLeads: () => ({ ok: true, data: { rows: responses.leads, total: responses.leads.length, page: 1, pageSize: 50, pages: 1 } }),
      getAdminLead: (_session, leadId) => ({ ok: true, data: detail(leadId) }),
      saveAdminLead: (_session, leadId, patch, revision) => ({ ok: true, data: { ...detail(leadId), ...patch, revision: Number(revision) + 1, updatedAt: new Date().toISOString(), lastUpdatedBy: responses.bootstrap.user.email } }),
      getAdminAnalytics: () => ({ ok: true, data: responses.analytics }),
      requestMagicLink: () => ({ ok: true, message: 'If that address is authorised, a sign-in link will arrive shortly. The link expires after 15 minutes.' }),
      signOutAdmin: () => ({ ok: true, data: { signedOut: true } })
    };
    window.google = { script: { run: new Proxy({}, {
      get(target, property) {
        if (property === 'withSuccessHandler') return (handler) => { target.success = handler; return window.google.script.run; };
        if (property === 'withFailureHandler') return (handler) => { target.failure = handler; return window.google.script.run; };
        return (...args) => setTimeout(() => {
          try { target.success(methods[property](...args)); } catch (error) { target.failure(error); }
        }, 40);
      }
    }) } };
  })();
</script>`;

let html = read('Index.html')
  .replace("<?!= include_('Styles'); ?>", read('Styles.html'))
  .replace("<?!= include_('App'); ?>", `${mockBridge}\n${read('App.html')}`)
  .replace("<?= magicToken ?>", 'b'.repeat(64))
  .replace("<?= serviceUrl ?>", `http://127.0.0.1:${port}/`);

const server = http.createServer((request, response) => {
  if (request.url === '/favicon.ico') {
    response.writeHead(204);
    response.end();
    return;
  }
  response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(html);
});

server.listen(port, '127.0.0.1', () => console.log(`Baholo admin preview: http://127.0.0.1:${port}/`));
