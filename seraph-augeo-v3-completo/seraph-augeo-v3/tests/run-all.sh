#!/usr/bin/env bash
# Ejecuta todas las pruebas de Seraph Augeo v3.
set -e
cd "$(dirname "$0")/.."
fail=0
for t in engine client smoke; do
  echo "──────── $t ────────"
  node "tests/$t.test.js" || fail=1
done
if [ "$fail" -ne 0 ]; then echo "Hay pruebas fallando."; exit 1; fi
echo "Todo en verde."
