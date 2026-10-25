#!/usr/bin/env bash
# Preserve GPU thumbnails as each test completes, including on emulator failure.
set -uo pipefail
collect() {
  adb pull /sdcard/Android/data/io.github.cammo22.smoke/files/effect-previews native-smoke/ >>native-smoke/artifact-copy.log 2>&1 || true
  adb pull /sdcard/Android/data/io.github.cammo22.smoke/files/ui-captures native-smoke/ >>native-smoke/artifact-copy.log 2>&1 || true
}
case "${SCENARIO:-native}" in
 native) test_class="io.github.cammo22.smoke.BackSmokeTest,io.github.cammo22.smoke.PlaybackSmokeTest,io.github.cammo22.smoke.UpdateSmokeTest,io.github.cammo22.smoke.WidgetFramesSmokeTest" ;;
 previews) test_class="io.github.cammo22.smoke.PlayerUiSmokeTest#directEffectsEntryAndAll22RealThumbnailsWorkInAndroidWebView" ;;
 effects) test_class="io.github.cammo22.smoke.PlayerUiSmokeTest#heldEffectButtonOpensATouchableModalAndReleaseDoesNotSelectACard" ;;
 sheet) test_class="io.github.cammo22.smoke.PlayerUiSmokeTest#settingsDismissOnBackdropAndPlayerFollowsFingerToTheBottom" ;;
 *) exit 2 ;;
esac
gradle -p native-smoke connectedDebugAndroidTest --no-daemon --stacktrace "-Pandroid.testInstrumentationRunnerArguments.class=$test_class" &
runner=$!
(while kill -0 "$runner" 2>/dev/null; do collect; sleep 4; done) &
collector=$!
result=0
wait "$runner" || result=$?
kill "$collector" 2>/dev/null || true
wait "$collector" 2>/dev/null || true
collect
exit "$result"
