const invoiceModel = require('../models/invoicesModel');

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
    cancelInvoice: async (_, { id }) => {
      return await invoiceModel.cancelInvoice(id);
    },
    downloadInvoice: async (_, { id, format }) => {
      return await invoiceModel.downloadInvoice(id, format);
    },
    sendInvoiceByEmail: async (_, { id, email }) => {
      return await invoiceModel.sendInvoiceByEmail(id, email);
    },
  },
};

module.exports = resolvers;
