import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PrismaClient } from '@prisma/client';
const base=process.env.TEST_BASE_URL||'http://localhost:3147';
if(!process.env.TEST_DATABASE_URL || !['localhost','127.0.0.1'].includes(new URL(process.env.TEST_DATABASE_URL).hostname))throw Error('Use TEST_DATABASE_URL apontando exclusivamente para um banco local de testes.');
const transport=process.env.TEST_IN_PROCESS==='true' ? (await import('./dispatch-test.mjs')).dispatch : fetch;
const db=new PrismaClient({datasourceUrl:process.env.TEST_DATABASE_URL});
if(process.env.TEST_IN_PROCESS==='true' && process.env.DATABASE_URL!==process.env.TEST_DATABASE_URL)throw Error('DATABASE_URL e TEST_DATABASE_URL devem apontar para o mesmo banco local de testes.');
const password='Test-Bizpeek-Only!2026';const stamp=Date.now();const tests=[];
async function call(path,{method='GET',body,cookie,origin=base}={}){const r=await transport(base+path,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{}),Origin:origin},body:body?JSON.stringify(body):undefined,redirect:'manual'});const text=await r.text();let data;try{data=JSON.parse(text)}catch{data=text}return {status:r.status,data,headers:r.headers};}
function check(name,condition){assert.ok(condition,name);tests.push({name,passed:true});console.log('PASS',name);}
async function signup(name){const r=await call('/api/auth/sign-up/email',{method:'POST',body:{name,email:`${name.toLowerCase()}-${stamp}@example.test`,password,role:'ADMIN',suspended:false}});assert.equal(r.status,200,JSON.stringify(r.data));return {id:r.data.user.id,email:r.data.user.email,cookie:r.headers.getSetCookie().map(x=>x.split(';')[0]).join('; ')};}
try{
check('Unauthenticated data access denied',(await call('/api/records')).status===401);
if(process.env.TEST_IN_PROCESS!=='true')check('Protected page redirects to login',(await call('/dashboard')).status===307);
const a=await signup('ContaA'),b=await signup('ContaB');
check('Signup cannot promote itself to admin',(await db.user.findUnique({where:{id:a.id}})).role==='USER');
check('Cookies HttpOnly',(await call('/api/auth/sign-in/email',{method:'POST',body:{email:a.email,password}})).headers.get('set-cookie')?.includes('HttpOnly'));
check('Wrong password rejected',(await call('/api/auth/sign-in/email',{method:'POST',body:{email:a.email,password:'wrong-password'}})).status===401);
const note={title:'Private note A',content:'Only A may read this',category:'Test',color:'violet',pinned:false};
const created=await call('/api/records',{method:'POST',cookie:a.cookie,body:{kind:'note',data:note,userId:b.id}});
check('Owner may create note',created.status===201);const id=created.data.id;
check('Supplied owner is ignored',(await db.workspaceRecord.findUnique({where:{id}})).userId===a.id);
check('Other account cannot list note',!(await call('/api/records',{cookie:b.cookie})).data.some(r=>r.id===id));
check('Other account cannot edit note',(await call('/api/records',{method:'POST',cookie:b.cookie,body:{id,kind:'note',data:{...note,title:'hacked'}}})).status===404);
check('Other account cannot delete note',(await call(`/api/records?id=${id}`,{method:'DELETE',cookie:b.cookie})).status===404);
check('Cross origin mutation rejected',(await call('/api/records',{method:'POST',cookie:a.cookie,origin:'https://evil.example',body:{kind:'note',data:note}})).status===403);
check('Invalid payload rejected',(await call('/api/records',{method:'POST',cookie:a.cookie,body:{kind:'note',data:{title:''}}})).status===400);
check('Non-admin API denied',(await call('/api/admin',{cookie:a.cookie})).status===403);
if(process.env.TEST_IN_PROCESS!=='true')check('Non-admin page denied',(await call('/admin',{cookie:a.cookie})).status===404);
const lead=await call('/api/records',{method:'POST',cookie:a.cookie,body:{kind:'lead',data:{id:'external-test',name:'Test lead',score:75,stage:'Novo',value:500}}});
check('Lead creation persists',lead.status===201);
const eventData={title:'Follow up',date:new Date().toISOString(),leadId:lead.data.id,detail:'Test',done:false,type:'Follow-up'};
check('Other account cannot link private lead',(await call('/api/records',{method:'POST',cookie:b.cookie,body:{kind:'event',data:eventData}})).status===404);
const scheduled=await call('/api/records',{method:'POST',cookie:a.cookie,body:{kind:'event',data:eventData}});
check('Owner can schedule linked event',scheduled.status===201);
check('Completing event succeeds',(await call('/api/records',{method:'POST',cookie:a.cookie,body:{id:scheduled.data.id,kind:'event',data:{...eventData,done:true}}})).status===200);
check('Completed event records lead contact',Boolean((await db.workspaceRecord.findUnique({where:{id:lead.data.id}})).data.contactAt));
check('Other account cannot register contact',(await call('/api/contacts',{method:'POST',cookie:b.cookie,body:{leadId:lead.data.id}})).status===404);
check('Owner can register contact',(await call('/api/contacts',{method:'POST',cookie:a.cookie,body:{leadId:lead.data.id}})).status===200);
check('Contact creates calendar history',(await db.workspaceRecord.count({where:{userId:a.id,kind:'event'}}))===2);
check('Profile update ignores role',(await call('/api/profile',{method:'PATCH',cookie:a.cookie,body:{name:'Conta A',image:null,role:'ADMIN'}})).status===200 && (await db.user.findUnique({where:{id:a.id}})).role==='USER');
check('Invalid image rejected',(await call('/api/profile',{method:'PATCH',cookie:a.cookie,body:{name:'Conta A',image:'javascript:alert(1)'}})).status===400);
await db.user.update({where:{id:a.id},data:{role:'ADMIN'}});
const admin=await call('/api/admin',{cookie:a.cookie});check('Admin can inspect platform accounts',admin.status===200);
check('Admin response excludes private record content',!JSON.stringify(admin.data).includes('Only A may read'));
check('Admin can suspend user',(await call('/api/admin',{method:'PATCH',cookie:a.cookie,body:{id:b.id,suspended:true}})).status===200);
check('Suspended user session invalidated',(await call('/api/records',{cookie:b.cookie})).status===401);
check('Admin cannot suspend itself',(await call('/api/admin',{method:'PATCH',cookie:a.cookie,body:{id:a.id,suspended:true}})).status===400);
await call('/api/admin',{method:'PATCH',cookie:a.cookie,body:{id:b.id,suspended:false}});
const loginB=await call('/api/auth/sign-in/email',{method:'POST',body:{email:b.email,password}});
b.cookie=loginB.headers.getSetCookie().map(x=>x.split(';')[0]).join('; ');
if(process.env.TEST_IN_PROCESS==='true'){
process.env.BILLING_ENABLED='true';
check('Unpaid user cannot write',(await call('/api/records',{method:'POST',cookie:b.cookie,body:{kind:'note',data:note}})).status===402);
await db.subscription.upsert({where:{userId:b.id},create:{userId:b.id,status:'active',periodEnd:new Date(Date.now()+86400000)},update:{status:'active',periodEnd:new Date(Date.now()+86400000)}});
check('Active subscriber can write',(await call('/api/records',{method:'POST',cookie:b.cookie,body:{kind:'note',data:note}})).status===201);
await db.subscription.update({where:{userId:b.id},data:{periodEnd:new Date(Date.now()-86400000)}});
check('Expired subscriber cannot write',(await call('/api/records',{method:'POST',cookie:b.cookie,body:{kind:'note',data:note}})).status===402);
await db.subscription.update({where:{userId:b.id},data:{status:'past_due',periodEnd:new Date(Date.now()+86400000)}});
check('Past-due subscriber cannot write',(await call('/api/records',{method:'POST',cookie:b.cookie,body:{kind:'note',data:note}})).status===402);
check('Expired user retains read-only data access',(await call('/api/records',{cookie:b.cookie})).status===200);
process.env.BILLING_ENABLED='false';
}
const resetToken='local-test-reset-'+stamp;
await db.verification.create({data:{id:resetToken,identifier:'reset-password:'+resetToken,value:b.id,expiresAt:new Date(Date.now()+600000)}});
check('Invalid reset token denied',(await call('/api/auth/reset-password',{method:'POST',body:{token:'not-a-valid-token',newPassword:'New-Test-Password2026!'}})).status===400);
check('Valid reset token changes password',(await call('/api/auth/reset-password',{method:'POST',body:{token:resetToken,newPassword:'New-Test-Password2026!'}})).status===200);
check('Reset token cannot be reused',(await call('/api/auth/reset-password',{method:'POST',body:{token:resetToken,newPassword:'Another-Test-Password2026!'}})).status===400);
check('Reset revokes old sessions',(await call('/api/records',{cookie:b.cookie})).status===401);
check('New password authenticates',(await call('/api/auth/sign-in/email',{method:'POST',body:{email:b.email,password:'New-Test-Password2026!'}})).status===200);
check('Unsigned Stripe webhook denied',[400,503].includes((await call('/api/webhooks/stripe',{method:'POST',body:{type:'customer.subscription.updated'}})).status));
check('Logout succeeds',(await call('/api/auth/sign-out',{method:'POST',cookie:a.cookie,body:{}})).status===200);
check('Logged-out session no longer works',(await call('/api/records',{cookie:a.cookie})).status===401);
fs.writeFileSync('security-test-results.json',JSON.stringify({date:new Date().toISOString(),tests},null,2));
console.log(`${tests.length} security/integration checks passed.`);
}finally{await db.$disconnect();}
