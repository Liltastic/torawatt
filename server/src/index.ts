import 'dotenv/config';
// Express 4, async route handler'larin firlattigi/reddettigi hatalari
// KENDILIGINDEN yakalamiyor (bu Express 5'te geldi). Bu paket Router
// metodlarini yamalayip async hatalari otomatik olarak error middleware'e
// yonlendiriyor; her route'a ayri ayri try/catch yazmamizi gereksiz kiliyor.
// Diger tum importlardan once yuklenmesi gerekiyor.
import 'express-async-errors';

import cors from 'cors';
import express from 'express';

import { authRouter } from './routes/auth.js';
import { campaignsRouter } from './routes/campaigns.js';
import { favoritesRouter } from './routes/favorites.js';
import { historyRouter } from './routes/history.js';
import { paymentMethodsRouter } from './routes/paymentMethods.js';
import { reservationsRouter } from './routes/reservations.js';
import { stationsRouter } from './routes/stations.js';
import { supportRouter } from './routes/support.js';
import { vehiclesRouter } from './routes/vehicles.js';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'tora-watt-server' });
});

app.use('/auth', authRouter);
app.use('/stations', stationsRouter);
app.use('/campaigns', campaignsRouter);
app.use('/vehicles', vehiclesRouter);
app.use('/reservations', reservationsRouter);
app.use('/charging-history', historyRouter);
app.use('/payment-methods', paymentMethodsRouter);
app.use('/favorites', favoritesRouter);
app.use('/support', supportRouter);

app.use((_req, res) => {
  res.status(404).json({ error: 'not_found' });
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Beklenmeyen hata:', err);
  res.status(500).json({ error: 'internal_error' });
});

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  console.log(`TORA WATT API http://localhost:${port} adresinde çalışıyor`);
});
