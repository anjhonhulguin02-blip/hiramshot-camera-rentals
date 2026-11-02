// Never display an HTML proxy error or server internals in a private form.
export class SubmissionError extends Error{
 fields?:Record<string,string>;
 constructor(message:string,fields?:Record<string,string>){super(message);this.fields=fields;}
}
export async function submissionResponse(response:Response,fallback:string){
 let data:{error?:unknown;fields?:Record<string,string>;id?:string;status?:string}|null=null;
 try{data=await response.json();}catch{/* Gateways can return an empty or HTML error. */}
 if(!response.ok){
  if(typeof data?.error==='string'&&data.error!=='Something went wrong. Please try again.')throw new SubmissionError(data.error,data.fields);
  const message=response.status===401?'Your sign-in expired. Sign in again, then return to your requirements.':response.status===413?'Use a photo or document no larger than 5 MB.':response.status===429?'Too many attempts. Wait before submitting again.':fallback;
  throw new Error(message);
 }
 if(!data||typeof data!=='object')throw new Error('The server response was incomplete. Reload your requirements to check whether the submission arrived before trying again.');
 return data;
}
