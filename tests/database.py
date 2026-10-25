from pathlib import Path
import sqlite3
root=Path.cwd()
con=sqlite3.connect(':memory:')
con.execute('PRAGMA foreign_keys=ON')
for source in sorted((root/'drizzle').glob('*.sql')):
 con.executescript(source.read_text(encoding='utf-8-sig').replace('--> statement-breakpoint',''))
con.execute("INSERT INTO equipment VALUES ('x5','{}','now')")
con.execute("INSERT INTO units VALUES ('unit-1','x5',1)")
for ident in ['a','b']:
 con.execute("INSERT INTO bookings(id,user_id,request_key,start_date,end_date,days,items,quote,status,contact,created_at,updated_at) VALUES (?,?,?,'2026-11-01','2026-11-03',2,'[]','{}','requested','test','now','now')",(ident,ident,ident))
con.commit()
con.execute("INSERT INTO booking_days VALUES ('d1','a','unit-1','2026-11-01')")
con.commit()
try:
 with con:
  con.execute("INSERT INTO booking_days VALUES ('d2','b','unit-1','2026-11-02')")
  con.execute("INSERT INTO booking_days VALUES ('d3','b','unit-1','2026-11-01')")
 raise AssertionError('Overlapping reservation was accepted')
except sqlite3.IntegrityError: pass
assert con.execute("SELECT COUNT(*) FROM booking_days WHERE booking_id='b'").fetchone()[0]==0
con.execute("INSERT INTO security_events VALUES ('event','owner','192.0.2.1','a','view','now','test')")
con.commit()
for sql in ["UPDATE security_events SET action='changed'","DELETE FROM security_events"]:
 try:
  con.execute(sql)
  raise AssertionError('Audit mutation was accepted')
 except sqlite3.IntegrityError: pass
print('PASS: schema migrations, atomic overlap rollback, and append-only audit triggers')
import re
route=(root/'app/api/bookings/[id]/documents/route.ts').read_text(encoding='utf-8-sig')
query=re.search(r"prepare\('(INSERT INTO kyc_documents.*?)'\)\.bind",route).group(1).replace("\\'", "'")
con.rollback()
con.execute("UPDATE bookings SET status='verification' WHERE id='a'")
args=('doc-1','a','government-id-1','private-1','image/png',100,'now','a')
con.execute(query,args)
assert con.execute('SELECT COUNT(*) FROM kyc_documents').fetchone()[0]==1
con.execute(query,('doc-2',)+args[1:])
assert con.execute('SELECT id FROM kyc_documents').fetchone()[0]=='doc-1'
con.execute("UPDATE kyc_documents SET deleted_at='now' WHERE id='doc-1'")
con.execute(query,('doc-3',)+args[1:])
assert con.execute('SELECT id,deleted_at FROM kyc_documents').fetchone()==('doc-3',None)
print('PASS: real upload SQL refuses active-document replacement and permits re-upload after authorized deletion')
