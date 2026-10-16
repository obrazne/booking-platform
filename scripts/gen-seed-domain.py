"""Generates supabase/seed-domain.sql: catalogue terms, Chalet STRÖMY (real data, docs/podklady) and the showroom.

Run: python scripts/gen-seed-domain.py  (output is committed; re-run after editing this file).
No access codes, no Wi-Fi passwords, no guest data (CLAUDE.md).
"""

import json
from pathlib import Path

UKAZKA = "a0000000-0000-4000-8000-000000000001"
STROMY = "a0000000-0000-4000-8000-000000000002"

out: list[str] = []


def q(value):
    if value is None:
        return "null"
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (int, float)):
        return str(value)
    if isinstance(value, (dict, list)):
        return "'" + json.dumps(value, ensure_ascii=False).replace("'", "''") + "'::jsonb"
    return "'" + str(value).replace("'", "''") + "'"


def sk(text: str) -> dict:
    return {"sk": text}


def uid(prefix: str, n: int) -> str:
    return f"{prefix}0000000-0000-4000-8000-{n:012d}"


# ---------------------------------------------------------------------------------------------- terms
TERMS = {
    "property_type": [
        ("chalet", "Chalet"), ("chata", "Horská chata"), ("vila", "Vila"),
        ("apartmany", "Apartmánový dom"), ("penzion", "Penzión"), ("glamping", "Glamping"),
    ],
    "region": [
        ("liptov", "Liptov"), ("vysoke-tatry", "Vysoké Tatry"), ("orava", "Orava"),
        ("male-karpaty", "Malé Karpaty"), ("pieniny", "Pieniny"),
    ],
    "amenity": [
        ("wifi", "Wi-Fi"), ("parkovanie", "Parkovanie"), ("sauna", "Sauna"), ("virivka", "Vírivka"),
        ("bazen", "Bazén"), ("gril", "Gril"), ("klimatizacia", "Klimatizácia"), ("lyziaren", "Lyžiareň"),
        ("kuchyna", "Plne vybavená kuchyňa"), ("tv", "Smart TV"), ("krb", "Krb"), ("ranajky", "Raňajky na želanie"),
    ],
    "suitable_for": [
        ("rodiny", "Rodiny s deťmi"), ("skupiny", "Skupiny priateľov"), ("pary", "Páry"),
        ("so-zvieratom", "So zvieraťom"), ("lyziari", "Lyžiari"), ("firmy", "Firemné akcie"),
    ],
}
for kind, items in TERMS.items():
    for i, (key, name) in enumerate(items):
        out.append(
            f"insert into public.terms (tenant_id, kind, key, name, sort) values (null, {q(kind)}, {q(key)}, {q(sk(name))}, {i})"
            f" on conflict (kind, key) where tenant_id is null do nothing;"
        )


def term_links(prop_id: str, tenant: str, keys: list[tuple[str, str]]):
    for kind, key in keys:
        out.append(
            "insert into public.property_terms (property_id, term_id, tenant_id) "
            f"select {q(prop_id)}, t.id, {q(tenant)} from public.terms t where t.tenant_id is null and t.kind = {q(kind)} and t.key = {q(key)} "
            "on conflict do nothing;"
        )


def property_row(**p):
    cols = ", ".join(p.keys())
    vals = ", ".join(q(v) for v in p.values())
    out.append(f"insert into public.properties ({cols}) values ({vals}) on conflict (id) do nothing;")


def insert(table: str, conflict: str = "(id)", **row):
    cols = ", ".join(row.keys())
    vals = ", ".join(q(v) for v in row.values())
    out.append(f"insert into public.{table} ({cols}) values ({vals}) on conflict {conflict} do nothing;")


def highlight(prop_id: str, items: list[tuple[str, str]]):
    """Highlighted amenities for "What awaits you" (v2) with a one-line note, in order."""
    for i, (key, note) in enumerate(items):
        out.append(
            "update public.property_terms pt set highlighted = true, "
            f"highlight_note = {q(sk(note))}, highlight_sort = {i} from public.terms t "
            f"where pt.property_id = {q(prop_id)} and pt.term_id = t.id and t.kind = 'amenity' and t.key = {q(key)};"
        )


def places(prop_id: str, tenant: str, items: list[tuple[str, str, str]]):
    """Nearby places (v2) — orientačné, ukážkové údaje (overí majiteľ)."""
    out.append(f"delete from public.property_places where property_id = {q(prop_id)};")
    for i, (name, how, dist) in enumerate(items):
        insert("property_places", id=uid("4", int(prop_id[-3:]) * 10 + i), tenant_id=tenant, property_id=prop_id,
               name=sk(name), how=sk(how), distance=dist, sort=i)


def photo_categories(prop_id: str, by_alt: dict[str, str]):
    """Album of each photo in the gallery (v2), matched by its description (photos are uploaded separately)."""
    for alt, cat in by_alt.items():
        out.append(f"update public.photos set category = {q(cat)} where property_id = {q(prop_id)} and alt ->> 'sk' = {q(alt)};")


def testimonial(n: int, tenant: str, prop_id: str | None, author: str, text: str, source: str = "other",
                featured: bool = False):
    insert("testimonials", id=uid("5", n), tenant_id=tenant, property_id=prop_id, body=sk(text), author_name=author,
           source=source, featured=featured, sort=n)


def sections(prop_id: str, template: str | None = None, content: dict | None = None):
    """Page sections (B7): template by key (or by property type) and content of individual sections."""
    out.append(f"select public.apply_section_template({q(prop_id)}, {q(template)}, true);")
    for type_, value in (content or {}).items():
        out.append(f"update public.property_sections set content = {q(value)} where property_id = {q(prop_id)} and type = {q(type_)};")


# ---------------------------------------------------------------------------------------------- Chalet STRÖMY
P = uid("b", 100)
U = uid("c", 100)
property_row(
    id=P, tenant_id=STROMY, slug="chalet-stromy", name="Chalet STRÖMY", status="published",
    booking_mode="whole", pricing_model="per_night",
    summary=sk("Moderný chalet pre 8–12 hostí v Demänovskej doline, so saunou a vonkajšou vírivkou, pár minút od Jasnej."),
    description=sk(
        "Chalet STRÖMY stojí v komplexe Tri Vody v Demänovskej doline. Prenajíma sa celý — 4 spálne s 8 pevnými lôžkami, "
        "prístelky, futónové postele a detská postieľka pre spolu 8 až 12 osôb, 3 kúpeľne, 2 obývačky, 2 kuchyne a 2 terasy.\n\n"
        "Po lyžovačke na Jasnej (skibus zastavuje pod komplexom) čaká fínska sauna a vonkajšia vírivka s výhľadom do doliny. "
        "V lete sú na dosah Demänovské jaskyne, Tatralandia, Bešeňová aj Liptovská Mara."
    ),
    house_rules=sk(
        "Príchod od 15:00, odchod do 10:00 (bezkontaktný check-in). Nočný kľud 22:00–6:00. "
        "V interiéri je zakázané fajčiť a používať otvorený oheň. Zvieratá po dohode za poplatok."
    ),
    included=sk("Posteľná bielizeň, uteráky, župany, plachty do sauny, wellness, energie, Wi-Fi, parkovanie a online check-in. Žiadne skryté poplatky."),
    tagline=sk("Celý len pre vás."),
    testimonials=[
        {"author": "Elizabeth Kohutova", "text": "Toto miesto… nádherné! Skvelá lokalita a služby na vysokej úrovni. Strávili sme tu pár dní s rodinou a som veľmi nadšená! Určite sa vrátime."},
        {"author": "Patricia Vittek", "text": "Neviem si predstaviť lepšie miesto na oddych a vypnutie hlavy. Atmosféra hôr je jednoducho TOP!"},
        {"author": "Eva Milistenferova", "text": "S priateľmi sme si užili skvelé ubytovanie s kompletným vybavením. Určite sa sem radi vrátime."},
    ],
    street="Do doliny 1, komplex Tri Vody", city="Demänovská dolina", postal_code="031 01", country="SK",
    latitude=48.996, longitude=19.583, max_guests=12, bedrooms=4, bathrooms=3,
    check_in_from="15:00", check_out_until="10:00", cleaning_gap_days=0, pets_allowed=True,
    tourist_tax_included=True, tourist_tax_cents=0, accommodation_vat_bp=0,
    contact_email="kontakt@chaletstromy.sk", contact_phone="+421 905 109 393", sort=0,
)
insert("property_private", conflict="(property_id)", property_id=P, tenant_id=STROMY,
       arrival_instructions=sk("Ukážkové pokyny: príchod od 15:00, parkovanie na 2 vyhradených miestach pred chaletom. "
                               "Prístupové kódy pošle majiteľka v e-maile pred príchodom."))
insert("units", id=U, tenant_id=STROMY, property_id=P, name="Celý chalet", max_guests=12, bedrooms=4, is_default=True)
term_links(P, STROMY, [("property_type", "chalet"), ("region", "liptov"), ("amenity", "wifi"), ("amenity", "parkovanie"),
                       ("amenity", "sauna"), ("amenity", "virivka"), ("amenity", "gril"), ("amenity", "klimatizacia"),
                       ("amenity", "lyziaren"), ("amenity", "kuchyna"), ("amenity", "tv"), ("suitable_for", "rodiny"),
                       ("suitable_for", "skupiny"), ("suitable_for", "lyziari"), ("suitable_for", "so-zvieratom")])

seasons = [
    (uid("d", 101), "Celoročne", 0, True, 2, 70000, None, []),
    (uid("d", 102), "Zimná sezóna", 10, False, 3, 85000, "#5b8db8",
     [("2000-12-19", "2000-12-22"), ("2000-12-27", "2000-12-30"), ("2000-01-02", "2000-02-28")]),
    (uid("d", 103), "Vianoce a Silvester", 20, False, 4, 120000, "#c8873a",
     [("2000-12-23", "2000-12-26"), ("2000-12-31", "2000-01-01")]),
]
for i, (sid, name, prio, default, min_n, rate, color, ranges) in enumerate(seasons):
    insert("seasons", id=sid, tenant_id=STROMY, property_id=P, name=sk(name), priority=prio, is_default=default,
           min_nights=min_n, color=color, sort=i)
    for j, (a, b) in enumerate(ranges):
        insert("season_ranges", id=uid("e", 100 + i * 10 + j), tenant_id=STROMY, season_id=sid, start_date=a,
               end_date=b, repeat_yearly=True)
    insert("rates", conflict="(unit_id, season_id)", tenant_id=STROMY, unit_id=U, season_id=sid, amount_cents=rate)

insert("fees", id=uid("f", 101), tenant_id=STROMY, property_id=P, key="pet", name=sk("Pobyt so zvieraťom"),
       kind="pet", price_model="per_night", amount_cents=2000)
insert("discounts", id=uid("1", 101), tenant_id=STROMY, property_id=P, kind="length_of_stay",
       name=sk("Zľava pri pobyte od 6 nocí"), percent_bp=1000, min_nights=6)
insert("discounts", id=uid("1", 102), tenant_id=STROMY, property_id=P, kind="promo", name=sk("FIRST MINUTE ZIMA"),
       code="ZIMAVJASNEJ15", percent_bp=1500, min_guests=4, max_guests=10, booked_until="2026-11-30",
       excluded_from="2026-12-19", excluded_until="2027-01-31")
insert("discounts", id=uid("1", 103), tenant_id=STROMY, property_id=P, kind="promo", name=sk("JESENNÉ PRÁZDNINY"),
       code="JESENVJASNEJ20", percent_bp=2000, stay_from="2026-09-01", stay_until="2026-11-30")
for i, (key, name, desc, model, cents, maxq) in enumerate([
    ("ranajky", "Raňajky v chalete", "Raňajky podávané v chalete pre všetkých hostí.", "per_person_night", 1500, None),
    ("sefkuchar", "Privátny šéfkuchár — večera o 4 chodoch", "Večer, keď nemusíte variť. Termín a stravovacie požiadavky dohodneme e-mailom.", "per_person", 6500, None),
    ("transfer", "Transfer z letiska Poprad-Tatry", "Cena za jednu cestu. Čas príletu dohodneme e-mailom.", "per_item", 9000, 2),
]):
    insert("services", id=uid("2", 101 + i), tenant_id=STROMY, property_id=P, key=key, name=sk(name),
           description=sk(desc), price_model=model, amount_cents=cents, max_quantity=maxq, sort=i)

highlight(P, [("sauna", "fínska, po lyžovačke aj po túre"), ("virivka", "vonkajšia, s výhľadom do doliny"),
              ("lyziaren", "na lyže a obuv"), ("kuchyna", "dve kuchyne pre celú partiu"),
              ("gril", "na terase"), ("parkovanie", "2 vyhradené miesta pri chalete")])
# Orientačné, ukážkové údaje — majiteľka ich upraví v administrácii.
places(P, STROMY, [("Jasná – lyžiarske stredisko", "skibus spod komplexu alebo autom", "≈ 10 min"),
                   ("Demänovské jaskyne", "autom", "≈ 5 km"),
                   ("Liptovský Mikuláš", "autom, obchody a reštaurácie", "≈ 7 km"),
                   ("Aquapark Tatralandia", "autom", "≈ 15 km"),
                   ("Liptovská Mara", "autom", "≈ 20 km")])
photo_categories(P, {"Chalet STRÖMY večer": "exterior", "Exteriér a okolie": "exterior",
                     "Obývačka, kuchyňa a jedáleň": "interior", "Spálňa": "bedrooms", "Kúpeľňa": "interior",
                     "Sauna": "wellness", "Vonkajšia vírivka": "wellness", "Stolovanie na terase": "exterior",
                     "Detail interiéru": "interior"})
sections(P, "whole", {
    "intro": {"kicker": sk("Demänovská dolina · komplex Tri Vody")},
    "highlights": {
        "title": sk("Wellness, hory a pokoj."), "subtitle": sk("Pre celú partiu."),
        "items": [
            {"amenity": "sauna", "title": sk("Fínska sauna"), "note": sk("Po lyžovačke aj po túre")},
            {"amenity": "virivka", "title": sk("Vonkajšia vírivka"), "note": sk("S výhľadom do doliny")},
            {"icon": "skibus", "title": sk("Skibus"), "note": sk("Zastavuje pod komplexom, pár minút na Jasnú")},
            {"amenity": "lyziaren", "note": sk("Na lyže a obuv")},
            {"icon": "terasa", "title": sk("Dve terasy"), "note": sk("Na raňajky aj na gril")},
            {"amenity": "parkovanie", "note": sk("2 vyhradené miesta pri chalete")},
        ],
    },
    "photo_band": {"photo": 22},
    "prices": {"kicker": sk("Cenník")},
    "cta": {"title": sk("Chalet je pripravený."), "subtitle": sk("Vyberte si termín."), "contactLabel": sk("Napísať Jane")},
})

for i, t in enumerate([
    ("Elizabeth Kohutova", "Toto miesto… nádherné! Skvelá lokalita a služby na vysokej úrovni. Strávili sme tu pár dní s rodinou a som veľmi nadšená! Určite sa vrátime."),
    ("Patricia Vittek", "Neviem si predstaviť lepšie miesto na oddych a vypnutie hlavy. Atmosféra hôr je jednoducho TOP!"),
    ("Eva Milistenferova", "S priateľmi sme si užili skvelé ubytovanie s kompletným vybavením. Určite sa sem radi vrátime."),
]):
    testimonial(100 + i, STROMY, P, t[0], t[1], featured=True)

insert("tenant_settings", conflict="(tenant_id)", tenant_id=STROMY, iban="SK3112000000198742637541",
       account_holder="Chalet STRÖMY (ukážka)", payment_due_hours=24, hold_minutes=30,
       cancellation_policy={"sk": "30 a viac dní pred nástupom: zdarma. 14 dní pred nástupom: 50 % z ceny. "
                                  "10 dní a menej pred nástupom alebo nedostavenie sa: 100 % z ceny."},
       arrival_email_days_before=3, owner_notification_email="info@obrazne.sk", vat_payer=False,
       website_url="https://www.chaletstromy.sk", contact_name="Jana", contact_phone="+421 905 109 393",
       whatsapp_phone="421905109393")

# ---------------------------------------------------------------------------------------------- Showroom (fictional)
SHOWROOM = [
    dict(n=1, slug="chalet-pod-smrekom", name="Chalet Pod Smrekom", type="chalet", region="liptov", guests=10, bedrooms=4,
         bathrooms=2, city="Liptovský Ján", lat=49.04, lng=19.68, pets=True, mode="whole", model="per_night",
         summary="Drevený chalet s krbom a saunou na okraji Jánskej doliny.",
         amen=["wifi", "parkovanie", "sauna", "krb", "gril", "kuchyna"], suit=["rodiny", "skupiny", "so-zvieratom"],
         seasons=[("Mimo sezóny", 0, True, 2, 32000, []), ("Zima", 10, False, 3, 42000, [("2000-12-20", "2000-03-15")]),
                  ("Leto", 10, False, 3, 38000, [("2000-07-01", "2000-08-31")])],
         units=[("Celý chalet", 10)]),
    dict(n=2, slug="horska-chata-lomnica", name="Horská chata Lomnica", type="chata", region="vysoke-tatry", guests=14,
         bedrooms=6, bathrooms=3, city="Tatranská Lomnica", lat=49.165, lng=20.28, pets=False, mode="whole", model="per_night",
         summary="Veľká chata pre partie a firemné výjazdy priamo pod Lomnickým štítom.",
         amen=["wifi", "parkovanie", "sauna", "lyziaren", "kuchyna", "tv"], suit=["skupiny", "lyziari", "firmy"],
         seasons=[("Celoročne", 0, True, 2, 45000, []), ("Zimná sezóna", 10, False, 4, 62000, [("2000-12-15", "2000-03-31")])],
         units=[("Celá chata", 14)]),
    dict(n=3, slug="vila-slnecna", name="Vila Slnečná", type="vila", region="male-karpaty", guests=8, bedrooms=4,
         bathrooms=3, city="Modra", lat=48.333, lng=17.307, pets=True, mode="whole", model="per_night",
         summary="Vila s bazénom medzi vinicami Malých Karpát, 30 minút od Bratislavy.",
         amen=["wifi", "parkovanie", "bazen", "gril", "klimatizacia", "kuchyna"], suit=["rodiny", "pary", "so-zvieratom"],
         seasons=[("Celoročne", 0, True, 2, 28000, []), ("Leto", 10, False, 5, 39000, [("2000-06-15", "2000-09-10")])],
         units=[("Celá vila", 8)]),
    dict(n=4, slug="apartmany-panorama", name="Apartmány Panorama", type="apartmany", region="vysoke-tatry", guests=16,
         bedrooms=8, bathrooms=4, city="Starý Smokovec", lat=49.139, lng=20.22, pets=False, mode="units", model="per_night",
         summary="Štyri apartmány s výhľadom na štíty, každý s vlastnou kuchynkou.",
         amen=["wifi", "parkovanie", "kuchyna", "tv", "lyziaren"], suit=["rodiny", "pary", "lyziari"],
         seasons=[("Celoročne", 0, True, 2, 11000, []), ("Zima", 10, False, 3, 15000, [("2000-12-20", "2000-03-15")])],
         units=[("Apartmán Gerlach", 4), ("Apartmán Kriváň", 4), ("Apartmán Lomnica", 4), ("Apartmán Rysy", 4)]),
    dict(n=5, slug="penzion-u-haja", name="Penzión U Hája", type="penzion", region="orava", guests=16, bedrooms=6,
         bathrooms=6, city="Zuberec", lat=49.26, lng=19.61, pets=True, mode="units", model="per_person_night",
         summary="Rodinný penzión so šiestimi izbami a domácimi raňajkami pod Roháčmi.",
         amen=["wifi", "parkovanie", "ranajky", "gril"], suit=["rodiny", "pary", "so-zvieratom"],
         seasons=[("Celoročne", 0, True, 1, 2500, []), ("Leto a zima", 10, False, 2, 3200,
                                                             [("2000-07-01", "2000-08-31"), ("2000-12-20", "2000-03-15")])],
         units=[("Izba 1", 2), ("Izba 2", 2), ("Izba 3", 3), ("Izba 4", 3), ("Izba 5", 3), ("Izba 6", 3)]),
    dict(n=6, slug="glamping-luka", name="Glamping Lúka", type="glamping", region="pieniny", guests=9, bedrooms=3,
         bathrooms=1, city="Červený Kláštor", lat=49.39, lng=20.42, pets=False, mode="units", model="per_night",
         summary="Tri safari stany na lúke nad Dunajcom, len v lete.",
         amen=["wifi", "parkovanie", "gril"], suit=["pary", "rodiny"],
         seasons=[("Sezóna", 0, True, 2, 9000, [])],
         units=[("Stan Dunajec", 3), ("Stan Tri koruny", 3), ("Stan Lesnica", 3)]),
]

# Showroom templates follow the property type (whole / apartments / rooms / glamping) — the difference is visible.
SHOWROOM_SECTIONS = {
    "glamping-luka": {
        "intro": {"kicker": sk("Pieniny · lúka nad Dunajcom")},
        "location": {"text": sk("Pltníci, cyklotrasa popri Dunajci a Prielom Dunajca sú na dosah pešo. Obchod je v Červenom Kláštore.")},
        "faq": {"items": [
            {"q": sk("Je v stanoch elektrina?"), "a": sk("Áno, zásuvky aj osvetlenie. Kúpeľňa so sprchou je v drevenom domčeku pri stanoch.")},
            {"q": sk("Čo ak bude pršať?"), "a": sk("Stany sú na drevených podlahách a majú prístrešok s posedením.")},
        ]},
    },
    "penzion-u-haja": {
        "location": {"text": sk("Pod Roháčmi, desať minút autom od Oravskej priehrady. Ráno vás privíta domáca kuchyňa.")},
    },
    "apartmany-panorama": {
        "location": {"text": sk("Pár krokov od zubačky a turistických chodníkov do Studenej doliny.")},
    },
}

for prop in SHOWROOM:
    n = prop["n"]
    pid = uid("b", n)
    property_row(
        id=pid, tenant_id=UKAZKA, slug=prop["slug"], name=prop["name"], status="published",
        booking_mode=prop["mode"], pricing_model=prop["model"], summary=sk(prop["summary"]),
        description=sk(prop["summary"] + " Ukážkový objekt platformy — údaje sú vymyslené."),
        included=sk("Posteľná bielizeň, uteráky, energie, Wi-Fi a parkovanie."),
        city=prop["city"], country="SK", latitude=prop["lat"], longitude=prop["lng"], max_guests=prop["guests"],
        bedrooms=prop["bedrooms"], bathrooms=prop["bathrooms"], pets_allowed=prop["pets"], tourist_tax_included=False,
        tourist_tax_cents=150, sort=n,
    )
    term_links(pid, UKAZKA, [("property_type", prop["type"]), ("region", prop["region"])]
               + [("amenity", a) for a in prop["amen"]] + [("suitable_for", s) for s in prop["suit"]])
    sections(pid, None, SHOWROOM_SECTIONS.get(prop["slug"]))
    highlight(pid, [(a, "") for a in prop["amen"][:6] if len(prop["amen"]) >= 3][: (len(prop["amen"]) // 3) * 3])
    if prop["slug"] == "vila-slnecna":
        out.append(f"update public.properties set location_mode = 'exact', street = 'Vinohradnícka 12' where id = {q(pid)};")
    places(pid, UKAZKA, [(f"Centrum – {prop['city']}", "pešo", "≈ 1 km"), ("Najbližší obchod", "autom", "≈ 3 km"),
                         ("Turistický chodník", "pešo od objektu", "≈ 300 m")])
    testimonial(n * 10, UKAZKA, pid, "Mária K.", f"{prop['name']} nás príjemne prekvapil. Ukážková referencia showroomu.",
                source="google", featured=n <= 2)
    unit_ids = []
    for j, (uname, cap) in enumerate(prop["units"]):
        unit_id = uid("c", n * 10 + j)
        unit_ids.append(unit_id)
        insert("units", id=unit_id, tenant_id=UKAZKA, property_id=pid, name=uname, max_guests=cap,
               is_default=prop["mode"] == "whole", sort=j)
    for k, (sname, prio, default, min_n, rate, ranges) in enumerate(prop["seasons"]):
        sid = uid("d", n * 10 + k)
        insert("seasons", id=sid, tenant_id=UKAZKA, property_id=pid, name=sk(sname), priority=prio, is_default=default,
               min_nights=min_n, sort=k)
        for r, (a, b) in enumerate(ranges):
            insert("season_ranges", id=uid("e", n * 100 + k * 10 + r), tenant_id=UKAZKA, season_id=sid, start_date=a,
                   end_date=b, repeat_yearly=True)
        for unit_id in unit_ids:
            insert("rates", conflict="(unit_id, season_id)", tenant_id=UKAZKA, unit_id=unit_id, season_id=sid,
                   amount_cents=rate)
    insert("fees", id=uid("f", n), tenant_id=UKAZKA, property_id=pid, key="cleaning", name=sk("Záverečné upratovanie"),
           kind="automatic", price_model="per_stay", amount_cents=4000 if prop["mode"] == "whole" else 2000)
    insert("discounts", id=uid("1", n), tenant_id=UKAZKA, property_id=pid, kind="length_of_stay",
           name=sk("Zľava od 7 nocí"), percent_bp=800, min_nights=7)

insert("services", id=uid("2", 1), tenant_id=UKAZKA, property_id=None, key="ranajky", name=sk("Raňajky"),
       description=sk("Raňajky formou bufetu alebo košíka do apartmánu."), price_model="per_person_night",
       amount_cents=1200, sort=0)
insert("services", id=uid("2", 2), tenant_id=UKAZKA, property_id=None, key="pozicovna", name=sk("Požičanie bicyklov"),
       description=sk("Horské bicykle na celý pobyt."), price_model="per_item", amount_cents=2500, max_quantity=6, sort=1)
insert("tenant_settings", conflict="(tenant_id)", tenant_id=UKAZKA, iban="SK3112000000198742637541",
       account_holder="Ukážkový klient", payment_due_hours=24, hold_minutes=30,
       cancellation_policy=sk("Do 14 dní pred príchodom zdarma, potom 50 % z ceny."),
       arrival_email_days_before=3, owner_notification_email="info@obrazne.sk")

header = "-- Generated by scripts/gen-seed-domain.py — do not edit by hand.\n-- Catalogue terms, Chalet STRÖMY (real data) and the showroom (fictional). Idempotent.\n\n"
Path(__file__).resolve().parent.parent.joinpath("supabase", "seed-domain.sql").write_text(
    header + "\n".join(out) + "\n", encoding="utf-8", newline="\n"
)
print(f"{len(out)} statements")
