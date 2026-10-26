from pathlib import Path
import sqlite3
root=Path.cwd()
con=sqlite3.connect(':memory:')
con.execute('PRAGMA foreign_keys=ON')
for source in sorted((root/'drizzle').glob('*.sql')):
 con.executescript(source.read_text(encoding='utf-8-sig').replace('--> statement-breakpoint',''))
con.execute("INSERT OR IGNORE INTO equipment VALUES ('x5','{}','now')")
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

import uuid
con.commit()
con.execute("INSERT INTO users(id,auth_user_id,role,full_name,email,created_at,updated_at) VALUES ('client','client-auth','CLIENT','Synthetic Client','test@example.invalid','now','now')")
con.execute("UPDATE bookings SET client_id='client' WHERE id='a'")
con.commit()
admin='00000000-0000-4000-8000-000000000001'
ledger_source=(root/'lib/ledger.ts').read_text(encoding='utf-8-sig')
prepared=[q.replace("\\'", "'") for q in re.findall(r"prepare\('((?:\\.|[^'\\])*)'\)",ledger_source)]
cas=next(q for q in prepared if q.startswith('UPDATE bookings SET financial_version='))
master=next(q for q in prepared if q.startswith('INSERT INTO payments('))
entry=next(q for q in prepared if q.startswith('INSERT INTO financial_transactions('))
def operation(version,request_key,reference,kind,lines):
 payment=str(uuid.uuid4());op=str(uuid.uuid4())
 with con:
  changed=con.execute(cas,(op,'a',version,'verification')).rowcount
  con.execute(master,(payment,'a','client',admin,request_key,reference,kind,sum(l[1] for l in lines),'CASH',None,None,'Synthetic test',0,'2026-10-26T00:00:00Z','a',op))
  for index,(transaction,amount,revenue,escrow,cash) in enumerate(lines):
   con.execute(entry,(str(uuid.uuid4()),payment,'a','client',admin,'x5',transaction,amount,revenue,escrow,cash,index,0,'Synthetic test','2026-10-26T00:00:00Z',payment))
 return changed,payment

assert operation(0,'payment-1','cash-1','RESERVATION',[('RESERVATION_DOWNPAYMENT',50000,1,0,50000)])[0]==1
assert operation(0,'stale','cash-stale','RESERVATION',[('RESERVATION_DOWNPAYMENT',50000,1,0,50000)])[0]==0
assert con.execute('SELECT COUNT(*) FROM payments').fetchone()[0]==1
try:
 operation(1,'payment-duplicate-reference','cash-1','RESERVATION',[('RESERVATION_DOWNPAYMENT',50000,1,0,50000)])
 raise AssertionError('Duplicate transaction reference was accepted')
except sqlite3.IntegrityError:pass
assert con.execute("SELECT financial_version FROM bookings WHERE id='a'").fetchone()[0]==1
_,deposit=operation(1,'deposit','cash-2','SECURITY_DEPOSIT',[('SECURITY_DEPOSIT_COLLECTED',200000,0,200000,200000)])
operation(2,'refund','cash-3','DEPOSIT_REFUND',[('SECURITY_DEPOSIT_REFUNDED',200000,0,-200000,-200000)])
assert con.execute('SELECT SUM(escrow_effect_centavos),SUM(CASE WHEN is_net_revenue=1 THEN amount_centavos ELSE 0 END) FROM financial_transactions').fetchone()==(0,50000)
try:
 operation(3,'over-refund','cash-4','DEPOSIT_REFUND',[('SECURITY_DEPOSIT_REFUNDED',1,0,-1,-1)])
 raise AssertionError('Negative deposit escrow was accepted')
except sqlite3.IntegrityError:pass
assert con.execute("SELECT financial_version FROM bookings WHERE id='a'").fetchone()[0]==3
for table in ['payments','financial_transactions']:
 for sql in [f"UPDATE {table} SET remarks='changed'",f'DELETE FROM {table}']:
  try:
   con.execute(sql);raise AssertionError('Financial mutation was accepted')
  except sqlite3.IntegrityError:pass
con.rollback()
con.execute("INSERT INTO payment_reversals VALUES (?,?,?)",(deposit,deposit,'now'))
con.commit()
try:
 con.execute("INSERT INTO payment_reversals VALUES (?,?,?)",(deposit,deposit,'later'));raise AssertionError('Duplicate reversal was accepted')
except sqlite3.IntegrityError:pass
for sql in ["UPDATE payment_reversals SET created_at='changed'",'DELETE FROM payment_reversals']:
 try:
  con.execute(sql);raise AssertionError('Reversal history mutation was accepted')
 except sqlite3.IntegrityError:pass
con.rollback()
print('PASS: actual ledger SQL, stale-write protection, duplicate reference rollback, escrow/refund separation, and immutable payment/reversal history')

with con:
 con.execute("INSERT INTO unit_reservations VALUES ('r1','unit-1','a',1000,2000)")
 con.execute("INSERT INTO unit_reservations VALUES ('r2','unit-1','b',2000,3000)")
for sql in ["INSERT INTO unit_reservations VALUES ('r3','unit-1','b',1999,3000)","UPDATE unit_reservations SET pickup_ms=1999 WHERE id='r2'"]:
 try:
  con.execute(sql);raise AssertionError('An exact-time physical overlap was accepted')
 except sqlite3.IntegrityError:pass
con.rollback()
print('PASS: exact-time reservations allow back-to-back handovers and reject INSERT/UPDATE overlaps')

create_source=(root/'app/api/bookings/route.ts').read_text(encoding='utf-8-sig')
create_query=next(q.replace("\\'", "'") for q in re.findall(r"prepare\('((?:\\.|[^'\\])*)'\)",create_source) if q.startswith('INSERT INTO bookings('))
con.execute(create_query,('c','client-auth','new-key','2026-11-01','2026-11-04',3,'[]','{}','encrypted-test','now','now','client','HSR-TEST-3','2026-11-01T09:00:00+08:00','2026-11-04T09:00:00+08:00','Synthetic event','MEETUP',165000,200000,50000))
assert con.execute("SELECT total_rental_fee_centavos,required_reservation_centavos FROM bookings WHERE id='c'").fetchone()==(165000,50000)
con.commit()
print('PASS: actual booking creation SQL and all bound snapshot fields')

con.executescript((root/'outputs/seed-local.sql').read_text(encoding='utf-8'))
assert con.execute('SELECT COUNT(*) FROM equipment_inventory').fetchone()[0]==4
assert con.execute('SELECT COUNT(DISTINCT unit_id) FROM equipment_inventory WHERE equipment_id=\'neo2\'').fetchone()[0]==1
assert con.execute('SELECT COUNT(*) FROM users WHERE is_demo=1').fetchone()[0]==2
assert con.execute('SELECT COALESCE(SUM(amount_centavos),0) FROM financial_transactions WHERE is_demo=0 AND is_net_revenue=1').fetchone()[0]==50000
print('PASS: local synthetic fixtures, four packages, shared physical drone, and demo revenue exclusion')

inventory_source=(root/'lib/inventory.ts').read_text(encoding='utf-8')
availability_sql=re.search(r'AVAILABLE_UNIT_SQL = "(.*?)";',inventory_source).group(1)
con.execute("DELETE FROM booking_days WHERE unit_id='unit-1'")
con.execute("UPDATE units SET active=0 WHERE id='x5-unit-1'")
assert con.execute(availability_sql,('x5',1600,1500,'2026-12-01','2026-12-02',9999)).fetchone() is None
assert con.execute(availability_sql,('x5',4000,3000,'2026-12-01','2026-12-02',9999)).fetchone()[0]=='unit-1'
con.execute("UPDATE bookings SET status='out' WHERE id='a'")
assert con.execute(availability_sql,('x5',4000,3000,'2026-12-01','2026-12-02',9999)).fetchone() is None
print('PASS: shared availability SQL excludes maintenance, interval overlaps, and overdue physical units')
