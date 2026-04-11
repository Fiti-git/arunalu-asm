import axios from 'axios';

const token = localStorage.getItem('access_token');

const api2 = axios.create({
    baseURL: (process.env.REACT_APP_API_URL || 'http://123.231.60.24:1605') + '/',
    headers: {
        Authorization: `Bearer ${token}`,
    },
});

export default api2;