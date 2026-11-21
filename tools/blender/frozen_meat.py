"""冻肉真空包装（自己建模）：四种常见的冷冻真空肉包，导出给仓库冷冻柜用。

blender --background --factory-startup --python frozen_meat.py -- <out.glb> [<preview.png>]

  steak2     两块西冷牛排装一袋（每块约 200 x 120 x 26 mm，一边带一条白色脂肪）
  striploin  整条西冷（约 340 x 160 x 80 mm，上面一层脂肪盖）
  mince      牛肉馅压成的扁砖（约 200 x 140 x 40 mm）
  belly      五花肉一块（约 300 x 180 x 45 mm，皮朝上）

做法：肉是超椭球（上下平、边缘圆）+ 不规则外轮廓 + 轻微起伏；真空袋是上下两张网格，用 Shrinkwrap 沿 Z 投影贴到肉上，
投不到肉的地方留在中间高度，成了袋子四周压扁的封边；袋子上再贴一张标签。原点在包的底部中心，单位米，Z 朝上（导出成 Y 朝上）。
材质名就是和网页的约定：meat_beef / meat_pork / fat / film / label（网页里换成真实贴图）。
"""
import bpy, bmesh, math, sys, json
from mathutils import Vector, noise

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = argv[0] if argv else 'frozen_meat.glb'
PREVIEW = argv[1] if len(argv) > 1 else None

for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
col = bpy.context.scene.collection


def mat(name, rgba, rough=0.6, alpha=1.0):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    bsdf = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    bsdf.inputs['Base Color'].default_value = rgba
    bsdf.inputs['Roughness'].default_value = rough
    if alpha < 1:
        bsdf.inputs['Alpha'].default_value = alpha
        m.surface_render_method = 'BLENDED'
    return m


M = {'meat_beef': mat('meat_beef', (0.22, 0.04, 0.07, 1)), 'meat_pork': mat('meat_pork', (0.55, 0.25, 0.25, 1)),
     'fat': mat('fat', (0.85, 0.8, 0.7, 1)), 'film': mat('film', (0.9, 0.93, 0.95, 1), 0.1, 0.35), 'label': mat('label', (0.95, 0.94, 0.9, 1))}
for k in ('meat_beef', 'meat_pork'):                                                  # 预览用：按顶点色把肉色和脂肪色混起来（网页里用真实贴图做同样的事）
    nt = M[k].node_tree; bsdf = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
    at = nt.nodes.new('ShaderNodeVertexColor'); at.layer_name = 'Col'
    mx = nt.nodes.new('ShaderNodeMix'); mx.data_type = 'RGBA'
    mx.inputs[6].default_value = bsdf.inputs['Base Color'].default_value[:]; mx.inputs[7].default_value = (0.86, 0.8, 0.7, 1)
    sep = nt.nodes.new('ShaderNodeSeparateColor'); nt.links.new(at.outputs['Color'], sep.inputs['Color']); nt.links.new(sep.outputs[0], mx.inputs[0])
    nt.links.new(mx.outputs[2], bsdf.inputs['Base Color'])


def sst(a, b, x):
    t = max(0.0, min(1.0, (x - a) / (b - a))); return t * t * (3 - 2 * t)


def slab(name, a, b, h, *, p=2.4, e=0.35, amp=0.06, seed=0.0, taper=0.0, thick_var=0.15, fat=None, meat='meat_beef', res=10, dent=0.002):
    """超椭球肉块（四边形球，没有极点的褶子）。a,b 半长半宽，h 半厚。
    fat(x, y, z, rel, h, nz) -> 0..1：这个点有多少是脂肪，写进顶点色 R 通道（网页里按它把肉和脂肪平滑地混在一起，边界不会一格一格）。"""
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=2.0)
    bmesh.ops.subdivide_edges(bm, edges=list(bm.edges), cuts=res, use_grid_fill=True)
    def R(th):
        c, s = math.cos(th), math.sin(th)
        x = math.copysign(abs(c) ** (2 / p), c); y = math.copysign(abs(s) ** (2 / p), s)
        r = 1 + amp * noise.noise(Vector((c * 1.6 + seed, s * 1.6, seed * 0.37)))
        return x * a * r, y * b * r * (1 - taper * x)
    for v in bm.verts:
        d = v.co.normalized(); th = math.atan2(d.y, d.x); ph = math.asin(max(-1, min(1, d.z)))
        cx, cy = R(th); k = abs(math.cos(ph)) ** e
        zz = math.copysign(abs(math.sin(ph)) ** e, ph)
        tv = 1 + thick_var * noise.noise(Vector((cx * 9 + seed, cy * 9, 0.5)))
        v.co = Vector((cx * k, cy * k, h * zz * tv + h))                              # 底面在 z = 0
    bm.normal_update()
    for v in bm.verts:                                                                # 抽真空压出来的坑和鼓包 + 细的肌肉纹理
        n1 = noise.noise(Vector((v.co.x * 11 + seed, v.co.y * 11, v.co.z * 11 + 3.1)))
        n2 = noise.noise(Vector((v.co.x * 40 + seed, v.co.y * 40, v.co.z * 40)))
        v.co += v.normal * (n1 * dent + n2 * 0.0015)
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces)); bm.normal_update()
    for f in bm.faces: f.smooth = True
    uv = bm.loops.layers.uv.new('UVMap')
    for f in bm.faces:
        for l in f.loops: l[uv].uv = (l.vert.co.x / 0.25 + 0.5, l.vert.co.y / 0.25 + 0.5)   # 俯视投影，按米
    me = bpy.data.meshes.new(name); me.materials.append(M[meat])
    bm.to_mesh(me)
    ca = me.color_attributes.new('Col', 'FLOAT_COLOR', 'POINT')
    for v in bm.verts:
        th = math.atan2(v.co.y, v.co.x); rx, ry = R(th); rel = math.hypot(v.co.x, v.co.y) / max(1e-6, math.hypot(rx, ry))
        w = max(0.0, min(1.0, fat(v.co.x, v.co.y, v.co.z, rel, h, v.normal.z))) if fat else 0.0
        ca.data[v.index].color = (w, 0, 0, 1)
    me.color_attributes.active_color = ca
    bm.free()
    ob = bpy.data.objects.new(name, me); col.objects.link(ob)
    return ob


def bake(ob, name):
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(ob.evaluated_get(dg), preserve_all_data_layers=True, depsgraph=dg)
    nb = bpy.data.objects.new(name, me); col.objects.link(nb); nb.matrix_world = ob.matrix_world.copy()
    return nb


def film_for(target, sx, sy, zmid, margin=(0.05, 0.03), step=0.012, seed=0.0):
    """真空袋：上下两张网格投影到肉上；投不到的地方 = 四周的封边。"""
    parts = []
    for sgn in (1, -1):
        W, H = sx + 2 * margin[0], sy + 2 * margin[1]
        nx, ny = max(4, int(W / step)), max(4, int(H / step))
        bm = bmesh.new()
        for j in range(ny + 1):
            for i in range(nx + 1):
                x = -W / 2 + W * i / nx; y = -H / 2 + H * j / ny
                jag = 0.002 * noise.noise(Vector((x * 30 + seed, y * 30, 2.0)))       # 封边被剪得不太齐
                bm.verts.new((x, y + (jag if abs(y) > H / 2 - 1e-4 else 0), zmid + sgn * 0.0006))
        bm.verts.ensure_lookup_table()
        for j in range(ny):
            for i in range(nx):
                a = j * (nx + 1) + i; vs = [bm.verts[a], bm.verts[a + 1], bm.verts[a + nx + 2], bm.verts[a + nx + 1]]
                f = bm.faces.new(vs if sgn > 0 else vs[::-1]); f.smooth = True
        uv = bm.loops.layers.uv.new('UVMap')
        for f in bm.faces:
            for l in f.loops: l[uv].uv = (l.vert.co.x / 0.3 + 0.5, l.vert.co.y / 0.3 + 0.5)
        me = bpy.data.meshes.new('film_tmp'); me.materials.append(M['film']); bm.to_mesh(me); bm.free()
        ob = bpy.data.objects.new('film_tmp', me); col.objects.link(ob)
        sw = ob.modifiers.new('sw', 'SHRINKWRAP'); sw.target = target; sw.wrap_method = 'PROJECT'
        sw.use_project_z = True; sw.use_negative_direction = sgn < 0; sw.use_positive_direction = sgn > 0
        sw.cull_face = 'OFF'; sw.offset = 0.0012
        sm = ob.modifiers.new('sm', 'SMOOTH'); sm.factor = 0.6; sm.iterations = 4                # 封边到肉之间是斜着绷过去的，不是一道直角
        tx = bpy.data.textures.new('wr', 'CLOUDS'); tx.noise_scale = 0.012
        dp = ob.modifiers.new('dp', 'DISPLACE'); dp.texture = tx; dp.strength = 0.0012; dp.mid_level = 0.5   # 膜上的细皱
        parts.append(ob)
    out = [bake(p, 'film_part') for p in parts]
    for p in parts: bpy.data.objects.remove(p, do_unlink=True)
    return out


def label_for(target, w, h, x0=0.0, y0=0.0, rot=0.0):
    bm = bmesh.new(); n = 8
    for j in range(n + 1):
        for i in range(n + 1):
            x = -w / 2 + w * i / n; y = -h / 2 + h * j / n
            c, s = math.cos(rot), math.sin(rot)
            bm.verts.new((x0 + x * c - y * s, y0 + x * s + y * c, 0.3))
    bm.verts.ensure_lookup_table()
    uv = bm.loops.layers.uv.new('UVMap')
    for j in range(n):
        for i in range(n):
            a = j * (n + 1) + i; f = bm.faces.new([bm.verts[a], bm.verts[a + 1], bm.verts[a + n + 2], bm.verts[a + n + 1]]); f.smooth = True
            for l, (u, v) in zip(f.loops, [(i / n, j / n), ((i + 1) / n, j / n), ((i + 1) / n, (j + 1) / n), (i / n, (j + 1) / n)]): l[uv].uv = (u, v)
    me = bpy.data.meshes.new('label'); me.materials.append(M['label']); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new('label_tmp', me); col.objects.link(ob)
    sw = ob.modifiers.new('sw', 'SHRINKWRAP'); sw.target = target; sw.wrap_method = 'PROJECT'; sw.use_project_z = True
    sw.use_negative_direction = True; sw.use_positive_direction = False; sw.cull_face = 'OFF'; sw.offset = 0.0008
    nb = bake(ob, 'label'); bpy.data.objects.remove(ob, do_unlink=True); return nb


def join(objs, name):
    """把几块网格合成一个对象（保留各自材质）。"""
    bm = bmesh.new(); mats = []
    for o in objs:
        me = o.data; offset = len(mats)
        for m in me.materials:
            if m not in mats: mats.append(m)
        tmp = bmesh.new(); tmp.from_mesh(me); tmp.transform(o.matrix_world)
        remap = [mats.index(m) for m in me.materials]
        for f in tmp.faces: f.material_index = remap[f.material_index] if remap else 0
        me2 = bpy.data.meshes.new('t'); tmp.to_mesh(me2); tmp.free(); bm.from_mesh(me2); bpy.data.meshes.remove(me2)
    me = bpy.data.meshes.new(name)
    for m in mats: me.materials.append(m)
    bm.to_mesh(me); bm.free()
    if me.color_attributes: me.color_attributes.active_color = me.color_attributes[0]
    ob = bpy.data.objects.new(name, me); col.objects.link(ob)
    for o in objs: bpy.data.objects.remove(o, do_unlink=True)
    return ob


def pack(name, meats, sx, sy, zmid, label=None, margin=(0.05, 0.03), seed=0.0, x_off=0.0):
    body = join(meats, 'meat_' + name)
    films = film_for(body, sx, sy, zmid, margin, seed=seed)
    film = join(films, 'film_' + name)
    lab = label_for(film, *label) if label else None                      # 标签贴在袋子上（投影到膜上，四角一定落得到）
    root = bpy.data.objects.new('pack_' + name, None); col.objects.link(root)
    for o in [body, film] + ([lab] if lab else []): o.parent = root
    body.name, film.name = name + '_meat', name + '_film'
    if lab: lab.name = name + '_label'
    root.location.x = x_off
    return root


packs = []
# 1) 两块西冷一袋：脂肪边在外侧长边上
st = []
for k, (dy, sd) in enumerate([(-0.064, 1.3), (0.066, 4.1)]):
    o = slab(f'steak{k}', 0.098, 0.058, 0.013, p=2.2, e=0.32, amp=0.08, seed=sd, taper=0.12, thick_var=0.12,
             fat=(lambda s: (lambda x, y, z, rel, h, nz: sst(0.78, 0.9, rel + 0.03 * noise.noise(Vector((x * 60, y * 60, 1.0)))) * sst(0.0, 0.03, y * s - 0.01)))(1 if dy > 0 else -1), dent=0.0015)
    o.location.y = dy; o.rotation_euler.z = 0.05 * (1 if k else -1); st.append(o)
bpy.context.view_layer.update()
packs.append(pack('steak2', st, 0.21, 0.25, 0.013, label=(0.085, 0.055, 0.03, 0.06, 0.04), margin=(0.04, 0.028), seed=1.0, x_off=0.0))
# 2) 整条西冷：上面一层脂肪盖，一头粗一头细
o = slab('loin', 0.17, 0.076, 0.036, p=3.2, e=0.42, amp=0.09, seed=7.2, taper=0.26, thick_var=0.28, res=12, dent=0.0045,
         fat=lambda x, y, z, rel, h, nz: max(sst(h * 1.2, h * 1.6, z + 0.006 * noise.noise(Vector((x * 30, y * 30, 2.0)))) * sst(0.0, 0.035, y + 0.018 * math.sin(x * 40)), sst(0.9, 0.97, rel) * sst(0.03, 0.06, y)))   # 脂肪盖：顶上偏后一大片，边缘自然过渡
packs.append(pack('striploin', [o], 0.36, 0.17, 0.035, label=(0.1, 0.065, -0.06, -0.01, 0.0), margin=(0.06, 0.02), seed=2.0, x_off=0.42))
# 3) 牛肉馅砖：方方正正，表面一粒粒的
o = slab('mince', 0.1, 0.068, 0.02, p=6.0, e=0.22, amp=0.02, seed=3.3, thick_var=0.06, res=11, dent=0.0012)
bm = bmesh.new(); bm.from_mesh(o.data)
for v in bm.verts: v.co += v.normal * 0.0016 * noise.noise(Vector((v.co.x * 160, v.co.y * 160, v.co.z * 160)))   # 绞肉颗粒
bm.to_mesh(o.data); bm.free()
packs.append(pack('mince', [o], 0.2, 0.14, 0.02, label=(0.09, 0.06, 0.0, 0.0, 0.0), margin=(0.035, 0.022), seed=3.0, x_off=0.86))
# 4) 五花肉：皮朝上（脂肪），四边看得见一层层肥瘦
o = slab('belly', 0.15, 0.088, 0.022, p=4.5, e=0.26, amp=0.05, seed=5.5, thick_var=0.12, meat='meat_pork', dent=0.002,
         fat=lambda x, y, z, rel, h, nz: max(sst(h * 0.45, h * 0.2, z), (1 - sst(0.45, 0.7, abs(nz))) * max(sst(0.06, 0.0, abs(z / h - 0.75 - 0.06 * math.sin(x * 30))), sst(0.05, 0.0, abs(z / h - 1.3 - 0.05 * math.sin(y * 35))))))   # 瘦肉面朝上；皮在底下，侧面一层肥一层瘦
packs.append(pack('belly', [o], 0.3, 0.18, 0.022, label=(0.09, 0.06, 0.07, -0.03, 0.08), margin=(0.04, 0.025), seed=4.0, x_off=1.28))

report = {}
for r in packs:
    for c in r.children:
        me = c.data; report[c.name] = {'tris': sum(len(p.vertices) - 2 for p in me.polygons), 'dims': [round(v, 3) for v in c.dimensions], 'mats': [m.name for m in me.materials]}

# 导出（只导出肉包）
for o in bpy.data.objects: o.select_set(False)
for r in packs:
    r.select_set(True)
    for c in r.children: c.select_set(True)
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', use_selection=True, export_apply=True, export_yup=True, export_materials='EXPORT', export_normals=True, export_texcoords=True, export_vertex_color='ACTIVE')
report['out'] = OUT

if PREVIEW:   # 预览图：一排肉包，俯视斜 45°
    sc = bpy.context.scene; sc.render.engine = 'BLENDER_EEVEE'; sc.render.resolution_x, sc.render.resolution_y = 1600, 700
    sc.view_settings.view_transform = 'AgX'
    w = bpy.data.worlds.new('w'); sc.world = w; w.color = (0.5, 0.5, 0.52)
    ld = bpy.data.lights.new('sun', 'SUN'); ld.energy = 3.5; lo = bpy.data.objects.new('sun', ld); col.objects.link(lo); lo.rotation_euler = (0.7, 0.2, 0.6)
    fl = bpy.data.meshes.new('floor'); bmf = bmesh.new(); bmesh.ops.create_grid(bmf, x_segments=1, y_segments=1, size=3); bmf.to_mesh(fl); bmf.free()
    fo = bpy.data.objects.new('floor', fl); col.objects.link(fo); fl.materials.append(mat('floorm', (0.75, 0.76, 0.78, 1), 0.8))
    cd = bpy.data.cameras.new('cam'); cd.lens = 40; co = bpy.data.objects.new('cam', cd); col.objects.link(co); sc.camera = co
    cd.lens = 32; co.location = (0.66, -0.9, 0.95); co.rotation_euler = (Vector((0.66, 0.02, 0.0)) - co.location).to_track_quat('-Z', 'Y').to_euler()
    sc.render.filepath = PREVIEW; bpy.ops.render.render(write_still=True); report['preview'] = PREVIEW
print('REPORT ' + json.dumps(report))
