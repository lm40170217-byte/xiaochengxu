import React, { useState, useEffect, createContext, useContext, useRef } from 'react';
import { HashRouter, Routes, Route, Link, useNavigate, useParams, Navigate, useLocation } from 'react-router-dom';
import { Home, Ticket, User as UserIcon, LogOut, ChevronLeft, MapPin, Calendar, Star, Search, Heart, Wallet, Check, AlertCircle, History, QrCode, HelpCircle, Bell, X, Share2, ChevronUp, ChevronDown, CalendarPlus, Map, CheckCircle2, XCircle, MessageSquare, ThumbsUp, ChevronRight, Quote } from 'lucide-react';
import { EVENTS, MOCK_USER, BANNERS } from './constants';
import { Event, Category, Seat, User, Ticket as TicketType } from './types';
import SeatGrid from './components/SeatGrid';

// --- Mock Data ---

const MOCK_REVIEWS = [
  { id: 1, user: '陈同学', avatar: 'https://i.pravatar.cc/100?img=1', rating: 5, date: '2024-04-10', content: '现场气氛太棒了！灯光舞美都是顶级的，强烈推荐！', likes: 124 },
  { id: 2, user: 'MusicLover', avatar: 'https://i.pravatar.cc/100?img=5', rating: 4, date: '2024-04-12', content: '整体不错，就是排队入场稍微有点慢。演出本身没得说。', likes: 45 },
  { id: 3, user: 'Joy', avatar: 'https://i.pravatar.cc/100?img=8', rating: 5, date: '2024-04-15', content: '这票价值回票价，以后有机会还会再来！', likes: 89 },
  { id: 4, user: '小李', avatar: 'https://i.pravatar.cc/100?img=12', rating: 3, date: '2024-04-16', content: '座位有点偏，看不太清楚舞台，建议大家早点选座。', likes: 12 },
  { id: 5, user: 'Sunny', avatar: 'https://i.pravatar.cc/100?img=20', rating: 5, date: '2024-04-18', content: '太震撼了，最后的大合唱感动的想哭。', likes: 230 },
];

// --- Helper Functions ---

const downloadIcs = (event: Event) => {
  // Parse date "YYYY-MM-DD HH:mm"
  const [datePart, timePart] = event.date.split(' ');
  const cleanDate = datePart.replace(/-/g, '');
  const cleanTime = timePart.replace(/:/g, '') + '00';
  const startDateTime = `${cleanDate}T${cleanTime}`;

  // Assume duration is 2 hours
  const hour = parseInt(timePart.split(':')[0], 10);
  const endHour = hour + 2;
  const endHourStr = endHour < 10 ? `0${endHour}` : `${endHour}`;
  const endDateTime = `${cleanDate}T${endHourStr}${timePart.split(':')[1]}00`;

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TicketMaster Mini//CN',
    'BEGIN:VEVENT',
    `UID:${event.id}@ticketmaster.mini`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:.]/g, '').split('T')[0]}T000000Z`,
    `DTSTART:${startDateTime}`,
    `DTEND:${endDateTime}`,
    `SUMMARY:${event.title}`,
    `DESCRIPTION:${event.description}`,
    `LOCATION:${event.location}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${event.title}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// --- Context & State ---

interface AppContextType {
  user: User | null;
  login: () => void;
  logout: () => void;
  tickets: TicketType[];
  addTicket: (ticket: TicketType) => void;
  favorites: string[];
  toggleFavorite: (eventId: string) => void;
  userRatings: Record<string, number>; // Map ticketId to rating
  rateTicket: (ticketId: string, rating: number) => void;
  addToast: (title: string, message: string) => void;
}

const AppContext = createContext<AppContextType | null>(null);

const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppContext must be used within AppProvider");
  return context;
};

// --- Toast System ---

interface ToastMessage {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success';
}

const ToastContainer: React.FC<{ toasts: ToastMessage[]; removeToast: (id: string) => void }> = ({ toasts, removeToast }) => {
  return (
    <div className="fixed top-4 left-0 right-0 z-50 flex flex-col items-center gap-2 pointer-events-none px-4">
      {toasts.map(toast => (
        <div key={toast.id} className="pointer-events-auto bg-white/95 backdrop-blur shadow-lg rounded-xl p-4 w-full max-w-sm border border-orange-100 flex gap-3 animate-in slide-in-from-top-2 fade-in duration-300">
           <div className="bg-orange-100 p-2 rounded-full h-fit text-orange-600">
              <Bell size={20} />
           </div>
           <div className="flex-1">
              <h4 className="font-bold text-gray-900 text-sm">{toast.title}</h4>
              <p className="text-xs text-gray-600 mt-1">{toast.message}</p>
           </div>
           <button onClick={() => removeToast(toast.id)} className="text-gray-400 hover:text-gray-600 h-fit">
              <X size={16} />
           </button>
        </div>
      ))}
    </div>
  )
}

// --- Components ---

const Banner: React.FC = () => {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % BANNERS.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    // Height reduced: Changed aspect ratio from [2/1] to [4/1]
    <div className="relative w-full aspect-[4/1] bg-gray-200 overflow-hidden rounded-xl mb-4 group">
      {BANNERS.map((banner, index) => (
        <Link
          to={`/event/${banner.eventId}`}
          key={banner.id}
          className={`absolute inset-0 transition-opacity duration-700 ease-in-out cursor-pointer block ${
            index === current ? 'opacity-100 z-10' : 'opacity-0 z-0'
          }`}
        >
          <img src={banner.image} alt={banner.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
            <h3 className="text-white text-sm sm:text-lg font-bold">{banner.title}</h3>
          </div>
        </Link>
      ))}
      <div className="absolute bottom-2 right-4 flex gap-1.5 z-20">
        {BANNERS.map((_, idx) => (
          <div 
            key={idx} 
            className={`w-1.5 h-1.5 rounded-full transition-all ${idx === current ? 'bg-white w-3' : 'bg-white/50'}`} 
          />
        ))}
      </div>
    </div>
  );
};

// --- Pages ---

// 1. Home Page
const HomePage: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const { addToast } = useAppContext();
  
  // Define the tabs requested
  const tabs = [
    { id: 'ALL', label: '全部' },
    { id: Category.MUSIC_FESTIVAL, label: '音乐节' },
    { id: Category.CONCERT, label: '演唱会' },
    { id: Category.SPORTS, label: '体育' },
    { id: Category.TALK_SHOW, label: '脱口秀' },
    { id: Category.DRAMA, label: '话剧' },
  ];

  const filteredEvents = EVENTS.filter(e => {
    const matchesCategory = activeCategory === 'ALL' || e.category === activeCategory;
    const matchesSearch = e.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          e.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const handleAddToCalendar = (e: React.MouseEvent, event: Event) => {
    e.preventDefault();
    downloadIcs(event);
    addToast('已添加到日历', '日程文件已下载，请查看您的日历');
  };

  return (
    <div className="pb-24">
      {/* Search Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md px-4 py-3">
        <div className="flex items-center gap-3 bg-gray-100 rounded-full px-4 py-2">
          <Search size={18} className="text-gray-400" />
          <input 
            type="text" 
            placeholder="搜索演出、赛事、话剧..." 
            className="bg-transparent border-none outline-none w-full text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </header>

      <div className="px-4">
        {/* Banner */}
        <Banner />

        {/* Categories Tabs */}
        <div className="flex gap-4 overflow-x-auto no-scrollbar mb-4 pb-2">
          {tabs.map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveCategory(tab.id)}
              className={`flex-none px-2 py-1 text-sm font-medium transition-colors border-b-2 ${
                activeCategory === tab.id 
                  ? 'text-orange-600 border-orange-600' 
                  : 'text-gray-500 border-transparent hover:text-gray-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Event List - 2 Columns */}
        <div className="grid grid-cols-2 gap-4">
          {filteredEvents.map(event => (
            <Link to={`/event/${event.id}`} key={event.id} className="group block bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
              <div className="relative aspect-[3/4] overflow-hidden">
                <img src={event.image} alt={event.title} className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/60 to-transparent p-2">
                   <span className="text-white text-[10px] bg-orange-600/90 px-1.5 py-0.5 rounded-sm">
                     {event.category}
                   </span>
                </div>
                {/* Add to Calendar Button */}
                <button
                  onClick={(e) => handleAddToCalendar(e, event)}
                  className="absolute top-2 right-2 bg-white/90 hover:bg-white p-1.5 rounded-full text-orange-600 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-10 active:scale-95"
                  title="添加到日历"
                >
                  <CalendarPlus size={16} />
                </button>
              </div>
              <div className="p-3">
                {/* Updated: Increased line clamp and removed fixed height to show longer names */}
                <h3 className="font-bold text-sm text-gray-900 mb-1 line-clamp-3 min-h-[2.5rem]">{event.title}</h3>
                <div className="flex items-center gap-1 text-gray-400 text-[10px] mb-2">
                  <Calendar size={10} />
                  <span className="truncate">{event.date.split(' ')[0]}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-red-500 font-bold text-base">
                    <span className="text-xs">￥</span>{event.price}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
        
        {filteredEvents.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <p>没有找到相关活动</p>
          </div>
        )}
      </div>
    </div>
  );
};

// 2. Reviews Page
const ReviewsPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  
  // Use global mock data
  const reviews = MOCK_REVIEWS;

  const handleBack = () => navigate(-1);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="sticky top-0 z-40 bg-white shadow-sm px-4 py-3 flex items-center gap-3">
        <button onClick={handleBack} className="p-1 -ml-1 hover:bg-gray-100 rounded-full">
          <ChevronLeft size={24} className="text-gray-700" />
        </button>
        <h1 className="font-bold text-lg text-gray-900">观众评论 ({reviews.length})</h1>
      </div>

      <div className="p-4 space-y-4">
        {reviews.map(review => (
          <div key={review.id} className="bg-white p-4 rounded-xl shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <img src={review.avatar} alt={review.user} className="w-8 h-8 rounded-full" />
                <div>
                  <div className="text-sm font-bold text-gray-800">{review.user}</div>
                  <div className="flex text-yellow-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={10} fill={i < review.rating ? "currentColor" : "none"} className={i < review.rating ? "text-yellow-400" : "text-gray-200"} />
                    ))}
                  </div>
                </div>
              </div>
              <span className="text-xs text-gray-400">{review.date}</span>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed mb-3">{review.content}</p>
            <div className="flex items-center gap-1 text-gray-400 text-xs">
              <ThumbsUp size={14} />
              <span>{review.likes}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// 3. Event Detail Page
const EventDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toggleFavorite, favorites, addToast } = useAppContext();
  const event = EVENTS.find(e => e.id === id);
  
  if (!event) return <div className="p-10 text-center">Event not found</div>;

  const isFav = favorites.includes(event.id);
  const featuredReview = MOCK_REVIEWS[0]; // Just pick first review for demo

  // Robust back navigation
  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: event.title,
          text: `一起来看${event.title}吧！`,
          url: window.location.href,
        });
      } catch (err) {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(window.location.href);
      addToast('已复制链接', '活动链接已复制到剪贴板');
    }
  };

  const handleAddToCalendar = () => {
    downloadIcs(event);
    addToast('已添加到日历', '日程文件已下载，请查看您的日历');
  };

  return (
    <div className="pb-24 bg-white min-h-screen">
      {/* Top Nav */}
      <div className="fixed top-0 left-0 right-0 z-40 flex justify-between items-start p-4 bg-gradient-to-b from-black/50 to-transparent pointer-events-none md:max-w-4xl md:mx-auto">
        <button onClick={handleBack} className="pointer-events-auto bg-white/20 backdrop-blur-md p-2 rounded-full text-white hover:bg-white/30 active:scale-95 transition-all">
          <ChevronLeft size={24} />
        </button>
        <div className="flex flex-col gap-3">
          <button 
            onClick={() => toggleFavorite(event.id)}
            className="pointer-events-auto bg-white/20 backdrop-blur-md p-2 rounded-full text-white hover:bg-white/30 transition-transform active:scale-95"
            title="收藏"
          >
            <Heart size={24} fill={isFav ? "currentColor" : "none"} className={isFav ? "text-red-500" : "text-white"} />
          </button>
          <button 
            onClick={handleShare}
            className="pointer-events-auto bg-white/20 backdrop-blur-md p-2 rounded-full text-white hover:bg-white/30 transition-transform active:scale-95"
            title="分享"
          >
            <Share2 size={24} />
          </button>
          <button 
            onClick={handleAddToCalendar}
            className="pointer-events-auto bg-white/20 backdrop-blur-md p-2 rounded-full text-white hover:bg-white/30 transition-transform active:scale-95"
            title="添加到日历"
          >
            <CalendarPlus size={24} />
          </button>
        </div>
      </div>

      {/* Hero Image */}
      <div className="relative h-[60vh] sm:h-[50vh] w-full">
        <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent z-10" />
        <img src={event.image} alt={event.title} className="w-full h-full object-cover" />
      </div>

      {/* Content */}
      <div className="relative z-10 -mt-20 px-4">
        <div className="bg-white rounded-t-3xl p-6 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] min-h-[50vh]">
          <div className="flex gap-2 mb-3">
            {event.tags.map(tag => (
              <span key={tag} className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 bg-orange-50 text-orange-600 rounded-md">
                {tag}
              </span>
            ))}
          </div>
          
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">{event.title}</h1>
          
          {/* Price Range */}
          <div className="flex items-baseline gap-1 mb-4">
             <span className="text-lg font-bold text-red-500">¥</span>
             <span className="text-3xl font-bold text-red-500">{event.price}</span>
             <span className="text-gray-400 font-medium mx-1">~</span>
             <span className="text-3xl font-bold text-red-500">{Math.floor(event.price * 2.5)}</span>
          </div>
          
          {/* Location with Map Button */}
          <div className="flex items-center justify-between py-4 border-t border-gray-100">
             <div className="flex flex-col max-w-[70%]">
                <span className="font-bold text-gray-900 text-lg leading-tight">{event.location}</span>
                <span className="text-xs text-gray-500 mt-1 truncate">北京市朝阳区具体街道门牌号信息...</span>
             </div>
             <button className="flex items-center gap-1 text-orange-600 bg-orange-50 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap active:bg-orange-100">
                <Map size={14} />
                查看地图
             </button>
          </div>

          {/* Service Tags */}
          <div className="flex items-center gap-4 text-xs text-gray-500 pb-4 border-b border-gray-100 mb-4">
             <div className="flex items-center gap-1">
                <XCircle size={14} className="text-gray-400" />
                <span>不支持退票</span>
             </div>
             <div className="flex items-center gap-1">
                <CheckCircle2 size={14} className="text-orange-600" />
                <span>可选座</span>
             </div>
             <div className="flex items-center gap-1">
                <CheckCircle2 size={14} className="text-orange-600" />
                <span>电子票</span>
             </div>
          </div>
          
          {/* Rating and Featured Review */}
          <div className="flex items-start gap-3 mb-6 p-3 bg-gray-50 rounded-xl">
            {/* Left: Rating Box */}
            <div className="bg-white p-2 rounded-lg shadow-sm text-center min-w-[70px] flex flex-col justify-center self-stretch">
              <span className="block text-2xl font-bold text-yellow-500">{event.rating}</span>
              <span className="block text-[10px] text-gray-400">综合评分</span>
            </div>
            
            {/* Right: Featured Review */}
            <div className="flex-1 flex flex-col justify-between gap-2 min-h-[60px]">
               <div className="relative pl-2">
                 <Quote size={12} className="absolute -top-1 -left-1 text-orange-200 fill-orange-200 rotate-180" />
                 <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                   {featuredReview.content}
                 </p>
               </div>
               
               <div className="flex items-center justify-between mt-1 border-t border-gray-200/50 pt-2">
                  <div className="flex items-center gap-1.5">
                     <img src={featuredReview.avatar} alt="user" className="w-5 h-5 rounded-full border border-white shadow-sm" />
                     <span className="text-[10px] text-gray-500 font-medium">{featuredReview.user}</span>
                  </div>
                  <Link to={`/event/${event.id}/reviews`} className="flex items-center gap-0.5 text-xs text-orange-600 font-medium hover:text-orange-700">
                    查看评论 <ChevronRight size={12} />
                  </Link>
               </div>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="font-semibold text-lg mb-2">简介</h3>
            <p className="text-gray-600 leading-relaxed text-sm">{event.description}</p>
          </div>

          {/* Supplementary Content */}
          <div className="mb-8 border-t pt-6">
            <div className="flex items-center gap-2 mb-3">
               <AlertCircle size={18} className="text-orange-600"/>
               <h3 className="font-semibold text-lg">购票须知</h3>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600 space-y-2">
                <p>• <span className="font-medium text-gray-800">限购说明：</span>每单限购6张</p>
                <p>• <span className="font-medium text-gray-800">退换政策：</span>票品为有价证券，非不可抗力因素谢绝退换</p>
                <p>• <span className="font-medium text-gray-800">入场规则：</span>请携带有效身份证件，提前30分钟入场</p>
                <p>• <span className="font-medium text-gray-800">儿童购票：</span>1.2米以上凭成人票入场，1.2米以下谢绝入场</p>
            </div>
          </div>

          {/* How to Buy Guide */}
          <div className="mb-8 border-t border-dashed pt-6">
             <div className="flex items-center gap-2 mb-3">
               <HelpCircle size={18} className="text-orange-600"/>
               <h3 className="font-semibold text-lg">如何购票</h3>
            </div>
            <div className="bg-orange-50/40 border border-orange-100 rounded-xl p-4 text-sm text-gray-600 space-y-3">
                <p>1. 点击页面底部的 <span className="font-bold text-orange-600">“立即选座”</span> 按钮进入选座流程。</p>
                <div>
                   <p className="mb-2">2. 在实时座位图中选择座位：</p>
                   <div className="flex gap-4 text-xs bg-white p-2 rounded-lg border border-orange-50 w-fit shadow-sm">
                      <div className="flex items-center gap-1"><div className="w-3 h-3 border border-gray-300 bg-white rounded-sm"></div>可选</div>
                      <div className="flex items-center gap-1"><div className="w-3 h-3 bg-gray-200 rounded-sm"></div>已售</div>
                      <div className="flex items-center gap-1"><div className="w-3 h-3 bg-orange-600 rounded-sm"></div>已选</div>
                   </div>
                </div>
                <p>3. 确认座位信息无误后，提交订单完成支付，电子票将存入您的“票夹”。</p>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t flex items-center justify-between z-30 md:max-w-4xl md:mx-auto">
        <div>
          <span className="text-xs text-gray-500 block">总价</span>
          <span className="text-red-500 font-bold text-xl"><span className="text-xs">￥</span>{event.price}</span>
          <span className="text-gray-400 text-xs ml-1">起</span>
        </div>
        <Link 
          to={`/event/${event.id}/book`} 
          className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-3 rounded-full font-bold shadow-lg shadow-orange-200 transition-all active:scale-95"
        >
          立即选座
        </Link>
      </div>
    </div>
  );
};

// 4. Booking Page (Seat Selection)
const BookingPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, addTicket } = useAppContext();
  const event = EVENTS.find(e => e.id === id);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showPriceDetails, setShowPriceDetails] = useState(false);
  
  // Date Selection State
  const [selectedSessionIndex, setSelectedSessionIndex] = useState(0);

  // Helper to generate sessions based on event date
  const getSessions = (baseDateStr: string) => {
    // baseDateStr format: "2024-05-01 13:30"
    const [datePart, timePart] = baseDateStr.split(' ');
    const baseDate = new Date(datePart.replace(/-/g, '/')); // Replace for safari compatibility
    
    const sessions = [];
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    
    for (let i = 0; i < 4; i++) {
        const d = new Date(baseDate);
        d.setDate(baseDate.getDate() + i);
        const month = d.getMonth() + 1;
        const day = d.getDate();
        const weekDay = weekDays[d.getDay()];
        sessions.push({
            id: i,
            fullDate: `${d.getFullYear()}-${month < 10 ? '0'+month : month}-${day < 10 ? '0'+day : day} ${timePart}`,
            displayDate: `${month < 10 ? '0'+month : month}-${day < 10 ? '0'+day : day}`,
            weekDay: weekDay,
            time: timePart
        });
    }
    return sessions;
  };

  const sessions = event ? getSessions(event.date) : [];

  // Robust back navigation
  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  // Generate mock seats
  const [seats, setSeats] = useState<Seat[]>(() => {
    const rows = 8;
    const cols = 8;
    const generated: Seat[] = [];
    for (let r = 1; r <= rows; r++) {
      for (let c = 1; c <= cols; c++) {
        const isOccupied = Math.random() < 0.2;
        generated.push({
          id: `${r}-${c}`,
          row: r,
          col: c,
          status: isOccupied ? 'occupied' : 'available',
          price: event ? event.price : 100
        });
      }
    }
    return generated;
  });

  // Reset seats when session changes (Mock logic)
  useEffect(() => {
    setSeats(prev => prev.map(s => ({
        ...s,
        status: Math.random() < 0.2 ? 'occupied' : 'available'
    })));
  }, [selectedSessionIndex]);

  if (!event) return null;
  if (!user) return <Navigate to="/login" replace />;

  const toggleSeat = (seatId: string) => {
    setSeats(prev => prev.map(s => {
      if (s.id === seatId) {
        if (s.status === 'available') return { ...s, status: 'selected' };
        if (s.status === 'selected') return { ...s, status: 'available' };
      }
      return s;
    }));
  };

  const selectedSeats = seats.filter(s => s.status === 'selected');
  const totalPrice = selectedSeats.reduce((sum, s) => sum + s.price, 0);

  const handleCheckout = () => {
    if (selectedSeats.length === 0) return;
    
    const selectedSession = sessions[selectedSessionIndex];

    const newTicket: TicketType = {
      id: Date.now().toString(),
      eventId: event.id,
      eventTitle: event.title, // In a real app, might append session info
      seats: selectedSeats.map(s => `${s.row}排${s.col}座`),
      totalPrice,
      purchaseDate: new Date().toLocaleDateString(),
    };
    
    // NOTE: In a real app, we would store the specific session date in the ticket.
    // For this mock, we are just storing the generic event info, but conceptually
    // the user bought a ticket for: selectedSession.fullDate
    
    addTicket(newTicket);
    setShowSuccessModal(true);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <div className="sticky top-0 z-50 p-4 bg-white/95 backdrop-blur-sm shadow-sm flex items-center gap-3">
        <button 
          onClick={handleBack} 
          className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors active:bg-gray-200"
        >
          <ChevronLeft className="text-gray-700" />
        </button>
        <h1 className="font-bold text-lg text-gray-900 truncate flex-1">{event.title}</h1>
      </div>

      {/* Date/Session Selection Bar */}
      <div className="bg-white border-b border-gray-100">
         <div className="flex overflow-x-auto no-scrollbar py-3 px-4 gap-3">
            {sessions.map((session, index) => (
               <button
                 key={index}
                 onClick={() => setSelectedSessionIndex(index)}
                 className={`flex-none flex flex-col items-center justify-center w-24 py-2 rounded-lg border transition-all ${
                    selectedSessionIndex === index 
                      ? 'bg-orange-50 border-orange-500 text-orange-600' 
                      : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                 }`}
               >
                  <span className="text-xs font-medium">{session.displayDate} {session.weekDay}</span>
                  <span className={`text-sm font-bold mt-0.5 ${selectedSessionIndex === index ? 'text-orange-700' : 'text-gray-800'}`}>
                    {session.time}
                  </span>
               </button>
            ))}
         </div>
      </div>

      <div className="flex-1 overflow-y-auto pt-4 px-4 pb-24">
        <SeatGrid seats={seats} onToggleSeat={toggleSeat} />
      </div>

      <div className="bg-white border-t relative z-20">
        {/* Expandable Price Details Panel */}
        {showPriceDetails && selectedSeats.length > 0 && (
          <div className="absolute bottom-full left-0 right-0 bg-white border-t border-gray-100 shadow-[0_-8px_20px_rgba(0,0,0,0.1)] p-4 rounded-t-2xl animate-in slide-in-from-bottom-5 fade-in duration-200">
             <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-2">
                 <h3 className="font-bold text-gray-800">价格明细</h3>
                 <span className="text-gray-500 text-xs">已选 {selectedSeats.length} 张</span>
             </div>
             <div className="max-h-[200px] overflow-y-auto space-y-3 custom-scrollbar">
                 {selectedSeats.map(seat => (
                     <div key={seat.id} className="flex justify-between text-sm items-center">
                         <div className="flex items-center gap-2">
                           <span className="w-1.5 h-1.5 bg-orange-500 rounded-full"></span>
                           <span className="text-gray-600 font-medium">{seat.row}排{seat.col}座</span>
                         </div>
                         <span className="font-bold text-gray-900">￥{seat.price}</span>
                     </div>
                 ))}
             </div>
          </div>
        )}

        {/* Bottom Bar Content */}
        <div className="p-4 bg-white relative z-30">
          <div className="flex justify-between items-center mb-3">
             <div className="text-sm text-gray-500 truncate w-full flex items-center gap-2">
               <span className="bg-orange-100 text-orange-700 text-[10px] px-1.5 py-0.5 rounded">
                  {sessions[selectedSessionIndex].displayDate} {sessions[selectedSessionIndex].time}
               </span>
               <span className="truncate">
                 {selectedSeats.length > 0 
                   ? `已选: ${selectedSeats.map(s => `${s.row}排${s.col}`).join(',')}` 
                   : '请选择座位'}
               </span>
             </div>
          </div>
          
          <div className="flex gap-4 items-center">
             <div 
               className={`flex-1 ${selectedSeats.length > 0 ? 'cursor-pointer' : 'cursor-default'}`}
               onClick={() => selectedSeats.length > 0 && setShowPriceDetails(!showPriceDetails)}
             >
                <div className="flex items-end gap-2">
                   <div className="text-red-500 font-bold text-2xl leading-none">
                     <span className="text-sm">￥</span>{totalPrice}
                   </div>
                   {selectedSeats.length > 0 && (
                     <div className="flex items-center gap-0.5 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full mb-0.5">
                       明细 {showPriceDetails ? <ChevronDown size={10} /> : <ChevronUp size={10} />}
                     </div>
                   )}
                </div>
             </div>
             <button 
               disabled={selectedSeats.length === 0}
               onClick={handleCheckout}
               className="bg-orange-600 disabled:bg-gray-300 text-white px-8 py-3 rounded-xl font-bold w-1/2 transition-colors shadow-lg shadow-orange-100"
             >
               确认支付
             </button>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl transform transition-all scale-100 animate-in zoom-in-95 duration-200">
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Check size={32} strokeWidth={3} />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">支付成功</h2>
                    <p className="text-gray-500 mt-1">您的订单已确认，祝您观演愉快！</p>
                </div>
                
                <div className="bg-gray-50 rounded-2xl p-4 mb-6 space-y-3">
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500">演出名称</span>
                        <span className="font-medium text-right flex-1 ml-4 truncate">{event.title}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500">场次时间</span>
                        <span className="font-medium text-right text-gray-800">
                          {sessions[selectedSessionIndex].fullDate}
                        </span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500">座位信息</span>
                        <span className="font-medium text-right text-orange-600">
                          {selectedSeats.length}张 
                          <span className="text-gray-400 text-xs ml-1">
                             ({selectedSeats.length > 2 ? `${selectedSeats[0].row}排...等` : selectedSeats.map(s => `${s.row}排${s.col}`).join(',')})
                          </span>
                        </span>
                    </div>
                    <div className="flex justify-between text-sm border-t border-dashed border-gray-200 pt-3 mt-2">
                        <span className="text-gray-500">实付金额</span>
                        <span className="font-bold text-lg text-red-500">￥{totalPrice}</span>
                    </div>
                </div>
                
                <div className="flex gap-3">
                    <button 
                      onClick={() => navigate('/')} 
                      className="flex-1 py-3.5 text-gray-600 font-bold bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                    >
                      返回首页
                    </button>
                    <button 
                      onClick={() => navigate('/wallet')} 
                      className="flex-1 py-3.5 text-white font-bold bg-orange-600 rounded-xl hover:bg-orange-700 transition-colors shadow-lg shadow-orange-200"
                    >
                      查看票夹
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

// 5. Wallet Page (New)
const WalletPage: React.FC = () => {
  const { tickets, user, login, userRatings, rateTicket } = useAppContext();

  // Sort and split tickets
  const now = new Date();
  const sortedTickets = [...tickets].sort((a, b) => {
    // Sort by event date reverse chronological
    const eventA = EVENTS.find(e => e.id === a.eventId);
    const eventB = EVENTS.find(e => e.id === b.eventId);
    if (!eventA || !eventB) return 0;
    return new Date(eventB.date).getTime() - new Date(eventA.date).getTime();
  });

  const upcomingTickets: TicketType[] = [];
  const pastTickets: TicketType[] = [];

  sortedTickets.forEach(t => {
    const event = EVENTS.find(e => e.id === t.eventId);
    if (event && new Date(event.date) < now) {
      pastTickets.push(t);
    } else {
      upcomingTickets.push(t);
    }
  });

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] p-6 text-center">
        <Wallet size={48} className="text-gray-300 mb-4" />
        <p className="text-gray-500 mb-6">登录后查看您的票夹</p>
        <button onClick={login} className="px-6 py-2 bg-orange-600 text-white rounded-full text-sm font-medium">去登录</button>
      </div>
    );
  }

  const renderTicketCard = (ticket: TicketType, isPast: boolean) => {
    const event = EVENTS.find(e => e.id === ticket.eventId);
    const userRating = userRatings[ticket.id] || 0;
    
    // QR Code API (using ticket ID)
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${ticket.id}`;

    return (
      <div key={ticket.id} className={`relative bg-white rounded-2xl shadow-md overflow-hidden transition-all ${isPast ? 'opacity-80 grayscale-[0.8]' : 'hover:shadow-lg'}`}>
        
        {/* Ticket Header (Event Info) */}
        <div className="p-4 flex gap-4">
          <img 
            src={event?.image} 
            alt="Event" 
            className="w-16 h-20 object-cover rounded-lg flex-shrink-0 bg-gray-200"
          />
          <div className="flex-1 min-w-0 flex flex-col justify-between">
            <div>
               <h4 className="font-bold text-gray-900 line-clamp-2 leading-tight">{ticket.eventTitle}</h4>
               {event && (
                 <div className="mt-1 text-xs text-gray-500 flex flex-col gap-0.5">
                   <span className="flex items-center gap-1"><Calendar size={10} /> {event.date}</span>
                   <span className="flex items-center gap-1"><MapPin size={10} /> {event.location}</span>
                 </div>
               )}
            </div>
          </div>
        </div>

        {/* Perforated Divider */}
        <div className="relative h-6 flex items-center justify-center">
            {/* Left Notch */}
            <div className="absolute left-[-12px] w-6 h-6 bg-gray-50 rounded-full"></div>
            {/* Dashed Line */}
            <div className="w-full mx-4 border-b-2 border-dashed border-gray-200"></div>
            {/* Right Notch */}
            <div className="absolute right-[-12px] w-6 h-6 bg-gray-50 rounded-full"></div>
        </div>

        {/* Ticket Body (Seats & QR) */}
        <div className="p-4 pt-0 flex justify-between items-center">
            <div className="flex flex-col justify-center gap-1">
                <div className="text-xs text-gray-400">座位信息</div>
                <div className="font-bold text-orange-600 text-lg">{ticket.seats.length} 张票</div>
                <div className="text-xs text-gray-500 max-w-[150px] truncate">{ticket.seats.join(', ')}</div>
                
                {/* Past Event Rating */}
                {isPast && (
                  <div className="mt-2 flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button 
                        key={star}
                        onClick={() => rateTicket(ticket.id, star)}
                        className="focus:outline-none"
                      >
                        <Star 
                          size={14} 
                          fill={star <= userRating ? "#EAB308" : "none"} 
                          className={star <= userRating ? "text-yellow-500" : "text-gray-300"}
                        />
                      </button>
                    ))}
                  </div>
                )}
            </div>

            {/* QR Code Section */}
            <div className="flex flex-col items-center gap-1">
                <div className="w-20 h-20 bg-gray-100 p-1 rounded-lg">
                    <img src={qrCodeUrl} alt="QR Code" className="w-full h-full mix-blend-multiply" />
                </div>
                <div className="text-[10px] text-gray-400 font-mono">{ticket.id.slice(-6)}</div>
            </div>
        </div>

        {/* Status Overlay for Past Events */}
        {isPast && (
           <div className="absolute top-4 right-4 border-2 border-gray-300 text-gray-300 rounded-lg px-2 py-1 transform rotate-12 font-bold text-xs uppercase tracking-widest pointer-events-none">
             已核销
           </div>
        )}
      </div>
    );
  };

  return (
    <div className="pb-24 px-4 pt-6 min-h-screen bg-gray-50">
      <h1 className="text-2xl font-bold mb-6">我的票夹</h1>
      
      {tickets.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm bg-white rounded-xl border border-dashed border-gray-200">
          暂无演出票，快去选购吧
        </div>
      ) : (
        <div className="space-y-8">
          {upcomingTickets.length > 0 && (
            <div>
               <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-green-500"></div>
                 待参加
               </h3>
               <div className="space-y-4">
                 {upcomingTickets.map(t => renderTicketCard(t, false))}
               </div>
            </div>
          )}

          {pastTickets.length > 0 && (
            <div>
               <h3 className="font-semibold text-gray-500 mb-3 flex items-center gap-2">
                 <History size={16} />
                 历史订单
               </h3>
               <div className="space-y-4">
                 {pastTickets.map(t => renderTicketCard(t, true))}
               </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// 6. Favorites Page (New)
const FavoritesPage: React.FC = () => {
  const { favorites } = useAppContext();
  const favEvents = EVENTS.filter(e => favorites.includes(e.id));

  return (
    <div className="pb-24 px-4 pt-6 min-h-screen bg-gray-50">
      <h1 className="text-2xl font-bold mb-6">我的收藏</h1>
      <div className="space-y-4">
        {favEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[50vh] text-gray-400">
            <Heart size={48} className="text-gray-200 mb-4" />
            <p>暂无收藏内容</p>
          </div>
        ) : (
          favEvents.map(event => (
            <Link to={`/event/${event.id}`} key={event.id} className="flex gap-4 bg-white p-3 rounded-xl shadow-sm">
              <img src={event.image} alt={event.title} className="w-24 h-32 object-cover rounded-lg flex-shrink-0" />
              <div className="flex flex-col justify-between py-1 flex-1">
                <div>
                  <h3 className="font-bold text-gray-900 line-clamp-2">{event.title}</h3>
                  <div className="text-xs text-gray-500 mt-1">{event.date}</div>
                  <div className="text-xs text-gray-500">{event.location}</div>
                </div>
                <div className="flex justify-between items-end">
                   <span className="text-red-500 font-bold">￥{event.price}</span>
                   <span className="text-xs bg-orange-50 text-orange-600 px-2 py-1 rounded">{event.category}</span>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
};

// 7. Profile Page
const ProfilePage: React.FC = () => {
  const { user, login, logout } = useAppContext();

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-6 bg-white">
        <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mb-6 text-orange-600">
          <UserIcon size={40} />
        </div>
        <h2 className="text-2xl font-bold mb-2">欢迎来到票务通</h2>
        <p className="text-gray-500 mb-8 text-center">登录后体验完整功能</p>
        <button 
          onClick={login}
          className="w-full max-w-xs bg-orange-600 text-white py-3 rounded-xl font-bold hover:bg-orange-700 transition-colors"
        >
          立即登录 / 注册
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-orange-600 text-white pt-10 pb-20 px-6 rounded-b-[2.5rem] shadow-lg relative overflow-hidden">
         <div className="absolute top-0 right-0 p-10 opacity-10 transform translate-x-1/4 -translate-y-1/4">
            <Ticket size={200} />
         </div>
         <div className="relative z-10 flex items-center gap-4">
           <img src={user.avatar} alt="Avatar" className="w-16 h-16 rounded-full border-4 border-white/30" />
           <div>
             <h2 className="text-xl font-bold">{user.name}</h2>
             <p className="text-orange-200 text-sm">{user.email}</p>
           </div>
         </div>
      </div>

      <div className="px-4 -mt-12 relative z-10">
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-6 flex flex-col gap-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
             <span className="text-gray-600">会员等级</span>
             <span className="font-bold text-orange-600">黄金会员</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
             <span className="text-gray-600">账户余额</span>
             <span className="font-bold">￥0.00</span>
          </div>
        </div>

        <button 
          onClick={logout}
          className="w-full bg-white text-red-500 py-3 rounded-xl font-medium shadow-sm flex items-center justify-center gap-2 hover:bg-red-50 transition-colors"
        >
          <LogOut size={18} /> 退出登录
        </button>
      </div>
    </div>
  );
};

// --- Main Layout ---

const Navbar: React.FC = () => {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;
  const hideNav = location.pathname.includes('/book') || location.pathname.includes('/reviews');

  if (hideNav) return null;

  const navItems = [
    { path: '/', label: '首页', icon: Home },
    { path: '/wallet', label: '票夹', icon: Wallet },
    { path: '/favorites', label: '收藏', icon: Heart },
    { path: '/profile', label: '我的', icon: UserIcon },
  ];

  return (
    <nav className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-100 py-2 px-2 sm:px-6 flex justify-between items-center z-40 text-[10px] font-medium md:max-w-4xl md:mx-auto md:relative md:border-t-0 md:rounded-t-none">
      {navItems.map(item => (
        <Link 
          key={item.path}
          to={item.path} 
          className={`flex-1 flex flex-col items-center gap-1 transition-colors py-1 ${isActive(item.path) ? 'text-orange-600' : 'text-gray-400'}`}
        >
          <item.icon size={22} strokeWidth={isActive(item.path) ? 2.5 : 2} />
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [userRatings, setUserRatings] = useState<Record<string, number>>({});
  
  // Toast state
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const notifiedRef = useRef<Set<string>>(new Set());

  const addToast = (title: string, message: string) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, title, message, type: 'info' }]);
    setTimeout(() => removeToast(id), 5000); // Auto remove after 5s
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const login = () => setUser(MOCK_USER);
  const logout = () => setUser(null);
  const addTicket = (t: TicketType) => setTickets(prev => [t, ...prev]);
  const toggleFavorite = (id: string) => {
    setFavorites(prev => 
      prev.includes(id) ? prev.filter(fid => fid !== id) : [...prev, id]
    );
  };
  const rateTicket = (ticketId: string, rating: number) => {
    setUserRatings(prev => ({ ...prev, [ticketId]: rating }));
  };

  // Event Reminder Logic
  useEffect(() => {
    const checkUpcomingEvents = () => {
      const now = new Date();
      // Only checking events in the next 24 hours
      const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      tickets.forEach(ticket => {
        const event = EVENTS.find(e => e.id === ticket.eventId);
        if (!event) return;

        // Parse date "YYYY-MM-DD HH:mm". Replace space with T for better compatibility
        const eventDate = new Date(event.date.replace(' ', 'T'));
        
        // If event is valid, in the future, and within 24h
        if (!isNaN(eventDate.getTime()) && eventDate > now && eventDate <= next24h) {
          // Check if already notified this session
          if (!notifiedRef.current.has(ticket.id)) {
             addToast('演出临近提醒', `您预订的《${event.title}》将在24小时内开始，请做好出行准备！`);
             notifiedRef.current.add(ticket.id);
          }
        }
      });
    };
    
    // Check on mount and every minute
    checkUpcomingEvents();
    const interval = setInterval(checkUpcomingEvents, 60000);
    return () => clearInterval(interval);
  }, [tickets]);

  return (
    <AppContext.Provider value={{ user, login, logout, tickets, addTicket, favorites, toggleFavorite, userRatings, rateTicket, addToast }}>
      <HashRouter>
        <div className="min-h-screen bg-gray-50 md:max-w-4xl md:mx-auto md:shadow-2xl md:min-h-screen relative">
          <ToastContainer toasts={toasts} removeToast={removeToast} />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/wallet" element={<WalletPage />} />
            <Route path="/favorites" element={<FavoritesPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/event/:id" element={<EventDetailPage />} />
            <Route path="/event/:id/reviews" element={<ReviewsPage />} />
            <Route path="/event/:id/book" element={<BookingPage />} />
            <Route path="/login" element={<Navigate to="/profile" />} />
          </Routes>
          <Navbar />
        </div>
      </HashRouter>
    </AppContext.Provider>
  );
};

export default App;