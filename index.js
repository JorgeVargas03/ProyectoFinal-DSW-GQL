const { ApolloServer } = require("apollo-server");
const typeDefs = require("./schemas/typeDefs");

const invoiceResolvers = require("./controllers/invoiceResolver");
const clienteResolvers = require("./controllers/clienteController");

require("dotenv").config();
require("./models/mongo");

const allCombinedResolvers = {
  Query: {
    ...invoiceResolvers.Query,
    ...clienteResolvers.Query,
  },
  Mutation: {
    ...invoiceResolvers.Mutation,
    ...clienteResolvers.Mutation,
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers: allCombinedResolvers,
});

server.listen().then(({ url }) => {
  console.log(`Servidor corriendo en ${url}`);
});
