import { useState } from "react";
import { Star, ChevronRight, Share2, Heart, Globe, Lock, Phone, Users, Clock, Bell, MapPin, CalendarOff } from "lucide-react";

const SCREENS = [
  { label: "Dashboard", src: "/__mockup/images/screen-dashboard.jpg" },
  { label: "Jobs",      src: "/__mockup/images/screen-jobs.jpg" },
  { label: "Crew",      src: "/__mockup/images/screen-crew.jpg" },
];

function StarRating({ rating, count }: { rating: number; count: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-4xl font-bold text-gray-900">{rating}</span>
      <div className="flex gap-0.5 mt-1">
        {[1,2,3,4,5].map(i => (
          <Star key={i} className={`h-3 w-3 ${i <= Math.floor(rating) ? "fill-gray-800 text-gray-800" : "fill-gray-300 text-gray-300"}`} />
        ))}
      </div>
      <span className="text-xs text-gray-500 mt-1">{count} Ratings</span>
    </div>
  );
}

function PhoneFrame({ src, label }: { src: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2 shrink-0">
      <div className="relative w-[160px] h-[320px] rounded-[28px] border-[6px] border-gray-900 bg-gray-900 shadow-2xl overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-5 bg-gray-900 rounded-b-2xl z-10" />
        <img
          src={src}
          alt={label}
          className="w-full h-full object-cover object-left-top"
        />
      </div>
      <span className="text-xs text-gray-500 font-medium">{label}</span>
    </div>
  );
}

function ReviewCard({ name, rating, date, title, body }: { name: string; rating: number; date: string; title: string; body: string }) {
  return (
    <div className="bg-gray-100 rounded-2xl p-4 min-w-[260px] max-w-[260px] shrink-0">
      <div className="flex justify-between items-center mb-1">
        <div className="flex gap-0.5">
          {[1,2,3,4,5].map(i => (
            <Star key={i} className={`h-3 w-3 ${i <= rating ? "fill-amber-400 text-amber-400" : "fill-gray-300 text-gray-300"}`} />
          ))}
        </div>
        <span className="text-xs text-gray-400">{date}</span>
      </div>
      <p className="font-semibold text-sm text-gray-900 mb-1">{title}</p>
      <p className="text-xs text-gray-600 leading-relaxed">{body}</p>
      <p className="text-xs text-gray-400 mt-2">{name}</p>
    </div>
  );
}

export function AppStoreListing() {
  const [liked, setLiked] = useState(false);
  const [activeScreen, setActiveScreen] = useState(0);
  const [showFullDesc, setShowFullDesc] = useState(false);

  const short = "Saguaro puts your entire field operation in one place. Schedule jobs, assign crew, track tasks, clock time, and communicate with your team — all from your browser.";
  const full  = short + "\n\nBuilt for field operations managers who need real-time visibility across multiple job sites. Features include:\n\n• Job booking & scheduling with status tracking\n• Crew assignment and document management\n• Per-job group messaging & photo uploads\n• GPS-ready job site locations\n• Time-off requests with admin approval\n• Clock-in / clock-out time tracking\n• Universal notifications inbox\n• Job contact management";

  return (
    <div className="min-h-screen bg-white font-['SF_Pro_Display',system-ui,sans-serif] max-w-[430px] mx-auto border-x border-gray-200 shadow-xl">

      {/* iOS Status Bar */}
      <div className="flex justify-between items-center px-6 pt-3 pb-1">
        <span className="text-xs font-semibold text-gray-900">9:41</span>
        <div className="flex gap-1 items-center">
          <div className="flex gap-0.5 items-end h-3">
            {[2,3,4,5].map((h,i) => <div key={i} style={{height:`${h*2}px`}} className="w-1 bg-gray-900 rounded-sm" />)}
          </div>
          <svg className="h-3 w-4" viewBox="0 0 24 12" fill="currentColor"><rect x="0" y="3" width="22" height="9" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/><rect x="22" y="5" width="2" height="5" rx="1" fill="currentColor"/><rect x="1" y="4" width="20" height="7" rx="1" fill="currentColor"/></svg>
        </div>
      </div>

      {/* Top Nav */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
        <button className="text-[#1a7f37] font-medium text-sm flex items-center gap-1">
          <ChevronRight className="h-4 w-4 rotate-180" /> Apps
        </button>
        <div className="flex gap-4">
          <button onClick={() => setLiked(!liked)}>
            <Heart className={`h-5 w-5 ${liked ? "fill-red-500 text-red-500" : "text-gray-400"}`} />
          </button>
          <button><Share2 className="h-5 w-5 text-[#1a7f37]" /></button>
        </div>
      </div>

      {/* App Header */}
      <div className="flex items-start gap-4 px-4 py-4">
        {/* App Icon */}
        <div className="w-24 h-24 rounded-[20px] bg-[#1a7f37] flex items-center justify-center shadow-lg shrink-0">
          <svg viewBox="0 0 60 60" className="w-14 h-14" fill="white">
            {/* Cactus body */}
            <rect x="25" y="30" width="10" height="22" rx="3" />
            {/* Left arm */}
            <rect x="13" y="28" width="13" height="7" rx="3" />
            <rect x="13" y="20" width="7" height="15" rx="3" />
            {/* Right arm */}
            <rect x="34" y="24" width="13" height="7" rx="3" />
            <rect x="40" y="16" width="7" height="16" rx="3" />
            {/* Hard hat brim */}
            <rect x="18" y="26" width="24" height="4" rx="2" />
            {/* Hard hat dome */}
            <ellipse cx="30" cy="22" rx="12" ry="9" />
            {/* Hat stripe */}
            <rect x="18" y="24" width="24" height="3" rx="1" fill="#0f5a27" />
            {/* Ground */}
            <rect x="20" y="50" width="20" height="4" rx="2" />
          </svg>
        </div>
        <div className="flex-1 min-w-0 pt-1">
          <h1 className="text-xl font-bold text-gray-900 leading-tight">Saguaro</h1>
          <p className="text-sm text-gray-500 mt-0.5">Field Operations Management</p>
          <button className="mt-3 bg-[#1a7f37] text-white text-sm font-bold px-6 py-1.5 rounded-full">
            GET
          </button>
          <p className="text-[10px] text-gray-400 mt-1">In-App Purchases</p>
        </div>
      </div>

      {/* Ratings Row */}
      <div className="flex items-center divide-x divide-gray-200 border-y border-gray-200 px-2 py-3 mx-4 rounded-xl bg-gray-50">
        <div className="flex-1 px-3">
          <StarRating rating={4.8} count="1.2K" />
        </div>
        <div className="flex-1 px-3 flex flex-col items-center">
          <span className="text-xs text-gray-500 uppercase tracking-wide font-medium">Age</span>
          <span className="text-2xl font-bold text-gray-900 mt-1">4+</span>
          <span className="text-xs text-gray-500 mt-1">Years Old</span>
        </div>
        <div className="flex-1 px-3 flex flex-col items-center">
          <span className="text-xs text-gray-500 uppercase tracking-wide font-medium">Category</span>
          <Globe className="h-6 w-6 text-gray-600 mt-1" />
          <span className="text-xs text-gray-500 mt-1">Business</span>
        </div>
        <div className="flex-1 px-3 flex flex-col items-center">
          <span className="text-xs text-gray-500 uppercase tracking-wide font-medium">Developer</span>
          <span className="text-xl mt-1">🌵</span>
          <span className="text-xs text-gray-500 mt-1 text-center leading-tight">Saguaro<br/>Inc.</span>
        </div>
      </div>

      {/* Screenshots */}
      <div className="mt-5 px-4">
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {SCREENS.map((s, i) => (
            <button key={i} onClick={() => setActiveScreen(i)} className={`shrink-0 transition-transform ${activeScreen === i ? "scale-105" : "opacity-80"}`}>
              <PhoneFrame src={s.src} label={s.label} />
            </button>
          ))}
          {/* Placeholder 4th screen */}
          <div className="flex flex-col items-center gap-2 shrink-0">
            <div className="w-[160px] h-[320px] rounded-[28px] border-[6px] border-gray-900 bg-gray-900 shadow-2xl overflow-hidden flex items-center justify-center">
              <div className="text-center p-4">
                <Bell className="h-10 w-10 text-[#1a7f37] mx-auto mb-2" />
                <p className="text-white text-xs font-medium">Notifications</p>
                <p className="text-gray-400 text-[10px] mt-1">Stay connected with your crew</p>
              </div>
            </div>
            <span className="text-xs text-gray-500 font-medium">Notifications</span>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="mt-4 px-4 border-t border-gray-100 pt-4">
        <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-line">
          {showFullDesc ? full : short}
        </p>
        <button onClick={() => setShowFullDesc(!showFullDesc)} className="text-[#1a7f37] text-sm font-medium mt-1">
          {showFullDesc ? "Less" : "more"}
        </button>
        <div className="mt-2 flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-[#1a7f37] flex items-center justify-center">
            <svg viewBox="0 0 60 60" className="w-4 h-4" fill="white">
              <rect x="25" y="30" width="10" height="22" rx="3" />
              <rect x="13" y="28" width="13" height="7" rx="3" />
              <rect x="13" y="20" width="7" height="15" rx="3" />
              <rect x="34" y="24" width="13" height="7" rx="3" />
              <rect x="40" y="16" width="7" height="16" rx="3" />
              <rect x="18" y="26" width="24" height="4" rx="2" />
              <ellipse cx="30" cy="22" rx="12" ry="9" />
            </svg>
          </div>
          <span className="text-xs text-gray-500">Saguaro Inc.</span>
        </div>
      </div>

      {/* Feature chips */}
      <div className="mt-4 px-4 flex gap-2 flex-wrap">
        {[
          { icon: <Clock className="h-3 w-3" />, label: "Time Clock" },
          { icon: <Users className="h-3 w-3" />, label: "Crew Mgmt" },
          { icon: <MapPin className="h-3 w-3" />, label: "Job Sites" },
          { icon: <Bell className="h-3 w-3" />, label: "Notifications" },
          { icon: <CalendarOff className="h-3 w-3" />, label: "Time Off" },
          { icon: <Phone className="h-3 w-3" />, label: "Contacts" },
        ].map((chip, i) => (
          <div key={i} className="flex items-center gap-1.5 bg-gray-100 rounded-full px-3 py-1">
            <span className="text-[#1a7f37]">{chip.icon}</span>
            <span className="text-xs text-gray-700 font-medium">{chip.label}</span>
          </div>
        ))}
      </div>

      {/* What's New */}
      <div className="mt-5 px-4 border-t border-gray-100 pt-4">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-bold text-gray-900">What's New</h2>
          <span className="text-xs text-gray-400">Version 2.4</span>
        </div>
        <ul className="text-sm text-gray-700 space-y-1">
          <li className="flex gap-2"><span className="text-[#1a7f37] font-bold">•</span>Job Contacts — add clients, inspectors & subcontractors per job</li>
          <li className="flex gap-2"><span className="text-[#1a7f37] font-bold">•</span>Green color theme refresh</li>
          <li className="flex gap-2"><span className="text-[#1a7f37] font-bold">•</span>Time Clock now shows live running timer</li>
          <li className="flex gap-2"><span className="text-[#1a7f37] font-bold">•</span>Performance improvements and bug fixes</li>
        </ul>
      </div>

      {/* Ratings & Reviews */}
      <div className="mt-5 px-4 border-t border-gray-100 pt-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-bold text-gray-900">Ratings & Reviews</h2>
          <button className="text-[#1a7f37] text-sm font-medium flex items-center gap-0.5">
            See All <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-start gap-6 mb-4">
          <div className="flex flex-col items-center">
            <span className="text-5xl font-bold text-gray-900 leading-none">4.8</span>
            <span className="text-xs text-gray-400 mt-1">out of 5</span>
          </div>
          <div className="flex-1 space-y-1">
            {[5,4,3,2,1].map(star => (
              <div key={star} className="flex items-center gap-2">
                <span className="text-xs w-2 text-gray-500">{star}</span>
                <div className="flex-1 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-gray-600 h-full rounded-full" style={{width: star === 5 ? "82%" : star === 4 ? "12%" : star === 3 ? "4%" : "1%"}} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-2">
          <ReviewCard
            name="TexasForeman88"
            rating={5}
            date="Mar 28"
            title="Finally, a crew app that makes sense"
            body="We run 3 job sites simultaneously and Saguaro keeps everything organized. The time clock and crew assignment features save us hours every week."
          />
          <ReviewCard
            name="SiteManagerAustin"
            rating={5}
            date="Mar 14"
            title="Best field ops tool I've used"
            body="The notifications and group chat per job are game changers. My crew actually stays informed now. The green theme looks sharp too."
          />
          <ReviewCard
            name="PlumbingPro_TX"
            rating={4}
            date="Feb 22"
            title="Solid app, would love offline mode"
            body="Does everything we need — scheduling, time off, documents. Would give 5 stars if it worked offline on job sites with no signal."
          />
        </div>
      </div>

      {/* Privacy */}
      <div className="mt-5 px-4 border-t border-gray-100 pt-4">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-bold text-gray-900">App Privacy</h2>
          <button className="text-[#1a7f37] text-sm font-medium flex items-center gap-0.5">
            See Details <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="bg-gray-100 rounded-2xl p-4 flex gap-4">
          <Lock className="h-8 w-8 text-gray-600 shrink-0 mt-1" />
          <div>
            <p className="text-sm font-semibold text-gray-900">Data Not Collected</p>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              The developer does not collect any data from this app.
            </p>
          </div>
        </div>
      </div>

      {/* App Info */}
      <div className="mt-5 px-4 border-t border-gray-100 pt-4 mb-8">
        <h2 className="text-lg font-bold text-gray-900 mb-3">Information</h2>
        <div className="divide-y divide-gray-100">
          {[
            ["Provider",      "Saguaro Inc."],
            ["Size",          "24.6 MB"],
            ["Category",      "Business"],
            ["Compatibility", "Requires iOS 16.0 or later"],
            ["Languages",     "English"],
            ["Age Rating",    "4+"],
            ["Price",         "Free"],
          ].map(([k,v]) => (
            <div key={k} className="flex justify-between py-2.5">
              <span className="text-sm text-gray-500">{k}</span>
              <span className="text-sm text-gray-900 font-medium">{v}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
