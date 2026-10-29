"""Private ClamD INSTREAM adapter. No customer files, content or filenames are persisted/logged."""
import calendar
import hashlib
import hmac
import json
import os
import socket
from socketserver import TCPServer
import struct
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

MAX_FILE = 5 * 1024 * 1024
SLOTS = threading.BoundedSemaphore(2)


def reply(sock):
    data = bytearray()
    while b'\0' not in data:
        piece = sock.recv(1024)
        if not piece or len(data) + len(piece) > 8192:
            raise ValueError('Incomplete engine response')
        data.extend(piece)
    return bytes(data).split(b'\0', 1)[0].decode('ascii', 'strict')


def connect():
    sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
    sock.settimeout(12)
    try:
        sock.connect('/tmp/clamd.sock')
    except BaseException:
        sock.close()
        raise
    return sock


def engine_ready():
    with connect() as sock:
        sock.sendall(b'zVERSION\0')
        version = reply(sock)
    if not version.startswith('ClamAV '):
        raise ValueError('Engine unavailable')
    stamp = version.split('/', 2)[2].strip()
    signature_time = calendar.timegm(time.strptime(stamp, '%a %b %d %H:%M:%S %Y'))
    if not -300 <= time.time() - signature_time <= 48 * 3600:
        raise ValueError('Signatures are stale')


def scan_bytes(payload):
    engine_ready()
    with connect() as sock:
        sock.sendall(b'zINSTREAM\0')
        for offset in range(0, len(payload), 65536):
            chunk = payload[offset:offset + 65536]
            sock.sendall(struct.pack('!I', len(chunk)) + chunk)
        sock.sendall(struct.pack('!I', 0))
        verdict = reply(sock)
    if verdict == 'stream: OK':
        return True
    if verdict.startswith('stream: ') and verdict.endswith(' FOUND'):
        return False
    raise ValueError('No definitive engine verdict')


class Handler(BaseHTTPRequestHandler):
    server_version = 'PrivateScanner'
    sys_version = ''

    def log_message(self, *_args):
        pass

    def setup(self):
        super().setup()
        self.connection.settimeout(15)

    def send_json(self, status, value):
        data = json.dumps(value, separators=(',', ':')).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def authorized(self):
        token = os.environ.get('SCANNER_TOKEN', '')
        supplied = self.headers.get('Authorization', '')
        if len(token) < 32 or not hmac.compare_digest(supplied.encode(), ('Bearer ' + token).encode()):
            self.send_json(401, {'error': 'Unauthorized'})
            return False
        return True

    def do_GET(self):
        if not self.authorized():
            return
        if self.path != '/health':
            return self.send_json(404, {'error': 'Not found'})
        try:
            engine_ready()
            self.send_json(200, {'ready': True})
        except Exception:
            self.send_json(503, {'ready': False})

    def do_POST(self):
        if not self.authorized():
            return
        if self.path != '/scan':
            return self.send_json(404, {'error': 'Not found'})
        if self.headers.get('Content-Type') != 'application/octet-stream' or self.headers.get('Transfer-Encoding'):
            return self.send_json(415, {'error': 'Raw file bytes required'})
        lengths = self.headers.get_all('Content-Length') or []
        if len(lengths) != 1 or not lengths[0].isdigit():
            return self.send_json(400, {'error': 'File length required'})
        size = int(lengths[0])
        if not 0 < size <= MAX_FILE:
            return self.send_json(413, {'error': 'File must be at most 5 MB'})
        if not SLOTS.acquire(blocking=False):
            return self.send_json(503, {'error': 'Scanner busy; try again'})
        payload = bytearray()
        try:
            payload = bytearray(self.rfile.read(size))
            if len(payload) != size:
                raise ValueError('Incomplete upload')
            clean = scan_bytes(payload)
            self.send_json(200 if clean else 422, {'clean': clean, 'sha256': hashlib.sha256(payload).hexdigest()})
        except Exception:
            self.send_json(503, {'error': 'Scanner unavailable; file not retained'})
        finally:
            payload[:] = b'\0' * len(payload)
            SLOTS.release()


class PrivateHTTPServer(ThreadingHTTPServer):
    def server_bind(self):
        # Container host identifiers may exceed the DNS label limit. Binding does not require reverse DNS.
        TCPServer.server_bind(self)
        self.server_name = 'private-scanner'
        self.server_port = self.server_address[1]


if __name__ == '__main__':
    if len(os.environ.get('SCANNER_TOKEN', '')) < 32:
        raise SystemExit('Private scanner token must be configured')
    PrivateHTTPServer(('0.0.0.0', 8080), Handler).serve_forever()
