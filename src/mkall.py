import re,json,subprocess,sys
S='build/app.js';H='build/head.html'
src=open(S).read();head=open(H).read()
subprocess.run(['tools/node_modules/.bin/terser',S,'-c','passes=2','-m','-o','build/app.min.js','--format','ascii_only=false'],check=True)
mj=open('build/app.min.js').read()
def mincss(m):
    c=m.group(2)
    c=re.sub(r'/\*.*?\*/','',c,flags=re.S)
    c=re.sub(r'\s*\n\s*','',c)
    c=re.sub(r'\s*([{};])\s*',r'\1',c)
    return m.group(1)+c+m.group(3)
hm=re.sub(r'(<style[^>]*>)(.*?)(</style>)',mincss,head,flags=re.S)
open('build/head.min.html','w').write(hm)
L=open('pwa/index.html').read().split('\n')
i=[k for k,l in enumerate(L) if l.startswith('<script src="d3.min.js">')][0]
pre='\n'.join(L[:30]);tail='\n'.join(L[i:])
open('pwa/index.html','w').write(pre+'\n'+hm.rstrip('\n')+'\n'+tail)
open('pwa/app.js','w').write(mj)
t=hm+"\n<script>\n"+mj+"\n</script>"
open('build/index.html','w').write(t);json.dump({"text":t},open('files_index.json','w'))
print('app',len(src.encode()),'->',len(mj.encode()),'head',len(head.encode()),'->',len(hm.encode()),'artifact',len(t.encode()))
