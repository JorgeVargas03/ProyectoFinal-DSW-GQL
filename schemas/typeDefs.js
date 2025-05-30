const { gql } = require('apollo-server');
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

`;

module.exports = typeDefs; 