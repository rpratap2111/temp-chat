import React, { useState } from 'react'
import Home from './components/Home';
import Room from './components/Room';
import { SocketProvider } from './context/SocketContext';

function App() {

  const [currentView, setCurrentView] = useState('home');
  const [roomData, setRoomData] = useState({
    roomCode: '',
    username: '',
    isCreator: false
  });

  const navigateToRoom = (data) => {
    setRoomData(data);
    setCurrentView('room');
  };

  const navigateToHome = () => {
    setCurrentView('home');
    setRoomData({
      roomCode: '',
      username: '',
      isCreator: false
    });
  };

  return (
    <SocketProvider>
      <div className="min-h-screen bg-gray-100">
        {currentView === 'home' ? (
          <Home onNavigateToRoom={navigateToRoom} />
        ) : (
          <Room 
            roomData={roomData} 
            onNavigateToHome={navigateToHome} 
          />
        )}
      </div>
    </SocketProvider>
  )
}

export default App;
