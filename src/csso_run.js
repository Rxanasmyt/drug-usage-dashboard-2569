const csso=require('csso'),fs=require('fs');
const h=fs.readFileSync(process.argv[2],'utf8');
const out=h.replace(/(<style[^>]*>)([\s\S]*?)(<\/style>)/g,(m,a,c,b)=>a+csso.minify(c,{restructure:true,comments:false}).css+b);
fs.writeFileSync(process.argv[3],out);console.log(Buffer.byteLength(h),'->',Buffer.byteLength(out));
