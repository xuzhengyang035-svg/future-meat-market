"""运行时用的轻量贴图：assets/ph 里的原图一张不动，缩好的放进 assets/lite（同样的目录结构），再写一张清单 assets/lite/index.json。

    python -I tools/build_lite.py

规则（按看不看得出来）：
  tex    墙 / 地 / 材质：颜色和透明度用原图（1K），法线 512，其余 384
  decal  贴花：颜色和透明度 512（轮廓靠它），其余 384
  models 小道具：颜色 768，法线 384，其余 256
网页里加 ?hq=1 用原图。
"""
import json
import pathlib
import shutil

from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / 'assets' / 'ph'
OUT = ROOT / 'assets' / 'lite'


def limit(rel):
    kind, name = rel.parts[0], rel.stem.lower()
    colour = any(k in name for k in ('diff', 'col', 'albedo'))
    normal = 'nor' in name
    if kind == 'tex':
        if colour or 'opacity' in name:
            return None
        return 512 if normal else 384
    if kind == 'decal':
        return 512 if colour or 'opacity' in name else 384
    if kind == 'models':
        if colour:
            return 768
        return 384 if normal else 256
    return None


def main():
    if OUT.exists() and not (OUT / 'index.json').exists():
        raise SystemExit(f'{OUT} exists and was not made by this tool')
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir()
    done, before, after = [], 0, 0
    for p in sorted(SRC.rglob('*')):
        if p.suffix.lower() not in ('.jpg', '.png'):
            continue
        rel = p.relative_to(SRC)
        size = limit(rel)
        if not size:
            continue
        with Image.open(p) as im:
            if max(im.size) <= size:
                continue
            im.load()
            if im.mode.startswith('I'):                                   # 16 位灰度（透明度 / 粗糙度）转 8 位
                im = im.point(lambda v: v * (1 / 256)).convert('L')
            elif im.mode == 'P':
                im = im.convert('RGBA')
            k = size / max(im.size)
            small = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.Resampling.LANCZOS)
            q = OUT / rel
            q.parent.mkdir(parents=True, exist_ok=True)
            if p.suffix.lower() == '.png':
                small.save(q, optimize=True)
            else:
                if small.mode not in ('L', 'RGB'):
                    small = small.convert('RGB')
                small.save(q, quality=90, optimize=True, subsampling=0 if 'nor' in p.stem.lower() else 2)
        done.append(rel.as_posix())
        before += p.stat().st_size
        after += q.stat().st_size
    (OUT / 'index.json').write_text(json.dumps(done, separators=(',', ':')), encoding='utf-8')
    print(f'{len(done)} images: {before / 1048576:.0f} MB -> {after / 1048576:.0f} MB')


if __name__ == '__main__':
    main()
