import json,pathlib,sys,zipfile,struct
root=pathlib.Path(__file__).resolve().parents[1]
catalog=json.loads((root/'public/catalog.json').read_text(encoding='utf-8-sig'))
with zipfile.ZipFile(sys.argv[1]) as apk:
    names=set(apk.namelist())
    tracks=[t for a in catalog['albums'] for t in a['tracks']]
    for track in tracks:
        assert 'assets/'+track['src'] in names, f'Missing native audio: {track["id"]}'
        if track.get('artwork'): assert 'assets/'+track['artwork'] in names
        assert apk.getinfo('assets/'+track['src']).compress_type==zipfile.ZIP_STORED, 'Audio must support direct seeking'
    assert any(n.startswith('lib/arm64-v8a/') and n.endswith('.so') for n in names)
    for name in names:
        if not name.endswith('.so'): continue
        data=apk.read(name)
        assert data[:6]==b'\x7fELF\x02\x01', 'Expected little-endian ELF64'
        offset=struct.unpack_from('<Q',data,32)[0]
        entry_size,count=struct.unpack_from('<HH',data,54)
        loads=[struct.unpack_from('<IIQQQQQQ',data,offset+i*entry_size) for i in range(count) if struct.unpack_from('<I',data,offset+i*entry_size)[0]==1]
        assert loads and all(p[7]>=16384 for p in loads), f'{name} is not aligned for Android 16KB memory pages'
print(f'APK verified: {len(tracks)} native audio files, embedded artwork, ARM64 library with 16KB page alignment.')
