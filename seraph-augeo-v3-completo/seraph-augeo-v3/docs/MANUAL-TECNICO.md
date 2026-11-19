# Seraph Augeo v3 · Manual técnico

Documento para quien mantiene el código. Explica cómo está montada la app, cómo
se empaqueta en un solo archivo, cómo funciona el motor de IA multi‑proveedor y
la puerta de entrada, y qué contratos hay que respetar al tocarlo.

---

## 1. Visión general

Seraph Augeo v3 es una aplicación **sin servidor**. Todo el código vive en el
navegador y el progreso en `localStorage`. Hay dos formas de ejecutarla:

| Forma | Entrada | Cómo se sirve |
|---|---|---|
| Archivo único | `seraph-augeo-v3.html` (~4,1 MB) | Se abre con doble clic (`file://`) |
| Escritorio | `Seraph Augeo` (Electron) | Ventana nativa; las peticiones de IA salen del proceso principal |

No hay backend, ni base de datos, ni proceso que mantener encendido. La carpeta
`assets/` es el código fuente por módulos; `build.mjs` los incrusta todos dentro
del HTML único junto con el modelo 3D y three.js.

```
index.html ──► assets/boot.js ──► assets/manifest.js ──► módulos en orden
                                                    └──► window.Seraph
```

`assets/boot.js` inyecta cada módulo como `<script>` en el orden declarado por
`assets/manifest.js`. Los módulos no usan `import`: se registran en
`window.Seraph` (abreviado `A` dentro de cada archivo) y se leen entre sí por ese
espacio común. Añadir un módulo = crear el archivo y añadir **una** línea al
manifiesto; el build lo recoge solo.

---

## 2. Mapa de módulos

| Archivo | Responsabilidad |
|---|---|
| `assets/core/dom.js` | Utilidades DOM, fechas, iconos SVG, referencias base |
| `assets/core/state.js` | Estado, guardado/carga en `localStorage`, eventos |
| `assets/core/economy.js` | Nivel, fase, racha, XP, monedas, resumen |
| `assets/data/plans.js` | Áreas y plantillas (3 hitos, 9 tareas, hábito) |
| `assets/ai/client.js` | **Motor de IA**: proveedores, perfiles, sondeo real, caché, presupuesto, transporte |
| `assets/ai/setup.js` | **Puerta de la Inteligencia**: pantalla de configuración y modal |
| `assets/guardian.js` | Ángel Guardián: preguntas, veredicto, diagnóstico, respaldo local |
| `assets/intro/angel3d.js` | Serafín en WebGL: descenso, aterrizaje, halo, zambullida |
| `assets/ui/intro.js` | Escenario animado e intro cinematográfica |
| `assets/ui/shell.js` | Render general, pestañas, modales y avisos |
| `assets/views/onboarding.js` | Pasos previos: meta, porqué, área, horizonte, plan, **IA** |
| `assets/views/hoy.js` | Vista Hoy, factores, misiones, hábitos, gráfico semanal |
| `assets/views/metas.js` | Metas, archivadas, editor de meta y de tarea |
| `assets/views/cofres.js` | Cámara de cofres, 15 rarezas, apertura con botín |
| `assets/views/guardian.js` | Vista del Guardián y diagnóstico |
| `assets/views/altar.js` | Altar, artefactos, logros, constancia, planes |
| `assets/modals/verify.js` | Verificación: pregunta, cronómetro, respuesta, veredicto, botín |
| `assets/actions.js` | Acciones globales, ajustes, exportar/importar, reinicio |
| `assets/main.js` | Arranque, estado inicial y API expuesta a las pruebas |

Son 22 módulos en el manifiesto (el HTML final genera 22 `<script>` incrustados).

### Regla de acoplamiento

Cada módulo declara al principio sus enlaces (`const S = A.S;`) para copiar
objetos estables, y resuelve funciones en el momento de invocarlas
(`A.Shell.render()`). Así el orden de carga no importa y no hay ciclos. Si
necesitas un módulo nuevo en tiempo de carga, añádelo **antes** en el manifiesto.

---

## 3. El motor de IA (`assets/ai/client.js`)

### 3.1 Adaptadores, no ramas por proveedor

Todos los proveedores se reducen a tres protocolos:

| `kind` | Formato | Ejemplos |
|---|---|---|
| `openai` | `POST {base}/chat/completions`, `Authorization: Bearer` | OpenAI, Groq, Mistral, DeepSeek, xAI, Together, Ollama, LM Studio… |
| `anthropic` | `POST {base}/messages`, `x-api-key` + `anthropic-version` | Anthropic (Claude) |
| `gemini` | `POST {base}/models/{model}:generateContent`, `x-goog-api-key` | Gemini |

Añadir un proveedor compatible con OpenAI cuesta **cinco líneas** usando el
ayudante `oa({...})`: `id`, `name`, `baseUrl`, `models`, `docs`, `keyHint`.

### 3.2 Catálogo: 31 entradas

- **22 en la nube**: OpenAI, Anthropic, Gemini, OpenRouter, Groq, Mistral,
  DeepSeek, xAI, Together AI, Fireworks, Perplexity, Cerebras, DeepInfra,
  Hyperbolic, Nebius, SambaNova, Novita, GitHub Models, Moonshot, Z.ai (GLM),
  Alibaba (Qwen), SiliconFlow.
- **8 locales** con API compatible: Ollama (`:11434`), LM Studio (`:1234`),
  llama.cpp (`:8080`), vLLM (`:8000`), Jan (`:1337`), GPT4All (`:4891`),
  KoboldCpp (`:5001`), text-generation-webui (`:5000`).
- **1 comodín**: «Otro (URL propia)», para cualquier endpoint compatible.

Los locales son `keyless: true` (no piden clave; si el servidor la exige, se
acepta cualquiera escrita).

### 3.3 Perfiles

Un **perfil** es `{ id, provider, apiKey, baseUrl, model, label, ok, ms, error,
checkedAt }` y se guarda en `localStorage['seraph-augeo-v3-ai-config']` como
`{ v: 1, activeId, profiles: [] }`.

API pública expuesta en `A.AI`:

| Función | Qué hace |
|---|---|
| `isReady()` | `true` si **algún** perfil tiene `ok === true` |
| `list()` | Lista normalizada para la interfaz |
| `saveProfile(draft, key)` | Crea/actualiza un perfil (nunca lo marca listo) |
| `removeProfile(id)` / `activate(id)` | Borra / marca como activo |
| `testProfile(id)` | **Sondeo real**: hace una llamada mínima y guarda el resultado |
| `discoverModel(profile)` | Si no hay modelo, consulta `GET {base}/models` |
| `ask()` / `diagnose()` / `suggest()` | Llamadas de producto con caché y presupuesto |
| `providerName()`, `status()`, `models()` | Metadatos para la interfaz |

### 3.4 La regla que sostiene la puerta

Un perfil sólo pasa a `ok: true` cuando la respuesta real cumple **las tres**:

1. HTTP 2xx,
2. cuerpo JSON válido,
3. el JSON contiene `ok === true` (se pide al modelo que responda exactamente
   `{"ok":true}`).

Guardar una clave **nunca** habilita la entrada. Si el proveedor devuelve un
cuerpo de error, un HTML de proxy o algo distinto, el perfil queda `ok: false`
con el motivo. `isReady()` es la única fuente de verdad y la consulta
`guardian.js` y `actions.js`.

### 3.5 Transporte

```js
if (window.seraphDesktop && window.seraphDesktop.httpJson) → IPC (Electron)
else                                                       → fetch (navegador)
```

En navegador, `file://` puede bloquear la petición por CORS; entonces el error
es `cors-o-red` y la pantalla lo explica. En Electron no hay CORS porque la
petición sale del proceso principal (`desktop/main.js`, IPC `seraph:http`), que
sólo acepta `http:`/`https:`, limita el cuerpo a 4 MB y aplica timeout.

### 3.6 Caché, presupuesto y errores

- `seraph-augeo-v3-ai-budget`: 200 llamadas por día (contador con fecha).
- `seraph-augeo-v3-ai-cache`: 6 h preguntas, 30 min diagnósticos.
- Mensajes normalizados: `sin-clave`, `sin-conexion`, `url-invalida`,
  `presupuesto`, `modelo-inexistente`, `json-invalido`, `cors-o-red`.
  La interfaz nunca muestra un error crudo del proveedor sin traducirlo.

### 3.7 Compatibilidad heredada

`setKey(k)` sigue escribiendo `seraph-augeo-v3-ai-key` y se migra
`seraph-augeo-v3-gemini-key`. Esto mantiene verdes las 19 pruebas de
`tests/client.test.js` y no rompe instalaciones antiguas.

---

## 4. La puerta de la Inteligencia (`assets/ai/setup.js`)

- `onboarding.js` añade el paso `'ai'`; cuando `o.step === 'ai'` devuelve
  `A.AISetup.gateView()`.
- `gateView()` pinta: rejilla de 31 proveedores, formulario (URL, modelo,
  clave), lista de perfiles guardados y el botón **Continuar**.
- **Continuar** nace `disabled` y sólo se habilita cuando `isReady()` es cierto.
  No hay atajo, ni parámetro en la URL, ni botón «saltar».
- `actions.js` enruta `aiPick / aiTest / aiContinue / aiUse / aiDel /
  openAiSetup` al manejador `A.AISetup.handle` desde su `default`.
- `guardian.js` decide con `isReady()` (antes `hasKey()`), así que el Guardián
  no intenta llamar sin un proveedor validado.

Flujo de datos de la puerta:

```
elegir proveedor → escribir URL/modelo/clave → Probar conexión
   → client.testProfile → llamada real → {ok:true} → perfil ok
   → isReady() true → Continuar habilitado → onboarding sigue en «Paso 2 de 3»
```

---

## 5. El serafín 3D

`assets/intro/angel.glb` (2,09 MB, texturas 1024 px, ~71 000 triángulos,
meshopt) y `tools/viewer/three.bundle.js` se incrustan en base64 dentro del
HTML; no hay `fetch`, por eso funciona con `file://`.

`angel3d.js` incluye dos redes de seguridad, necesarias porque una pestaña
oculta suspende `requestAnimationFrame`:

1. `enter()` programa `setTimeout(..., ENTER_LEN*1000 + 1200)` que forza la
   salida del menú si la animación no llegó a terminar.
2. `finishEnter()` es idempotente: puede llamarse desde la animación o desde el
   temporizador sin ejecutar la transición dos veces.

Sin WebGL, o si la carga tarda más de 4 s, el canvas se retira y queda la escena
CSS.

---

## 6. Build

```bash
node build.mjs
```

Hace, en orden:

1. Lee `assets/manifest.js` y concatena los módulos como `<script>` inline.
2. Incrusta `three.bundle.js` y `angel.glb` en base64.
3. Escribe `seraph-augeo-v3.html`.

Salida esperada: ~4,1 MB y **22 archivos** incrustados. El build es determinista
y no necesita red.

---

## 7. Pruebas

```bash
node tests/engine.test.js     # 79  fórmulas, rarezas, botín, misiones, racha
node tests/client.test.js     # 19  clave, proveedor, CORS, timeout, cuota, caché, JSON
node tests/smoke.test.js      # 28  intro, onboarding, PUERTA de IA, verificación, cofre, pestañas
node tests/file-boot.js       #  ✓  arranque desde file://
bash tests/run-all.sh         # todo junto, termina en «Todo en verde»
```

Las pruebas de la puerta son dos:

- «sin IA validada no deja entrar: abre la puerta» — el botón Continuar está
  deshabilitado y aparece la rejilla de proveedores.
- «la puerta se abre cuando un proveedor respondió» — con `fetch` simulado que
  devuelve `{"ok":true}`, el perfil queda listo y Continuar se habilita.

`smoke.test.js` necesita `jsdom`. La app publicada no tiene dependencias.

---

## 8. Escritorio (Electron)

| Archivo | Papel |
|---|---|
| `desktop/main.js` | Ventana, búsqueda del HTML, IPC `seraph:http`, menú nulo |
| `desktop/preload.js` | `contextBridge`: sólo `httpJson` y `version` |
| `desktop/package.json` | Electron 38, electron-builder 26, @electron/packager 18, scripts y targets |
| `desktop/build/icon.png` | Icono 1024×1024 generado desde `icons/sigil.svg` |

Seguridad aplicada: `contextIsolation: true`, `nodeIntegration: false`,
navegación externa derivada a `shell.openExternal`, `will-navigate` bloqueado
fuera de `file://`, cuerpo HTTP limitado a 4 MB.

`main.js` busca el HTML en este orden:
`resourcesPath/app/`, `resourcesPath/`, `__dirname/app/`, `__dirname/../`.
Por eso el paquete funciona tanto con electron-builder (`extraResources` →
`app/seraph-augeo-v3.html`) como con `@electron/packager`
(`--extra-resource=../seraph-augeo-v3.html`).

---

## 9. Riesgos conocidos

1. **La clave vive en `localStorage`**. Cualquiera con acceso al perfil del
   navegador puede leerla. Recomendación: claves con tope de gasto y ámbito
   restringido. En escritorio no mejora: el `localStorage` del perfil de
   Electron es igual de accesible.
2. **CORS en `file://`**. Algunos proveedores no permiten origen `null`. En
   escritorio se elimina; en navegador la app informa y sugiere servir la
   carpeta por HTTP estático.
3. **Proveedores cambian modelos**. Los nombres por defecto son una comodidad,
   no una garantía; el campo de modelo es editable y, si se deja vacío, se
   consulta `/v1/models`.
4. **Antivirus y electron-builder en Windows**. `EBUSY/EPERM` al borrar
   `dist/win-unpacked.tmp/electron.exe` es un bloqueo del escáner. Solución:
   borrar `desktop/dist` y reconstruir, o usar `@electron/packager`.
5. **Firma de código**. Los binarios no están firmados: macOS pedirá
   confirmación (clic derecho → Abrir) y Windows SmartScreen advertirá.
