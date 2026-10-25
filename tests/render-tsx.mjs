import { registerHooks } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
registerHooks({
 resolve(specifier, context, nextResolve) {
  try { return nextResolve(specifier, context); }
  catch (error) {
   if (specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) {
    for (const extension of ['.ts','.tsx']) {
     try { return nextResolve(specifier + extension, context); } catch {}
    }
   }
   throw error;
  }
 },
 load(url, context, nextLoad) {
  if (url.startsWith('file:') && /\.tsx$/.test(url)) {
   const source = readFileSync(fileURLToPath(url), 'utf8');
   return {format:'module',source:ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText,shortCircuit:true};
  }
  return nextLoad(url,context);
 }
});
