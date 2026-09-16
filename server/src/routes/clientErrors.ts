import { Router, type Request } from 'express';
import { z } from 'zod';

/**
 * Mobil uygulamanin hata kaydi (bkz. mobil tarafta src/services/errorLog.ts).
 *
 * Kayitlar veritabanina degil sunucu loguna yaziliyor: Render panelinde Logs
 * sekmesinde "[client-error]" ile aranir. Sema degisikligi ve migration
 * gerektirmiyor.
 *
 * Kimlik dogrulama istemiyor: hata giris ekraninda, oturum yokken de
 * olusabiliyor. Karsiliginda istemci basina ve toplamda bir hiz siniri var;
 * herkese acik bir uc loglari doldurmak icin kullanilamasin.
 */
export const clientErrorsRouter = Router();

const WINDOW_MS = 10 * 60_000;
/** Tek bir istemcinin pencere basina yazdirabilecegi kayit. */
const MAX_REPORTS_PER_CLIENT = 60;
/** Butun istemcilerin toplami; adres degistirerek siniri asmanin da bir tavani olsun. */
const MAX_REPORTS_TOTAL = 600;

let windowStartedAt = Date.now();
let reportsInWindow = 0;
const reportsPerClient = new Map<string, number>();

function clientKey(req: Request): string {
  // Render istegi kendi vekil sunucusu uzerinden iletiyor; istemcinin adresi bu baslikta.
  const forwarded = req.headers['x-forwarded-for'];
  const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0]?.trim();
  return first || req.socket.remoteAddress || 'unknown';
}

function admit(key: string, count: number): boolean {
  const now = Date.now();
  if (now - windowStartedAt >= WINDOW_MS) {
    windowStartedAt = now;
    reportsInWindow = 0;
    reportsPerClient.clear();
  }

  const used = reportsPerClient.get(key) ?? 0;
  if (used + count > MAX_REPORTS_PER_CLIENT || reportsInWindow + count > MAX_REPORTS_TOTAL) {
    return false;
  }
  reportsPerClient.set(key, used + count);
  reportsInWindow += count;
  return true;
}

// Sinirlar istemcinin kirptigi uzunluklarin ustunde: gecerli bir kayit
// reddedilmesin, yalnizca anormal buyuk govdeler.
const text = (max: number) => z.string().max(max);

const reportSchema = z.object({
  source: z.enum(['js', 'render', 'promise', 'map']),
  fatal: z.boolean(),
  message: text(1000),
  stack: text(8000).optional(),
  componentStack: text(4000).optional(),
  route: text(300).optional(),
  userId: text(100).optional(),
  context: z.record(z.union([text(400), z.number(), z.boolean()])).optional(),
  occurredAt: text(40),
});

const bodySchema = z.object({
  client: z.object({
    platform: text(60),
    device: text(100).optional(),
    appVersion: text(40).optional(),
    updateId: text(80).optional(),
    channel: text(80).optional(),
    runtime: text(40).optional(),
  }),
  reports: z.array(reportSchema).min(1).max(10),
});

type Client = z.infer<typeof bodySchema>['client'];
type Report = z.infer<typeof reportSchema>;

/**
 * Istemciden gelen her satir girintili basiliyor: mesajin icine gomulmus bir
 * satir sonu, logda sahte bir "[client-error]" kaydi baslatamasin.
 */
function indent(value: string, prefix: string): string {
  return value
    .split(/\r?\n/)
    .map((line) => prefix + line)
    .join('\n');
}

function format(client: Client, report: Report): string {
  const header = [
    report.fatal ? 'OLUMCUL' : 'hata',
    report.source,
    client.platform,
    client.device,
    client.updateId ? `guncelleme ${client.updateId.slice(0, 8)}` : undefined,
    client.channel,
    client.runtime,
  ]
    .filter(Boolean)
    .join(' · ');

  const lines = [
    `[client-error] ${header}`,
    indent(
      `ekran ${report.route ?? '?'} · kullanici ${report.userId ?? '-'} · ${report.occurredAt}`,
      '  ',
    ),
    indent(report.message, '  '),
  ];

  if (report.context && Object.keys(report.context).length > 0) {
    const pairs = Object.entries(report.context).map(([key, value]) => `${key}=${String(value)}`);
    lines.push(indent(`baglam: ${pairs.join(' ')}`, '  '));
  }
  if (report.stack) lines.push('  stack:', indent(report.stack, '    '));
  if (report.componentStack) lines.push('  bilesen:', indent(report.componentStack, '    '));

  return lines.join('\n');
}

clientErrorsRouter.post('/', (req, res) => {
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid_body' });
    return;
  }

  const { client, reports } = parsed.data;
  if (!admit(clientKey(req), reports.length)) {
    res.status(429).json({ error: 'rate_limited' });
    return;
  }

  for (const report of reports) {
    console.error(format(client, report));
  }
  res.status(204).end();
});
