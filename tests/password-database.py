from pathlib import Path
import sqlite3,re
root=Path.cwd(); db=sqlite3.connect(':memory:'); db.execute('PRAGMA foreign_keys=ON')
for source in sorted((root/'drizzle').glob('*.sql')): db.executescript(source.read_text(encoding='utf-8-sig'))
source=(root/'lib/password-sql.ts').read_text(encoding='utf-8')
consume=re.search(r'CONSUME_PASSWORD_TOKEN_SQL=`([\s\S]*?)`',source)[1]
update=re.search(r'UPDATE_PASSWORD_SQL=`([\s\S]*?)`',source)[1]
db.execute("INSERT INTO password_credentials(id,principal,email,full_name,created_at,updated_at) VALUES ('synthetic','email:synthetic','password@example.invalid','SYNTHETIC','now','now')")
for key,purpose,expires in [('a'*64,'verify',2000),('b'*64,'reset',2000),('c'*64,'verify',999)]: db.execute('INSERT INTO password_tokens(token_hash,credential_id,purpose,expected_version,expires_at) VALUES (?,\'synthetic\',?,0,?)',(key,purpose,expires))
db.commit()
def attempt(key,purpose,nonce,now=1000,version=0):
 with db:
  changed=db.execute(consume,(nonce,key,purpose,now)).rowcount
  saved=db.execute(update,('SYNTHETIC_HASH','verified','updated','synthetic',version,key,nonce)).rowcount
 return changed,saved
assert attempt('a'*64,'reset','wrong-purpose')==(0,0)
assert attempt('c'*64,'verify','expired')==(0,0)
assert attempt('d'*64,'verify','unknown')==(0,0)
assert attempt('a'*64,'verify','first')==(1,1)
assert db.execute('SELECT session_version FROM password_credentials').fetchone()[0]==1
assert attempt('a'*64,'verify','replay')==(0,0)
assert attempt('b'*64,'reset','stale-version')==(0,0)
db.execute("INSERT INTO password_tokens VALUES (?, 'synthetic','reset',1,2000,NULL)",('e'*64,));db.commit()
assert attempt('e'*64,'reset','new-reset',version=1)==(1,1)
assert db.execute('SELECT session_version FROM password_credentials').fetchone()[0]==2
print('PASS password SQL: expiry, purpose binding, single-use, replay and stale-session invalidation')
