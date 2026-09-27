import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
const origin = 'http://localhost:3001';
if (!['localhost','127.0.0.1'].includes(new URL(process.env.DATABASE_URL).hostname)) throw new Error('Use somente banco local de teste.');
const db = new PrismaClient();
const ids = [];
async function request(path, cookie, body, method = 'POST') {
  const response = await fetch(origin + path, { method, headers:{Origin:origin,'Content-Type':'application/json', ...(cookie ? {Cookie:cookie} : {})}, ...(body ? {body:JSON.stringify(body)} : {}) });
  return {status:response.status, data:await response.json(), cookie:response.headers.getSetCookie().map(x => x.split(';')[0]).join('; ')};
}
try {
  const accounts=[];
  for (const suffix of ['a','b']) {
    const result=await request('/api/auth/sign-up/email',null,{name:'API Test',email:`agenda-${Date.now()}-${suffix}@example.com`,password:'Api-test-only-2026!'});
    assert.equal(result.status,200); ids.push(result.data.user.id); accounts.push(result);
  }
  const [a,b]=accounts;
  const note={title:'Nota datada',content:'Privada',category:'Reuniões',color:'mint',pinned:false,date:'2026-10-12',repeatYearly:true};
  const saved=await request('/api/records',a.cookie,{kind:'note',data:note});
  assert.equal(saved.status,201); assert.equal(saved.data.data.date,note.date); assert.equal(saved.data.data.repeatYearly,true);
  assert.equal((await request('/api/records',a.cookie,{kind:'note',data:{...note,date:'2026-02-30'}})).status,400);
  assert.equal((await request('/api/records',b.cookie,{id:saved.data.id,kind:'note',data:note})).status,404);
  const plan={totalCents:10000,installments:[{id:'1',amountCents:5000,dueDate:'2026-10-31',paidDate:'2026-09-27'},{id:'2',amountCents:5000,dueDate:'2026-11-30',paidDate:null}]};
  const lead={id:'qa-lead',name:'Cliente teste',score:50,stage:'Ganho',value:100,paymentPlan:plan};
  const deal=await request('/api/records',a.cookie,{kind:'lead',data:lead});
  assert.equal(deal.status,201); assert.deepEqual(deal.data.data.paymentPlan,plan);
  assert.equal((await request('/api/records',b.cookie,{id:deal.data.id,kind:'lead',data:lead})).status,404);
  assert.equal((await request('/api/records',a.cookie,{id:deal.data.id,kind:'lead',data:{...lead,paymentPlan:{...plan,totalCents:9999}}})).status,400);
  const privateData=await request('/api/records',b.cookie,undefined,'GET');
  assert.equal(privateData.data.some(x=>x.id===deal.data.id||x.id===saved.data.id),false);
  plan.installments[0].paidDate=null;
  assert.equal((await request('/api/records',a.cookie,{id:deal.data.id,kind:'lead',data:{...lead,paymentPlan:plan}})).status,200);
  console.log('API aprovada: notas datadas, recorrência, planos, estorno, validação e isolamento entre usuários.');
} finally { for(const id of ids) await db.user.delete({where:{id}}); await db.$disconnect(); }
