#!/usr/bin/env bash
# ---------------------------------------------------------------------------
#  Compila el APK de Seraph Augeo sin Gradle: aapt2 + javac + d8 + apksigner.
#
#  Uso:  bash mobile/build-android.sh
#
#  Necesita:
#    · JDK 17 o superior a mano (JAVA_HOME, o un JDK en .tools/, o java en PATH)
#    · Android SDK con build-tools y platforms/android-36 (ANDROID_HOME,
#      ANDROID_SDK_ROOT o %LOCALAPPDATA%\Android\Sdk)
#
#  El HTML se toma de ../seraph-augeo-v3.html, así que compílalo antes con
#  `node build.mjs` si has tocado el código.
# ---------------------------------------------------------------------------
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
APP="$(cd "$HERE/.." && pwd)"
MANIFEST="$HERE/android/AndroidManifest.xml"
OUT="$HERE/dist"
BUILD="$HERE/build"
VERSION_NAME="$(sed -n 's/.*android:versionName="\([^"]*\)".*/\1/p' "$MANIFEST")"
APK_NAME="SeraphAugeo-${VERSION_NAME}-android.apk"

say() { printf '\n== %s\n' "$1"; }

# Las herramientas de Android/JDK son ejecutables de Windows: en Git Bash hay que
# entregarles rutas nativas (C:\...) o parten los caminos por la mitad.
# En forma corta (PROGRA~1) para que los espacios del camino no partan el argumento.
if command -v cygpath >/dev/null 2>&1; then
  WIN() {
    local short
    if short=$(cygpath -d -w "$1" 2>/dev/null); then printf '%s' "$short"; return; fi
    # El archivo aún no existe: forma corta de la carpeta + nombre.
    printf '%s\\%s' "$(cygpath -d -w "$(dirname "$1")")" "$(basename "$1")"
  }
else
  WIN() { printf '%s' "$1"; }
fi

# --- SDK --------------------------------------------------------------------
SDK="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-$LOCALAPPDATA/Android/Sdk}}"
if [ ! -d "$SDK" ]; then
  echo "No encuentro el Android SDK. Define ANDROID_HOME." >&2
  exit 1
fi
[ -d "$SDK/build-tools" ] || { echo "Al SDK le falta build-tools." >&2; exit 1; }

BT_VERSION="${BT_VERSION:-36.1.0}"
[ -d "$SDK/build-tools/$BT_VERSION" ] || BT_VERSION="$(ls "$SDK/build-tools" | sort -V | tail -1)"
BT="$SDK/build-tools/$BT_VERSION"
PLATFORM="${PLATFORM:-android-36}"
[ -d "$SDK/platforms/$PLATFORM" ] || PLATFORM="$(ls "$SDK/platforms" | grep '^android-[0-9.]*$' | sort -V | tail -1)"
ANDROID_JAR="$SDK/platforms/$PLATFORM/android.jar"
[ -f "$ANDROID_JAR" ] || { echo "Falta $ANDROID_JAR" >&2; exit 1; }

# --- JDK --------------------------------------------------------------------
have_java() { [ -n "$1" ] && { [ -x "$1/bin/java" ] || [ -x "$1/bin/java.exe" ]; }; }
if ! have_java "${JAVA_HOME:-}"; then
  for candidate in "$HERE"/../../.tools/jdk-* "$APP"/../../.tools/jdk-* "$HERE/.jdk"/*; do
    if have_java "$candidate"; then
      export JAVA_HOME="$candidate"
      break
    fi
  done
fi
if [ -n "${JAVA_HOME:-}" ] && { [ -x "$JAVA_HOME/bin/java" ] || [ -x "$JAVA_HOME/bin/java.exe" ]; }; then
  JAVA="$JAVA_HOME/bin/java"
  JAVAC="$JAVA_HOME/bin/javac"
  KEYTOOL="$JAVA_HOME/bin/keytool"
else
  JAVA="$(command -v java || true)"
  JAVAC="$(command -v javac || true)"
  KEYTOOL="$(command -v keytool || true)"
fi
if [ -z "$JAVA" ] || [ -z "$JAVAC" ]; then
  echo "No encuentro un JDK (17+). Define JAVA_HOME." >&2
  exit 1
fi

say "SDK $BT_VERSION · plataforma $PLATFORM · versión $VERSION_NAME"

# --- Espacio de trabajo -----------------------------------------------------
rm -rf "$BUILD"
mkdir -p "$BUILD/assets" "$BUILD/res-flat" "$BUILD/classes" "$BUILD/dex" "$BUILD/gen" "$OUT"

HTML="$APP/seraph-augeo-v3.html"
[ -f "$HTML" ] || { echo "Falta $HTML; ejecuta antes: node build.mjs" >&2; exit 1; }
cp "$HTML" "$BUILD/assets/index.html"

# --- Recursos ---------------------------------------------------------------
say "Recursos (aapt2)"
"$BT/aapt2" compile --dir "$HERE/android/res" -o "$BUILD/res-flat"

# Los .flat propios van como argumentos posicionales; -R está reservado a overlays.
RES_ARGS=()
while IFS= read -r f; do RES_ARGS+=("$f"); done < <(find "$BUILD/res-flat" -name '*.flat' | sort)

"$BT/aapt2" link \
  -o "$(WIN "$BUILD/base.apk")" \
  -I "$(WIN "$ANDROID_JAR")" \
  --manifest "$(WIN "$MANIFEST")" \
  --min-sdk-version 24 \
  --target-sdk-version "${PLATFORM#android-}" \
  --java "$(WIN "$BUILD/gen")" \
  -A "$(WIN "$BUILD/assets")" \
  "${RES_ARGS[@]}"

# --- Java -------------------------------------------------------------------
# javac y d8 son ejecutables de Windows: se compila en una carpeta temporal con
# camino corto y sin espacios, y de ahí sale sólo el classes.dex.
say "Java (javac)"
WORK_REAL="$(mktemp -d)"
WORK="$(cd "$WORK_REAL" && { cygpath -m "$PWD" 2>/dev/null || printf '%s' "$PWD"; })"
trap 'rm -rf "$WORK_REAL"' EXIT

mkdir -p "$WORK_REAL/src/com/seraphaugeo/app" "$WORK_REAL/classes" "$WORK_REAL/dex"
cp -r "$HERE/android/java/." "$WORK_REAL/src/"
if [ -f "$BUILD/gen/com/seraphaugeo/app/R.java" ]; then
  cp "$BUILD/gen/com/seraphaugeo/app/R.java" "$WORK_REAL/src/com/seraphaugeo/app/R.java"
fi

SRC_LIST="$WORK_REAL/sources.txt"
: > "$SRC_LIST"
while IFS= read -r f; do printf '%s\r\n' "$WORK/${f#"$WORK_REAL/"}"; done \
  < <(find "$WORK_REAL/src" -name '*.java' | sort) >> "$SRC_LIST"

"$JAVAC" -nowarn -encoding UTF-8 \
  -classpath "$(cygpath -m "$ANDROID_JAR")" \
  -d "$WORK/classes" \
  "@$(cygpath -m "$SRC_LIST")"

CLASS_ARGS=()
while IFS= read -r f; do CLASS_ARGS+=("$WORK/${f#"$WORK_REAL/"}"); done \
  < <(find "$WORK_REAL/classes" -name '*.class' | sort)

say "Dex (d8)"
"$JAVA" -cp "$(cygpath -m "$BT/lib/d8.jar")" com.android.tools.r8.D8 \
  --min-api 24 \
  --lib "$(cygpath -m "$ANDROID_JAR")" \
  --output "$WORK/dex" \
  "${CLASS_ARGS[@]}"

cp "$WORK_REAL/dex/classes.dex" "$BUILD/dex/classes.dex"

# --- Empaquetar el dex dentro del APK ---------------------------------------
say "Empaquetando"
cp "$BUILD/base.apk" "$BUILD/unsigned.apk"
python - "$BUILD/unsigned.apk" "$BUILD/dex/classes.dex" <<'PY'
import sys, zipfile
apk, dex = sys.argv[1], sys.argv[2]
with zipfile.ZipFile(apk, "a", zipfile.ZIP_DEFLATED) as z:
    z.write(dex, "classes.dex")
PY

# --- Firmar -----------------------------------------------------------------
say "Firmando"
KEYSTORE="$HERE/keystore/seraph-augeo.jks"
KEY_ALIAS="seraph"
STORE_PASS="seraph-augeo"
if [ ! -f "$KEYSTORE" ]; then
  mkdir -p "$(dirname "$KEYSTORE")"
  "$KEYTOOL" -genkeypair -v \
    -keystore "$KEYSTORE" \
    -alias "$KEY_ALIAS" \
    -keyalg RSA -keysize 2048 -validity 10000 \
    -storepass "$STORE_PASS" -keypass "$STORE_PASS" \
    -dname "CN=Seraph Augeo, OU=Sideload, O=Seraph Augeo, L=, ST=, C=ES" >/dev/null
fi

"$BT/zipalign" -f -p 4 "$BUILD/unsigned.apk" "$BUILD/aligned.apk"
"$JAVA" -jar "$(WIN "$BT/lib/apksigner.jar")" sign \
  --ks "$(WIN "$KEYSTORE")" \
  --ks-key-alias "$KEY_ALIAS" \
  --ks-pass "pass:$STORE_PASS" \
  --key-pass "pass:$STORE_PASS" \
  --min-sdk-version 24 \
  --out "$(WIN "$OUT/$APK_NAME")" \
  "$(WIN "$BUILD/aligned.apk")"

"$JAVA" -jar "$(WIN "$BT/lib/apksigner.jar")" verify --print-certs "$OUT/$APK_NAME" | head -6

say "Listo"
ls -la "$OUT/$APK_NAME"
printf 'APK: %s (%s bytes)\n' "$OUT/$APK_NAME" "$(stat -c %s "$OUT/$APK_NAME" 2>/dev/null || wc -c < "$OUT/$APK_NAME")"
