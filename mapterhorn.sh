#!/usr/bin/env bash
set -euo pipefail

versatiles convert --ssh-identity ~/.ssh/id_ed25519 "[,vpl](from_container filename='https://download.mapterhorn.com/planet.pmtiles' | dem_quantize encoding=terrarium)" "sftp://u417480@u417480.your-storagebox.de:23/home/incoming/elevation.versatiles"
