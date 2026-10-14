"""Archive source, evidence and the matching standalone lecture; exclude fonts/caches."""
from pathlib import Path
import zipfile,argparse
R=Path(__file__).resolve().parents[1];p=argparse.ArgumentParser();p.add_argument('--output',default='EDA_大字引导版_源码与测试.zip');args=p.parse_args();out=Path(args.output).resolve()
blocked={'.woff','.woff2','.ttf','.otf','.pyc','.zip'}
with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
 for f in sorted(R.rglob('*')):
  if not f.is_file() or f.resolve()==out or f.suffix.lower() in blocked or '__pycache__' in f.parts:continue
  z.write(f,Path('EDA_大字引导版')/f.relative_to(R))
print(out.name,out.stat().st_size)
