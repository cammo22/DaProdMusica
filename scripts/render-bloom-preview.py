# Optional asset tool: pip install moderngl pillow; requires an OpenGL 3.3 context.
import math, struct
from pathlib import Path
import moderngl
from PIL import Image
root=Path(__file__).resolve().parents[1]
ctx=moderngl.create_standalone_context(require=330)
def shader(source,vertex=False):
 source=source.replace('precision highp float;','').replace('varying ', 'out ' if vertex else 'in ').replace('texture2D(', 'texture(')
 if not vertex:source='out vec4 fragColor;\n'+source.replace('gl_FragColor','fragColor')
 return '#version 330\n'+source
vertex='in vec3 position;uniform mat4 projectionMatrix;uniform mat4 modelViewMatrix;\n'+(root/'src/suite-presets/AudioBloom/bloom.vert').read_text()
fragment=(root/'src/suite-presets/AudioBloom/bloom.frag').read_text()
program=ctx.program(vertex_shader=shader(vertex,True),fragment_shader=shader(fragment))
points=[]
for j in range(12):
 for i in range(128):
  a=i/128*math.tau;b=(i+1)/128*math.tau;r=.04+j/12*.96;s=.04+(j+1)/12*.96
  for radius,angle in [(r,a),(s,a),(s,b),(r,a),(s,b),(r,b)]:points.extend([math.cos(angle)*radius,math.sin(angle)*radius,0])
vbo=ctx.buffer(struct.pack('<'+'f'*len(points),*points));vao=ctx.vertex_array(program,[(vbo,'3f','position')])
raw=bytearray()
for i in range(64):
 level=int(100+math.sin(i*.43)**2*105);raw.extend([level,level,level,255])
tex=ctx.texture((64,1),4,bytes(raw));tex.filter=(moderngl.LINEAR,moderngl.LINEAR);tex.repeat_x=False;tex.repeat_y=False;tex.use(0)
values={'uTime':12.2,'uEnergy':.4,'uSpectrum':0,'uPetals':9,'uAmount':.85,'uSway':.5,'uSwell':.55,'uBloomPulse':.2,'uCurl':.4,'uIntensity':1.3,'uCentroid':.42,'uBeat':.2}
for k,v in values.items():
 if k in program:program[k].value=v
fbo=ctx.simple_framebuffer((192,192),components=4);fbo.use();fbo.clear(.005,.008,.025,1);ctx.viewport=(0,0,192,192)
ctx.enable(moderngl.BLEND);ctx.blend_func=(moderngl.SRC_ALPHA,moderngl.ONE)
program['projectionMatrix'].write(struct.pack('<16f',1,0,0,0,0,1,0,0,0,0,-1,0,0,0,0,1))
for layer in range(3):
 scale=1-layer*.14;program['uLayer'].value=layer
 program['modelViewMatrix'].write(struct.pack('<16f',scale,0,0,0,0,scale,0,0,0,0,1,0,0,0,0,1))
 vao.render(moderngl.TRIANGLES)
image=Image.frombytes('RGBA',(192,192),fbo.read(components=4)).transpose(Image.Transpose.FLIP_TOP_BOTTOM)
output=root/'public/effect-previews/daprod.audio-bloom.png';image.save(output)
print('Rendered original AudioBloom vertex + fragment shaders:',ctx.info['GL_RENDERER'],image.getextrema())
ctx.release()
