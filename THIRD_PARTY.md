# DaProdSuite visual effects

`src/suite-presets/` contains shaders and preset manifests from
[DaProdSuite](https://github.com/cammo22/DaProdSuite), commit
`e82b960d6cb328290a1904c789f8799c91f3c370`.

Copyright (c) 2026 DaProdProduzioni. MIT license retained in
`third-party/DaProdSuite-LICENSE.txt`.

DaProd Musica adapts the common coordinate transform for touch interaction,
feeds spectrum/waveform textures, maps audio features and adds feedback trails.
The original shader files are retained unchanged for review and maintenance.

Version 0.3.0 includes all eleven Suite presets. AudioBloom and CosmicDust also include their original vertex shaders; geometry and camera setup are adapted to the compact renderer in src/mesh-scenes.js. The other nine use their original fragment equations. Evolution/compositing and eleven musica.* scenes are additions in this repository.
