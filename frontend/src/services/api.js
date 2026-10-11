import axios from 'axios';
import { SERVER_URL } from '../config';

const api = axios.create({
  baseURL: `${SERVER_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

const errorMessage = (error) =>
  error.response?.data?.message || 'Network Error. Please try again.';

// Creates a room. The server picks the code and returns the host's secret token.
export const createRoom = async ({ lifetimeMinutes, endPolicy, password }) => {
  try {
    const response = await api.post('/rooms', { lifetimeMinutes, endPolicy, password });
    return response.data;
  } catch (error) {
    console.error('Error creating room:', error);
    throw new Error(errorMessage(error));
  }
};

// Looks up whether a room exists and whether it needs a password.
export const getRoomInfo = async (roomCode) => {
  try {
    const response = await api.get(`/rooms/${encodeURIComponent(roomCode)}`);
    return response.data.room;
  } catch (error) {
    throw new Error(errorMessage(error));
  }
};
