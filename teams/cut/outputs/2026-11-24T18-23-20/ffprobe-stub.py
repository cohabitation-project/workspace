#!/usr/bin/env python3
import sys,subprocess,re,json
p=sys.argv[-1]
o=subprocess.run(["/tmp/bin/ffmpeg","-hide_banner","-i",p],capture_output=True,text=True).stderr
st=[]
for m in re.finditer(r"Stream #\d+:\d+.*?: (Video|Audio): (.*)",o):
    k=m.group(1).lower(); s={"codec_type":k}
    if k=="video":
        w=re.search(r"[, ](\d{2,5})x(\d{2,5})",m.group(2)); s["width"]=int(w.group(1)); s["height"]=int(w.group(2))
    st.append(s)
d=re.search(r"Duration: (\d+):(\d+):([\d.]+)",o)
dur=int(d.group(1))*3600+int(d.group(2))*60+float(d.group(3)) if d else 0
print(json.dumps({"streams":st,"format":{"duration":str(dur)}}))
