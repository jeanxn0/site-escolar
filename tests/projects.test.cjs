const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('site-escola-gabriel-odorico-planilha-agenda/site-escola-gabriel-odorico-main/script.js','utf8');
function page(){
 class El{constructor(tag){this.tag=tag;this.children=[];this.handlers={};this.attributes={};this.clientWidth=390;this.scrollLeft=0;this.textContent='';this.classList={contains:()=>false};}append(...children){this.children.push(...children)}replaceChildren(...children){this.children=children}setAttribute(k,v){this.attributes[k]=v}addEventListener(k,v){this.handlers[k]=v}scrollTo({left}){this.scrollLeft=left;this.handlers.scroll?.()} }
 const list=new El('div'),counter=new El('p'),listeners=new Set();
 const document={getElementById:id=>id==='listaProjetos'?list:id==='resultadoProjetos'?counter:null,querySelectorAll:()=>[],querySelector:()=>null,addEventListener(){},createElement:t=>new El(t),body:{classList:{contains:()=>false}}};
 const c=vm.createContext({document,window:{ESCOLA_CONFIG:{},matchMedia:()=>({matches:false}),addEventListener:(type,fn)=>listeners.add(fn),removeEventListener:(type,fn)=>listeners.delete(fn)},URL,Date,Intl});vm.runInContext(source,c);
 return {c,list,counter,listeners,render(projects){c.items=projects;vm.runInContext('exibirProjetos(items)',c)}};
}
const project=(titulo='Festa Junina')=>({titulo,descricao:'Registro do projeto.',data:'',local:'Escola',link:'https://example.com/album',fotos:'https://example.com/1.jpg\nhttps://example.com/2.jpg',textoFotos:'Bandeirinhas na escola\nApresentação cultural'});
test('each album has independent controls and stops at its last photo',()=>{
 const p=page();p.render([project(),project('Feira de Ciências')]);
 const first=p.list.children[0].children[0],second=p.list.children[1].children[0];
 first.children[1].children[2].handlers.click();
 assert.equal(first.children[0].scrollLeft,390);assert.equal(second.children[0].scrollLeft,0);
 assert.equal(first.children[1].children[2].disabled,true);assert.equal(first.children[1].children[0].disabled,false);
});
test('re-render cleans up resize handlers from removed carousels',()=>{
 const p=page();p.render([project(),project()]);assert.equal(p.listeners.size,2);p.render([]);assert.equal(p.listeners.size,0);assert.equal(p.list.children.length,1);
});
test('broken image becomes a readable fallback and album link remains',()=>{
 const p=page();p.render([project()]);const card=p.list.children[0],figure=card.children[0].children[0].children[0];figure.children[0].children[0].handlers.error();
 assert.match(figure.children[0].textContent,/Foto indisponível/);assert.equal(card.children[1].children.at(-1).href,'https://example.com/album');
});
test('unsafe, duplicate and Google sharing URLs do not become gallery images',()=>{
 const p=page();p.c.item={...project(),fotos:'javascript:alert(1)\nhttps://example.com/a.jpg\nhttps://example.com/a.jpg\nhttps://drive.google.com/file/d/id/view\nhttp://example.com/b.jpg\nhttps://user:password@example.com/c.jpg'};
 assert.equal(vm.runInContext('fotosDoProjeto(item).length',p.c),1);
});
test('project without photos renders text and album with no carousel',()=>{
 const p=page();p.render([{...project('<script>texto</script>'),fotos:''}]);const card=p.list.children[0];assert.equal(card.children.length,1);assert.equal(card.children[0].children[1].textContent,'<script>texto</script>');
});
test('arrow keys navigate only when the carousel itself has focus',()=>{
 const p=page();p.render([project()]);const slides=p.list.children[0].children[0].children[0];let prevented=false;
 slides.handlers.keydown({target:slides,key:'End',preventDefault(){prevented=true}});assert.equal(slides.scrollLeft,390);assert.equal(prevented,true);
 slides.handlers.keydown({target:{},key:'Home',preventDefault(){}});assert.equal(slides.scrollLeft,390);
});
