const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {createCanvas,Image,ImageData}=require('@napi-rs/canvas');
const filters=require('../public/photo-filters');
function runFilter(data,filter,straighten=false){let result;const context={PhotoFilters:filters,Uint8ClampedArray,importScripts(){},self:{postMessage:m=>result=m}};vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(__dirname,'../public/photo-enhance-worker.js'),'utf8'),context);context.self.onmessage({data:{rgba:data.data.buffer.slice(0),width:data.width,height:data.height,filter,straighten}});return result;}
function fixture(){const c=createCanvas(300,160),x=c.getContext('2d');x.fillStyle='#aa8070';x.fillRect(0,0,300,160);x.fillStyle='#552030';for(let i=0;i<6;i++)x.fillRect(25+i*35,50,18,35);return c;}
for(const filter of ['original','auto','gray','sharp','bw','adaptive','invert'])test('photo filter '+filter+' preserves source and returns valid pixels',()=>{
 const c=fixture(),data=c.getContext('2d').getImageData(0,0,c.width,c.height),before=Buffer.from(data.data);
 const result=runFilter(data,filter);assert.equal(result.error,undefined);assert.equal(result.width,c.width);assert.equal(result.height,c.height);assert.equal(result.rgba.byteLength,data.data.byteLength);assert.equal(Buffer.compare(Buffer.from(data.data),before),0);if(filter!=='original')assert.notEqual(Buffer.compare(Buffer.from(result.rgba),before),0);
});
test('tilt estimation and invalid dimensions',()=>{const c=fixture(),data=c.getContext('2d').getImageData(0,0,c.width,c.height);assert.ok(Math.abs(runFilter(data,'auto',true).angle)<=12);const bad=runFilter({data:new Uint8ClampedArray(4),width:4000,height:4000},'auto');assert.match(bad.error,/limit/);});
function ui(){
 const elements={},workers=[],frames=[];let socket;
 const get=id=>{if(elements[id])return elements[id];let el=['crop','preview'].includes(id)?createCanvas(1,1):{value:['right','bottom'].includes(id)?'100':id==='filter'?'original':'0',files:[],click(){}};el.hidden=false;el.disabled=id==='send';if(id==='rotation'){el.options=[0,-12,-6,6,12,90,180,270].map(n=>({value:String(n)}));el.add=o=>el.options.push(o);}elements[id]=el;return el;};
 class TestImage extends Image{get naturalWidth(){return this.width;}get naturalHeight(){return this.height;}async decode(){if(this.complete)return;await new Promise((resolve,reject)=>{this.onload=resolve;this.onerror=reject;});}}
 class Worker{constructor(){workers.push(this);}postMessage(message){setImmediate(()=>{if(this.terminated)return;const result=runFilter({data:new Uint8ClampedArray(message.rgba),width:message.width,height:message.height},message.filter,message.straighten);this.onmessage?.({data:result});});}terminate(){this.terminated=true;}}
 class Socket{static OPEN=1;constructor(){socket=this;this.readyState=1;setImmediate(()=>this.onopen?.());}send(raw){frames.push(JSON.parse(raw));}}
 const context={document:{getElementById:get,createElement:()=>createCanvas(1,1)},location:{protocol:'http:',host:'192.168.0.102:3000'},window:{Worker:true},Worker,WebSocket:Socket,URL:{createObjectURL:file=>file.url,revokeObjectURL(){}},Image:TestImage,ImageData,Uint8ClampedArray,Option:class{constructor(text,value){this.text=text;this.value=value;}},setTimeout,console};
 vm.createContext(context);const html=fs.readFileSync(path.join(__dirname,'../public/phone.html'),'utf8');const script=[...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]).find(s=>s.includes('function updateSend'));vm.runInContext(script,context);
 return{get,frames,workers,async load(){await new Promise(r=>setImmediate(r));get('photo').files=[{size:100,url:fixture().toDataURL('image/png')}];await get('photo').onchange();},async preview(){await get('previewButton').onclick();}};
}
test('capture, crop, original preview, and send preserve legacy frame protocol',async()=>{const h=ui();await h.load();assert.equal(h.get('send').disabled,false);await h.preview();assert.ok(h.get('preview').width>0);await h.get('send').onclick();assert.equal(h.frames[0].type,'frame');assert.ok(h.frames[0].data.length>100);assert.equal(h.get('send').disabled,true);});
test('filtered preview is exactly the image sent; crop and source remain reusable',async()=>{const h=ui();await h.load();h.get('filter').value='auto';h.get('filter').onchange();await h.preview();const expected=h.get('preview').toDataURL('image/jpeg',.92).split(',')[1];await h.get('send').onclick();assert.equal(h.frames[0].data,expected);h.get('filter').value='original';h.get('filter').onchange();assert.equal(h.get('send').disabled,false);await h.preview();assert.equal(h.get('preview').hidden,false);});
test('rotation canvas includes corners and cancellation retains crop',async()=>{const h=ui();await h.load();h.get('rotation').value='90';h.get('rotation').onchange();await h.preview();assert.equal(h.get('preview').width,193);assert.equal(h.get('preview').height,332);h.get('filter').value='adaptive';const job=h.preview();assert.equal(h.get('send').disabled,true);h.get('stopEnhance').onclick();await job;assert.equal(h.workers.at(-1).terminated,true);assert.equal(Number(h.get('left').value),0);assert.equal(Number(h.get('right').value),100);assert.equal(h.get('send').disabled,false);});
