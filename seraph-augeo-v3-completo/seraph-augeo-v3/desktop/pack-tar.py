#!/usr/bin/env python3
"""
Empaqueta en tar.gz una carpeta montada en Windows conservando lo que Windows
pierde: el bit de ejecución y los enlaces simbólicos de la .app de macOS.

Uso:
    python pack-tar.py --pkg "Seraph Augeo-darwin-arm64" \
        --zip vendor/electron-v38.8.6-darwin-arm64.zip \
        --out dist/SeraphAugeo-3.1.0-mac-arm64.tar.gz

Sin --zip se empaqueta la carpeta tal cual (Linux): sólo se aplican permisos.
Los enlaces se leen del zip de Electron (su contenido es el destino) y se
reescriben al nombre final de la app.
"""

import argparse
import os
import sys
import tarfile
import zipfile

ORIGEN_APP = "Electron.app/"
DESTINO_APP = "Seraph Augeo.app/"


def enlaces_del_zip(zip_path):
    """{ruta_relativa: destino} de cada entrada que el zip marca como symlink."""
    enlaces = {}
    with zipfile.ZipFile(zip_path) as zf:
        for info in zf.infolist():
            modo = (info.external_attr >> 16) & 0o170000
            if modo != 0o120000:  # S_IFLNK
                continue
            destino = zf.read(info).decode("utf-8").strip()
            ruta = info.filename.replace(ORIGEN_APP, DESTINO_APP)
            enlaces[ruta] = destino
    return enlaces


def permisos(rel):
    """Directorios y ejecutables 755; el resto, 644."""
    if rel.endswith("/"):
        return 0o755
    nombre = os.path.basename(rel)
    ejecutable = (
        "/Contents/MacOS/" in rel
        or "/MacOS/" in rel
        or rel.endswith(".sh")
        or nombre in {"Seraph Augeo", "chrome-sandbox", "chrome_crashpad_handler"}
        or "/Versions/A/" in rel
        and "." not in nombre
    )
    return 0o755 if ejecutable else 0o644


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pkg", required=True, help='carpeta dentro de dist/, p. ej. "Seraph Augeo-linux-x64"')
    ap.add_argument("--dist", default="dist")
    ap.add_argument("--zip", help="zip de Electron del que salieron los enlaces")
    ap.add_argument("--out", required=True)
    args = ap.parse_args()

    raiz = os.path.join(args.dist, args.pkg)
    if not os.path.isdir(raiz):
        sys.exit("No existe la carpeta %s" % raiz)

    enlaces = enlaces_del_zip(args.zip) if args.zip else {}
    escritos = 0
    puestos = set()

    with tarfile.open(args.out, "w:gz", compresslevel=6) as tf:
        for base, dirs, archivos in os.walk(raiz):
            dirs.sort()
            for nombre in sorted(dirs) + sorted(archivos):
                completo = os.path.join(base, nombre)
                rel = os.path.relpath(completo, raiz).replace(os.sep, "/")
                arcname = "%s/%s" % (args.pkg, rel)
                if os.path.isdir(completo):
                    ti = tf.gettarinfo(completo, arcname)
                    ti.mode = 0o755
                    tf.addfile(ti)
                    continue
                if rel in enlaces:
                    puestos.add(arcname)
                    ti = tarfile.TarInfo(arcname)
                    ti.type = tarfile.SYMTYPE
                    ti.linkname = enlaces[rel]
                    ti.mode = 0o777
                    ti.mtime = 0
                    tf.addfile(ti)
                    escritos += 1
                    continue
                ti = tf.gettarinfo(completo, arcname)
                ti.mode = permisos("/" + rel)
                with open(completo, "rb") as fh:
                    tf.addfile(ti, fh)

        # Enlaces que Windows no pudo crear al descomprimir el zip.
        for rel, destino in sorted(enlaces.items()):
            arcname = "%s/%s" % (args.pkg, rel)
            if arcname in puestos:
                continue
            ti = tarfile.TarInfo(arcname)
            ti.type = tarfile.SYMTYPE
            ti.linkname = destino
            ti.mode = 0o777
            ti.mtime = 0
            tf.addfile(ti)
            escritos += 1

    tam = os.path.getsize(args.out)
    print("%s  (%.0f MB, %d enlaces)" % (args.out, tam / 1048576.0, escritos))


if __name__ == "__main__":
    main()
