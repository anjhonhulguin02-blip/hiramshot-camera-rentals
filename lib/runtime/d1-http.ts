type Parameter=string|number|null;
type Query={sql:string;params:Parameter[]};
type Result<T=Record<string,unknown>>={success:boolean;results:T[];meta:{changes:number;[key:string]:unknown}};
type Config={accountId:string;databaseId:string;token:string;fetch?:typeof fetch};
export class D1HttpDatabase {
 private readonly url:string;private readonly request:typeof fetch;private readonly config:Config;
 constructor(config:Config){
  this.config=config;
  if(!/^[a-f0-9]{32}$/.test(config.accountId)||!/^[a-f0-9-]{36}$/.test(config.databaseId)||!config.token)throw new Error('Invalid D1 server configuration.');
  this.url=`https://api.cloudflare.com/client/v4/accounts/${config.accountId}/d1/database/${config.databaseId}/query`;this.request=config.fetch??fetch;
 }
 prepare(sql:string){return new D1HttpStatement(this,sql,[]);}
 async batch<T=Record<string,unknown>>(statements:D1HttpStatement[]):Promise<Result<T>[]>{
  if(!statements.length)throw new Error('An empty D1 batch is not allowed.');
  const queries=statements.map(statement=>{if(!(statement instanceof D1HttpStatement)||statement.database!==this)throw new Error('D1 statements must belong to the same database.');return statement.query();});
  return this.execute<T>({batch:queries},queries.length);
 }
 async execute<T>(body:Query|{batch:Query[]},expected=1):Promise<Result<T>[]>{
  // Do not retry writes after an uncertain response: a payment may already exist.
  const response=await this.request(this.url,{method:'POST',headers:{Authorization:`Bearer ${this.config.token}`,'Content-Type':'application/json'},body:JSON.stringify(body),cache:'no-store',signal:AbortSignal.timeout(20000)});
  const data=await response.json() as {success?:boolean;result?:Result<T>[];errors?:{message?:string}[]};
  if(!response.ok||data.success!==true||!Array.isArray(data.result)||data.result.length!==expected||data.result.some(result=>result.success===false)){
   const messages=JSON.stringify(data.errors??[]);if(/overlap/i.test(messages))throw new Error('D1 constraint: reservation overlap.');if(/UNIQUE constraint/i.test(messages))throw new Error('D1 UNIQUE constraint failed.');throw new Error('D1 operation failed. Refresh the booking before retrying.');
  }
  for(const result of data.result)if(!Array.isArray(result.results)||!Number.isSafeInteger(result.meta?.changes))throw new Error('Invalid D1 result metadata.');
  return data.result;
 }
}
class D1HttpStatement {
 readonly database:D1HttpDatabase;private readonly sql:string;private readonly parameters:Parameter[];
 constructor(database:D1HttpDatabase,sql:string,parameters:Parameter[]){this.database=database;this.sql=sql;this.parameters=parameters;}
 bind(...parameters:unknown[]){const values=parameters.map(value=>{if(value===null||typeof value==='string'||(typeof value==='number'&&Number.isFinite(value)))return value;throw new Error('Unsupported D1 parameter.');});return new D1HttpStatement(this.database,this.sql,values);}
 query():Query{return {sql:this.sql,params:this.parameters};}
 async all<T=Record<string,unknown>>(){return (await this.database.execute<T>(this.query()))[0];}
 async run<T=Record<string,unknown>>(){return this.all<T>();}
 async first<T=Record<string,unknown>>(column?:string):Promise<T|null>{const row=(await this.all<Record<string,unknown>>()).results[0];if(!row)return null;if(column&&!Object.prototype.hasOwnProperty.call(row,column))throw new Error('D1 column not found.');return (column?row[column]:row) as T;}
 async raw<T=unknown[]>(options?:{columnNames?:boolean}):Promise<T[]>{const rows=(await this.all<Record<string,unknown>>()).results;if(!rows.length)return [];const columns=Object.keys(rows[0]),values=rows.map(row=>columns.map(column=>row[column]));return (options?.columnNames?[columns,...values]:values) as T[];}
}
