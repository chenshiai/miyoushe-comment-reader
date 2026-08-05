import axios from 'axios'

const request = axios.create({
  baseURL: 'https://8.155.52.59:8088',
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json'
  }
})

export default request
