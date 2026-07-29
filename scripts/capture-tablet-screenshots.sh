#!/usr/bin/env bash
# Capture raw store screenshots via Maestro for a given platform/device.
# Usage: ./scripts/capture-tablet-screenshots.sh ios-ipad | android-tablet-7 | android-tablet-10
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MAESTRO="${MAESTRO_BIN:-maestro}"
OUT_BASE="${ROOT}/store-screenshots/raw/captures"
FLOWS="${ROOT}/store-screenshots/maestro"

usage() {
  echo "Usage: $0 ios-ipad | android-tablet-7 | android-tablet-10" >&2
  exit 1
}

copy_captures() {
  local src_dir="$1"
  local dest_dir="$2"
  mkdir -p "$dest_dir"
  for n in 01 02 03 04; do
    local found=""
    for f in "$src_dir"/"${n}".png "$src_dir"/s"${n}".png "$src_dir"/s"${n}"*.png "$src_dir"/*-"${n}".png "$src_dir"/"${n}"*.png; do
      if [[ -f "$f" ]]; then
        found="$f"
        break
      fi
    done
    if [[ -z "$found" ]]; then
      echo "Missing capture for ${n} in ${src_dir}" >&2
      ls -la "$src_dir" >&2 || true
      exit 1
    fi
    cp "$found" "${dest_dir}/${n}.png"
    echo "  ${dest_dir}/${n}.png"
  done
}

run_maestro() {
  local device_flag=("$@")
  local platform_dir="${MAESTRO_PLATFORM_DIR:-}"
  local flow_dir="$FLOWS"
  if [[ -n "$platform_dir" && -d "$FLOWS/$platform_dir" ]]; then
    flow_dir="$FLOWS/$platform_dir"
  fi
  local app_id="${MAESTRO_APP_ID:-com.itsryanthedev.whereip}"
  local stamp
  stamp="$(date +%s)"
  local work="${OUT_BASE}/.work-${stamp}"
  mkdir -p "$work"

  echo "==> Maestro: disclosure (02)"
  if [[ "$platform_dir" == "android" ]]; then
    adb shell pm clear "${app_id}" 2>/dev/null || true
    sleep 2
  fi
  "$MAESTRO" test "$flow_dir/02-disclosure.yaml" -e "APP_ID=${app_id}" "${device_flag[@]}" --output "$work/disclosure"

  echo "==> Maestro: result, provider, about (01, 03, 04)"
  if [[ "$platform_dir" == "android" ]]; then
    adb shell pm clear "${app_id}" 2>/dev/null || true
    sleep 2
  fi
  "$MAESTRO" test "$flow_dir/01-result-03-provider-04-about.yaml" -e "APP_ID=${app_id}" "${device_flag[@]}" --output "$work/session"

  # Maestro names files like 02.png or with timestamps; normalize below.
  mkdir -p "$work/merged"
  for n in 01 02 03 04; do
    found=""
    while IFS= read -r -d '' f; do
      found="$f"
    done < <(find "$work" -name "${n}.png" -o -name "s${n}.png" -print -quit 2>/dev/null | tr '\n' '\0')
    if [[ -z "$found" ]]; then
      while IFS= read -r -d '' f; do
        if [[ "$f" == *"${n}"* ]]; then
          found="$f"
          break
        fi
      done < <(find "$work" -type f -name "*.png" -print0)
    fi
    if [[ -n "$found" ]]; then
      cp "$found" "$work/merged/${n}.png"
    fi
  done

  rm -rf "$work/disclosure" "$work/session"
  echo "$work/merged"
}

case "${1:-}" in
  ios-ipad)
    export MAESTRO_APP_ID="${MAESTRO_APP_ID:-com.itsryanthedev.whereip}"
    DEVICE_NAME="${IOS_TABLET_SIM:-iPad Pro 13-inch (M5)}"
    DEST="${ROOT}/store-screenshots/public/screenshots/apple/ipad/en"
    RAW="${ROOT}/store-screenshots/raw/ios-ipad"
    mkdir -p "$DEST" "$RAW"
    echo "==> Booting ${DEVICE_NAME}"
    xcrun simctl boot "$DEVICE_NAME" 2>/dev/null || true
    open -a Simulator >/dev/null 2>&1 || true
    export MAESTRO_PLATFORM_DIR=ios
    merged="$(run_maestro --device "$DEVICE_NAME")"
    copy_captures "$merged" "$DEST"
    copy_captures "$merged" "$RAW"
    ;;
  android-tablet-7)
    export MAESTRO_APP_ID="${MAESTRO_APP_ID:-com.itsryanthedev.whereip}"
    AVD="${ANDROID_TABLET_7_AVD:-Tablet_7}"
    DEST="${ROOT}/store-screenshots/public/screenshots/android/tablet-7/en"
    RAW="${ROOT}/store-screenshots/raw/android-tablet-7"
    mkdir -p "$DEST" "$RAW"
    echo "==> Starting emulator ${AVD}"
    "${ANDROID_HOME:-$HOME/Library/Android/sdk}/emulator/emulator" -avd "$AVD" -no-snapshot-load -no-audio -no-boot-anim &
    EMU_PID=$!
    adb wait-for-device
    while [[ "$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" != "1" ]]; do sleep 2; done
    export MAESTRO_PLATFORM_DIR=android
    merged="$(run_maestro)"
    kill "$EMU_PID" 2>/dev/null || true
    copy_captures "$merged" "$DEST"
    copy_captures "$merged" "$RAW"
    ;;
  android-tablet-10)
    export MAESTRO_APP_ID="${MAESTRO_APP_ID:-com.itsryanthedev.whereip}"
    AVD="${ANDROID_TABLET_10_AVD:-Tablet_10}"
    DEST="${ROOT}/store-screenshots/public/screenshots/android/tablet-10/en"
    RAW="${ROOT}/store-screenshots/raw/android-tablet-10"
    mkdir -p "$DEST" "$RAW"
    echo "==> Starting emulator ${AVD}"
    "${ANDROID_HOME:-$HOME/Library/Android/sdk}/emulator/emulator" -avd "$AVD" -no-snapshot-load -no-audio -no-boot-anim &
    EMU_PID=$!
    adb wait-for-device
    while [[ "$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" != "1" ]]; do sleep 2; done
    export MAESTRO_PLATFORM_DIR=android
    merged="$(run_maestro)"
    kill "$EMU_PID" 2>/dev/null || true
    copy_captures "$merged" "$DEST"
    copy_captures "$merged" "$RAW"
    ;;
  *)
    usage
    ;;
esac

echo "==> Done: ${DEST}"
