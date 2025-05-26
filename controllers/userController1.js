// Importa el modelo que contiene la lógica para interactuar con la base de datos
const userModel = require('../models/userModel');

// Define los resolvers de GraphQL para las mutaciones
const resolvers = {
    Query: {
        /**
         * Obtiene la lista completa de usuarios.
         * Devuelve el arreglo con todos los usuarios registrados.
         */
        getUsers: () => userModel.getAllUsers(),
        /**
         * Obtiene un usuario específico por su ID.
         * Recibe el parámetro `id` como argumento y retorna el usuario correspondiente.
         */
        getUser: () => (_, { id }) => userModel.getUserById(id),
    },
    Mutation: {
        /**
         * Crea un nuevo usuario no verificado, genera un código de verificación,
         * lo envía por correo y lo guarda en el arreglo.
         */
        registerUser: (_, { email, phone, via }) => userModel.registerUser(email, phone, via),

        /**
         * Verifica si el código ingresado es correcto. Si lo es, marca al usuario como verificado
         * y devuelve un objeto con el token de sesión y los datos del usuario.
         */
        verifyCode: (_, { email, code }) => userModel.verifyCode(email, code),

        /**
         * Permite el inicio de sesión si el usuario ya está verificado.
         * Si no lo está, vuelve a generar y enviar un código de verificación.
         */
        login: (_, { email }) => userModel.login(email),
    },
}

// Exporta los resolvers para usarlos en el servidor de Apollo
module.exports = resolvers;
