"""Independent checks with NumPy/SciPy; writes raw fixtures and test report.
Run: python tests/independent.py (requires numpy scipy pymupdf).
The independent solver does NOT reuse JavaScript active-set or eigen routines.
"""
from pathlib import Path
import json,subprocess,time,datetime,sys,hashlib
import numpy as np
import scipy,scipy.optimize as opt
import fitz
R=Path(__file__).resolve().parents[1]
script=r'''
const M=require('./assets/math.js'), E=require('./assets/experiments.js');let out={lasso:[],nuclear:[],trust:[],eigen:[]};
let seed=39;function rand(){const r=M.rng(seed);seed=r.state;return r.value;}
for(const c of ['correlated','isotropic','ill'])for(const lambda of [0,.05,.45,1,2.5]){const p=M.problem(c,80);out.lasso.push({p,lambda,result:M.lassoOracle2(p,lambda)});}
for(let k=0;k<30;k++){const A=[[rand()*6-3,rand()*4-2],[rand()*4-2,rand()*4-2]],t=rand()*2;out.nuclear.push({A,t,result:M.nuclearProx2(A,t)});}
for(const c of ['spd','indef','hard','zero'])for(const delta of [.1,.5,1,3]){const z=E.registry.trustsub.data({case:c});out.trust.push({...z,delta,result:M.trustRegion(z.Q,z.g,delta)});}
for(let k=0;k<30;k++){const b=rand()*3-1.5,A=[[rand()*6-3,b],[b,rand()*6-3]];out.eigen.push({A,result:M.eigen2(A)});}
console.log(JSON.stringify(out));
'''
fixture=json.loads(subprocess.check_output(['node','-e',script],cwd=R,text=True));(R/'reports/independent-fixtures.json').write_text(json.dumps(fixture,indent=2))
results=[]
def test(name,fn):
 t=time.perf_counter()
 try:
  detail=fn();results.append(dict(name=name,status='pass',seconds=time.perf_counter()-t,details=detail))
 except Exception as e:results.append(dict(name=name,status='fail',seconds=time.perf_counter()-t,error=str(e)));print('FAIL',name,str(e))
def nuclear():
 worst=0
 for z in fixture['nuclear']:
  A=np.array(z['A']);u,s,vt=np.linalg.svd(A);X=(u*np.maximum(s-z['t'],0))@vt;err=np.linalg.norm(X-np.array(z['result']['matrix']));worst=max(err,worst);assert err<1e-9
 return {'cases':len(fixture['nuclear']),'max_frobenius_error':worst,'oracle':'numpy.linalg.svd'}
def eigen():
 worst=0
 for z in fixture['eigen']:
  vals=np.linalg.eigvalsh(z['A']);err=np.max(np.abs(vals-z['result']['values']));worst=max(worst,err);assert err<1e-11
 return {'cases':len(fixture['eigen']),'max_eigenvalue_error':worst,'oracle':'numpy.linalg.eigvalsh'}
def lasso():
 worst=0;data=[]
 for z in fixture['lasso']:
  Q=np.array(z['p']['Q']);b=np.array(z['p']['b']);lam=z['lambda'];target=np.array(z['result']['x'])
  # Independent epigraph QP: variables x1,x2,t1,t2; -t <= x <= t.
  def f(v):return .5*v[:2]@Q@v[:2]-b@v[:2]+lam*np.sum(v[2:])
  def jac(v):return np.r_[Q@v[:2]-b,[lam,lam]]
  A=np.block([[np.eye(2),np.eye(2)],[-np.eye(2),np.eye(2)]])
  res=opt.minimize(f,np.array([0.,0.,1.,1.]),jac=jac,constraints=[opt.LinearConstraint(A,0,np.inf)],method='SLSQP',options={'ftol':1e-12,'maxiter':2000})
  assert res.success,res.message
  err=np.linalg.norm(res.x[:2]-target);worst=max(worst,err);assert err<2e-5,(err,res.message)
  assert abs(f(res.x)-(.5*target@Q@target-b@target+lam*np.abs(target).sum()))<1e-8
  data.append({'lambda':lam,'error':err,'iterations':res.nit})
 return {'cases':len(fixture['lasso']),'max_solution_distance':worst,'oracle':'SciPy SLSQP epigraph QP','records':data}
def trust():
 worst=0
 for z in fixture['trust']:
  Q=np.array(z['Q']);g=np.array(z['g']);delta=z['delta'];x=np.array(z['result']['d']);f=lambda x:g@x+.5*x@Q@x
  # Independent scalar boundary optimization on a dense interval partition.
  # The global minimum can additionally be an SPD unconstrained interior point.
  theta=np.linspace(0,2*np.pi,73);vals=[]
  for a,b in zip(theta[:-1],theta[1:]):
   sol=opt.minimize_scalar(lambda t:f(delta*np.array([np.cos(t),np.sin(t)])),bounds=(a,b),method='bounded',options={'xatol':1e-13});vals.append(sol.fun)
  if np.linalg.eigvalsh(Q).min()>0:
   v=np.linalg.solve(Q,-g)
   if np.linalg.norm(v)<=delta:vals.append(f(v))
  target=min(vals);err=abs(f(x)-target);worst=max(worst,err);assert err<1e-8,(f(x),target)
 return {'cases':len(fixture['trust']),'max_objective_difference':worst,'oracle':'SciPy scalar boundary minimization on 72 intervals + independent interior solve'}
def sources():
 ds=json.loads((R/'data/sources.json').read_text());counts=[]
 for d in ds:
  p=R/d['path'];assert p.is_file(),str(p);assert hashlib.sha256(p.read_bytes()).hexdigest()==d['sha256']
  if d['type']=='.pdf':
   doc=fitz.open(p);assert len(doc)==d['pages'];counts.append(len(doc))
 assert sum(counts)==1990 and len(counts)==41 and len(ds)==65
 pages=json.loads((R/'data/pages.json').read_text());pk={(p['doc'],p['page']) for p in pages}
 for d in ds:
  if d['type']=='.pdf':assert all((d['id'],i)in pk for i in range(1,d['pages']+1))
 return {'sha256_verified_files':len(ds),'verified_pdf_pages':sum(counts),'all_pdf_pages_indexed':True}
test('Independent nuclear norm prox via NumPy SVD',nuclear);test('Independent symmetric spectrum via LAPACK',eigen);test('Independent LASSO via epigraph constrained optimization',lasso);test('Independent global trust-region objective via angular minimization',trust);test('Source bytes, physical PDF page counts and complete page index',sources)
report=dict(suite='independent external-library cross-check',timestamp=datetime.datetime.now(datetime.timezone.utc).isoformat(),python=sys.version.split()[0],numpy=np.__version__,scipy=scipy.__version__,tests=len(results),passed=sum(r['status']=='pass' for r in results),failed=sum(r['status']=='fail' for r in results),results=results)
(R/'reports/independent-results.json').write_text(json.dumps(report,indent=2));print(json.dumps({k:report[k] for k in ['tests','passed','failed']}));sys.exit(bool(report['failed']))
