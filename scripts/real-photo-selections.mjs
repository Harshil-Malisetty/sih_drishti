// India-only reference photographs. Location is verified against source captions/categories,
// not inferred from a vehicle brand or the photographer's nationality.
const photo = (id, title, location, locationEvidence, usedFor, note) => ({
  id, title, country: 'India', location, locationEvidence, usedFor,
  note: note || 'Indian reference photograph. Demo dates and workflow stages are not source capture metadata; the photo does not establish the reported condition or completion of this particular case.',
});
const repeat = (ids, title, location, locationEvidence, usedFor, note) => ids.map(id => photo(id, title, location, locationEvidence, usedFor, note));
const monsoon = (id, number, flickrId) => photo(id, `India - Chennai - Monsoon - ${number} (${flickrId}).jpg`, 'Chennai, Tamil Nadu', 'Source title identifies India — Chennai — Monsoon.', 'Waterlogged street in Chennai');
const vehicleNote = 'One source photograph and its crops. The pictured vehicle is not flagged or linked to wrongdoing; scene views are not additional sightings.';
const personNote = 'One source photograph and its crops. Nobody pictured is missing, wanted or identified; scene views are not additional sightings.';
const barrierTitle = 'Highway road crash barrier in blind curve WTK20150913-DSC 3930.jpg';
const barrierEvidence = 'Source caption: on the way from Haridwar to Uttarkashi; category NH 34 (India).';
const crossingTitle = 'Zebra crossing at AU.JPG';
const crossingEvidence = 'Source categories: Anna University, Chennai; Roads in Chennai; Zebra crossings in India.';
const signTitle = 'Road sign on Chennai-Bangalore Highway.jpg';
const signEvidence = 'Source title identifies the Chennai–Bangalore highway in India.';
const schoolTitle = 'Tirtol, Odisha, India - panoramio.jpg';
const schoolEvidence = 'Source caption identifies school crossing sign on Odisha state highway 12, Tirtol, India.';
const openRoad = 'Rajiv Gandhi IT Expressway(OMR).jpg';
const openRoadEvidence = 'Source caption identifies Rajiv Gandhi IT Expressway viewed from P.T.C. Quarters Foot Over Bridge; Chennai location.';

// Regions are manually selected composition coordinates, not recognition results.
// Derive the single-subject reference from the original, before downsampling.
const pair = (kind, title, location, locationEvidence, usedFor, note, subject, views) => [
  { ...photo(`${kind}-reference`, title, location, locationEvidence, usedFor, note), crop: subject, relationship: 'subject-crop', seriesId: `${kind}-comparison` },
  ...views.map((crop, index) => ({ ...photo(`${kind}-pass-${index + 1}`, title, location, locationEvidence, usedFor, note), crop, subject, relationship: 'scene-view', seriesId: `${kind}-comparison` })),
];
export const watchlistPhotoSelections = [
  ...pair('vehicle', 'Traffic in Gwalior, India.jpg', 'Gwalior, Madhya Pradesh', 'Source title and caption: Traffic in Gwalior, India.', 'Silver SUV with its visible front registration plate in traffic', vehicleNote,
    { x: 0.313, y: 0.268, width: 0.179, height: 0.29 },
    [null, { x: 0.16, y: 0.13, width: 0.60, height: 0.55 }, { x: 0.21, y: 0.20, width: 0.47, height: 0.44 }]),
  ...pair('person', 'Women Walking at Ruins - Near Hampi Village - India.JPG', 'Hampi, Karnataka', 'Source caption: Women walking at temple near Hampi village, India. July 2008.', 'Woman in a patterned sari walking with a group', personNote,
    { x: 0.761, y: 0.47, width: 0.075, height: 0.24 },
    [{ x: 0.40, y: 0.30, width: 0.60, height: 0.50 }, { x: 0.52, y: 0.37, width: 0.43, height: 0.40 }, { x: 0.59, y: 0.41, width: 0.32, height: 0.34 }]),
];

export const realPhotoSelections = [
  photo('pothole-detected', 'Potholes in Bengaluru road.jpg', 'Bengaluru, Karnataka', 'Source caption and Roads in Bengaluru category.', 'Pothole in a Bengaluru road'),
  photo('pothole-observed', 'Roads deformed T munnekollala Bengaluru.jpg', 'Munnekollala, Bengaluru', 'Source title; categories Potholes in India and Roads in Bengaluru.', 'Damaged road surface in Bengaluru'),
  photo('pothole-degrading', 'Roads deformed T munnekollala Bengaluru 2.jpg', 'Munnekollala, Bengaluru', 'Source title; categories Potholes in India and Roads in Bengaluru.', 'Broken asphalt and potholes in Bengaluru'),
  photo('pothole-high-risk', 'Potholed road outside Kolkata Airport.jpg', 'Kolkata, West Bengal', 'Source title and caption identify Kolkata Airport; Potholes in India category.', 'Potholed road near Kolkata Airport'),
  photo('pothole-repair', 'പൊന്നാനി 1zc 07.jpg', 'Ponnani, Kerala', 'Source caption: road maintenance from Kottathara to Nariparampu, Ponnani taluk, Malappuram district, Kerala, India.', 'Workers filling a road patch in Kerala'),
  photo('pothole-verified', 'പൊന്നാനി 1zc 26.jpg', 'Ponnani, Kerala', 'Source caption: road maintenance from Kottathara to Nariparampu, Ponnani taluk, Malappuram district, Kerala, India.', 'Road patching and compaction in Kerala', 'Indian road-maintenance reference; work is shown in progress, not independent verification of the demo repair.'),
  monsoon('water-pooling', '02', '3059047958'),
  monsoon('water-recurring', '03', '3058213357'),
  monsoon('water-spreading', '04', '3058215637'),
  monsoon('water-persistent', '06', '3059058000'),
  ...repeat(['water-completed', 'obstruction-completed'], openRoad, 'OMR, Chennai', openRoadEvidence, 'Open carriageway in Chennai'),
  ...repeat(['crossing-fading', 'crossing-degraded'], crossingTitle, 'Anna University, Chennai', crossingEvidence, 'Pedestrian crossing outside Anna University'),
  ...repeat(['crossing-worn', 'crossing-absent'], 'Zebra crossing line kanhangad 01.jpg', 'Kanhangad, Kerala', 'Source caption identifies Kanhangad; categories Roads in India and Zebra crossings in India.', 'Pedestrian crossing in Kanhangad'),
  photo('crossing-completed', 'Zebra crossing line in kanhangad town.jpg', 'Kanhangad, Kerala', 'Source title/caption identifies Kanhangad; Zebra crossings in India category.', 'Marked pedestrian crossing in Kerala'),
  ...repeat([1,2,3,4].map(n => `divider-stage-${n}`), 'Truck collision with meridian on NH32 image..jpg', 'NH32, Tamil Nadu', 'Source caption: NH32 Chennai to Tuticorin; categories Road accidents in India and License plates of Tamil Nadu.', 'Truck collision at a road median on NH32'),
  photo('divider-completed', 'Road divider in Guntur.jpg', 'Guntur, Andhra Pradesh', 'Source caption: a road divider with plantation on a city road in Guntur, India.', 'Road divider in Guntur'),
  ...repeat(['guardrail-stage-1','guardrail-stage-2','guardrail-stage-3','guardrail-damaged','guardrail-completed'], barrierTitle, 'Haridwar–Uttarkashi road, Uttarakhand', barrierEvidence, 'Indian roadside crash barrier', 'Reference of an Indian roadside barrier. The photograph does not establish progressive damage or repair of the demo guardrail.'),
  ...repeat(['sign-damaged','sign-degraded','sign-missing','sign-absent','sign-completed'], signTitle, 'Chennai–Bengaluru highway', signEvidence, 'Highway direction signs in India', 'Indian direction-sign reference. This photo does not establish that the demo sign is missing, damaged, or repaired.'),
  ...repeat(['school-stage-1','school-stage-2'], schoolTitle, 'Tirtol, Odisha', schoolEvidence, 'School crossing warning sign in Odisha'),
  ...repeat(['school-stage-3','school-stage-4','school-completed'], crossingTitle, 'Anna University, Chennai', crossingEvidence, 'Campus pedestrian crossing in Chennai', 'Indian crossing reference; does not establish school staffing or safety at the demo location.'),
  ...[0,1,2].map(n => photo(`incident-frame-${n + 1}`, `Multiple Car Accident - Rabindra Sadan Area - Kolkata 2012-06-13 0132${n}.jpg`, 'Rabindra Sadan, Kolkata', 'Source caption identifies the Rabindra Sadan–SSKM Hospital crossing, Kolkata; Automobile accidents in India category.', 'Road collision in Kolkata')),
  ...repeat(['incident-frame-4','incident-frame-5'], 'Crashed Taxi - Multiple Car Accident - Rabindra Sadan Area - Kolkata 2012-06-13 01323.jpg', 'Rabindra Sadan, Kolkata', 'Source caption identifies Rabindra Sadan–SSKM Hospital crossing, Kolkata.', 'Damaged taxi following a collision in Kolkata'),
  photo('incident-plate', 'Registration plate on 1924 Rolls-Royce in Udaipur State.jpg', 'Udaipur, Rajasthan', 'Source title and caption identify a Rolls-Royce registration plate in Udaipur State.', 'Indian registration-plate reference', 'Separate Indian plate reference, not an OCR result or a crop of the demo incident.'),
  photo('motorcycle-candidate', 'Inde du Sud-0348.jpg', 'Kochi, Kerala', 'Source caption: Royal Enfield Bullet 350 Classic dans une rue de Cochin - Kerala - Inde.', 'Royal Enfield motorcycle parked in Kochi', 'Indian motorcycle reference, not evidence of unsafe riding by any pictured person.'),
  photo('road-debris', 'Clearing rocks from mountain road. Spiti.jpg', 'Spiti, Himachal Pradesh', 'Source title and caption identify rocks being cleared from a mountain road in Spiti.', 'Rock debris being cleared from an Indian road'),
  ...watchlistPhotoSelections,
];