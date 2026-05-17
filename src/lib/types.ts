export interface Coordinate {
  lat: number;
  lng: number;
  name?: string;
}

export interface TimelineEvent {
  status: string;
  time: string;
}

export interface Shipment {
  id: string;
  customerName: string;
  packageName: string;
  origin: Coordinate;
  destination: Coordinate;
  progress: number; // 0 to 100
  status: string;
  timeline: TimelineEvent[];
}
