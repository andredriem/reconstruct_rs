import React, { useEffect, useState } from 'react';
import logo from './logo.svg';
import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Button, Col, Container, Row, Tooltip } from 'react-bootstrap';
import { Map } from './components/Map';
import { Topic } from './components/Topic';
import { LoginModal } from './components/LoginModal';
import { LoginData, useLoginData, useShowLoginModal, useTriggerLoginCheckCounter } from './states';
import { LoginLoggoutButton } from './components/LoginLogoutButton';
import NavBar from './components/NavBar';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { BrowserView, MobileView, isBrowser, isMobile, isTablet } from 'react-device-detect';


// Enable mobile const is true on development but false on production
function App() {
  // The app is set at at maximum height (100vh),
  // there are two main components the map and the sidebar
  // they are in a grid system, the sidebar gets 1/4 of the width
  // and the map gets 3/4

  const { loginData, setLoginData } = useLoginData();
  const { setShowLoginModal } = useShowLoginModal();
  const [loginCheck, setLoginCheck] = React.useState(false);
  const { triggerLoginCheckCounter } = useTriggerLoginCheckCounter();

  useEffect(() => {
    const checkLogin = async () => {
      const response = await fetch('/forum/session/current.json');

      let data = null;
      try {
        data = await response.json();
      } catch (error) {
        console.log(`Failed to parse response: ${error}`);
        setLoginCheck(true);
        return;
      }
      if (response.ok) {
        console.log('Logged in')
        console.log(data);
        const newLoginData: LoginData = {
          username: data.current_user.username,
          avatarTemplate: data.current_user.avatar_template,
          email: data.current_user.email,
          userId: data.current_user.id
        }

        console.log('newLoginData', newLoginData);
        setLoginData(newLoginData);
      } else {
        setLoginCheck(true);
      }
      setLoginCheck(true);
    }
    checkLogin();
  }, [loginCheck, setLoginData, triggerLoginCheckCounter]);


  
   if (isMobile && !isTablet) {
     return <div>O site para celular ainda está em desenvolvimento, por favor acesse pelo computador ou tablet</div>
   }

  if (!loginCheck) {
    return <div>Loading...</div>
  }

  const showMobile = isMobile && !isTablet;

  let multiDevice = null;
  if (!showMobile) {
    multiDevice = (
      <>
          <NavBar />

          <Container fluid={true} style={{ marginLeft: 20, padding: 0 }}>
            <LoginModal />
            <Row>
              <Col xs={5}>
                <Row>
                  <Topic />
                </Row>
              </Col>
              <Col xs={7}>
                <Map />
              </Col>
            </Row>
          </Container>
      </>
    )
  } else {
    multiDevice = <>
      <div style={{ height: '6vh', zIndex: 9999999999}}>
        <NavBar />
      </div>
      <div style={{ height: '94vh' }}>

        <Container fluid={true} >
          <LoginModal />
          <Map />
        </Container>
      </div>
    </>
  }

  return <>
    <GoogleOAuthProvider
      clientId="48754322053-fh5rdp91g8ro30tb8hg3b19oapc5mnol.apps.googleusercontent.com">
      {multiDevice}
    </GoogleOAuthProvider>;
  </>

}

export default App;
