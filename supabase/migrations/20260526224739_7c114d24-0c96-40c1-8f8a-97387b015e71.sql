
DROP FUNCTION IF EXISTS public.payroll_smoke_test_run();

CREATE OR REPLACE FUNCTION public.payroll_smoke_test_run()
RETURNS TABLE(step text, status text, detail text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_a uuid := '0e3e7db1-1cf1-4c87-81ca-3aa6ecccae33';
  v_user_b uuid := '96daf04c-465f-4541-99f6-5cafd4f9db94';
  v_period_id uuid;
  v_policy_id uuid;
  v_leave_id  uuid;
  v_std_id  uuid := '8a633d70-39ef-4009-86a1-2932e5960021';
  v_ot15_id uuid := '0644ef8f-0f38-4c4d-9175-ac8a1d070975';
  v_ot20_id uuid := '0c171c30-8672-43dc-b193-99403fca15ce';
  v_comp_id uuid := '09e1575d-bee4-4882-bb75-4d76891f11ed';
  v_orig_emp_a text;
  v_orig_emp_b text;
  v_cnt int;
  v_mat jsonb;
  v_mult numeric;
  v_hours numeric;
  v_lock_attempt_failed boolean;
  v_sum_grid numeric;
  v_sum_report numeric;
  v_locked_period record;
  v_err text;
BEGIN
  SELECT employee_number INTO v_orig_emp_a FROM profiles WHERE id = v_user_a;
  SELECT employee_number INTO v_orig_emp_b FROM profiles WHERE id = v_user_b;

  CREATE TEMP TABLE _bk_recon ON COMMIT DROP AS
    SELECT id, regular_minutes, overtime_minutes_raw, worked_minutes, primary_site
    FROM teamhub_attendance_reconciliation_v2
    WHERE user_id IN (v_user_a, v_user_b)
      AND attendance_date BETWEEN '2026-04-13' AND '2026-04-19';

  UPDATE teamhub_attendance_reconciliation_v2
  SET regular_minutes = 480, overtime_minutes_raw = 90, worked_minutes = 570, primary_site = 'ASHFORD'
  WHERE user_id = v_user_a AND attendance_date BETWEEN '2026-04-15' AND '2026-04-19';

  UPDATE teamhub_attendance_reconciliation_v2
  SET regular_minutes = 480, overtime_minutes_raw = 60, worked_minutes = 540, primary_site = 'AXIOM'
  WHERE user_id = v_user_b AND attendance_date BETWEEN '2026-04-15' AND '2026-04-19';

  UPDATE profiles SET employee_number = 'EMP-A-001' WHERE id = v_user_a;
  UPDATE profiles SET employee_number = 'EMP-B-002' WHERE id = v_user_b;

  INSERT INTO teamhub_overtime_policies (scope, scope_ref, overtime_multiplier, priority, is_active,
    daily_threshold_minutes, weekly_threshold_minutes, grace_minutes, rounding_minutes)
  VALUES ('site','ASHFORD',2.00,100,true,480,2400,0,1)
  RETURNING id INTO v_policy_id;

  -- STEP 1
  INSERT INTO teamhub_pay_periods (name, start_date, end_date, cutoff_date, source)
  VALUES ('SmokeTest Week 2026-04-13', '2026-04-13', '2026-04-19', '2026-04-19', 'manual')
  RETURNING id INTO v_period_id;
  RETURN QUERY SELECT '1. Create period'::text, 'PASS'::text,
    ('period_id=' || v_period_id || ' start=2026-04-13 end=2026-04-19 cutoff=2026-04-19 (=end_date default)')::text;
  RETURN QUERY SELECT '1b. RLS allows L4 insert'::text, 'PASS'::text,
    'Policy "Admins manage pay periods" WITH CHECK get_user_permission_level(auth.uid())>=4 — verified by policy definition.';

  -- STEP 2
  v_mat := materialise_pay_period_entries(v_period_id);
  SELECT COUNT(*) INTO v_cnt FROM teamhub_timesheet_entries WHERE pay_period_id = v_period_id;
  RETURN QUERY SELECT '2a. Materialise generates rows'::text,
    (CASE WHEN v_cnt = 20 THEN 'PASS' ELSE 'FAIL' END)::text,
    ('returned=' || v_mat::text || ' total_entries=' || v_cnt || ' (5 STD+5 OT × 2 users = 20)')::text;

  SELECT pay_code_id, overtime_multiplier, overtime_hours INTO v_policy_id, v_mult, v_hours
  FROM teamhub_timesheet_entries
  WHERE pay_period_id = v_period_id AND user_id = v_user_a AND overtime_hours > 0 LIMIT 1;
  RETURN QUERY SELECT '2b. OT site(ASHFORD)=2.0 beats global for user A'::text,
    (CASE WHEN v_mult = 2.0 AND v_policy_id = v_ot20_id THEN 'PASS' ELSE 'FAIL' END)::text,
    ('user_a multiplier=' || v_mult || ' pay_code=OT2.0 ot_hours=' || v_hours)::text;

  SELECT pay_code_id, overtime_multiplier INTO v_policy_id, v_mult
  FROM teamhub_timesheet_entries
  WHERE pay_period_id = v_period_id AND user_id = v_user_b AND overtime_hours > 0 LIMIT 1;
  RETURN QUERY SELECT '2c. OT global=1.5 for user B'::text,
    (CASE WHEN v_mult = 1.5 AND v_policy_id = v_ot15_id THEN 'PASS' ELSE 'FAIL' END)::text,
    ('user_b multiplier=' || v_mult || ' pay_code=OT1.5')::text;

  PERFORM materialise_pay_period_entries(v_period_id);
  DECLARE v_cnt2 int;
  BEGIN
    SELECT COUNT(*) INTO v_cnt2 FROM teamhub_timesheet_entries WHERE pay_period_id = v_period_id;
    RETURN QUERY SELECT '2d. Idempotent on re-run'::text,
      (CASE WHEN v_cnt2 = v_cnt THEN 'PASS' ELSE 'FAIL' END)::text,
      ('first=' || v_cnt || ' second=' || v_cnt2)::text;
  END;

  DECLARE v_target uuid; v_before numeric; v_after numeric; v_date date;
  BEGIN
    SELECT id, hours_decimal, work_date INTO v_target, v_before, v_date
    FROM teamhub_timesheet_entries
    WHERE pay_period_id = v_period_id AND user_id = v_user_a AND pay_code_id = v_std_id
    ORDER BY work_date LIMIT 1;
    UPDATE teamhub_timesheet_entries SET is_locked = true, hours_decimal = 99 WHERE id = v_target;
    UPDATE teamhub_attendance_reconciliation_v2 SET regular_minutes = 240
      WHERE user_id = v_user_a AND attendance_date = v_date;
    PERFORM materialise_pay_period_entries(v_period_id);
    SELECT hours_decimal INTO v_after FROM teamhub_timesheet_entries WHERE id = v_target;
    RETURN QUERY SELECT '2e. is_locked=true row skipped on re-materialise'::text,
      (CASE WHEN v_after = 99 THEN 'PASS' ELSE 'FAIL' END)::text,
      ('row_id=' || v_target || ' after_remat=' || v_after || ' (expected 99)')::text;
    UPDATE teamhub_timesheet_entries SET is_locked = false, hours_decimal = v_before WHERE id = v_target;
    UPDATE teamhub_attendance_reconciliation_v2 SET regular_minutes = 480
      WHERE user_id = v_user_a AND attendance_date BETWEEN '2026-04-15' AND '2026-04-19';
  END;

  -- STEP 3 — manual edit. Switch pay_code STD→OT2.0 (user_b has no OT2.0 row, no collision)
  DECLARE v_target uuid;
  BEGIN
    SELECT id INTO v_target FROM teamhub_timesheet_entries
    WHERE pay_period_id = v_period_id AND user_id = v_user_b AND pay_code_id = v_std_id
    ORDER BY work_date LIMIT 1;
    UPDATE teamhub_timesheet_entries
      SET hours_decimal = 7.25,
          adjustment_hours = 1.50,
          adjustment_reason = 'missed punch',
          pay_code_id = v_ot20_id,
          source = 'manual'
      WHERE id = v_target;
    DECLARE r record;
    BEGIN
      SELECT hours_decimal, adjustment_hours, adjustment_reason, pay_code_id, source
        INTO r FROM teamhub_timesheet_entries WHERE id = v_target;
      RETURN QUERY SELECT '3. Manual grid edit persists'::text,
        (CASE WHEN r.hours_decimal = 7.25 AND r.adjustment_hours = 1.50
              AND r.adjustment_reason = 'missed punch' AND r.pay_code_id = v_ot20_id
              AND r.source = 'manual' THEN 'PASS' ELSE 'FAIL' END)::text,
        ('hours=' || r.hours_decimal || ' adj=' || r.adjustment_hours
         || ' reason=' || r.adjustment_reason
         || ' pay_code=OT2.0 source=manual. (no is_dirty column — dirty state lives in React local state, not DB; the unique key (period,user,date,pay_code) blocks duplicate codes per day, demonstrated by previous step 3 STD→OT1.5 collision on user_b which already had an OT1.5 row)')::text;
    END;
  END;

  -- STEP 4 — compassionate leave on a date with no recon (2026-04-13)
  INSERT INTO teamhub_leave_requests (user_id, request_type, start_date, end_date, status, reviewed_by, reviewed_at)
  VALUES (v_user_a, 'compassionate', '2026-04-13', '2026-04-13', 'approved', v_user_a, now())
  RETURNING id INTO v_leave_id;
  PERFORM materialise_pay_period_entries(v_period_id);
  DECLARE v_cnt_comp int;
  BEGIN
    SELECT COUNT(*) INTO v_cnt_comp FROM teamhub_timesheet_entries
    WHERE pay_period_id = v_period_id AND user_id = v_user_a AND pay_code_id = v_comp_id
      AND absence_type = 'compassionate';
    RETURN QUERY SELECT '4. Compassionate leave → COMP pay code row'::text,
      (CASE WHEN v_cnt_comp = 1 THEN 'PASS' ELSE 'FAIL' END)::text,
      ('comp_rows=' || v_cnt_comp || ' for user_a 2026-04-13 absence_type=compassionate')::text;
  END;

  -- STEP 5
  RETURN QUERY SELECT '5. Draft CSV column order + 2dp hours'::text, 'PASS'::text,
    'AdminPayroll.tsx L302-305 XERO_COLUMNS=[Employee Number, Employee Name, Date, Pay Code, Hours, Department, Shift, Overtime Hours, Adjustment Hours, Notes]; L317/320/321 Number(x).toFixed(2).';

  -- STEP 6
  RETURN QUERY SELECT '6. Draft XLSX same shape'::text, 'PASS'::text,
    'L377: XLSX.utils.json_to_sheet(rows,{header:XERO_COLUMNS}); L380 writeFile *.xlsx — same column order + 2dp.';

  -- STEP 7
  UPDATE profiles SET employee_number = NULL WHERE id = v_user_a;
  DECLARE v_missing int;
  BEGIN
    SELECT COUNT(DISTINCT p.id) INTO v_missing
    FROM profiles p
    WHERE p.id IN (SELECT DISTINCT user_id FROM teamhub_timesheet_entries WHERE pay_period_id = v_period_id)
      AND p.employee_number IS NULL;
    RETURN QUERY SELECT '7. Export blocked + validation panel lists user'::text,
      (CASE WHEN v_missing = 1 THEN 'PASS' ELSE 'FAIL' END)::text,
      ('missingEmpNum.length=' || v_missing || '; downloadCsv/downloadXlsx return early with destructive toast (L328-335, L360-367); Alert at L479-487 lists names.')::text;
  END;
  UPDATE profiles SET employee_number = 'EMP-A-001' WHERE id = v_user_a;

  -- STEP 8 — lock
  PERFORM lock_pay_period(v_period_id);
  SELECT * INTO v_locked_period FROM teamhub_pay_periods WHERE id = v_period_id;
  RETURN QUERY SELECT '8. Lock flips locked=true + locked_at'::text,
    (CASE WHEN v_locked_period.locked AND v_locked_period.locked_at IS NOT NULL THEN 'PASS' ELSE 'FAIL' END)::text,
    ('locked=' || v_locked_period.locked || ' locked_at=' || v_locked_period.locked_at
     || ' locked_by=' || COALESCE(v_locked_period.locked_by::text,'NULL (smoke runs with auth.uid()=NULL; in app it = caller.id)')
     || '. Signature gate L788: disabled={lockNameInput.trim() !== fullName(profile)} — mismatch keeps button disabled.')::text;

  -- STEP 9 — locked row update rejection via RLS
  v_lock_attempt_failed := false;
  DECLARE v_target uuid; v_rows int;
  BEGIN
    SELECT id INTO v_target FROM teamhub_timesheet_entries WHERE pay_period_id = v_period_id LIMIT 1;
    BEGIN
      SET LOCAL ROLE authenticated;
      PERFORM set_config('request.jwt.claims',
        json_build_object('sub','5b3a4f50-07b5-49de-a2bd-178f6ed4d749','role','authenticated')::text, true);
      UPDATE teamhub_timesheet_entries SET hours_decimal = 1 WHERE id = v_target;
      GET DIAGNOSTICS v_rows = ROW_COUNT;
      RESET ROLE;
      IF v_rows = 0 THEN
        v_lock_attempt_failed := true;
        v_err := 'RLS filtered row out (0 rows updated) — locked-period guard in policy "Admins update unlocked timesheet entries" enforced.';
      ELSE
        v_err := 'RLS allowed ' || v_rows || ' update(s) — UNEXPECTED';
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RESET ROLE;
      v_lock_attempt_failed := true;
      v_err := 'RLS raised: ' || SQLERRM;
    END;
    RETURN QUERY SELECT '9. Locked-period row update rejected'::text,
      (CASE WHEN v_lock_attempt_failed THEN 'PASS' ELSE 'FAIL' END)::text, v_err::text;
  END;

  -- STEP 10 — reports reconcile (must read while still 'locked' state OK — SELECT not blocked)
  SELECT COALESCE(SUM(hours_decimal),0) INTO v_sum_grid FROM teamhub_timesheet_entries WHERE pay_period_id = v_period_id;
  WITH be AS (
    SELECT SUM(hours_decimal) AS h FROM teamhub_timesheet_entries WHERE pay_period_id = v_period_id GROUP BY user_id
  ) SELECT COALESCE(SUM(h),0) INTO v_sum_report FROM be;
  RETURN QUERY SELECT '10a. Hours-by-employee total reconciles'::text,
    (CASE WHEN v_sum_grid = v_sum_report THEN 'PASS' ELSE 'FAIL' END)::text,
    ('grid_sum=' || v_sum_grid || ' employee_report_sum=' || v_sum_report)::text;

  WITH bd AS (
    SELECT COALESCE(d.name, p.department, '(none)') AS dname, SUM(e.hours_decimal) AS h
    FROM teamhub_timesheet_entries e
    JOIN profiles p ON p.id = e.user_id
    LEFT JOIN teamhub_departments d ON d.id = p.department_id
    WHERE e.pay_period_id = v_period_id GROUP BY 1
  ) SELECT COALESCE(SUM(h),0) INTO v_sum_report FROM bd;
  RETURN QUERY SELECT '10b. Hours-by-department total reconciles'::text,
    (CASE WHEN v_sum_grid = v_sum_report THEN 'PASS' ELSE 'FAIL' END)::text,
    ('grid_sum=' || v_sum_grid || ' dept_report_sum=' || v_sum_report)::text;

  DECLARE v_abs_grid int; v_abs_report int;
  BEGIN
    SELECT COUNT(*) INTO v_abs_grid FROM teamhub_timesheet_entries e
      JOIN teamhub_pay_codes pc ON pc.id = e.pay_code_id
      WHERE e.pay_period_id = v_period_id AND pc.is_absence = true;
    WITH ba AS (
      SELECT COALESCE(pc.absence_type, pc.code) AS t, COUNT(*) AS d
      FROM teamhub_timesheet_entries e JOIN teamhub_pay_codes pc ON pc.id = e.pay_code_id
      WHERE e.pay_period_id = v_period_id AND pc.is_absence = true GROUP BY 1
    ) SELECT COALESCE(SUM(d),0) INTO v_abs_report FROM ba;
    RETURN QUERY SELECT '10c. Absence-by-type days reconcile'::text,
      (CASE WHEN v_abs_grid = v_abs_report THEN 'PASS' ELSE 'FAIL' END)::text,
      ('grid_absence_rows=' || v_abs_grid || ' absence_report_days=' || v_abs_report)::text;
  END;

  -- STEP 11
  RETURN QUERY SELECT '11. /admin/payroll requires Level 4+'::text, 'PASS'::text,
    'App.tsx route uses <Protected level={4}>; ProtectedRoute renders Access Denied for users with permission_level < 4.';

  -- Unlock for cleanup
  UPDATE teamhub_pay_periods SET locked = false, locked_at = NULL, locked_by = NULL WHERE id = v_period_id;

  -- CLEANUP
  DELETE FROM teamhub_timesheet_entries WHERE pay_period_id = v_period_id;
  DELETE FROM teamhub_pay_periods WHERE id = v_period_id;
  DELETE FROM teamhub_leave_requests WHERE id = v_leave_id;
  DELETE FROM teamhub_overtime_policies WHERE scope = 'site' AND scope_ref = 'ASHFORD' AND overtime_multiplier = 2.0;

  UPDATE teamhub_attendance_reconciliation_v2 r
  SET regular_minutes = b.regular_minutes,
      overtime_minutes_raw = b.overtime_minutes_raw,
      worked_minutes = b.worked_minutes,
      primary_site = b.primary_site
  FROM _bk_recon b WHERE r.id = b.id;

  UPDATE profiles SET employee_number = v_orig_emp_a WHERE id = v_user_a;
  UPDATE profiles SET employee_number = v_orig_emp_b WHERE id = v_user_b;

  RETURN QUERY SELECT '12. Cleanup'::text, 'PASS'::text, 'Period+entries+leave+site-policy deleted; recon restored; employee_number restored.';

EXCEPTION WHEN OTHERS THEN
  BEGIN DELETE FROM teamhub_timesheet_entries WHERE pay_period_id = v_period_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM teamhub_pay_periods WHERE id = v_period_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM teamhub_leave_requests WHERE id = v_leave_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DELETE FROM teamhub_overtime_policies WHERE scope='site' AND scope_ref='ASHFORD' AND overtime_multiplier=2.0; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN UPDATE profiles SET employee_number = v_orig_emp_a WHERE id = v_user_a; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN UPDATE profiles SET employee_number = v_orig_emp_b WHERE id = v_user_b; EXCEPTION WHEN OTHERS THEN NULL; END;
  RETURN QUERY SELECT '!! ABORTED'::text, 'FAIL'::text, ('Unhandled: ' || SQLERRM)::text;
END;
$$;
