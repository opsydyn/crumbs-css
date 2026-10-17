import importlib.util,io,json,shutil,tarfile,tempfile,unittest,hashlib
from pathlib import Path
ROOT=Path(__file__).parent
spec=importlib.util.spec_from_file_location('packet_verifier',ROOT/'verify.py');v=importlib.util.module_from_spec(spec);spec.loader.exec_module(v)
class PacketTests(unittest.TestCase):
 def clone(self):
  t=tempfile.TemporaryDirectory();self.addCleanup(t.cleanup);p=Path(t.name)/'relocated';shutil.copytree(ROOT,p);return p
 def rehash(self,p,name):
  rows=json.loads((p/'packet-files.json').read_text())
  for r in rows:
   if r['path']==name:r['sha256']=hashlib.sha256((p/name).read_bytes()).hexdigest()
  (p/'packet-files.json').write_text(json.dumps(rows))
 def mutate_owner_archive(self,p,mutate):
  data=v.archive(p/'capture-owner-receipts.tar.gz');mutate(data)
  with tarfile.open(p/'capture-owner-receipts.tar.gz','w:gz') as t:
   for name,body in data.items():
    info=tarfile.TarInfo(name);info.size=len(body);t.addfile(info,io.BytesIO(body))
  self.rehash(p,'capture-owner-receipts.tar.gz')
 def test_original_and_relocated_packet(self):
  self.assertEqual(v.verify(ROOT)['toolingGraphDifferences'],7)
  self.assertEqual(v.verify(self.clone())['ordinaryGraphDifferences'],0)
 def test_corrupted_archive_rejects(self):
  p=self.clone();f=p/'candidate-files.tar.gz';f.write_bytes(f.read_bytes()+b'corrupt')
  with self.assertRaises(ValueError):v.verify(p)
 def test_forged_dependency_metadata_after_digest_update_rejects(self):
  p=self.clone()
  def alter(data):
   c=json.loads(data['tools-cjs.json'])
   for a in c['artifacts']:
    if a['path']=='dist/metro-plugin.cjs':a['imports'].append('url')
   data['tools-cjs.json']=json.dumps(c).encode()
  self.mutate_owner_archive(p,alter)
  with self.assertRaisesRegex(ValueError,'tooling graph omissions'):v.verify(p)
 def test_missing_owner_after_digest_update_rejects(self):
  p=self.clone();self.mutate_owner_archive(p,lambda data:data.pop('theme-esm.json'))
  with self.assertRaisesRegex(ValueError,'missing capture owner'):v.verify(p)
 def test_omitted_unrun_stage_after_digest_update_rejects(self):
  p=self.clone();s=json.loads((p/'summary.json').read_text());s['notRun'].remove('strict-platform-maps-sdk56-sdk57-sdk58');(p/'summary.json').write_text(json.dumps(s));self.rehash(p,'summary.json')
  with self.assertRaisesRegex(ValueError,'unrun declaration'):v.verify(p)
