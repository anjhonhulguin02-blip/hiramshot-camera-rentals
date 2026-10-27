import {getChatGPTUser} from '../../../chatgpt-auth';
import {assertSameOrigin,database,failure,json,readBody,ApiError} from '../../../../lib/api';
import {ensureAccount,RegistrationRequiredError,isConfiguredAdministrator,PRIVATE_PROFILE_FIELDS,validateProfile} from '../../../../lib/accounts';
import {applyRequestLimit,audit,encrypt,verifyTurnstile} from '../../../../lib/security';
import {REGISTRATION_LIMIT} from '../../../../lib/request-limits';
export async function POST(request:Request){try{
 assertSameOrigin(request);const user=await getChatGPTUser();if(!user)throw new ApiError(401,'Sign in before registering your HiramShot profile.');
 await applyRequestLimit(request,user.userId,REGISTRATION_LIMIT);
 const body=await readBody(request);await verifyTurnstile(request,body?.turnstileToken,'registration');
 if(body?.privacyConsent!==true||body?.emergencyContactConsent!==true)throw new ApiError(400,'Accept the privacy notice and confirm your emergency contact knows their details are being provided.');
 let profile;try{profile=validateProfile(body.profile);}catch(error){throw new ApiError(400,(error as Error).message);}
 try{const existing=await ensureAccount(user);if(existing.account_status!=='ACTIVE')throw new ApiError(403,'This account is restricted. Contact HiramShot.');return json({ok:true,alreadyRegistered:true});}catch(error){if(!(error instanceof RegistrationRequiredError))throw error;}
 const columns=Object.values(PRIVATE_PROFILE_FIELDS),values=[];
 for(const key of Object.keys(PRIVATE_PROFILE_FIELDS))values.push(profile[key]?await encrypt({value:profile[key]}):null);
 const now=new Date().toISOString(),id=crypto.randomUUID();await audit(request,user.userId,'','account.registration.attempt');
 await database().prepare(`INSERT INTO users(id,auth_user_id,role,full_name,email,${columns.join(',')},created_at,updated_at) VALUES (${Array(7+columns.length).fill('?').join(',')}) ON CONFLICT(email) DO NOTHING`)
  .bind(id,user.userId,isConfiguredAdministrator(user)?'ADMIN':'CLIENT',profile.fullName,user.email.toLowerCase(),...values,now,now).run();
 const account=await ensureAccount(user);if(account.account_status!=='ACTIVE')throw new ApiError(403,'This account is restricted.');
 await audit(request,user.userId,'','account.registration.completed');return json({ok:true},201);
}catch(error){return failure(error);}}
