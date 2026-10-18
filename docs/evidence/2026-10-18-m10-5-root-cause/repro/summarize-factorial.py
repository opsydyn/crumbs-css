import pathlib,json,statistics,math
p=pathlib.Path('/private/tmp/crumbs-m105-root-cause-20261018');rows=[]
p50=lambda a:sorted(a)[math.ceil(len(a)*.5)-1]
for pipe in ['historical','current']:
 for author in ['historical','current']:
  for label in ['README','consumer']:
   times=[];compiles=[];rests=[];bytes_=[]
   for pair in range(1,6):
    d=json.loads((p/f'factorial-{pair}-{pipe}-{author}.json').read_text());ev=[e for e in d['events'] if e['label']==label and e['sample']>=0];times.append(p50([e['end']-e['start']for e in ev]));compiles.append(p50([sum(b['end']-b['start']for b in e['compiles'])for e in ev]));rests.append(p50([e['end']-e['start']-sum(b['end']-b['start']for b in e['compiles'])for e in ev]));bytes_.append(sum(i['bytes']for i in ev[0]['builds'][0]['inputs']if i['category']=='crumbs-dist'))
   row={'pipeline':pipe,'authoring':author,'fixture':label,'total':p50(times),'compile':p50(compiles),'remainder':p50(rests),'samples':times,'packageInputBytes':bytes_};rows.append(row);print(row)
(p/'factorial-summary.json').write_text(json.dumps(rows,indent=2))
