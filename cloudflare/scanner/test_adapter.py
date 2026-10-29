"""Protocol regressions only; a mock socket is not real antivirus acceptance."""
import unittest
from unittest.mock import patch
import time
import scanner


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
