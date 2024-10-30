import axios from 'axios';

// Create a global Axios instance
const api = axios.create({
  baseURL: 'https://ecom.anotechsolutions.com/api/v1'      
});

export default api;
 // 'https://multivendor-application.onrender.com/api/v1'
