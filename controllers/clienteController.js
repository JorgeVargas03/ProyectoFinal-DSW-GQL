const Cliente = require('../models/cliente');
const facturapi = require('../services/facturapi');

const resolvers = {
  Query: {
    getClientes: async () => await Cliente.find(),
    getCliente: async (_, { id }) => await Cliente.findById(id)
  },
  Mutation: {
    crearCliente: async (_, data) => {
      try {
        const facturapiData = await facturapi.crearCliente({
        legal_name: data.nombre,
        email: data.email,
        tax_id: data.rfc,
        tax_system: "616", 
        address: {
          zip: '86991'
      }
        });
        const cliente = new Cliente({
          ...data,
          facturapiId: facturapiData.id
        });
        const saved = await cliente.save();

        return {
          id: saved._id,
          nombre: saved.nombre,
          email: saved.email,
          rfc: saved.rfc,
          telefono: saved.telefono,
          direccion: saved.direccion,
          facturapiId: saved.facturapiId
        };
      } catch (error) {
        throw new Error('Error al crear cliente: ' + error.message);
      }
    },
    actualizarCliente: async (_, { id, ...rest }) => {
      const cliente = await Cliente.findById(id);
      if (!cliente) throw new Error("Cliente no encontrado");

      await facturapi.actualizarCliente(cliente.facturapiId, {
        legal_name: rest.nombre,
        email: rest.email,
        tax_id: rest.rfc,
        tax_system: "616", 
        address: {
          zip: '86991'
        }
      });

      Object.assign(cliente, rest);
      const updated = await cliente.save();

      return {
        id: updated._id,
        nombre: updated.nombre,
        email: updated.email,
        rfc: updated.rfc,
        telefono: updated.telefono,
        direccion: updated.direccion,
        facturapiId: updated.facturapiId
      };
    },
    eliminarCliente: async (_, { id }) => {
      const cliente = await Cliente.findById(id);
      if (!cliente) return false;

      await facturapi.eliminarCliente(cliente.facturapiId);
      await cliente.deleteOne();
      return true;
    }
  }
};

module.exports = resolvers;