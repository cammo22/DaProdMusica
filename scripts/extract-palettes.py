from PIL import Image
import colorsys,json,pathlib
root=pathlib.Path(__file__).resolve().parents[1]
p=root/'public/catalog.json';data=json.loads(p.read_text(encoding='utf-8-sig'))
for album in data['albums']:
 for track in album['tracks']:
  art=track.get('artwork') or album.get('artwork')
  if not art:continue
  im=Image.open(root/'public'/art).convert('RGB').resize((64,64)).quantize(colors=10).convert('RGB')
  colors=im.getcolors(4096) or []
  def score(pair):
   count,color=pair;h,s,v=colorsys.rgb_to_hsv(*(x/255 for x in color));return count*(.2+s)*(.2+min(v,1-v)*2)
  color=max(colors,key=score)[1];h,s,v=colorsys.rgb_to_hsv(*(x/255 for x in color));r,g,b=colorsys.hsv_to_rgb(h,max(.25,min(.65,s)),.9)
  track['color']='#'+''.join(f'{round(x*255):02x}' for x in (r,g,b))
p.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
