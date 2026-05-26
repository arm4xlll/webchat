const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk(srcDir);
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;
  
  const replacements = [
    { from: /bg-\[var\(--tg-(.*?)\)\]/g, to: 'bg-tg-$1' },
    { from: /text-\[var\(--tg-(.*?)\)\]/g, to: 'text-tg-$1' },
    { from: /border-\[var\(--tg-(.*?)\)\]/g, to: 'border-tg-$1' },
    { from: /hover:bg-\[var\(--tg-(.*?)\)\]/g, to: 'hover:bg-tg-$1' },
    { from: /focus:border-\[var\(--tg-(.*?)\)\]/g, to: 'focus:border-tg-$1' },
    { from: /placeholder-\[var\(--tg-(.*?)\)\]/g, to: 'placeholder-tg-$1' },
  ];

  replacements.forEach(r => {
    if (content.match(r.from)) {
      content = content.replace(r.from, r.to);
      changed = true;
    }
  });

  if (changed) {
    fs.writeFileSync(file, content);
    console.log('Updated', file);
  }
});
