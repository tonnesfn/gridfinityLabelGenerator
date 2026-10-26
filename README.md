# Gridfinity Label Generator

Original repository: [CNC Kitchen’s Gridfinity Label Generator](https://github.com/CNCKitchen/gridfinityLabelGenerator).

The original repository does not accept pull requests, so this fork has undergone significant development that has not been contributed back upstream.

## Label styles

Choose **Pred bins** for the original mounting ears and holes, or **Glue-on** for a flat label with rounded corners and no holes or ears. Glue-on labels are 35.8 × 11.5 mm at 1× width, with a 0.4 mm base and 0.4 mm raised markings. Each additional width unit adds 42 mm. Attach the flat back to a standard bin with suitable glue or adhesive tape.

For CSV imports, add a `style` column with `glue-on` or `pred`. Omitting it keeps the original Pred design. The template CSV includes both styles.

## Run with Docker

Start the service from the repository root:

```sh
docker compose up -d --build
```

The service runs in the background and restarts automatically when Docker starts, including after a reboot, unless you explicitly stop it. Docker must be enabled at boot.

Open http://100.109.114.47:8009 from a device on your tailnet. On another host, set `BIND_ADDRESS` to its Tailscale IP:

```sh
BIND_ADDRESS=100.x.y.z docker compose up -d --build
```

For local access only, use `BIND_ADDRESS=127.0.0.1`. You can also save `BIND_ADDRESS` in a `.env` file beside `compose.yaml`.

View logs with `docker compose logs -f`. Stop the service with `docker compose down`. To rebuild after updating the code, run `docker compose up -d --build` again.

The web image builds the app and serves it with nginx. Label generation runs in the browser. A separate CSV storage service saves imports in the `saved-csvs` Docker volume, so they survive service rebuilds and container recreation. Saved files appear below **Download a template CSV**; click **Use again** to load one. Importing the same filename and content updates its save date without creating a duplicate; changed content is kept as another entry.

Do not remove the `saved-csvs` volume (for example with `docker compose down -v`) if you want to keep your files. The library is shared by everyone who can access this instance.

For local development, run `node server/csv-server.mjs` from the repository root alongside the Vite dev server. CSVs are stored in `data/csvs` by default; set `CSV_DATA_DIR` to change the location.
