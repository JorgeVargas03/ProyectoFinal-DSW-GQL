// controllers/productoController.js
const productoService = require('../services/productoService');

const resolvers = {
  Query: {
    listarProductos: async () => {
      return await productoService.listarProductos();
    },
    obtenerProducto: async (_, { id }) => {
      return await productoService.obtenerProducto(id);
    }
  },
  Mutation: {
    crearProducto: async (_, { input }) => {
      try {
        const nuevo = await productoService.crearProducto(input);
        return {
          id: nuevo._id,
          nombre: nuevo.nombre,
          descripcion: nuevo.descripcion,
          precio: nuevo.precio,
          stock: nuevo.stock,
          facturapiId: nuevo.facturapiId
        };
      } catch (err) {
        throw new Error('Error creando producto: ' + err.message);
      }
    },
    actualizarProducto: async (_, { id, cambios }) => {
      try {
        const actualizado = await productoService.actualizarProductoService(id, cambios);
        return {
          id: actualizado._id,
          nombre: actualizado.nombre,
          descripcion: actualizado.descripcion,
          precio: actualizado.precio,
          stock: actualizado.stock,
          facturapiId: actualizado.facturapiId
        };
      } catch (err) {
        throw new Error('Error actualizando producto: ' + err.message);
      }
    },
    eliminarProducto: async (_, { id }) => {
      try {
        return await productoService.eliminarProductoService(id);
      } catch (err) {
        throw new Error('Error eliminando producto: ' + err.message);
      }
    }
  }
};

module.exports = resolvers;
