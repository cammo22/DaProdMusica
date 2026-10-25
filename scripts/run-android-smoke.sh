#!/usr/bin/env bash
# Preserve GPU thumbnails as each test completes, including on emulator failure.
set -uo pipefail
collect() {
  adb pull /sdcard/Android/data/io.github.cammo22.smoke/files/effect-previews native-smoke/ >/dev/null 2>&1 || true
  adb pull /sdcard/Android/data/io.github.cammo22.smoke/files/ui-captures native-smoke/ >/dev/null 2>&1 || true
}
gradle -p native-smoke connectedDebugAndroidTest --no-daemon --stacktrace &
runner=$!
(while kill -0 "$runner" 2>/dev/null; do collect; sleep 4; done) &
collector=$!
result=0
wait "$runner" || result=$?
kill "$collector" 2>/dev/null || true
wait "$collector" 2>/dev/null || true
collect
exit "$result"
