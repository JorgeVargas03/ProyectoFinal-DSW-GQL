const invoiceModel = require("../models/invoicesModel");

const resolvers = {
  Query: {
    getInvoice: async (_, { id }) => {
      return await invoiceModel.getInvoice(id);
    },
    listInvoices: async () => {
      return await invoiceModel.listInvoices();
    },
    getInvoicesByCustomer: async (_, { customerId }) => {
      return await invoiceModel.getInvoicesByCustomer(customerId);
    },
  },
  Mutation: {
    createInvoice: async (_, { input }) => {
      return await invoiceModel.createInvoice(input);
    },
    cancelInvoice: async (_, { id, motivo }) => {
      return await invoiceModel.cancelInvoice(id, motivo || "01");
    },
    downloadInvoice: async (_, { id, format }) => {
      return await invoiceModel.downloadInvoice(id, format);
    },
    sendInvoiceByEmail: async (_, { id, email }) => {
      return await invoiceModel.sendInvoiceByEmail(id, email);
    },
    updateInvoiceStatus: async (_, { id }) => {
      return await invoiceModel.updateInvoiceStatus(id);
    },
    updateInvoice: async (_, { id, input }) => {
      return await updateInvoice(id, input);
    },

  },
};

module.exports = resolvers;
