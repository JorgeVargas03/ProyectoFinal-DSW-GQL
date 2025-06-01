const { ApolloServer } = require("apollo-server");
const typeDefs = require("./schemas/typeDefs");
require("dotenv").config();
const invoiceResolvers = require("./controllers/invoiceResolver");
const clienteResolvers = require("./controllers/clienteController");
const productoResolvers = require("./controllers/productoController");


require("./models/mongo");

const allCombinedResolvers = {
  Query: {
    ...invoiceResolvers.Query,
    ...clienteResolvers.Query,
    ...productoResolvers.Query
  },
  Mutation: {
    ...invoiceResolvers.Mutation,
    ...clienteResolvers.Mutation,
    ...productoResolvers.Mutation
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers: allCombinedResolvers,
});

server.listen().then(({ url }) => {
  console.log(`Servidor corriendo en ${url}`);
});
