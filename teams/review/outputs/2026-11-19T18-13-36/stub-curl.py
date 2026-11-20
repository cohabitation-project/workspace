#!/usr/bin/env python3
import os,json
sc=json.load(open(os.environ['SCEN']))
if sc.get('healthz_fail'): raise SystemExit(7)
print(json.dumps({'sha':sc['live']}))
