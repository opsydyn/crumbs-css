import unittest, tempfile, shutil, subprocess, json, hashlib, tarfile, io
from pathlib import Path
HERE=Path(__file__).resolve().parent
class PacketVerifierTests(unittest.TestCase):
    def run_verifier(self,root):
        return subprocess.run(['python3',str(root/'verify.py')],cwd=root,text=True,capture_output=True)
    def clone(self,root):
        root.mkdir()
        for f in HERE.iterdir():
            if f.is_file():shutil.copy2(f,root/f.name)
        relative=Path('2026-10-17-m10-5-fresh-pipeline-remediation/control-v1.2.0.tgz')
        source=HERE.parent/relative
        if not source.is_file():
            with tarfile.open(HERE/'raw-evidence.tar.gz') as archive:
                source=Path(json.load(archive.extractfile('input-identity.json'))['inputs']['controlTarball'])
        destination=root.parent/relative
        destination.parent.mkdir(parents=True)
        shutil.copy2(source,destination)
    def update_inventory(self,root,name):
        p=root/'packet-files.json';d=json.loads(p.read_text());d[name]=hashlib.sha256((root/name).read_bytes()).hexdigest();p.write_text(json.dumps(d,indent=2)+'\n')
    def rewrite_raw(self,root,mutate,target="control-a-floorNode-esm.json"):
        src=root/'raw-evidence.tar.gz';dst=root/'replacement.tar.gz'
        with tarfile.open(src,'r:gz') as before,tarfile.open(dst,'w:gz') as after:
            for member in before.getmembers():
                data=before.extractfile(member).read()
                if member.name==target:
                    value=json.loads(data);mutate(value);data=(json.dumps(value,indent=2)+'\n').encode();member.size=len(data)
                after.addfile(member,io.BytesIO(data))
        dst.replace(src);self.update_inventory(root,'raw-evidence.tar.gz')
    def test_valid_packet(self):
        result=self.run_verifier(HERE);self.assertEqual(result.returncode,0,result.stderr)
    def test_rejects_mutated_archive(self):
        with tempfile.TemporaryDirectory(prefix='crumbs-kernel-verifier-') as temp:
            root=Path(temp)/"packet";self.clone(root);p=root/'candidate-files.tar.gz';data=bytearray(p.read_bytes());data[-20]^=1;p.write_bytes(data)
            result=self.run_verifier(root);self.assertNotEqual(result.returncode,0);self.assertIn('packet hash mismatch',result.stderr)
    def test_rejects_forged_marker_even_after_archive_digest_is_updated(self):
        with tempfile.TemporaryDirectory(prefix='crumbs-kernel-verifier-') as temp:
            root=Path(temp)/"packet";self.clone(root)
            def forge(rows):
                import re
                rows[0]['code']=re.sub(r'(?<=@crumbs-native-cache )[a-f0-9]{64}','0'*64,rows[0]['code'])
            self.rewrite_raw(root,forge);result=self.run_verifier(root);self.assertNotEqual(result.returncode,0);self.assertIn('marker',result.stderr)
    def test_rejects_omitted_control_case_even_after_archive_digest_is_updated(self):
        with tempfile.TemporaryDirectory(prefix='crumbs-kernel-verifier-') as temp:
            root=Path(temp)/"packet";self.clone(root);self.rewrite_raw(root,lambda rows:rows.pop());result=self.run_verifier(root);self.assertNotEqual(result.returncode,0);self.assertIn('control case count',result.stderr)
    def test_relocated_packet_does_not_need_originating_control_tarball_path(self):
        with tempfile.TemporaryDirectory(prefix='crumbs-kernel-verifier-') as temp:
            root=Path(temp)/"packet";self.clone(root)
            def relocate(value):value['inputs']['controlTarball']='/unavailable/originating-checkout/control-v1.2.0.tgz'
            self.rewrite_raw(root,relocate,'input-identity.json')
            result=self.run_verifier(root);self.assertEqual(result.returncode,0,result.stderr)
if __name__=='__main__':unittest.main()
