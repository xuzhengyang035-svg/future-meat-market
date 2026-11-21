# 本地预览服务器：和 python -m http.server 一样，但代码文件禁止缓存（改完刷新就能看到），
# assets/ph 里的大素材（贴图、模型、HDRI）允许浏览器缓存，第二次打开快很多。
# 用法：python serve.py [端口]
import functools
import http.server
import os
import sys


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        if '/assets/ph/' in self.path:
            self.send_header('Cache-Control', 'public, max-age=86400')
        else:
            self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def log_message(self, *a):
        pass


class Server(http.server.ThreadingHTTPServer):
    request_queue_size = 512          # 一次会并发请求几百个素材文件，默认的 5 会被拒绝连接
    daemon_threads = True


port = int(sys.argv[1]) if len(sys.argv) > 1 else 5181
root = os.path.dirname(os.path.abspath(__file__))
handler = functools.partial(Handler, directory=root)
print(f'Serving {root} at http://localhost:{port}')
Server(('', port), handler).serve_forever()
