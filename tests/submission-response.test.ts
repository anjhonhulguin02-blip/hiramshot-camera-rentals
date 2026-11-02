import test from 'node:test';
import assert from 'node:assert/strict';
import {submissionResponse,SubmissionError} from '../lib/submission-response';
const fallback='Could not confirm submission. Reload the checklist before trying again.';
test('verification responses preserve actionable field errors and explicit file-safety messages',async()=>{
 await assert.rejects(submissionResponse(Response.json({error:'Use a different emergency number.',fields:{emergencyPhone:'Must differ from your number.'}},{status:400}),fallback),error=>error instanceof SubmissionError&&error.fields?.emergencyPhone==='Must differ from your number.');
 await assert.rejects(submissionResponse(Response.json({error:'The private scanner is warming up. Your file has not been stored.'},{status:503}),fallback),/not been stored/);
});
test('generic failures, HTML responses and expired sessions produce usable private-form guidance',async()=>{
 for(const body of ['<html>server details</html>',JSON.stringify({error:'Something went wrong. Please try again.'})])await assert.rejects(submissionResponse(new Response(body,{status:500}),fallback),error=>error instanceof Error&&error.message===fallback);
 await assert.rejects(submissionResponse(new Response('',{status:401}),fallback),/sign-in expired/);
 await assert.rejects(submissionResponse(new Response('',{status:413}),fallback),/5 MB/);
 await assert.rejects(submissionResponse(new Response('',{status:429}),fallback),/Wait/);
});
test('an incomplete success must be reconciled rather than silently clearing the selected file',async()=>{
 await assert.rejects(submissionResponse(new Response('<html>not a receipt</html>'),fallback),/check whether the submission arrived/);
 const receipt={id:'synthetic-receipt',status:'RECEIVED_FOR_MANUAL_REVIEW'};
 assert.deepEqual(await submissionResponse(Response.json(receipt,{status:201}),fallback),receipt);
});
