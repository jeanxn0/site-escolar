const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('site-escola-gabriel-odorico-planilha-agenda/site-escola-gabriel-odorico-main/script.js','utf8');
function page(saved={}, blocked=false){
 const nodes=new Map(), classes=new Set(),style={};
 for(const id of ['preferenciasAcessibilidade','statusAcessibilidade','escalaFonte','aumentarFonte','diminuirFonte','restaurarFonte','altoContraste','coresAcessiveis','reduzirAnimacoes','espacarTexto','destacarLinks','restaurarPreferencias','fecharAcessibilidade']) nodes.set(id,{attributes:{},handlers:{},textContent:'',disabled:false,addEventListener(e,f){this.handlers[e]=f},setAttribute(k,v){this.attributes[k]=v}});
 const summary={focused:false,focus(){this.focused=true}};
 nodes.get("preferenciasAcessibilidade").querySelector=()=>summary;
 let stored=JSON.stringify(saved);
 const document={getElementById:id=>nodes.get(id)||null,querySelectorAll:()=>[],querySelector:()=>null,addEventListener(){},documentElement:{style:{setProperty(k,v){style[k]=v}}},body:{classList:{toggle(k,v){v?classes.add(k):classes.delete(k)}}}};
 const context=vm.createContext({document,window:{ESCOLA_CONFIG:{}},localStorage:{getItem(){if(blocked) throw Error();return stored},setItem(k,v){if(blocked) throw Error();stored=v}},URL,Date,Intl});
 vm.runInContext(source,context);
 return {nodes,classes,style,summary,context,click(id){nodes.get(id).handlers.click()},saved:()=>JSON.parse(stored)};
}
test('text grows to 200 percent without body zoom, clamps and restores',()=>{
 const p=page();for(let i=0;i<15;i++)p.click('aumentarFonte');
 assert.equal(p.style['--escala-texto'],2);assert.equal(p.nodes.get('aumentarFonte').disabled,true);
 assert.equal(p.saved().escala,2);p.click('restaurarPreferencias');
 assert.equal(p.style['--escala-texto'],1);assert.equal(p.nodes.get('diminuirFonte').disabled,true);
});
test('saved options restore and controls expose their pressed state',()=>{
 const p=page({escala:1.4,contraste:true,espaco:true,links:true});
 assert.equal(p.style['--escala-texto'],1.4);assert.ok(p.classes.has('alto-contraste'));
 assert.equal(p.nodes.get('altoContraste').attributes['aria-pressed'],'true');
 p.click('altoContraste');assert.ok(!p.classes.has('alto-contraste'));
 p.click('restaurarPreferencias');assert.equal(p.classes.size,0);
});
test('blocked browser storage still permits accessibility changes',()=>{
 const p=page({},true);p.click('espacarTexto');assert.ok(p.classes.has('texto-espacado'));
 assert.match(p.nodes.get('statusAcessibilidade').textContent,/não permitiu salvar/);
});
test('invalid saved values are clamped and do not activate options',()=>{
 const p=page({escala:9,contraste:'true'});assert.equal(p.style['--escala-texto'],2);assert.ok(!p.classes.has('alto-contraste'));
});

test('close button and Escape close the panel and return keyboard focus',()=>{
 const p=page();const panel=p.nodes.get('preferenciasAcessibilidade');panel.open=true;
 p.click('fecharAcessibilidade');assert.equal(panel.open,false);assert.equal(p.summary.focused,true);
 panel.open=true;p.summary.focused=false;let prevented=false;
 panel.handlers.keydown({key:'Escape',preventDefault(){prevented=true}});
 assert.equal(panel.open,false);assert.equal(p.summary.focused,true);assert.equal(prevented,true);
});
test('missing text buttons do not stop accessibility or the rest of the page',()=>{
 const p=page();p.nodes.delete('diminuirFonte');p.nodes.delete('aumentarFonte');
 assert.doesNotThrow(()=>vm.runInContext('configurarAcessibilidade()',p.context));
 p.click('altoContraste');assert.equal(p.nodes.get('altoContraste').attributes['aria-pressed'],'true');
});
