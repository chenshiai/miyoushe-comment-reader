import axios from 'axios'

const request = axios.create({
  // baseURL: '',
  baseURL: 'https://8.155.52.59',
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json'
  }
})

export default request
