SELECT
  surgeries.surgery_id,
  surgeries.patient_id,
  surgeries.room_id,
  surgeries.start_time,
  surgeries.end_time,
  surgeries.surgery_name,
  locations.name AS location_name,
  locations.address AS location_address,
  locations.city AS location_city,
  locations.available_start_time AS location_available_start_time,
  locations.available_end_time AS location_available_end_time,
  rooms.name AS room_name,
  patients.name AS patient_name,
  jsonb_agg(jsonb_build_object('staff_id', hospital_staff.staff_id, 'name', hospital_staff.name,
    'role', hospital_staff.role)) AS staff
FROM
  surgeries
  JOIN rooms ON rooms.room_id = surgeries.room_id
  JOIN locations ON locations.location_id = rooms.location_id
  JOIN patients ON patients.patient_id = surgeries.patient_id
  JOIN hospital_staff_surgeries ON hospital_staff_surgeries.surgery_id = surgeries.surgery_id
  JOIN hospital_staff ON hospital_staff.staff_id = hospital_staff_surgeries.staff_id
GROUP BY
  surgeries.surgery_id,
  locations.location_id,
  rooms.room_id,
  patients.patient_id `;
