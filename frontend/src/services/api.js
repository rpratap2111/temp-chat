import axios from 'axios';

const API_BASE_URL = 'http://localhost:4000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const createRoom = async (username, roomCode) => {
  if (!username?.trim() || !roomCode?.trim()) {
    throw new Error("Username and Room Code are required");
  }

  try {
    const response = await api.post('/rooms', {
      username: username.trim(),
      roomCode: roomCode.trim().toUpperCase(),
    });

    return response.data;
  } catch (error) {
    console.error('Error creating room:', error);

    const msg =
      error.response?.data?.message || 'Network Error. Please try again.';
    throw new Error(msg);
  }
};

export const checkRoom = async (roomCode) => {
  if (!roomCode?.trim()) {
    throw new Error("Room Code is required");
  }

  try {
    const response = await api.get(`/rooms/${roomCode.trim().toUpperCase()}`);
    return response.data;
  } catch (error) {
    console.error('Error checking room:', error);

    const msg =
      error.response?.data?.message || 'Network Error. Please try again.';
    throw new Error(msg);
  }
};
