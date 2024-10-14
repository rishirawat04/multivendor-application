import axios from 'axios';

// Create a global Axios instance
const api = axios.create({
  baseURL: 'https://mulitvendorrawattec.onrender.com',  
});

export default api;
