'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const serverPath = path.join(root, 'apps-script-admin', 'Code.gs');
const clientPath = path.join(root, 'apps-script-admin', 'App.html');
const indexPath = path.join(root, 'apps-script-admin', 'Index.html');
const manifestPath = path.join(root, 'apps-script-admin', 'appsscript.json');
const entryPath = path.join(root, 'baholooperations', 'index.html');
const publicIndexPath = path.join(root, 'index.html');
const sitemapPath = path.join(root, 'sitemap.xml');
const serverSource = fs.readFileSync(serverPath, 'utf8');
const clientHtml = fs.readFileSync(clientPath, 'utf8');
const indexHtml = fs.readFileSync(indexPath, 'utf8');
const entryHtml = fs.readFileSync(entryPath, 'utf8');
const publicIndexHtml = fs.readFileSync(publicIndexPath, 'utf8');
const sitemapXml = fs.readFileSync(sitemapPath, 'utf8');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

new Function(serverSource);
const clientSource = clientHtml.slice(clientHtml.indexOf('>') + 1, clientHtml.lastIndexOf('</script>'));
new Function(clientSource);

const publicFunctions = Array.from(serverSource.matchAll(/^function ([A-Za-z0-9]+)\(/gm), (match) => match[1]);
assert.deepEqual(publicFunctions, [
  'doGet',
  'requestMagicLink',
  'redeemMagicLink',
  'getAdminBootstrap',
  'getAdminLeads',
  'getAdminLead',
  'saveAdminLead',
  'getAdminAnalytics',
  'signOutAdmin'
]);
assert.match(serverSource, /function setupAdmin_\(/);
assert.doesNotMatch(serverSource, /const\s+(?:SPREADSHEET_ID|OWNER_EMAIL|ADMIN_EMAIL)\s*=/);
assert.match(serverSource, /https:\/\/www\.baholoprojects\.co\.za\/assets\/baholo-logo\.png/);
assert.match(indexHtml, /noindex, nofollow, noarchive/);
assert.doesNotMatch(indexHtml, /<script\s+src=/i);
assert.equal((indexHtml.match(/assets\/baholo-emblem\.png/g) || []).length, 3);
assert.doesNotMatch(indexHtml, /brand-mark/);
assert.match(indexHtml, /data-traffic-chart/);
assert.doesNotMatch(indexHtml, /data-line-chart/);
assert.doesNotMatch(clientHtml, /<polyline/);
assert.match(entryHtml, /noindex, nofollow, noarchive, nosnippet/);
assert.match(entryHtml, /https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec/);
assert.doesNotMatch(publicIndexHtml, /baholooperations/i);
assert.doesNotMatch(sitemapXml, /baholooperations/i);

assert.equal(manifest.webapp.executeAs, 'USER_DEPLOYING');
assert.equal(manifest.webapp.access, 'ANYONE');
assert.ok(manifest.oauthScopes.includes('https://www.googleapis.com/auth/analytics.readonly'));
assert.ok(manifest.oauthScopes.includes('https://www.googleapis.com/auth/spreadsheets'));
assert.ok(manifest.oauthScopes.includes('https://www.googleapis.com/auth/script.send_mail'));
assert.deepEqual(manifest.urlFetchWhitelist, ['https://analyticsdata.googleapis.com/']);

const context = vm.createContext({
  console,
  Utilities: {
    DigestAlgorithm: { SHA_256: 'SHA_256' },
    Charset: { UTF_8: 'UTF_8' },
    computeDigest(_algorithm, value) {
      return Array.from(crypto.createHash('sha256').update(value, 'utf8').digest());
    }
  }
});
vm.runInContext(serverSource, context);

assert.equal(vm.runInContext(`normaliseEmail_('  Person@Example.COM  ')`, context), 'person@example.com');
assert.equal(vm.runInContext(`safeCell_('=IMPORTXML("https://example.com")')`, context), `'=IMPORTXML("https://example.com")`);
assert.equal(vm.runInContext(`safeCell_('+27110000000')`, context), `'+27110000000`);
assert.equal(vm.runInContext(`JSON.stringify(validateSeedUser_({email:'user@example.com',name:'Test User',role:'owner',active:true}))`, context), '{"email":"user@example.com","name":"Test User","role":"owner","active":true}');
assert.equal(vm.runInContext(`JSON.stringify(validateLeadPatch_({status:'Qualified',priority:'High',nextActionAt:'2026-09-10'}, {}))`, context), '{"status":"Qualified","priority":"High","nextActionAt":"2026-09-10"}');
assert.throws(() => vm.runInContext(`validateLeadPatch_({status:'Delete everything'}, {})`, context), /valid status/);
assert.throws(() => vm.runInContext(`validateLeadPatch_({nextActionAt:'10\/09\/2026'}, {})`, context), /valid next-action date/);
assert.equal(vm.runInContext(`normaliseFilters_({page:'-4',pageSize:'1000'}).page`, context), 1);
assert.equal(vm.runInContext(`normaliseFilters_({page:'2',pageSize:'1000'}).pageSize`, context), 100);

console.log('Admin portal security and syntax checks passed.');
