# 🛡️ Supabase Inaktivitás Megelőzés (Keep-Alive Útmutató)

A Supabase Free Tier csomagban a projektek **7 nap inaktivitás** után automatikusan felfüggesztésre („Inactivity Pause”) kerülnek, ha nem érkezik hozzájuk külső adatbázis- vagy API-lekérdezés.

Ezzel a megoldással a Supabase projekt **folyamatosan ébren marad, 100%-ban ingyenesen és automatikusan**.

---

## 1. Elsődleges Megoldás: GitHub Actions Időzített Workflow (Már beállítva)

Létrehoztuk a [`.github/workflows/supabase-keep-alive.yml`](file:///.github/workflows/supabase-keep-alive.yml) fájlt.

### Hogyan működik?
- **Ütemezés:** Naponta kétszer (06:00 UTC és 18:00 UTC) automatikusan lefut a GitHub felhőjében.
- **Művelet:** Egy valódi SQL lekérdezést futtat le a REST API-n keresztül (`SELECT id FROM spots LIMIT 1`) és ellenőrzi az Auth végpontot.
- **Költség:** 0 Ft (A GitHub Actions ingyenes keretéből mindössze ~10 másodpercet fogyaszt futásonként, ami havonta kevesebb mint 10 perc a havi 2000 ingyenes percből).
- **Azonnali tesztelés:** A GitHub-on a **Actions** fülre lépve a *„Supabase Keep-Alive”* workflow-t a **Run workflow** gombbal bármikor azonnal elindíthatod.

---

## 2. Másodlagos (Redundáns) Megoldás: Ingyenes Külső Uptime Monitor

Ha szeretnél egy 100%-os biztonsági hálót (külső figyelőt, amely SMS/Email értesítést is küld, ha bármi gond lenne a weboldallal vagy az adatbázissal):

### Beállítás az UptimeRobot-on (2 perc, ingyenes):
1. Regisztrálj ingyen az [uptimerobot.com](https://uptimerobot.com)-on.
2. Kattints az **Add New Monitor** gombra:
   - **Monitor Type:** `HTTP(s)`
   - **Friendly Name:** `Győri Skatemap Supabase Keep-Alive`
   - **URL (or IP):** `https://czryzqrxxfwthmzwpeah.supabase.co/rest/v1/spots?select=id&limit=1`
   - **Monitoring Interval:** `Every 1 day` (vagy 6 hours)
3. Kattints az **Advanced Settings** -> **Custom HTTP Headers** részre, és add hozzá:
   - Header 1: `apikey` = `sb_publishable_7gjqAKcwUvchmm6MYJqWUg_ak9re_pg`
   - Header 2: `Authorization` = `Bearer sb_publishable_7gjqAKcwUvchmm6MYJqWUg_ak9re_pg`
4. Kattints a **Create Monitor** gombra.
