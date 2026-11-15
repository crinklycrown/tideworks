import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

// GitHub Pages: das Spiel liegt unter https://crinklycrown.github.io/tideworks/
const BASE = '/tideworks/';
const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const ASSET_PREFIX = `(?:\\./|${escRe(BASE)})`;   // Asset-Pfade im gebauten HTML: ./… oder /tideworks/…

// dist/ soll auch per Doppelklick (file://) laufen: relative Pfade, ein klassisches Skript
// (kein type="module", kein crossorigin) und der Worker als eingebettetes Skript.
function fileProtocolFriendly() {
  return {
    name: 'file-protocol-friendly',
    apply: 'build',
    enforce: 'post',
    transformIndexHtml(html) {
      return html
        .replace(/<script type="module" crossorigin (src="[^"]+")><\/script>/g, '<script defer $1></script>')
        .replace(/ crossorigin(?=[ >])/g, '');
    }
  };
}

// Zusätzlich dist/tideworks.html: dieselbe Seite als eine einzige Datei (Skript und CSS eingebettet, Worker steckt schon im Skript).
// Das Skript steht am Ende von <body>, weil ein eingebettetes Skript kein defer kennt.
function singleFile() {
  return {
    name: 'single-file',
    apply: 'build',
    enforce: 'post',
    generateBundle(opts, bundle) {
      const page = bundle['index.html'];
      if (!page) return;
      let html = String(page.source);
      const scripts = [];
      html = html.replace(new RegExp(`\\s*<script defer src="${ASSET_PREFIX}([^"]+)"><\\/script>`, 'g'), (all, file) => {
        const c = bundle[file];
        if (!c) return all;
        scripts.push(String(c.code).replace(/<\/script/gi, '<\\/script'));
        return '';
      });
      html = html.replace(new RegExp(`<link rel="stylesheet" href="${ASSET_PREFIX}([^"]+)">`, 'g'), (all, file) => {
        const a = bundle[file];
        return a ? `<style>\n${String(a.source).replace(/<\/style/gi, '<\\/style')}\n</style>` : all;
      });
      html = html.replace('</body>', () => scripts.map(js => `<script>\n${js}\n</script>\n`).join('') + '</body>');   // Funktion: kein $-Ersetzen im Code
      this.emitFile({ type: 'asset', fileName: 'tideworks.html', source: html });
    }
  };
}

export default defineConfig({
  base: BASE,
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  build: {
    target: 'es2020',
    modulePreload: false,
    cssCodeSplit: false,
    rollupOptions: { output: { format: 'iife' } }
  },
  worker: { format: 'iife' },
  plugins: [fileProtocolFriendly(), singleFile()]
});
