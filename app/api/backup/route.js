import { supabaseServer } from '../../../lib/supabase';
import zlib from 'zlib';
import { hojeISO } from '../../../lib/dominio/datas';

const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function zipFiles(files) {
  const chunks = [];
  const central = [];
  let offset = 0;
  const enc = (s) => Buffer.from(s, 'utf8');
  for (const f of files) {
    const nameBuf = enc(f.name);
    const data = f.data;
    const crc = crc32(data);
    const comp = zlib.deflateRawSync(data);
    const method = comp.length < data.length ? 8 : 0;
    const payload = method === 8 ? comp : data;
    const lfh = Buffer.alloc(30);
    lfh.writeUInt32LE(0x04034b50, 0); lfh.writeUInt16LE(20, 4); lfh.writeUInt16LE(0, 6);
    lfh.writeUInt16LE(method, 8); lfh.writeUInt16LE(0, 10); lfh.writeUInt16LE(0, 12);
    lfh.writeUInt32LE(crc, 14); lfh.writeUInt32LE(payload.length, 18); lfh.writeUInt32LE(data.length, 22);
    lfh.writeUInt16LE(nameBuf.length, 26); lfh.writeUInt16LE(0, 28);
    chunks.push(lfh, nameBuf, payload);
    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0); cd.writeUInt16LE(20, 4); cd.writeUInt16LE(20, 6);
    cd.writeUInt16LE(0, 8); cd.writeUInt16LE(method, 10); cd.writeUInt16LE(0, 12); cd.writeUInt16LE(0, 14);
    cd.writeUInt32LE(crc, 16); cd.writeUInt32LE(payload.length, 20); cd.writeUInt32LE(data.length, 24);
    cd.writeUInt16LE(nameBuf.length, 28); cd.writeUInt16LE(0, 30); cd.writeUInt16LE(0, 32);
    cd.writeUInt16LE(0, 34); cd.writeUInt16LE(0, 36); cd.writeUInt32LE(0, 38); cd.writeUInt32LE(offset, 42);
    central.push(Buffer.concat([cd, nameBuf]));
    offset += lfh.length + nameBuf.length + payload.length;
  }
  const centralBuf = Buffer.concat(central);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); eocd.writeUInt16LE(0, 4); eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(files.length, 8); eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(centralBuf.length, 12); eocd.writeUInt32LE(offset, 16); eocd.writeUInt16LE(0, 20);
  return Buffer.concat([...chunks, centralBuf, eocd]);
}

function toCSV(rows) {
  if (!rows || !rows.length) return '';
  const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const esc = (v) => {
    if (v === null || v === undefined) return '';
    if (typeof v === 'object') v = JSON.stringify(v);
    v = String(v);
    return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  };
  const linhas = [cols.join(',')];
  for (const r of rows) linhas.push(cols.map((c) => esc(r[c])).join(','));
  return linhas.join('\n');
}

const TABELAS = [
  'assets', 'asset_classes', 'trades', 'dividends', 'dividends_pending', 'prices',
  'manual_holdings', 'cards', 'card_purchases', 'invoice_payments', 'installment_overrides',
  'portfolio_snapshots', 'cashbook', 'recurring_bills', 'goal_config', 'fluxo_mensal',
];

export async function GET() {
  const sb = supabaseServer();
  const files = [];
  const erros = [];
  for (const t of TABELAS) {
    const { data, error } = await sb.from(t).select('*');
    if (error) { erros.push(`${t}: ${error.message}`); continue; }
    files.push({ name: `${t}.csv`, data: Buffer.from(toCSV(data || []), 'utf8') });
  }
  // um resumo do backup
  const resumo = `Hub Financeiro — backup ${new Date().toISOString()}\n\n` +
    files.map((f) => `${f.name}`).join('\n') +
    (erros.length ? `\n\nErros:\n${erros.join('\n')}` : '');
  files.push({ name: 'LEIA-ME.txt', data: Buffer.from(resumo, 'utf8') });

  const zip = zipFiles(files);
  const nome = `hub-backup-${hojeISO()}.zip`;
  return new Response(zip, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${nome}"`,
      'Cache-Control': 'no-store',
    },
  });
}
