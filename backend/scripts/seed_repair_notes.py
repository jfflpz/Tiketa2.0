import asyncio

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import encrypt
from app.db.session import AsyncSessionLocal
from app.models import RepairNote, RepairNoteStep, TaskCategory, User

SEED_REPAIR_NOTES = [
    {
        "title": "Thermal Receipt Printer Cutter Jam & Red Error LED Fix",
        "task_code": "PRN-TS",
        "author_role": "it",
        "symptom_and_fix": (
            "Epson TM-T82 / booth thermal printer red error LED blinking and auto-cutter "
            "blade stuck mid-cut. Clear paper path, rotate cutter gear knob manually, "
            "clean thermal head with isopropyl alcohol, and print Windows self-test page."
        ),
        "steps": [
            "Power off thermal printer and open top receipt cover release latch",
            "Manually rotate auto-cutter emergency gear wheel to retract stuck blade",
            "Clear shredded thermal paper from platen roller and optical sensor",
            "Clean thermal printhead with 99% isopropyl swab and reload 80mm roll",
            "Hold FEED button while powering on to verify hardware self-test print",
        ],
    },
    {
        "title": "POS Ticketing App SQLite Database Lock & Session Reset",
        "task_code": "SW-ASST",
        "author_role": "it",
        "symptom_and_fix": (
            'Waybill & booth POS application frozen on "Database Locked (Error 5)" during '
            "peak dispatch. Connect via AnyDesk, terminate orphaned POS background process, "
            "clear stale .wal/.shm lock files, and verify SQL sync with central server."
        ),
        "steps": [
            "Connect to booth workstation via AnyDesk and inspect Task Manager",
            "End hung FiveStarPOS.exe background process tree",
            "Backup local C:\\FiveStarPOS\\data\\waybill.db before clearing .db-wal lock",
            "Relaunch POS as Administrator and test waybill sync to Pasay HQ",
        ],
    },
    {
        "title": "Fuel Telemetry VLAN Gateway & Terminal MikroTik Packet Drop",
        "task_code": "NET-CFG",
        "author_role": "it",
        "symptom_and_fix": (
            "Fuel pump controller losing ping to central database server due to ARP table "
            "overflow or oxidized RJ45 port on terminal switch. Re-seat patch cord on VLAN "
            "20 port, flush ARP cache on MikroTik router, and run 100-packet ping test."
        ),
        "steps": [
            "Ping terminal gateway (192.168.20.1) and fuel controller static IP",
            "Inspect physical CAT6 patch cable and switch port LEDs in server rack",
            "Log into MikroTik WinBox and flush stale ARP entry for pump controller",
            "Verify <2ms latency and 0% packet loss over 100 continuous pings",
        ],
    },
    {
        "title": "Cashier PC POST 3 Short Beeps — DDR3/DDR4 RAM & CMOS Swap",
        "task_code": "PC-HW-REP",
        "author_role": "admin",
        "symptom_and_fix": (
            "Workstation fails to boot with 3 short AMI BIOS beeps (memory seated error) "
            "or CMOS date reset. Clean DIMM gold contacts with eraser, reseat in Channel A1, "
            "replace CR2032 battery, and configure BIOS AHCI boot order."
        ),
        "steps": [
            "Disconnect AC power from AVR/UPS and discharge motherboard flea power",
            "Remove RAM module, clean gold contacts, and reseat firmly into DIMM slot",
            "Replace motherboard CR2032 CMOS coin battery if voltage is below 2.8V",
            "Enter BIOS setup, set correct date/time, and verify SSD boot priority",
        ],
    },
    {
        "title": "Terminal NVR CCTV Offline & APC UPS Battery Replace SOP",
        "task_code": "SRV-ASSESS",
        "author_role": "it",
        "symptom_and_fix": (
            "Hikvision 16-ch NVR beeping continuously or APC 1500VA UPS showing red Replace "
            "Battery LED. Check PoE switch uplink, inspect SATA surveillance HDD health in "
            "SMART menu, and hot-swap 12V 9Ah sealed lead-acid battery pack."
        ),
        "steps": [
            "Check Hikvision NVR local monitor for HDD S.M.A.R.T. error or IP conflict",
            "Verify PoE switch uplink port to terminal departure bay cameras",
            "Measure UPS battery terminal voltage under load and swap 12V 9Ah SLA pack",
            "Confirm all 16 camera feeds are recording with green status icons",
        ],
    },
    {
        "title": "Preventive Maintenance Service (PMS) Quarterly PC Checklist",
        "task_code": "PC-PMS",
        "author_role": "it",
        "symptom_and_fix": (
            "Scheduled quarterly preventative maintenance for terminal dispatch units. Clean "
            "internal chassis fans with compressed air, re-apply thermal paste if CPU > 75C, "
            "run disk health diagnostic, scan for malware, and verify Antivirus signatures."
        ),
        "steps": [
            "Inspect physical casing, power cables, and dust filters",
            "Blow out CPU heatsink and PSU fan using compressed air",
            "Check SSD health with CrystalDiskInfo (verify 0 bad sectors)",
            "Update Windows Defender definitions and execute quick scan",
            "Verify local printer and terminal network connectivity",
        ],
    },
]


async def seed_repair_notes(session: AsyncSession | None = None) -> list[RepairNote]:
    """Idempotently seed standard terminal repair notes and SOP checklists."""
    if session is not None:
        return await _seed_repair_notes_impl(session)

    async with AsyncSessionLocal() as new_session:
        async with new_session.begin():
            return await _seed_repair_notes_impl(new_session)


async def _seed_repair_notes_impl(session: AsyncSession) -> list[RepairNote]:
    # Resolve IT technician and Admin authors
    it_user = (
        await session.scalar(select(User).where(User.username == "technician"))
        or await session.scalar(
            select(User).where(User.email == "technician@fivestar.com.ph")
        )
        or await session.scalar(select(User).where(User.role == "it", User.is_active))
    )
    admin_user = (
        await session.scalar(select(User).where(User.username == "admin"))
        or await session.scalar(
            select(User).where(User.email == "admin@fivestar.com.ph")
        )
        or await session.scalar(
            select(User).where(User.role == "admin", User.is_active)
        )
    )

    if not it_user and not admin_user:
        raise RuntimeError(
            "Cannot seed repair notes: No active IT or Admin user found."
        )

    fallback_user = it_user or admin_user
    seeded_notes: list[RepairNote] = []

    for item in SEED_REPAIR_NOTES:
        author = (
            admin_user
            if item.get("author_role") == "admin" and admin_user
            else (it_user or fallback_user)
        )

        # Verify task category exists
        task = await session.scalar(
            select(TaskCategory).where(TaskCategory.code == item["task_code"])
        )
        if not task:
            continue

        existing = await session.scalar(
            select(RepairNote).where(RepairNote.title == item["title"])
        )

        if existing:
            existing.task_code = item["task_code"]
            existing.symptom_and_fix_enc = encrypt(item["symptom_and_fix"])
            existing.updated_by_id = author.id
            await session.flush()

            # Re-sync steps
            existing_steps = (
                await session.scalars(
                    select(RepairNoteStep)
                    .where(RepairNoteStep.repair_note_id == existing.id)
                    .order_by(RepairNoteStep.position)
                )
            ).all()
            for s in existing_steps:
                await session.delete(s)
            await session.flush()

            for pos, step_text in enumerate(item["steps"]):
                step = RepairNoteStep(
                    repair_note_id=existing.id,
                    position=pos,
                    text_enc=encrypt(step_text),
                )
                session.add(step)

            seeded_notes.append(existing)
        else:
            note = RepairNote(
                title=item["title"],
                task_code=item["task_code"],
                symptom_and_fix_enc=encrypt(item["symptom_and_fix"]),
                author_id=author.id,
                updated_by_id=author.id,
                revision=1,
            )
            session.add(note)
            await session.flush()

            for pos, step_text in enumerate(item["steps"]):
                step = RepairNoteStep(
                    repair_note_id=note.id,
                    position=pos,
                    text_enc=encrypt(step_text),
                )
                session.add(step)

            seeded_notes.append(note)

    await session.flush()
    return seeded_notes


def main() -> None:
    asyncio.run(seed_repair_notes())


if __name__ == "__main__":
    main()
