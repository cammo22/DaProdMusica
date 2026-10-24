import json,pathlib,sys,zipfile
catalog=json.loads(pathlib.Path('public/catalog.json').read_text())
with zipfile.ZipFile(sys.argv[1]) as apk:
    names=set(apk.namelist())
    tracks=[t for a in catalog['albums'] for t in a['tracks']]
    for track in tracks:
        assert 'assets/'+track['src'] in names, f'Missing native audio: {track["id"]}'
        if track.get('artwork'): assert 'assets/'+track['artwork'] in names
        assert apk.getinfo('assets/'+track['src']).compress_type==zipfile.ZIP_STORED, 'Audio must support direct seeking'
    assert any(n.startswith('lib/arm64-v8a/') and n.endswith('.so') for n in names)
print(f'APK verified: {len(tracks)} native audio files, embedded artwork, ARM64 library.')
