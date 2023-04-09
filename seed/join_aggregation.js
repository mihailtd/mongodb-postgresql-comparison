[
  {
    '$lookup': {
      'from': 'patients',
      'localField': 'patient_id',
      'foreignField': 'patient_id',
      'as': 'patient'
    }
  }, {
    '$lookup': {
      'from': 'locations',
      'localField': 'room_id',
      'foreignField': 'rooms.room_id',
      'as': 'location'
    }
  }, {
    '$lookup': {
      'from': 'hospital_staff',
      'localField': 'staff',
      'foreignField': 'staff_id',
      'as': 'staff'
    }
  }
]