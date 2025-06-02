const axios = require('axios');

const api = axios.create({
  baseURL: 'https://www.facturapi.io/v2',
  headers: {
    Authorization: `Bearer ${process.env.API_KEY_FA}`
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

const crearProducto = async (data) => {
  try{
  const res = await api.post('/products', {
    name: data.nombre,
    price: data.precio,
    product_key: data.product_key || "60101811",
    unit_key: data.unit_key || "H87",
    stock: data.stock,
    description: data.descripcion,
    tax_included: data.tax_included !== undefined ? data.tax_included : true
  });
  return res.data;
      return res.data;
  } catch (error) {
    console.error('Error al crear producto en FacturAPI:', error.response?.data || error.message);
    throw error;
  }

};

const actualizarProducto = async (id, data) => {
  const res = await api.put(`/products/${id}`, {
    name: data.nombre,
    price: data.precio,
    stock: data.stock,
    description: data.descripcion
  });
  return res.data;
};

const eliminarProducto = async (id) => {
  const res = await api.delete(`/products/${id}`);
  return res.data;
};

module.exports = {
  crearCliente,
  obtenerCliente,
  actualizarCliente,
  eliminarCliente,
  crearProducto,
  actualizarProducto,
  eliminarProducto
};