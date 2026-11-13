#!/bin/sh
set -eu

staging=$1
project=$2
version=$3
registry=$4
unset IMAGE_TAG

touch .env
printf 'IMAGE_TAG=%s\n' "$version" > "$staging/image.env"
compose() {
  docker compose --project-directory "$PWD" -p "$project" \
    --env-file .env --env-file "$staging/image.env" \
    -f "$staging/compose.next.yml" "$@"
}
compose config -q
if [ -s "$staging/username" ]; then
  DOCKER_CONFIG="$PWD/$staging/docker-config"
  export DOCKER_CONFIG
  mkdir "$DOCKER_CONFIG"
  docker login "$registry" --username "$(cat "$staging/username")" \
    --password-stdin < "$staging/password"
fi
compose pull
compose up -d --wait
mv "$staging/compose.next.yml" compose.yml
mv "$staging/image.env" .deploy-image.env
