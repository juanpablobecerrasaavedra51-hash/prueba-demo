/* ============================================================================
   core/cloud — Cuenta y base de datos en la nube (Postgres + auth, sin backend)

   Opcional. Sin configurar, la app guarda en localStorage como siempre.
   Configurada, el progreso se guarda además en una base de datos Postgres
   (Supabase) y se sincroniza entre web, escritorio y Android.

   Reglas:
   - El estado local se escribe siempre primero: la app nunca depende de la red.
   - Gana el cambio más reciente (por marca de tiempo) y se avisa al aplicar
     el de otro dispositivo.
   - La clave que se usa aquí es la pública (anon); la seguridad la pone
     Row Level Security: cada usuario sólo puede leer y escribir su fila.
   ============================================================================ */
(function (A) {
  'use strict';


  /* ------------------------------- Constantes ------------------------------ */
  const CFG_KEY = 'seraph-augeo-cloud-config';
  const SESSION_KEY = 'seraph-augeo-cloud-session';
  const META_KEY = 'seraph-augeo-cloud-meta';
  const TABLE = '/rest/v1/saves';
  const APP = 'seraph-augeo-v3';
  const DEBOUNCE_MS = 1500;

  const C = {
    configured: false,
    url: '',
    key: '',
    session: null,
    status: 'off',       /* off | out | syncing | on | error */
    error: '',
    busy: false,
  };

  let applying = false;   /* evita que aplicar el remoto dispare otra subida */
  let timer = null;


  /* ------------------------------- Almacenaje ------------------------------ */
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* modo privado */ } }
  function del(k) { try { localStorage.removeItem(k); } catch (e) { /* modo privado */ } }

  function readJson(k, fallback) {
    try {
      const raw = get(k);
      if (!raw) return fallback;
      const p = JSON.parse(raw);
      return p && typeof p === 'object' ? p : fallback;
    } catch (e) { return fallback; }
  }

  function readMeta() { return readJson(META_KEY, { rev: 0, dirty: false, editedAt: 0, lastSync: 0 }); }
  function writeMeta(m) { set(META_KEY, JSON.stringify(m)); }

  function normalizeUrl(u) {
    return String(u || '').trim().replace(/\/+$/, '');
  }


  /* --------------------------------- Red ---------------------------------- */
  function apiHeaders(extra) {
    const h = Object.assign({ apikey: C.key, 'Content-Type': 'application/json' }, extra || {});
    if (C.session && C.session.access_token) h.Authorization = 'Bearer ' + C.session.access_token;
    return h;
  }

  async function http(path, opts) {
    const o = opts || {};
    const init = { method: o.method || 'GET', headers: apiHeaders(o.headers) };
    if (o.body !== undefined) init.body = JSON.stringify(o.body);
    const res = await fetch(C.url + path, init);
    const text = await res.text();
    let data = null;
    if (text) { try { data = JSON.parse(text); } catch (e) { data = text; } }
    return { ok: res.ok, status: res.status, data };
  }

  function apiError(r) {
    const d = r.data;
    const msg = d && (d.msg || d.message || d.error_description || d.error);
    return msg ? String(msg) : 'La base de datos respondió ' + r.status + '.';
  }

  async function refreshToken() {
    if (!C.session || !C.session.refresh_token) return false;
    const r = await http('/auth/v1/token?grant_type=refresh_token', {
      method: 'POST',
      body: { refresh_token: C.session.refresh_token },
    });
    if (!r.ok || !r.data || !r.data.access_token) return false;
    adoptSession(r.data);
    return true;
  }

  /* Todas las llamadas autenticadas pasan por aquí: si el token caducó, se
     renueva una vez y se reintenta. */
  async function api(path, opts) {
    if (!C.session) throw new Error('Sin sesión.');
    const expired = C.session.expires_at && Date.now() > C.session.expires_at - 30000;
    if (expired) await refreshToken();
    let r = await http(path, opts);
    if (r.status === 401) {
      if (await refreshToken()) r = await http(path, opts);
      else { clearSession(); throw new Error('La sesión caducó. Vuelve a entrar.'); }
    }
    if (!r.ok) throw new Error(apiError(r));
    return r.data;
  }


  /* -------------------------------- Sesión -------------------------------- */
  function adoptSession(d) {
    if (!d || !d.access_token || !d.user) return;
    C.session = {
      access_token: d.access_token,
      refresh_token: d.refresh_token || (C.session && C.session.refresh_token) || '',
      expires_at: Date.now() + (Number(d.expires_in) || 3600) * 1000,
      email: d.user.email || '',
      user_id: d.user.id,
      since: (C.session && C.session.since) || Date.now(),
    };
    set(SESSION_KEY, JSON.stringify(C.session));
    if (C.status !== 'syncing') setStatus('on');
  }

  function clearSession() {
    C.session = null;
    del(SESSION_KEY);
    setStatus(C.configured ? 'out' : 'off');
  }

  function setStatus(s, err) {
    C.status = s;
    C.error = err || '';
  }


  /* ------------------------------ Configuración ---------------------------- */
  function loadConfig() {
    const cfg = readJson(CFG_KEY, null);
    C.configured = !!(cfg && cfg.url && cfg.key);
    C.url = C.configured ? normalizeUrl(cfg.url) : '';
    C.key = C.configured ? String(cfg.key) : '';
    C.session = readJson(SESSION_KEY, null);
    if (C.session && !C.session.access_token) C.session = null;
    C.status = C.configured ? (C.session ? 'on' : 'out') : 'off';
  }

  function setConfig(url, key) {
    const u = normalizeUrl(url);
    const k = String(key || '').trim();
    if (!/^https:\/\/[^\s]+$/i.test(u)) throw new Error('La URL debe empezar por https://');
    if (k.length < 40) throw new Error('La clave pública (anon) parece incompleta.');
    set(CFG_KEY, JSON.stringify({ url: u, key: k }));
    loadConfig();
  }

  function forgetConfig() {
    del(CFG_KEY);
    clearSession();
    del(META_KEY);
    loadConfig();
  }


  /* --------------------------------- Cuenta -------------------------------- */
  async function signIn(email, password) {
    if (!C.configured) throw new Error('Configura primero el servidor.');
    const mail = String(email || '').trim();
    if (!mail || !password) throw new Error('Escribe correo y contraseña.');
    const r = await http('/auth/v1/token?grant_type=password', {
      method: 'POST',
      body: { email: mail, password: String(password) },
    });
    if (!r.ok) throw new Error(friendlyAuthError(apiError(r)));
    adoptSession(r.data);
    await syncNow();
  }

  async function signUp(email, password) {
    if (!C.configured) throw new Error('Configura primero el servidor.');
    const mail = String(email || '').trim();
    if (!mail || !String(password || '').length) throw new Error('Escribe correo y contraseña.');
    if (String(password).length < 6) throw new Error('La contraseña necesita al menos 6 caracteres.');
    const r = await http('/auth/v1/signup', {
      method: 'POST',
      body: { email: mail, password: String(password) },
    });
    if (!r.ok) throw new Error(friendlyAuthError(apiError(r)));
    if (r.data && r.data.access_token) {
      adoptSession(r.data);
      await syncNow();
      return { signedIn: true };
    }
    /* El proyecto exige confirmar el correo. */
    return { signedIn: false };
  }

  async function signOut() {
    try { if (C.session) await http('/auth/v1/logout', { method: 'POST' }); } catch (e) { /* da igual */ }
    clearSession();
  }

  function friendlyAuthError(msg) {
    const m = String(msg || '');
    if (/invalid login credentials/i.test(m)) return 'Correo o contraseña incorrectos.';
    if (/already registered|already exists/i.test(m)) return 'Ese correo ya tiene cuenta. Entra en lugar de crearla.';
    if (/email not confirmed/i.test(m)) return 'Falta confirmar el correo. Revisa tu bandeja de entrada.';
    if (/rate limit|too many/i.test(m)) return 'Demasiados intentos seguidos. Espera un minuto.';
    return m;
  }


  /* ------------------------------ Sincronización --------------------------- */
  async function pullRow() {
    const rows = await api(TABLE + '?select=state,revision,updated_at&user_id=eq.' + encodeURIComponent(C.session.user_id));
    if (!Array.isArray(rows) || !rows.length) return null;
    const row = rows[0];
    if (!row || !row.state) return null;
    return row;
  }

  async function pushState(remoteRev, lastSyncFloor) {
    const m = readMeta();
    const rev = Math.max(Number(m.rev) || 0, Number(remoteRev) || 0) + 1;
    const body = {
      user_id: C.session.user_id,
      state: A.S,
      revision: rev,
      app: APP,
      client: clientName(),
    };
    const rows = await api(TABLE + '?on_conflict=user_id', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
      body,
    });
    m.rev = rev;
    m.dirty = false;
    m.editedAt = Date.now();
    m.lastSync = Date.now();
    writeMeta(m);
    setStatus('on');
    return rows;
  }

  function applyRemote(row) {
    applying = true;
    try {
      const next = Object.assign(A.defaultState(), row.state);
      A.setState(next);
      const m = readMeta();
      m.rev = Number(row.revision) || 0;
      m.dirty = false;
      m.editedAt = Date.parse(row.updated_at) || Date.now();
      m.lastSync = Date.now();
      writeMeta(m);
      A.save();
      if (A.render) A.render();
    } finally {
      applying = false;
    }
  }

  async function syncNow() {
    if (!C.configured) { toast('Configura el servidor en Ajustes.', 'err'); return false; }
    if (!C.session) { toast('Entra con tu cuenta para sincronizar.', 'err'); return false; }
    if (C.busy) return false;
    C.busy = true;
    setStatus('syncing');
    try {
      const row = await pullRow();
      const m = readMeta();
      const remoteMs = row ? (Date.parse(row.updated_at) || 0) : 0;
      const localMs = Number(m.editedAt) || 0;
      const hasLocal = !!((A.S.goals && A.S.goals.length) || A.S.xp > 0);

      if (!row) {
        /* Primera vez: la base de datos se crea con lo que ya había aquí. */
        await pushState(0);
        toast(hasLocal ? 'Progreso subido a tu cuenta.' : 'Cuenta conectada. Base de datos creada.', 'xp');
      } else if (m.dirty && localMs >= remoteMs && hasLocal) {
        /* Este dispositivo tiene cambios más recientes. */
        await pushState(row.revision);
        toast('Progreso guardado en la nube.', 'xp');
      } else if (!hasLocal && !m.dirty) {
        applyRemote(row);
        toast('Progreso recuperado de tu cuenta.', 'xp');
      } else if (remoteMs > localMs || Number(row.revision) > (Number(m.rev) || 0)) {
        applyRemote(row);
        toast('Progreso actualizado desde otro dispositivo.', 'info');
      } else {
        setStatus('on');
      }
      return true;
    } catch (e) {
      setStatus('error', e.message || 'No se pudo sincronizar.');
      toast('Sin conexión con la nube: sigues guardando en este equipo.', 'err');
      return false;
    } finally {
      C.busy = false;
    }
  }

  /* Lo llama A.save() en cada cambio: marca sucio y sube con retardo. */
  function touch() {
    if (applying || !C.configured || !C.session) return;
    const m = readMeta();
    m.dirty = true;
    m.editedAt = Date.now();
    writeMeta(m);
    clearTimeout(timer);
    timer = setTimeout(() => { pushNow(); }, DEBOUNCE_MS);
  }

  async function pushNow() {
    if (!C.configured || !C.session || C.busy) return false;
    C.busy = true;
    setStatus('syncing');
    try {
      const row = await pullRow();
      await pushState(row ? row.revision : 0);
      return true;
    } catch (e) {
      setStatus('error', e.message || 'No se pudo guardar en la nube.');
      return false;
    } finally {
      C.busy = false;
    }
  }

  function clientName() {
    if (/android/i.test(navigator.userAgent)) return 'android';
    if (/electron/i.test(navigator.userAgent)) return 'desktop';
    if (!/^https?:$/.test(location.protocol)) return 'file';
    return 'web';
  }


  /* --------------------------------- Interfaz ------------------------------ */
  function toast(txt, tone) {
    if (A.toast) A.toast(txt, tone);
    else console.log('[cloud] ' + txt);
  }

  function busy(txt) {
    return `<p class="hint">${txt}</p>`;
  }

  function statusLine() {
    if (C.status === 'off') return 'Sin cuenta: el progreso vive sólo en este equipo.';
    if (C.status === 'out') return 'Servidor configurado. Entra o crea una cuenta.';
    if (C.status === 'syncing') return 'Sincronizando…';
    if (C.status === 'error') return C.error || 'No se pudo conectar.';
    const m = readMeta();
    if (!m.lastSync) return 'Conectado.';
    const min = Math.max(0, Math.round((Date.now() - m.lastSync) / 60000));
    if (min < 1) return 'Sincronizado hace un momento.';
    if (min < 60) return `Sincronizado hace ${min} min.`;
    const h = Math.round(min / 60);
    return h < 24 ? `Sincronizado hace ${h} h.` : `Sincronizado hace ${Math.round(h / 24)} d.`;
  }

  function panel() {
    if (!C.configured) {
      return `<div class="field"><label>Cuenta y base de datos</label>
        <p class="tiny dim" style="margin:0 0 8px">Opcional. Con un proyecto Postgres (Supabase) tu progreso se guarda también fuera de este equipo y sigue en el móvil, el PC y la web. Sin esto, todo funciona igual y sólo en local.</p>
        <input class="input" id="cloudUrl" placeholder="https://tuproyecto.supabase.co" autocomplete="off">
        <input class="input" id="cloudKey" placeholder="Clave pública (anon / publishable)" autocomplete="off" style="margin-top:8px">
        <div class="row wrap" style="gap:8px;margin-top:8px">
          <button class="btn btn-sm btn-primary" data-act="cloudConnect">Conectar servidor</button>
        </div>
        <p class="hint">Se guardan en este dispositivo. La clave pública no da acceso a datos ajenos: cada fila está protegida por Row Level Security.</p>
      </div>`;
    }
    if (!C.session) {
      return `<div class="field"><label>Cuenta y base de datos</label>
        <p class="tiny dim" style="margin:0 0 8px">${esc(C.url.replace(/^https:\/\//, ''))} · ${esc(statusLine())}</p>
        <input class="input" id="cloudEmail" type="email" placeholder="tu@correo.com" autocomplete="username">
        <input class="input" id="cloudPass" type="password" placeholder="Contraseña" autocomplete="current-password" style="margin-top:8px">
        <div class="row wrap" style="gap:8px;margin-top:8px">
          <button class="btn btn-sm btn-primary" data-act="cloudSignIn">Entrar</button>
          <button class="btn btn-sm btn-ghost" data-act="cloudSignUp">Crear cuenta</button>
          <button class="btn btn-sm btn-ghost" data-act="cloudForget">Cambiar servidor</button>
        </div>
        <p class="hint ${C.status === 'error' ? 'err' : ''}">${esc(statusLine())}</p>
      </div>`;
    }
    return `<div class="field"><label>Cuenta y base de datos</label>
      <p class="tiny mono" style="margin:0 0 4px">${esc(C.session.email || 'sesión activa')}</p>
      <p class="hint ${C.status === 'error' ? 'err' : ''}">${esc(statusLine())}</p>
      <div class="row wrap" style="gap:8px">
        <button class="btn btn-sm btn-primary" data-act="cloudSync">${C.busy ? 'Sincronizando…' : 'Sincronizar ahora'}</button>
        <button class="btn btn-sm btn-ghost" data-act="cloudSignOut">Cerrar sesión</button>
      </div>
    </div>`;
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  }

  function val(id) {
    const el = document.getElementById(id);
    return el ? String(el.value || '') : '';
  }

  async function handle(act) {
    if (!/^cloud/.test(act)) return false;

    if (act === 'cloudConnect') {
      try {
        setConfig(val('cloudUrl'), val('cloudKey'));
        if (A.openSettings) A.openSettings();
        toast('Servidor guardado. Ahora entra o crea tu cuenta.', 'info');
      } catch (e) { toast(e.message, 'err'); }
      return true;
    }

    if (act === 'cloudForget') {
      forgetConfig();
      if (A.openSettings) A.openSettings();
      toast('Servidor olvidado. Sigues guardando en este equipo.', 'info');
      return true;
    }

    if (act === 'cloudSignIn' || act === 'cloudSignUp') {
      const email = val('cloudEmail');
      const pass = val('cloudPass');
      try {
        if (act === 'cloudSignUp') {
          const r = await signUp(email, pass);
          toast(r.signedIn
            ? 'Cuenta creada y progreso sincronizado.'
            : 'Cuenta creada. Confirma el correo y luego entra.', r.signedIn ? 'xp' : 'info');
        } else {
          await signIn(email, pass);
          toast('Sesión iniciada. Progreso sincronizado.', 'xp');
        }
      } catch (e) { toast(e.message, 'err'); }
      if (A.openSettings) A.openSettings();
      return true;
    }

    if (act === 'cloudSync') {
      await syncNow();
      if (A.openSettings) A.openSettings();
      return true;
    }

    if (act === 'cloudSignOut') {
      await signOut();
      if (A.openSettings) A.openSettings();
      toast('Sesión cerrada. El progreso sigue en este equipo.', 'info');
      return true;
    }

    return true;
  }


  /* --------------------------------- Arranque ------------------------------ */
  function init() {
    loadConfig();
    if (!C.configured || !C.session) return;
    /* Deja arrancar la app y luego concilia. */
    setTimeout(() => {
      if (C.session && C.session.expires_at && Date.now() > C.session.expires_at - 30000) {
        refreshToken().then((ok) => { if (ok) syncNow(); }).catch(() => {});
      } else {
        syncNow();
      }
    }, 1800);
  }

  window.addEventListener('online', () => {
    if (C.configured && C.session && C.status !== 'syncing') pushNow();
  });

  A.Cloud = {
    init, panel, handle, touch, syncNow, pushNow,
    isAction: (act) => /^cloud/.test(String(act || '')),
    status: () => ({ configured: C.configured, url: C.url, session: C.session, status: C.status, error: C.error }),
    isOn: () => C.configured && !!C.session,
    setConfig, forgetConfig, signIn, signUp, signOut,
  };

  init();

})(window.Seraph = window.Seraph || {});
