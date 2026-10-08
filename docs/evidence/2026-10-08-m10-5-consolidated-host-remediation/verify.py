#!/usr/bin/env python3
"""Offline verification of this graph rejection. This cannot qualify a release."""
import gzip
import hashlib
import json
import sys
import tarfile
from pathlib import Path, PurePosixPath


def require(condition, message):
    if not condition:
        raise ValueError(message)


def sha(data):
    return hashlib.sha256(data).hexdigest()


def package(root, filename, inventory):
    contents = {}
    with tarfile.open(root / filename, "r:gz") as archive:
        for member in archive:
            if member.isdir():
                continue
            path = PurePosixPath(member.name)
            require(member.isfile() and not path.is_absolute() and ".." not in path.parts, "Unsafe package member")
            require(member.name not in contents, "Duplicate package member")
            contents[member.name] = archive.extractfile(member).read()
    expected = inventory["sources"] + inventory["artifacts"]
    require(inventory["sources"] and inventory["artifacts"], "Empty package inventory")
    require(len({row["path"] for row in expected}) == len(expected), "Duplicate inventory path")
    require(set(contents) == {row["path"] for row in expected}, "Package inventory membership")
    for row in expected:
        require(sha(contents[row["path"]]) == row["sha256"], "Package hash: " + row["path"])
    return contents


def parity(report, synthetic):
    left, right = report["control"], report["candidate"]
    require(report["cases"] and left and len(left) == len(right), "Missing differential cohort")
    require(len(left) == len(report["cases"]) * (1 if synthetic else 7), "Truncated differential cohort")
    require(len({row["label"] for row in left}) == len(left), "Duplicate differential label")
    require(not report["mismatches"], "Reported differential mismatch")
    for a, b in zip(left, right):
        require(a == b, "Differential receipt mismatch: " + a["label"])
        outcome = a["outcome"]
        require(outcome["kind"] in ("value", "error") and isinstance(outcome["trace"], list), "Malformed receipt")
        require(isinstance(outcome["graph"], dict) and "snapshotFailure" not in outcome["graph"], "Failed snapshot")


def verify(root):
    packet = json.loads((root / "packet.json").read_text())
    require(packet["format"] == "crumbs.m10.5.graph-rejection" and packet["version"] == 1, "Packet format")
    require(packet["disposition"] == "rejected" and packet["hostGate"] == "not-run", "This rejection packet cannot certify acceptance or host results")
    synthetic = packet["synthetic"]
    require(isinstance(synthetic, bool), "Synthetic marker")
    names = {"control-package.tar.gz", "candidate-package.tar.gz", "raw.json.gz", "candidate.patch"}
    require(set(packet["files"]) == names, "Missing raw file inventory")
    for name, expected in packet["files"].items():
        require(sha((root / name).read_bytes()) == expected, "Raw file hash: " + name)
    raw = json.loads(gzip.decompress((root / "raw.json.gz").read_bytes()))
    control = raw["control"]
    require(control["sourceRevision"] == packet["controlRevision"], "Control revision")
    if not synthetic:
        require(control["sourceRevision"] == "c5206d1b04e3847e252cae64114baa3088f434d8", "Unexpected control")
        require(sha(json.dumps(control["sources"], ensure_ascii=False, separators=(",", ":")).encode()) == "02ff8c4d4c929f29acd7c27c71e1c62b12537973c69d5d68d1bc1751b48bd66d", "Frozen control source inventory")
        require(sha(raw["registryText"].encode()) == "0f5752c430db6ced1f8d8a5c94c7de865a3ba9daadaa9a60584148eeb0a4687b", "Approved registry content")
        require(json.loads(raw["registryText"]) == raw["registry"], "Registry object binding")
    package(root, "control-package.tar.gz", control)
    candidate = package(root, "candidate-package.tar.gz", raw["candidate"])
    restored = raw["restoration"]
    require(not restored["failures"], "Restoration failed")
    for key in ("sourceRevision", "sources", "artifacts"):
        require(restored["inventory"][key] == control[key], "Restoration inventory: " + key)
    identity = raw["candidateSource"]
    require(identity["format"] == "crumbs.guarantees-source-identity" and identity["version"] == 1, "Source identity format")
    digest = sha(json.dumps(identity["files"], ensure_ascii=False, separators=(",", ":")).encode())
    require(identity["sha256"] == digest == packet["candidateSourceDigest"], "Source digest")
    indexed = {row["path"]: row["sha256"] for row in identity["files"]}
    require(len(indexed) == len(identity["files"]), "Duplicate source identity")
    for row in raw["candidate"]["sources"]:
        require(indexed.get("packages/css/" + row["path"]) == row["sha256"], "Candidate source binding")
    parity(raw["controlParity"], synthetic)
    parity(raw["candidateParity"], synthetic)
    require(raw["controlParity"]["cases"] == raw["candidateParity"]["cases"], "Differential workload changed")
    require(raw["controlParity"]["control"] == raw["candidateParity"]["control"], "Independent control changed")
    graph = raw["graph"]
    require(graph["protocol"]["repetitions"] == 5, "Graph repetition count")
    metrics = {row["id"]: row for row in raw["registry"]["metrics"]}
    reported = {row["id"]: row for row in raw["comparison"]["splitComparison"]["metrics"]}
    require(len(reported) == 6 and not raw["comparison"]["splitComparison"]["allPassed"], "Graph rejection report")
    require(set(graph["currentGraphs"]) == {"theme-core", "tokens", "theme"}, "Graph entries")
    failures = []
    for entry, formats in graph["currentGraphs"].items():
        require(set(formats) == {"esm", "cjs"}, "Graph formats")
        for fmt, scan in formats.items():
            expected_entry = entry + (".mjs" if fmt == "esm" else ".cjs")
            require(scan["entry"] == expected_entry, "Graph entry")
            require(set(scan["externals"]) <= {"react"} and scan["nonliteralLoads"] == 0, "Hidden runtime graph")
            artifacts = scan["artifacts"]
            require(artifacts and len({row["file"] for row in artifacts}) == len(artifacts), "Graph artifact inventory")
            require(expected_entry in {row["file"] for row in artifacts}, "Missing graph entry artifact")
            total = 0
            for artifact in artifacts:
                data = candidate["dist/" + artifact["file"]]
                require(len(data) == artifact["bytes"] and sha(data) == artifact["sha256"], "Graph artifact binding")
                total += len(data)
            require(total == scan["graphBytes"] and scan["samples"] == [total] * 5, "Graph samples")
            group = "theme-compatibility" if entry == "theme" else entry
            metric_id = f"runtime-{group}-{fmt}-graph-bytes"
            metric, row = metrics[metric_id], reported[metric_id]
            baseline, threshold = metric["baseline"]["value"], metric["threshold"]
            require(threshold["status"] == "approved", "Graph threshold approval")
            percentage_ok = total <= baseline * (1 + threshold["maxRegressionPercent"] / 100)
            result = "pass" if total <= threshold["absoluteMax"] and percentage_ok else "fail"
            require(row["baseline"] == baseline and row["current"]["median"] == total and row["result"] == result, "Graph decision derivation")
            if result == "fail":
                failures.append(metric_id)
    require(failures, "No rejected graph")
    return {"verified": "synthetic rejection fixture" if synthetic else "graph rejection", "failedGraphs": failures, "hostGate": "not-run"}


if __name__ == "__main__":
    try:
        print(json.dumps(verify(Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).parent)))
    except (OSError, ValueError, KeyError, TypeError, IndexError, tarfile.TarError) as error:
        print("Evidence rejected: " + str(error), file=sys.stderr)
        sys.exit(1)
