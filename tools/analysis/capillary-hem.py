# Homogeneous-equilibrium (HEM) adiabatic capillary model for R-410A (Stoecker & Jones method; Churchill friction,
# McAdams two-phase viscosity). Chokes where dL/dP -> 0. Used to derive the capillary flow vs condensing condition.
import CoolProp.CoolProp as CP, numpy as np, sys
F='R410A'
_PG=np.linspace(2.0e5,4.6e6,1300)
_T={k:np.array([CP.PropsSI(k[0],'P',p,'Q',k[1],F) for p in _PG]) for k in [('H',0),('H',1),('D',0),('D',1),('V',0),('V',1)]}
def sat(k,q,P): return np.interp(P,_PG,_T[(k,q)])
def churchill(Re,eD=0.0):
    A=(2.457*np.log(1/((7/Re)**0.9+0.27*eD)))**16; B=(37530/Re)**16
    return 8*((8/Re)**12+1/(A+B)**1.5)**(1/12)
def length_to_choke(G,Tc,SC,D,eD):
    Pin=CP.PropsSI('P','T',Tc+273.15,'Q',0,F); Tin=Tc+273.15-SC
    h0=CP.PropsSI('H','P',Pin,'T',Tin,F); rl=CP.PropsSI('D','P',Pin,'T',Tin,F); mul=CP.PropsSI('V','P',Pin,'T',Tin,F)
    Psat=CP.PropsSI('P','T',Tin,'Q',0,F)
    dPent=1.5*G*G/(2*rl)                                   # entrance (K=0.5) + acceleration to G
    if Pin-dPent<=Psat: L1=0.0; P=Pin-dPent
    else:
        f=churchill(G*D/mul,eD); L1=(Pin-dPent-Psat)/(f/D*G*G/(2*rl)); P=Psat
    h0t=h0                                                 # stagnation enthalpy (KE small at inlet)
    L=L1; v_prev=1/rl; dP=5000.0
    while P>2e5:
        P2=P-dP
        hf=sat('H',0,P2); hg=sat('H',1,P2); vf=1/sat('D',0,P2); vg=1/sat('D',1,P2)
        # solve h + (G v)^2/2 = h0 for x
        x=0.0
        for _ in range(6):
            v=vf+x*(vg-vf); g=hf+x*(hg-hf)+0.5*(G*v)**2-h0t; dg=(hg-hf)+G*G*v*(vg-vf); x-=g/dg
        x=max(0,min(1,x)); v=vf+x*(vg-vf)
        muf=sat('V',0,P2); mug=sat('V',1,P2); mu=1/(x/mug+(1-x)/muf)
        f=churchill(G*D/mu,eD); vm=(v+v_prev)/2
        dL=(dP-G*G*(v-v_prev))/(f/(2*D)*G*G*vm)
        if dL<=0: return L
        L+=dL; v_prev=v; P=P2
    return L
def flow(Tc,SC,D,L,eD):
    lo,hi=1000.,60000.
    for _ in range(28):
        G=(lo*hi)**.5
        if length_to_choke(G,Tc,SC,D,eD)>L: lo=G
        else: hi=G
    return (lo*hi)**.5*np.pi*D*D/4
if __name__=='__main__':
    mr_rated=float(sys.argv[1]) if len(sys.argv)>1 else 0.0275
    for ntubes,D in [(1,2.0e-3),(2,1.6e-3),(2,1.3e-3)]:
        eD=1.5e-6/D; Tr=(118-32)/1.8; SC=10/1.8
        # size L for the rated flow per tube
        lo,hi=0.2,8.0
        for _ in range(26):
            L=(lo*hi)**.5; m=flow(Tr,SC,D,L,eD)
            if m>mr_rated/ntubes: lo=L
            else: hi=L
        L=(lo*hi)**.5
        print(f'{ntubes} x D {D*1e3:.1f} mm: L {L:.2f} m')
        Tcs=[25,30,35,40,45,(118-32)/1.8,52,55]
        for SCF in [10,5,15]:
            ms=[ntubes*flow(t,SCF/1.8,D,L,eD) for t in Tcs]
            ps=[CP.PropsSI('P','T',t+273.15,'Q',0,F) for t in Tcs]
            n=np.polyfit(np.log(ps),np.log(ms),1)[0]
            print(f'  SC {SCF}F: ' + ' '.join(f'{t*1.8+32:.0f}F:{m/mr_rated:.3f}' for t,m in zip(Tcs,ms)) + f'  | fitted exponent on Psat(Tc) {n:.2f}')
