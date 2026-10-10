import ts from 'typescript'
import fs from 'node:fs'
import path from 'node:path'
const entries = new Map()
function scan(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const filename = path.join(dir, entry.name)
    if (entry.isDirectory()) { if (!['community', 'i18n'].includes(entry.name)) scan(filename); continue }
    if (!filename.endsWith('.tsx')) continue
    const source = fs.readFileSync(filename, 'utf8')
    const ast = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    function visit(node) {
      let value
      if (ts.isJsxText(node)) value = node.text.trim().replace(/\s+/g, ' ')
      else if (ts.isStringLiteral(node)) {
        const p = node.parent
        let ancestor = p
        while (ancestor && !ts.isJsxExpression(ancestor) && !ts.isStatement(ancestor)) ancestor = ancestor.parent
        if (ancestor && ts.isJsxExpression(ancestor) && !ts.isBinaryExpression(p) && !ts.isJsxAttribute(p) && !ts.isCallExpression(p) && /\s|[\u0D80-\u0DFF]/.test(node.text) && !/^[\s\w\-:/%\[\].#]+$/.test(node.text)) value = node.text
        if (ts.isJsxAttribute(p) && ['label', 'title', 'placeholder', 'aria-label', 'alt', 'description', 'labelEn', 'labelSi', 'confirmText', 'cancelText', 'text', 'message', 'confirmLabel', 'hint'].includes(p.name.getText(ast))) value = node.text
        else if (ts.isCallExpression(p) && /^(toast\.(error|success)|setError|new Error)$/.test(p.expression.getText(ast))) value = node.text
        else if (ts.isPropertyAssignment(p) && ['label', 'title', 'description', 'detail', 'cta', 'text', 'hint', 'labelEn', 'labelSi', 'nameEn', 'nameSi'].includes(p.name.getText(ast))) value = node.text
      }
      if (value && /[a-zA-Z\u0D80-\u0DFF]/.test(value) && value !== 'PaddyGuard AI') entries.set(value, [...(entries.get(value) || []), filename])
      ts.forEachChild(node, visit)
    }
    visit(ast)
  }
}
scan('src/pages'); scan('src/components')
const existing = JSON.parse(fs.readFileSync('scripts/ui-inventory.json', 'utf8'))
fs.writeFileSync('scripts/ui-inventory.json', JSON.stringify([...new Set([...existing, ...entries.keys()])], null, 2))
console.log(entries.size)
