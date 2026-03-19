/*
  # Add claim_hours to buildings

  Adds an optional free-text field to each building so staff can specify
  when the lost & found desk is open. This is displayed to students on the
  item detail page instead of hardcoded fallback hours.

  Examples: "Mon–Fri 8am–5pm · Sat 10am–2pm", "Weekdays 9am–4pm"
*/

ALTER TABLE buildings
  ADD COLUMN IF NOT EXISTS claim_hours text;
