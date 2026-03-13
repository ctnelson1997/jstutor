import { Navbar, Nav, NavDropdown } from 'react-bootstrap';
import { useStore } from '../store/useStore';
import { EXAMPLES } from '../utils/examples';

export default function AppNavbar() {
  const setCode = useStore((s) => s.setCode);
  const reset = useStore((s) => s.reset);

  // Group examples by category
  const categories = [...new Set(EXAMPLES.map((e) => e.category))];

  const handleLoadExample = (exampleCode: string) => {
    reset();
    setCode(exampleCode);
  };

  return (
    <Navbar bg="dark" variant="dark" expand="md" className="px-3">
      <Navbar.Brand className="fw-bold">
        <span style={{ color: '#C5050C' }}>JS</span>Tutor
      </Navbar.Brand>
      <Navbar.Toggle aria-controls="navbar-nav" />
      <Navbar.Collapse id="navbar-nav">
        <Nav className="me-auto">
          {categories.map((cat) => (
            <NavDropdown key={cat} title={cat} id={`nav-${cat}`}>
              {EXAMPLES.filter((e) => e.category === cat).map((ex) => (
                <NavDropdown.Item
                  key={ex.title}
                  onClick={() => handleLoadExample(ex.code)}
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
