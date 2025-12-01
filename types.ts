export enum Category {
  MUSIC_FESTIVAL = '音乐节',
  CONCERT = '演唱会',
  SPORTS = '体育',
  TALK_SHOW = '脱口秀',
  DRAMA = '话剧',
  MOVIE = '电影', // Keeping for backward compatibility if needed, though not in tabs
  SCENIC = '景区', // Keeping for backward compatibility
}

export interface Event {
  id: string;
  title: string;
  category: Category;
  image: string;
  rating: number;
  price: number;
  date: string;
  location: string;
  description: string;
  tags: string[];
}

export interface Seat {
  id: string;
  row: number;
  col: number;
  status: 'available' | 'occupied' | 'selected';
  price: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
}

export interface Ticket {
  id: string;
  eventId: string;
  eventTitle: string;
  seats: string[]; // e.g., "3排5座"
  totalPrice: number;
  purchaseDate: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}