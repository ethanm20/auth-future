//import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import NavDropdown from 'react-bootstrap/NavDropdown';

import { Container, Row, Col, Button} from 'react-bootstrap';

export default function NavigationBar() {
    return (
        <>
          <Navbar variant="dark" sticky="top" expand="lg" className="w-full" style={{top: '0px', zIndex: '30', marginTop:' -49px', height: '50px', backgroundColor: '#111111'}}>
            <Container style={{height: '50px', display: 'flex', flexDirection: 'row'}}>
              <Navbar.Brand href="/" style={{display: 'flex', width: '105px'}}>AuthFuture</Navbar.Brand>
              <Nav className="me-auto" style={{justifyContent: 'end', flexDirection: 'row', display: 'flex', width: 'calc(100% - 150px)'}}>
                  <Nav.Item>
                    <Nav.Link href="https://github.com/ethanm20/auth-future" target="_blank">
                      <Button variant="outline-light" style={{borderRadius: '25px'}} className="github-header-outer">
                        <i className="bi bi-github"></i> <span className="github-text">Source Code</span>
                      </Button>
                    </Nav.Link>
                  </Nav.Item>
                  <Nav.Item style={{display: 'none'}}>
                    <Nav.Link href="https://www.linkedin.com/in/ethan-marlow" target="_blank">
                      <i className="bi bi-moon"></i>
                    </Nav.Link>
                  </Nav.Item>
              </Nav>
            </Container>
          </Navbar>
        </>
    )
}