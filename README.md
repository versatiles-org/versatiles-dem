# versatiles-dem

CLI tool for downloading, processing, and converting Digital Elevation Model (DEM) data into [Terrarium-encoded](https://s3.amazonaws.com/elevation-tiles-prod/terrarium/) map tiles stored in [`.versatiles`](https://github.com/versatiles-org/versatiles-spec) containers.

Currently supports [Copernicus DEM GLO-30](https://spacedata.copernicus.eu/collections/copernicus-digital-elevation-model) (30m resolution) and GLO-90 (90m resolution).

## Prerequisites

- [Node.js](https://nodejs.org/) (v20+)
- [GDAL](https://gdal.org/) (`gdalinfo`, `gdalbuildvrt`)
- [VersaTiles](https://github.com/versatiles-org/versatiles-rs) (`versatiles`)

## Setup

```bash
npm install
```

## Usage

```bash
# Run the full pipeline for all sources
npm start

# Process a single source
npm start -- --source copernicus-dem-glo30
npm start -- --source copernicus-dem-glo90

# Run a specific step for all sources
npm start -- --step download
npm start -- --step check

# Combine both flags
npm start -- --source copernicus-dem-glo90 --step download

# Run the merge step (combines all sources into one file)
npm start -- --step merge

# Show help
npm start -- --help
```

## Pipeline Steps

The pipeline runs these steps in order for each source:

| Step       | Description                                                                       |
| ---------- | --------------------------------------------------------------------------------- |
| `download` | Fetch tile list from S3 and download all GeoTIFF tiles (8 concurrent, with retry) |
| `check`    | Verify completeness against tile list and integrity via `gdalinfo`                |
| `vrt`      | Build a virtual raster (`dem.vrt`) from all tiles using `gdalbuildvrt`            |
| `convert`  | Convert VRT to `.versatiles` with Terrarium encoding                              |
| `backup`   | _(not yet implemented)_                                                           |
| `merge`    | Merge all per-source `.versatiles` files into a single `dem.versatiles`           |

## Output

```
data/
├── copernicus-dem-glo30/
│   ├── tileList.txt
│   ├── tiles/                              # ~26,000 GeoTIFFs
│   ├── dem.vrt
│   └── copernicus-dem-glo30.versatiles
├── copernicus-dem-glo90/
│   ├── tileList.txt
│   ├── tiles/
│   ├── dem.vrt
│   └── copernicus-dem-glo90.versatiles
└── dem.versatiles                          # merged output
```

## Development

```bash
# Run all checks (formatting, linting, type checking, tests)
npm run check

# Individual checks
npm run format            # auto-format with prettier
npm run lint              # prettier --check + eslint
npm run check:types       # tsc --noEmit
npm test                  # vitest run
npm run test:coverage     # vitest run --coverage
npm run test:watch        # vitest in watch mode
```

## License

The source code is available under the [MIT License](LICENSE).

Data sources have their own licenses — see the YAML files in `sources/` for details.
