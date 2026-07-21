import urllib.request
url = "https://raw.githubusercontent.com/firebase/firebase-tools/master/schema/apphosting.yaml"
try:
    print(urllib.request.urlopen(url).read().decode('utf-8'))
except Exception as e:
    print(e)
