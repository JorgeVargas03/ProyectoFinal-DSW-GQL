global.XMLHttpRequest = require("xhr2");
const { ApolloServer, gql } = require("apollo-server");
require("dotenv").config();

const typeDefs = require("./schemas/typeDefs");
const invoiceResolvers = require("./controllers/invoiceResolver");
const clienteResolvers = require("./controllers/clienteController");
const productoResolvers = require("./controllers/productoController");

require("./models/mongo");

// Combinar resolvers
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

// Crear el servidor Apollo
const server = new ApolloServer({
  typeDefs,
  resolvers: allCombinedResolvers,
  introspection: true, // ⚠️ Necesario para permitir que el cliente explore el esquema en producción
  playground: true     // ⚠️ Habilita el GraphQL Playground (Apollo Sandbox) en producción
});

// Iniciar el servidor
const PORT = process.env.PORT || 4000;
server.listen(PORT).then(({ url }) => {
  console.log(`🚀 Servidor corriendo en ${url}`);
});
