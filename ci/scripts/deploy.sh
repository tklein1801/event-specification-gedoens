#!/bin/sh
set -eu
set +x

fail() {
  printf '%s\n' "$*" >&2
  exit 1
}

validate_arguments() {
  [ "$#" -eq 2 ] || fail "Usage: $0 DEPLOYMENT_DIRECTORY IMAGE@sha256:DIGEST"
  deployment_dir=$1
  image=$2

  case "$image" in
    *@sha256:*) repository=${image%@sha256:*}; digest=${image##*@sha256:} ;;
    *) fail "Image must be a complete sha256 digest reference" ;;
  esac
  [ "$repository" = ghcr.io/tklein1801/esg-webapp ] || fail "Invalid image repository"
  case "$digest" in
    *[!0-9a-f]*|'') fail "Invalid sha256 digest" ;;
  esac
  [ "${#digest}" -eq 64 ] || fail "Invalid sha256 digest length"
}

check_requirements() {
  command -v docker >/dev/null 2>&1 || fail "Docker is required"
  docker compose version >/dev/null 2>&1 || fail "Docker Compose is required"
  compose_up_help=$(docker compose up --help) || fail "Cannot inspect Docker Compose up options"
  printf '%s\n' "$compose_up_help" | grep -Eq '(^|[[:space:],])--wait([[:space:],=]|$)' || fail "Docker Compose must support up --wait"
  printf '%s\n' "$compose_up_help" | grep -Eq '(^|[[:space:],])--wait-timeout([[:space:],=]|$)' || fail "Docker Compose must support up --wait-timeout"
  docker info >/dev/null 2>&1 || fail "Docker daemon is unavailable"
  [ -d "$deployment_dir" ] || fail "Deployment directory does not exist: $deployment_dir"
  cd "$deployment_dir" || fail "Cannot enter deployment directory"
  [ -f compose.next.yml ] && [ -r compose.next.yml ] || fail "Readable compose.next.yml is required"
  [ ! -e .env ] || [ -r .env ] || fail "Cannot read .env"
}

compose() {
  docker compose --project-directory "$project_dir" -p "$project_name" -f "$@"
}

cleanup() {
  set +e
  cleanup_failed=0
  [ -z "$temp_file" ] || rm -f "$temp_file"
  [ -z "$backup_file" ] || rm -f "$backup_file"
  if [ -n "$docker_config_dir" ]; then
    rm -f "$docker_config_dir/config.json" || { printf '%s\n' "Cannot remove temporary Docker credentials: $docker_config_dir" >&2; cleanup_failed=1; }
    rm -f "$docker_config_dir/contexts" || cleanup_failed=1
    rmdir "$docker_config_dir" || { printf '%s\n' "Cannot remove temporary Docker directory: $docker_config_dir" >&2; cleanup_failed=1; }
  fi
  rmdir .deploy.lock
  [ "$cleanup_failed" -eq 0 ] || exit 1
}

initialize_deployment() {
  # Both Compose files must use the same project name.
  project_dir=$(pwd -P)
  project_hash=$(printf '%s' "$project_dir" | cksum)
  project_hash=${project_hash%% *}
  project_name="tklein-it-$project_hash"

  mkdir .deploy.lock 2>/dev/null || fail "Deployment is already running or .deploy.lock cannot be created"
  temp_file=
  backup_file=
  docker_config_dir=
  trap cleanup 0
  trap 'exit 1' HUP INT TERM
  temp_file=$(mktemp .deploy-image.XXXXXX) || fail "Cannot create deployment state file"
  export WEBAPP_TAG="@sha256:$digest"
}

validate_compose() {
  services=$(compose compose.next.yml config --services) || fail "Cannot inspect Compose services"
  [ "$services" = web ] || fail "Compose configuration must contain only the web service"
  configured_image=$(compose compose.next.yml config --images) || fail "Cannot inspect Compose images"
  [ "$configured_image" = "$image" ] || fail "Compose image does not match the requested digest"
}

backup_current_deployment() {
  previous_image=
  if [ -f compose.yml ]; then
    container=$(compose compose.yml ps --all -q web) || fail "Cannot inspect current service"
    if [ -n "$container" ]; then
      image_id=$(docker inspect --format '{{.Image}}' "$container") || fail "Cannot inspect current image"
      image_digests=$(docker image inspect --format '{{range .RepoDigests}}{{println .}}{{end}}' "$image_id") || fail "Cannot inspect current image digests"
      previous_image=$(printf '%s\n' "$image_digests" | grep '^ghcr\.io/tklein1801/esg-webapp@sha256:' | head -n 1) || :
    elif [ -f .deploy-image ]; then
      IFS= read -r previous_image < .deploy-image || fail "Cannot read previous image"
    fi
    case "$previous_image" in
      ghcr.io/tklein1801/esg-webapp@sha256:*)
        previous_digest=${previous_image#*@sha256:}
        case "$previous_digest" in *[!0-9a-f]*|'') fail "Invalid previous image digest" ;; esac
        [ "${#previous_digest}" -eq 64 ] || fail "Invalid previous image digest length" ;;
      *) fail "Cannot determine previous image digest; running service was not changed" ;;
    esac
    docker image inspect "$previous_image" >/dev/null 2>&1 || fail "Previous image is not available locally; running service was not changed"
    backup_file=$(mktemp .compose-backup.XXXXXX) || fail "Cannot create Compose backup"
    cp compose.yml "$backup_file" || fail "Cannot back up Compose configuration"
  fi
}

service_is_healthy() {
  container=$(compose "$1" ps -q web) || return 1
  [ -n "$container" ] || return 1
  status=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{end}}' "$container") || return 1
  [ "$status" = healthy ]
}

rollback() {
  if [ -n "$previous_image" ] && [ -f compose.yml ]; then
    printf '%s\n' "Restoring previous image: $previous_image" >&2
    case "$previous_image" in
      ghcr.io/tklein1801/esg-webapp@sha256:*)
        previous_tag=${previous_image#ghcr.io/tklein1801/esg-webapp} ;;
      *) printf '%s\n' "Cannot roll back an unexpected image: $previous_image" >&2; return 1 ;;
    esac
    if ! WEBAPP_TAG="$previous_tag" compose compose.yml up -d --no-deps --pull never --wait --wait-timeout 60 web ||
       ! WEBAPP_TAG="$previous_tag" service_is_healthy compose.yml; then
      printf '%s\n' "Rollback failed; manual intervention is required" >&2
    fi
  else
    printf '%s\n' "No previous Compose configuration and image are available for rollback" >&2
  fi
}

pull_image() {
  if [ -n "${DOCKER_HOST:-}" ] && [ -z "${DOCKER_CONTEXT:-}" ]; then
    DOCKER_CONFIG="$docker_config_dir" docker pull "$image" || fail "Image pull failed; running service was not changed"
  else
    DOCKER_CONFIG="$docker_config_dir" DOCKER_CONTEXT="$docker_context" docker pull "$image" || fail "Image pull failed; running service was not changed"
  fi
}

login_registry() {
  [ -d .registry-credentials ] && [ ! -L .registry-credentials ] || fail "Registry credentials directory is required"
  [ -f .registry-credentials/username ] && [ -r .registry-credentials/username ] || fail "Readable registry username is required"
  [ -f .registry-credentials/password ] && [ -r .registry-credentials/password ] || fail "Readable registry password is required"
  registry_username=$(cat .registry-credentials/username) || fail "Cannot read registry username"
  [ -n "$registry_username" ] || fail "Registry username is empty"
  docker_context=$(docker context show) || fail "Cannot inspect Docker context"
  umask 077
  docker_config_dir=$(mktemp -d) || fail "Cannot create Docker configuration directory"
  original_docker_config=${DOCKER_CONFIG:-${HOME:?HOME is required}/.docker}
  case "$original_docker_config" in
    /*) ;;
    *) original_docker_config="$project_dir/$original_docker_config" ;;
  esac
  if [ -d "$original_docker_config/contexts" ]; then
    ln -s "$original_docker_config/contexts" "$docker_config_dir/contexts" || fail "Cannot preserve Docker contexts"
  fi
  docker_binary=$(command -v docker)
  docker_binary=$(CDPATH= cd "$(dirname "$docker_binary")" && pwd -P)/$(basename "$docker_binary")
  # Prevent Docker from discovering a host credential helper.
  DOCKER_CONFIG="$docker_config_dir" PATH="$docker_config_dir" "$docker_binary" login ghcr.io --username "$registry_username" --password-stdin < .registry-credentials/password >/dev/null 2>&1 || fail "Registry login failed; running service was not changed"
}

start_and_wait() {
  trap 'rollback; exit 1' HUP INT TERM
  if ! compose compose.next.yml up -d --no-deps --pull never --wait --wait-timeout 60 web; then
    rollback
    fail "Deployment failed"
  fi
  if ! service_is_healthy compose.next.yml; then
    rollback
    fail "Service did not become healthy"
  fi
}

restore_compose_backup() {
  if [ -n "$backup_file" ]; then
    if mv -f "$backup_file" compose.yml; then
      backup_file=
      rollback
    else
      printf '%s\n' "Cannot restore Compose configuration; backup retained at $backup_file" >&2
      backup_file=
    fi
  else
    printf '%s\n' "No previous Compose configuration is available for rollback" >&2
  fi
}

save_deployment() {
  # Promote Compose only after health succeeds, then atomically save the image state.
  if ! printf '%s\n' "$image" > "$temp_file"; then
    rollback
    fail "Cannot prepare deployed image state"
  fi
  # Finish the state change before reporting an interrupted deployment.
  interrupted=false
  trap 'interrupted=true' HUP INT TERM
  if ! mv -f compose.next.yml compose.yml; then
    rollback
    fail "Cannot promote Compose configuration"
  fi
  if ! mv -f "$temp_file" .deploy-image; then
    restore_compose_backup
    fail "Cannot save deployed image"
  fi
  temp_file=
  trap 'exit 1' HUP INT TERM
  [ "$interrupted" = false ] || fail "Deployment completed, but was interrupted during state promotion"
  printf '%s\n' "Deployment healthy: $image"
}

validate_arguments "$@"
check_requirements
initialize_deployment
validate_compose
backup_current_deployment
login_registry
pull_image
start_and_wait
save_deployment
