const axios = require('axios');

const api = axios.create({
  baseURL: 'https://www.facturapi.io/v2',
  headers: {
    Authorization: `Bearer ${process.env.FACTURAPI_KEY}`
  }
});

const crearCliente = async (data) => {
  const res = await api.post('/customers', data);
  return res.data;
};

const obtenerCliente = async (id) => {
  const res = await api.get(`/customers/${id}`);
  return res.data;
};

const actualizarCliente = async (id, data) => {
  const res = await api.put(`/customers/${id}`, data);
  return res.data;
};

const eliminarCliente = async (id) => {
  const res = await api.delete(`/customers/${id}`);
  return res.data;
};

module.exports = {
  crearCliente,
  obtenerCliente,
  actualizarCliente,
  eliminarCliente
};