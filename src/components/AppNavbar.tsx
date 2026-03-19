import { Navbar, Nav, NavDropdown } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { EXAMPLES } from '../utils/examples';
import { useStore, SANDBOX_CODE } from '../store/useStore';

export default function AppNavbar() {
  const navigate = useNavigate();
  const setCode = useStore((s) => s.setCode);
  const reset = useStore((s) => s.reset);

  // Group examples by category
  const categories = [...new Set(EXAMPLES.map((e) => e.category))];

  const handleSandbox = () => {
    reset();
    setCode(SANDBOX_CODE);
    navigate('/');
  };

  return (
    <Navbar bg="dark" variant="dark" expand="md" className="px-3">
      <Navbar.Brand as={Link} to="/" className="fw-bold">
        <span style={{ color: '#C5050C' }}>JS</span>Tutor
      </Navbar.Brand>
      <Navbar.Toggle aria-controls="navbar-nav" />
      <Navbar.Collapse id="navbar-nav">
        <Nav className="me-auto">
          <Nav.Link onClick={handleSandbox} style={{ cursor: 'pointer' }}>Sandbox</Nav.Link>
          {categories.map((cat) => (
            <NavDropdown key={cat} title={cat} id={`nav-${cat}`}>
              {EXAMPLES.filter((e) => e.category === cat).map((ex) => (
                <NavDropdown.Item
                  key={ex.slug}
                  onClick={() => navigate(`/examples/${ex.slug}`)}
                >
                  {ex.title}
                </NavDropdown.Item>
              ))}
            </NavDropdown>
          ))}
        </Nav>
      </Navbar.Collapse>
    </Navbar>
  );
}
