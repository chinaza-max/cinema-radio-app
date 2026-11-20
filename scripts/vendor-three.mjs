// Copies the parts of three.js the browser imports into public/vendor/three, so Vercel's CDN serves them.
import { cpSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const src = join(root, 'node_modules', 'three');
const out = join(root, 'public', 'vendor', 'three');
mkdirSync(join(out, 'build'), { recursive: true });
for (const f of readdirSync(join(src, 'build'))) if (/\.module\.js$|^three\.core\.js$/.test(f)) cpSync(join(src, 'build', f), join(out, 'build', f));
cpSync(join(src, 'examples', 'jsm'), join(out, 'examples', 'jsm'), { recursive: true });
console.log('three.js copied to public/vendor/three');
