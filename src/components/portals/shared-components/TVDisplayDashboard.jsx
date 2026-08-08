// src/components/portals/shared-components/TVDisplayDashboard.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../utils/supabase';

const SLIDE_DURATION = 8000; // 8 seconds per slide

const TVDisplayDashboard = () => {
  const navigate = useNavigate();

  // Database references state
  const [classes, setClasses] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);

  // Time & Day state (for Clock)
  const [systemTime, setSystemTime] = useState(new Date());

  // Simulation mode states
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulatedDay, setSimulatedDay] = useState('Monday');
  const [simulatedMinutes, setSimulatedMinutes] = useState(540); // 9:00 AM (9 * 60)

  // Carousel controls
  const [activeSlide, setActiveSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Mouse activity tracking to show/hide controls
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef(null);

  // Load database context
  useEffect(() => {
    const loadDbData = async () => {
      try {
        setLoading(true);
        const [
          resClasses,
          resPeriods,
          resSubjects,
          resTeachers,
          resSlots
        ] = await Promise.all([
          supabase.from('classes').select('*'),
          supabase.from('periods').select('*').order('period_number', { ascending: true }),
          supabase.from('syl_subjects').select('*'),
          supabase.from('teachers').select('*'),
          supabase.from('timetable_slots').select('*')
        ]);

        if (resClasses.error) throw resClasses.error;
        if (resPeriods.error) throw resPeriods.error;
        if (resSubjects.error) throw resSubjects.error;
        if (resTeachers.error) throw resTeachers.error;
        if (resSlots.error) throw resSlots.error;

        setClasses(resClasses.data || []);
        setPeriods(resPeriods.data || []);
        setSubjects(resSubjects.data || []);
        setTeachers((resTeachers.data || []).map((t) => ({ ...t, id: t.teacher_id || t.id })));
        setSlots(resSlots.data || []);
      } catch (err) {
        console.error('Failed to load display board data:', err.message);
        loadLocalFallbacks();
      } finally {
        setLoading(false);
      }
    };

    loadDbData();
  }, []);

  // Local fallback loader for offline usage
  const loadLocalFallbacks = () => {
    const rawT = localStorage.getItem('jzv_timetable_local_data');
    if (rawT) {
      try {
        const parsed = JSON.parse(rawT);
        setClasses(parsed.classes || []);
        setPeriods(parsed.periods || []);
        setSubjects(parsed.subjects || []);
        setTeachers((parsed.teachers || []).filter(t => t.is_active));
        setSlots(parsed.slots || []);
      } catch (e) {
        console.error('Failed parsing local timetable data', e);
      }
    }
  };

  // Clock tick effect
  useEffect(() => {
    const timer = setInterval(() => {
      setSystemTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Carousel slide rotation
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % 5);
    }, SLIDE_DURATION);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Hide mouse controls on inactivity
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000); // hide after 3 seconds
  };

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, []);

  // Handle Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => {
        console.error(`Error enabling fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      });
    }
  };

  // Listen to external fullscreen change events (e.g. ESC key)
  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  // Helper: Format simulated time
  const getSimulatedTimeStr = () => {
    const hrs = Math.floor(simulatedMinutes / 60);
    const mins = simulatedMinutes % 60;
    const ampm = hrs >= 12 ? 'PM' : 'AM';
    const dispHrs = hrs % 12 === 0 ? 12 : hrs % 12;
    const dispMins = String(mins).padStart(2, '0');
    return `${dispHrs}:${dispMins} ${ampm}`;
  };

  // Helper: Convert time string "HH:MM:SS" or "HH:MM" to minutes from midnight
  const timeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const parts = timeStr.split(':');
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  };

  // Get current active schedule parameters
  const getCurrentParams = () => {
    let day = 'Monday';
    let minutes = 540; // 9:00 AM default

    if (isSimulating) {
      day = simulatedDay;
      minutes = simulatedMinutes;
    } else {
      // Use system parameters
      const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      day = daysOfWeek[systemTime.getDay()];
      minutes = systemTime.getHours() * 60 + systemTime.getMinutes();
    }

    return { day, minutes };
  };

  const { day: activeDay, minutes: activeMinutes } = getCurrentParams();

  // Find active period matching activeMinutes
  const activePeriod = periods.find(p => {
    if (!p.start_time || !p.end_time) return false;
    const startMins = timeToMinutes(p.start_time);
    const endMins = timeToMinutes(p.end_time);
    return activeMinutes >= startMins && activeMinutes < endMins;
  });

  // Check if school is in hours (8:00 AM to 2:30 PM = 480 to 870 mins)
  const isSchoolHours = activeMinutes >= 480 && activeMinutes < 870;
  const isWeekend = activeDay === 'Saturday' || activeDay === 'Sunday';

  // ------------------------------------------------------------
  // Mock Data Generators for Dashboard Slides
  // ------------------------------------------------------------

  // Mock Attendance Stats (deterministic based on date/simulation day)
  const getMockAttendance = () => {
    // Generates fixed mock data for a clean presentation
    const classAttendance = [
      { id: 1, name: 'Class 1', present: 23, absent: 2, total: 25, absentees: ['Ali', 'Zainab'] },
      { id: 2, name: 'Class 2', present: 27, absent: 1, total: 28, absentees: ['Ayesha'] },
      { id: 3, name: 'Class 3', present: 24, absent: 0, total: 24, absentees: [] },
      { id: 4, name: 'Class 4', present: 29, absent: 2, total: 31, absentees: ['Ahmed', 'Bilal'] },
      { id: 5, name: 'Class 5', present: 26, absent: 1, total: 27, absentees: ['Fatima'] },
      { id: 6, name: 'Class 6', present: 21, absent: 3, total: 24, absentees: ['Kamran', 'Musa', 'Omar'] },
      { id: 7, name: 'Class 7', present: 30, absent: 0, total: 30, absentees: [] },
      { id: 8, name: 'Class 8', present: 22, absent: 1, total: 23, absentees: ['Sarah'] },
    ];

    const schoolTotal = classAttendance.reduce((sum, item) => sum + item.total, 0);
    const schoolPresent = classAttendance.reduce((sum, item) => sum + item.present, 0);
    const schoolAbsent = classAttendance.reduce((sum, item) => sum + item.absent, 0);
    const schoolRate = (schoolPresent / schoolTotal) * 100;

    return {
      classes: classAttendance.map(c => ({
        ...c,
        pct: (c.present / c.total) * 100
      })),
      total: schoolTotal,
      present: schoolPresent,
      absent: schoolAbsent,
      rate: schoolRate
    };
  };

  const attendanceData = getMockAttendance();

  // Mock Discipline Leaderboard
  const disciplineBoard = [
    { rank: 1, class: 'Class 5-A', coins: 450, medal: '🥇' },
    { rank: 2, class: 'Class 6-B', coins: 390, medal: '🥈' },
    { rank: 3, class: 'Class 4-A', coins: 360, medal: '🥉' },
    { rank: 4, class: 'Class 7-A', coins: 310, medal: '' },
    { rank: 5, class: 'Class 3-B', coins: 280, medal: '' },
  ];

  // ------------------------------------------------------------
  // Render Slides Elements
  // ------------------------------------------------------------

  // Slide 1: Live Timetable
  const renderTimetableSlide = () => {
    if (isWeekend) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center p-8 animate-fade-in">
          <div className="w-24 h-24 rounded-full bg-emerald-100 flex items-center justify-center text-4xl mb-6 shadow-sm">
            🏖️
          </div>
          <h2 className="text-3xl font-black text-emerald-800">Happy Weekend!</h2>
          <p className="text-gray-500 mt-2 max-w-md font-medium text-lg">
            School is closed for the weekend. Have a restful holiday and we'll see you on Monday!
          </p>
        </div>
      );
    }

    if (!isSchoolHours) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center p-8 animate-fade-in">
          <div className="w-24 h-24 rounded-full bg-amber-100 flex items-center justify-center text-4xl mb-6 shadow-sm">
            🏫
          </div>
          <h2 className="text-3xl font-black text-amber-800">School is Closed</h2>
          <p className="text-gray-500 mt-2 max-w-md font-medium text-lg">
            Current time falls outside regular school hours. Timetable planner is active Monday to Friday, 8:00 AM to 2:30 PM.
          </p>
        </div>
      );
    }

    if (activePeriod?.is_break) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center p-8 animate-fade-in">
          <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center text-4xl mb-6 shadow-sm">
            🍱
          </div>
          <h2 className="text-3xl font-black text-blue-800">{activePeriod.name}</h2>
          <p className="text-gray-500 mt-2 max-w-md font-medium text-lg">
            It's recess time! Enjoy your break. Next active lessons will start at the end of the break.
          </p>
          <div className="mt-4 text-xs font-bold text-gray-400 bg-gray-100 px-3 py-1.5 rounded-full border">
            {activePeriod.start_time} - {activePeriod.end_time}
          </div>
        </div>
      );
    }

    // Normal active period: Display active class schedules
    return (
      <div className="flex flex-col h-full animate-fade-in">
        <div className="flex justify-between items-center mb-6 border-b pb-4 shrink-0">
          <div>
            <h2 className="text-2xl font-black text-dark-primary flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping"></span>
              Live Class Timetable Status
            </h2>
            <p className="text-xs font-bold text-gray-400 mt-0.5">
              Showing scheduled classes for the current period.
            </p>
          </div>
          {activePeriod && (
            <div className="flex flex-col items-end">
              <span className="text-xs font-black bg-brand-primary/10 text-brand-primary border border-brand-primary/20 px-3 py-1 rounded-full uppercase tracking-wider">
                {activePeriod.name}
              </span>
              <span className="text-[10px] font-bold text-gray-400 mt-1">
                {activePeriod.start_time} - {activePeriod.end_time}
              </span>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto pr-1">
          {classes.length === 0 ? (
            <div className="p-12 text-center text-gray-400 font-semibold">
              No classes defined in database.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {classes.map((cls) => {
                // Find timetable slot for this class, active day, and active period
                const slot = slots.find(
                  (s) =>
                    String(s.class_id) === String(cls.id) &&
                    String(s.day).toLowerCase() === activeDay.toLowerCase() &&
                    String(s.period_id) === String(activePeriod?.id)
                );

                const subject = slot ? subjects.find((s) => String(s.id) === String(slot.subject_id)) : null;
                const teacher = slot ? teachers.find((t) => String(t.id) === String(slot.teacher_id)) : null;

                return (
                  <div
                    key={cls.id}
                    className={`p-5 border rounded-2xl shadow-sm transition-all duration-300 ${
                      slot
                        ? 'bg-white border-emerald-100 hover:border-emerald-300 hover:shadow-md'
                        : 'bg-gray-50 border-gray-100'
                    } flex flex-col justify-between min-h-[140px] text-left`}
                  >
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-base font-extrabold text-dark-primary">
                          {cls.name}
                        </span>
                        <span
                          className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            slot
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              : 'bg-gray-150 text-gray-500 border'
                          }`}
                        >
                          {slot ? 'Active' : 'Free Slot'}
                        </span>
                      </div>

                      {slot ? (
                        <div className="space-y-1">
                          <h4 className="text-sm font-black text-brand-primary truncate">
                            {subject?.name || 'Subject ID: ' + slot.subject_id}
                          </h4>
                          <p className="text-xs font-bold text-gray-500 flex items-center gap-1.5">
                            <i className="fas fa-chalkboard-user text-[10px] text-gray-400"></i>
                            {teacher?.name || 'Teacher ID: ' + slot.teacher_id}
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 font-semibold italic mt-2">
                          No lesson scheduled for this period.
                        </p>
                      )}
                    </div>

                    {slot && (
                      <div className="border-t border-dashed pt-3 mt-4 flex items-center justify-between text-[9px] font-black text-gray-400 uppercase tracking-wider">
                        <span>Period {activePeriod?.period_number}</span>
                        <span className="flex items-center gap-1">
                          <i className="fas fa-clock text-[8px]"></i>
                          In Progress
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Slide 2: Attendance statistics
  const renderAttendanceSlide = () => {
    return (
      <div className="flex flex-col h-full animate-fade-in text-left">
        {/* Head metrics */}
        <div className="flex justify-between items-center mb-6 border-b pb-4 shrink-0 flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-black text-dark-primary flex items-center gap-2">
              <i className="fas fa-user-check text-brand-primary"></i>
              Daily Student Attendance Stats
            </h2>
            <p className="text-xs font-bold text-gray-400 mt-0.5">
              Live attendance percentages and absentee names across all classes.
            </p>
          </div>
          <div className="flex gap-4">
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2 text-center">
              <div className="text-[10px] font-black text-emerald-800 uppercase tracking-wider">Present</div>
              <div className="text-xl font-black text-emerald-700 mt-0.5">{attendanceData.present}</div>
            </div>
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-2 text-center">
              <div className="text-[10px] font-black text-red-800 uppercase tracking-wider">Absent</div>
              <div className="text-xl font-black text-red-700 mt-0.5">{attendanceData.absent}</div>
            </div>
            <div className="bg-brand-primary/5 border border-brand-primary/20 rounded-xl px-4 py-2 text-center">
              <div className="text-[10px] font-black text-brand-primary uppercase tracking-wider">Daily Rate</div>
              <div className="text-xl font-black text-brand-primary mt-0.5">{attendanceData.rate.toFixed(1)}%</div>
            </div>
          </div>
        </div>

        {/* Classes grid */}
        <div className="flex-1 overflow-y-auto pr-1">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {attendanceData.classes.map((cls) => {
              const ringColor = cls.pct >= 95 ? '#10b981' : cls.pct >= 90 ? '#f59e0b' : '#ef4444';
              const strokeDashoffset = 113 - (113 * cls.pct) / 100;

              return (
                <div
                  key={cls.id}
                  className="bg-white border border-light-border p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow flex gap-4 items-center"
                >
                  {/* Circular progress SVG */}
                  <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
                    <svg className="w-14 h-14 transform -rotate-90">
                      <circle cx="28" cy="28" r="18" fill="transparent" stroke="#f3f4f6" strokeWidth="4" />
                      <circle
                        cx="28"
                        cy="28"
                        r="18"
                        fill="transparent"
                        stroke={ringColor}
                        strokeWidth="4"
                        strokeDasharray="113"
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        className="transition-all duration-500 ease-out"
                      />
                    </svg>
                    <span className="absolute text-[10px] font-black text-dark-primary">
                      {cls.pct.toFixed(0)}%
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-black text-dark-primary">{cls.name}</h3>
                    <p className="text-[10px] font-bold text-gray-400 mt-0.5">
                      Present: {cls.present}/{cls.total}
                    </p>
                    <div className="mt-1 text-[9px] font-bold text-red-500 truncate" title={cls.absentees.join(', ')}>
                      {cls.absentees.length > 0 ? `Absent: ${cls.absentees.join(', ')}` : '👍 Full Attendance'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // Slide 3: Best Class of the month
  const renderBestClassSlide = () => {
    return (
      <div className="flex flex-col lg:flex-row h-full items-center justify-center p-8 gap-8 lg:gap-16 animate-slide-up text-left">
        <div className="relative shrink-0 select-none">
          <div className="w-48 h-48 rounded-full bg-yellow-50 flex items-center justify-center text-7xl shadow-md border-2 border-yellow-200">
            🏆
          </div>
          <div className="absolute -bottom-2 -right-2 bg-yellow-400 text-white font-black text-xs px-3.5 py-1 rounded-full shadow-sm border uppercase tracking-wider">
            Winner
          </div>
        </div>

        <div className="max-w-xl">
          <span className="text-xs font-black bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full uppercase tracking-wider border border-yellow-200">
            Academic Performance Award
          </span>
          <h2 className="text-4xl lg:text-5xl font-black text-dark-primary mt-4">
            Best Class of the Month
          </h2>
          <p className="text-gray-400 font-bold text-lg mt-1.5 text-brand-primary">
            Congratulations to Class 6-A
          </p>

          <p className="text-gray-500 font-semibold mt-4 text-base leading-relaxed">
            Class 6-A has secured the Best Class award this month for demonstrating exceptional academic progress, maintain a near-perfect attendance record, and showcasing stellar classroom discipline.
          </p>

          <div className="grid grid-cols-3 gap-4 mt-6 border-t border-dashed pt-5">
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Attendance</span>
              <p className="text-xl font-black text-emerald-600 mt-0.5">99.4%</p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Avg GPA</span>
              <p className="text-xl font-black text-brand-primary mt-0.5">3.91</p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Discipline Coins</span>
              <p className="text-xl font-black text-amber-500 mt-0.5">+420</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Slide 4: Best Teachers of the month
  const renderBestTeachersSlide = () => {
    return (
      <div className="flex flex-col h-full justify-center p-8 gap-6 animate-slide-up text-left">
        <div className="text-center mb-4 shrink-0">
          <span className="text-xs font-black bg-brand-primary/10 text-brand-primary border border-brand-primary/20 px-3.5 py-1 rounded-full uppercase tracking-wider">
            Outstanding Educators
          </span>
          <h2 className="text-3xl font-black text-dark-primary mt-3">
            Best Teachers of the Month
          </h2>
          <p className="text-xs text-gray-400 font-bold mt-1">
            Honoring commitment to academic excellence and teaching innovations.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto w-full">
          {/* Male Teacher */}
          <div className="bg-white border rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow flex gap-4 items-start border-t-[6px] border-t-blue-500">
            <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center text-3xl shrink-0 border shadow-sm">
              👨‍🏫
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[9px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100">
                Male Educator Award
              </span>
              <h3 className="text-lg font-black text-dark-primary mt-2">Mr. David Miller</h3>
              <p className="text-xs font-extrabold text-gray-400">Physics & General Science</p>
              <p className="text-xs text-gray-500 mt-3 font-semibold leading-relaxed">
                "Fostered outstanding critical thinking in physics classes and successfully guided students to win the regional science fair."
              </p>
            </div>
          </div>

          {/* Female Teacher */}
          <div className="bg-white border rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow flex gap-4 items-start border-t-[6px] border-t-pink-500">
            <div className="w-14 h-14 rounded-full bg-pink-50 flex items-center justify-center text-3xl shrink-0 border shadow-sm">
              👩‍🏫
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[9px] font-black uppercase tracking-wider bg-pink-50 text-pink-700 px-2 py-0.5 rounded border border-pink-100">
                Female Educator Award
              </span>
              <h3 className="text-lg font-black text-dark-primary mt-2">Ms. Sarah Jenkins</h3>
              <p className="text-xs font-extrabold text-gray-400">English Language & Literature</p>
              <p className="text-xs text-gray-500 mt-3 font-semibold leading-relaxed">
                "Created a student-run literary magazine and achieved an average reading comprehension score improvement of 25%."
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Slide 5: Discipline Coins board
  const renderDisciplineSlide = () => {
    return (
      <div className="flex flex-col lg:flex-row h-full items-center justify-center p-8 gap-8 lg:gap-16 animate-slide-up text-left">
        {/* Podium view */}
        <div className="flex gap-4 items-end select-none shrink-0 h-[220px]">
          {/* 2nd place */}
          <div className="flex flex-col items-center">
            <span className="text-xl font-bold mb-1">🥈</span>
            <div className="w-20 bg-gray-200 border border-gray-300 rounded-t-xl h-24 flex items-center justify-center flex-col shadow-sm">
              <span className="text-xs font-black text-gray-600">Class 6-B</span>
              <span className="text-[10px] font-bold text-gray-500 mt-1">390</span>
            </div>
          </div>
          {/* 1st place */}
          <div className="flex flex-col items-center">
            <span className="text-2xl font-bold mb-1">🏆</span>
            <div className="w-24 bg-yellow-400 border border-yellow-500 rounded-t-xl h-36 flex items-center justify-center flex-col shadow-md">
              <span className="text-sm font-black text-yellow-950">Class 5-A</span>
              <span className="text-xs font-black text-yellow-900 mt-1">450</span>
            </div>
          </div>
          {/* 3rd place */}
          <div className="flex flex-col items-center">
            <span className="text-xl font-bold mb-1">🥉</span>
            <div className="w-20 bg-amber-600 border border-amber-700 rounded-t-xl h-16 flex items-center justify-center flex-col shadow-sm">
              <span className="text-xs font-black text-amber-100">Class 4-A</span>
              <span className="text-[10px] font-bold text-amber-200 mt-1">360</span>
            </div>
          </div>
        </div>

        {/* List Leaderboard */}
        <div className="flex-1 max-w-lg w-full">
          <div>
            <span className="text-xs font-black bg-amber-100 text-amber-800 border border-amber-200 px-3.5 py-1 rounded-full uppercase tracking-wider">
              Student Behavior Leaderboard
            </span>
            <h2 className="text-3xl font-black text-dark-primary mt-3">
              Discipline Coins Board
            </h2>
            <p className="text-xs text-gray-400 font-bold mt-1">
              Top classes earning recognition coins for exemplary code of conduct.
            </p>
          </div>

          <div className="mt-6 space-y-3.5">
            {disciplineBoard.map((item) => (
              <div
                key={item.rank}
                className="p-3 bg-white border border-light-border rounded-2xl shadow-sm flex items-center justify-between hover:scale-[1.01] transition-transform"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-black text-xs text-dark-soft">
                    {item.medal ? item.medal : `#${item.rank}`}
                  </div>
                  <span className="font-extrabold text-sm text-dark-primary">{item.class}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <i className="fas fa-coins text-amber-500 text-sm animate-pulse"></i>
                  <span className="font-black text-sm text-amber-600">{item.coins} Coins</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Switch slide renderer
  const renderSlideContent = () => {
    switch (activeSlide) {
      case 0:
        return renderTimetableSlide();
      case 1:
        return renderAttendanceSlide();
      case 2:
        return renderBestClassSlide();
      case 3:
        return renderBestTeachersSlide();
      case 4:
        return renderDisciplineSlide();
      default:
        return renderTimetableSlide();
    }
  };

  // Map slide names for indicator tooltips
  const slideNames = [
    'Live Timetable',
    'Attendance Stats',
    'Best Class',
    'Best Teachers',
    'Leaderboard'
  ];

  return (
    <div className="fixed inset-0 z-50 bg-[#064e3b] text-gray-700 flex flex-col font-sans overflow-hidden">
      {/* Top signage Header */}
      <div className="h-20 bg-white shadow-sm border-b border-emerald-900/10 px-8 flex justify-between items-center shrink-0 z-30 select-none">
        <div className="flex items-center gap-4 cursor-pointer" onClick={() => navigate('/')}>
          <img src="/media/jzv-rectangle-tranparent.png" alt="JZV Logo" className="h-12" />
          <div className="hidden sm:block border-l pl-4 border-gray-200">
            <h1 className="text-base font-black text-[#064e3b] tracking-wide uppercase">
              Junior Zaidan Valiant
            </h1>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
              Live TV Display System
            </p>
          </div>
        </div>

        {/* Live system clock */}
        <div className="flex flex-col items-end text-right">
          <span className="text-lg font-black text-[#064e3b]">
            {systemTime.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
          <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mt-0.5">
            {systemTime.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Main Slides Content Section */}
      <div className="flex-1 relative bg-gray-50 flex items-center justify-center p-6 md:p-12 overflow-hidden">
        <div className="w-full max-w-7xl bg-white border border-light-border rounded-[2.5rem] shadow-xl p-8 md:p-12 h-full max-h-[600px] overflow-hidden relative flex flex-col">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm font-bold text-gray-500">Loading signage system...</span>
            </div>
          ) : (
            renderSlideContent()
          )}
        </div>
      </div>

      {/* Slide Navigator Controls (overlay, fades out on idle) */}
      <div
        className={`fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur border border-emerald-900/10 shadow-2xl rounded-2xl px-6 py-3.5 z-40 transition-all duration-300 flex items-center gap-6 select-none ${
          showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveSlide((prev) => (prev - 1 + 5) % 5)}
            className="w-8 h-8 rounded-lg hover:bg-gray-100 active:scale-90 transition-all flex items-center justify-center text-gray-500 cursor-pointer"
            title="Previous Slide"
          >
            <i className="fas fa-chevron-left text-xs"></i>
          </button>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`w-9 h-9 rounded-full ${isPlaying ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-600'} hover:scale-105 active:scale-95 transition-all flex items-center justify-center cursor-pointer`}
            title={isPlaying ? 'Pause Auto-Play' : 'Resume Auto-Play'}
          >
            <i className={`fas fa-${isPlaying ? 'pause' : 'play'} text-xs`}></i>
          </button>
          <button
            onClick={() => setActiveSlide((prev) => (prev + 1) % 5)}
            className="w-8 h-8 rounded-lg hover:bg-gray-100 active:scale-90 transition-all flex items-center justify-center text-gray-500 cursor-pointer"
            title="Next Slide"
          >
            <i className="fas fa-chevron-right text-xs"></i>
          </button>
        </div>

        {/* Indicators */}
        <div className="flex gap-2">
          {slideNames.map((name, idx) => (
            <button
              key={idx}
              onClick={() => setActiveSlide(idx)}
              className={`w-3.5 h-3.5 rounded-full transition-all duration-300 cursor-pointer border ${
                activeSlide === idx
                  ? 'bg-emerald-600 border-emerald-700 w-8'
                  : 'bg-gray-200 border-gray-300 hover:bg-gray-300'
              }`}
              title={name}
            />
          ))}
        </div>

        <div className="h-5 w-[1px] bg-gray-200" />

        <div className="flex items-center gap-3">
          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className={`w-8 h-8 rounded-lg hover:bg-gray-100 active:scale-90 transition-all flex items-center justify-center text-gray-500 cursor-pointer ${
              isFullscreen ? 'text-emerald-600 bg-emerald-50' : ''
            }`}
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            <i className={`fas fa-${isFullscreen ? 'compress' : 'expand'} text-xs`}></i>
          </button>

          {/* Simulation Toggle */}
          <button
            onClick={() => setIsSimulating(!isSimulating)}
            className={`px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-wider cursor-pointer active:scale-95 transition-all ${
              isSimulating
                ? 'bg-amber-50 border-amber-200 text-amber-700'
                : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-150'
            }`}
            title="Toggle time and day simulation mode for testing"
          >
            Simulate
          </button>

          {/* Portal Exit */}
          <button
            onClick={() => navigate('/')}
            className="px-3 py-1.5 bg-red-50 border border-red-100 hover:bg-red-100 rounded-lg text-[10px] font-black text-red-600 uppercase tracking-wider cursor-pointer active:scale-95 transition-all"
            title="Return to Home Dashboard"
          >
            Exit
          </button>
        </div>
      </div>

      {/* Simulator Control Drawer (Visible only in simulation mode) */}
      {isSimulating && (
        <div className="fixed top-24 right-6 bg-white border border-amber-200 rounded-2xl shadow-xl p-4 w-72 z-40 text-left animate-slide-up select-none">
          <div className="flex justify-between items-center border-b pb-2 mb-3">
            <span className="text-xs font-black text-amber-800 uppercase tracking-wider flex items-center gap-1">
              <i className="fas fa-sliders-h text-xs"></i>
              Simulation Controls
            </span>
            <button
              onClick={() => setIsSimulating(false)}
              className="text-gray-400 hover:text-gray-600 font-bold text-xs"
            >
              Close
            </button>
          </div>

          <div className="space-y-3 text-xs">
            {/* Day Selector */}
            <div className="flex flex-col gap-1">
              <label className="font-extrabold text-gray-500">Simulate Day:</label>
              <select
                value={simulatedDay}
                onChange={(e) => setSimulatedDay(e.target.value)}
                className="border rounded-lg px-2.5 py-1.5 font-bold text-xs bg-white text-gray-600 outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
              >
                <option value="Monday">Monday</option>
                <option value="Tuesday">Tuesday</option>
                <option value="Wednesday">Wednesday</option>
                <option value="Thursday">Thursday</option>
                <option value="Friday">Friday</option>
                <option value="Saturday">Saturday (Weekend)</option>
                <option value="Sunday">Sunday (Weekend)</option>
              </select>
            </div>

            {/* Time Range Slider */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center font-extrabold text-gray-500">
                <span>Simulate Time:</span>
                <span className="text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded font-black text-[10px]">
                  {getSimulatedTimeStr()}
                </span>
              </div>
              <input
                type="range"
                min="420" // 7:00 AM
                max="1020" // 5:00 PM
                step="5"
                value={simulatedMinutes}
                onChange={(e) => setSimulatedMinutes(parseInt(e.target.value, 10))}
                className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
              <div className="flex justify-between text-[9px] font-bold text-gray-400 uppercase">
                <span>07:00 AM</span>
                <span>05:00 PM</span>
              </div>
            </div>

            <div className="bg-amber-50/50 border border-amber-100/50 rounded-xl p-2.5 text-[10px] font-semibold text-amber-700 space-y-1">
              <p>⏰ Timetable is active during school hours: 8:00 AM to 2:30 PM (480 - 870 mins).</p>
              <p>🍱 Lunch breaks or Recess periods will display Recess screens.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TVDisplayDashboard;
