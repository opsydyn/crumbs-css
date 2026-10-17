module.exports = function (api) {
  api.cache(true)
  return {
    presets: [require("expo/internal/babel-preset")],
    // This legacy dependency contains Flow without an @flow pragma. Expo's Rust
    // detector cannot recognize it; explicit Flow parsing selects Babel per file.
    overrides: [{
      test: filename => typeof filename === "string" && /[/\\]react-native-modal-datetime-picker[/\\]src[/\\].*\.js$/.test(filename),
      parserOpts: { plugins: [["flow", { all: true }]] },
    }],
  }
}
