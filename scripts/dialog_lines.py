"""替課本會話的每一句找出在錄音裡的起訖時間，寫進 src/data/steps.json 的 lines[].at（角色扮演用）。

做法：
1. 用音量找出說話的片段（門檻依每個檔案的背景噪音調整，聽力題的環境音也切得開）。
2. 用動態規劃把片段分成 N 句：每句長度要跟字數（大約幾拍）成比例，換句的地方要是比較長的停頓。
3. 每句的長度和預期差太多就不標，不用猜的；沒有 at 的會話，網站上就不會出現「角色扮演」。

用法（需要 ffmpeg、numpy）：
    python3 scripts/dialog_lines.py          # 只統計能切幾段
    python3 scripts/dialog_lines.py --save   # 寫回 steps.json
"""
import json, math, re, statistics, subprocess, sys, functools
from pathlib import Path
import numpy as np

ROOT = str(Path(__file__).resolve().parent.parent)
P = ROOT + '/src/data/steps.json'
steps = json.load(open(P, encoding='utf-8'))
SR=16000; HOP=0.01

@functools.lru_cache(None)
def energy(src):
    raw=subprocess.run(['ffmpeg','-nostdin','-v','error','-i',f'{ROOT}/public/{src}','-ac','1','-ar',str(SR),'-f','s16le','-'],capture_output=True).stdout
    x=np.frombuffer(raw,dtype=np.int16).astype(np.float32)/32768
    win=int(0.025*SR); hop=int(HOP*SR)
    n=max(0,(len(x)-win)//hop)
    idx=np.arange(win)[None,:]+hop*np.arange(n)[:,None]
    rms=np.sqrt((x[idx]**2).mean(axis=1)+1e-10)
    return 20*np.log10(rms)

def segments(db, st, k):
    i0=int(st/HOP); e=db[i0:]
    if len(e)<10: return []
    # 檔案前後的數位靜音（接近 -100 dB）不算背景噪音
    live=e[e>-70]
    if len(live)<10: return []
    floor=np.percentile(live,10); peak=np.percentile(live,97)
    th=floor+k*(peak-floor)
    m=e>th
    # 補起 0.12 秒以內的小縫、去掉 0.06 秒以下的雜訊
    segs=[];i=0;L=len(m)
    while i<L:
        if m[i]:
            j=i
            while j<L and m[j]: j+=1
            segs.append([i,j]); i=j
        else: i+=1
    merged=[]
    for a,b in segs:
        if merged and a-merged[-1][1] < 12: merged[-1][1]=b
        else: merged.append([a,b])
    merged=[s for s in merged if s[1]-s[0]>=6]
    return [[st+a*HOP, st+b*HOP] for a,b in merged]

def weight(t):
    """預期的長度（大約幾拍）"""
    extra = 3 * len(re.findall(r'…+', t))  # 「……」是故意停頓，大約算 3 拍
    t = re.sub(r'[\s、。，,.？?！!…・「」『』（）()～〜\-]', '', t)
    def w(c):
        if '\u4e00' <= c <= '\u9fff': return 1.8  # 漢字大約兩拍
        if c.isdigit(): return 1.4
        if c in 'ゃゅょャュョぁぃぅぇぉァィゥェォ': return 0.4  # 拗音的小字跟前一個字合成一拍
        return 1
    return (sum(w(c) for c in t) + extra) or 1


def best_split(segs, W):
    m, n = len(segs), len(W)
    if m < n: return None
    span = segs[-1][1] - segs[0][0]
    rate = span / sum(W)
    gaps = [segs[j][0] - segs[j-1][1] for j in range(1, m)]
    gmax = max(gaps) if gaps else 1
    INF = float('inf')
    dp = [[INF]*(m+1) for _ in range(n+1)]; bk = [[-1]*(m+1) for _ in range(n+1)]
    dp[0][0] = 0
    for i in range(n):
        for j in range(m):
            if dp[i][j] == INF: continue
            if i > 0:
                g = gaps[j-1]
                if g < 0.2: continue
                cut = 1.0 * math.log(gmax / g)
            else: cut = 0
            for j2 in range(j+1, m+1 - (n-1-i)):
                dur = segs[j2-1][1] - segs[j][0]
                c = math.log(dur / (rate * W[i])) ** 2
                v = dp[i][j] + c + cut
                if v < dp[i+1][j2]: dp[i+1][j2] = v; bk[i+1][j2] = j
    if dp[n][m] == INF: return None
    groups = []; j = m
    for i in range(n, 0, -1):
        a = bk[i][j]; groups.append([segs[a][0], segs[j-1][1]]); j = a
    groups.reverse()
    ratios = [(g[1]-g[0]) / (rate*w) for g, w in zip(groups, W)]
    return dp[n][m] / n, groups, ratios

def split(d):
    src = d['audio']['src']; st = d['audio'].get('start', 0)
    W = [weight(l['t']) for l in d['lines']]
    db = energy(src); best = None
    for k in [0.25, 0.3, 0.35, 0.4, 0.45, 0.5]:
        segs = segments(db, st, k)
        # 頭尾很短的聲音（收銀機的嗶聲、雜音）不算台詞
        while len(segs) > len(W) and segs[0][1] - segs[0][0] < 0.25: segs = segs[1:]
        while len(segs) > len(W) and segs[-1][1] - segs[-1][0] < 0.25: segs = segs[:-1]
        r = best_split(segs, W)
        if not r: continue
        cost, groups, ratios = r
        if not all(0.45 <= x <= 1.8 for x in ratios): continue
        if not best or cost < best[0]: best = (cost, groups)
    if not best: return None
    return [[round(max(st, g[0]-0.08), 2), round(g[1]+0.15, 2)] for g in best[1]]

if __name__ == '__main__':
    ok = fail = 0; failed = []
    for s in steps:
        for d in s.get('dialogs', []):
            whos = {l.get('who') for l in d['lines'] if l.get('who')}
            for l in d['lines']: l.pop('at', None)
            if not d.get('audio') or len(whos) < 2: continue
            g = split(d)
            if g:
                ok += 1
                for l, t in zip(d['lines'], g): l['at'] = t
            else:
                fail += 1; failed.append(f"{s['id']} {d['label']}")
    print('ok', ok, 'fail', fail); print(failed)
    if '--save' in sys.argv:
        json.dump(steps, open(P, 'w', encoding='utf-8'), ensure_ascii=False, indent=2); open(P, 'a').write('\n')
