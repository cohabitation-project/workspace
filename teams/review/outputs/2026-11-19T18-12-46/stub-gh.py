#!/usr/bin/env python3
import sys,os,json,subprocess,urllib.parse
a=sys.argv[1:]
assert a[0]=='api'
path=a[1]; jq=None
if '--jq' in a: jq=a[a.index('--jq')+1]
sc=json.load(open(os.environ['SCEN']))
lax=os.environ.get('LAX')=='1'
u=urllib.parse.urlparse(path); q=dict(urllib.parse.parse_qsl(u.query)); p=u.path
def out(obj):
    s=json.dumps(obj)
    if jq:
        r=subprocess.run(['jq','-r',jq],input=s,capture_output=True,text=True)
        if r.returncode: sys.stderr.write(r.stderr); sys.exit(r.returncode)
        sys.stdout.write(r.stdout)
    else: print(s)
if p.startswith('repos/') and '/commits/' in p:
    s=p.split('/commits/')[1]
    full=sc['commits'].get(s)
    if not full: sys.exit(1)
    out({'sha':full})
elif '/compare/' in p:
    if sc.get('compare') is None: sys.exit(1)
    out({'status':sc['compare']})
elif p.endswith('commons-tests.yml/runs'):
    if sc.get('tests_api_fail'): sys.exit(1)
    res=[]
    for r in sc['test_runs']:
        if q.get('head_sha') and r['head_sha']!=q['head_sha'] and not lax: continue
        if q.get('branch') and r['head_branch']!=q['branch'] and not lax: continue
        if q.get('status')=='success' and r['conclusion']!='success' and not lax: continue
        res.append(r)
    out({'workflow_runs':res[:int(q.get('per_page',30))]})
elif p.endswith('deploy.yml/runs'):
    res=[r for r in sc['deploy_runs'] if r['head_sha']==q.get('head_sha') and (not q.get('event') or r['event']==q.get('event')) and (q.get('status')!='success' or r['conclusion']=='success')]
    out({'total_count':len(res)})
else: sys.exit(2)
