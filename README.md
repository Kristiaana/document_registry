# Dokumentu reģistrs

Testa uzdevums: dokumentu metadati XML formātā -> imports no attālināta avota -> PostgreSQL -> REST API -> Nuxt frontend ar filtrēšanu un šķirošanu.

| Daļa | Tehnoloģijas |
|---|---|
| `backend/` | NestJS 11, TypeORM 0.3, PostgreSQL, fast-xml-parser, class-validator, Jest + Supertest |
| `frontend/` | Nuxt 4, Vue 3, Nuxt UI 4, Vitest |

Viss ir TypeScript.

## Palaišana

Vajadzīgs Node.js ≥ 20. PostgreSQL var būt jau instalēts, bet tas nav obligāti.

**Datubāze** - vienā terminālī:

```bash
cd backend
npm install
npm run db                                # lokāls PostgreSQL uz :5432, bez Docker un instalācijas
```

`npm run db` palaiž PostgreSQL no npm pakotnes `embedded-postgres` (dati glabājas `backend/.pgdata`) un izveido datubāzes `document_registry` un `document_registry_test`. Ja jums jau ir savs PostgreSQL, šo soli izlaidiet: izveidojiet UTF8 datubāzi (`createdb -E UTF8 document_registry`) un norādiet piekļuves datus `.env`.

**Backend** (http://localhost:3001) - otrā terminālī:

```bash
cd backend
cp .env.example .env                      # neobligāti; noklusējumi der npm run db
npm run generate:xml -- --count=30        # (neobligāti) jauni nejauši testa dati
npm run start:dev
```

Ar `IMPORT_ON_STARTUP=true` (noklusējums) dati tiek ielādēti automātiski pie palaišanas. Importu var palaist arī ar pogu frontend vai `curl -X POST http://localhost:3001/api/import`.

**Frontend** (http://localhost:3000)

```bash
cd frontend
npm install
npm run dev
```

API adresi var mainīt ar `NUXT_PUBLIC_API_BASE` (noklusējums `http://localhost:3001/api`).

## 1. XML struktūra

Shēma: [`backend/data/documents.xsd`](backend/data/documents.xsd), piemērs: [`backend/data/documents.xml`](backend/data/documents.xml).

```xml
<documents generatedAt="2026-10-04T09:55:58.433Z">
  <document id="DOC-0001">
    <title>Rīkojums par dokumentu pārvaldību</title>
    <description>Paredzēts iekšējai lietošanai ikdienas darbā.</description>
    <department>Personāla vadības nodaļa</department>
    <createdDate>2025-05-31</createdDate>
    <url>http://localhost:3001/mock/files/doc-0001.odt</url>
    <fileType>odt</fileType>
    <readingTimeMinutes>57</readingTimeMinutes>
    <importance>critical</importance>   <!-- low | medium | high | critical -->
    <category>internal</category>       <!-- public | internal | restricted | confidential -->
    <active>true</active>               <!-- true | false -->
  </document>
</documents>
```

| Prasība | Elements | Tips |
|---|---|---|
| Nosaukums | `title` | virkne, 1–255 |
| Apraksts | `description` | virkne |
| Atbildīgā struktūrvienība | `department` | virkne, 1–255 |
| Izveides datums | `createdDate` | `xs:date` (YYYY-MM-DD) |
| Saite uz dokumentu | `url` | http(s) URL |
| Faila tips | `fileType` | pdf / docx / xlsx / pptx / odt / txt / html |
| Aptuvenais lasīšanas laiks | `readingTimeMinutes` | vesels skaitlis ≥ 0, minūtēs |
| Svarīguma līmenis | `importance` | low / medium / high / critical |
| Kategorija | `category` | public / internal / restricted / confidential |
| Aktīvs statuss | `active` | `xs:boolean` |

Lēmumi:
- **`id` atribūts** nav prasību sarakstā, bet ir vajadzīgs, lai atkārtots imports atjauninātu esošos ierakstus, nevis tos dublētu.
- Enum vērtības ir angliski (stabili mašīnlasāmi kodi), latviskie nosaukumi ir tikai UI slānī.
- Lasīšanas laiks ir skaitlis minūtēs, nevis teksts ("~15 min"), lai pēc tā varētu šķirot un filtrēt.

## 2. Testa dati

`npm run generate:xml -- --count=30 --seed=42` ([`scripts/generate-xml.ts`](backend/scripts/generate-xml.ts)). Ģenerators izmanto deterministisku PRNG: ar vienu un to pašu `--seed` dati ir atkārtojami (to izmanto testos), bez tā katru reizi ir citi.

## 3. Ielāde no attālināta avota

- Avotu nosaka `XML_SOURCE_URL`. Atbalstīti `http(s)://` un `file://`.
- Noklusējuma avots ir simulēts ārējās sistēmas gala punkts tajā pašā backend: `GET /mock/documents.xml` (atdod `data/documents.xml`).
- `XmlSourceClient` - HTTP pieprasījums ar 10 s taimautu un kļūdu apstrādi (nesasniedzams avots / ne-2xx -> `502`, bojāts XML -> `400`).
- Parseris pārbauda katru ierakstu (obligātie lauki, enum vērtības, datums, URL, skaitlis, dublēti id). **Nekorekti ieraksti tiek izlaisti un atgriezti atskaitē**, korektie tiek saglabāti - viens bojāts ieraksts neaptur visu importu.
- Saglabāšana notiek vienā transakcijā ar `upsert` pēc `external_id`.

## 4. Datu glabāšana - PostgreSQL

Kāpēc relāciju DB un tieši PostgreSQL:
- Dati ir **stingri strukturēti** ar fiksētu lauku kopu - tieši tas, kam relāciju modelis paredzēts. Dokumentu DB (piem., MongoDB) elastīgā shēma šeit neko nedotu.
- Galvenā slodze ir **filtrēšana, šķirošana un lapošana** pēc dažādiem laukiem - indeksi un SQL to dara efektīvi DB pusē.
- **Native enum** tipi garantē, ka DB nonāk tikai derīgas vērtības, un šķirošana pēc svarīguma notiek pēc nozīmes (zems < vidējs < augsts < kritisks), nevis alfabētiski.
- `INSERT ... ON CONFLICT` dod atomāru upsert idempotentam importam; transakcijas - ACID.
- `ILIKE` meklēšanai pietiek MVP; nākotnē var pievienot pilnteksta meklēšanu (`tsvector`) bez citas sistēmas.

MVP vienkāršošana: shēmu veido TypeORM `synchronize`. Produkcijā tā vietā būtu migrācijas (`DB_SYNCHRONIZE=false`).

## 5. API

| Metode | Ceļš | Apraksts |
|---|---|---|
| `GET` | `/api/documents` | Saraksts ar filtriem, šķirošanu un lapošanu |
| `GET` | `/api/documents/:id` | Viens dokuments |
| `GET` | `/api/documents/departments` | Unikālās struktūrvienības (filtra izvēlnei) |
| `POST` | `/api/import` | Palaiž importu no `XML_SOURCE_URL` |
| `GET` | `/mock/documents.xml` | Simulētais attālinātais avots |
| `GET` | `/mock/files/:fileName` | Simulēts dokuments, uz kuru ved `<url>` (HTML lapa ar metadatiem) |

`GET /api/documents` parametri:

| Parametrs | Piemērs | |
|---|---|---|
| `search` | `politika` | meklē nosaukumā un aprakstā (reģistrnejutīgi) |
| `importance`, `category`, `fileType` | `high,critical` | viena vai vairākas vērtības |
| `department` | `IT departaments` | |
| `active` | `true` / `false` | |
| `sortBy` | `createdDate` | title, department, createdDate, fileType, readingTimeMinutes, importance, category, active |
| `sortOrder` | `asc` / `desc` | |
| `page`, `limit` | `1`, `20` | `limit` ≤ 100 |

Atbilde: `{ items: [...], total, page, limit }`. Nederīgi parametri -> `400` (validācija ar class-validator; `sortBy` ir baltais saraksts, tāpēc SQL injekcija caur to nav iespējama).

## 6. Frontend

Viena lapa ar Nuxt UI tabulu:
- dati tiek ielādēti no backend API;
- šķirošana, noklikšķinot uz jebkuras kolonnas virsraksta;
- filtri: teksta meklēšana (ar debounce), svarīgums, kategorija, faila tips (vairākas vērtības), struktūrvienība, aktīvs statuss;
- lapošana, poga "Importēt no avota", gaišais/tumšais režīms.

Filtrēšana, šķirošana un lapošana notiek **servera pusē**, tāpēc risinājums strādā arī ar lielu dokumentu skaitu.

```
frontend/app/
├── pages/index.vue               # lapa, saliek komponentes kopā
├── composables/useDocuments.ts   # filtru/šķirošanas/lapošanas stāvoklis un datu ielāde
├── components/
│   ├── DocumentFilters.vue       # meklēšana un filtri
│   ├── DocumentsTable.vue        # tabula un kolonnas
│   └── ImportButton.vue          # importa palaišana
└── utils/documents.ts            # tipi, nosaukumi latviski, query veidošana, formatēšana
```

## 7. Testi

```bash
cd backend
npm test            # vienību testi: XML parseris, ģenerators, imports, query validācija
npm run test:e2e    # e2e: XML -> imports -> PostgreSQL -> API (vajadzīga DB document_registry_test)

cd frontend
npm test            # query veidošana, formatēšana
npm run typecheck && npm run lint
```

E2E testi izmanto atsevišķu datubāzi (`TEST_DB_NAME`, noklusējums `document_registry_test`) un pirms palaišanas to iztīra.
