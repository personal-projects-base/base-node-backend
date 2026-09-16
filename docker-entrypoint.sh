#!/bin/sh
set -eu

case "${PRISMA_DEPLOY_MODE:-push}" in
  push)
    npx prisma db push
    ;;
  migrate)
    npx prisma migrate deploy
    ;;
  none)
    ;;
  *)
    echo "PRISMA_DEPLOY_MODE deve ser push, migrate ou none." >&2
    exit 1
    ;;
esac

exec "$@"
