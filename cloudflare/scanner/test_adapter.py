"""Protocol regressions only; a mock socket is not real antivirus acceptance."""
import unittest
from unittest.mock import patch
import time
import scanner
import hashlib
import http.client
import threading


class Socket:
    def __init__(self, result):
        self.result = result
        self.sent = []

    def __enter__(self):
        return self

    def __exit__(self, *_):
        pass

    def sendall(self, value):
        self.sent.append(value)

    def recv(self, _size):
        result, self.result = self.result, b''
        return result


class AdapterTests(unittest.TestCase):
    def test_http_adapter_accepts_ten_mb_and_rejects_one_extra_byte(self):
        payload = b'x' * (10 * 1024 * 1024)
        with patch.dict('os.environ', {'SCANNER_TOKEN': 'synthetic-test-token-' * 3}), patch('scanner.scan_bytes', return_value=True) as scan:
            server = scanner.PrivateHTTPServer(('127.0.0.1', 0), scanner.Handler)
            thread = threading.Thread(target=server.serve_forever, daemon=True)
            thread.start()
            try:
                for size, status in [(len(payload), 200), (len(payload) + 1, 413)]:
                    connection = http.client.HTTPConnection('127.0.0.1', server.server_port, timeout=15)
                    connection.request('POST', '/scan', body=payload if status == 200 else None, headers={'Authorization': 'Bearer ' + 'synthetic-test-token-' * 3, 'Content-Type': 'application/octet-stream', 'Content-Length': str(size)})
                    response = connection.getresponse()
                    self.assertEqual(response.status, status)
                    body = response.read()
                    if status == 200:
                        self.assertIn(hashlib.sha256(payload).hexdigest().encode(), body)
                    connection.close()
                self.assertEqual(scan.call_count, 1)
            finally:
                server.shutdown()
                server.server_close()
                thread.join()

    def test_binding_does_not_resolve_a_container_hostname(self):
        with patch('socket.getfqdn', side_effect=UnicodeError('synthetic long container hostname')):
            server = scanner.PrivateHTTPServer(('127.0.0.1', 0), scanner.Handler)
            try:
                self.assertEqual(server.server_name, 'private-scanner')
                self.assertGreater(server.server_port, 0)
            finally:
                server.server_close()

    def test_version_must_have_recent_signatures(self):
        for age, accepted in [(60, True), (49 * 3600, False)]:
            version = ('ClamAV 1.4.3/12345/' + time.strftime('%a %b %d %H:%M:%S %Y', time.gmtime(time.time() - age)) + '\0').encode()
            with patch('scanner.connect', return_value=Socket(version)):
                if accepted:
                    scanner.engine_ready()
                else:
                    with self.assertRaises(ValueError):
                        scanner.engine_ready()

    def test_only_definitive_stream_verdicts_are_accepted(self):
        for verdict, result in [(b'stream: OK\0', True), (b'stream: Synthetic-Test FOUND\0', False), (b'stream: timeout ERROR\0', None), (b'OK\0', None)]:
            sock = Socket(verdict)
            with patch('scanner.engine_ready'), patch('scanner.connect', return_value=sock):
                if result is None:
                    with self.assertRaises(ValueError):
                        scanner.scan_bytes(bytearray(b'synthetic'))
                else:
                    self.assertIs(scanner.scan_bytes(bytearray(b'synthetic')), result)
            self.assertEqual(sock.sent[0], b'zINSTREAM\0')
            self.assertEqual(sock.sent[-1], b'\0\0\0\0')


if __name__ == '__main__':
    unittest.main()
