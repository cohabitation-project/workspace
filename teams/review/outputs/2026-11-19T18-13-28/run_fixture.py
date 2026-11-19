#!/usr/bin/env python3
"""Predicate fixture for .github/workflows/deploy.yml production gate (Claude, Review, 2026-11-19).
Usage: python3 run_fixture.py [deploy.yml]   (needs bash, jq, python3, pyyaml; stub-gh.py and stub-curl.py beside this file)
Extracts the real 'Production gate' step, runs it under bash against a stub `gh` and `curl` fed synthetic JSON.
'faithful' stub models GitHub's query filters; 'lax-api' ignores head_sha/branch/status filters so only the jq/bash side counts.
The stub models the API; it is not GitHub. Exit code 1 if any non-INFO case differs from expectation."""
import os,sys,json,subprocess,tempfile,yaml,shutil
HERE=os.path.dirname(os.path.abspath(__file__))
path=sys.argv[1] if len(sys.argv)>1 else os.path.join(HERE,'deploy.yml.snapshot')
wf=yaml.safe_load(open(path).read())
gate=[s for s in wf['jobs']['deploy']['steps'] if s['name'].startswith('Production gate')][0]['run']
bin_=tempfile.mkdtemp()
for n,f in (('gh','stub-gh.py'),('curl','stub-curl.py')):
    shutil.copy(os.path.join(HERE,f),f'{bin_}/{n}');os.chmod(f'{bin_}/{n}',0o755)
RS='cohabitation-project/workspace';F='a'*40;G='b'*40
def tr(sha=F,branch='main',event='push',repo=RS,concl='success'):
    return dict(head_sha=sha,head_branch=branch,event=event,conclusion=concl,head_repository={'full_name':repo})
def dr(sha=F,event='workflow_run',concl='success'): return dict(head_sha=sha,event=event,conclusion=concl)
def sc(**k):
    d=dict(commits={F:F,F[:7]:F,G:G},compare='ahead',test_runs=[tr()],deploy_runs=[dr()],live=F);d.update(k);return d
S=[
 ('S01 push/main green + staging live on sha',sc(),'PASS'),
 ('S02 PR-only green (feature branch, pull_request)',sc(test_runs=[tr(branch='feat/x',event='pull_request')]),'REFUSE'),
 ('S03 fork PR whose head branch is named main',sc(test_runs=[tr(event='pull_request',repo='evil/workspace')]),'REFUSE'),
 ('S04 same-repo pull_request run, head branch main',sc(test_runs=[tr(event='pull_request')]),'REFUSE'),
 ('S05 workflow_dispatch green on main (build lane)',sc(test_runs=[tr(event='workflow_dispatch')]),'PASS'),
 ('S06 schedule event green on main',sc(test_runs=[tr(event='schedule')]),'REFUSE'),
 ('S07 push green for a DIFFERENT sha only',sc(test_runs=[tr(sha=G)]),'REFUSE'),
 ('S08 push/main run, conclusion=failure',sc(test_runs=[tr(concl='failure')]),'REFUSE'),
 ('S09 sha diverged from main',sc(compare='diverged'),'REFUSE'),
 ('S10 sha behind main (ancestor)',sc(compare='behind'),'INFO'),
 ('S11 staging not live on sha, auto staging deploy run ok',sc(live=G),'PASS'),
 ('S12 staging not live, no deploy.yml workflow_run run',sc(live=G,deploy_runs=[]),'REFUSE'),
 ('S13 staging not live, only manual-dispatch staging run',sc(live=G,deploy_runs=[dr(event='workflow_dispatch')]),'REFUSE'),
 ('S14 healthz unreachable + no staged run',sc(healthz_fail=True,deploy_runs=[]),'REFUSE'),
 ('S15 test-runs API error',sc(tests_api_fail=True),'REFUSE'),
 ('S16 abbreviated 7-char sha',sc(),'PASS'),
 ('S17 unknown commit',sc(commits={}),'REFUSE'),
 ('S18 empty sha',sc(),'REFUSE'),
 ('S19 staged run conclusion=failure, live differs',sc(live=G,deploy_runs=[dr(concl='failure')]),'REFUSE'),
]
def shaf(n): return '' if n.startswith('S18') else (F[:7] if n.startswith('S16') else F)
def outcome(script,scn,lax,sha):
    f=tempfile.mktemp(suffix='.json');json.dump(scn,open(f,'w'))
    env=dict(os.environ,PATH=bin_+':'+os.environ['PATH'],SCEN=f,LAX='1' if lax else '0',SHA=sha,GITHUB_REPOSITORY=RS,GH_TOKEN='x',GITHUB_ACTOR='t',GITHUB_ENV=tempfile.mktemp(),GITHUB_STEP_SUMMARY=tempfile.mktemp())
    r=subprocess.run(['bash','-c',script],env=env,capture_output=True,text=True,timeout=60)
    return ('PASS' if r.returncode==0 else 'REFUSE')
M=[('M1 drop jq head_branch','select(.head_branch == "main" and ','select('),
 ('M2 drop jq same-repo',' and .head_repository.full_name == env.GITHUB_REPOSITORY',''),
 ('M3 drop jq event allowlist',' and (.event == "push" or .event == "workflow_dispatch")',''),
 ('M4 drop URL branch=main','&branch=main',''),
 ('M5 drop URL head_sha','head_sha=$full&branch=main','branch=main'),
 ('M6 drop URL status=success','&status=success&per_page=20','&per_page=20'),
 ('M7 threshold -ge 0','[ "${tests:-0}" -ge 1 ] || refuse "Commons tests','[ "${tests:-0}" -ge 0 ] || refuse "Commons tests'),
 ('M8 drop ancestor check','[[ "$rel" == identical || "$rel" == ahead ]] || refuse','true || refuse'),
 ('M9 never refuse off-staging','else refuse "$full was never deployed to staging','else echo ok; : "$full was never deployed to staging'),
 ('M10 staged lookup any event','&event=workflow_run&status=success','&status=success'),
 ('M11 staged lookup failed ok','&event=workflow_run&status=success','&event=workflow_run'),
 ('M12 drop dispatch from allowlist',' or .event == "workflow_dispatch"',''),
 ('M13 drop BOTH branch predicates (jq + URL)','select(.head_branch == "main" and ','select(',['&branch=main','']),
 ('M14 drop jq repo + jq event (fork/PR leak)',' and .head_repository.full_name == env.GITHUB_REPOSITORY and (.event == "push" or .event == "workflow_dispatch")','')]
rows={}
base={}
for mode in ('faithful','lax-api'):
    for n,scn,exp in S:
        base[(mode,n)]=outcome(gate,scn,mode=='lax-api',shaf(n))
bad=[(k,v) for k,v in base.items() if next(e for nn,_,e in S if nn==k[1])!='INFO' and v!=next(e for nn,_,e in S if nn==k[1])]
print('baseline: %d unexpected'%len(bad)); 
for k,v in bad: print('  ',k,v,'(lax mode: script relies on API for head_sha/status)' if k[0]=='lax-api' else '  <-- REAL')
mut=[]
for m in M:
    name,a,b=m[0],m[1],m[2]
    if a not in gate: print(name,'PATTERN NOT FOUND');continue
    mg=gate.replace(a,b,1)
    if len(m)>3: mg=mg.replace(m[3][0],m[3][1],1)
    killers=[]
    for mode in ('faithful','lax-api'):
        for n,scn,exp in S:
            if exp=='INFO': continue
            o=outcome(mg,scn,mode=='lax-api',shaf(n))
            if o!=base[(mode,n)]: killers.append(mode+':'+n.split()[0])   # only a CHANGE from the unmutated script counts
    mut.append((name,bool(killers),killers)); print(name,'KILLED' if killers else 'SURVIVED',killers[:6])
json.dump(dict(baseline={f'{k[0]}|{k[1]}':v for k,v in base.items()},mutants=mut),open(os.path.join(HERE,'results-v2.json'),'w'),indent=1)
sys.exit(1 if any(k[0]=='faithful' for k,v in bad) else 0)
