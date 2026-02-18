const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const LOCALES = {
  en: path.join(ROOT, 'locales', 'en.json'),
  ar: path.join(ROOT, 'locales', 'ar.json'),
};
const USED_ONLY = process.argv.includes('--used-only');

function isObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.git')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(js|jsx|ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

function flatten(obj, prefix = '', out = {}) {
  if (isObject(obj)) {
    for (const [key, value] of Object.entries(obj)) {
      const next = prefix ? `${prefix}.${key}` : key;
      flatten(value, next, out);
    }
    return out;
  }
  out[prefix] = obj;
  return out;
}

function extractVars(value) {
  if (typeof value !== 'string') return [];
  const vars = new Set();
  const regex = /{{\s*-?\s*([\w.]+)\s*}}/g;
  let match;
  while ((match = regex.exec(value))) vars.add(match[1]);
  return [...vars].sort();
}

function extractObjectLiteralVarKeys(argText) {
  if (typeof argText !== 'string') return [];
  const keys = new Set();

  const explicitKeyRegex = /\b([A-Za-z_$][\w$]*)\s*:/g;
  let explicit;
  while ((explicit = explicitKeyRegex.exec(argText))) keys.add(explicit[1]);

  const shorthandRegex = /\b([A-Za-z_$][\w$]*)\b(?=\s*(?:,|}))/g;
  let shorthand;
  while ((shorthand = shorthandRegex.exec(argText))) {
    const name = shorthand[1];
    if (!['true', 'false', 'null', 'undefined'].includes(name)) keys.add(name);
  }

  return [...keys].sort();
}

function extractUsageData() {
  const files = [...walk(path.join(ROOT, 'src')), ...walk(path.join(ROOT, 'app'))];
  const usedKeys = new Set();
  const objectLiteralUsages = [];

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const rel = path.relative(ROOT, file);

    const keyPatterns = [
      /\bt\(\s*(['"`])((?:\\.|(?!\1).)*?)\1/gms,
      /\bi18n\.t\(\s*(['"`])((?:\\.|(?!\1).)*?)\1/gms,
      /\bi18nKey\s*=\s*(['"`])((?:\\.|(?!\1).)*?)\1/gms,
    ];

    for (const pattern of keyPatterns) {
      let match;
      while ((match = pattern.exec(content))) {
        const key = match[2];
        if (typeof key === 'string' && key.includes('.') && !key.includes('${')) usedKeys.add(key);
      }
    }

    const objectCallPattern =
      /\b(?:t|i18n\.t)\(\s*(['"`])((?:\\.|(?!\1).)*?)\1\s*,\s*({[\s\S]*?})\s*\)/gms;
    let call;
    while ((call = objectCallPattern.exec(content))) {
      const key = call[2];
      if (typeof key !== 'string' || !key.includes('.') || key.includes('${')) continue;
      objectLiteralUsages.push({
        file: rel,
        key,
        provided: extractObjectLiteralVarKeys(call[3]),
      });
    }
  }

  return { usedKeys: [...usedKeys].sort(), objectLiteralUsages };
}

function compareVarSets(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function reportList(title, list, limit = 40) {
  if (!list.length) return;
  console.log(`\n${title} (${list.length})`);
  for (const item of list.slice(0, limit)) console.log(`- ${item}`);
  if (list.length > limit) console.log(`- ...and ${list.length - limit} more`);
}

function reportObjects(title, list, formatter, limit = 40) {
  if (!list.length) return;
  console.log(`\n${title} (${list.length})`);
  for (const item of list.slice(0, limit)) console.log(`- ${formatter(item)}`);
  if (list.length > limit) console.log(`- ...and ${list.length - limit} more`);
}

function main() {
  const localeEntries = Object.entries(LOCALES).map(([lang, filePath]) => [
    lang,
    JSON.parse(fs.readFileSync(filePath, 'utf8')),
  ]);
  const locales = Object.fromEntries(localeEntries);
  const flat = Object.fromEntries(
    Object.entries(locales).map(([lang, data]) => [lang, flatten(data)])
  );

  const { usedKeys, objectLiteralUsages } = extractUsageData();

  const missingInEn = usedKeys.filter((key) => !(key in flat.en));
  const missingInAr = usedKeys.filter((key) => !(key in flat.ar));

  const emptyInEn = Object.entries(flat.en)
    .filter(([, value]) => typeof value === 'string' && value.trim() === '')
    .map(([key]) => key);
  const emptyInAr = Object.entries(flat.ar)
    .filter(([, value]) => typeof value === 'string' && value.trim() === '')
    .map(([key]) => key);

  const usedVarMismatches = [];
  for (const key of usedKeys) {
    if (!(key in flat.en) || !(key in flat.ar)) continue;
    const enVars = extractVars(flat.en[key]);
    const arVars = extractVars(flat.ar[key]);
    if (!compareVarSets(enVars, arVars)) {
      usedVarMismatches.push({ key, enVars, arVars });
    }
  }

  const usageVarFailures = [];
  for (const usage of objectLiteralUsages) {
    if (!(usage.key in flat.en) || !(usage.key in flat.ar)) continue;
    const required = extractVars(flat.en[usage.key]);
    if (!required.length) continue;
    const missing = required.filter((variable) => !usage.provided.includes(variable));
    if (missing.length) {
      usageVarFailures.push({
        file: usage.file,
        key: usage.key,
        missing,
        provided: usage.provided,
      });
    }
  }

  const enKeys = Object.keys(flat.en);
  const arKeys = Object.keys(flat.ar);
  const onlyEn = enKeys.filter((key) => !(key in flat.ar));
  const onlyAr = arKeys.filter((key) => !(key in flat.en));

  console.log(`Used keys: ${usedKeys.length}`);
  console.log(`Locale leaf keys EN/AR: ${enKeys.length}/${arKeys.length}`);
  console.log(`Missing used keys EN/AR: ${missingInEn.length}/${missingInAr.length}`);
  console.log(`Empty values EN/AR: ${emptyInEn.length}/${emptyInAr.length}`);
  console.log(`Used-key variable mismatches: ${usedVarMismatches.length}`);
  console.log(`Object-literal interpolation failures: ${usageVarFailures.length}`);
  console.log(`Locale parity EN-only/AR-only: ${onlyEn.length}/${onlyAr.length}`);

  reportList('Missing Used Keys in EN', missingInEn);
  reportList('Missing Used Keys in AR', missingInAr);
  reportList('Empty EN Values', emptyInEn);
  reportList('Empty AR Values', emptyInAr);
  reportObjects(
    'Used-Key Variable Mismatches',
    usedVarMismatches,
    (item) => `${item.key} | EN: [${item.enVars.join(', ')}] | AR: [${item.arVars.join(', ')}]`
  );
  reportObjects(
    'Interpolation Usage Failures',
    usageVarFailures,
    (item) =>
      `${item.file} -> ${item.key} | missing: [${item.missing.join(', ')}] | provided: [${item.provided.join(', ')}]`
  );

  if (onlyEn.length || onlyAr.length) {
    reportList('EN-only keys (sample)', onlyEn, 20);
    reportList('AR-only keys (sample)', onlyAr, 20);
  }

  const failures =
    missingInEn.length +
    missingInAr.length +
    emptyInEn.length +
    emptyInAr.length +
    usedVarMismatches.length +
    usageVarFailures.length +
    (USED_ONLY ? 0 : onlyEn.length + onlyAr.length);

  if (failures > 0) {
    console.error(`\ncheck-i18n failed${USED_ONLY ? ' (used-keys mode)' : ''}.`);
    process.exit(1);
  }

  console.log('\ncheck-i18n passed.');
}

main();
