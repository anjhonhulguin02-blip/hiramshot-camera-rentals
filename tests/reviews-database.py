from pathlib import Path
import sqlite3,re
root=Path.cwd();db=sqlite3.connect(':memory:');db.execute('PRAGMA foreign_keys=ON')
for source in sorted((root/'drizzle').glob('*.sql')):db.executescript(source.read_text(encoding='utf-8-sig'))
# Rental lifecycle guards have their own integration suite. Seed post-lifecycle
# fixtures here while keeping every review/media trigger under test intact.
for (name,) in db.execute("SELECT name FROM sqlite_master WHERE type='trigger' AND tbl_name='bookings'").fetchall():db.execute('DROP TRIGGER "'+name+'"')
admin=db.execute("SELECT id FROM users WHERE role='ADMIN' LIMIT 1").fetchone()[0]
db.execute("INSERT INTO users(id,auth_user_id,role,full_name,email,created_at,updated_at) VALUES ('renter','synthetic-renter','CLIENT','SYNTHETIC','review@example.invalid','now','now')")
db.execute("INSERT OR IGNORE INTO equipment VALUES ('x5','{}','now')")
for name,status,demo in [('cleared','returned',0),('pending','requested',0),('active','out',0),('demo','returned',1),('cancelled','cancelled',0)]:
 db.execute("INSERT INTO bookings(id,user_id,client_id,request_key,start_date,end_date,days,items,quote,status,contact,cleared_at,is_demo,created_at,updated_at) VALUES (?,'synthetic-renter','renter',?,'2026-11-01','2026-11-02',1,'[]','{}',?,'SYNTHETIC',?,?, 'now','now')",(name,name,status,'now' if status=='returned' else None,demo))
 db.execute("INSERT INTO booking_items VALUES (?,?,'x5','Standard',65000,200000)",('item-'+name,name))
db.commit()
def reject(sql,values=()):
 try:
  with db:db.execute(sql,values)
 except sqlite3.IntegrityError:return
 raise AssertionError('Invalid review operation was accepted')
insert="INSERT INTO reviews(id,booking_id,client_id,equipment_id,rating,body,display_name,public_consent_at,created_at,updated_at) VALUES (?,?,'renter','x5',?,'SYNTHETIC review text','Test renter',?,'now','now')"
reject(insert,('pending-review','pending',5,'now'));reject(insert,('demo-review','demo',5,'now'));reject(insert,('bad-rating','cleared',6,'now'));reject(insert,('no-consent','cleared',5,None))
db.execute(insert,('review','cleared',4,'now'));db.commit();reject(insert,('duplicate','cleared',4,'now'))
reject("UPDATE reviews SET status='PUBLISHED',version=version+1 WHERE id='review'")
media="INSERT INTO review_media VALUES (?, 'review',?,'image/jpeg',100,?,'CLEAN','now',NULL)"
reject(media,('private-id','kyc/private-id','a'*64))
source=(root/'lib/review-policy.ts').read_text()
upload_sql=re.search(r'INSERT_REVIEW_MEDIA_SQL=`([\s\S]*?)`',source)[1]
bump_sql=re.search(r'BUMP_REVIEW_MEDIA_VERSION_SQL=`([\s\S]*?)`',source)[1]
for index in range(4):
 with db:
  assert db.execute(upload_sql,('media'+str(index),'review','review-media/review/'+str(index),'image/jpeg',100,str(index)*64,'now','review','renter',index,'review')).rowcount==1
  assert db.execute(bump_sql,('now','review',index,'media'+str(index))).rowcount==1
db.commit();reject(media,('fifth','review-media/review/5','5'*64))
assert db.execute("UPDATE reviews SET status='PUBLISHED',moderated_by=?,version=version+1 WHERE id='review' AND version=0",(admin,)).rowcount==0,'A new upload must invalidate the moderator\'s stale view'
db.execute("UPDATE reviews SET status='PUBLISHED',moderated_by=?,version=version+1 WHERE id='review'",(admin,));db.commit()
reject("UPDATE reviews SET body='Unreviewed changed content',version=version+1 WHERE id='review'")
reject(media,('published-upload','review-media/review/6','6'*64))
db.execute("UPDATE reviews SET status='HIDDEN',public_consent_at=NULL,version=version+1 WHERE id='review'");db.commit()
reject("UPDATE reviews SET status='PUBLISHED',version=version+1 WHERE id='review'")
sql=re.search(r'MOST_RENTED_SQL=`([\s\S]*?)`',(root/'lib/review-policy.ts').read_text())[1]
assert db.execute(sql).fetchall()==[('x5',2)],'Demo, pending and cancelled bookings must not inflate Top picks'
assert db.execute("SELECT COUNT(*) FROM reviews WHERE status='PUBLISHED' AND public_consent_at IS NOT NULL").fetchone()[0]==0
print('PASS review SQL: cleared ownership, rating/consent, uniqueness, moderation, private-key isolation, media limits, withdrawal, real rental ranking')
