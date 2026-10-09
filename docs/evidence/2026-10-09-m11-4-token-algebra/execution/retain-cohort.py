from pathlib import Path
import json,gzip,hashlib
p=Path('docs/evidence/2026-10-09-m11-4-token-algebra');h=json.loads((p/'host/qualification.json').read_text());c=Path(h['consumerRoot']);rows=[]
for f in h['nativeInputs']:
 data=(c/f['path']).read_bytes();assert hashlib.sha256(data).hexdigest()==f['sha256'];dest=p/'host/retained-inputs'/(f['path']+'.gz');dest.parent.mkdir(parents=True,exist_ok=True)
 with gzip.GzipFile(filename=str(dest),mode='wb',mtime=0) as g:g.write(data)
 rows.append(dict(f,retained=str(dest.relative_to(p))))
(p/'host/retained-inputs.json').write_text(json.dumps(rows,indent=2)+'\n');rows=[]
for f in sorted((c/'exports').rglob('*')):
 if not f.is_file():continue
 data=f.read_bytes();dest=p/'host/retained-exports'/(str(f.relative_to(c))+'.gz');dest.parent.mkdir(parents=True,exist_ok=True)
 with gzip.GzipFile(filename=str(dest),mode='wb',mtime=0) as g:g.write(data)
 assert gzip.decompress(dest.read_bytes())==data;rows.append({'original':str(f),'retained':str(dest.relative_to(p)),'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest(),'compressedSha256':hashlib.sha256(dest.read_bytes()).hexdigest()})
(p/'host/retained-exports.json').write_text(json.dumps(rows,indent=2)+'\n');print('Final cohort lossless exports',len(rows))
