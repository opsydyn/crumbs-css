#!/bin/sh
export JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home
export ANDROID_HOME=/private/tmp/crumbs-m110b-20261016/android-sdk
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export ANDROID_AVD_HOME=/private/tmp/crumbs-m110b-20261016/avd
export PATH="$ANDROID_HOME/platform-tools:$PATH"
exec caffeinate -is /Users/alancurrie/.codex/worktrees/crumbs-main-merge/crumbs-css/.superpowers/tools/m11-3-native/maestro/bin/maestro --host 127.0.0.1 --port 5581 -p android "$@"
