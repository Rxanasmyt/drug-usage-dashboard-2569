import re,json,subprocess,sys
S='build/app.js';H='build/head.html'
src=open(S).read();head=open(H).read()
subprocess.run(['tools/node_modules/.bin/terser',S,'-c','passes=2','-m','-o','build/app.min.js','--format','ascii_only=false,quote_style=1'],check=True)
mj=open('build/app.min.js').read()
ATT='class|id|role|type|data-act|data-k|data-id|data-m|data-t|data-v|data-w|data-c|data-i|data-r|data-a|data-b|aria-pressed|aria-selected|aria-hidden|aria-live|hidden|tabindex|data-n|data-s|data-d|data-e'
n0=mj.count('"')
mj=re.sub(r'(?<= )(?:'+ATT+r')="([A-Za-z0-9_-]+)"(?=[ >])',lambda m:m.group(0).replace('"','',2),mj)
print('quotes',n0,'->',mj.count('"'))
def mincss(m):
    c=m.group(2)
    c=re.sub(r'/\*.*?\*/','',c,flags=re.S)
    c=re.sub(r'\s*\n\s*','',c)
    c=re.sub(r'\s*([{};])\s*',r'\1',c)
    return m.group(1)+c+m.group(3)
subprocess.run(['node','tools/csso_run.js',H,'build/head.min.html'],check=True)
hm=open('build/head.min.html').read()
L=open('pwa/index.html').read().split('\n')
i=[k for k,l in enumerate(L) if l.startswith('<script src="d3.min.js">')][0]
pre='\n'.join(L[:30]);tail='\n'.join(L[i:])
open('pwa/index.html','w').write(pre+'\n'+hm.rstrip('\n')+'\n'+tail)
open('pwa/app.js','w').write(mj)
t=hm+"\n<script>\n"+mj+"\n</script>"
open('build/index.html','w').write(t);open('files_index.json','w',encoding='utf-8').write(json.dumps({"text":t},ensure_ascii=False,separators=(',',':')))
print('serialized',len(json.dumps({'text':t},ensure_ascii=False,separators=(',',':')).encode()));print('app',len(src.encode()),'->',len(mj.encode()),'head',len(head.encode()),'->',len(hm.encode()),'artifact',len(t.encode()))
