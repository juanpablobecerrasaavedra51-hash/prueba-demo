# Seraph Augeo v3 · Manual de despliegue

Cómo publicar y distribuir la app. No hay servidor propio ni base de datos: el
despliegue consiste en entregar archivos.

---

## 1. Qué se entrega

| Artefacto | Para quién | Contenido |
|---|---|---|
| `seraph-augeo-v3.html` | Cualquiera, sin instalar | La app completa (~4,1 MB) |
| `SeraphAugeo-3.1.0-portable.exe` | Windows x64 | Ejecutable portable, sin instalador |
| `SeraphAugeo-3.1.0-instalador.exe` | Windows x64, opcional | Instalador NSIS con carpeta elegible |
| `SeraphAugeo-3.1.0-mac-arm64.tar.gz` | macOS Apple Silicon | `.app` empaquetada y comprimida (230 MB) |
| `SeraphAugeo-3.1.0-mac-x64.tar.gz` | macOS Intel | `.app` empaquetada y comprimida (233 MB) |
| `SeraphAugeo-3.1.0-linux-x64.tar.gz` | Linux x64 | Carpeta con el ejecutable `Seraph Augeo` (114 MB) |
| `Seraph Augeo-darwin-arm64/`, `-darwin-x64/`, `Seraph Augeo-linux-x64/` | — | Las mismas carpetas sin comprimir, tal como las deja el empaquetador |

Se usa `tar.gz` y no `zip` a propósito: al comprimir en Windows, el `zip` pierde
el bit de ejecución y la app no arranca en Linux ni en macOS. `tar` lo conserva
si se empaqueta con `--mode` (ver §3).

Los binarios **no están firmados**. macOS y Windows avisarán al abrirlos; es
esperado (ver §6).

---

## 2. Antes de compilar

Requisitos: **Node 18+** (probado con Node 20/22) y conexión a internet la
primera vez (Electron descarga su binario por plataforma).

```bash
cd seraph-augeo-v3-completo/seraph-augeo-v3
node build.mjs                     # regenera el HTML único
bash tests/run-all.sh              # debe terminar en «Todo en verde»

cd desktop
npm install                        # 336 paquetes aprox.
```

El HTML único debe existir **antes** de empaquetar: los scripts de escritorio lo
copian como recurso (`extraResources` / `--extra-resource`).

---

## 3. Compilar por plataforma

Todos los comandos se ejecutan en `desktop/`.

### Windows

```bash
npm run dist:win         # portable → dist/SeraphAugeo-3.1.0-portable.exe
npm run dist:win-installer   # opcional → dist/SeraphAugeo-3.1.0-instalador.exe
```

### Linux

```bash
npm run pack:linux       # dist/Seraph Augeo-linux-x64/
```

En una máquina Linux, para empaquetados nativos:

```bash
npm run dist:linux       # AppImage + tar.gz
```

### macOS

```bash
npm run pack:mac         # Apple Silicon → dist/Seraph Augeo-darwin-arm64/
npm run pack:mac-intel   # Intel         → dist/Seraph Augeo-darwin-x64/
```

Si la conexión es lenta o `electron-packager` no puede descargar su binario, usa
el empaquetador propio, que descarga con reanudación y monta los paquetes sin
dependencias extra:

```bash
bash pack-platforms.sh          # Linux + macOS arm64 + macOS Intel
bash pack-platforms.sh linux    # sólo una
bash pack-platforms.sh mac
```

Los zips de Electron quedan en `desktop/vendor/`, así que un segundo intento
reanuda en lugar de empezar de cero.

En un Mac, para `.dmg` y `.zip` reales:

```bash
npm run dist:mac
```

Los `.dmg` sólo se generan en macOS. Desde Windows/Linux, `@electron/packager`
produce la carpeta `.app` y el binario correctos, pero hay que comprimirla y
distribuirla tal cual.

### Comprimir lo que sale de packager (conservando permisos)

Windows pierde dos cosas al descomprimir el zip de Electron: el bit de ejecución
y los **14 enlaces simbólicos** que necesita la `.app` (sus frameworks). Por eso
el proyecto incluye `pack-tar.py`, que escribe el `tar.gz` con permisos y enlaces
correctos, y `pack-platforms.sh` lo llama solo al terminar cada plataforma:

```bash
cd desktop
python pack-tar.py --pkg "Seraph Augeo-darwin-arm64" \
  --zip vendor/electron-v38.8.6-darwin-arm64.zip \
  --out dist/SeraphAugeo-3.1.0-mac-arm64.tar.gz

python pack-tar.py --pkg "Seraph Augeo-darwin-x64" \
  --zip vendor/electron-v38.8.6-darwin-x64.zip \
  --out dist/SeraphAugeo-3.1.0-mac-x64.tar.gz

python pack-tar.py --pkg "Seraph Augeo-linux-x64" \
  --out dist/SeraphAugeo-3.1.0-linux-x64.tar.gz
```

Con `tar` a secas también sirve, para Linux y para los archivos (sin enlaces):

```bash
tar --mode='u+rwx,go+rx,o-w' -czf "SeraphAugeo-3.1.0-linux-x64.tar.gz" "Seraph Augeo-linux-x64"
```

Comprobación de que los permisos quedaron bien dentro del paquete:

```bash
tar -tvzf "SeraphAugeo-3.1.0-linux-x64.tar.gz" | grep -E "Seraph Augeo$|chrome-sandbox"
# debe mostrar  -rwxr-xr-x

tar -tvzf "SeraphAugeo-3.1.0-mac-arm64.tar.gz" | grep "^l" | wc -l
# debe mostrar  14   (los enlaces de los frameworks)

tar -tvzf "SeraphAugeo-3.1.0-mac-arm64.tar.gz" | grep "MacOS/Seraph Augeo$"
# debe mostrar  -rwxr-xr-x
```

Si aun así un binario sale sin permiso de ejecución, se arregla al extraer:

```bash
chmod +x "Seraph Augeo-linux-x64/Seraph Augeo"
```

---

## 4. Verificar un paquete

Sin abrirlo:

```bash
# el HTML tiene que estar dentro del paquete
ls "dist/Seraph Augeo-linux-x64/resources/app/seraph-augeo-v3.html"
ls "dist/win-unpacked/resources/app/seraph-augeo-v3.html"
```

Comprobaciones mínimas al abrirlo por primera vez:

1. La ventana arranca en el menú del serafín.
2. Pulsar **Entrar** lleva al onboarding.
3. La puerta de la IA muestra los 31 proveedores.
4. **Probar conexión** con un proveedor real devuelve «Conectado».
5. Sin ningún proveedor validado, **Continuar** sigue deshabilitado.

En escritorio, la prueba de IA es la definitiva: las peticiones salen del proceso
principal, así que si falla es por clave, URL o modelo, nunca por CORS.

### Linux: `chrome-sandbox`

Electron exige que `chrome-sandbox` pertenezca a root con modo `4755` para usar su
sandbox. Como el paquete se montó fuera de Linux, se abre sin sandbox:

```bash
tar xzf SeraphAugeo-3.1.0-linux-x64.tar.gz
cd "Seraph Augeo-linux-x64"
./"Seraph Augeo" --no-sandbox
```

Para dejarlo con sandbox (requiere root, una sola vez):

```bash
sudo chown root:root chrome-sandbox && sudo chmod 4755 chrome-sandbox
```

---

## 5. Publicar la versión web (opcional)

La app es estática. Sirve la carpeta con cualquier hosting de archivos:

- **Sin servidor:** entrega `seraph-augeo-v3.html` y que lo abran con doble clic.
- **Con HTTP estático:** sube `seraph-augeo-v3.html` (o `index.html` + `assets/`)
  a GitHub Pages, Netlify, Vercel, Cloudflare Pages o un nginx cualquiera.

Nota: servida por HTTP, la app tiene un origen real (`https://…`), lo que mejora
la compatibilidad CORS frente a `file://`. Sigue sin haber backend.

Si publicas en un dominio, restringe las claves de IA por referrer en el panel
del proveedor cuando lo permita.

---

## 6. Firma de código (opcional, recomendado para distribución amplia)

Sin firma, los sistemas avisan:

- **Windows**: SmartScreen → «Más información» → «Ejecutar de todas formas».
- **macOS**: «no se puede abrir porque proviene de un desarrollador no
  identificado» → clic derecho → **Abrir** → **Abrir**. En macOS reciente también
  puede hacer falta `xattr -dr com.apple.quarantine "Seraph Augeo.app"`.

Para firmar de verdad:

- **Windows**: certificado de firma de código (EV o estándar) y variables
  `CSC_LINK` / `CSC_KEY_PASSWORD` antes de `npm run dist:win`.
- **macOS**: cuenta de Apple Developer, `identity` en la configuración `mac` de
  `desktop/package.json` y notarización con `notarytool`. Debe hacerse en macOS.

En Apple Silicon, si la `.app` se montó en Windows/Linux (sin `codesign`), macOS
puede decir que está dañada porque se rompió el sello de firma. Se arregla en el
propio Mac con:

```bash
codesign --force --deep --sign - "Seraph Augeo.app"
```

Nada de esto es obligatorio para uso propio o distribución interna.

---

## 7. Actualizar una versión

1. Cambia `version` en `desktop/package.json` y en `package.json` raíz.
2. `node build.mjs`.
3. `bash tests/run-all.sh`.
4. Recompila las plataformas (§3).
5. El progreso del usuario **no se pierde**: vive en `localStorage` del origen
   (navegador) o del perfil de Electron, y no depende del binario.

Las claves y perfiles de IA tampoco se pierden entre actualizaciones por la misma
razón.

---

## 8. Problemas de compilación

| Error | Causa | Solución |
|---|---|---|
| `EBUSY / EPERM: unlink '…\dist\win-unpacked.tmp\electron.exe'` | Antivirus o Explorer con el archivo abierto | Cierra la app, `rm -rf desktop/dist` y reintenta. Si persiste, excluye `desktop/dist` del antivirus o usa `@electron/packager` |
| Descarga de Electron falla | Red corporativa / proxy | Reintenta; o define `ELECTRON_MIRROR` |
| `electron-builder` no genera `.dmg` | Estás en Windows/Linux | Usa `npm run pack:mac` y comprime la `.app`, o compila en un Mac |
| La ventana abre en blanco | `seraph-augeo-v3.html` no estaba al empaquetar | Genera el HTML con `node build.mjs` y vuelve a compilar |
| `npm install` se queda colgado | Caché corrupta | `npm cache verify` y reintenta |

---

## 9. Checklist de entrega

- [ ] `node build.mjs` sin errores (22 archivos, ~4,1 MB)
- [ ] `bash tests/run-all.sh` en verde
- [ ] `SeraphAugeo-3.1.0-portable.exe` abierto y con la puerta de IA funcionando
- [ ] `SeraphAugeo-3.1.0-linux-x64.tar.gz`, `-mac-arm64.tar.gz` y `-mac-x64.tar.gz` generados
- [ ] `tar -tvzf` muestra `-rwxr-xr-x` en el ejecutable de cada paquete
- [ ] `docs/` y `README.md` incluidos en el paquete
- [ ] Copia del HTML único entregada junto a los binarios
