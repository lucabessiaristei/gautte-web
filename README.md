# GAUTTE

Progetto personale, open source, per mappa e orari in tempo reale del trasporto pubblico di Torino (rete GTT). Fermate, linee, prossimi passaggi e ritardi.



## Stack

- [Vite](https://vitejs.dev/) + [React](https://react.dev/) + TypeScript
- [MapLibre GL JS](https://maplibre.org/) 
- [Supabase](https://supabase.com/) (Postgres) database, query etc
- Tailwind CSS
- [GitHub Action](.github/workflows/gtfs-sync.yml) per controllo aggiornamento dati GTT e caricamento su Supabase (controllo basato su hash SHA-256 dello zip file)

## Dati

**Dati statici (GTFS)** — fermate, linee, corse, calendario dei giorni di servizio. 
**Dati in tempo reale (GTFS-RT)** — ritardi e anticipi in fetch



## Mappa e licenze

La mappa usa [MapLibre GL JS](https://maplibre.org/) (licenza BSD-3-Clause) con tile e stile forniti da [OpenFreeMap](https://openfreemap.org/), a loro volta basati sui dati di [OpenStreetMap](https://www.openstreetmap.org/copyright), distribuiti sotto licenza [ODbL](https://opendatacommons.org/licenses/odbl/). 

I dati GTT (orari e tempo reale) sono distribuiti da GTT S.p.A. come [open data](https://www.gtt.to.it/gtt_gtfs_license.html), ad **uso non commerciale** (ricerca, didattica, progetti civici) e con obbligo di citazione della fonte — condizioni che questo progetto rispetta e che chiunque riusi questi dati deve rispettare a sua volta.

## Licenza

Il codice di questo repository è distribuito con licenza [MIT](LICENSE) — puoi usarlo, modificarlo e riproporlo liberamente. Questo copre solo il codice: i dati che l'app mostra restano soggetti alle licenze di GTT e di OpenStreetMap descritte sopra.
