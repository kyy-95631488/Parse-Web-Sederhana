import { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { Home } from "./pages/Home";
import LL1 from "./pages/LL1";
import BottomUpParser  from "./pages/Bottom-Up";
import './costum.css';

const App = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const closeMenu = () => {
    setMenuOpen(false);
  };

  return (
    <Router>
      <div className="app-wrapper">
        <header className="header">
          <div className="header__container">
            <h1 className="logo">PARSE</h1>
            <nav className={`nav ${menuOpen ? "mobile-active" : ""}`}>
              <Link to="/" className="nav__link" onClick={closeMenu}>Home</Link>
              <Link to="/Bottom-Up" className="nav__link" onClick={closeMenu}>Bottom-Up</Link>
              <Link to="/ll1" className="nav__link" onClick={closeMenu}>LL1</Link>
            </nav>
            <button className="menu-btn" onClick={toggleMenu}>☰</button>
          </div>
        </header>

        <main className="main">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/Bottom-Up" element={<BottomUpParser />} />
            <Route path="/ll1" element={<LL1 />} />
          </Routes>
        </main>

        <footer className="footer">
          <div className="footer__container">
            © {new Date().getFullYear()} PARSE. All rights reserved.
          </div>
        </footer>
      </div>
    </Router>
  );
};

export default App;
