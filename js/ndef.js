// NDEF Record Encoding — URL, Text, vCard, WiFi
// All functions return Uint8Array. No DOM access.

const encoder = new TextEncoder();

// URI prefix compression table (NFC Forum URI RTD)
const URI_PREFIXES = [
  '',                           // 0x00
  'http://www.',                // 0x01
  'https://www.',               // 0x02
  'http://',                    // 0x03
  'https://',                   // 0x04
  'tel:',                       // 0x05
  'mailto:',                    // 0x06
  'ftp://anonymous:anonymous@', // 0x07
  'ftp://ftp.',                 // 0x08
  'ftps://',                    // 0x09
  'sftp://',                    // 0x0A
  'smb://',                     // 0x0B
  'nfs://',                     // 0x0C
  'ftp://',                     // 0x0D
  'dav://',                     // 0x0E
  'news:',                      // 0x0F
  'telnet://',                  // 0x10
  'imap:',                      // 0x11
  'rtsp://',                    // 0x12
  'urn:',                       // 0x13
  'pop:',                       // 0x14
  'sip:',                       // 0x15
  'sips:',                      // 0x16
  'tftp:',                      // 0x17
  'btspp://',                   // 0x18
  'btl2cap://',                 // 0x19
  'btgoep://',                  // 0x1A
  'tcpobex://',                 // 0x1B
  'irdaobex://',                // 0x1C
  'file://',                    // 0x1D
  'urn:epc:id:',                // 0x1E
  'urn:epc:tag:',               // 0x1F
  'urn:epc:pat:',               // 0x20
  'urn:epc:raw:',               // 0x21
  'urn:epc:',                   // 0x22
  'urn:nfc:',                   // 0x23
];

// WiFi WSC attribute IDs
const WSC = {
  CREDENTIAL:      0x100E,
  AUTH_TYPE:       0x1003,
  ENCRYPT_TYPE:    0x100F,
  NETWORK_INDEX:   0x1026,
  NETWORK_KEY:     0x1027,
  SSID:            0x1045,
  MAC_ADDRESS:     0x1020,
};

// WiFi auth type values
export const WIFI_AUTH_TYPES = {
  'Open':            0x0001,
  'WPA-Personal':    0x0002,
  'WPA-Enterprise':  0x0008,
  'WPA2-Enterprise': 0x0010,
  'WPA2-Personal':   0x0020,
};

// WiFi encryption type values
export const WIFI_ENCRYPT_TYPES = {
  'None': 0x0001,
  'WEP':  0x0002,
  'TKIP': 0x0004,
  'AES':  0x0008,
};

function concat(...arrays) {
  const total = arrays.reduce((sum, a) => sum + a.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) {
    result.set(a, offset);
    offset += a.length;
  }
  return result;
}

function buildNdefRecord(tnf, type, payload, mb = true, me = true) {
  const typeBytes = typeof type === 'string' ? encoder.encode(type) : type;
  const sr = payload.length <= 255;
  const flags = (mb ? 0x80 : 0) | (me ? 0x40 : 0) | (sr ? 0x10 : 0) | (tnf & 0x07);

  const header = sr
    ? new Uint8Array([flags, typeBytes.length, payload.length])
    : new Uint8Array([
        flags, typeBytes.length,
        (payload.length >> 24) & 0xFF,
        (payload.length >> 16) & 0xFF,
        (payload.length >> 8) & 0xFF,
        payload.length & 0xFF,
      ]);

  return concat(header, typeBytes, payload);
}

export function encodeUriRecord(uri) {
  return buildNdefRecord(0x01, 'U', buildUriPayload(uri));
}

export function encodeTextRecord(text, lang = 'en') {
  const langBytes = encoder.encode(lang);
  const textBytes = encoder.encode(text);
  const statusByte = langBytes.length & 0x3F; // bit 7 = 0 (UTF-8)
  const payload = concat(new Uint8Array([statusByte]), langBytes, textBytes);
  return buildNdefRecord(0x01, 'T', payload);
}

// Apple predefined labels — emit in _$!<Label>!$_ format
const APPLE_PREDEFINED = new Set([
  'HomePage','Home','Work','Other','Mobile','Main','iPhone',
  'School','iCloud','Blog','Friend','Spouse','Child','Parent',
  'Sibling','Partner','Assistant','Manager',
]);

function formatAppleLabel(label) {
  if (APPLE_PREDEFINED.has(label)) return `_$!<${label}>!$_`;
  return label;
}

function buildVcardText(fields) {
  const lines = ['BEGIN:VCARD', 'VERSION:3.0'];
  let itemNum = 1; // Counter for X-ABLabel grouped properties

  // --- Identification (Basic) ---
  const prefix = fields.prefix || '';
  const lastName = fields.lastName || '';
  const firstName = fields.firstName || '';
  if (lastName || firstName) {
    lines.push(`N:${lastName};${firstName};;${prefix};`);
    lines.push(`FN:${[prefix, firstName, lastName].filter(Boolean).join(' ')}`);
  }

  // --- Identification (Advanced) ---
  if (fields.nickname) lines.push(`NICKNAME:${fields.nickname}`);
  if (fields.bday) lines.push(`BDAY:${fields.bday}`);
  if (fields.photo) lines.push(`PHOTO;VALUE=URI:${fields.photo}`);

  // --- Organization (Basic) ---
  if (fields.org) lines.push(`ORG:${fields.org}`);
  if (fields.title) lines.push(`TITLE:${fields.title}`);

  // --- Organization (Advanced) ---
  if (fields.role) lines.push(`ROLE:${fields.role}`);
  if (fields.logo) lines.push(`LOGO;VALUE=URI:${fields.logo}`);

  // --- Phones (Basic) — with X-ABLabel support ---
  if (fields.phones) {
    for (const phone of fields.phones) {
      if (!phone.value) continue;
      if (phone.label) {
        const p = `item${itemNum}`;
        lines.push(`${p}.TEL;TYPE=${phone.type || 'CELL'}:${phone.value}`);
        lines.push(`${p}.X-ABLabel:${formatAppleLabel(phone.label)}`);
        itemNum++;
      } else {
        lines.push(`TEL;TYPE=${phone.type || 'CELL'}:${phone.value}`);
      }
    }
  }

  // --- Emails (Basic) — with X-ABLabel support ---
  if (fields.emails) {
    for (const email of fields.emails) {
      if (!email.value) continue;
      const type = email.type || 'INTERNET';
      if (email.label) {
        const p = `item${itemNum}`;
        lines.push(`${p}.EMAIL;TYPE=${type}:${email.value}`);
        lines.push(`${p}.X-ABLabel:${formatAppleLabel(email.label)}`);
        itemNum++;
      } else {
        lines.push(`EMAIL;TYPE=${type}:${email.value}`);
      }
    }
  }

  // --- URL (Basic) — with X-ABLabel support ---
  if (fields.url) {
    if (fields.urlLabel) {
      const p = `item${itemNum}`;
      lines.push(`${p}.URL:${fields.url}`);
      lines.push(`${p}.X-ABLabel:${formatAppleLabel(fields.urlLabel)}`);
      itemNum++;
    } else {
      lines.push(`URL:${fields.url}`);
    }
  }

  // --- Address (Basic) — with X-ABLabel support ---
  if (fields.address) {
    const a = fields.address;
    if (a.street || a.city || a.state || a.zip || a.country) {
      const adr = `ADR;TYPE=WORK:;;${a.street || ''};${a.city || ''};${a.state || ''};${a.zip || ''};${a.country || ''}`;
      if (fields.addressLabel) {
        const p = `item${itemNum}`;
        lines.push(`${p}.${adr}`);
        lines.push(`${p}.X-ABLabel:${formatAppleLabel(fields.addressLabel)}`);
        itemNum++;
      } else {
        lines.push(adr);
      }
    }
  }

  // --- Social Profiles (Basic) — dual emit for compatibility ---
  if (fields.socialProfiles) {
    for (const sp of fields.socialProfiles) {
      if (!sp.url) continue;
      const svc = (sp.service || 'other').toLowerCase();
      lines.push(`SOCIALPROFILE;TYPE=${svc}:${sp.url}`);
      lines.push(`X-SOCIALPROFILE;TYPE=${svc}:${sp.url}`);
    }
  }

  // --- Note (Basic) ---
  if (fields.note) lines.push(`NOTE:${fields.note}`);

  // --- Personal (Advanced) ---
  if (fields.anniversary) lines.push(`ANNIVERSARY:${fields.anniversary}`);
  if (fields.gender) lines.push(`GENDER:${fields.gender}`);
  if (fields.pronouns) lines.push(`PRONOUNS:${fields.pronouns}`);
  if (fields.lang) lines.push(`LANG:${fields.lang}`);

  // --- IMPP (Advanced) ---
  if (fields.impp) {
    for (const im of fields.impp) {
      if (im.address) {
        const scheme = im.scheme || 'xmpp';
        lines.push(`IMPP:${scheme}:${im.address}`);
      }
    }
  }

  // --- Geographical (Advanced) ---
  if (fields.geo) {
    const g = fields.geo;
    if (g.lat && g.lon) lines.push(`GEO:${g.lat};${g.lon}`);
  }
  if (fields.tz) lines.push(`TZ:${fields.tz}`);

  // --- Calendar (Advanced) ---
  if (fields.fburl) lines.push(`FBURL:${fields.fburl}`);
  if (fields.caluri) lines.push(`CALURI:${fields.caluri}`);
  if (fields.caladruri) lines.push(`CALADRURI:${fields.caladruri}`);

  // --- Professional (Advanced) ---
  if (fields.expertise) lines.push(`EXPERTISE:${fields.expertise}`);
  if (fields.hobby) lines.push(`HOBBY:${fields.hobby}`);
  if (fields.interest) lines.push(`INTEREST:${fields.interest}`);
  if (fields.orgDirectory) lines.push(`ORG-DIRECTORY:${fields.orgDirectory}`);

  // --- Biographical (Advanced) ---
  if (fields.birthplace) lines.push(`BIRTHPLACE:${fields.birthplace}`);
  if (fields.deathplace) lines.push(`DEATHPLACE:${fields.deathplace}`);
  if (fields.deathdate) lines.push(`DEATHDATE:${fields.deathdate}`);

  // --- Other (Advanced) ---
  if (fields.kind) lines.push(`KIND:${fields.kind}`);
  if (fields.categories) lines.push(`CATEGORIES:${fields.categories}`);
  if (fields.sound) lines.push(`SOUND;VALUE=URI:${fields.sound}`);
  if (fields.key) lines.push(`KEY;TYPE=X509:${fields.key}`);

  // --- Legacy ---
  if (fields.mailer) lines.push(`MAILER:${fields.mailer}`);
  if (fields.agent) lines.push(`AGENT:${fields.agent}`);
  if (fields.formattedLabel) lines.push(`LABEL;TYPE=WORK:${fields.formattedLabel}`);
  if (fields.sortString) lines.push(`SORT-STRING:${fields.sortString}`);
  if (fields.classification) lines.push(`CLASS:${fields.classification}`);

  // --- Auto-generated metadata ---
  lines.push(`PRODID:-//ntagonist//EN`);
  lines.push(`REV:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`);
  lines.push(`UID:${crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36)}`);

  lines.push('END:VCARD');
  return lines.join('\r\n');
}

export function encodeVcardRecord(fields) {
  const vcardStr = buildVcardText(fields);
  const payload = encoder.encode(vcardStr);
  return buildNdefRecord(0x02, 'text/vcard', payload);
}

function wscTlv(typeId, value) {
  const len = value.length;
  const buf = new Uint8Array(4 + len);
  buf[0] = (typeId >> 8) & 0xFF;
  buf[1] = typeId & 0xFF;
  buf[2] = (len >> 8) & 0xFF;
  buf[3] = len & 0xFF;
  buf.set(value, 4);
  return buf;
}

function wscUint16(typeId, value) {
  return wscTlv(typeId, new Uint8Array([(value >> 8) & 0xFF, value & 0xFF]));
}

export function encodeWifiRecord(config) {
  const ssidBytes = encoder.encode(config.ssid);
  const keyBytes = encoder.encode(config.password || '');
  const authType = WIFI_AUTH_TYPES[config.authType] || 0x0020;
  const encType = WIFI_ENCRYPT_TYPES[config.encType] || 0x0008;

  // Build inner credential attributes
  const inner = concat(
    wscTlv(WSC.NETWORK_INDEX, new Uint8Array([0x01])),
    wscTlv(WSC.SSID, ssidBytes),
    wscUint16(WSC.AUTH_TYPE, authType),
    wscUint16(WSC.ENCRYPT_TYPE, encType),
    wscTlv(WSC.NETWORK_KEY, keyBytes),
    wscTlv(WSC.MAC_ADDRESS, new Uint8Array([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF])),
  );

  // Wrap in Credential TLV
  const credential = wscTlv(WSC.CREDENTIAL, inner);
  return buildNdefRecord(0x02, 'application/vnd.wfa.wsc', credential);
}

const VCF_BASE = 'https://swherdman.github.io/ntagonist/vcf/#';

function buildUriPayload(uri) {
  let bestIndex = 0;
  let bestLen = 0;
  for (let i = 1; i < URI_PREFIXES.length; i++) {
    const prefix = URI_PREFIXES[i];
    if (uri.startsWith(prefix) && prefix.length > bestLen) {
      bestIndex = i;
      bestLen = prefix.length;
    }
  }
  const remainder = encoder.encode(uri.slice(bestLen));
  return concat(new Uint8Array([bestIndex]), remainder);
}

export function encodeNdefMessage(recordType, data) {
  switch (recordType) {
    case 'url':   return encodeUriRecord(data.uri);
    case 'text':  return encodeTextRecord(data.text, data.lang);
    case 'vcard': {
      const mode = data.vcardMode || 'traditional';
      const vcardText = buildVcardText(data);

      if (mode === 'traditional') {
        return buildNdefRecord(0x02, 'text/vcard', encoder.encode(vcardText));
      }

      const vcardUrl = VCF_BASE + btoa(vcardText);

      if (mode === 'url') {
        return buildNdefRecord(0x01, 'U', buildUriPayload(vcardUrl));
      }

      // mode === 'both': vCard MIME record + URL record
      const rec1 = buildNdefRecord(0x02, 'text/vcard', encoder.encode(vcardText), true, false);
      const rec2 = buildNdefRecord(0x01, 'U', buildUriPayload(vcardUrl), false, true);
      return concat(rec1, rec2);
    }
    case 'wifi':  return encodeWifiRecord(data);
    default: throw new Error(`Unknown record type: ${recordType}`);
  }
}
