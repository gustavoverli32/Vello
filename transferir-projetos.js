(() => {
 const $=s=>document.querySelector(s);
 const origins=new Set(['https://vellosolutions.com.br','https://www.vellosolutions.com.br']);
 let payload=null;const attachments=new Set();
 try{
  const data=JSON.parse(localStorage.getItem('emrys_data_v1')||'null');
  if(data&&Array.isArray(data.projects)){
   payload={projects:data.projects,deletedIds:JSON.parse(localStorage.getItem('vello_deleted_project_ids_v1')||'[]'),deletedProjects:JSON.parse(localStorage.getItem('vello_deleted_projects_v1')||'[]')};
   for(const p of [...payload.projects,...payload.deletedProjects])for(const a of p.arquivos||[])if(a.local)attachments.add(a.id);
   $('#summary').textContent=payload.projects.length+' projeto(s) encontrado(s), incluindo '+payload.projects.filter(p=>p.archivedAt).length+' arquivado(s).';
   for(const p of payload.projects){const li=document.createElement('li');li.textContent=p.nome+(p.archivedAt?' · Arquivado':'');$('#projects').append(li);}
   $('#files').textContent=attachments.size+' anexo(s) local(is) para conferir.';
  }else $('#summary').textContent='Nenhum projeto salvo neste navegador. Abra esta transferência no navegador onde você usava a central antiga.';
 }catch{$('#summary').textContent='Não foi possível ler os dados salvos. A central antiga foi preservada.';}
 async function readFile(id){
  if(!attachments.has(id))throw new Error('Arquivo fora da transferência.');
  const db=await new Promise((resolve,reject)=>{const req=indexedDB.open('emrys_files',1);req.onupgradeneeded=()=>{req.transaction.abort();reject(new Error('Armazenamento de anexos não encontrado.'));};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(new Error('Anexo não encontrado neste navegador.'));});
  try{return await new Promise((resolve,reject)=>{const req=db.transaction('blobs','readonly').objectStore('blobs').get(id);req.onsuccess=()=>req.result?resolve(req.result):reject(new Error('Anexo não encontrado neste navegador.'));req.onerror=()=>reject(new Error('Não foi possível ler o anexo.'));});}finally{db.close();}
 }

 $('#export').disabled=!payload?.projects.length;
 $('#export').addEventListener('click',async()=>{
  const button=$('#export');button.disabled=true;
  try{
   const files=[],missing=[];let bytes=0;
   for(const id of attachments){
    let blob;try{blob=await readFile(id);}catch{missing.push(id);continue;}
    bytes+=blob.size;if(bytes>157286400)throw new Error('Os anexos excedem 150 MB. Transfira-os separadamente.');
    const base64=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(',')[1]);r.onerror=()=>reject(new Error('Não foi possível ler o anexo.'));r.readAsDataURL(blob);});
    files.push({id,type:blob.type||'application/octet-stream',base64});
    $('#status').textContent='Preparando anexos: '+files.length+' de '+attachments.size;
   }
   const blob=new Blob([JSON.stringify({format:'vello-project-backup-v1',payload,files,missing})],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
   a.href=url;a.download='vello-projetos-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
   $('#status').textContent='Cópia preparada com '+payload.projects.length+' projeto(s) e '+files.length+' anexo(s). Na área privada, clique em “Importar cópia”.'+(missing.length?' '+missing.length+' anexo(s) não foram encontrados neste navegador.':'');
  }catch(e){$('#status').textContent=e.message;}finally{button.disabled=false;}
 });
})();
