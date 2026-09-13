#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

show_help() {
  cat <<'EOF'
Gera o ZIP da versão publicada (compose sem build, scripts e checksum).

Uso:
  ./setup.sh pack-release [--output-dir DIRETORIO] [--version X.Y.Z]

O arquivo vai para dist/ por padrão. As imagens Docker são publicadas
pelo workflow de release no GHCR; este comando só empacota o instalador.
EOF
}

if [[ "${1:-}" == "--description" ]]; then
  printf 'Empacota o ZIP da release publicada'
  exit 0
fi

output_dir=""
version=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --output-dir)
      [[ $# -ge 2 ]] || die "--output-dir exige um diretório"
      output_dir="$2"
      shift
      ;;
    --version)
      [[ $# -ge 2 ]] || die "--version exige X.Y.Z"
      version="$2"
      shift
      ;;
    -h|--help) show_help; exit 0 ;;
    *) die "opção desconhecida para pack-release: $1" ;;
  esac
  shift
done

require_command python
cd "$ROOT_DIR"
pack_args=( "${SCRIPT_DIR}/pdl_release.py" pack )
[[ -n "$output_dir" ]] && pack_args+=(--output-dir "$output_dir")
[[ -n "$version" ]] && pack_args+=(--version "$version")
python "${pack_args[@]}"
success "Pacote de release gerado."
