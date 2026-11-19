#!/usr/bin/env bash
# ============================================================================
# Empaqueta Seraph Augeo para Linux y macOS desde Windows, sin depender de
# electron-packager: descarga el Electron de cada plataforma (con reanudación,
# útil con conexiones lentas) y monta la carpeta final en dist/.
#
#   bash pack-platforms.sh            # linux + macOS arm64 + macOS Intel
#   bash pack-platforms.sh linux      # sólo una plataforma
# ============================================================================
set -u
cd "$(dirname "$0")"

VER="$(node -p "require('./node_modules/electron/package.json').version")"
HTML="../seraph-augeo-v3.html"
OUT="dist"
VENDOR="vendor"
mkdir -p "$OUT" "$VENDOR"

if [ ! -f "$HTML" ]; then
  echo "Falta $HTML: ejecuta antes  node build.mjs  en la carpeta raíz."
  exit 1
fi

fetch_zip() { # plataforma arquitectura
  local p="$1" a="$2"
  local name="electron-v$VER-$p-$a.zip"
  local url="https://github.com/electron/electron/releases/download/v$VER/$name"
  [ -s "$VENDOR/$name" ] && unzip -tqq "$VENDOR/$name" >/dev/null 2>&1 && return 0
  echo "==> descargando $name"
  for i in $(seq 1 400); do
    curl -sSL -C - --max-time 2400 -o "$VENDOR/$name" "$url"
    if unzip -tqq "$VENDOR/$name" >/dev/null 2>&1; then
      echo "==> $name listo ($(du -h "$VENDOR/$name" | cut -f1))"
      return 0
    fi
    echo "   reintento $i"
    sleep 5
  done
  echo "!! no se pudo descargar $name"
  return 1
}

copia_app() { # carpeta de recursos
  local res="$1"
  rm -rf "$res/app"
  mkdir -p "$res/app"
  cp main.js preload.js package.json "$res/app/"
  cp "$HTML" "$res/app/seraph-augeo-v3.html"
  rm -f "$res/default_app.asar"
}

# Empaqueta con permisos y enlaces correctos (Windows pierde ambos al
# descomprimir el zip de Electron). Necesita python3; si no está, deja la carpeta.
comprime() { # carpeta  zip-destino  salida
  local dir="$1" zip="$2" out="$3"
  if command -v python >/dev/null 2>&1; then
    python pack-tar.py --pkg "$dir" ${zip:+--zip "$zip"} --out "dist/$out"
  elif command -v python3 >/dev/null 2>&1; then
    python3 pack-tar.py --pkg "$dir" ${zip:+--zip "$zip"} --out "dist/$out"
  else
    echo "   (sin python: comprime a mano con tar --mode='u+rwx,go+rx,o-w')"
  fi
}

build_linux() {
  fetch_zip linux x64 || return 1
  local dir="$OUT/Seraph Augeo-linux-x64"
  rm -rf "$dir"; mkdir -p "$dir"
  unzip -qq "$VENDOR/electron-v$VER-linux-x64.zip" -d "$dir"
  copia_app "$dir/resources"
  mv "$dir/electron" "$dir/Seraph Augeo"
  chmod +x "$dir/Seraph Augeo"
  echo "Linux  → $dir"
  comprime "Seraph Augeo-linux-x64" "" "SeraphAugeo-3.1.0-linux-x64.tar.gz"
}

build_mac() { # arquitectura
  local a="$1" dir
  fetch_zip darwin "$a" || return 1
  dir="$OUT/Seraph Augeo-darwin-$a"
  rm -rf "$dir"; mkdir -p "$dir"
  unzip -qq "$VENDOR/electron-v$VER-darwin-$a.zip" -d "$dir"
  mv "$dir/Electron.app" "$dir/Seraph Augeo.app"
  copia_app "$dir/Seraph Augeo.app/Contents/Resources"
  mv "$dir/Seraph Augeo.app/Contents/MacOS/Electron" "$dir/Seraph Augeo.app/Contents/MacOS/Seraph Augeo"
  local plist="$dir/Seraph Augeo.app/Contents/Info.plist"
  sed -i.bak \
    -e 's|<string>Electron</string>|<string>Seraph Augeo</string>|g' \
    -e 's|<string>com.github.Electron</string>|<string>com.seraphaugeo.desktop</string>|g' \
    "$plist" && rm -f "$plist.bak"
  # Sin firma válida, en Apple Silicon hay que re-firmar en el Mac:
  #   codesign --force --deep --sign - "Seraph Augeo.app"
  echo "macOS  → $dir"
  if [ "$a" = arm64 ]; then
    comprime "Seraph Augeo-darwin-arm64" "vendor/electron-v$VER-darwin-arm64.zip" "SeraphAugeo-3.1.0-mac-arm64.tar.gz"
  else
    comprime "Seraph Augeo-darwin-x64" "vendor/electron-v$VER-darwin-x64.zip" "SeraphAugeo-3.1.0-mac-x64.tar.gz"
  fi
}

case "${1:-todo}" in
  linux) build_linux ;;
  mac)   build_mac arm64; build_mac x64 ;;
  mac-arm) build_mac arm64 ;;
  mac-intel) build_mac x64 ;;
  *) build_linux; build_mac arm64; build_mac x64 ;;
esac
echo "==> terminado: $(date '+%H:%M:%S')"
