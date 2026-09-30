import { useState, type FormEvent } from 'react';

import { api } from '../lib/api';
import { useSession } from '../lib/session';
import { IconBolt } from '../components/icons';

export function Login() {
  const { signIn } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(undefined);
    setBusy(true);
    try {
      signIn(await api.login(email, password));
    } catch (err) {
      // Hangi alanin yanlis oldugu SOYLENMIYOR: "bu e-posta kayitli" bilgisi
      // deneyerek hesap arayan birine yardim eder.
      setError(err instanceof Error ? err.message : 'Giriş yapılamadı');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="app">
      <div className="login">
        <form className="login__card" onSubmit={submit}>
          <div className="login__brand">
            <span className="rail__fab" style={{ width: 38, height: 38 }}>
              <IconBolt size={18} />
            </span>
            <div>
              <div className="login__title">TORA WATT Yönetim</div>
              <div className="login__sub">Şarj ağı yönetim paneli</div>
            </div>
          </div>

          {error && <div className="error">{error}</div>}

          <div className="field">
            <label htmlFor="email">E-posta</label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="password">Parola</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>

          <button className="btn" type="submit" disabled={busy}>
            {busy ? 'Kontrol ediliyor...' : 'Giriş yap'}
          </button>
        </form>
      </div>
    </div>
  );
}
