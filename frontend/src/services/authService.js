// services/authService.js
import axios from 'axios';

const API_URL = 'http://arunalusupermarket.shop/api/token/';

export const login = async (username, password) => {
  try {
    const response = await axios.post(API_URL, {
      username,
      password,
    });

    // Save tokens to localStorage (or cookies, depending on preference)
    localStorage.setItem('access_token', response.data.access);
    localStorage.setItem('refresh_token', response.data.refresh);

    return response.data;
  } catch (error) {
    console.error('Login error:', error.response ? error.response.data : error);
    throw error;
  }
};
