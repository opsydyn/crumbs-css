from pathlib import Path
import gzip, hashlib, json, math, re, statistics

ROOT = Path(__file__).resolve().parent
q = json.loads((ROOT / "qualification.json").read_text())
manifest = json.loads((ROOT / "archive-manifest.json").read_text())
source = json.loads((ROOT / "source-inventory.json").read_text())
assert source["before"] == source["after"]
assert q["sourceInventory"]["status"] == "passed"
assert len(manifest["rawReports"]) == 124 and len(manifest["receipts"]) == 128

def bytes_for(item):
    data = (ROOT / item["path"]).read_bytes()
    assert len(data) == item["bytes"] and hashlib.sha256(data).hexdigest() == item["sha256"], item["path"]
    return data

raw = {}
for item in manifest["rawReports"]:
    data = bytes_for(item)
    raw[item["name"]] = json.loads(gzip.decompress(data))
for item in manifest["receipts"]:
    data = gzip.decompress(bytes_for(item))
    match = re.fullmatch(r"(?:source|inputs|metadata|result)-([a-f0-9]{64})\.json\.gz", Path(item["path"]).name)
    assert match and hashlib.sha256(data).hexdigest() == match.group(1), item["path"]

matrix = {row["id"]: row for row in q["performance"]["matrix"]}
assert len(matrix) == 105
paired = 0
faster = 0
for row in matrix.values():
    report = raw[row["id"]]
    result = report["result"]
    assert report["run"]["exitCode"] == 0 and report["survivors"] == []
    assert result["closed"]["live"] == 0 and result["closed"]["cleanupFailures"] == 0
    if row["mode"] == "fresh":
        continue
    baseline = matrix[f'{row["workload"]}-{row["block"]}-fresh-4']
    actual = result["rows"]
    expected = raw[baseline["id"]]["result"]["rows"]
    fields = ("index", "sourceHash", "inputsHash", "metadataHash", "resultHash")
    assert len(actual) == len(expected)
    assert all(all(a[field] == b[field] for field in fields) for a, b in zip(actual, expected)), row["id"]
    paired += len(actual)
    faster += int(row["warmMedianMs"] < baseline["warmMedianMs"])
    assert math.isclose(row["warmMedianMs"], statistics.median([x["elapsedMs"] for i, x in enumerate(actual) if any(y["index"] == x["index"] for y in actual[:i])]), rel_tol=1e-10)
assert paired == q["performance"]["pairedRowsCompared"] == 6690
assert faster == q["performance"]["retainedRowsFasterThanFresh"] == 0
assert q["performance"]["status"] == "passed" and q["performance"]["benefitStatus"] == "failed"
for duration, item in ((1000, "idle-1000"), (30000, "idle-30000"), (120000, "idle-120000")):
    result = raw[item]["result"]
    assert len(result["cycles"]) == 3 and result["closed"]["live"] == 0 and result["closed"]["cleanupFailures"] == 0
    assert all(cycle["after"]["disposals"] - cycle["before"]["disposals"] == 7 for cycle in result["cycles"])
assert q["lifecycle"]["longLivedOwner"]["status"] == "passed"
assert raw["floor-fresh"]["result"]["node"] == "v22.0.0"
assert q["metro"]["entryRestored"]["matchesPriorImportRemoval"] is True
assert q["metro"]["entryRestored"]["actualResultHash"] != q["metro"]["entryRestored"]["referenceResultHash"]
assert q["metro"]["currentHostBudget"]["status"] == "not-run"
print(f"verified: {len(manifest['rawReports'])} raw reports, {len(manifest['receipts'])} receipts, {len(matrix)} matrix runs, {paired} exact paired rows; retained benefit rejected")
