#!/usr/bin/env bash
# Genera un certificado TLS autofirmado con SAN para HTTPS local (LAN).
#
# Uso:
#   bash generate-cert.sh [IP_LAN]
#
# Ejemplos:
#   bash generate-cert.sh              # solo localhost / 127.0.0.1
#   bash generate-cert.sh 192.168.2.3  # + IP de tu LAN

set -e

IP="${1:-}"

CERT_DIR="$(cd "$(dirname "$0")" && pwd)/certs"
mkdir -p "$CERT_DIR"

# ── Construir bloque alt_names ─────────────────────────────────────────────
ALT_NAMES="DNS.1 = localhost\nIP.1 = 127.0.0.1"
if [ -n "$IP" ]; then
  ALT_NAMES="${ALT_NAMES}\nIP.2 = ${IP}"
fi

# ── Archivo de configuración openssl ──────────────────────────────────────
printf "[req]\ndefault_bits = 2048\nprompt = no\ndefault_md = sha256\ndistinguished_name = dn\nx509_extensions = v3_req\n\n[dn]\nCN = RinkBot Local\n\n[v3_req]\nsubjectAltName = @alt_names\nkeyUsage = digitalSignature, keyEncipherment\nextendedKeyUsage = serverAuth\n\n[alt_names]\n${ALT_NAMES}\n" \
  > "$CERT_DIR/openssl.cnf"

# ── Generar clave y certificado (365 días) ────────────────────────────────
openssl req -x509 \
  -newkey rsa:2048 \
  -keyout "$CERT_DIR/server.key" \
  -out    "$CERT_DIR/server.crt" \
  -days   365 \
  -nodes \
  -config "$CERT_DIR/openssl.cnf"

echo ""
echo "Certificado generado en: $CERT_DIR"
echo "  server.key  — clave privada (NO compartir)"
echo "  server.crt  — certificado  (instalar en los PCs clientes)"
echo ""
if [ -n "$IP" ]; then
  echo "Valido para: https://localhost  y  https://${IP}"
else
  echo "Valido para: https://localhost  y  https://127.0.0.1"
fi
echo ""
echo "Para instalar el certificado en Windows (PC cliente):"
echo "  1. Copia server.crt al PC cliente"
echo "  2. Doble clic → Instalar certificado"
echo "  3. Almacen: Entidades de certificacion raiz de confianza"
echo "  4. Reinicia Chrome"
