const fs=require('fs'),vm=require('vm'),assert=require('assert');
const path=require('path');
const root=path.resolve(__dirname,'../..');
const html=fs.readFileSync(path.join(root,'outputs/formulario/index.html'),'utf8');
let script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
script=script.slice(0,script.indexOf("document.getElementById('nav').innerHTML="));
const context=vm.createContext({console,Date,Set,Object,Array,JSON,Error,localStorage:{getItem:()=>null}});
vm.runInContext(script,context);
const result=vm.runInContext(String.raw`(()=>{
 const empty=buildPayload();
 if(empty.questions.length!==25||empty.stations.length!==21||empty.completion.elements_total!==47||empty.completion.elements_with_answer!==0)throw new Error('Cobertura o estado vacío incorrectos');
 answers={q02:'Prueba con tildes & <contenido>\nSegunda línea',q05_lumbar:'0',q06:'No aplica',q08_opt1:true,q17_cintura:true,q17_frecuencia:'No sé',B01_station:'Smith unidad 2',B01_increment:'No sé'};
 const payload=buildPayload();
 if(payload.completion.elements_with_answer!==6)throw new Error('Recuento parcial incorrecto');
 if(!payload.questions[4].response.includes('Lumbar: 0'))throw new Error('El cero se perdió');
 if(payload.stations[0].fields.base!==null||payload.stations[0].fields.increment!=='No sé')throw new Error('Desconocidos incorrectos');
 const restored=validateDraft(JSON.parse(JSON.stringify(payload)));
 if(JSON.stringify(restored)!==JSON.stringify(answers))throw new Error('La copia no restaura todas las respuestas');
 const md=markdown();
 if(!md.includes('Prueba con tildes & <contenido>\n    Segunda línea')||!md.includes('Lumbar: 0')||!md.includes('No aplica')||!md.includes('Sin responder'))throw new Error('Documento incompleto');
 if(!esc('<script>&"').includes('&lt;script&gt;'))throw new Error('Texto HTML sin escapar');
 let rejected=0;for(const bad of [{...payload,source_sha256:'incorrecto'},{...payload,draft:{q01:true}},{...payload,draft:{q05_lumbar:'11'}},{...payload,draft:{inventado:'dato'}}]){try{validateDraft(bad)}catch(e){rejected++}}
 if(rejected!==4)throw new Error('Validación insuficiente');
 return {payload,md,checks:'Cobertura, vacío, parcial, cero, desconocidos, copia íntegra, texto multilínea y rechazo de copias inválidas: OK'};
})()`,context);
fs.writeFileSync(path.join(__dirname,'respuestas_prueba.md'),result.md);
fs.writeFileSync(path.join(__dirname,'respuestas_prueba.json'),JSON.stringify(result.payload,null,2));
console.log(result.checks);
