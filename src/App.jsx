import { useState, useEffect } from "react";

import {
  ArrowRight,
  ArrowUpRight,
  Search,
  Menu,
  X,
  CalendarDays,
  GraduationCap,
  Layers3,
  Clock3,
  Sparkles,
  BookOpen,
  LogIn,
  LogOut,
  UserCircle,
} from "lucide-react";

import { supabase } from "./services/supabase";
import Auth from "./pages/Auth";
import SubmitExhibit from "./pages/SubmitExhibit";
import AdminDashboard from "./pages/AdminDashboard";
import StudentDashboard from "./pages/StudentDashboard";

import "./App.css";

// =====================================
// IMAGE URL
// =====================================

const getImageUrl = (path) => {
  if (!path) return "";

  if (path.startsWith("http")) {
    return path;
  }

  const { data } = supabase.storage
    .from("museum-images")
    .getPublicUrl(path);

  return data?.publicUrl || "";
};

// =====================================
// HISTORY DATA
// =====================================

const history = [
  {
    year: "Эхлэл",
    title: "Тэнхимийн үүсэл",
    text: "Мэдээллийн системийн менежментийн чиглэлээр мэргэжилтэн бэлтгэх сургалтын үндэс тавигдсан үе.",
  },
  {
    year: "Хөгжил",
    title: "Технологийн шинэчлэл",
    text: "Орчин үеийн мэдээллийн систем, программчлал болон дижитал технологийн сургалт өргөжсөн үе.",
  },
  {
    year: "Өнөөдөр",
    title: "Шинэ үеийн ISM",
    text: "Инновац, судалгаа, оюутны бүтээл болон технологийн хөгжлийг нэгтгэсэн нийгэмлэг.",
  },
];

// =====================================
// MAIN APP
// =====================================

function App() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  // AUTH
  const [session, setSession] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [showSubmit, setShowSubmit] = useState(false);

  // ADMIN
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(false);

  // STUDENT
  const [showStudent, setShowStudent] = useState(false);

  // DATABASE DATA
  const [exhibits, setExhibits] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [events, setEvents] = useState([]);

  // DETAIL MODALS
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedExhibit, setSelectedExhibit] = useState(null);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [zoomImage, setZoomImage] = useState("");

  const [categories, setCategories] = useState([]);

  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState("");

  // =====================================
  // AUTH SESSION
  // =====================================

  useEffect(() => {
    let mounted = true;

    const loadSession = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error("Session error:", error);
      }

      if (mounted) {
        setSession(data?.session || null);
      }
    };

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, currentSession) => {
        setSession(currentSession);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // =====================================
  // CHECK ADMIN ROLE
  // =====================================

  useEffect(() => {
    let mounted = true;

    const checkAdminRole = async () => {
      if (!session?.user?.id) {
        setIsAdmin(false);
        setCheckingAdmin(false);
        return;
      }

      setCheckingAdmin(true);

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .maybeSingle();

        if (error) {
          throw error;
        }

        if (mounted) {
          setIsAdmin(data?.role === "admin");
        }
      } catch (error) {
        console.error("Admin role error:", error);

        if (mounted) {
          setIsAdmin(false);
        }
      } finally {
        if (mounted) {
          setCheckingAdmin(false);
        }
      }
    };

    checkAdminRole();

    return () => {
      mounted = false;
    };
  }, [session]);

  // =====================================
  // LOGOUT
  // =====================================

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      alert(error.message);
      return;
    }

    setSession(null);
    setIsAdmin(false);
    setShowAdmin(false);
    setShowStudent(false);
    setShowSubmit(false);
    setShowAuth(false);
  };

  // =====================================
  // FETCH DATABASE DATA
  // =====================================

  useEffect(() => {
    let mounted = true;

    const fetchMuseumData = async () => {
      setLoading(true);
      setDbError("");

      try {
        const [
          exhibitsResult,
          teachersResult,
          eventsResult,
          categoriesResult,
        ] = await Promise.all([
          supabase.from("exhibits").select("*"),
          supabase.from("teachers").select("*"),
          supabase.from("events").select("*"),
          supabase.from("categories").select("*"),
        ]);

        const results = [
          exhibitsResult,
          teachersResult,
          eventsResult,
          categoriesResult,
        ];

        const failed = results.find((result) => result.error);

        if (failed) {
          throw failed.error;
        }

        if (!mounted) return;

        const categoryData = categoriesResult.data || [];

        setCategories(categoryData);

        // EXHIBITS

        const exhibitData = (exhibitsResult.data || [])
          .filter(
            (item) =>
              !item.status || item.status === "published"
          )
          .map((item) => {
            const category = categoryData.find(
              (cat) =>
                String(cat.id) === String(item.category_id)
            );

            return {
              ...item,

              id: item.id,

              title:
                item.title ||
                item.name ||
                "Untitled",

              category:
                category?.name ||
                category?.title ||
                item.category ||
                "Other",

              year:
                item.year ||
                (item.created_at
                  ? new Date(item.created_at).getFullYear()
                  : ""),

              author:
                item.author ||
                item.author_name ||
                "ISM Student",

              image: getImageUrl(
                item.image_url ||
                item.image ||
                item.image_path
              ),

              description: item.description || "",

              tech:
                item.technology ||
                item.tech ||
                item.technologies ||
                "",
            };
          });

        setExhibits(exhibitData);

        // TEACHERS

        const teacherData = (teachersResult.data || []).map(
          (item) => ({
            ...item,

            name:
              item.name ||
              item.full_name ||
              "Багшийн нэр",

            position:
              item.position ||
              item.role ||
              "Багш",

            course:
              item.course ||
              item.subject ||
              item.department ||
              "",

            image: getImageUrl(
              item.image_url ||
              item.image ||
              item.image_path
            ),
          })
        );

        setTeachers(teacherData);

        // EVENTS

        const eventData = (eventsResult.data || [])
          .filter(
            (item) =>
              !item.status || item.status === "published"
          )
          .map((item) => ({
            ...item,

            title:
              item.title ||
              item.name ||
              "Event",

            date:
              item.event_date ||
              item.date ||
              item.created_at ||
              "",

            type: item.type || "EVENT",

            description: item.description || "",

            image: getImageUrl(
              item.image_url ||
              item.image ||
              item.image_path
            ),
          }));

        setEvents(eventData);
      } catch (error) {
        console.error("Supabase error:", error);

        if (mounted) {
          setDbError(
            error.message ||
            "Өгөгдөл татахад алдаа гарлаа."
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchMuseumData();

    return () => {
      mounted = false;
    };
  }, []);

  // =====================================
  // CATEGORY FILTER
  // =====================================

  const categoryOptions = [
    "All",
    ...categories
      .map((item) => item.name || item.title)
      .filter(Boolean),
  ];

  // =====================================
  // SEARCH AND FILTER
  // =====================================

  const filteredExhibits = exhibits.filter((item) => {
    const matchesCategory =
      activeCategory === "All" ||
      item.category === activeCategory;

    const searchText = search.toLowerCase();

    const matchesSearch =
      item.title.toLowerCase().includes(searchText) ||
      item.author.toLowerCase().includes(searchText) ||
      item.category.toLowerCase().includes(searchText) ||
      String(item.tech).toLowerCase().includes(searchText);

    return matchesCategory && matchesSearch;
  });

  const closeMenu = () => {
    setMenuOpen(false);
  };

  // =====================================
  // OPEN ADMIN DASHBOARD
  // =====================================

  const openAdminDashboard = () => {
    if (!session) {
      setShowAuth(true);
      return;
    }

    if (!isAdmin) {
      alert("Танд администраторын эрх байхгүй байна.");
      return;
    }

    setShowAdmin(true);
    setShowStudent(false);
    setShowSubmit(false);
    setShowAuth(false);
    setMenuOpen(false);
  };

  // =====================================
  // OPEN STUDENT DASHBOARD
  // =====================================

  const openStudentDashboard = () => {
    if (!session) {
      setShowAuth(true);
      return;
    }

    if (isAdmin) {
      alert(
        "Администраторын эрхээр оюутны хэсэг ашиглах боломжгүй."
      );
      return;
    }

    setShowStudent(true);
    setShowAdmin(false);
    setShowSubmit(false);
    setShowAuth(false);
    setMenuOpen(false);
  };

  // =====================================
  // ADMIN FULL SCREEN
  // =====================================

  if (showAdmin && session && isAdmin) {
    return (
      <AdminDashboard
        user={session.user}
        onClose={() => setShowAdmin(false)}
      />
    );
  }

  // =====================================
  // STUDENT FULL SCREEN
  // =====================================

  if (showStudent && session && !isAdmin) {
    return (
      <StudentDashboard
        user={session.user}
        onClose={() => setShowStudent(false)}
      />
    );
  }

  // =====================================
  // MAIN WEBSITE
  // =====================================

  return (
    <div className="app">

      {/* NAVBAR */}

      <header className="navbar">

        <a
          href="#home"
          className="brand"
          onClick={closeMenu}
        >
          <span className="brand-symbol">ISM</span>

          <span className="brand-name">
            DIGITAL
            <strong>MUSEUM</strong>
          </span>
        </a>

        <button
          className="mobile-toggle"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle navigation"
        >
          {menuOpen ? <X /> : <Menu />}
        </button>

        <nav
          className={menuOpen ? "nav-links open" : "nav-links"}
        >
          <a href="#home" onClick={closeMenu}>Нүүр</a>
          <a href="#exhibits" onClick={closeMenu}>Үзмэрүүд</a>
          <a href="#history" onClick={closeMenu}>Түүх</a>
          <a href="#teachers" onClick={closeMenu}>Багш нар</a>
          <a href="#events" onClick={closeMenu}>Арга хэмжээ</a>
        </nav>

        <div className="nav-auth-actions">

          <a href="#exhibits" className="nav-button">
            Музей үзэх
            <ArrowUpRight size={16} />
          </a>

          {session && isAdmin && (
            <button
              type="button"
              className="nav-button"
              onClick={openAdminDashboard}
            >
              Админ удирдлага
              <ArrowUpRight size={16} />
            </button>
          )}

          {session ? (
            <div className="auth-nav">

              <span className="auth-user">
                <UserCircle size={17} />

                {session.user.user_metadata?.full_name ||
                  session.user.email}
              </span>

              {!isAdmin && (
                <button
                  type="button"
                  className="nav-button"
                  onClick={openStudentDashboard}
                >
                  Миний бүтээлүүд
                  <UserCircle size={16} />
                </button>
              )}

              <button
                type="button"
                className="nav-button"
                onClick={handleLogout}
              >
                Гарах
                <LogOut size={16} />
              </button>

            </div>
          ) : (
            <button
              type="button"
              className="nav-button"
              onClick={() => setShowAuth(true)}
            >
              Нэвтрэх
              <LogIn size={16} />
            </button>
          )}

        </div>
      </header>

      <main>

        {/* HERO */}

        <section className="hero" id="home">

          <div className="hero-background"></div>

          <div className="hero-content">

            <div className="eyebrow">
              <span className="eyebrow-dot"></span>
              UNIVERSITY OF FINANCE AND ECONOMICS
            </div>

            <h1>
              The Past.
              <br />
              The Present.
              <br />
              <span>Our Digital Future.</span>
            </h1>

            <p className="hero-description">
              Мэдээллийн Системийн Менежментийн тэнхимийн
              түүх, мэдлэг, инновац болон оюутнуудын бүтээлийг
              нэг дороос нээн танилцаарай.
            </p>

            <div className="hero-actions">

              <a
                href="#exhibits"
                className="primary-button"
              >
                Үзмэрүүдтэй танилцах
                <ArrowRight size={18} />
              </a>

              <a
                href="#history"
                className="text-button"
              >
                Бидний түүх
                <ArrowUpRight size={17} />
              </a>

            </div>

            <div className="hero-caption">
              <span>01 / DIGITAL ARCHIVE</span>
              <span>UFE · ISM DEPARTMENT</span>
            </div>

          </div>

          <div className="hero-visual">

            <div className="hero-image">

              <img
                src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1200"
                alt="Digital technology and innovation"
              />

              <div className="image-overlay"></div>

              <div className="image-label">
                <span>EXPLORE THE ARCHIVE</span>
                <ArrowUpRight size={20} />
              </div>

            </div>

            <div className="floating-card">
              <Sparkles size={20} />

              <div>
                <strong>Knowledge lives on.</strong>
                <span>Discover our digital legacy.</span>
              </div>
            </div>

            <div className="hero-number">
              ISM / 01
            </div>

          </div>

          <div className="hero-bottom">
            <span>SCROLL TO DISCOVER</span>
            <div className="scroll-line"></div>
          </div>

        </section>

        {/* STATS */}

        <section className="stats-section">

          <div className="stat-item">
            <Layers3 />
            <div>
              <strong>{exhibits.length}</strong>
              <span>Digital Exhibits</span>
            </div>
          </div>

          <div className="stat-item">
            <GraduationCap />
            <div>
              <strong>{teachers.length}</strong>
              <span>Academic Mentors</span>
            </div>
          </div>

          <div className="stat-item">
            <BookOpen />
            <div>
              <strong>∞</strong>
              <span>Knowledge & Innovation</span>
            </div>
          </div>

          <div className="stat-item">
            <Clock3 />
            <div>
              <strong>2026</strong>
              <span>Building Our Future</span>
            </div>
          </div>

        </section>

        {/* EXHIBITS */}

        <section
          className="section exhibits-section"
          id="exhibits"
        >

          <div className="section-heading">

            <div>
              <span className="section-label">
                01 — THE COLLECTION
              </span>

              <h2>
                Discover the <em>Exhibits.</em>
              </h2>

              <p>
                Оюутнуудын бүтээл, судалгаа болон технологийн
                шийдлүүдтэй танилцана уу.
              </p>
            </div>

            <div className="collection-actions">
  <span className="collection-count">
    COLLECTION / {filteredExhibits.length}
  </span>

  <button
    type="button"
    className="add-exhibit-button"
    onClick={() => {
      if (session?.user) {
        setShowSubmit(true);
      } else {
        setShowAuth(true);
      }
    }}
  >
    <span className="add-exhibit-plus">+</span>
    Бүтээл нэмэх
  </button>
</div>

          </div>

          <div className="filter-bar">

            <div className="category-filters">

              {categoryOptions.map((category) => (
                <button
                  key={category}
                  className={
                    activeCategory === category
                      ? "filter active"
                      : "filter"
                  }
                  onClick={() => setActiveCategory(category)}
                >
                  {category === "All" ? "Бүгд" : category}
                </button>
              ))}

            </div>

            <div className="search-box">
              <Search size={18} />

              <input
                type="text"
                placeholder="Бүтээл хайх..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

          </div>

          <div className="exhibit-grid">

            {loading ? (
              <p>Үзмэрүүдийг ачаалж байна...</p>
            ) : dbError ? (
              <p>{dbError}</p>
            ) : filteredExhibits.length > 0 ? (
              filteredExhibits.map((item, index) => (
                <article
                  className="exhibit-card"
                  key={item.id}
                  onClick={() => setSelectedExhibit(item)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setSelectedExhibit(item);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                >

                  <div className="exhibit-image">

                    {item.image && (
                      <img
                        src={item.image}
                        alt={item.title}
                      />
                    )}

                    <span className="exhibit-index">
                      {String(index + 1).padStart(2, "0")}
                    </span>

                    <span className="exhibit-category">
                      {item.category}
                    </span>

                  </div>

                  <div className="exhibit-info">

                    <div className="exhibit-meta">
                      <span>{item.year}</span>
                      <span>{item.author}</span>
                    </div>

                    <h3>{item.title}</h3>

                    <p>{item.description}</p>

                    <div className="exhibit-footer">
                      <span>{item.tech}</span>

                      <button
                        type="button"
                        aria-label={`View ${item.title}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedExhibit(item);
                        }}
                      >
                        <ArrowUpRight size={19} />
                      </button>
                    </div>

                  </div>
                </article>
              ))
            ) : (
              <div className="empty-state">
                <Search size={30} />
                <h3>Үзмэр олдсонгүй</h3>
                <p>
                  Өөр түлхүүр үг эсвэл ангилал сонгоно уу.
                </p>

                <button
                  onClick={() => {
                    setSearch("");
                    setActiveCategory("All");
                  }}
                >
                  Бүх үзмэр харах
                </button>
              </div>
            )}

          </div>

          <a href="#creators" className="view-all">
            Бүх бүтээлтэй танилцах
            <ArrowRight size={18} />
          </a>

        </section>

        {/* HISTORY */}

        <section
          className="history-section"
          id="history"
        >

          <div className="history-intro">

            <span className="section-label light-label">
              02 — OUR HERITAGE
            </span>

            <h2>
              A history of
              <br />
              <em>progress.</em>
            </h2>

            <p>
              Бидний түүх бол мэдлэг, технологи,
              тасралтгүй хөгжлийн түүх юм.
            </p>

            <span className="history-decoration">
              ISM.
            </span>

          </div>

          <div className="timeline">

            {history.map((item, index) => (
              <div
                className="timeline-item"
                key={item.year}
              >

                <div className="timeline-marker">
                  <span>0{index + 1}</span>
                </div>

                <div className="timeline-content">
                  <span>{item.year}</span>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </div>

              </div>
            ))}

          </div>

        </section>

        {/* TEACHERS */}

        <section
          className="section teachers-section"
          id="teachers"
        >

          <div className="section-heading">

            <div>
              <span className="section-label">
                03 — OUR PEOPLE
              </span>

              <h2>
                Meet the <em>Mentors.</em>
              </h2>

              <p>
                Мэдлэг, туршлагаараа биднийг чиглүүлэгч багш нар.
              </p>
            </div>

            <a
              href="#teachers"
              className="outline-button"
            >
              Бүх багш
              <ArrowUpRight size={17} />
            </a>

          </div>

          <div className="teacher-grid">

            {loading ? (
              <p>Багш нарын мэдээллийг ачаалж байна...</p>
            ) : teachers.length > 0 ? (
              teachers.map((teacher, index) => (
                <article
                  className="teacher-card"
                  key={teacher.id || index}
                  onClick={() => setSelectedTeacher(teacher)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setSelectedTeacher(teacher);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                >

                  <div className="teacher-image">
                    {teacher.image && (
                      <img
                        src={teacher.image}
                        alt={teacher.name}
                      />
                    )}
                  </div>

                  <span className="teacher-role">
                    {teacher.position}
                  </span>

                  <h3>{teacher.name}</h3>
                  <p>{teacher.course}</p>

                  <ArrowUpRight
                    className="teacher-arrow"
                    size={20}
                  />

                </article>
              ))
            ) : (
              <p>
                Одоогоор багшийн мэдээлэл алга байна.
              </p>
            )}

          </div>

        </section>

        {/* EVENTS */}

        <section
          className="events-section section"
          id="events"
        >

          <div className="section-heading">

            <div>
              <span className="section-label">
                04 — MOMENTS & MEMORIES
              </span>

              <h2>
                Beyond the <em>Classroom.</em>
              </h2>

              <p>
                Тэнхимийн арга хэмжээ, уулзалт болон дурсамжууд.
              </p>
            </div>

          </div>

          <div className="event-grid">

            {loading ? (
              <p>Арга хэмжээний мэдээллийг ачаалж байна...</p>
            ) : events.length > 0 ? (
              events.map((event, index) => (
                <article
                  className="event-card"
                  key={event.id || index}
                >

                  <div className="event-image">

                    {event.image && (
                      <img
                        src={event.image}
                        alt={event.title}
                      />
                    )}

                    <span>{event.type}</span>

                  </div>

                  <div className="event-info">

                    <span>
                      <CalendarDays size={15} />

                      {event.date
                        ? new Date(event.date).getFullYear()
                        : ""}
                    </span>

                    <h3>{event.title}</h3>
                    <p>{event.description}</p>

                    <button
                      type="button"
                      className="event-detail-link"
                      onClick={() => setSelectedEvent(event)}
                    >
                      Дэлгэрэнгүй
                      <ArrowRight size={16} />
                    </button>

                  </div>

                </article>
              ))
            ) : (
              <p>
                Одоогоор арга хэмжээний мэдээлэл алга байна.
              </p>
            )}

          </div>

        </section>



      </main>

      {/* FOOTER */}

      <footer className="footer">

        <div className="footer-main">

          <a
            href="#home"
            className="brand footer-brand"
          >
            <span className="brand-symbol">
              ISM
            </span>

            <span className="brand-name">
              DIGITAL
              <strong>MUSEUM</strong>
            </span>
          </a>

          <p>
            Preserving our history.
            <br />
            Celebrating our innovation.
          </p>

          <div className="footer-socials">
            <a href="#home" aria-label="Instagram">IG</a>
            <a href="#home" aria-label="GitHub">GH</a>
          </div>

        </div>

        <div className="footer-bottom">

          <span>© 2026 ISM DIGITAL MUSEUM</span>

          <span>
            UNIVERSITY OF FINANCE AND ECONOMICS
          </span>

          <a href="#home">
            BACK TO TOP ↑
          </a>

        </div>

      </footer>

      {/* EVENT DETAIL MODAL */}

      {selectedEvent && (
        <div
          className="event-modal-overlay"
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="event-modal"
            onClick={(e) => e.stopPropagation()}
          >

            <button
              type="button"
              className="event-modal-close"
              onClick={() => setSelectedEvent(null)}
              aria-label="Хаах"
            >
              <X size={22} />
            </button>

            {selectedEvent.image && (
              <div className="event-modal-image">
                <img
                  src={selectedEvent.image}
                  alt={selectedEvent.title}
                />
              </div>
            )}

            <div className="event-modal-content">

              <span className="event-modal-label">
                {selectedEvent.type || "EVENT"}
              </span>

              <h2>{selectedEvent.title}</h2>

              <div className="event-modal-meta">

                <span>
                  <CalendarDays size={17} />

                  {selectedEvent.date
                    ? new Date(
                        selectedEvent.date
                      ).toLocaleDateString("mn-MN")
                    : "Огноо тодорхойгүй"}
                </span>

                {selectedEvent.location && (
                  <span>
                    <ArrowUpRight size={17} />
                    {selectedEvent.location}
                  </span>
                )}

              </div>

              <p>{selectedEvent.description}</p>

              <button
                type="button"
                className="event-modal-button"
                onClick={() => setSelectedEvent(null)}
              >
                Хаах
              </button>

            </div>
          </div>
        </div>
      )}

      {/* EXHIBIT DETAILS */}

      {selectedExhibit && (
        <div
          className="museum-detail-overlay"
          onClick={() => setSelectedExhibit(null)}
        >
          <section
            className="museum-detail-dialog"
            role="dialog"
            aria-modal="true"
            aria-label={selectedExhibit.title}
            onClick={(e) => e.stopPropagation()}
          >

            <button
              className="museum-detail-close"
              aria-label="Хаах"
              onClick={() => setSelectedExhibit(null)}
            >
              <X size={22} />
            </button>

            {selectedExhibit.image && (
              <button
                className="museum-detail-image"
                onClick={() => setZoomImage(selectedExhibit.image)}
                title="Зургийг томруулах"
              >
                <img
                  src={selectedExhibit.image}
                  alt={selectedExhibit.title}
                />

                <span>Зургийг томруулах</span>
              </button>
            )}

            <div className="museum-detail-content">

              <span className="museum-detail-eyebrow">
                ISM DIGITAL MUSEUM / {selectedExhibit.category}
              </span>

              <h2>{selectedExhibit.title}</h2>

              <div className="museum-detail-tags">

                <span>
                  Зохиогч: {selectedExhibit.author}
                </span>

                {selectedExhibit.year && (
                  <span>
                    Он: {selectedExhibit.year}
                  </span>
                )}

                {selectedExhibit.tech && (
                  <span>
                    Технологи: {selectedExhibit.tech}
                  </span>
                )}

              </div>

              <p>
                {selectedExhibit.description ||
                  "Тайлбар оруулаагүй байна."}
              </p>

              {selectedExhibit.project_url && (
                <a
                  className="museum-detail-action"
                  href={selectedExhibit.project_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Төслийг үзэх
                  <ArrowUpRight size={16} />
                </a>
              )}

            </div>
          </section>
        </div>
      )}

      {/* TEACHER DETAILS */}

      {selectedTeacher && (
        <div
          className="museum-detail-overlay"
          onClick={() => setSelectedTeacher(null)}
        >
          <section
            className="museum-detail-dialog museum-teacher-dialog"
            role="dialog"
            aria-modal="true"
            aria-label={selectedTeacher.name}
            onClick={(e) => e.stopPropagation()}
          >

            <button
              className="museum-detail-close"
              aria-label="Хаах"
              onClick={() => setSelectedTeacher(null)}
            >
              <X size={22} />
            </button>

            {selectedTeacher.image && (
              <button
                className="museum-detail-image"
                onClick={() => setZoomImage(selectedTeacher.image)}
                title="Зургийг томруулах"
              >
                <img
                  src={selectedTeacher.image}
                  alt={selectedTeacher.name}
                />
              </button>
            )}

            <div className="museum-detail-content">

              <span className="museum-detail-eyebrow">
                ISM DIGITAL MUSEUM / БАГШ НАР
              </span>

              <h2>{selectedTeacher.name}</h2>

              <div className="museum-detail-tags">
                <span>{selectedTeacher.position}</span>
                <span>{selectedTeacher.course}</span>
              </div>

              <p>
                {selectedTeacher.bio ||
                  "Намтар оруулаагүй байна."}
              </p>

              {selectedTeacher.email && (
                <a
                  className="museum-detail-action"
                  href={`mailto:${selectedTeacher.email}`}
                >
                  {selectedTeacher.email}
                </a>
              )}

            </div>
          </section>
        </div>
      )}

      {/* IMAGE ZOOM */}

      {zoomImage && (
        <div
          className="museum-zoom-overlay"
          onClick={() => setZoomImage("")}
        >
          <button
            className="museum-zoom-close"
            aria-label="Хаах"
            onClick={() => setZoomImage("")}
          >
            <X size={28} />
          </button>

          <img
            src={zoomImage}
            alt="Томруулсан зураг"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* AUTH MODAL */}

      {showAuth && (
        <Auth
          onClose={() => setShowAuth(false)}
          onSuccess={() => {
            setShowAuth(false);
          }}
        />
      )}

      {/* SUBMIT EXHIBIT MODAL */}

      {showSubmit && session && (
        <SubmitExhibit
          user={session.user}
          onClose={() => setShowSubmit(false)}
          onSubmitted={() => {
            setShowSubmit(false);
          }}
        />
      )}

    </div>
  );
}

export default App;