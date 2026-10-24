import hashlib,json,pathlib,zipfile
root=pathlib.Path(__file__).resolve().parents[1]
out=root/'.media-cache/DaProdMusica-albums-v2.zip'
out.parent.mkdir(exist_ok=True)
with zipfile.ZipFile(out,'w',zipfile.ZIP_STORED) as archive:
    for path in sorted((root/'public/media').rglob('*')):
        if path.is_file(): archive.write(path,path.relative_to(root/'public').as_posix())
digest=hashlib.file_digest(out.open('rb'),'sha256').hexdigest()
(root/'media-bundle.json').write_text(json.dumps({'tag':'v0.2.0','asset':out.name,'sha256':digest},indent=2)+'\n')
print(f'{out.name}: {out.stat().st_size} bytes, sha256 {digest}')
