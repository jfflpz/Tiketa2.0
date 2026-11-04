import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy import select

from app.db.session import AsyncSessionLocal
from app.models import RepairNote, User


@pytest.mark.asyncio
async def test_repair_notes_crud_and_search(client: AsyncClient, accounts):
    tech_headers = accounts["tech"]
    admin_headers = accounts["admin"]
    tech2_headers = accounts["tech2"]

    # 1. Create a Repair Note as tech
    create_payload = {
        "title": "Thermal Receipt Printer Cutter Jam & Blade Reset",
        "task_code": "PRN-TS",
        "symptom_and_fix": "Cutter blade jammed mid-cut. Open cover, rotate emergency gear, swab with isopropyl.",
        "steps": [
            "Power off thermal printer",
            "Manually rotate cutter wheel",
            "Clean thermal printhead with alcohol swab",
        ],
    }
    res = await client.post(
        "/api/v1/repair-notes", json=create_payload, headers=tech_headers
    )
    assert res.status_code == 201, res.text
    note = res.json()
    note_id = note["id"]
    assert note["title"] == create_payload["title"]
    assert note["task_code"] == "PRN-TS"
    assert note["task_name"] == "Printer Troubleshoot"
    assert note["symptom_and_fix"] == create_payload["symptom_and_fix"]
    assert len(note["steps"]) == 3
    assert note["revision"] == 1
    assert note["can_edit"] is True

    # Check persistence in DB
    async with AsyncSessionLocal() as db:
        db_note = await db.get(RepairNote, uuid.UUID(note_id))
        assert db_note is not None
        # Encrypted field is not plaintext
        assert db_note.symptom_and_fix_enc != create_payload["symptom_and_fix"]

    # 2. Tech2 cannot edit or delete tech's guide (403)
    update_payload = {
        "expected_revision": 1,
        "title": "Unauthorized Modification Attempt",
    }
    res_tech2_edit = await client.patch(
        f"/api/v1/repair-notes/{note_id}", json=update_payload, headers=tech2_headers
    )
    assert res_tech2_edit.status_code == 403

    res_tech2_del = await client.delete(
        f"/api/v1/repair-notes/{note_id}?expected_revision=1", headers=tech2_headers
    )
    assert res_tech2_del.status_code == 403

    # 3. Optimistic locking on update (stale revision yields 409)
    res_stale = await client.patch(
        f"/api/v1/repair-notes/{note_id}",
        json={"expected_revision": 99, "title": "New Title"},
        headers=tech_headers,
    )
    assert res_stale.status_code == 409

    # 4. Valid update by author
    res_update = await client.patch(
        f"/api/v1/repair-notes/{note_id}",
        json={
            "expected_revision": 1,
            "title": "Thermal Printer Jam & Motor Service",
            "steps": [
                "Power off thermal printer",
                "Manually rotate cutter wheel",
                "Check motor voltage",
            ],
        },
        headers=tech_headers,
    )
    assert res_update.status_code == 200
    updated_note = res_update.json()
    assert updated_note["revision"] == 2
    assert updated_note["title"] == "Thermal Printer Jam & Motor Service"
    assert len(updated_note["steps"]) == 3

    # 5. Hybrid search across title, decrypted body, and decrypted steps
    # Search by word in body: 'isopropyl' was updated, now 'motor' is in steps
    res_search_motor = await client.get(
        "/api/v1/repair-notes?q=motor", headers=tech_headers
    )
    assert res_search_motor.status_code == 200
    assert res_search_motor.json()["total"] >= 1
    assert any(n["id"] == note_id for n in res_search_motor.json()["items"])

    # Search by word in body: 'blade'
    res_search_blade = await client.get(
        "/api/v1/repair-notes?q=blade", headers=tech_headers
    )
    assert res_search_blade.status_code == 200
    assert any(n["id"] == note_id for n in res_search_blade.json()["items"])

    # Non-matching search
    res_search_none = await client.get(
        "/api/v1/repair-notes?q=nonexistent_xyz_query", headers=tech_headers
    )
    assert res_search_none.status_code == 200
    assert res_search_none.json()["total"] == 0

    # 6. Admin can edit any guide
    res_admin_edit = await client.patch(
        f"/api/v1/repair-notes/{note_id}",
        json={"expected_revision": 2, "title": "Admin Verified Thermal Printer Guide"},
        headers=admin_headers,
    )
    assert res_admin_edit.status_code == 200
    assert res_admin_edit.json()["revision"] == 3


@pytest.mark.asyncio
async def test_ticket_checklist_lifecycle_and_apply(client: AsyncClient, accounts):
    tech_headers = accounts["tech"]
    admin_headers = accounts["admin"]
    tech2_headers = accounts["tech2"]

    # Retrieve tech user ID
    async with AsyncSessionLocal() as db:
        tech_user = (
            await db.execute(select(User).where(User.username == "tech"))
        ).scalar_one()
        tech_id = tech_user.id

    # Create a test ticket in OPEN status via quick-intake
    intake_res = await client.post(
        "/api/v1/tickets/quick-intake",
        json={
            "employee_id": "1042",
            "task_code": "NET-CFG",
            "description": "Passenger terminal Wi-Fi access point disconnected from switch",
            "mode": "REM",
        },
        headers=tech_headers,
    )
    assert intake_res.status_code == 201, intake_res.text
    ticket_id = intake_res.json()["id"]

    # Create a guide to apply
    guide_res = await client.post(
        "/api/v1/repair-notes",
        json={
            "title": "MikroTik AP VLAN Reset",
            "task_code": "NET-CFG",
            "symptom_and_fix": "VLAN 20 tag dropped on port 4. Re-tag port and flush ARP.",
            "steps": [
                "Ping access point 192.168.20.10",
                "Re-seat ethernet patch cable",
                "Verify DHCP handshake",
            ],
        },
        headers=tech_headers,
    )
    assert guide_res.status_code == 201
    guide = guide_res.json()
    guide_id = guide["id"]

    # TEST-CHECKLIST-01: Lifecycle restriction - applying to OPEN ticket rejected with 409 (tested via admin)
    res_open_apply = await client.post(
        f"/api/v1/tickets/{ticket_id}/checklist/apply",
        json={"repair_note_id": guide_id, "expected_note_revision": 1},
        headers=admin_headers,
    )
    assert res_open_apply.status_code == 409
    assert "PROG" in res_open_apply.json()["detail"]

    # Claim ticket as tech -> becomes PROG
    claim_res = await client.patch(
        f"/api/v1/tickets/{ticket_id}/claim", headers=tech_headers
    )
    assert claim_res.status_code == 200
    assert claim_res.json()["status"] == "PROG"

    # TEST-CHECKLIST-02: Permission - tech2 (not assigned, not admin) cannot view or apply checklist (403)
    res_tech2_apply = await client.post(
        f"/api/v1/tickets/{ticket_id}/checklist/apply",
        json={"repair_note_id": guide_id, "expected_note_revision": 1},
        headers=tech2_headers,
    )
    assert res_tech2_apply.status_code == 403

    # TEST-CHECKLIST-03: Valid apply by assigned tech
    apply_res = await client.post(
        f"/api/v1/tickets/{ticket_id}/checklist/apply",
        json={"repair_note_id": guide_id, "expected_note_revision": 1},
        headers=tech_headers,
    )
    assert apply_res.status_code == 200, apply_res.text
    cl = apply_res.json()
    assert cl["revision"] == 1
    assert cl["guide_title_snapshot"] == "MikroTik AP VLAN Reset"
    assert cl["guide_task_code_snapshot"] == "NET-CFG"
    assert (
        cl["guide_body"] == "VLAN 20 tag dropped on port 4. Re-tag port and flush ARP."
    )
    assert len(cl["steps"]) == 3
    assert all(s["completed"] is False for s in cl["steps"])

    # Verify original ticket description & diagnosis are UNTOUCHED
    t_check = await client.get(f"/api/v1/tickets/{ticket_id}", headers=tech_headers)
    assert (
        t_check.json()["description"]
        == "Passenger terminal Wi-Fi access point disconnected from switch"
    )
    assert t_check.json()["diagnosis"] is None

    # TEST-CHECKLIST-04: Explicit replacement guard (409 if checklist exists)
    res_dup_apply = await client.post(
        f"/api/v1/tickets/{ticket_id}/checklist/apply",
        json={
            "repair_note_id": guide_id,
            "expected_note_revision": 1,
            "replace_existing": False,
        },
        headers=tech_headers,
    )
    assert res_dup_apply.status_code == 409
    assert "Explicit replacement is required" in res_dup_apply.json()["detail"]

    # TEST-CHECKLIST-05: Explicit boolean step completion
    step_0_id = cl["steps"][0]["id"]
    step_check_res = await client.patch(
        f"/api/v1/tickets/{ticket_id}/checklist/steps/{step_0_id}",
        json={"expected_checklist_revision": 1, "completed": True},
        headers=tech_headers,
    )
    assert step_check_res.status_code == 200
    cl_updated = step_check_res.json()
    assert cl_updated["revision"] == 2
    step_0 = next(s for s in cl_updated["steps"] if s["id"] == step_0_id)
    assert step_0["completed"] is True
    assert step_0["completed_at"] is not None
    assert step_0["completed_by_id"] == str(tech_id)

    # Uncheck step (explicit boolean False)
    step_uncheck_res = await client.patch(
        f"/api/v1/tickets/{ticket_id}/checklist/steps/{step_0_id}",
        json={"expected_checklist_revision": 2, "completed": False},
        headers=tech_headers,
    )
    assert step_uncheck_res.status_code == 200
    cl_uncheck = step_uncheck_res.json()
    assert cl_uncheck["revision"] == 3
    step_0_un = next(s for s in cl_uncheck["steps"] if s["id"] == step_0_id)
    assert step_0_un["completed"] is False
    assert step_0_un["completed_at"] is None
    assert step_0_un["completed_by_id"] is None

    # TEST-CHECKLIST-06: Add manual ad-hoc step
    add_step_res = await client.post(
        f"/api/v1/tickets/{ticket_id}/checklist/steps",
        json={
            "expected_checklist_revision": 3,
            "text": "Re-run terminal bandwidth speed test",
        },
        headers=tech_headers,
    )
    assert add_step_res.status_code == 201
    cl_added = add_step_res.json()
    assert cl_added["revision"] == 4
    assert len(cl_added["steps"]) == 4

    # TEST-CHECKLIST-07: Nested resource isolation - editing step of another ticket returns 404
    fake_ticket_id = str(uuid.uuid4())
    res_nested = await client.patch(
        f"/api/v1/tickets/{fake_ticket_id}/checklist/steps/{step_0_id}",
        json={"expected_checklist_revision": 4, "completed": True},
        headers=admin_headers,
    )
    assert res_nested.status_code == 404

    # TEST-CHECKLIST-08: Delete a step and check re-sequencing
    del_step_res = await client.delete(
        f"/api/v1/tickets/{ticket_id}/checklist/steps/{step_0_id}?expected_checklist_revision=4",
        headers=tech_headers,
    )
    assert del_step_res.status_code == 200, del_step_res.text
    cl_after_del = del_step_res.json()
    assert cl_after_del["revision"] == 5
    assert len(cl_after_del["steps"]) == 3
    # Check positions are 0, 1, 2 contiguously
    assert [s["position"] for s in cl_after_del["steps"]] == [0, 1, 2]

    # TEST-CHECKLIST-09: Hard deletion of source guide SET NULLs source reference, preserves ticket checklist & steps
    del_guide_res = await client.delete(
        f"/api/v1/repair-notes/{guide_id}?expected_revision=1", headers=tech_headers
    )
    assert del_guide_res.status_code == 204

    cl_after_guide_delete = await client.get(
        f"/api/v1/tickets/{ticket_id}/checklist", headers=tech_headers
    )
    assert cl_after_guide_delete.status_code == 200
    cl_survived = cl_after_guide_delete.json()
    assert cl_survived["source_repair_note_id"] is None  # SET NULL worked
    assert cl_survived["guide_title_snapshot"] == "MikroTik AP VLAN Reset"
    assert len(cl_survived["steps"]) == 3  # steps survived intact!


@pytest.mark.asyncio
async def test_database_check_constraints_and_concurrency(
    client: AsyncClient, accounts
):
    tech_headers = accounts["tech"]

    # Quick intake ticket & claim
    intake_res = await client.post(
        "/api/v1/tickets/quick-intake",
        json={
            "employee_id": "1042",
            "task_code": "SW-ASST",
            "description": "POS application locks up during receipt printing",
            "mode": "REM",
        },
        headers=tech_headers,
    )
    ticket_id = intake_res.json()["id"]
    await client.patch(f"/api/v1/tickets/{ticket_id}/claim", headers=tech_headers)

    # 1. Add manual step
    s1 = await client.post(
        f"/api/v1/tickets/{ticket_id}/checklist/steps",
        json={"expected_checklist_revision": 1, "text": "Step 1 initial"},
        headers=tech_headers,
    )
    assert s1.status_code == 201
    cl = s1.json()
    assert cl["revision"] == 1
    step_id = cl["steps"][0]["id"]

    # 2. Concurrency: adding step with stale expected_checklist_revision yields 409
    res_stale = await client.post(
        f"/api/v1/tickets/{ticket_id}/checklist/steps",
        json={"expected_checklist_revision": 99, "text": "Stale step"},
        headers=tech_headers,
    )
    assert res_stale.status_code == 409

    # 3. Concurrency: updating step with stale expected_checklist_revision yields 409
    res_stale_update = await client.patch(
        f"/api/v1/tickets/{ticket_id}/checklist/steps/{step_id}",
        json={"expected_checklist_revision": 99, "completed": True},
        headers=tech_headers,
    )
    assert res_stale_update.status_code == 409

    # 4. Concurrency: deleting step with stale expected_checklist_revision yields 409
    res_stale_del = await client.delete(
        f"/api/v1/tickets/{ticket_id}/checklist/steps/{step_id}?expected_checklist_revision=99",
        headers=tech_headers,
    )
    assert res_stale_del.status_code == 409

    # 5. Empty-instance replacement test:
    # Create guide with 0 steps
    empty_guide_res = await client.post(
        "/api/v1/repair-notes",
        json={
            "title": "General Advisory Without Steps",
            "task_code": "SW-ASST",
            "symptom_and_fix": "Advisory note for POS errors.",
            "steps": [],
        },
        headers=tech_headers,
    )
    empty_guide_id = empty_guide_res.json()["id"]

    # Apply to another ticket in PROG
    intake_res2 = await client.post(
        "/api/v1/tickets/quick-intake",
        json={
            "employee_id": "1042",
            "task_code": "SW-ASST",
            "description": "Another POS issue",
            "mode": "SITE",
        },
        headers=tech_headers,
    )
    ticket2_id = intake_res2.json()["id"]
    await client.patch(f"/api/v1/tickets/{ticket2_id}/claim", headers=tech_headers)

    apply_empty_res = await client.post(
        f"/api/v1/tickets/{ticket2_id}/checklist/apply",
        json={"repair_note_id": empty_guide_id, "expected_note_revision": 1},
        headers=tech_headers,
    )
    assert apply_empty_res.status_code == 200
    cl2 = apply_empty_res.json()
    assert cl2["revision"] == 1
    assert len(cl2["steps"]) == 0
    assert cl2["guide_title_snapshot"] == "General Advisory Without Steps"

    # Attempt to apply another guide without replace_existing -> MUST 409 even though steps is 0!
    attempt_replace_no_flag = await client.post(
        f"/api/v1/tickets/{ticket2_id}/checklist/apply",
        json={
            "repair_note_id": empty_guide_id,
            "expected_note_revision": 1,
            "replace_existing": False,
        },
        headers=tech_headers,
    )
    assert attempt_replace_no_flag.status_code == 409
    assert (
        "Explicit replacement is required" in attempt_replace_no_flag.json()["detail"]
    )

    # With replace_existing=True and expected_checklist_revision=1 -> succeeds
    replace_success = await client.post(
        f"/api/v1/tickets/{ticket2_id}/checklist/apply",
        json={
            "repair_note_id": empty_guide_id,
            "expected_note_revision": 1,
            "expected_checklist_revision": 1,
            "replace_existing": True,
        },
        headers=tech_headers,
    )
    assert replace_success.status_code == 200
    assert replace_success.json()["revision"] == 2


@pytest.mark.asyncio
async def test_repair_notes_and_checklists_comprehensive_coverage(
    client: AsyncClient, accounts
):
    tech_headers = accounts["tech"]
    admin_headers = accounts["admin"]
    tech2_headers = accounts["tech2"]

    # 1. Invalid task_code on create -> 422
    res_inv_task = await client.post(
        "/api/v1/repair-notes",
        json={
            "title": "Invalid Task Guide",
            "task_code": "NON-EXISTENT",
            "symptom_and_fix": "Fix something",
            "steps": [],
        },
        headers=tech_headers,
    )
    assert res_inv_task.status_code == 422

    # 2. Non-existent source ticket on create -> 422
    fake_ticket_id = str(uuid.uuid4())
    res_inv_source = await client.post(
        "/api/v1/repair-notes",
        json={
            "title": "Invalid Source Ticket Guide",
            "task_code": "NET-CFG",
            "symptom_and_fix": "Fix network",
            "source_ticket_id": fake_ticket_id,
            "steps": [],
        },
        headers=tech_headers,
    )
    assert res_inv_source.status_code == 422

    # 3. Valid intake ticket, then create guide referencing that source ticket
    intake_res = await client.post(
        "/api/v1/tickets/quick-intake",
        json={
            "employee_id": "1042",
            "task_code": "NET-CFG",
            "description": "Switch port 12 flapping",
            "mode": "SITE",
        },
        headers=tech_headers,
    )
    assert intake_res.status_code == 201
    source_ticket_id = intake_res.json()["id"]
    source_ticket_code = intake_res.json()["ticket_code"]

    res_valid_source = await client.post(
        "/api/v1/repair-notes",
        json={
            "title": "Switch Port Flap Remediation",
            "task_code": "NET-CFG",
            "symptom_and_fix": "Clean optical fiber transceiver",
            "source_ticket_id": source_ticket_id,
            "steps": ["Unplug transceiver", "Clean connector with pen"],
        },
        headers=tech_headers,
    )
    assert res_valid_source.status_code == 201
    note_with_source = res_valid_source.json()
    assert note_with_source["source_ticket_id"] == source_ticket_id
    assert note_with_source["source_ticket_code"] == source_ticket_code

    # 4. GET /repair-notes/{id} for single note and 404 for missing
    get_res = await client.get(
        f"/api/v1/repair-notes/{note_with_source['id']}", headers=tech_headers
    )
    assert get_res.status_code == 200
    assert get_res.json()["id"] == note_with_source["id"]

    get_missing = await client.get(
        f"/api/v1/repair-notes/{uuid.uuid4()}", headers=tech_headers
    )
    assert get_missing.status_code == 404

    # 5. GET /repair-notes without search query: pagination and task_code filtering
    list_res = await client.get(
        "/api/v1/repair-notes?task_code=NET-CFG&offset=0&limit=10",
        headers=tech_headers,
    )
    assert list_res.status_code == 200
    assert list_res.json()["total"] >= 1
    assert any(n["id"] == note_with_source["id"] for n in list_res.json()["items"])

    # 6. PATCH /repair-notes/{id} errors
    # 404 for non-existent
    patch_missing = await client.patch(
        f"/api/v1/repair-notes/{uuid.uuid4()}",
        json={"expected_revision": 1, "title": "Missing"},
        headers=tech_headers,
    )
    assert patch_missing.status_code == 404

    # 422 for invalid task_code on update
    patch_bad_task = await client.patch(
        f"/api/v1/repair-notes/{note_with_source['id']}",
        json={"expected_revision": 1, "task_code": "INVALID-CODE"},
        headers=tech_headers,
    )
    assert patch_bad_task.status_code == 422

    # Update only symptom_and_fix without steps
    patch_no_steps = await client.patch(
        f"/api/v1/repair-notes/{note_with_source['id']}",
        json={
            "expected_revision": 1,
            "symptom_and_fix": "Clean connector with alcohol pen and verify optic power level",
        },
        headers=tech_headers,
    )
    assert patch_no_steps.status_code == 200
    assert patch_no_steps.json()["revision"] == 2
    assert len(patch_no_steps.json()["steps"]) == 2

    # 7. DELETE /repair-notes/{id} errors
    del_missing = await client.delete(
        f"/api/v1/repair-notes/{uuid.uuid4()}?expected_revision=1",
        headers=tech_headers,
    )
    assert del_missing.status_code == 404

    del_stale = await client.delete(
        f"/api/v1/repair-notes/{note_with_source['id']}?expected_revision=1",
        headers=tech_headers,
    )
    assert del_stale.status_code == 409

    # 8. GET /tickets/{id}/checklist on fresh ticket (no checklist yet)
    # Check 404 for non-existent ticket
    get_cl_missing = await client.get(
        f"/api/v1/tickets/{uuid.uuid4()}/checklist", headers=tech_headers
    )
    assert get_cl_missing.status_code == 404

    # Check 403 for unassigned tech on fresh ticket
    get_cl_forbidden = await client.get(
        f"/api/v1/tickets/{source_ticket_id}/checklist", headers=tech2_headers
    )
    assert get_cl_forbidden.status_code == 403

    # Assigned / admin gets blank checklist representation
    get_cl_blank = await client.get(
        f"/api/v1/tickets/{source_ticket_id}/checklist", headers=admin_headers
    )
    assert get_cl_blank.status_code == 200
    blank_data = get_cl_blank.json()
    assert blank_data["id"] is None
    assert blank_data["steps"] == []
    assert blank_data["guide_title_snapshot"] is None

    # Claim ticket as tech to put in PROG
    await client.patch(
        f"/api/v1/tickets/{source_ticket_id}/claim", headers=tech_headers
    )

    # 9. Apply guide errors:
    # 404 for non-existent guide
    apply_fake_guide = await client.post(
        f"/api/v1/tickets/{source_ticket_id}/checklist/apply",
        json={"repair_note_id": str(uuid.uuid4()), "expected_note_revision": 1},
        headers=tech_headers,
    )
    assert apply_fake_guide.status_code == 404

    # 409 for guide revision mismatch
    apply_stale_guide = await client.post(
        f"/api/v1/tickets/{source_ticket_id}/checklist/apply",
        json={"repair_note_id": note_with_source["id"], "expected_note_revision": 99},
        headers=tech_headers,
    )
    assert apply_stale_guide.status_code == 409

    # Valid apply
    apply_ok = await client.post(
        f"/api/v1/tickets/{source_ticket_id}/checklist/apply",
        json={"repair_note_id": note_with_source["id"], "expected_note_revision": 2},
        headers=tech_headers,
    )
    assert apply_ok.status_code == 200
    assert apply_ok.json()["id"] is not None
    step1_id = apply_ok.json()["steps"][0]["id"]

    # 10. Step operations error handling:
    # Update text and non-existent step id -> 404
    update_missing_step = await client.patch(
        f"/api/v1/tickets/{source_ticket_id}/checklist/steps/{uuid.uuid4()}",
        json={"expected_checklist_revision": 1, "text": "Something"},
        headers=tech_headers,
    )
    assert update_missing_step.status_code == 404

    # Delete non-existent step id -> 404
    del_missing_step = await client.delete(
        f"/api/v1/tickets/{source_ticket_id}/checklist/steps/{uuid.uuid4()}?expected_checklist_revision=1",
        headers=tech_headers,
    )
    assert del_missing_step.status_code == 404

    # Update step text successfully
    update_step_text = await client.patch(
        f"/api/v1/tickets/{source_ticket_id}/checklist/steps/{step1_id}",
        json={"expected_checklist_revision": 1, "text": "Unplug transceiver carefully"},
        headers=tech_headers,
    )
    assert update_step_text.status_code == 200
    assert update_step_text.json()["revision"] == 2
    assert update_step_text.json()["steps"][0]["text"] == "Unplug transceiver carefully"

    # Test PROG status gate on step modifications using an OPEN ticket (via admin)
    open_intake = await client.post(
        "/api/v1/tickets/quick-intake",
        json={
            "employee_id": "1042",
            "task_code": "NET-CFG",
            "description": "Open ticket for gate test",
            "mode": "REM",
        },
        headers=admin_headers,
    )
    assert open_intake.status_code == 201
    open_tid = open_intake.json()["id"]

    # Adding step on OPEN ticket -> 409
    res_add_open = await client.post(
        f"/api/v1/tickets/{open_tid}/checklist/steps",
        json={"expected_checklist_revision": 1, "text": "Too early step"},
        headers=admin_headers,
    )
    assert res_add_open.status_code == 409
    assert "PROG" in res_add_open.json()["detail"]

    # Updating step on OPEN ticket -> 409
    res_update_open = await client.patch(
        f"/api/v1/tickets/{open_tid}/checklist/steps/{uuid.uuid4()}",
        json={"expected_checklist_revision": 1, "completed": True},
        headers=admin_headers,
    )
    assert res_update_open.status_code == 409

    # Deleting step on OPEN ticket -> 409
    res_del_open = await client.delete(
        f"/api/v1/tickets/{open_tid}/checklist/steps/{uuid.uuid4()}?expected_checklist_revision=1",
        headers=admin_headers,
    )
    assert res_del_open.status_code == 409
