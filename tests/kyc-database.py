from pathlib import Path
import sqlite3,re

root=Path.cwd();db=sqlite3.connect(':memory:');db.execute('PRAGMA foreign_keys=ON')
for source in sorted((root/'drizzle').glob('*.sql')):db.executescript(source.read_text(encoding='utf-8-sig'))
admin='00000000-0000-4000-8000-000000000001'
db.execute("INSERT INTO users(id,auth_user_id,role,full_name,email,created_at,updated_at) VALUES ('client','client-auth','CLIENT','SYNTHETIC CLIENT','kyc-test@example.invalid','now','now')")
db.execute("INSERT INTO bookings(id,user_id,client_id,request_key,start_date,end_date,days,items,quote,status,contact,personal,created_at,updated_at) VALUES ('booking','client-auth','client','request','2026-11-01','2026-11-02',1,'[]','{}','verification','synthetic-contact','synthetic-personal','now','now')")
db.commit()
def rejected(sql,args=()):
 try:
  with db:db.execute(sql,args)
 except sqlite3.IntegrityError:return
 raise AssertionError('A protected transition or invalid document was accepted')
rejected("UPDATE users SET kyc_status='VERIFIED' WHERE id='client'")
db.execute("UPDATE users SET mobile_number='encrypted-own',emergency_contact_name='encrypted-name',emergency_contact_relationship='encrypted-relationship',emergency_contact_number='encrypted-phone',kyc_status='PENDING_REVIEW' WHERE id='client'")
db.commit()
approval="UPDATE bookings SET status='verified',verified_at='now',live_video_verified_at='now',live_video_verified_by=? WHERE id='booking'"
kinds=['government-id-1','government-id-2','company-school-id','proof-of-billing','selfie-with-id']
for index,kind in enumerate(kinds):
 rejected(approval,(admin,))
 db.execute("INSERT INTO kyc_documents(id,booking_id,kind,object_key,mime,size,created_at,sha256,scan_status,reviewed_at,reviewed_by) VALUES (?,'booking',?,?,'image/png',100,'now',?,'CLEAN','now',?)",('doc-'+str(index),kind,'private-'+str(index),hex(index+1)[2:]*64,admin));db.commit()
rejected("UPDATE bookings SET status='verified',verified_at='now' WHERE id='booking'")
db.execute("UPDATE kyc_documents SET reviewed_at=NULL WHERE kind='proof-of-billing'");db.commit()
rejected(approval,(admin,))
db.execute("UPDATE kyc_documents SET reviewed_at='now' WHERE kind='proof-of-billing'")

# Execute the real API approval compare-and-swap against a changed upload version.
route=(root/'app/api/bookings/[id]/route.ts').read_text(encoding='utf-8')
review_sql=next(sql for sql in re.findall(r'db.prepare\("([^"]+)"\)',route) if sql.startswith("UPDATE bookings SET status='verified'"))
review_version=db.execute("SELECT kyc_version FROM bookings WHERE id='booking'").fetchone()[0]
db.execute("UPDATE kyc_documents SET sha256=? WHERE kind='government-id-1'",('a'*64,))
assert db.execute(review_sql,('now','now',admin,'now','booking',review_version)).rowcount==0
assert db.execute("SELECT status FROM bookings WHERE id='booking'").fetchone()[0]=='verification'
db.commit()
db.execute(approval,(admin,));db.commit()
db.execute("UPDATE bookings SET status='reserved',lifecycle_status='CONFIRMED_RESERVED' WHERE id='booking'");db.commit()
db.execute("UPDATE kyc_documents SET deleted_at='deleted' WHERE kind='selfie-with-id'");db.commit()
rejected("UPDATE bookings SET status='signed' WHERE id='booking'")
rejected("UPDATE kyc_documents SET deleted_at=NULL,sha256=? WHERE kind='selfie-with-id'",('2'*64,))
rejected("UPDATE kyc_documents SET scan_status='CLEAN',sha256='bad' WHERE kind='government-id-1'")
print('PASS: each missing document blocks confirmation, live review is mandatory, stale approval is rejected, missing or deleted reviewed files block signing, duplicate hashes and malformed metadata are rejected')
