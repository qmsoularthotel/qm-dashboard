import http.server
import os
os.chdir('/Users/pierpaolopresta/Desktop/qm-dashboard')
http.server.test(HandlerClass=http.server.SimpleHTTPRequestHandler, port=3000, bind='127.0.0.1')
