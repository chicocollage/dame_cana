import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {Workbook, SpreadsheetFile} from '@oai/artifact-tool';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const out=path.join(root,'outputs/operativo');
const data=JSON.parse(await fs.readFile(path.join(out,'CONTEXTO_ENTRENADOR.json'),'utf8'));
const tables=JSON.parse(await fs.readFile(path.join(out,'VISTAS_HUMANAS.json'),'utf8'));
if(tables.generado_utc!==data.generado_utc)throw new Error('Tablas y contexto de distintas generaciones');
data.vistas=tables.vistas;
for(const source of data.fuentes){if(createHash('sha256').update(await fs.readFile(path.join(root,source.ruta))).digest('hex')!==source.sha256)throw new Error('Contexto desactualizado: '+source.ruta);}
const wb=Workbook.create();
function col(n){let s='';for(;n>0;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s;return s;}
function value(x){if(x===undefined||x===null||x==='')return null;if(typeof x==='string'&&/^[=+@]/.test(x))return "'"+x;return x;}
for(const [i,v] of data.vistas.entries()){
 const s=wb.worksheets.add(v.name);s.showGridLines=false;
 const end=col(v.headers.length), count=v.rows.length;
 s.getRange('A2').values=[[v.name]];s.getRange('A2').format.font={name:'Arial',size:15,bold:true,color:'#214434'};
 s.getRange('A3').values=[['Consulta derivada · '+data.generado_utc+' · modificar las fuentes locales, no esta vista']];
 s.getRange('A3').format.font={name:'Arial',size:10,color:'#58645C'};
 s.getRange(`A5:${end}5`).values=[v.headers];
 const rows=v.rows.map(row=>row.map((x,j)=>v.headers[j]==='Fecha'||v.headers[j]==='Última evidencia'?(/^\d{4}-\d{2}-\d{2}/.test(String(x))?new Date(String(x).slice(0,10)+'T12:00:00Z'):value(x)):value(x)));
 if(count)s.getRange(`A6:${end}${count+5}`).values=rows;
 const range=s.getRange(`A5:${end}${count+5}`);
 range.format.font={name:'Arial',size:11,color:'#202925'};range.format.wrapText=true;range.format.verticalAlignment='top';
 s.getRange(`A5:${end}5`).format={fill:'#214434',font:{name:'Arial',size:11,bold:true,color:'#FFFFFF'},wrapText:true};
 v.headers.forEach((h,j)=>{
  const long=/Ejercicio|Nombre|Decisión|Condición|Motivo|Notas|técnica|Encaje|Fuente|Valor|acción|Alternativas|Qué no/.test(h);
  s.getRangeByIndexes(4,j,Math.max(count+1,1),1).format.columnWidth=long?48:24;
  if(h==='Fecha'||h==='Última evidencia')s.getRangeByIndexes(5,j,Math.max(count,1),1).setNumberFormat('yyyy-mm-dd');
 });
 range.format.autofitRows();s.freezePanes.freezeRows(5);
 if(count)s.tables.add(`A5:${end}${count+5}`,true,'Vista'+i);
}
wb.recalculate();
for(const [i,v] of data.vistas.entries()){
 const png=await wb.render({sheetName:v.name,range:`A1:${col(Math.min(5,v.headers.length))}${Math.min(v.rows.length+5,10)}`,scale:1,format:'png'});
 await fs.writeFile(path.join(root,'work/hoja','operativo_'+i+'.png'),new Uint8Array(await png.arrayBuffer()));
}
const file=await SpreadsheetFile.exportXlsx(wb);
await file.save(path.join(out,'DAME_CANA_OPERATIVO_LOCAL.xlsx'));
const hashes={};
for(const name of ['CONTEXTO_ENTRENADOR.json','TABLAS_OPERATIVAS.json','VISTAS_HUMANAS.json','MODELO_OPERATIVO.json','INDICE_CONOCIMIENTO.json','DAME_CANA_OPERATIVO_LOCAL.xlsx'])hashes[name]=createHash('sha256').update(await fs.readFile(path.join(out,name))).digest('hex');
await fs.writeFile(path.join(out,'HUELLAS_LIBRO.json'),JSON.stringify(hashes,null,2));
console.log(JSON.stringify({archivo:path.join(out,'DAME_CANA_OPERATIVO_LOCAL.xlsx'),vistas:data.vistas.length}));
