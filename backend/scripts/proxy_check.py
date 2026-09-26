# -*- coding: utf-8 -*-
"""验证「前端 Vite 代理 → 后端」链路是否连通。"""
import json
import time
import urllib.request

FRONT = "http://localhost:5173"


def get(url, token=None):
    req = urllib.request.Request(url)
    if token:
        req.add_header("Authorization", "Bearer " + token)
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            return r.status, r.read().decode("utf-8", "ignore")
    except Exception as e:
        return -1, str(e)


def wait_front(retries=20):
    for i in range(retries):
        st, _ = get(FRONT + "/")
        if st == 200:
            return i
        time.sleep(1)
    return -1


def main():
    n = wait_front()
    print(f"[front] http://localhost:5173/ 就绪等待={n}s")

    st, body = get(FRONT + "/")
    print(f"[front index] http={st} has_root_div={'<div id=\"root\">' in body or 'id=\"root\"' in body}")

    # 经代理访问后端公开接口
    st, body = get(FRONT + "/api/v1/plans")
    try:
        code = json.loads(body).get("code")
    except Exception:
        code = None
    print(f"[proxy GOT /api/v1/plans] http={st} code={code}")

    # 经代理登录
    req = urllib.request.Request(
        FRONT + "/api/v1/auth/login",
        data=json.dumps({"account": "13800000000", "code": "123456"}).encode(),
        method="POST",
    )
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            data = json.loads(r.read().decode())
        token = data["data"]["auth"]["token"]
        print(f"[proxy POST /api/v1/auth/login] code={data.get('code')} token={'OK' if token else 'NO'}")
    except Exception as e:
        token = None
        print(f"[proxy POST /api/v1/auth/login] FAIL {e}")

    if token:
        st, body = get(FRONT + "/api/v1/projects", token)
        try:
            j = json.loads(body)
            print(f"[proxy GET /api/v1/projects] code={j.get('code')} total={j.get('data',{}).get('total')} metaText={j.get('data',{}).get('metaText')}")
        except Exception:
            print(f"[proxy GET /api/v1/projects] http={st} raw={body[:150]}")


if __name__ == "__main__":
    main()
