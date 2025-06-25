import React, { useState, useEffect, useRef } from 'react';
import { Users, LogOut } from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import Header from './Header';
import ChatArea from './ChatArea';
import UsersSidebar from './UsersSidebar';
import Mode from './Mode';

function Room({ roomData, onNavigateToHome }) {
  const { connectSocket, disconnectSocket, joinRoom } = useSocket();
  const [error, setError] = useState('');
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showMobileUsers, setShowMobileUsers] = useState(false);
  const [isLeavingRoom, setIsLeavingRoom] = useState(false);
  const menuRef = useRef(null);
  const usersRef = useRef(null);

  useEffect(() => {
    const newSocket = connectSocket(roomData.roomCode, roomData.username);

    if (!newSocket) {
      setError("Failed to connect to server.");
      return;
    }

    newSocket.on('roomClosed', (data) => {
      alert(data.message);
      handleLeaveRoom();
    });

    newSocket.on('error', (error) => {
      setError(error.message);
    });

    newSocket.on('roomError', (error) => {
      setError(error.message);
      setTimeout(() => {
        onNavigateToHome();
      }, 2000);
    });

    return () => {
      disconnectSocket();
    };
  }, [roomData.roomCode, roomData.username]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isLeavingRoom) return;

      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMobileMenu(false);
      }
      if (usersRef.current && !usersRef.current.contains(event.target)) {
        setShowMobileUsers(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isLeavingRoom]);

  const handleLeaveRoom = async () => {
    setIsLeavingRoom(true);
    await new Promise(resolve => setTimeout(resolve, 2500));

    disconnectSocket();
    onNavigateToHome();
  };

  const toggleMobileMenu = () => {
    if (isLeavingRoom) return;

    setShowMobileMenu(!showMobileMenu);
    setShowMobileUsers(false);
  };

  const toggleMobileUsers = () => {
    if (isLeavingRoom) return;

    setShowMobileUsers(!showMobileUsers);
    setShowMobileMenu(false);
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-blue-200 via-indigo-100 to-purple-200 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-300 overflow-hidden">

      <div className="flex-shrink-0 hidden lg:block">
        <Header
          roomCode={roomData.roomCode}
          username={roomData.username}
          onLeaveRoom={handleLeaveRoom}
        />
      </div>

      <div className="flex-shrink-0 lg:hidden bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 relative z-40">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Room: {roomData.roomCode}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Welcome, {roomData.username}
            </span>
          </div>


          <div className="flex items-center space-x-3">
            <div className="relative" ref={usersRef}>
              <button
                onClick={toggleMobileUsers}
                className="p-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white transition-colors shadow-md"
              >
                <Users className="w-5 h-5" />
              </button>

              {showMobileUsers && (
                <div className="absolute right-0 top-full mt-2 w-72 max-h-96 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-[60] overflow-hidden transform transition-all duration-200 ease-out">
                  <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-600">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center justify-center">
                      <Users className="w-4 h-4 mr-2" />
                      Online Users
                    </h3>
                  </div>
                  <div className="flex items-center justify-center p-4 w-full">
                    <div className="w-full max-w-xs">
                      <UsersSidebar isMobile={true} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="relative" ref={menuRef}>
              <button
                onClick={toggleMobileMenu}
                className="p-2 rounded-lg bg-gray-500 hover:bg-gray-600 text-white transition-colors shadow-md"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              {showMobileMenu && (
                <div className={`absolute right-0 top-full mt-2 w-52 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-[60] overflow-hidden transform transition-all duration-200 ease-out ${isLeavingRoom ? 'pointer-events-none' : ''}`}>
                  <div className="py-2">
                    <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-semibold mr-3">
                          {roomData.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-gray-700 dark:text-gray-300">{roomData.username}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">Current User</div>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={handleLeaveRoom}
                      disabled={isLeavingRoom}
                      className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLeavingRoom ? (
                        <>
                          <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-red-600 border-t-transparent"></div>
                          Leaving Room...
                        </>
                      ) : (
                        <>
                          <LogOut className="w-4 h-4 mr-2" />
                          Leave Room
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 mx-2 mt-2 sm:px-4 sm:py-3 sm:mx-4 sm:mt-4 rounded-lg animate-fadein flex-shrink-0">
          {error}
        </div>
      )}

      <div className="flex-1 flex max-w-6xl mx-auto w-full animate-fadein min-h-0 overflow-hidden">
        <ChatArea roomCode={roomData.roomCode} username={roomData.username} />
        <div className="hidden lg:block">
          <UsersSidebar />
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-fadein {
          animation: fadeIn 0.7s ease-in-out;
        }
      `}</style>
    </div>
  );
}

export default Room;