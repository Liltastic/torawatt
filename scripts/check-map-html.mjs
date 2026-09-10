#!/usr/bin/env node
/**
 * mapHtml.ts icindeki WebView betigi bir template string'in icinde yasiyor,
 * bu yuzden TypeScript onu denetlemiyor. Bu script betigi cikarip
 * sozdizimi kontrolunden gecirir; bozuk JS sessizce bos harita uretiyor.
 */
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const SOURCE = 'src/map/mapHtml.ts';
const source = readFileSync(SOURCE, 'utf8');

const match = source.match(/^<script>$([\s\S]*?)^<\/script>$/m);
if (!match) {
  console.error(`✗ ${SOURCE}: <script> blogu bulunamadi`);
  process.exit(1);
}

// Template interpolasyonlarini gecerli bir JS ifadesiyle degistir.
const script = match[1].replace(/\$\{[^}]*\}/g, 'PLACEHOLDER');
const tempFile = join(tmpdir(), `tora-map-check-${process.pid}.js`);

try {
  writeFileSync(tempFile, script, 'utf8');
  execFileSync(process.execPath, ['--check', tempFile], { stdio: 'pipe' });
  console.log(`✓ ${SOURCE}: gomulu betik sozdizimi gecerli`);
} catch (error) {
  console.error(`✗ ${SOURCE}: gomulu betikte sozdizimi hatasi\n`);
  console.error(error.stderr?.toString() ?? error.message);
  process.exit(1);
} finally {
  try {
    unlinkSync(tempFile);
  } catch {
    // gecici dosya zaten yoksa sorun degil
  }
}
