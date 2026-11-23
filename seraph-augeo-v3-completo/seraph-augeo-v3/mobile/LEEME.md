# Seraph Augeo · Móvil

El mismo motor, la misma interfaz y la misma puerta de la IA, en el teléfono.
No hay servidor: el APK lleva dentro el HTML autocontenido
(`seraph-augeo-v3.html`) y lo abre en un `WebView`.

```
mobile/
├── android/
│   ├── AndroidManifest.xml        Paquete com.seraphaugeo.app, minSdk 24, target 36
│   ├── java/…/MainActivity.java   WebView a pantalla completa, sin puente nativo
│   └── res/                        Icono (5 densidades) y tema oscuro del abismo
├── build-android.sh               Compila y firma el APK sin Gradle
├── keystore/seraph-augeo.jks      Clave de firma de sideload (ver abajo)
├── build/                         Temporales (ignorado por git)
└── dist/                          APK final (ignorado por git)
```

## Compilar

Requisitos: JDK 17 o superior y Android SDK con `build-tools` y
`platforms/android-36`. El script busca el SDK en `ANDROID_HOME`,
`ANDROID_SDK_ROOT` o `%LOCALAPPDATA%\Android\Sdk`, y el JDK en `JAVA_HOME`,
en `.tools/jdk-*` de la raíz del repositorio o en el `PATH`.

```bash
cd seraph-augeo-v3-completo/seraph-augeo-v3
node build.mjs                  # regenera seraph-augeo-v3.html
bash mobile/build-android.sh    # deja mobile/dist/SeraphAugeo-<versión>-android.apk
```

El script encadena `aapt2 compile/link`, `javac`, `d8`, empaquetado del
`classes.dex`, `zipalign` y `apksigner`. Si has tocado el HTML, acuérdate de
recompilarlo antes: el APK no lo genera él.

Para cambiar la versión, edita `android:versionCode` y `android:versionName`
en `android/AndroidManifest.xml`; el nombre del APK se deriva del segundo.

## Detalles del envoltorio

- La página se carga desde `file:///android_asset/index.html` con
  `allowUniversalAccessFromFileURLs`, así que las llamadas de IA (nube y
  proveedores locales como Ollama en `localhost`) no chocan con CORS, igual
  que en escritorio las hace el proceso principal de Electron.
- `domStorageEnabled` mantiene el progreso y las claves de IA en el
  `localStorage` del WebView, entre sesiones.
- `usesCleartextTraffic` permite hablar con proveedores locales por `http://`.
- Si no hay ajuste de barras por `WindowInsets` (Android 9 o anterior), el
  WebView respeta los márgenes del sistema con `fitsSystemWindows`.

## Firma

`keystore/seraph-augeo.jks` (alias `seraph`, contraseña `seraph-augeo`) es una
clave **de sideload**, no de Play Store. Se versiona a propósito: si cambia, el
teléfono rechaza instalar una actualización encima de la anterior. No sirve
para publicar en Google Play, que exige su propia clave y un `.aab`.

El APK no está en Google Play: se descarga de la Release y se instala
permitiendo «Instalar apps desconocidas» para el navegador o el gestor de
archivos.

## iOS

Compilar un `.ipa` exige macOS con Xcode (y una cuenta de desarrollador para
instalarlo en un iPhone). Desde Windows no hay forma de producirlo. Mientras
tanto, en iPhone y iPad la app se instala como aplicación web:

1. Abre la versión web de Seraph Augeo en **Safari**.
2. Comparte → **Añadir a pantalla de inicio**.

El `manifest.webmanifest` y las etiquetas `apple-mobile-web-app-*` ya están
puestos, así que arranca a pantalla completa y con su icono.
