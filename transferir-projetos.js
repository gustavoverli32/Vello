(() => {
 const $=s=>document.querySelector(s),nonce=new URLSearchParams(location.hash.slice(1)).get('transfer'),destination=window.opener||(window.parent!==window?window.parent:null);
 const origins=new Set(['https://vellosolutions.com.br','https://www.vellosolutions.com.br']);
 let recipient=null,payload=null,sending=false;const attachments=new Set();
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
 function send(message){if(recipient&&destination)destination.postMessage({...message,nonce},recipient);}
 async function readFile(id){
  if(!attachments.has(id))throw new Error('Arquivo fora da transferência.');
  const db=await new Promise((resolve,reject)=>{const req=indexedDB.open('emrys_files',1);req.onupgradeneeded=()=>{req.transaction.abort();reject(new Error('Armazenamento de anexos não encontrado.'));};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(new Error('Anexo não encontrado neste navegador.'));});
  try{return await new Promise((resolve,reject)=>{const req=db.transaction('blobs','readonly').objectStore('blobs').get(id);req.onsuccess=()=>req.result?resolve(req.result):reject(new Error('Anexo não encontrado neste navegador.'));req.onerror=()=>reject(new Error('Não foi possível ler o anexo.'));});}finally{db.close();}
 }
 window.addEventListener('message',async event=>{
  if(!nonce||!destination||event.source!==destination||!origins.has(event.origin)||event.data?.nonce!==nonce)return;
  const message=event.data;
  if(message.type==='vello-transfer-connect'){
   recipient=event.origin;$('#transfer').disabled=!payload?.projects.length;
   $('#transfer').textContent=payload?.projects.length?'Transferir '+payload.projects.length+' projeto(s)':'Nenhum dado para transferir';
   send({type:'vello-transfer-summary',count:payload?.projects.length||0,files:attachments.size});
  }
  if(message.type==='vello-transfer-file'&&sending&&recipient===event.origin){
   try{send({type:'vello-transfer-file-result',requestId:message.requestId,file:await readFile(message.id)});}catch(e){send({type:'vello-transfer-file-result',requestId:message.requestId,error:e.message});}
  }
  if(message.type==='vello-transfer-result'&&recipient===event.origin){
   $('#status').textContent=message.message;$('#transfer').disabled=message.ok; sending=false;
   if(message.ok)$('#transfer').textContent='Transferência concluída';
  }
 });
 $('#transfer').addEventListener('click',()=>{if(!payload||!recipient||sending)return;sending=true;$('#transfer').disabled=true;$('#status').textContent='Transferindo para sua área privada…';send({type:'vello-transfer-data',payload});});
 if(destination&&nonce){for(const origin of origins)destination.postMessage({type:'vello-transfer-ready',nonce},origin);}
})();
