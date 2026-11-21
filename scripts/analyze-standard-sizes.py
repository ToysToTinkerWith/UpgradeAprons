"""Review photo landmarks against the confirmed 5 x 5.5-inch chest pocket.

This creates analysis artifacts, not replacement product images or measurements.
Landmarks are in an upright 1368 x 1824 reference image. Separate horizontal
and vertical scales avoid treating camera foreshortening as an apron dimension.
"""
from pathlib import Path
import json
import math
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'product-intake/standard-sizing'
OUT.mkdir(parents=True, exist_ok=True)
# Pocket corners (TL, TR, BR, BL), bib center, and hem endpoints.
REVIEW = [
    ('chocolate-ivory-standard', 'standard-october-additions/originals/1-Photo-1.jpg', [[610,540],[823,540],[824,764],[604,757]], [722,384], [[148,1595],[1273,1640]]),
    ('seafoam-lavender-standard', 'standard-october-additions/originals/2-Photo-2.jpg', [[616,594],[824,594],[824,810],[612,809]], [707,425], [[183,1530],[1235,1550]]),
    ('ivory-rust-charcoal-standard', 'standard-october-additions/originals/3-Photo-3.jpg', [[586,591],[797,591],[797,812],[578,810]], [693,394], [[146,1541],[1201,1580]]),
    ('sage-ivory-burgundy-standard', 'standard-october/originals/1-Photo-1.jpg', [[603,617],[810,615],[820,841],[596,836]], [697,423], [[219,1547],[1195,1565]]),
    ('mist-ivory-standard', 'standard-october/originals/2-Photo-2.jpg', [[574,599],[780,598],[790,823],[568,822]], [685,411], [[127,1643],[1227,1662]]),
    ('pearl-burgundy-gold-standard', 'standard-october/originals/3-Photo-3.jpg', [[552,562],[755,557],[773,773],[555,778]], [659,369], [[137,1597],[1225,1579]]),
    ('periwinkle-bronze-standard', 'standard-october/originals/4-Photo-4.jpg', [[549,551],[760,546],[772,778],[550,778]], [665,335], [[129,1612],[1240,1589]]),
    ('ivory-indigo-charcoal-standard', 'standard-october/originals/5-Photo-5.jpg', [[516,474],[734,462],[747,702],[508,707]], [635,321], [[91,1574],[1225,1551]]),
    ('ivory-crimson-charcoal-standard', 'standard-october/originals/6-Photo-6.jpg', [[558,528],[778,520],[791,760],[552,760]], [665,376], [[137,1607],[1248,1616]]),
    ('pearl-linen-standard', 'standard-october/originals/7-Photo-7.jpg', [[590,545],[804,550],[800,762],[579,755]], [696,411], [[113,1533],[1198,1574]]),
    ('tangerine-blue-standard', 'standard-october/originals/8-Photo-8.jpg', [[626,560],[809,554],[821,759],[618,766]], [715,387], [[248,1430],[1216,1430]]),
    ('charcoal-sage-standard', 'standard-september/IMG_0004.jpg', [[584,625],[819,626],[820,893],[577,888]], [711,397], [[165,1688],[1224,1688]]),
    ('forest-sunflower-standard', 'standard-september/IMG_0002.jpg', [[537,576],[778,574],[785,834],[536,838]], [659,353], [[94,1746],[1277,1751]]),
    ('indigo-ivory-standard', 'standard-september/IMG_9996.jpg', [[558,678],[793,678],[797,938],[561,937]], [684,449], [[148,1768],[1234,1768]]),
    ('cobalt-crimson-standard', 'cobalt-crimson-standard/original.jpg', [[530,605],[822,603],[831,821],[526,822]], [676,386], [[70,1754],[1285,1734]]),
    ('burgundy-bloom-standard', 'IMG_0016/original.jpg', [[597,656],[825,657],[834,904],[590,902]], [709,461], [[126,1762],[1309,1776]]),
]

font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 18)
small_font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 15)
distance = lambda a,b: math.dist(a,b)
results = []
for index, (slug, source, pocket, bib, hem) in enumerate(REVIEW):
    photo = ImageOps.exif_transpose(Image.open(ROOT/'product-intake'/source))
    if photo.width > photo.height:
        photo = photo.transpose(Image.Transpose.ROTATE_90)
    photo = photo.convert('RGB').resize((1368,1824))
    pw = (distance(pocket[0],pocket[1]) + distance(pocket[3],pocket[2])) / 2
    ph = (distance(pocket[0],pocket[3]) + distance(pocket[1],pocket[2])) / 2
    hem_center = [(a+b)/2 for a,b in zip(*hem)]
    width = distance(*hem)/pw*5
    length = distance(bib,hem_center)/ph*5.5
    candidates = {'small': [20.5,26], 'large': [22.5,28]}
    scores = {size: sum(((a-b)/b)**2 for a,b in zip([width,length],dims)) for size,dims in candidates.items()}
    best = min(scores,key=scores.get)
    # Width and length must agree independently; borderline estimates are not
    # silently turned into definitive customer-facing labels.
    width_choice = 'small' if width < 21.5 else 'large'
    length_choice = 'small' if length < 27 else 'large'
    review = width_choice != length_choice or abs(width-21.5)<.4 or abs(length-27)<.4
    results.append({'slug':slug,'source':source,'pocketCorners':pocket,'bibCenter':bib,'hemEndpoints':hem,
                    'photoWidthInches':round(width,2),'photoLengthInches':round(length,2),
                    'closestTemplate':best,'needsReview':review,
                    'standardSize':None if review else best,
                    'basis':'Photo estimate using user-confirmed 5 x 5.5-inch chest pocket; not measured flat.'})
    d = ImageDraw.Draw(photo)
    d.line(pocket+[pocket[0]],fill='#00ffff',width=6)
    d.line(hem,fill='#ff00ff',width=6)
    d.line([bib,hem_center],fill='#ff00ff',width=6)
    tile = Image.new('RGB',(400,620),'#242628')
    photo.thumbnail((390,520))
    tile.paste(photo,((400-photo.width)//2,0))
    d=ImageDraw.Draw(tile)
    d.text((8,526),slug.replace('-standard',''),font=font,fill='white')
    d.text((8,553),f'Photo scale: {width:.1f} x {length:.1f} in',font=small_font,fill='white')
    d.text((8,577),'REVIEW' if review else f'{best.upper()} (photo estimate)',font=font,fill='#e7ad61')
    if index%4==0: sheet=Image.new('RGB',(1600,620),'#242628')
    sheet.paste(tile,((index%4)*400,0))
    if index%4==3: sheet.save(OUT/f'review-{index//4+1}.jpg',quality=94)

(OUT/'photo-analysis.json').write_text(json.dumps(results,indent=2)+'\n')
for result in results:
    print(f'{result["slug"]}: {result["photoWidthInches"]} x {result["photoLengthInches"]} -> {result["standardSize"] or "REVIEW"}')
