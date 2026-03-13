// NTAG Memory Image Builder (213/215/216)
// Assembles complete .bin files from NDEF message bytes.

export const NTAG_VARIANTS = {
  NTAG213: { name: 'NTAG213', pages: 45,  totalBytes: 180, userBytes: 144, ccSize: 0x12 },
  NTAG215: { name: 'NTAG215', pages: 135, totalBytes: 540, userBytes: 504, ccSize: 0x3E },
  NTAG216: { name: 'NTAG216', pages: 231, totalBytes: 924, userBytes: 888, ccSize: 0x6D },
};

const VARIANT_ORDER = [NTAG_VARIANTS.NTAG213, NTAG_VARIANTS.NTAG215, NTAG_VARIANTS.NTAG216];

const DEFAULT_UID = [0x04, 0xAB, 0xCD, 0xEF, 0x12, 0x34, 0x56];

function encodeTlvLength(length) {
  if (length <= 0xFE) {
    return new Uint8Array([length]);
  }
  return new Uint8Array([0xFF, (length >> 8) & 0xFF, length & 0xFF]);
}

function tlvOverhead(ndefLen) {
  // type byte (0x03) + length encoding + terminator (0xFE)
  return 1 + (ndefLen <= 0xFE ? 1 : 3) + 1;
}

export function autoSelectVariant(ndefMessageBytes) {
  const totalNeeded = ndefMessageBytes.length + tlvOverhead(ndefMessageBytes.length);
  for (const variant of VARIANT_ORDER) {
    if (totalNeeded <= variant.userBytes) {
      return { variant, fits: true };
    }
  }
  return { variant: NTAG_VARIANTS.NTAG216, fits: false };
}

export function parseUid(uidStr) {
  if (!uidStr || !uidStr.trim()) return null;
  const cleaned = uidStr.replace(/[:\s-]/g, '');
  if (!/^[0-9a-fA-F]{14}$/.test(cleaned)) return null;
  const bytes = [];
  for (let i = 0; i < 14; i += 2) {
    bytes.push(parseInt(cleaned.slice(i, i + 2), 16));
  }
  return bytes;
}

export function buildNtagBinary(ndefMessageBytes, variantKey = null, uid = null) {
  const uidBytes = uid || DEFAULT_UID;

  // Select variant
  let variant;
  if (variantKey && NTAG_VARIANTS[variantKey]) {
    variant = NTAG_VARIANTS[variantKey];
  } else {
    const result = autoSelectVariant(ndefMessageBytes);
    variant = result.variant;
  }

  // Check if data fits
  const totalTlvSize = ndefMessageBytes.length + tlvOverhead(ndefMessageBytes.length);
  if (totalTlvSize > variant.userBytes) {
    return {
      binary: null,
      variant: variant.name,
      usedBytes: totalTlvSize,
      totalBytes: variant.userBytes,
      error: `Data too large for ${variant.name}: need ${totalTlvSize} bytes, have ${variant.userBytes} bytes available.`,
    };
  }

  // Allocate full memory image
  const bin = new Uint8Array(variant.totalBytes);

  // Pages 0-1: UID bytes
  // Page 0: SN0, SN1, SN2, BCC0
  bin[0] = uidBytes[0]; // SN0
  bin[1] = uidBytes[1]; // SN1
  bin[2] = uidBytes[2]; // SN2
  bin[3] = 0x88 ^ uidBytes[0] ^ uidBytes[1] ^ uidBytes[2]; // BCC0 (CT=0x88)

  // Page 1: SN3, SN4, SN5, SN6
  bin[4] = uidBytes[3];
  bin[5] = uidBytes[4];
  bin[6] = uidBytes[5];
  bin[7] = uidBytes[6];

  // Page 2: BCC1, Internal, Lock0, Lock1
  bin[8] = uidBytes[3] ^ uidBytes[4] ^ uidBytes[5] ^ uidBytes[6]; // BCC1
  bin[9] = 0x48; // Internal
  bin[10] = 0x00; // Lock byte 0
  bin[11] = 0x00; // Lock byte 1

  // Page 3: Capability Container
  bin[12] = 0xE1; // NDEF magic
  bin[13] = 0x10; // Version 1.0
  bin[14] = variant.ccSize;
  bin[15] = 0x00; // Read/write access

  // Page 4+: NDEF TLV
  let offset = 16;
  bin[offset++] = 0x03; // NDEF Message TLV type

  const lenBytes = encodeTlvLength(ndefMessageBytes.length);
  bin.set(lenBytes, offset);
  offset += lenBytes.length;

  bin.set(ndefMessageBytes, offset);
  offset += ndefMessageBytes.length;

  bin[offset] = 0xFE; // Terminator TLV

  return {
    binary: bin,
    variant: variant.name,
    usedBytes: totalTlvSize,
    totalBytes: variant.userBytes,
    error: null,
  };
}
