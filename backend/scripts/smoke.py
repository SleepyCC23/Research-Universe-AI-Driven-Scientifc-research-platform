# -*- coding: utf-8 -*-
"""研宇宙后端冒烟测试：登录 + 遍历关键接口，打印 http/code/摘要。"""
import json
import urllib.request

BASE = "http://localhost:8080/api/v1"


def call(method, path, token=None, body=None, headers=None, base=BASE):
    url = base + path
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", "Bearer " + token)
    if headers:
        for k, v in headers.items():
            req.add_header(k, v)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            raw = r.read().decode("utf-8")
            return r.status, json.loads(raw)
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8")
        try:
            return e.code, json.loads(raw)
        except Exception:
            return e.code, {"raw": raw[:200]}
    except Exception as e:
        return -1, {"error": str(e)}


def summarize(payload):
    d = payload.get("data")
    if isinstance(d, dict):
        keys = list(d.keys())[:6]
        return "keys=" + ",".join(keys)
    if isinstance(d, list):
        return f"list[{len(d)}]"
    return str(d)[:80]


def main():
    # 健康检查
    st, pl = call("GET", "/../health", base="http://localhost:8080")
    print(f"[health] http={st} body={pl}")

    # 登录
    st, pl = call("POST", "/auth/login", body={"account": "13800000000", "code": "123456"})
    token = (pl.get("data") or {}).get("auth", {}).get("token")
    print(f"[login] http={st} code={pl.get('code')} token={'OK' if token else 'MISSING'}")

    gets = [
        "/me", "/me/account", "/me/quota", "/me/notifications", "/me/student-verification",
        "/plans",
        "/projects", "/projects/ddl", "/projects/ddl-keywords",
        "/projects/p_2001", "/projects/p_2001/compliance", "/projects/p_2001/stage-artifacts",
        "/projects/p_2001/progress", "/projects/p_2001/settings",
        "/projects/p_2001/intro/hotspot", "/projects/p_2001/intro/topic/keywords", "/projects/p_2001/intro/topic/theory",
        "/projects/p_2001/data/upload", "/projects/p_2001/data/variables", "/projects/p_2001/data/hypotheses",
        "/projects/p_2001/literature", "/projects/p_2001/analysis", "/projects/p_2001/analysis/methods",
        "/projects/p_2001/analysis/health-report",
        "/projects/p_2001/writing", "/projects/p_2001/journals", "/projects/p_2001/review",
        "/projects/p_2001/export", "/integrations/zotero/status",
        "/journals/j_chb/profile",
        "/projects/p_2001/steps/hotspot/draft",
    ]
    print("\n--- 规范路径 GET ---")
    ok = 0
    for p in gets:
        st, pl = call("GET", p, token=token)
        code = pl.get("code")
        flag = "OK " if (st == 200 and code == 0) else "FAIL"
        if flag == "OK ":
            ok += 1
        print(f"{flag} {p:52s} http={st} code={code} {summarize(pl)}")
    print(f"GET 通过 {ok}/{len(gets)}")

    # 扁平别名（带 X-Project-Id 头）：模拟前端「拍平路径」调用
    print("\n--- 扁平别名 POST（带 X-Project-Id）---")
    hdr = {"X-Project-Id": "p_2001"}
    posts = [
        ("/projects/hotspot/analyze", {"researchDirection": "社交焦虑与手机依赖"}),
        ("/projects/data/hypotheses/generate", {}),
        ("/projects/kb/qa", {"question": "孤独感的中介作用有哪些证据？"}),
        ("/projects/analysis/run", {"methodId": "mediation", "seed": 42, "nBoot": 500}),
        ("/projects/export/disclosure", {}),
    ]
    for p, body in posts:
        st, pl = call("POST", p, token=token, body=body, headers=hdr)
        code = pl.get("code")
        flag = "OK " if (st == 200 and code == 0) else "FAIL"
        print(f"{flag} POST {p:44s} http={st} code={code} {summarize(pl)}")

    print("\n--- 任务轮询 ---")
    st, pl = call("POST", "/projects/analysis/run", token=token, body={"methodId": "hierarchical", "seed": 7}, headers=hdr)
    tid = (pl.get("data") or {}).get("taskId")
    print(f"[run] taskId={tid} code={pl.get('code')}")
    if tid:
        import time
        for _ in range(30):
            time.sleep(1)
            st, pl2 = call("GET", f"/tasks/{tid}", token=token)
            d = pl2.get("data") or {}
            print(f"  poll status={d.get('status')} progress={d.get('progress')} msg={d.get('message')}")
            if d.get("status") in ("succeeded", "failed"):
                break


if __name__ == "__main__":
    main()
