// DOM manipulation, form rendering, validation
// Only module that touches the DOM.

import { WIFI_AUTH_TYPES, WIFI_ENCRYPT_TYPES } from './ndef.js';
import { NTAG_VARIANTS } from './ntag.js';

const RECORD_TYPES = ['url', 'text', 'vcard', 'wifi'];

const RECORD_LABELS = {
  url: 'URL',
  text: 'Text',
  vcard: 'vCard',
  wifi: 'WiFi',
};

// --- Form Templates ---

function urlFormHTML() {
  return `
    <div class="form-group">
      <label for="uri">URL</label>
      <input type="url" id="uri" name="uri" placeholder="https://www.youtube.com/watch?v=dQw4w9WgXcQ" autocomplete="off" />
    </div>
  `;
}

function textFormHTML() {
  return `
    <div class="form-group">
      <label for="text">Message</label>
      <textarea id="text" name="text" rows="4" placeholder="Enter your text message"></textarea>
    </div>
    <div class="form-group form-group--small">
      <label for="lang">Language Code</label>
      <input type="text" id="lang" name="lang" value="en" maxlength="5" />
    </div>
  `;
}

function vcardFormHTML() {
  return `
    <div class="vcard-mode-selector">
      <div class="field-hint">
        <strong>Encoding Mode</strong> — <strong>Traditional</strong> writes a standard
        vCard record (works natively on Android). <strong>URL</strong> writes a link that
        opens in Safari and prompts "Add to Contacts" (needed for iPhone).
        <strong>Both</strong> includes both records for cross-platform compatibility,
        but uses more tag space.
      </div>
      <div class="vcard-mode-options">
        <label class="mode-label"><input type="radio" name="vcardMode" value="traditional" checked /> Traditional</label>
        <label class="mode-label"><input type="radio" name="vcardMode" value="url" /> URL (iPhone)</label>
        <label class="mode-label"><input type="radio" name="vcardMode" value="both" /> Both</label>
      </div>
      <label class="toggle-label vcard-compress-toggle" style="display:none">
        <input type="checkbox" id="vcard-compress" class="toggle-input" />
        <span class="toggle-switch"></span> Compress
      </label>
    </div>

    <div class="vcard-toggles">
      <label class="toggle-label"><input type="checkbox" id="advanced-toggle" class="toggle-input" /> <span class="toggle-switch"></span> Advanced</label>
      <label class="toggle-label legacy-toggle-wrap"><input type="checkbox" id="legacy-toggle" class="toggle-input" /> <span class="toggle-switch"></span> Legacy</label>
    </div>

    <!-- ===== BASIC FIELDS ===== -->
    <fieldset class="form-fieldset">
      <legend>Identity</legend>
      <div class="form-row">
        <div class="form-group form-group--prefix"><label for="prefix">Title</label><input type="text" id="prefix" name="prefix" placeholder="Ms." /></div>
        <div class="form-group"><label for="firstName">First Name</label><input type="text" id="firstName" name="firstName" /></div>
        <div class="form-group"><label for="lastName">Last Name</label><input type="text" id="lastName" name="lastName" /></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label for="nickname">Nickname</label><input type="text" id="nickname" name="nickname" /></div>
        <div class="form-group"><label for="pronouns">Pronouns</label><input type="text" id="pronouns" name="pronouns" placeholder="e.g. she/her" /></div>
        <div class="form-group"><label for="gender">Gender</label><input type="text" id="gender" name="gender" /></div>
      </div>
      <div class="form-row">
        <div class="form-group form-group--lang"><label for="lang">Language</label><input type="text" id="lang" name="lang" placeholder="e.g. en" /></div>
        <div class="form-group"><label for="photo">Photo URL</label><input type="url" id="photo" name="photo" placeholder="https://example.com/photo.jpg" /></div>
      </div>
    </fieldset>

    <fieldset class="form-fieldset">
      <legend>Organization</legend>
      <div class="form-row">
        <div class="form-group"><label for="org">Organization</label><input type="text" id="org" name="org" /></div>
        <div class="form-group"><label for="title">Job Title</label><input type="text" id="title" name="title" /></div>
        <div class="form-group"><label for="role">Role</label><input type="text" id="role" name="role" placeholder="e.g. Sales" /></div>
      </div>
      <div class="form-group"><label for="logo">Organization Logo URL</label><input type="url" id="logo" name="logo" placeholder="https://example.com/logo.png" /></div>
    </fieldset>

    <fieldset class="form-fieldset">
      <legend>Contact</legend>
      <p class="field-hint"><strong>Label</strong> (optional): Sets a custom display name for this field in Apple Contacts via X-ABLabel. Example: label a phone "Personal Mobile" or an email "UK Office". Non-Apple devices ignore this &mdash; leave blank if unsure.</p>
      <div class="form-group">
        <label>Phone Numbers</label>
        <div id="phones-container">
          <div class="dynamic-row">
            <select name="phoneType" class="phone-type-select">${phoneTypeOptions()}</select>
            <input type="tel" name="phoneValue" placeholder="+1 555-0100" />
            <input type="text" name="phoneLabel" placeholder="Label" list="phone-labels" class="label-input" title="Apple X-ABLabel: custom display name for Apple Contacts" />
            <button type="button" class="btn-remove-row" title="Remove">&times;</button>
          </div>
        </div>
        <button type="button" class="btn-add-row" data-target="phones-container" data-template="phone">+ Add Phone</button>
        <datalist id="phone-labels"><option value="Mobile"><option value="iPhone"><option value="Home"><option value="Work"><option value="Main"><option value="School"><option value="Other"></datalist>
      </div>
      <div class="form-group">
        <label>Email Addresses</label>
        <div id="emails-container">
          <div class="dynamic-row">
            <input type="email" name="emailValue" placeholder="name@example.com" />
            <select name="emailType" class="email-type-select advanced-section">${emailTypeOptions()}</select>
            <input type="text" name="emailLabel" placeholder="Label" list="email-labels" class="label-input" title="Apple X-ABLabel: custom display name for Apple Contacts" />
            <button type="button" class="btn-remove-row" title="Remove">&times;</button>
          </div>
        </div>
        <button type="button" class="btn-add-row" data-target="emails-container" data-template="email">+ Add Email</button>
        <datalist id="email-labels"><option value="Home"><option value="Work"><option value="iCloud"><option value="Other"></datalist>
      </div>
      <div class="form-group">
        <label for="url">Website</label>
        <div class="form-row-inline">
          <input type="url" id="url" name="url" placeholder="https://example.com" />
          <input type="text" id="urlLabel" name="urlLabel" placeholder="Label" list="url-labels" class="label-input" title="Apple X-ABLabel: custom display name for Apple Contacts" />
        </div>
        <datalist id="url-labels"><option value="HomePage"><option value="Home"><option value="Work"><option value="Blog"><option value="Other"></datalist>
      </div>
    </fieldset>

    <fieldset class="form-fieldset">
      <legend>Social Profiles</legend>
      <div class="form-group">
        <div id="social-container">
          <div class="dynamic-row">
            <select name="socialService">${socialServiceOptions()}</select>
            <input type="text" name="socialCustomService" placeholder="Service name" class="social-custom-input" />
            <input type="text" name="socialUrl" placeholder="URL or handle" />
            <button type="button" class="btn-remove-row" title="Remove">&times;</button>
          </div>
        </div>
        <button type="button" class="btn-add-row" data-target="social-container" data-template="social">+ Add Profile</button>
      </div>
    </fieldset>

    <fieldset class="form-fieldset">
      <legend>Address</legend>
      <div class="form-group"><label for="street">Street</label><input type="text" id="street" name="street" /></div>
      <div class="form-row">
        <div class="form-group"><label for="city">City</label><input type="text" id="city" name="city" /></div>
        <div class="form-group"><label for="state">State</label><input type="text" id="state" name="state" /></div>
        <div class="form-group"><label for="zip">ZIP</label><input type="text" id="zip" name="zip" /></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label for="country">Country</label><input type="text" id="country" name="country" /></div>
        <div class="form-group">
          <label for="addressLabel">Address Label</label>
          <input type="text" id="addressLabel" name="addressLabel" placeholder="Label" list="address-labels" class="label-input label-input--full" title="Apple X-ABLabel: custom display name for Apple Contacts" />
          <datalist id="address-labels"><option value="Home"><option value="Work"><option value="School"><option value="Other"></datalist>
        </div>
      </div>
    </fieldset>

    <div class="form-group">
      <label for="note">Note</label>
      <textarea id="note" name="note" rows="2" placeholder="Additional notes"></textarea>
    </div>

    <!-- ===== ADVANCED FIELDS ===== -->
    <div class="advanced-section">
      <fieldset class="form-fieldset">
        <legend>Dates</legend>
        <div class="form-row">
          <div class="form-group"><label for="bday">Birthday</label><input type="date" id="bday" name="bday" /></div>
          <div class="form-group"><label for="anniversary">Anniversary</label><input type="date" id="anniversary" name="anniversary" /></div>
        </div>
      </fieldset>

      <fieldset class="form-fieldset">
        <legend>Instant Messaging</legend>
        <div class="form-group">
          <div id="impp-container">
            <div class="dynamic-row">
              <select name="imppScheme"><option>xmpp</option><option>sip</option><option>irc</option><option>skype</option></select>
              <input type="text" name="imppAddress" placeholder="user@example.com" />
              <button type="button" class="btn-remove-row" title="Remove">&times;</button>
            </div>
          </div>
          <button type="button" class="btn-add-row" data-target="impp-container" data-template="impp">+ Add IM</button>
        </div>
      </fieldset>

      <fieldset class="form-fieldset">
        <legend>Geographical</legend>
        <div class="form-row">
          <div class="form-group"><label for="geoLat">Latitude</label><input type="text" id="geoLat" name="geoLat" placeholder="e.g. 40.7128" /></div>
          <div class="form-group"><label for="geoLon">Longitude</label><input type="text" id="geoLon" name="geoLon" placeholder="e.g. -74.0060" /></div>
          <div class="form-group"><label for="tz">Time Zone</label><input type="text" id="tz" name="tz" placeholder="e.g. America/New_York" /></div>
        </div>
      </fieldset>

      <fieldset class="form-fieldset">
        <legend>Calendar</legend>
        <div class="form-row">
          <div class="form-group"><label for="fburl">Free/Busy URL</label><input type="url" id="fburl" name="fburl" placeholder="https://example.com/freebusy.ifb" /></div>
          <div class="form-group"><label for="caluri">Calendar URL</label><input type="url" id="caluri" name="caluri" placeholder="https://example.com/calendar.ics" /></div>
          <div class="form-group"><label for="caladruri">Cal Address URI</label><input type="url" id="caladruri" name="caladruri" placeholder="mailto:cal@example.com" /></div>
        </div>
      </fieldset>

      <fieldset class="form-fieldset">
        <legend>Professional</legend>
        <div class="form-row">
          <div class="form-group"><label for="expertise">Expertise</label><input type="text" id="expertise" name="expertise" placeholder="e.g. Python, NFC" /></div>
          <div class="form-group"><label for="hobby">Hobby</label><input type="text" id="hobby" name="hobby" placeholder="e.g. Photography" /></div>
          <div class="form-group"><label for="interest">Interest</label><input type="text" id="interest" name="interest" placeholder="e.g. AI, Security" /></div>
        </div>
        <div class="form-group"><label for="orgDirectory">Org Directory URL</label><input type="url" id="orgDirectory" name="orgDirectory" /></div>
      </fieldset>

      <fieldset class="form-fieldset">
        <legend>Biographical</legend>
        <div class="form-row">
          <div class="form-group"><label for="birthplace">Birthplace</label><input type="text" id="birthplace" name="birthplace" /></div>
          <div class="form-group"><label for="deathplace">Deathplace</label><input type="text" id="deathplace" name="deathplace" /></div>
          <div class="form-group"><label for="deathdate">Death Date</label><input type="date" id="deathdate" name="deathdate" /></div>
        </div>
      </fieldset>

      <fieldset class="form-fieldset">
        <legend>Other</legend>
        <div class="form-row">
          <div class="form-group">
            <label for="kind">Kind</label>
            <select id="kind" name="kind"><option value="">—</option><option>individual</option><option>group</option><option>org</option><option>location</option></select>
          </div>
          <div class="form-group"><label for="categories">Categories</label><input type="text" id="categories" name="categories" placeholder="e.g. Business,Networking" /></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label for="key">Public Key</label><input type="text" id="key" name="key" placeholder="URL or base64 key" /></div>
          <div class="form-group"><label for="sound">Sound URL</label><input type="url" id="sound" name="sound" /></div>
        </div>
      </fieldset>

      <!-- ===== LEGACY FIELDS ===== -->
      <div class="legacy-section">
        <fieldset class="form-fieldset">
          <legend>Legacy (Deprecated)</legend>
          <div class="form-row">
            <div class="form-group"><label for="mailer">Mailer</label><input type="text" id="mailer" name="mailer" placeholder="e.g. Thunderbird" /></div>
            <div class="form-group"><label for="agent">Agent</label><input type="text" id="agent" name="agent" placeholder="Representative" /></div>
          </div>
          <div class="form-group"><label for="formattedLabel">Formatted Address Label</label><textarea id="formattedLabel" name="formattedLabel" rows="2" placeholder="Full formatted mailing address"></textarea></div>
          <div class="form-row">
            <div class="form-group"><label for="sortString">Sort String</label><input type="text" id="sortString" name="sortString" /></div>
            <div class="form-group">
              <label for="classification">Classification</label>
              <select id="classification" name="classification"><option value="">None</option><option value="PUBLIC">Public</option><option value="PRIVATE">Private</option><option value="CONFIDENTIAL">Confidential</option></select>
            </div>
          </div>
        </fieldset>
      </div>
    </div>
  `;
}

// --- Phone/Email type options by tier ---
function phoneTypeOptions() {
  return '<option value="CELL">Mobile/Cell</option><option>HOME</option><option>WORK</option>'
    + '<option class="advanced-option">VOICE</option><option class="advanced-option">FAX</option>'
    + '<option class="advanced-option">PAGER</option><option class="advanced-option">VIDEO</option>'
    + '<option class="advanced-option">MSG</option><option class="advanced-option">CAR</option>'
    + '<option class="advanced-option">PREF</option>'
    + '<option class="legacy-option">BBS</option><option class="legacy-option">MODEM</option>'
    + '<option class="legacy-option">PCS</option><option class="legacy-option">ISDN</option>';
}

function emailTypeOptions() {
  return '<option>INTERNET</option>'
    + '<option class="advanced-option">PREF</option>'
    + '<option class="legacy-option">X400</option>';
}

const SOCIAL_SERVICES = ['LinkedIn', 'Twitter/X', 'Instagram', 'Facebook', 'GitHub', 'YouTube', 'TikTok', 'Mastodon', 'Custom'];

function socialServiceOptions() {
  return SOCIAL_SERVICES.map(s => `<option>${s}</option>`).join('');
}

function wifiFormHTML() {
  const authOptions = Object.keys(WIFI_AUTH_TYPES).map(k => `<option value="${k}">${k}</option>`).join('');
  const encOptions = Object.keys(WIFI_ENCRYPT_TYPES).map(k => `<option value="${k}">${k}</option>`).join('');
  return `
    <div class="form-group">
      <label for="ssid">Network Name (SSID)</label>
      <input type="text" id="ssid" name="ssid" placeholder="MyNetwork" autocomplete="off" />
    </div>
    <div class="form-group">
      <label for="password">Password</label>
      <div class="password-wrapper">
        <input type="password" id="password" name="password" autocomplete="off" />
        <button type="button" class="btn-toggle-pw" title="Show/hide password">Show</button>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label for="authType">Authentication</label>
        <select id="authType" name="authType">${authOptions}</select>
      </div>
      <div class="form-group">
        <label for="encType">Encryption</label>
        <select id="encType" name="encType">${encOptions}</select>
      </div>
    </div>
  `;
}

const FORM_TEMPLATES = { url: urlFormHTML, text: textFormHTML, vcard: vcardFormHTML, wifi: wifiFormHTML };

function phoneRowHTML() {
  return `<div class="dynamic-row">
    <select name="phoneType" class="phone-type-select">${phoneTypeOptions()}</select>
    <input type="tel" name="phoneValue" placeholder="+1 555-0100" />
    <input type="text" name="phoneLabel" placeholder="Label" list="phone-labels" class="label-input" title="Apple X-ABLabel: custom display name for Apple Contacts" />
    <button type="button" class="btn-remove-row" title="Remove">&times;</button>
  </div>`;
}

function emailRowHTML() {
  return `<div class="dynamic-row">
    <input type="email" name="emailValue" placeholder="name@example.com" />
    <select name="emailType" class="email-type-select advanced-section">${emailTypeOptions()}</select>
    <input type="text" name="emailLabel" placeholder="Label" list="email-labels" class="label-input" title="Apple X-ABLabel: custom display name for Apple Contacts" />
    <button type="button" class="btn-remove-row" title="Remove">&times;</button>
  </div>`;
}

function socialRowHTML() {
  return `<div class="dynamic-row">
    <select name="socialService">${socialServiceOptions()}</select>
    <input type="text" name="socialCustomService" placeholder="Service name" class="social-custom-input" />
    <input type="text" name="socialUrl" placeholder="URL or handle" />
    <button type="button" class="btn-remove-row" title="Remove">&times;</button>
  </div>`;
}

function imppRowHTML() {
  return `<div class="dynamic-row">
    <select name="imppScheme"><option>xmpp</option><option>sip</option><option>irc</option><option>skype</option></select>
    <input type="text" name="imppAddress" placeholder="user@example.com" />
    <button type="button" class="btn-remove-row" title="Remove">&times;</button>
  </div>`;
}

const ROW_TEMPLATES = {
  phone: phoneRowHTML,
  email: emailRowHTML,
  social: socialRowHTML,
  impp: imppRowHTML,
};

// --- Public API ---

export function initUI(callbacks) {
  const tabBar = document.getElementById('tab-bar');
  const formContainer = document.getElementById('form-container');

  // Tab clicks
  tabBar.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-type]');
    if (!btn) return;
    const type = btn.dataset.type;
    setActiveTab(type);
    renderForm(type);
    callbacks.onRecordTypeChange(type);
  });

  // Form input (delegated, debounced)
  let debounceTimer;
  formContainer.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => callbacks.onFormInput(), 150);
  });

  // Dynamic row add/remove + toggles
  formContainer.addEventListener('click', (e) => {
    if (e.target.closest('.btn-add-row')) {
      const btn = e.target.closest('.btn-add-row');
      const container = document.getElementById(btn.dataset.target);
      const templateFn = ROW_TEMPLATES[btn.dataset.template];
      if (templateFn) container.insertAdjacentHTML('beforeend', templateFn());
      callbacks.onFormInput();
      return;
    }
    if (e.target.closest('.btn-remove-row')) {
      const row = e.target.closest('.dynamic-row');
      row.remove();
      callbacks.onFormInput();
      return;
    }
    if (e.target.closest('.btn-toggle-pw')) {
      const btn = e.target.closest('.btn-toggle-pw');
      const input = btn.previousElementSibling;
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      btn.textContent = show ? 'Hide' : 'Show';
      return;
    }
  });

  // Advanced/Legacy toggles (delegated on form since they're inside vcard form)
  formContainer.addEventListener('change', (e) => {
    if (e.target.id === 'advanced-toggle') {
      formContainer.classList.toggle('show-advanced', e.target.checked);
      if (!e.target.checked) {
        formContainer.classList.remove('show-legacy');
        const legacyToggle = document.getElementById('legacy-toggle');
        if (legacyToggle) legacyToggle.checked = false;
      }
      callbacks.onFormInput();
    }
    if (e.target.id === 'legacy-toggle') {
      formContainer.classList.toggle('show-legacy', e.target.checked);
      callbacks.onFormInput();
    }
    // vCard encoding mode — show/hide compress toggle
    if (e.target.name === 'vcardMode') {
      const compress = document.querySelector('.vcard-compress-toggle');
      if (compress) compress.style.display = (e.target.value === 'traditional') ? 'none' : 'flex';
      callbacks.onFormInput();
    }
    // Social service custom toggle
    if (e.target.name === 'socialService') {
      const customInput = e.target.closest('.dynamic-row')?.querySelector('.social-custom-input');
      if (customInput) {
        customInput.classList.toggle('visible', e.target.value === 'Custom');
        if (e.target.value !== 'Custom') customInput.value = '';
      }
    }
  });

  // Action buttons
  document.getElementById('generate-btn').addEventListener('click', () => callbacks.onGenerate());
  document.getElementById('generate-download-btn').addEventListener('click', () => callbacks.onGenerateDownload());
  document.getElementById('generate-download-save-btn').addEventListener('click', () => callbacks.onGenerateDownloadSave());

  // Variant override
  document.getElementById('variant-select').addEventListener('change', (e) => {
    callbacks.onVariantChange(e.target.value);
  });

  // UID input
  document.getElementById('uid-input').addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => callbacks.onFormInput(), 150);
  });

  // Hex preview toggle
  document.getElementById('hex-toggle').addEventListener('click', () => {
    const preview = document.getElementById('hex-preview');
    const toggle = document.getElementById('hex-toggle');
    const visible = preview.classList.toggle('visible');
    toggle.textContent = visible ? 'Hide Hex Preview' : 'Show Hex Preview';
  });

  // Profile list actions (delegated)
  document.getElementById('profile-list').addEventListener('click', (e) => {
    const loadBtn = e.target.closest('[data-action="load"]');
    const deleteBtn = e.target.closest('[data-action="delete"]');
    const renameBtn = e.target.closest('[data-action="rename"]');
    if (loadBtn) callbacks.onLoadProfile(loadBtn.dataset.name);
    if (deleteBtn) callbacks.onDeleteProfile(deleteBtn.dataset.name);
    if (renameBtn) {
      const newName = prompt('New name:', renameBtn.dataset.name);
      if (newName && newName.trim()) callbacks.onRenameProfile(renameBtn.dataset.name, newName.trim());
    }
  });

  // Default: vCard tab
  setActiveTab('vcard');
  renderForm('vcard');
}

function setActiveTab(type) {
  document.querySelectorAll('#tab-bar [data-type]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.type === type);
  });
}

export function renderForm(recordType) {
  const container = document.getElementById('form-container');
  container.innerHTML = FORM_TEMPLATES[recordType]();
  // Set default WiFi values
  if (recordType === 'wifi') {
    const authSelect = document.getElementById('authType');
    const encSelect = document.getElementById('encType');
    if (authSelect) authSelect.value = 'WPA2-Personal';
    if (encSelect) encSelect.value = 'AES';
  }
}

export function getFormData(recordType) {
  switch (recordType) {
    case 'url':
      return { uri: val('uri') };
    case 'text':
      return { text: val('text'), lang: val('lang') || 'en' };
    case 'vcard':
      return {
        vcardMode: document.querySelector('input[name="vcardMode"]:checked')?.value || 'traditional',
        vcardCompress: document.getElementById('vcard-compress')?.checked || false,
        // Basic
        prefix: val('prefix'), firstName: val('firstName'), lastName: val('lastName'),
        org: val('org'), title: val('title'),
        phones: getLabeledRows('phones-container', 'phoneType', 'phoneValue', 'phoneLabel'),
        emails: getLabeledRows('emails-container', 'emailType', 'emailValue', 'emailLabel'),
        url: val('url'), urlLabel: val('urlLabel'),
        address: { street: val('street'), city: val('city'), state: val('state'), zip: val('zip'), country: val('country') },
        addressLabel: val('addressLabel'),
        socialProfiles: getSocialRows(),
        note: val('note'),
        // Advanced - Identification
        nickname: val('nickname'), bday: val('bday'), photo: val('photo'),
        // Advanced - Personal
        anniversary: val('anniversary'), gender: val('gender'), pronouns: val('pronouns'), lang: val('lang'),
        // Advanced - Organization
        role: val('role'), logo: val('logo'),
        // Advanced - IMPP
        impp: getImppRows(),
        // Advanced - Geographical
        geo: { lat: val('geoLat'), lon: val('geoLon') }, tz: val('tz'),
        // Advanced - Calendar
        fburl: val('fburl'), caluri: val('caluri'), caladruri: val('caladruri'),
        // Advanced - Professional
        expertise: val('expertise'), hobby: val('hobby'), interest: val('interest'), orgDirectory: val('orgDirectory'),
        // Advanced - Biographical
        birthplace: val('birthplace'), deathplace: val('deathplace'), deathdate: val('deathdate'),
        // Advanced - Other
        kind: val('kind'), categories: val('categories'), key: val('key'), sound: val('sound'),
        // Legacy
        mailer: val('mailer'), agent: val('agent'), formattedLabel: val('formattedLabel'),
        sortString: val('sortString'), classification: val('classification'),
      };
    case 'wifi':
      return {
        ssid: val('ssid'),
        password: val('password'),
        authType: val('authType'),
        encType: val('encType'),
      };
  }
}

export function setFormData(recordType, data) {
  if (!data) return;
  switch (recordType) {
    case 'url':
      setVal('uri', data.uri);
      break;
    case 'text':
      setVal('text', data.text);
      setVal('lang', data.lang);
      break;
    case 'vcard': {
      // Encoding mode
      const modeRadio = document.querySelector(`input[name="vcardMode"][value="${data.vcardMode || 'traditional'}"]`);
      if (modeRadio) modeRadio.checked = true;
      const compressEl = document.getElementById('vcard-compress');
      if (compressEl) compressEl.checked = !!data.vcardCompress;
      const compressToggle = document.querySelector('.vcard-compress-toggle');
      if (compressToggle) compressToggle.style.display = (data.vcardMode === 'traditional' || !data.vcardMode) ? 'none' : 'flex';
      // Basic
      setVal('prefix', data.prefix); setVal('firstName', data.firstName); setVal('lastName', data.lastName);
      setVal('org', data.org); setVal('title', data.title);
      setVal('url', data.url); setVal('urlLabel', data.urlLabel);
      setVal('street', data.address?.street); setVal('city', data.address?.city);
      setVal('state', data.address?.state); setVal('zip', data.address?.zip);
      setVal('country', data.address?.country); setVal('addressLabel', data.addressLabel);
      setVal('note', data.note);
      setLabeledRows('phones-container', data.phones, 'phoneType', 'phoneValue', 'phoneLabel', phoneRowHTML);
      setLabeledRows('emails-container', data.emails, 'emailType', 'emailValue', 'emailLabel', emailRowHTML);
      setSocialRows(data.socialProfiles);
      // Advanced
      setVal('nickname', data.nickname); setVal('bday', data.bday); setVal('photo', data.photo);
      setVal('anniversary', data.anniversary); setVal('gender', data.gender);
      setVal('pronouns', data.pronouns); setVal('lang', data.lang);
      setVal('role', data.role); setVal('logo', data.logo);
      setImppRows(data.impp);
      setVal('geoLat', data.geo?.lat); setVal('geoLon', data.geo?.lon); setVal('tz', data.tz);
      setVal('fburl', data.fburl); setVal('caluri', data.caluri); setVal('caladruri', data.caladruri);
      setVal('expertise', data.expertise); setVal('hobby', data.hobby);
      setVal('interest', data.interest); setVal('orgDirectory', data.orgDirectory);
      setVal('birthplace', data.birthplace); setVal('deathplace', data.deathplace); setVal('deathdate', data.deathdate);
      setVal('kind', data.kind); setVal('categories', data.categories);
      setVal('key', data.key); setVal('sound', data.sound);
      // Legacy
      setVal('mailer', data.mailer); setVal('agent', data.agent);
      setVal('formattedLabel', data.formattedLabel);
      setVal('sortString', data.sortString); setVal('classification', data.classification);
      break;
    }
    case 'wifi':
      setVal('ssid', data.ssid);
      setVal('password', data.password);
      setVal('authType', data.authType);
      setVal('encType', data.encType);
      break;
  }
}

export function updateSizeIndicator(usedBytes, totalBytes, variantName) {
  const bar = document.getElementById('size-bar-fill');
  const label = document.getElementById('size-label');
  const pct = Math.min((usedBytes / totalBytes) * 100, 100);

  bar.style.width = `${pct}%`;
  bar.className = 'size-bar-fill';
  if (pct > 100) bar.classList.add('over');
  else if (pct > 80) bar.classList.add('warn');
  else bar.classList.add('ok');

  label.textContent = `${usedBytes} / ${totalBytes} bytes (${variantName})`;
  document.getElementById('size-indicator').classList.add('visible');
}

export function hideSizeIndicator() {
  document.getElementById('size-indicator').classList.remove('visible');
}

export function showError(message) {
  const el = document.getElementById('error-display');
  el.textContent = message;
  el.classList.add('visible');
}

export function clearError() {
  const el = document.getElementById('error-display');
  el.textContent = '';
  el.classList.remove('visible');
}

export function getFileName(variantName) {
  const custom = document.getElementById('bin-name').value.trim();
  if (custom) {
    // Sanitize: keep alphanumeric, hyphens, underscores
    const safe = custom.replace(/[^a-zA-Z0-9_-]/g, '_');
    return `${safe}.bin`;
  }
  return `ntagonist-${variantName.toLowerCase()}.bin`;
}

export function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function setHexPreview(binary) {
  const el = document.getElementById('hex-content');
  if (!binary) {
    el.textContent = '';
    return;
  }

  const lines = [];
  for (let i = 0; i < binary.length; i += 16) {
    const page = Math.floor(i / 4);
    const offset = i.toString(16).padStart(4, '0').toUpperCase();
    const hexParts = [];
    let ascii = '';
    for (let j = 0; j < 16; j++) {
      if (i + j < binary.length) {
        hexParts.push(binary[i + j].toString(16).padStart(2, '0').toUpperCase());
        const ch = binary[i + j];
        ascii += (ch >= 0x20 && ch <= 0x7E) ? String.fromCharCode(ch) : '.';
      } else {
        hexParts.push('  ');
        ascii += ' ';
      }
    }
    // Group in pairs of 4 (one page = 4 bytes)
    const hex = hexParts.slice(0, 4).join(' ') + '  '
              + hexParts.slice(4, 8).join(' ') + '  '
              + hexParts.slice(8, 12).join(' ') + '  '
              + hexParts.slice(12, 16).join(' ');
    lines.push(`${offset}  ${hex}  |${ascii}|`);
  }
  el.textContent = lines.join('\n');
}

export function renderProfileList(profiles, callbacks) {
  const list = document.getElementById('profile-list');
  if (profiles.length === 0) {
    list.innerHTML = '<p class="empty-profiles">No saved profiles</p>';
    return;
  }
  list.innerHTML = profiles.map(p => `
    <div class="profile-item">
      <div class="profile-info">
        <span class="profile-name">${escapeHtml(p.name)}</span>
        <span class="profile-type">${RECORD_LABELS[p.recordType] || p.recordType}</span>
      </div>
      <div class="profile-actions">
        <button data-action="load" data-name="${escapeAttr(p.name)}" title="Load">Load</button>
        <button data-action="rename" data-name="${escapeAttr(p.name)}" title="Rename">Rename</button>
        <button data-action="delete" data-name="${escapeAttr(p.name)}" title="Delete">Del</button>
      </div>
    </div>
  `).join('');
}

export function getUidInput() {
  return document.getElementById('uid-input').value.trim();
}

export function setUidInput(value) {
  document.getElementById('uid-input').value = value || '';
}

// --- Helpers ---

function val(id) {
  const el = document.getElementById(id);
  return el ? el.value : '';
}

function setVal(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value || '';
}

function getLabeledRows(containerId, typeName, valueName, labelName) {
  const container = document.getElementById(containerId);
  if (!container) return [];
  return Array.from(container.querySelectorAll('.dynamic-row')).map(row => ({
    type: row.querySelector(`[name="${typeName}"]`)?.value || '',
    value: row.querySelector(`[name="${valueName}"]`)?.value || '',
    label: row.querySelector(`[name="${labelName}"]`)?.value || '',
  })).filter(r => r.value);
}

function setLabeledRows(containerId, items, typeName, valueName, labelName, rowFn) {
  const container = document.getElementById(containerId);
  if (!container || !items || items.length === 0) return;
  container.innerHTML = '';
  for (const item of items) {
    container.insertAdjacentHTML('beforeend', rowFn());
    const row = container.lastElementChild;
    const typeEl = row.querySelector(`[name="${typeName}"]`);
    const valueEl = row.querySelector(`[name="${valueName}"]`);
    const labelEl = row.querySelector(`[name="${labelName}"]`);
    if (typeEl) typeEl.value = item.type || typeEl.options?.[0]?.value || '';
    if (valueEl) valueEl.value = item.value || '';
    if (labelEl) labelEl.value = item.label || '';
  }
}

function getSocialRows() {
  const container = document.getElementById('social-container');
  if (!container) return [];
  return Array.from(container.querySelectorAll('.dynamic-row')).map(row => {
    const svc = row.querySelector('[name="socialService"]')?.value || '';
    const custom = row.querySelector('[name="socialCustomService"]')?.value || '';
    return {
      service: svc === 'Custom' ? (custom || 'other') : svc,
      url: row.querySelector('[name="socialUrl"]')?.value || '',
    };
  }).filter(r => r.url);
}

function setSocialRows(items) {
  const container = document.getElementById('social-container');
  if (!container || !items || items.length === 0) return;
  container.innerHTML = '';
  for (const item of items) {
    container.insertAdjacentHTML('beforeend', socialRowHTML());
    const row = container.lastElementChild;
    const svcSelect = row.querySelector('[name="socialService"]');
    const customInput = row.querySelector('[name="socialCustomService"]');
    // Check if service is a predefined option (case-insensitive match)
    const predefined = SOCIAL_SERVICES.find(s => s.toLowerCase() === (item.service || '').toLowerCase());
    if (predefined && predefined !== 'Custom') {
      svcSelect.value = predefined;
    } else {
      svcSelect.value = 'Custom';
      if (customInput) {
        customInput.value = item.service || '';
        customInput.classList.add('visible');
      }
    }
    row.querySelector('[name="socialUrl"]').value = item.url || '';
  }
}

function getImppRows() {
  const container = document.getElementById('impp-container');
  if (!container) return [];
  return Array.from(container.querySelectorAll('.dynamic-row')).map(row => ({
    scheme: row.querySelector('[name="imppScheme"]')?.value || '',
    address: row.querySelector('[name="imppAddress"]')?.value || '',
  })).filter(r => r.address);
}

function setImppRows(items) {
  const container = document.getElementById('impp-container');
  if (!container || !items || items.length === 0) return;
  container.innerHTML = '';
  for (const item of items) {
    container.insertAdjacentHTML('beforeend', imppRowHTML());
    const row = container.lastElementChild;
    row.querySelector('[name="imppScheme"]').value = item.scheme || 'xmpp';
    row.querySelector('[name="imppAddress"]').value = item.address || '';
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function escapeAttr(str) {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
