# Seraph Augeo v3 · El ojo que recuerda lo que hiciste

Un sistema de metas que **verifica lo que realmente ocurrió**, no lo que
prometes. Un **serafín en 3D** preside el menú: desciende del cielo, aterriza con
una onda de luz y, al pulsar **Entrar**, la cámara se zambulle en su halo. Todo el
modelo va incrustado en el archivo: no pide nada a la red.

Antes de entrar hay una **puerta de la Inteligencia**: eliges un proveedor de IA
(31 opciones, en la nube o local), la app hace una llamada real y **sólo te deja
pasar si esa llamada responde**. Basta con que un proveedor funcione.

**Sin servidor de ningún tipo.** Ni backend, ni base de datos, ni proceso que
mantener encendido: la app es un archivo.

---

## 1. Arrancar

### Navegador (sin instalar nada)

Abre `seraph-augeo-v3.html` con doble clic. Motor, verificación, cofres, serafín e
IA viven en el navegador. El progreso se guarda en `localStorage`.

Si un navegador muy restrictivo bloquea las peticiones desde `file://`, sirve la
carpeta por HTTP estático (sigue sin haber servidor propio) o usa la versión de
escritorio.

### Escritorio (recomendado para IA)

| Sistema | Qué abrir |
|---|---|
| Windows | `desktop/dist/SeraphAugeo-3.3.0-portable.exe` (portable, sin instalar) |
| macOS | `desktop/dist/SeraphAugeo-3.3.0-mac-arm64.tar.gz` (Apple Silicon) o `-mac-x64.tar.gz` (Intel) |
| Linux | `desktop/dist/SeraphAugeo-3.3.0-linux-x64.tar.gz` |

En macOS y Linux, extrae el `tar.gz` y abre la app. En Apple Silicon, si macOS
dice que la app está dañada (se empaquetó fuera del Mac, sin firma), ejecuta una
vez `codesign --force --deep --sign - "Seraph Augeo.app"`. En Linux, si el
sandbox de Chromium se queja, abre con `./"Seraph Augeo" --no-sandbox`.

La versión de escritorio envía las peticiones de IA desde el proceso principal,
así que **no hay CORS**: funcionan todos los proveedores, también los locales.

### Regenerar el archivo único

```bash
node build.mjs          # ~4,1 MB, 23 módulos incrustados
```

`build.mjs` lee `assets/manifest.js`, así que un módulo nuevo se empaqueta solo.

---

## 2. La puerta de la Inteligencia

```
Elegir proveedor → URL / modelo / clave → «Probar conexión»
      → llamada real → {"ok":true} → perfil listo → «Continuar» habilitado
```

- Guardar una clave **no** abre la puerta. Sólo la abre una respuesta real.
- Si falla, la app dice exactamente qué pasó: sin conexión, clave inválida,
  modelo inexistente, URL inválida o error del proveedor.
- Puedes guardar varios perfiles y cambiar de activo cuando quieras.
- Sin ningún proveedor validado, **Continuar** permanece deshabilitado.

### Los 31 proveedores

**Nube (22):** OpenAI · Anthropic (Claude) · Gemini · OpenRouter · Groq ·
Mistral · DeepSeek · xAI (Grok) · Together AI · Fireworks · Perplexity ·
Cerebras · DeepInfra · Hyperbolic · Nebius · SambaNova · Novita ·
GitHub Models · Moonshot (Kimi) · Z.ai (GLM) · Alibaba (Qwen) · SiliconFlow.

**Local, compatible con OpenAI (8):** Ollama · LM Studio · llama.cpp · vLLM ·
Jan · GPT4All · KoboldCpp · text-generation-webui.

**Comodín:** «Otro (URL propia)», para cualquier servicio con formato OpenAI.

### IA local en 4 pasos

```bash
# 1. Instala Ollama (ollama.com)
# 2. Descarga un modelo
ollama pull llama3.1:8b
# 3. Comprueba el servidor
#    http://localhost:11434
# 4. En la puerta: Ollama · http://localhost:11434/v1 · llama3.1:8b · Probar
```

Si dejas el campo del modelo vacío, la app consulta `GET /v1/models` y elige el
primero disponible.

---

## 3. Qué hay dentro

| Archivo | Qué hace |
|---|---|
| `assets/engine.js` | Núcleo determinista: fases, niveles, verificación, 15 rarezas, botín, 20 artefactos, misiones, racha. Sin DOM y sin red |
| `assets/sigil.js` | El sello: ojo vertical, seis alas y halo, en SVG animado por fase |
| `assets/styles.css` | Sistema visual celestial (oro viejo sobre obsidiana) y las atmósferas de fase |
| `assets/manifest.js` | Lista ordenada de módulos; el único sitio a tocar al añadir uno |
| `assets/boot.js` | Cargador: inyecta los módulos en orden y arranca el núcleo |
| `index.html` | Declara motor, sello, manifiesto y cargador |

### La interfaz, módulo a módulo (23)

| Módulo | Qué hace |
|---|---|
| `assets/core/dom.js` | Utilidades DOM, fechas, iconos SVG |
| `assets/core/state.js` | Estado, guardado/carga en `localStorage`, eventos |
| `assets/core/cloud.js` | **Cuenta y base de datos**: auth, esquema de sincronización y panel de Ajustes |
| `assets/core/economy.js` | Nivel, fase, racha, XP, monedas, resumen |
| `assets/data/plans.js` | Áreas y plantillas: 3 hitos, 9 tareas, hábito sugerido |
| `assets/ai/client.js` | **Motor de IA**: 31 proveedores, perfiles, sondeo real, caché, presupuesto, IPC |
| `assets/ai/setup.js` | **Puerta de la Inteligencia**: pantalla y modal de configuración |
| `assets/guardian.js` | Ángel Guardián: preguntas, veredicto, diagnóstico, respaldo local |
| `assets/intro/angel3d.js` | Serafín en WebGL: descenso, aterrizaje, halo, zambullida |
| `assets/ui/intro.js` | Escenario animado e intro cinematográfica |
| `assets/ui/shell.js` | Render general, pestañas, modales, avisos |
| `assets/views/onboarding.js` | Meta, porqué, área, horizonte, plan y puerta de IA |
| `assets/views/hoy.js` | Vista Hoy, factores, misiones, hábitos, gráfico semanal |
| `assets/views/metas.js` | Metas, archivadas, editor de meta y tarea |
| `assets/views/cofres.js` | Cámara de cofres, 15 rarezas, apertura con botín |
| `assets/views/guardian.js` | Vista del Guardián y diagnóstico |
| `assets/views/altar.js` | Altar, artefactos, logros, constancia, planes |
| `assets/modals/verify.js` | Verificación: pregunta, cronómetro, respuesta, veredicto, botín |
| `assets/actions.js` | Acciones, ajustes, exportar/importar, reinicio |
| `assets/main.js` | Arranque, estado inicial y API para las pruebas |

---

## 4. Documentación

| Documento | Para qué |
|---|---|
| [`docs/MANUAL-TECNICO.md`](docs/MANUAL-TECNICO.md) | Arquitectura, motor de IA, puerta, build, pruebas, riesgos |
| [`docs/MANUAL-DE-USUARIO.md`](docs/MANUAL-DE-USUARIO.md) | Uso diario, configurar IA, verificación, problemas frecuentes |
| [`docs/MANUAL-DE-DESPLIEGUE.md`](docs/MANUAL-DE-DESPLIEGUE.md) | Compilar .exe / macOS / Linux, firmar, publicar |
| [`LEEME.txt`](LEEME.txt) | Resumen rápido en texto plano |

---

## 5. El serafín 3D (opcional para editar)

`assets/intro/angel.glb` está comprimido a 2,09 MB con `@gltf-transform`
(texturas a 1024 px, ~71 000 triángulos, meshopt) y `tools/viewer/three.bundle.js`
incluye three.js + GLTFLoader + meshopt. `node build.mjs` los incrusta en el HTML:
no hay `fetch`, así que funciona con `file://`.

```bash
node tools/prepare-angel.mjs        # regenera el GLB desde modelo angel/
node tools/inspect-glb.mjs          # mallas, materiales y animaciones
npx esbuild tools/viewer/entry.js --bundle --format=iife --minify \
  --outfile=tools/viewer/three.bundle.js
```

Sin WebGL, o si la carga falla en 4 s, el canvas se retira y queda la escena CSS.
Con `prefers-reduced-motion` el ángel aparece ya plantado.

---

## 6. La verificación (honesta y explicable)

| Señal | Puntos | Cómo se gana |
|---|---|---|
| Evidencia | 0 / 30 / 45 | Nada · nota o captura · resultado visible o testigo |
| Detalle del texto | 0 a 25 | Longitud útil + números + vocabulario variado; −15 si repite |
| Tiempo | 0 a 15 | Minutos declarados frente a la estimación |
| Historial | 0 a 15 | Tu confianza acumulada |
| Castigos | variable | Tiempo imposible (−10), «más tiempo» con 20 % del reloj (−12), atención fallida (−8) |

Después: **Verificado ≥ 80** (XP ×1) · **Probable ≥ 55** (×0,75) ·
**Dudoso ≥ 30** (×0,5) · **Sin verificar < 30** (0 XP). Probabilidad de cofre:
`0,22 + (puntuación − 55)/45 × 0,58`, desde 55 puntos.

Con Guardián en línea, la IA aporta una señal 0-100 que pesa el **45 %**; el 55 %
restante es la fórmula determinista. La app nunca afirma que detecte mentiras:
muestra sus componentes uno a uno.

---

## 7. Las 15 rarezas

| Nivel | Rareza | Prob. | Nivel | Rareza | Prob. |
|---:|---|---:|---:|---|---:|
| 1 | Ceniza | 30 % | 9 | Celestial | 1,2 % |
| 2 | Común | 22 % | 10 | Seráfico | 0,7 % |
| 3 | Pulido | 15 % | 11 | Etéreo | 0,4 % |
| 4 | Raro | 11 % | 12 | Astral | 0,25 % |
| 5 | Preciado | 8 % | 13 | Primigenio | 0,15 % |
| 6 | Épico | 5,5 % | 14 | Divino | 0,1 % |
| 7 | Iluminado | 3,5 % | 15 | Inefable | 0,2 % |
| 8 | Ancestral | 2 % | | | |

Tope de 3 cofres ganados al día (4 con la Llave del umbral). Piedad: 12 aperturas
sin Raro o mejor garantizan Raro o mejor. Comprar: 240 monedas o 6 esencia,
máximo 2 al día. Los 20 artefactos **no se fabrican**: aparecen una vez y no se
repiten.

---

## 8. Escritorio: compilar

```bash
cd desktop
npm install
npm run dist:win          # .exe portable
bash pack-platforms.sh    # Linux x64 + macOS arm64 + macOS Intel (reanudable)
```

`pack-platforms.sh` no depende de `electron-packager`: descarga el Electron de
cada plataforma en `desktop/vendor/` (con reanudación, útil con conexiones lentas)
y monta los paquetes en `desktop/dist/`. Detalles (firma, `.dmg`, comprimir con
permisos, errores de antivirus) en
[`docs/MANUAL-DE-DESPLIEGUE.md`](docs/MANUAL-DE-DESPLIEGUE.md).

---

## 9. Pruebas

```bash
node tests/engine.test.js     #  79 ✓  fórmulas, rarezas, botín, misiones, racha
node tests/client.test.js     #  19 ✓  clave, proveedor, CORS, timeout, cuota, caché, JSON
node tests/smoke.test.js      #  28 ✓  intro, onboarding, puerta de IA, verificación, cofre, pestañas
node tests/file-boot.js       #   ✓   arranque desde file://, sin servidor
bash tests/run-all.sh         # todo junto → «Todo en verde»
```

`smoke.test.js` necesita `jsdom`. La app en sí **no tiene dependencias**.

---

## 10. Base de datos y sincronización (opcional)

La app guarda siempre primero en el dispositivo. Si además conectas una cuenta,
el mismo progreso se guarda en una base de datos Postgres (Supabase) y se
concilia entre web, escritorio y Android. Sin cuenta no se envía nada a ninguna
parte y todo sigue funcionando sin internet.

**Qué se guarda:** el estado completo en una fila por cuenta (`public.saves`,
columna `state` de tipo `jsonb`): XP, nivel, fase, racha, metas, tareas, hábitos,
días, cofres, artefactos, misiones, logros, verificaciones, historial y ajustes.
La clave de IA **no** se sube: sigue sólo en el dispositivo.

**Ponerlo en marcha (una vez, ~5 minutos):**

1. Crea un proyecto gratis en [supabase.com](https://supabase.com).
2. SQL Editor → New query → pega [`docs/supabase.sql`](docs/supabase.sql) → Run.
   Crea la tabla, el disparador de fecha y las políticas RLS.
3. Project Settings → API: copia **Project URL** y la clave **anon / publishable**.
4. En la app: Ajustes → **Cuenta y base de datos** → pega ambas → **Conectar servidor**.
5. **Crear cuenta** con correo y contraseña (o **Entrar** si ya la tienes).

Si el proyecto exige confirmar el correo, revisa la bandeja y después entra.

**Cómo sincroniza:** cada cambio se escribe en local y se sube ~1,5 s después.
Al abrir la app se concilia: si la nube tiene un cambio más reciente, se aplica y
se avisa; si este equipo tiene cambios sin subir, se suben. No hay fusión campo a
campo — gana el guardado más reciente, así que evita editar lo mismo en dos
dispositivos a la vez.

**Seguridad:** la clave pública viaja en el cliente, pero Row Level Security hace
que cada cuenta sólo pueda leer y escribir su propia fila (`auth.uid() =
user_id`). La contraseña la cifra Supabase; la app sólo guarda el token de sesión.

---

## 11. Seguridad y privacidad

- Las claves de IA viven **sólo** en `localStorage` de tu equipo y viajan
  únicamente al proveedor que elijas. No hay servidor de la app que las reciba.
- Cualquiera con acceso al perfil del navegador puede leerlas: usa claves con
  tope de gasto y ámbito restringido.
- En escritorio, `contextIsolation` activo, sin Node en la página, navegación
  externa derivada al navegador del sistema y peticiones limitadas a 4 MB.
- Progreso en `localStorage` y, si conectas una cuenta, en tu propia base de
  datos Postgres. Exportable e importable en JSON. Sin analítica, sin publicidad.
- La clave de IA nunca se sube a la base de datos: sólo viaja al proveedor.

---

## 12. Límites declarados

- La verificación es una **heurística** transparente: evidencia, detalle, tiempo
  e historial. No lee tu mente.
- La IA puede caerse (503 de Gemini, 429 en planes gratuitos). Por eso el motor
  local es de primera clase y la app lo dice en pantalla.
- Sin cuenta conectada, no hay sincronización: el progreso vive en un equipo.
- El plan «Serafín» de la pantalla de planes está anunciado, **no cobrado**.
- Los binarios no están firmados: macOS pedirá clic derecho → Abrir y Windows
  SmartScreen advertirá.
