// Derleme sonrasi .gitkeep'i geri koyar.
//
// Vite emptyOutDir ile cikti klasorunu her derlemede siliyor; icindeki
// .gitkeep de gidiyor. O dosya depoda duruyor cunku go:embed bos bir klasoru
// gomemiyor - silinince taze bir klonda "go build" patliyor.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const keep = resolve(here, '../../backend/internal/web/dist/.gitkeep');

mkdirSync(dirname(keep), { recursive: true });
writeFileSync(keep, '');
