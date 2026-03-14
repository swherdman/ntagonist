// Entry point — wires all modules together

import { encodeNdefMessage } from './ndef.js';
import { buildNtagBinary, parseUid } from './ntag.js';
import { listProfiles, loadProfile, saveProfile, renameProfile, deleteProfile } from './profiles.js';
import {
  initUI, renderForm, getFormData, setFormData,
  updateSizeIndicator, hideSizeIndicator, showError, clearError,
  setHexPreview, getFileName, triggerDownload,
  renderProfileList, getUidInput,
} from './ui.js';

let currentRecordType = 'vcard';
let manualVariant = null; // null = auto

function hasData(recordType) {
  const data = getFormData(recordType);
  switch (recordType) {
    case 'url':   return !!data.uri;
    case 'text':  return !!data.text;
    case 'vcard': return !!(data.firstName || data.lastName || data.org || data.phones.length || data.emails.length);
    case 'wifi':  return !!data.ssid;
    default:      return false;
  }
}

function getUid() {
  const raw = getUidInput();
  return raw ? parseUid(raw) : null;
}

async function livePreview() {
  clearError();
  if (!hasData(currentRecordType)) {
    hideSizeIndicator();
    setHexPreview(null);
    return;
  }

  try {
    const data = getFormData(currentRecordType);
    const ndefBytes = await encodeNdefMessage(currentRecordType, data);
    const result = buildNtagBinary(ndefBytes, manualVariant, getUid());

    if (result.error) {
      showError(result.error);
      updateSizeIndicator(result.usedBytes, result.totalBytes, result.variant);
      setHexPreview(null);
    } else {
      updateSizeIndicator(result.usedBytes, result.totalBytes, result.variant);
    }
  } catch (err) {
    showError(err.message);
    hideSizeIndicator();
  }
}

// Core generate — returns { blob, filename, result } or null on error
async function generate() {
  clearError();
  if (!hasData(currentRecordType)) {
    showError('Please fill in at least one field.');
    return null;
  }

  try {
    const data = getFormData(currentRecordType);
    const ndefBytes = await encodeNdefMessage(currentRecordType, data);
    const result = buildNtagBinary(ndefBytes, manualVariant, getUid());

    if (result.error) {
      showError(result.error);
      updateSizeIndicator(result.usedBytes, result.totalBytes, result.variant);
      setHexPreview(null);
      return null;
    }

    updateSizeIndicator(result.usedBytes, result.totalBytes, result.variant);
    setHexPreview(result.binary);

    const blob = new Blob([result.binary], { type: 'application/octet-stream' });
    const filename = getFileName(result.variant);
    return { blob, filename, result };
  } catch (err) {
    showError(err.message);
    return null;
  }
}

function refreshProfiles() {
  renderProfileList(listProfiles(), {});
}

initUI({
  onRecordTypeChange(type) {
    currentRecordType = type;
    clearError();
    setHexPreview(null);
    hideSizeIndicator();
  },

  onFormInput() {
    livePreview();
  },

  async onGenerate() {
    await generate();
  },

  async onGenerateDownload() {
    const out = await generate();
    if (out) triggerDownload(out.blob, out.filename);
  },

  async onGenerateDownloadSave() {
    const out = await generate();
    if (!out) return;
    triggerDownload(out.blob, out.filename);
    // Use the file name (without .bin) as the profile name
    const profileName = out.filename.replace(/\.bin$/, '');
    const data = getFormData(currentRecordType);
    saveProfile(profileName, currentRecordType, data);
    refreshProfiles();
  },

  onVariantChange(value) {
    manualVariant = value || null;
    livePreview();
  },

  onLoadProfile(name) {
    const profile = loadProfile(name);
    if (!profile) return;
    currentRecordType = profile.recordType;
    document.querySelectorAll('#tab-bar [data-type]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.type === currentRecordType);
    });
    renderForm(currentRecordType);
    setFormData(currentRecordType, profile.formData);
    // Set the file name input to the profile name
    document.getElementById('bin-name').value = name;
    livePreview();
  },

  onDeleteProfile(name) {
    if (confirm(`Delete profile "${name}"?`)) {
      deleteProfile(name);
      refreshProfiles();
    }
  },

  onRenameProfile(oldName, newName) {
    if (renameProfile(oldName, newName)) {
      refreshProfiles();
    } else {
      showError('Could not rename — name may already exist.');
    }
  },
});

refreshProfiles();
