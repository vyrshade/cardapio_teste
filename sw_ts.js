import { readFileSync, writeFileSync } from 'fs';

const timestamp = Date.now();
const src = './public/sw.js';
const dest = './dist/sw.js';

let content = readFileSync(src, 'utf-8');
content = content.replace('{{BUILD_ID}}', timestamp);

writeFileSync(dest, content);
