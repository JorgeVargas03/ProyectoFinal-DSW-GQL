const { gql } = require("apollo-server");
const typeDefs = gql`
  type Invoice {
    id: ID!
    facturapiId: String!
    customerId: ID!
    items: [InvoiceItem!]!
    total: Float!
    createdAt: String!
  }

  type InvoiceItem {
    productId: String!
    quantity: Int!
    unitPrice: Float!
  }

  input InvoiceItemInput {
    productId: String!
    quantity: Int!
    unitPrice: Float!
  }

  input CreateInvoiceInput {
    customerId: ID!
    items: [InvoiceItemInput!]!
    use: String!
    paymentForm: String!
    paymentMethod: String!
    customerPhoneNumber: String
  }

  type Query {
    getInvoice(id: ID!): Invoice
    listInvoices: [Invoice!]!
    getInvoicesByCustomer(customerId: ID!): [Invoice!]!
  }

  type Mutation {
    createInvoice(input: CreateInvoiceInput!): Invoice
    cancelInvoice(id: ID!): Boolean
    downloadInvoice(id: ID!, format: String!): String
    sendInvoiceByEmail(id: ID!, email: String): Boolean
  }

  type Cliente {
    id: ID!
    nombre: String!
    email: String!
    rfc: String
    telefono: String
    direccion: String
    facturapiId: String
  }

  type Query {
    getClientes: [Cliente]
    getCliente(id: ID!): Cliente
  }

  type Mutation {
    crearCliente(
      nombre: String!
      email: String!
      rfc: String
      telefono: String
      direccion: String
    ): Cliente

    actualizarCliente(
      id: ID!
      nombre: String
      email: String
      rfc: String
      telefono: String
      direccion: String
    ): Cliente

    eliminarCliente(id: ID!): Boolean
  }
`;

module.exports = typeDefs;
