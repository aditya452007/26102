"""Pure port of `admin-dashboard/src/lib/mplads-mock.ts` — NO I/O, NO clock.

Produces the demo dataset as plain dicts with camelCase keys (the fixture/contract
shape). Call order inside each rng stream is load-bearing (seed-generator.md);
the parity test compares this output key-for-key with the TS fixture.
"""

from datetime import date, timedelta

from app.seed.rng import format_work_date, mulberry32, one_decimal, rand_int, shuffled

MPLADS_SEED = 26102
DEMO_TODAY_ISO = "2026-09-07"
DEMO_TODAY = date(2026, 9, 7)
FLAGSHIP_WORK_ID = "W-1014"

WORK_TYPES = ["road", "community-hall", "water", "school", "drainage", "streetlight"]
DEPARTMENTS = ["PWD", "Water Board", "Municipal Corp", "Rural Works"]

# (state, district, lat, lon) — order matters (round-robin assignment)
DISTRICTS = [
    ("Madhya Pradesh", "Bhopal", 23.26, 77.41),
    ("Madhya Pradesh", "Indore", 22.72, 75.86),
    ("Rajasthan", "Jaipur", 26.91, 75.79),
    ("Rajasthan", "Udaipur", 24.58, 73.68),
    ("Bihar", "Patna", 25.59, 85.14),
    ("Bihar", "Gaya", 24.79, 85.0),
    ("Odisha", "Cuttack", 20.46, 85.88),
    ("Odisha", "Sambalpur", 21.47, 83.97),
    ("Karnataka", "Bengaluru Urban", 12.97, 77.59),
    ("Karnataka", "Mysuru", 12.3, 76.65),
    ("Assam", "Kamrup", 26.18, 91.75),
    ("Assam", "Dibrugarh", 27.47, 94.91),
]

FLAG_PLAN = [
    ("cost", "high"), ("cost", "high"), ("duplicate", "high"),
    ("delay", "high"), ("expenditure", "high"), ("delay", "medium"),
    ("delay", "medium"), ("utilisation", "medium"), ("cost", "medium"),
    ("expenditure", "low"), ("delay", "low"), ("utilisation", "low"),
]

MPLADS_KPIS = {
    "totalWorks": 12482,
    "underExecution": 4821,
    "delayed": 386,
    "highRisk": 73,
    "overrunExposureLakh": 41,
}


def format_lakh(lakh: float) -> str:
    """TS formatLakh: `₹58.9L`."""
    return f"₹{lakh:.1f}L"


def compare_sentence(actual: float, median: float, peer_n: int, wtype: str, district: str) -> str:
    """The canonical compare sentence, verbatim from mplads-mock.ts."""
    return (
        f"{format_lakh(actual)} vs {format_lakh(median)} median across "
        f"{peer_n} similar {wtype} works in {district}"
    )


def _title_for(wtype: str, n: int) -> str:
    return {
        "road": f"BT Road Renewal — Rural Stretch {n}",
        "community-hall": f"Community Hall — Ward Block {n}",
        "water": f"Piped Water Extension — Zone {n}",
        "school": f"School Classroom Block — Phase {n}",
        "drainage": f"Storm Drain — Sector {n}",
        "streetlight": f"Streetlight Cluster — Phase {n}",
    }[wtype]


def _agency_for(rng) -> str:
    if rng() < 0.5:
        return f"Contractor-{rand_int(rng, 1, 12):02d}"
    return f"Agency-East-{rand_int(rng, 1, 4)}"


def _progress_for(rng, status: str) -> int:
    if status == "completed":
        return 100
    if status == "sanctioned":
        return rand_int(rng, 0, 5)
    if status == "in-execution":
        return rand_int(rng, 15, 85)
    return rand_int(rng, 10, 70)  # stalled


def _spend_ratio_for(rng, status: str) -> float:
    if status == "completed":
        return 0.95 + rng() * 0.05
    if status == "sanctioned":
        return rng() * 0.1
    return 0.2 + rng() * 0.65  # in-execution / stalled


def _last_update_for(rng, status: str) -> date:
    if status == "stalled":
        days = rand_int(rng, 91, 180)
    elif status == "in-execution":
        days = rand_int(rng, 2, 30)
    else:
        days = rand_int(rng, 5, 120)  # completed / sanctioned
    return DEMO_TODAY - timedelta(days=days)


def _stall_label(last_update: date) -> str:
    return f"{(DEMO_TODAY - last_update).days}d ago"


def build_works() -> list[dict]:
    rng = mulberry32(MPLADS_SEED)
    extra_rng = mulberry32(MPLADS_SEED + 500)

    # Pre-loop status shuffle: 18 + 7 + 7 + 7 = 39 items → 38 draws
    rest_statuses = shuffled(
        rng,
        ["in-execution"] * 18 + ["stalled"] * 7 + ["completed"] * 7 + ["sanctioned"] * 7,
    )
    status_cursor = 0
    works: list[dict] = []

    for index in range(40):
        work_id = f"W-{1001 + index}"
        place = DISTRICTS[index % 12]
        is_flagship = work_id == FLAGSHIP_WORK_ID

        if is_flagship:
            wtype = "community-hall"
            status = "stalled"
            title = "Community Hall — Ward Block 7"
            agency = "Contractor-07"
            sanctioned = 58.9
            progress = 62
            expenditure = 41.2
            sanction_date = date(2024, 11, 20)
            due_date = date(2025, 10, 15)
            last_update = DEMO_TODAY - timedelta(days=96)
            district = "Bhopal"
            tender_holder = "Contractor-07"
            department = "PWD"
            labour = 42
            demanded_days = 330
            returned = 0.0
        else:
            wtype = WORK_TYPES[rand_int(rng, 0, len(WORK_TYPES) - 1)]
            status = rest_statuses[status_cursor]
            status_cursor += 1
            title = _title_for(wtype, rand_int(rng, 1, 24))
            agency = _agency_for(rng)
            sanctioned = one_decimal(4 + rng() * 86)
            progress = _progress_for(rng, status)
            expenditure = one_decimal(sanctioned * _spend_ratio_for(rng, status))
            sanction_date = date(2023, 4, 1) + timedelta(days=rand_int(rng, 0, 820))
            due_date = sanction_date + timedelta(days=270 + rand_int(rng, 0, 270))
            last_update = _last_update_for(rng, status)
            district = place[1]
            tender_holder = agency
            department = DEPARTMENTS[rand_int(extra_rng, 0, len(DEPARTMENTS) - 1)]
            labour = rand_int(extra_rng, 8, 60)
            demanded_days = rand_int(extra_rng, 180, 540)
            returned = 0.0
            if extra_rng() >= 0.7:  # flagship never reaches this draw (short-circuit in TS)
                headroom = max(sanctioned - expenditure, 0.0)
                returned = one_decimal(min(extra_rng() * min(5, sanctioned * 0.15), headroom))

        lat = one_decimal((23.26 if is_flagship else place[2]) + (rng() - 0.5) * 0.2)
        lon = one_decimal((77.41 if is_flagship else place[3]) + (rng() - 0.5) * 0.2)

        works.append({
            "id": work_id,
            "title": title,
            "type": wtype,
            "state": place[0],
            "district": district,
            "agency": agency,
            "status": status,
            "sanctionedLakh": sanctioned,
            "expenditureLakh": expenditure,
            "progressPct": progress,
            "sanctionDate": sanction_date.isoformat(),
            "dueDate": due_date.isoformat(),
            "lastUpdate": last_update.isoformat(),
            "lat": lat,
            "lon": lon,
            "tenderHolder": tender_holder,
            "tenderAwardedBy": f"District Authority, {district}",
            "department": department,
            "labourDeployed": labour,
            "demandedDays": demanded_days,
            "returnedLakh": returned,
        })
    return works


def build_anomaly(work: dict, kind: str, severity: str, index: int, works: list[dict]) -> dict:
    rng = mulberry32(MPLADS_SEED + index * 101)
    is_flagship = work["id"] == FLAGSHIP_WORK_ID
    peer_n = 18 if is_flagship else rand_int(rng, 8, 18)
    anomaly_id = f"A-{index + 1}"
    base = {
        "id": anomaly_id,
        "workId": work["id"],
        "kind": kind,
        "severity": severity,
        "peerN": peer_n,
        "peerMedianLakh": None,
        "actualLakh": None,
        "unit": "₹L",
    }

    if kind == "delay":
        days = (DEMO_TODAY - date.fromisoformat(work["lastUpdate"])).days
        due = date.fromisoformat(work["dueDate"])
        base |= {
            "headline": f"No progress update in {days}d — needs review",
            "corroboration": (
                f"Last field update was {_stall_label(date.fromisoformat(work['lastUpdate']))} "
                f"against a {format_work_date(due)} due date."
            ),
            "signals": [
                {"label": "Stall duration", "value": f"{days}d without update (review threshold 90d)"},
                {"label": "Due date", "value": f"{format_work_date(due)} at {work['progressPct']}% progress"},
            ],
        }
        return base

    if kind == "duplicate":
        twin = next(
            (w for w in works
             if w["id"] != work["id"] and w["district"] == work["district"] and w["type"] == work["type"]),
            None,
        )
        base |= {
            "headline": f"Possible overlapping scope with a nearby {work['type']} work — needs review",
            "actualLakh": work["sanctionedLakh"],
            "corroboration": (
                f"Same type and district as {twin['id']} ({twin['title']}); site extents need a joint review."
                if twin else
                "Same type and district as another sanctioned work; site extents need a joint review."
            ),
            "signals": [
                {
                    "label": "Near-duplicate",
                    "value": (
                        f"{twin['id']} — {twin['title']} in {twin['district']}"
                        if twin else "Matched on type + district + sanction window"
                    ),
                },
                {"label": "Sanctioned cost", "value": format_lakh(work["sanctionedLakh"])},
            ],
        }
        return base

    if kind == "expenditure":
        ratio = 1.6 + rng() * 0.6 if severity == "high" else 1.2 + rng() * 0.2
        peer_median = one_decimal(work["expenditureLakh"] / ratio)
        base |= {
            "headline": "Front-loaded spending pattern — needs review",
            "peerMedianLakh": peer_median,
            "actualLakh": work["expenditureLakh"],
            "corroboration": f"Released {format_lakh(work['expenditureLakh'])} against {work['progressPct']}% physical progress.",
            "signals": [
                {"label": "Peer comparison", "value": compare_sentence(
                    work["expenditureLakh"], peer_median, peer_n, work["type"], work["district"])},
                {"label": "Progress vs spend",
                 "value": f"{work['progressPct']}% progress at {format_lakh(work['expenditureLakh'])} released"},
            ],
        }
        return base

    if kind == "utilisation":
        peer_median = one_decimal(work["sanctionedLakh"] * (0.55 + rng() * 0.2))
        base |= {
            "headline": "Low fund utilisation with utilisation certificate pending — needs review",
            "peerMedianLakh": peer_median,
            "actualLakh": work["expenditureLakh"],
            "corroboration": "Utilisation certificate for the last released tranche is still awaited from the agency.",
            "signals": [
                {"label": "Peer comparison", "value": compare_sentence(
                    work["expenditureLakh"], peer_median, peer_n, work["type"], work["district"])},
                {"label": "Certificate status", "value": "UC pending for last tranche"},
            ],
        }
        return base

    # cost
    if is_flagship:
        ratio = 58.9 / 24.6
        peer_median = 24.6
    else:
        ratio = 2.0 + rng() * 0.6 if severity == "high" else 1.4 + rng() * 0.5
        peer_median = one_decimal(work["sanctionedLakh"] / ratio)
    base |= {
        "headline": (
            "Sanctioned cost 2.4× peer median with a 96d stall — needs review"
            if is_flagship else "Sanctioned cost above peer median — needs review"
        ),
        "peerMedianLakh": peer_median,
        "actualLakh": work["sanctionedLakh"],
        "corroboration": (
            "Single-estimate sanction plus a 96-day stall corroborates the cost variance."
            if is_flagship else
            "Single-estimate sanction with limited comparative quotes corroborates the variance."
        ),
        "signals": [
            {"label": "Peer comparison", "value": compare_sentence(
                work["sanctionedLakh"], peer_median, peer_n, work["type"], work["district"])},
            {"label": "Corroborating signal",
             "value": f"96d stall — last update {_stall_label(date.fromisoformat(work['lastUpdate']))}"
                      if is_flagship else "Estimate variance beyond peer band"},
        ],
    }
    return base


def build_anomalies(works: list[dict]) -> list[dict]:
    rng = mulberry32(MPLADS_SEED + 7)
    flagship = next(w for w in works if w["id"] == FLAGSHIP_WORK_ID)
    candidates = shuffled(
        rng,
        [w for w in works
         if w["id"] != FLAGSHIP_WORK_ID and w["status"] in ("in-execution", "stalled")],
    )
    flagged = [flagship, *candidates[: len(FLAG_PLAN) - 1]]
    return [
        build_anomaly(work, kind, severity, index, works)
        for index, (work, (kind, severity)) in enumerate(zip(flagged, FLAG_PLAN, strict=True))
    ]


def build_evidences(anomalies: list[dict]) -> list[dict]:
    rng = mulberry32(MPLADS_SEED + 21)
    files = [
        ("photo", "Site photo — foundation stage"),
        ("report", "Measurement sheet MB-3"),
        ("doc", "Completion certificate (draft)"),
        ("photo", "Geo-tagged photo — slab stage"),
        ("doc", "Utilisation certificate UC-2"),
        ("report", "Estimate comparative sheet"),
    ]
    out = []
    for index, (kind, name) in enumerate(files):
        size_kb = rand_int(rng, 180, 4200)
        days_ago = rand_int(rng, 1, 40)
        out.append({
            "id": f"E-{index + 1}",
            "workId": anomalies[index % len(anomalies)]["workId"],
            "kind": kind,
            "name": name,
            "sizeKb": size_kb,
            "uploadedAt": f"{(DEMO_TODAY - timedelta(days=days_ago)).isoformat()}T10:00:00.000Z",
            "by": "Field Engineer (demo)" if index % 2 == 0 else "District Office (demo)",
        })
    return out


def build_activities(anomalies: list[dict]) -> list[dict]:
    activities: list[dict] = []
    counter = 1
    for index, anomaly in enumerate(anomalies):
        note_count = 2 if index == 0 else 1 if index < 8 else 0
        activities.append({
            "id": f"T-{counter}",
            "workId": anomaly["workId"],
            "at": f"{(DEMO_TODAY - timedelta(days=2)).isoformat()}T09:00:00.000Z",
            "actor": "NIRIKSHAN engine (demo)",
            "action": "Flag raised — needs review",
            "note": anomaly["headline"],
        })
        counter += 1
        activities.append({
            "id": f"T-{counter}",
            "workId": anomaly["workId"],
            "at": f"{(DEMO_TODAY - timedelta(days=1)).isoformat()}T11:30:00.000Z",
            "actor": "District Office (demo)",
            "action": "Evidence linked for review",
        })
        counter += 1
        if note_count >= 1:
            activities.append({
                "id": f"T-{counter}",
                "workId": anomaly["workId"],
                "at": f"{DEMO_TODAY_ISO}T08:15:00.000Z",
                "actor": "District Officer (demo)",
                "action": "Review note recorded",
                "note": "Field verification scheduled — needs review before next release.",
            })
            counter += 1
        if note_count == 2:
            activities.append({
                "id": f"T-{counter}",
                "workId": anomaly["workId"],
                "at": f"{DEMO_TODAY_ISO}T09:45:00.000Z",
                "actor": "District Officer (demo)",
                "action": "Queued for state nodal review (demo)",
            })
            counter += 1
    return activities


def build_geo_rollup(works: list[dict], anomalies: list[dict]) -> list[dict]:
    """Port of buildGeoRollup — `delayed` = stalled count + overdue in-execution works."""
    high_ids = {a["workId"] for a in anomalies if a["severity"] == "high"}
    by_state: dict[str, dict] = {}
    for work in works:
        entry = by_state.setdefault(
            work["state"],
            {"state": work["state"], "works": 0, "high": 0, "delayed": 0, "stalled": 0},
        )
        entry["works"] += 1
        if work["id"] in high_ids:
            entry["high"] += 1
        if work["status"] == "stalled":
            entry["stalled"] += 1
            entry["delayed"] += 1
        elif work["status"] == "in-execution" and work["dueDate"] < DEMO_TODAY_ISO:
            entry["delayed"] += 1
    return sorted(by_state.values(), key=lambda e: e["state"])


def build_officers() -> list[dict]:
    """Backend-only demo officers (no rng) — passwords hashed at insert time."""
    return [
        {"email": "ministry@demo.gov.in", "password": "demo1234", "full_name": "Ministry Officer (demo)",
         "role": "ministry", "stateScope": None, "districtScope": None},
        {"email": "state-mp@demo.gov.in", "password": "demo1234", "full_name": "State Officer — MP (demo)",
         "role": "state", "stateScope": "Madhya Pradesh", "districtScope": None},
        {"email": "district-bhopal@demo.gov.in", "password": "demo1234", "full_name": "District Officer — Bhopal (demo)",
         "role": "district", "stateScope": None, "districtScope": "Bhopal"},
    ]


def build_demo_dataset() -> dict:
    works = build_works()
    anomalies = build_anomalies(works)
    return {
        "works": works,
        "anomalies": anomalies,
        "evidences": build_evidences(anomalies),
        "activities": build_activities(anomalies),
        "geoRollup": build_geo_rollup(works, anomalies),
        "kpis": MPLADS_KPIS,
        "officers": build_officers(),
    }
