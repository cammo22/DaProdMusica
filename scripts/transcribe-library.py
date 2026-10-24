"""Resumable, local-only karaoke drafts. Python 3.12 + requirements-lyrics.txt."""
import argparse, hashlib, json, os, pathlib, re, time, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# CUDA wheels on Windows keep their DLLs outside PATH. Retain directory handles.
_dlls = []
if os.name == 'nt':
    import site
    for base in site.getsitepackages():
        for path in pathlib.Path(base).glob('nvidia/*/bin'):
            os.environ['PATH'] = str(path) + os.pathsep + os.environ.get('PATH', '')
            _dlls.append(os.add_dll_directory(str(path)))
from faster_whisper import WhisperModel

def write_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix('.tmp')
    tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
    tmp.replace(path)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--model', default='small')
    parser.add_argument('--device', default='cuda', choices=['cuda','cpu'])
    parser.add_argument('--limit', type=int)
    args = parser.parse_args()
    root = pathlib.Path(__file__).resolve().parents[1]
    cache = root / '.lyrics-cache'
    print(f'Loading faster-whisper/{args.model} on {args.device}; audio stays on this PC.', flush=True)
    model = WhisperModel(args.model, device=args.device, compute_type='int8_float16' if args.device=='cuda' else 'int8', download_root=str(cache/'models'), cpu_threads=8)
    catalog = json.loads((root/'public/catalog.json').read_text(encoding='utf-8'))
    output = {'version':1,'tracks':{},'provenance':{'model':f'Systran/faster-whisper-{args.model}','status':'machine-draft','wordTimestamps':True}}
    report = {'model':args.model,'device':args.device,'tracks':[]}
    tracks = [t for a in catalog['albums'] for t in a['tracks']]
    if args.limit: tracks = tracks[:args.limit]
    for index, track in enumerate(tracks):
        audio = root/'public'/track['src']
        fingerprint = hashlib.sha256(audio.read_bytes()).hexdigest()
        saved = cache/f"{track['id']}.json"
        previous = json.loads(saved.read_text(encoding='utf-8')) if saved.exists() else None
        language_hint = None if re.search(r'[\u3400-\u9fff]|midnight pulse',track['title'],re.I) else 'it'
        start = time.monotonic()
        if previous and previous.get('sha256')==fingerprint and previous.get('model')==args.model and previous.get('method')=='full-audio-v2' and previous.get('languageHint','it')==language_hint:
            result = previous
        else:
            segments, info = model.transcribe(str(audio), beam_size=5, word_timestamps=True, vad_filter=False, language=language_hint, condition_on_previous_text=False, no_speech_threshold=.6, compression_ratio_threshold=2.4)
            lines=[]
            for segment in segments:
                text=segment.text.strip()
                if not text or segment.no_speech_prob>.75 or segment.avg_logprob < -1.3: continue
                # Common transcription-credit hallucinations are not song lyrics.
                if re.search(r'(sottotitoli|amara\.org|subtitles by|thanks for watching)',text,re.I): continue
                words=[{'start':round(w.start,3),'end':round(w.end,3),'text':w.word,'probability':round(w.probability,3)} for w in (segment.words or [])]
                lines.append({'time':round(segment.start,3),'end':round(segment.end,3),'text':text,'words':words})
            result={'id':track['id'],'sha256':fingerprint,'model':args.model,'method':'full-audio-v2','languageHint':language_hint,'language':info.language,'duration':info.duration,'lines':lines,'status':'machine-draft'}
            write_json(saved,result)
        output['tracks'][track['id']]=result['lines']
        report['tracks'].append({'id':track['id'],'title':track['title'],'language':result['language'],'lines':len(result['lines']),'words':sum(len(l.get('words',[])) for l in result['lines']),'status':'machine-draft'})
        write_json(root/'public/lyrics.json',output)
        write_json(root/'public/lyrics-report.json',report)
        print(f"[{index+1}/{len(tracks)}] {track['title']}: {len(result['lines'])} lines, {time.monotonic()-start:.1f}s",flush=True)
    print(f'COMPLETE: {len(output["tracks"])} tracks. All results need editorial review.',flush=True)

if __name__=='__main__': main()
