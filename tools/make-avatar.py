"""Generate a flat vector portrait for an author.

    python3 tools/make-avatar.py src/assets/img/people "Ada Okafor" "Bruno Salas"

Writes <slug>.svg per name, which is exactly what the `avatar` filter in
eleventy.config.js looks for. Nothing in the build runs this -- it is a
one-off for when a new author turns up, and the output is meant to be
committed.

Flat vector portraits. Deterministic from the name, so a person keeps the
same face across rebuilds. Drawn, not photographic -- nobody could mistake
one for a picture of a real person.

Two things have to hold at 32px, which is the smallest size these are used
at: the hair must stop above the eyeline, and the eyes must stay legible on
a dark skin tone. Hence the clip at y=27 and the white sclera."""
import hashlib, pathlib, sys

SKIN  = ["#f4d6ba","#eac09c","#d7a177","#bf8356","#9a613f","#73482f","#f8e3cc","#cb9268"]
HAIR  = ["#2b2724","#4a3325","#7a5230","#ab7a48","#dcc08c","#8c919a","#36363f","#5c3b2e","#191817","#a44a34"]
BG    = ["#cfe0f2","#d7e6d2","#f5dcce","#e4daf0","#f7e6bb","#d4ece6","#f0d7e2","#dde1e9","#e9e2d3","#cfe6f0"]
CLOTH = ["#3f5f8a","#687a56","#8a5a4a","#58526c","#766647","#487067","#78495c","#565c66","#6a5340","#405a6b"]
STYLES = ["buzz","short","bob","long","afro","bun","bald","ponytail","sidepart","curly"]

def lum(hexc):
    r, g, b = (int(hexc[i:i+2], 16) / 255 for i in (1, 3, 5))
    return 0.2126*r + 0.7152*g + 0.0722*b

def pick(seq, h, i): return seq[h[i] % len(seq)]

def face(name):
    h = hashlib.sha256(name.encode()).digest()
    skin = pick(SKIN, h, 0)
    # keep hair off the skin tone, or the head reads as one flat blob
    hair = next((HAIR[(h[1] + k) % len(HAIR)] for k in range(len(HAIR))
                 if abs(lum(HAIR[(h[1] + k) % len(HAIR)]) - lum(skin)) > 0.17), HAIR[0])
    bg, cloth = pick(BG, h, 2), pick(CLOTH, h, 3)
    style = pick(STYLES, h, 4)
    glasses = h[5] % 100 < 34
    beard = h[6] % 100 < 26 and style not in ("bob", "long")
    pupil = "#2e2824"

    p = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="{name}">',
         '<defs><clipPath id="c"><circle cx="32" cy="32" r="32"/></clipPath>',
         '<clipPath id="t"><rect x="0" y="0" width="64" height="27"/></clipPath></defs>',
         '<g clip-path="url(#c)">',
         f'<circle cx="32" cy="32" r="32" fill="{bg}"/>',
         f'<ellipse cx="32" cy="65" rx="21" ry="15" fill="{cloth}"/>',
         f'<rect x="27.5" y="38" width="9" height="12" rx="4.5" fill="{skin}"/>']

    if style == "long":
        p.append(f'<path d="M15 30c0-11 7-17 17-17s17 6 17 17v22H15z" fill="{hair}"/>')
    elif style == "bob":
        p.append(f'<path d="M16 30c0-10 7-16 16-16s16 6 16 16v13H16z" fill="{hair}"/>')
    elif style == "ponytail":
        p.append(f'<ellipse cx="48" cy="34" rx="5" ry="9" fill="{hair}"/>')
    if style == "bun":
        p.append(f'<circle cx="32" cy="10" r="5.5" fill="{hair}"/>')

    p += [f'<ellipse cx="20.5" cy="31" rx="2.4" ry="3" fill="{skin}"/>',
          f'<ellipse cx="43.5" cy="31" rx="2.4" ry="3" fill="{skin}"/>',
          f'<ellipse cx="32" cy="30" rx="12.5" ry="14.5" fill="{skin}"/>']

    # hair clipped to above the eyeline, so it can never cover the face
    grow = {"buzz":0.4,"short":1.3,"bob":1.8,"long":1.8,"afro":4.4,
            "bun":1.3,"ponytail":1.6,"sidepart":1.6,"curly":2.6,"bald":None}[style]
    if grow is not None:
        p.append(f'<ellipse cx="32" cy="30" rx="{12.5+grow}" ry="{14.5+grow}" '
                 f'fill="{hair}" clip-path="url(#t)"/>')
    if style == "curly":
        for cx, cy in ((21,21),(27,16),(37,16),(43,21),(32,14)):
            p.append(f'<circle cx="{cx}" cy="{cy}" r="4.4" fill="{hair}" clip-path="url(#t)"/>')
    if style == "sidepart":
        p.append(f'<path d="M20 24c5-7 17-9 24-3-7 0-11 2-14 5-3-2-6-3-10-2z" '
                 f'fill="{hair}" opacity=".5" clip-path="url(#t)"/>')

    if beard:  # jaw only, well below the eyes
        p.append(f'<path d="M21.5 34c.6 7.5 5.2 12 10.5 12s9.9-4.5 10.5-12'
                 f'c-1.6 4-5.6 6-10.5 6s-8.9-2-10.5-6z" fill="{hair}" opacity=".85"/>')

    # white sclera keeps the eyes legible on a dark skin tone at 32px
    for cx in (27, 37):
        p.append(f'<ellipse cx="{cx}" cy="30.5" rx="2.5" ry="2.7" fill="#fdfcfb" opacity=".95"/>')
        p.append(f'<ellipse cx="{cx}" cy="30.7" rx="1.45" ry="1.75" fill="{pupil}"/>')
    p.append(f'<path d="M28.6 37.8q3.4 2.6 6.8 0" stroke="{pupil}" stroke-width="1.4" '
             f'stroke-linecap="round" fill="none" opacity=".75"/>')
    if glasses:
        p.append(f'<g fill="none" stroke="{pupil}" stroke-width="1.3" opacity=".7">'
                 f'<circle cx="27" cy="30.5" r="4.8"/><circle cx="37" cy="30.5" r="4.8"/>'
                 f'<path d="M31.8 30.5h.4"/><path d="M22.2 30.5h-2"/><path d="M41.8 30.5h2"/></g>')
    p.append('</g></svg>')
    return "".join(p)

if __name__ == "__main__":
    out = pathlib.Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
    for n in sys.argv[2:]:
        (out / f'{n.lower().replace(" ","-").replace(chr(39),"")}.svg').write_text(face(n))
    print(f"{len(sys.argv)-2} faces written")
