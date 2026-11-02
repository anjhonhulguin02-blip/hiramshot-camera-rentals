import {getChatGPTUser} from '../../chatgpt-auth';
import {env} from '@hiramshot/runtime';
import {eligibleAdmin} from '../../../lib/security';
import {failure,json} from '../../../lib/api';
export async function GET(){try{
 const user=await getChatGPTUser();if(!user)return json({signedIn:false});
 return json({signedIn:true,name:user.displayName||user.fullName||'Your account',email:user.email,admin:await eligibleAdmin(user),emailSignInEnabled:env.PASSWORD_AUTH_ENABLED==='true'});
}catch(error){return failure(error);}}
