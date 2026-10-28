import {normalizePhilippineMobile} from './verification';

export const PERSONAL_FIELDS=[
 {key:'fullName',label:'Full legal name',max:100,type:'text',autocomplete:'name',hint:'Use the full name shown on your government IDs.'},
 {key:'address',label:'Current address',max:500,type:'text',autocomplete:'street-address',hint:'Include house/unit, street, barangay, city/municipality and province.'},
 {key:'mobile',label:'Mobile number',max:25,type:'tel',autocomplete:'tel',hint:'Philippine mobile: 09XXXXXXXXX or +639XXXXXXXXX.'},
 {key:'socialLink',label:'Social media profile URL',max:300,type:'url',autocomplete:'url',hint:'Paste your complete profile link, starting with https://.'},
 {key:'occupation',label:'Occupation / company / school',max:200,type:'text',autocomplete:'organization',hint:'Enter your occupation, employer or school name.'},
 {key:'emergencyName',label:'Emergency contact name',max:100,type:'text',autocomplete:'off',hint:'Enter the name of someone we can contact in an emergency.'},
 {key:'emergencyRelationship',label:'Emergency contact relationship',max:80,type:'text',autocomplete:'off',hint:'For example: parent, sibling, spouse or partner.'},
 {key:'emergencyPhone',label:'Emergency contact number',max:25,type:'tel',autocomplete:'off',hint:'Use a Philippine mobile number different from your own.'},
 {key:'videoCall',label:'Preferred video call time (Manila)',max:50,type:'datetime-local',autocomplete:'off',hint:'Choose a future date and time. All times are in Manila time.'},
] as const;
export type PersonalKey=typeof PERSONAL_FIELDS[number]['key']|'pickupMethod';
export type PersonalErrors=Partial<Record<PersonalKey,string>>;
export function videoCallInput(value:string){if(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))return value;const time=Date.parse(value);return Number.isFinite(time)?new Date(time+8*3600000).toISOString().slice(0,16):'';}
export function validatePersonalDetails(value:unknown,now=Date.now()){
 const input=(value&&typeof value==='object'?value:{}) as Record<string,unknown>,details:Record<string,string>={},errors:PersonalErrors={};
 for(const field of PERSONAL_FIELDS){const raw=input[field.key];if(typeof raw!=='string'||raw.trim().length<2){errors[field.key]=field.key==='videoCall'?'Choose a date and time for your video call.':`Enter your ${field.label.toLowerCase()}.`;continue;}if(raw.length>field.max){errors[field.key]=`Keep ${field.label.toLowerCase()} within ${field.max} characters.`;continue;}details[field.key]=raw.trim();}
 for(const key of ['mobile','emergencyPhone'] as const)if(!errors[key])try{details[key]=normalizePhilippineMobile(details[key]);}catch{errors[key]=key==='mobile'?'Enter a Philippine mobile number, such as 0917 123 4567 or +63 917 123 4567.':'Enter your emergency contact’s Philippine mobile number (09XXXXXXXXX or +639XXXXXXXXX).';}
 if(!errors.mobile&&!errors.emergencyPhone&&details.mobile===details.emergencyPhone)errors.emergencyPhone='Use a different number. Your emergency contact cannot use your own mobile number.';
 if(!errors.socialLink)try{const url=new URL(details.socialLink);if(url.protocol!=='https:'||url.username||url.password)throw new Error();}catch{errors.socialLink='Use a complete HTTPS profile link, for example https://www.facebook.com/yourprofile.';}
 if(!errors.videoCall){if(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(details.videoCall))details.videoCall+=':00+08:00';const time=Date.parse(details.videoCall);if(!Number.isFinite(time)||time<=now)errors.videoCall='Choose a future video call date and time in Manila time.';}
 if(!['Self-pickup','Meetup'].includes(String(input.pickupMethod)))errors.pickupMethod='Choose self-pickup or meetup for your first rental.';else details.pickupMethod=String(input.pickupMethod);
 return {details,errors};
}
