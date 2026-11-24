import numpy as np, sys
from PIL import Image
N=1024
rng=np.random.default_rng(7)
fx=np.fft.fftfreq(N)[None,:]; fy=np.fft.fftfreq(N)[:,None]
def noise(sx,sy,seed):
    r=np.random.default_rng(seed); w=r.standard_normal((N,N))
    f=np.exp(-2*np.pi**2*((fx*sx)**2+(fy*sy)**2))
    n=np.real(np.fft.ifft2(np.fft.fft2(w)*f)); return (n-n.mean())/n.std()
ss=lambda a,b,x: np.clip((x-a)/(b-a),0,1)**2*(3-2*np.clip((x-a)/(b-a),0,1))
Y,X=np.mgrid[0:N,0:N].astype(np.float32)

def build(theme, seed):
    r=np.random.default_rng(seed)
    widths=[196,214,188,222,204]; assert sum(widths)==1024
    edges=np.cumsum([0]+widths)
    warp1=noise(40,90,seed+1); warp2=noise(14,30,seed+2)
    low=noise(120,160,seed+3)
    fib=noise(.9,34,seed+4); fib2=noise(.6,9,seed+5); pore=noise(.7,3.5,seed+6)
    tone=np.zeros((N,N),np.float32); tint=np.ones((N,N,3),np.float32)
    plank_id=np.zeros((N,N),np.int32)
    for p in range(5):
        x0,x1=edges[p],edges[p+1]; w=widths[p]
        j1=int(r.integers(80,500)); j2=(j1+int(r.integers(380,620)))%N
        segs=[(j1,j2)] if j1<j2 else [(j1,N),(0,j2)]
        # tiap papan: 2 segmen (dipisah sambungan ujung)
        ya,yb=sorted([j1,j2]); seg_masks=[(Y>=ya)&(Y<yb),~((Y>=ya)&(Y<yb))]
        xm=(X>=x0)&(X<x1)
        for si,sm in enumerate(seg_masks):
            m=xm&sm
            cx=x0+w*r.uniform(-.3,1.3)
            Da=r.uniform(40,130); ph=r.uniform(0,6.28); ph2=r.uniform(0,6.28); mm=int(r.integers(1,3))
            D=Da*(np.sin(2*np.pi*mm*Y/N+ph)+.45*np.sin(2*np.pi*(mm+1)*Y/N+ph2))
            q=r.uniform(.8,1.5); period=r.uniform(13,22)
            f=np.sqrt(D**2+(q*(X-cx))**2)
            f=f+warp1*period*.55+warp2*period*.18+low*period*.8
            # mata kayu
            nk=1 if r.random()<.45 else 0; kn=[]
            for _ in range(nk):
                ky=r.uniform(*((ya+30,yb-30) if si==0 else (0,N))) ; kx=x0+w*r.uniform(.25,.75)
                kn.append((kx,ky%N,r.uniform(6,9),r.uniform(11,17)))
            kd=np.zeros((N,N),np.float32); kc=np.zeros((N,N),np.float32)
            for kx,ky,rx,ry in kn:
                dx=X-kx; dy=((Y-ky+N/2)%N)-N/2
                rho=np.sqrt((dx/rx)**2+(dy/ry)**2)
                g=1-ss(1.0,3.6,rho)
                f=f*(1-g)+(rho*period*.38+5)*g
                kd=np.maximum(kd,1-ss(.55,1.0,rho)); kc=np.maximum(kc,g)
            g=(f/period)%1.0
            ring=1-ss(.38,.96,g)*.62-(1-ss(0,.12,g))*.10
            t=ring*.55+.45
            t+=fib*.05+fib2*.03+low*.05
            t-=np.clip(pore-1.2,0,2)*.08
            t=t*(1-kd*.75)+0.06*kd
            bright=r.uniform(-.04,.05)
            t+=bright
            tone[m]=t[m]
            b=r.uniform(.96,1.04); tn=np.array([b*r.uniform(1.0,1.03),b,b*r.uniform(.96,1.0)],np.float32)
            tint[m]=tn
        plank_id[xm]=p
    # sambungan papan & bevel
    seam=np.zeros((N,N),np.float32); hi=np.zeros((N,N),np.float32); ao=np.zeros((N,N),np.float32)
    for xb in edges[:-1]:
        d=(X-xb); d=(d+N/2)%N-N/2
        seam+=np.exp(-(d/1.1)**2)
        hi+=np.exp(-((d-2.4)/1.2)**2)
        ao+=np.exp(-np.abs(d)/9)
    tone=tone*(1-.7*np.clip(seam,0,1))+.1*np.clip(hi,0,1)
    tone*=1-.16*np.clip(ao,0,1)
    # sambungan ujung (butt joint) tiap papan
    # (pakai tepi segmen: cari perubahan topeng)
    tone=np.clip(tone,0,1)
    if theme=='dark':
        stops=[(0,(10,6,4)),(.3,(32,18,10)),(.62,(66,39,21)),(1,(122,80,46))]
    else:
        stops=[(0,(140,96,52)),(.35,(188,140,86)),(.7,(224,182,124)),(1,(244,214,166))]
    xs=[s[0] for s in stops]
    rgb=np.stack([np.interp(tone,xs,[s[1][c] for s in stops]) for c in range(3)],-1)
    rgb=rgb*tint
    from scipy.ndimage import gaussian_filter
    rgb=np.stack([gaussian_filter(rgb[...,c],.55,mode='wrap') for c in range(3)],-1)
    # kilap varnish halus
    rgb*= (1+low[...,None]*.03)
    return np.clip(rgb,0,255).astype(np.uint8)

if __name__=='__main__':
    for th in ('dark','light'):
        im=Image.fromarray(build(th,11)); im.save(f'/tmp/gen/{th}.png')
        im.save(f'/tmp/gen/{th}.webp',quality=74,method=6)
        import os; print(th,os.path.getsize(f'/tmp/gen/{th}.webp')//1024,'KB')
