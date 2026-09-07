import type { PoliceStation } from '../../types/city';

// Illustrative station locations for the Chennai demo, NOT verified station addresses.
// Independent of jurisdiction map centers. Replace with an authoritative directory
// before real-world use; no station or emergency service is contacted by this demo.
export const demoPoliceStations: PoliceStation[] = [
  { id: 'station-teynampet', name: 'Teynampet Police Station', latitude: 13.0445, longitude: 80.2500 },
  { id: 'station-saidapet', name: 'Saidapet Police Station', latitude: 13.0210, longitude: 80.2240 },
  { id: 'station-guindy', name: 'Guindy Police Station', latitude: 13.0080, longitude: 80.2120 },
  { id: 'station-velachery', name: 'Velachery Police Station', latitude: 12.9755, longitude: 80.2205 },
  { id: 'station-adyar', name: 'Adyar Police Station', latitude: 13.0060, longitude: 80.2570 },
  { id: 'station-thoraipakkam', name: 'Thoraipakkam Police Station', latitude: 12.9415, longitude: 80.2360 },
  { id: 'station-sholinganallur', name: 'Sholinganallur Police Station', latitude: 12.8990, longitude: 80.2275 },
];