"""Serve this local lecture on loopback only. Run: python tools/serve.py [port]"""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from functools import partial
from pathlib import Path
import sys,webbrowser
root=Path(__file__).resolve().parents[1]
port=int(sys.argv[1]) if len(sys.argv)>1 else 8000
if not 1<=port<=65535:raise SystemExit('Port must be between 1 and 65535.')
try:server=ThreadingHTTPServer(('127.0.0.1',port),partial(SimpleHTTPRequestHandler,directory=str(root)))
except OSError as exc:raise SystemExit(f'Cannot bind port {port}: {exc}. Try another port.')
print(f'Open http://127.0.0.1:{port}/ — Ctrl+C to stop. Only this computer can connect.',flush=True)
try:server.serve_forever()
except KeyboardInterrupt:pass
finally:server.server_close()
