import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import ts from 'typescript'
const pairs = JSON.parse(fs.readFileSync('src/i18n/ui-pairs.json', 'utf8'))
Object.assign(pairs, JSON.parse(fs.readFileSync('src/i18n/research-pairs.json', 'utf8')))
Object.assign(pairs, JSON.parse(fs.readFileSync('src/i18n/extra-pairs.json', 'utf8')))
const leafSource = fs.readFileSync('src/lib/leafTranslations.ts', 'utf8').replace('export const leafTranslations', 'const leafTranslations')
const leaf = new Function(`${ts.transpile(leafSource)}; return leafTranslations`)()
for (const key of Object.keys(leaf.en)) pairs[leaf.en[key]] ??= leaf.si[key]
const reverse = Object.fromEntries(Object.entries(pairs).map(([en, si]) => [si, en]))
const aliases = {
 'ආයුබෝවන්': 'Welcome', 'ආයුබෝවන්!': 'Hello!', 'ශ්‍රව්‍ය ගොනුවක් ඇතුළු කරන්න': 'Upload an audio file', 'හඳුනාගත නොහැකි විය': 'Could not identify', '· පටිගත වෙමින්': 'Recording', 'විශ්ලේෂණය කරමින්...': 'Analysing...', 'ඔබේ පිළිතුර එනතුරු බලා සිටී': 'Waiting for your answer below', 'සිංහල හඬ සහ AI තාක්ෂණයෙන් ඔබේ වී වගාව සුරකිමු': 'Protect your rice crop with Sinhala voice and AI', 'ඔබේ වගාව සඳහා ප්‍රතිකාර උපදෙස් ලබාගන්න.': 'Get treatment guidance for your crop.', 'වගාවට හානි කරන කෘමීන් හඳුනාගන්න.': 'Identify pests that damage your crop.', 'දිස්ත්‍රික්කය හඳුනාගෙන දැඩි කාලගුණ තත්ත්ව ගැන දැනුම් දෙන්නද?': 'Enable weather alerts for your district?', 'අඩු විශ්වාසනීයත්වයක් (': 'Low confidence (', ') — තවත් විස්තර අවශ්‍යයි': ') — more details are needed', 'ඉතිහාසය මකන්නද? | Clear all': 'Clear all', 'දැන් නෙමේ | Skip': 'Skip', 'නතර කරන්න | Stop &amp; Analyse': 'Stop & Analyse',
}
const inventory = [...new Set([...JSON.parse(fs.readFileSync('scripts/ui-inventory.json', 'utf8')), ...Object.keys(pairs), ...Object.keys(reverse)])]
const uiEn = {}, uiSi = {}, sourceKeys = {}, missing = []
function decode(s) { return s.replace(/&amp;/g, '&').replace(/&rarr;/g, '→').replace(/&lt;/g, '<').replace(/&gt;/g, '>') }
for (const original of inventory) {
  const raw = decode(original)
  let en = aliases[original] || reverse[raw] || raw
  let si = pairs[en]
  if (!si && /[\u0D80-\u0DFF]/.test(raw) && raw.includes('|')) {
    const pieces = raw.split('|').map(s => s.trim())
    en = pieces.find(s => !/[\u0D80-\u0DFF]/.test(s)) || raw
    si = pieces.find(s => /[\u0D80-\u0DFF]/.test(s))
  }
  if (!si && /[\u0D80-\u0DFF]/.test(raw) && en !== raw) si = raw
  if (!si) { missing.push(raw); continue }
  const key = en.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 50) + '_' + crypto.createHash('sha256').update(en).digest('hex').slice(0, 6)
  uiEn[key] = en; uiSi[key] = si; sourceKeys[raw] = key; sourceKeys[original] = key
}
fs.writeFileSync('src/i18n/ui.ts', `// Static UI dictionaries. API values and user content remain unchanged.\nexport const uiEn = ${JSON.stringify(uiEn, null, 2)}\nexport const uiSi = ${JSON.stringify(uiSi, null, 2)}\nexport const sourceKeys: Record<string, string> = ${JSON.stringify(sourceKeys, null, 2)}\n`)
fs.writeFileSync('scripts/untranslated-ui.json', JSON.stringify(missing, null, 2))
function scan(dir) {
 for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
  const filename = path.join(dir, entry.name)
  if (entry.isDirectory()) { if (entry.name !== 'community') scan(filename); continue }
  if (!filename.endsWith('.tsx')) continue
  const source = fs.readFileSync(filename, 'utf8')
  const ast = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const edits = []
  const replace = (node, value) => edits.push({ start: node.getStart(ast), end: node.end, value })
  function visit(node) {
   if (ts.isJsxText(node)) {
    const raw = node.text.trim().replace(/\s+/g, ' ')
    if (sourceKeys[raw]) replace(node, `{uiText(${JSON.stringify(decode(raw))})}`)
   } else if (ts.isStringLiteral(node) && sourceKeys[node.text]) {
    const p = node.parent
    if (ts.isCallExpression(p) && p.expression.getText(ast) === 'uiText') return
    if (ts.isJsxAttribute(p) && ['label', 'title', 'placeholder', 'aria-label', 'alt', 'description', 'labelEn', 'labelSi', 'confirmText', 'cancelText', 'text', 'message', 'confirmLabel', 'hint'].includes(p.name.getText(ast))) replace(node, `{uiText(${JSON.stringify(node.text)})}`)
    else if (ts.isCallExpression(p) && /^(toast\.(error|success)|setError|getErrorMessage|errorMessage)$/.test(p.expression.getText(ast))) replace(node, `uiText(${JSON.stringify(node.text)})`)
    else if (!ts.isJsxAttribute(p) && !ts.isCallExpression(p)) {
     let ancestor = p
     while (ancestor && !ts.isJsxExpression(ancestor) && !ts.isStatement(ancestor)) ancestor = ancestor.parent
     if (ancestor && ts.isJsxExpression(ancestor) && (/[\u0D80-\u0DFF]|\s/.test(node.text) || Object.hasOwn(pairs, node.text)) && !ts.isBinaryExpression(p)) replace(node, `uiText(${JSON.stringify(node.text)})`)
    }
   } else if (ts.isJsxExpression(node) && node.expression && ts.isPropertyAccessExpression(node.expression) && ['label', 'title', 'description', 'detail', 'cta'].includes(node.expression.name.text)) {
    const text = node.expression.getText(ast)
    if (!text.startsWith('t.')) replace(node.expression, `uiText(${text})`)
   }
   ts.forEachChild(node, visit)
  }
  visit(ast)
  if (!edits.length) continue
  edits.sort((a,b) => b.start - a.start)
  let updated = source
  for (const edit of edits) updated = updated.slice(0, edit.start) + edit.value + updated.slice(edit.end)
  if (!source.includes("import { uiText }")) updated = `import { uiText } from '@/i18n/text'\n` + updated
  fs.writeFileSync(filename, updated)
 }
}
scan('src/pages'); scan('src/components')
console.log(`${Object.keys(sourceKeys).length} translated strings; ${missing.length} remaining.`)
