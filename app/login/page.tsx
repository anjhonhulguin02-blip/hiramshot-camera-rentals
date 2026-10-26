import { redirect } from 'next/navigation';
export default function Login() { redirect('/signin-with-chatgpt?return_to=%2Faccount'); }
