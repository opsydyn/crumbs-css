// Shared with the admission tests. Missing or malformed native evidence must fail.
var match = /^Scroll probe: y=(\d+) first=(\d+) viewport=(\d+) content=(\d+)\s+Touch: starts=(\d+) moves=(\d+) ends=(\d+) drags=(\d+)$/.exec(maestro.copiedText)
if (!match) throw new Error("Missing or malformed native scroll probe")
var keys = ["y", "first", "viewport", "content", "starts", "moves", "ends", "drags"]
var probe = {}
for (var index = 0; index < keys.length; index++) {
  var value = Number(match[index + 1])
  if (!isFinite(value) || value > 9007199254740991) throw new Error("Unsafe native scroll measurement")
  probe[keys[index]] = value
}
if (probe.first < 1 || probe.first > 1000 || probe.viewport < 1) throw new Error("Invalid native scroll geometry or row identity")
output.probe = probe
console.log("CRUMBS_NATIVE_SCROLL " + JSON.stringify(probe))
