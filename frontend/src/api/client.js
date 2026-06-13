import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5001/api'
    : 'https://unbiasedaigdc-production.up.railway.app/api')

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 120000,
})

export const uploadCSV = (file, onUploadProgress) => {
  const fd = new FormData()
  fd.append('file', file)
  return api.post('/upload', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress,
  })
}

export const startAudit = (fileId, targetCol, protectedAttr, filename, token = null) => {
  const headers = token ? { Authorization: `Bearer ${token}` } : {}
  return api.post('/audit', { 
    file_id: fileId, 
    target_col: targetCol, 
    protected_attr: protectedAttr,
    filename
  }, { headers })
}

export const pollStatus = (jobId) => api.get(`/status/${jobId}`)
export const getResult = (jobId) => api.get(`/result/${jobId}`)
export const applyMitigation = (jobId, method) =>
  api.post('/mitigate', { job_id: jobId, method })
export const generateReport = (jobId, mitigationMethod) =>
  api.post('/report', { job_id: jobId, mitigation_method: mitigationMethod })
export const healthCheck = () => api.get('/health')

export const getHistory = (token) => {
  const headers = token ? { Authorization: `Bearer ${token}` } : {}
  return api.get('/history', { headers })
}

export const associateAudit = (jobId, token) => {
  const headers = token ? { Authorization: `Bearer ${token}` } : {}
  return api.post(`/audit/${jobId}/associate`, {}, { headers })
}

export const getAdvisorGuidance = (jobId) => api.post('/advisor', { job_id: jobId })

export const getDownloadModelUrl = (jobId, modelName) => `${BASE_URL}/download_model/${jobId}?model=${modelName}`

export const sendChatMessage = (message, history, jobId = null) =>
  api.post('/chat', { message, history, job_id: jobId })

export const wakeUpBackend = async () => {
  const res = await axios.get(`${BASE_URL}/health`, { timeout: 60000 })
  return res
}

export default api
