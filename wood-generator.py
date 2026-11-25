import numpy as np, os, sys
from PIL import Image
from scipy.ndimage import gaussian_filter
W,H=1536,1024
fx=np.fft.fftfreq(W)[None,:]; fy=np.fft.fftfreq(H)[:,None]
def noise(sx,sy,seed):
    w=np.random.default_rng(seed).standard_normal((H,W))
    f=np.exp(-2*np.pi**2*((fx*sx)**2+(fy*sy)**2))
    n=np.real(np.fft.ifft2(np.fft.fft2(w)*f)); return ((n-n.mean())/n.std()).astype(np.float32)
def ss(a,b,x):
    t=np.clip((x-a)/(b-a),0,1); return t*t*(3-2*t)
def hrand(i,seed):
    return (np.sin(i*12.9898+seed*78.233)*43758.5453)%1.0
Y,X=np.mgrid[0:H,0:W].astype(np.float32)

def build(theme,seed):
    r=np.random.default_rng(seed)
    widths=[180,200,172,208,188,196,184,208]; assert sum(widths)==W
    edges=np.cumsum([0]+widths)
    wander=noise(220,320,seed+1); warp=noise(30,70,seed+2); low=noise(150,200,seed+3)
    fib=noise(.7,70,seed+4); fib2=noise(.5,16,seed+5); pore=noise(.6,5,seed+6)
    streak=noise(40,260,seed+7)
    tone=np.zeros((H,W),np.float32); hue=np.zeros((H,W),np.float32); gain=np.ones((H,W),np.float32)
    jointmask=np.zeros((H,W),np.float32)
    for p in range(8):
        x0,x1=edges[p],edges[p+1]; w=widths[p]; xm=(X>=x0)&(X<x1)
        ja=int(r.integers(60,H-400)); jb=ja+int(r.integers(300,520))
        segm=[(Y>=ja)&(Y<jb), ~((Y>=ja)&(Y<jb))]
        for si,sm in enumerate(segm):
            m=xm&sm
            cx=x0+w*r.uniform(-.2,1.2)
            flat=r.random()<.28
            if flat: Da=r.uniform(90,170); D0=r.uniform(-20,40)
            else:    Da=r.uniform(6,28);   D0=r.uniform(40,90)
            ph=r.uniform(0,6.28)
            D=D0+Da*np.sin(2*np.pi*Y/H+ph)+Da*.35*np.sin(4*np.pi*Y/H+r.uniform(0,6.28))
            q=r.uniform(.9,1.4); period=r.uniform(5.5,9)
            f=np.sqrt(D**2+(q*(X-cx+wander*14))**2)
            f=f+warp*period*.9+low*period*2.2
            # mata kayu (jarang)
            kd=np.zeros((H,W),np.float32)
            if r.random()<.35:
                ky=r.uniform(ja+60,jb-60) if si==0 else r.uniform(jb+20,jb+200)
                kx=x0+w*r.uniform(.3,.7); rx=r.uniform(5,8); ry=r.uniform(9,14)
                dx=X-kx; dy=((Y-ky+H/2)%H)-H/2
                rho=np.sqrt((dx/rx)**2+(dy/ry)**2)
                g=1-ss(1.0,4.5,rho)
                f=f*(1-g)+(rho*period*.5+6)*g + 9*g*np.sign(dx)*np.exp(-rho*.5)
                kd=np.maximum(kd,1-ss(.5,1.05,rho))
            ringf=f/period
            rid=np.floor(ringf); g=ringf-rid
            rr=hrand(rid,seed+si+p*3)
            late=.30+.40*rr                       # kontras tiap cincin acak
            prof=ss(.45+.15*rr,.97,g)*late + ss(0,.5,g)*.08
            fine=hrand(np.floor(ringf*5),seed+99)-.5
            t=.62-prof+fine*.07
            t+=fib*.045+fib2*.03+low*.03+streak*.04
            t-=np.clip(pore-1.0,0,3)*.10*(.5+prof*2)
            t=t*(1-kd*.7)-kd*.08
            # sinar membran antar papan (tint & kecerahan)
            bright=r.uniform(-.05,.05)
            shade=1+(r.uniform(.05,.11)*(1 if r.random()<.5 else -1))*(((X-x0)/w)-.5)
            tone[m]=(t+bright)[m]; gain[m]=shade[m]
            hue[m]=(r.uniform(-.4,.4)+streak*.35)[m]
        # sambungan ujung
        for yj in (ja,jb):
            d=((Y-yj+H/2)%H)-H/2
            jointmask+=(xm*np.exp(-(d/1.0)**2)).astype(np.float32)
            jointmask+=(xm*.35*np.exp(-np.clip(d,0,None)/7)*(d>0)).astype(np.float32)
    tone=np.clip(tone,0,1)
    # relief & pencahayaan dari kiri-atas (bump dari pola serat)
    hmap=gaussian_filter(tone,.9,mode='wrap')
    gx=np.roll(hmap,-1,1)-np.roll(hmap,1,1); gy=np.roll(hmap,-1,0)-np.roll(hmap,1,0)
    lit=1+(-gx*.8-gy*.5)*1.6
    # celah antar papan
    groove=np.zeros((H,W),np.float32); hl=np.zeros_like(groove); ao=np.zeros_like(groove)
    for xb in edges[:-1]:
        d=((X-xb+W/2)%W)-W/2
        groove+=np.exp(-(d/1.15)**2)
        hl+=np.exp(-((d+2.0)/1.0)**2)*.6
        ao+=np.exp(-np.clip(d,0,None)/10)*(d>0)
    T=tone*lit*gain
    T=T*(1-.78*np.clip(groove,0,1))*(1-.20*np.clip(ao,0,1))*(1-.55*np.clip(jointmask,0,1))+.06*np.clip(hl,0,1)
    T=np.clip(T,0,1)
    if theme=='dark':
        st=[(0,(11,6,4)),(.22,(34,19,10)),(.5,(72,42,22)),(.78,(110,69,37)),(1,(156,106,62))]
    else:
        st=[(0,(142,98,54)),(.3,(188,141,90)),(.6,(215,175,121)),(.85,(236,205,153)),(1,(250,228,190))]
    xs=[s[0] for s in st]
    rgb=np.stack([np.interp(T,xs,[s[1][c] for s in st]) for c in range(3)],-1)
    rgb[...,0]*=1+.035*hue; rgb[...,2]*=1-.05*hue
    rgb*= (1+low[...,None]*.025)
    rgb=np.stack([gaussian_filter(rgb[...,c],.62,mode='wrap') for c in range(3)],-1)
    return np.clip(rgb,0,255).astype(np.uint8)

if __name__=='__main__':
    q=int(sys.argv[1]) if len(sys.argv)>1 else 70
    for th in ('dark','light'):
        im=Image.fromarray(build(th,23)); im.save(f'/tmp/gen/{th}2.png')
        im.save(f'/tmp/gen/{th}2.webp',quality=q,method=6)
        print(th,os.path.getsize(f'/tmp/gen/{th}2.webp')//1024,'KB')
